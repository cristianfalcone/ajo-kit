import * as html from 'ajo/html'
import type { Component } from 'ajo'
import { sha256Hex, utf8ByteLength } from 'ajo-kit/platform'
import { Reply, Router, send } from './http'
export { send } from './http'
import App, { resolve, layouts, pages, error, match, parts, parents, register, specific } from './app'
import { Failure, ancestors, normalize, ajax, api, ip, first } from './constants'
import type { State, Data, Entry, Page, Parent, Request, Middleware, ActionContext, Loader } from './constants'
import { merge, render as view, type Head } from './head'
import * as headers from './headers'
import { bump, fresh, topics as sorted, parse, hash, snapshot, type Versions } from './freshness'
import { elapsed, finish, log, header, start, type Timing } from './timing'
import { routes } from 'virtual:ajo/routes'
import { handlers, wares as discoveredWares } from 'virtual:ajo/handlers'

/** Loader output, the one shape SSR state, route JSON and live messages carry. */
type Payload = { data: Data; head: Head }

const digest = (payload: Payload) => hash(JSON.stringify(payload))

/** Embeds hydration state as JSON in a data script; `<`, U+2028 and U+2029 are escaped. */
const script = (value: unknown) => `<script type="application/json" id="__SSR__">${
	JSON.stringify(value).replace(/[<\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
}</script>`

const metadata = (topics: Set<string>) => {
	const list = [...topics].sort()
	return { topics: list, versions: snapshot(list) }
}

// The credential the auth middleware attached. Token, session and user ids are
// independent keyspaces, so the kind prefixes the id: token 42 and user 42 differ.
const identity = (req: Request) =>
	req.token ? `token:${req.token.id}`
		: req.session ? `session:${req.session.id}`
			: req.user ? `user:${req.user.id}`
				: undefined

// The cache scope: an opaque partition label the client keys its route cache
// by, so one identity's cached payloads are unreachable under another's. It is
// hashed, because a session id is a database lookup key and has no business
// inside a payload. An auth layer wanting different semantics sets req.scope;
// every anonymous request shares 'anon'. The label is not a secret: it only
// partitions a per-tab in-memory cache, and knowing it grants nothing.
const scope = (req: Request): string => {
	if (req.scope) return req.scope
	const id = identity(req)
	return id ? sha256Hex(id).slice(0, 16) : 'anon'
}

/** The owner a live stream counts against: its credential, else its address. */
const principal = (req: Request) => identity(req) ?? `address:${ip(req)}`

// Timing starts in the first ware and stays off the public Request.
const timings = new WeakMap<Request, Timing>()

const mark = (req: Request, phase: 'loader' | 'render', begun: number) => {
	const timing = timings.get(req)
	if (timing) timing[phase] = elapsed(begun)
}

const vary = 'Accept, Cookie'

const base = (type?: string) => ({
	'Cache-Control': 'no-store',
	Vary: vary,
	...(type && { 'Content-Type': type }),
})

const done = (req: Request, res: Reply, status: number, body = '', cache?: string) => {
	const timing = timings.get(req)

	if (!timing) return

	const result = finish(timing, { status, bytes: utf8ByteLength(body), cache })

	res.setHeader('Server-Timing', header(result))
	log(`${req.method} ${req.originalUrl}`, result)
}

const write = (req: Request, res: Reply, hash?: string, early = false) => {
	const cache = early ? 'fresh' : 'revalidated'

	res.statusCode = 304
	headers.set(res, base())
	res.setHeader('X-Ajo-Cache', cache)
	if (hash) res.setHeader('ETag', `"${hash}"`)
	done(req, res, 304, '', cache)
	res.end()
}

type Connection = {
	req: Request
	principal: string
	scope: string
	topics: Set<string>
	hash: string
	verify: () => Promise<boolean>
	revalidate: () => Promise<Payload>
	send: (message: Payload & { hash: string; topics: string[]; versions: Versions; scope: string }) => void
	/** Pushes the named `expired` event so the client knows this close is a
	 * dead credential, not a network blip — reconnecting cannot help it. */
	expire: () => void
	close: () => void
}

const connections = new Set<Connection>()

const principals = new Map<string, number>()

const pending = new Set<string>()

let debounce: ReturnType<typeof setTimeout> | null = null

const revalidationLimit = 4

/** Maximum simultaneous live streams held by one server process. */
const connectionLimit = 128

/** Maximum simultaneous live streams held by one credential or anonymous address. */
const principalLimit = 8

const reserve = (conn: Connection) => {
	connections.add(conn)
	principals.set(conn.principal, (principals.get(conn.principal) ?? 0) + 1)
}

const release = (conn: Connection) => {
	if (!connections.delete(conn)) return

	const count = principals.get(conn.principal) ?? 0
	if (count <= 1) principals.delete(conn.principal)
	else principals.set(conn.principal, count - 1)
}

const matches = (conn: Connection, topics: Set<string>) => {
	return [...topics].some(topic => conn.topics.has(topic))
}

const run = (ware: Middleware, req: Request) => new Promise<boolean>((resolve, reject) => {
	const res = new Reply()
	let settled = false
	const settle = (value: boolean) => {
		if (settled) return
		settled = true
		resolve(value)
	}
	const fail = (err: unknown) => {
		if (settled) return
		settled = true
		reject(err)
	}

	try {
		const result = ware(req, res, err => err ? fail(err) : settle(true))
		Promise.resolve(result).then(() => {
			if (!settled) settle(false)
		}, fail)
	} catch (err) {
		fail(err)
	}
})

const verify = async (req: Request, wares: Middleware[]) => {
	for (const ware of wares) {
		if (!await run(ware, req)) return false
	}

	return true
}

const each = async <T,>(items: T[], limit: number, run: (item: T) => Promise<void>) => {
	let index = 0
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (index < items.length) await run(items[index++])
	})

	await Promise.all(workers)
}

const close = (conn: Connection, reason?: string, expired = false) => {
	if (!connections.has(conn)) return

	// One formatted line: the engine console does not serialize objects, and
	// a reason that prints as [object Object] is a reason lost.
	if (reason) console.warn(`[SSE] Closing live connection: ${reason} · ${conn.req.path}`)

	// A credential death gets announced before the stream ends: the client
	// acts on it (re-running its loaders walks it to the login screen)
	// instead of sitting on stale data behind a dead session.
	if (expired) {
		try { conn.expire() } catch { /* the stream is already gone */ }
	}

	conn.close()
}

/** Closes every tracked live response before a host transport shuts down. */
export function closeLive(): void {
	if (debounce) clearTimeout(debounce)
	debounce = null
	pending.clear()
	for (const connection of [...connections]) close(connection)
}

const revalidate = async (conn: Connection) => {
	try {
		if (!connections.has(conn)) return

		if (!await conn.verify()) {
			close(conn, 'credential revalidation failed', true)
			return
		}

		// Verification only asks whether the stack still passes, and an
		// attach-if-present ware passes with a revoked session still hanging
		// off the connection's request. Comparing the scope asks the sharper
		// question — is this still the same identity? — and a changed answer
		// ends the connection instead of pushing one identity's payload down a
		// channel another identity now owns.
		if (scope(conn.req) !== conn.scope) {
			close(conn, 'identity changed', true)
			return
		}

		conn.req.topics = new Set<string>()
		const payload = await conn.revalidate()
		conn.topics = conn.req.topics ?? new Set<string>()
		if (conn.topics.size === 0) {
			close(conn, 'route is no longer live')
			return
		}
		const hash = digest(payload)

		if (hash === conn.hash) return

		conn.hash = hash
		conn.send({
			...payload,
			hash,
			...metadata(conn.topics),
			// Connect-time scope, and the check above guarantees the identity
			// behind it has not moved since.
			scope: conn.scope,
		})

	} catch (err) {
		console.error('[SSE] Live update failed:', err)
		close(conn)
	}
}

/** Broadcasts changed topics to matching SSE clients without action metadata. */
export function emit(topic: string | string[]) {

	const topics = bump(topic)

	topics.forEach(t => {
		pending.add(t)
	})

	if (debounce) return

	debounce = setTimeout(async () => {
		const current = new Set(pending)
		pending.clear()
		debounce = null

		const affected = [...connections].filter(conn => matches(conn, current))
		await each(affected, revalidationLimit, revalidate)
	}, 10)
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'

const methods: Method[] = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']

type Api = Partial<Record<Method, Middleware>>

type Action = (req: Request, res: Reply, action: ActionContext) => Promise<unknown>

type Handler = {
	page?: (req: Request, parent: Parent) => Promise<Entry>
	layout?: (req: Request, parent: Parent) => Promise<Entry>
	head?: (req: Request, parent: Parent) => Promise<Head>
	actions?: Record<string, Action>
}

type Load = () => Promise<Record<string, unknown>>

/** Route modules wired into one generated server entry. */
export interface Registries {
	routes: Record<string, Loader>
	handlers: Record<string, Load>
	wares: Record<string, Load>
}

/**
 * Reads a JSON body up to 100 KiB. With `form` (page actions) it also reads an
 * `application/x-www-form-urlencoded` body, a form posted without JavaScript,
 * into flat string fields where the last value wins.
 */
const body = (form: boolean): Middleware => async (req, _, next) => {
	if (req.body !== undefined) return next()
	req.body = {}

	const type = first(req.headers['content-type'])
	const length = Number.parseInt(first(req.headers['content-length']) ?? '', 10)
	if (Number.isNaN(length) && req.headers['transfer-encoding'] === undefined) return next()
	if (length === 0) return next()
	const encoded = form && !!type?.includes('application/x-www-form-urlencoded')
	if (type && !encoded && !type.includes('application/json')) return next()

	const text = new TextDecoder().decode(await req.read(100 * 1024))

	// fromEntries defines own properties: `__proto__` and `constructor` stay string fields.
	if (encoded) req.body = Object.fromEntries(new URLSearchParams(text))
	else {
		try { req.body = JSON.parse(text) }
		catch { throw Object.assign(new Error('Invalid content'), { status: 422 }) }
	}

	next()
}

type Link = {
	parent: Parent
	deferred: { promise: Promise<Entry>; resolve: (value: Entry) => void; reject: (error: Error) => void }
}

/** Builds the parent/deferred links that let a loader chain run in parallel. */
const links = (count: number): Link[] => {

	const chain: Link[] = []

	for (let depth = 0; depth < count; depth++) {

		let resolve!: (value: Entry) => void
		let reject!: (error: Error) => void

		const promise = new Promise<Entry>((res, rej) => {
			resolve = res
			reject = rej
		})

		// A loader's own rejection reaches the request handler even when no
		// descendant calls parent(). Observe this copy without changing what
		// parent() awaits, so an unused link cannot become an unhandled rejection.
		void promise.catch(() => {})

		const parent = async () =>
			Object.assign({}, ...await Promise.all(chain.slice(0, depth).map(link => link.deferred.promise)))

		chain.push({ parent, deferred: { promise, resolve, reject } })
	}

	return chain
}

const markers = /<!--\s*ssr:([A-Za-z0-9_]+)\s*-->/g

const empty: Payload = { data: [], head: {} }

/** Creates the host-neutral SSR handler from an HTML template with `<!-- ssr:name -->` slots. */
export async function create(template: string, registries: Registries = {
	routes: routes as Registries['routes'],
	handlers: handlers as Registries['handlers'],
	wares: discoveredWares as Registries['wares'],
}) {
	register(registries.routes)

	// Split and join, never String.replace: a `$&` in rendered data stays literal.
	const pieces = template.split(markers)
	const fill = (slots: Record<string, string>) =>
		pieces.map((piece, index) => index % 2 ? slots[piece] ?? '' : piece).join('')

	const secure: Middleware = (_, res, next) => {
		headers.set(res, headers.security(), true)
		next()
	}

	const timing: Middleware = (req, _, next) => {
		const value = start()
		if (value) timings.set(req, value)
		next()
	}

	const live = (req: Request, res: Reply, payload: Payload, revalidate: () => Promise<Payload>, verify: () => Promise<boolean>) => {

		if (!req.topics?.size) {
			res.writeHead(204, base())
			done(req, res, 204)
			return res.end()
		}

		if (connections.size >= connectionLimit) {
			res.writeHead(503, { ...base(), 'Retry-After': '30' })
			done(req, res, 503)
			return res.end()
		}

		const owner = principal(req)
		if ((principals.get(owner) ?? 0) >= principalLimit) {
			res.writeHead(429, { ...base(), 'Retry-After': '30' })
			done(req, res, 429)
			return res.end()
		}

		res.writeHead(200, { 'Content-Type': 'text/event-stream' })

		const stream = res.sse()

		const conn: Connection = {
			req,
			principal: owner,
			scope: scope(req),
			topics: req.topics,
			hash: digest(payload),
			verify,
			revalidate,
			send: (message) => stream.send(`data: ${JSON.stringify(message)}\n\n`),
			expire: () => stream.send('event: expired\ndata: {}\n\n'),
			close: () => {}
		}

		reserve(conn)

		const heartbeat = setInterval(() => {
			try {
				stream.send(':hb\n\n')
			} catch {
				close(conn, 'heartbeat failed')
			}
		}, 30000)
		let closed = false

		const cleanup = () => {
			if (closed) return
			closed = true
			clearInterval(heartbeat)
			release(conn)
		}

		conn.close = () => {
			cleanup()
			stream.close()
		}

		void stream.closed.then(cleanup, cleanup)
	}

	const render = async (req: Request, res: Reply, page: Page, payload: Payload, error?: Failure) => {

		const begun = performance.now()

		if (ajax(req)) {

			headers.set(res, base('application/json; charset=utf-8'))

			if (error) {
				const body = JSON.stringify({ error: error.toJSON() })

				mark(req, 'render', begun)
				done(req, res, error.status, body)

				return send(res, error.status, body)
			}

			const hash = digest(payload)
			const match = req.headers['x-have'] === hash || req.headers['if-none-match'] === `"${hash}"`
			const meta = metadata(req.topics ?? new Set<string>())

			res.setHeader('ETag', `"${hash}"`)

			if (match) {
				mark(req, 'render', begun)
				write(req, res, hash)
				return
			}

			res.setHeader('X-Ajo-Cache', 'miss')

			const response = JSON.stringify({ ...payload, hash, ...meta, scope: scope(req) })

			mark(req, 'render', begun)
			done(req, res, 200, response, 'miss')

			return send(res, 200, response)
		}

		let resolved: { page: Component; state?: State } | undefined

		for await (const r of resolve(req.originalUrl, layouts, { ...page, params: { ...req.params } }, payload.data, error?.toJSON())) resolved = r

		const hash = error ? undefined : digest(payload)
		const meta = metadata(req.topics ?? new Set<string>())
		const status = error?.status ?? 200
		const state = {
			...resolved!.state,
			head: payload.head,
			hash,
			...meta,
			scope: scope(req),
		}
		const body = fill({
			head: view(payload.head),
			data: script(state),
			root: html.render(<App page={resolved!.page} />),
		})

		mark(req, 'render', begun)
		done(req, res, status, body)

		send(
			res,
			status,
			body,
			base('text/html; charset=utf-8')
		)
	}

	// The final page ware: loaders, then a live stream or a rendered route.
	const load = (page: Page, stack: Middleware[]): Middleware => async (req, res) => {

		req.topics = new Set<string>()

		req.track = (topic: string | string[]) => {
			if (Array.isArray(topic)) topic.forEach(t => req.topics!.add(t))
			else req.topics!.add(topic)
		}

		const paths = parents(page.segments)
		const key = page.segments.join('/')

		// The fresh shortcut answers 304 without running a single loader, so it
		// must prove the asker is who cached the material it confirms: version
		// counters are process-global, and confirming them for a client whose
		// cache belongs to another identity would bless that identity's payload.
		// The client presents the scope its entry was cached under; anything
		// else, a missing header included, takes the loader path and gets an
		// answer computed with its own credentials.
		if (ajax(req) && req.headers['x-ajo-scope'] === scope(req) && fresh(parse(req.headers['x-ajo-versions']))) {
			const timing = timings.get(req)
			if (timing) timing.loader = 0
			write(req, res, req.headers['x-have']?.toString(), true)
			return
		}

		const execute = async (): Promise<Payload> => {

			req.topics!.clear()

			const chain = links(paths.length + 1)

			const run = async (
				loader: ((req: Request, parent: Parent) => Promise<Entry>) | undefined,
				depth: number,
			): Promise<Entry> => {
				const { parent, deferred } = chain[depth]
				try {

					const result = await (loader?.(req, parent) ?? Promise.resolve({}))
					deferred.resolve(result)

					return result

				} catch (err) {
					deferred.reject(normalize(err))
					throw err
				}
			}

			const layout = await Promise.all(paths.map((path, depth) => run(handlers.get(path)?.layout, depth)))
			const entry = await run(handlers.get(key)?.page, paths.length)
			const data = [...layout, entry]

			// A directory with both a layout and the page runs its head once, as the page's.
			const heads = await Promise.all([
				...paths.map((path, index) => path === key ? {} : handlers.get(path)?.head?.(req, async () => data[index]) ?? {}),
				handlers.get(key)?.head?.(req, async () => entry) ?? {}
			])

			return { data, head: merge(...heads) }
		}

		const begun = performance.now()
		let payload: Payload

		try {
			payload = await execute()
		} catch (err) {
			throw normalize(err)
		} finally {
			mark(req, 'loader', begun)
		}

		if (req.headers.accept === 'text/event-stream') return live(req, res, payload, execute, () => verify(req, stack))

		return render(req, res, page, payload)
	}

	const action = (segments: string[]): Middleware => async (req, res) => {
		const name = Object.keys(req.query).find(key => key.startsWith('/'))?.slice(1) || 'default'
		let handler: Action | undefined

		for (const path of ancestors(segments).filter(path => handlers.has(path)).reverse()) {
			const actions = handlers.get(path)?.actions
			if (actions && Object.hasOwn(actions, name)) {
				handler = actions[name]
				break
			}
		}

		if (!handler) throw new Failure(400, `Action '${name}' not found`)

		const topics = new Set<string>()
		const context: ActionContext = {
			emit: topic => {
				emit(topic)
				sorted(topic).forEach(topic => topics.add(topic))
			}
		}
		const result = await handler(req, res, context) as { redirect?: string } | void

		if (ajax(req)) {
			const body = result?.redirect ? { redirect: result.redirect } : (result ?? { ok: true })
			const sent = sorted([...topics])
			const payload = {
				...body,
				...(sent.length > 0 && {
					topics: sent,
					versions: snapshot(sent),
				})
			}

			headers.set(res, base('application/json; charset=utf-8'))

			send(res, 200, JSON.stringify(payload))

			return
		}

		res.statusCode = 302
		res.setHeader('Location', result?.redirect ?? req.originalUrl.split('?')[0])
		res.end()
	}

	const app = new Router({
		error: (err, req, res) => {
			const normalized = normalize(err)
			if (!(err instanceof Failure) && normalized.status >= 500) console.error(err)
			if (api(req)) return send(res, normalized.status, normalized.toJSON())
			return render(req, res, error(), empty, normalized)
		},
		missing: (req, res) => {
			const missing = new Failure(404, 'Not found')
			if (api(req)) return send(res, 404, missing.toJSON())
			return render(req, res, error(), empty, missing)
		}
	})

	app.use(secure)

	const collect = (segments: string[]): Middleware[] => ancestors(segments).flatMap(path => wares.get(path) ?? [])

	const wares = new Map<string, Middleware[]>()

	for (const [file, loader] of Object.entries(registries.wares)) {
		
		const exports = await loader()
		const key = parts(file).join('/')
		const items = Array.isArray(exports.default) ? exports.default : [exports.default]
		
		wares.set(key, (wares.get(key) ?? []).concat(items as Middleware[]))
	}

	const handlers = new Map<string, Handler>()

	// Sorted like pages, so the most specific API route is the one the router dispatches.
	const sources = Object.entries(registries.handlers)
		.map(([file, loader]) => ({ segments: parts(file), loader }))
		.sort((a, b) => specific(match(a.segments), match(b.segments)))

	for (const { segments, loader } of sources) {

		const exports = await loader()
		const key = segments.join('/')
		const pattern = match(segments)

		const { default: api, page, layout, head, actions } = exports as {
			default?: Api
			page?: Handler['page']
			layout?: Handler['layout']
			head?: Handler['head']
			actions?: Handler['actions']
		}

		handlers.set(key, { page, layout, head, actions })

		if (api) {
			for (const method of methods) {
				const route = api[method]
				if (!route) continue
				app.route(method, `api/${pattern}`, body(false), ...collect(segments), route)
			}
		}
	}

	for (const page of pages) {

		const { pattern, segments } = page
		const path = `/${pattern || ''}`
		const stack = collect(segments)

		app.get(path, timing, ...stack, load(page, stack))
		app.post(path, body(true), ...stack, action(segments))
	}

	return app.handler
}
