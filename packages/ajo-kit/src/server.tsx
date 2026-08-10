import * as html from 'ajo/html'
import type { Component } from 'ajo'
import { sha256Hex, utf8ByteLength } from 'ajo-kit/platform'
import { Reply, Router, send } from './http'
export { send } from './http'
import App, { resolve, layouts, pages, error, match, parts, parents, register } from './app'
import { Failure, links, ancestors, normalize, ajax, api } from './constants'
import type { State, Data, Entry, Page, Parent, Payload, Request, Middleware, ActionContext, Loader } from './constants'
import { merge, render as view, type Head } from './head'
import * as headers from './headers'
import { bump, fresh, topics as sorted, parse, hash, snapshot, type Versions } from './freshness'
import { elapsed, finish, log, header, start } from './timing'
import { script } from './ssr'
import { routes } from 'virtual:ajo/routes'
import { handlers, wares as discoveredWares } from 'virtual:ajo/handlers'

const payload = (head: Head, entries: Data) => ({ data: entries, head })

const digest = (head: Head, entries: Data) => hash(JSON.stringify(payload(head, entries)))

const metadata = (topics: Set<string>) => {
	const list = [...topics].sort()
	return { topics: list, versions: snapshot(list) }
}

// The cache scope: an opaque partition label the client keys its route cache
// by, so one identity's cached payloads are unreachable under another's. It is
// derived from whichever credential the auth middleware attached — the same
// fields mode() reads — and hashed, because a session id is a database lookup
// key and has no business inside a payload. An auth layer wanting different
// semantics sets req.scope; every anonymous request shares 'anon'. The label
// is not a secret: it only partitions a per-tab in-memory cache, and knowing
// it grants nothing.
const scope = (req: Request): string => {
	if (req.scope) return req.scope
	// Domain-separated: token, session and user ids are independent keyspaces,
	// and an auth layer numbering all three from one would otherwise hand token
	// 42 and user 42 the same partition.
	const id = req.token ? `token:${req.token.id}`
		: req.session ? `session:${req.session.id}`
			: req.user ? `user:${req.user.id}`
				: undefined
	if (id === undefined) return 'anon'
	return sha256Hex(id).slice(0, 16)
}

const size = (body: string) => utf8ByteLength(body)

const vary = 'Accept, Cookie'

const base = (type?: string) => ({
	'Cache-Control': 'no-store',
	Vary: vary,
	...(type && { 'Content-Type': type }),
})

const done = (req: Request, res: Reply, status: number, bytes: number, cache?: string) => {
	const result = finish(req.timing, { status, bytes, cache })

	if (!result) return

	res.setHeader('Server-Timing', header(result))
	res.setHeader('X-Ajo-Bytes', String(bytes))
	log(`${req.method} ${req.originalUrl}`, result)
}

const write = (req: Request, res: Reply, hash?: string, early = false) => {
	const cache = early ? 'fresh' : 'revalidated'

	res.statusCode = 304
	headers.set(res, base())
	res.setHeader('X-Ajo-Cache', cache)
	if (hash) res.setHeader('ETag', `"${hash}"`)
	done(req, res, 304, 0, cache)
	res.end()
}

type Connection = {
	req: Request
	auth: 'anonymous' | 'bearer' | 'session' | 'user'
	scope: string
	topics: Set<string>
	hash: string
	verify?: () => Promise<boolean>
	revalidate: () => Promise<Payload>
	send: (message: { data: Payload; hash: string; topics: string[]; versions: Versions; scope: string }) => void
	close: () => void
}

const connections = new Set<Connection>()

const pending = new Set<string>()

let debounce: ReturnType<typeof setTimeout> | null = null

const limit = 4

const mode = (req: Request): Connection['auth'] => {
	if (req.token) return 'bearer'
	if (req.session) return 'session'
	if (req.user) return 'user'
	return 'anonymous'
}

const matches = (conn: Connection, topics: Set<string>) => {
	return [...topics].some(topic => conn.topics.has(topic))
}

const run = (ware: Middleware, req: Request) => new Promise<boolean>((resolve, reject) => {
	const res = new Reply(req.method)
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

const close = (conn: Connection, reason?: string) => {
	if (reason) {
		console.warn('[SSE] Closing live connection:', {
			reason,
			path: conn.req.path,
			auth: conn.auth,
		})
	}

	connections.delete(conn)
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

		if (conn.verify && !await conn.verify()) {
			close(conn, 'credential revalidation failed')
			return
		}

		// Verification only asks whether the stack still passes, and an
		// attach-if-present ware passes with a revoked session still hanging
		// off the connection's request. Comparing the scope asks the sharper
		// question — is this still the same identity? — and a changed answer
		// ends the connection instead of pushing one identity's payload down a
		// channel another identity now owns.
		if (scope(conn.req) !== conn.scope) {
			close(conn, 'identity changed')
			return
		}

		conn.req.topics = new Set<string>()
		const data = await conn.revalidate()
		conn.topics = conn.req.topics ?? new Set<string>()
		const [head, ...entries] = data
		const hash = digest(head, entries)

		if (hash === conn.hash) return

		conn.hash = hash
		conn.send({
			data: data,
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
		await each(affected, limit, revalidate)
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

type Template = (slots: Record<string, string>) => string

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value

const body: Middleware = async (req, _, next) => {
	if (req.body !== undefined) return next()
	req.body = {}

	const type = first(req.headers['content-type'])
	const length = Number.parseInt(first(req.headers['content-length']) ?? '', 10)
	if (Number.isNaN(length) && req.headers['transfer-encoding'] === undefined) return next()
	if (type && !type.includes('application/json')) return next()
	if (length === 0) return next()

	let raw: Uint8Array
	try {
		raw = await req.read(100 * 1024)
	} catch (err) {
		return next(err)
	}

	try {
		req.body = JSON.parse(new TextDecoder().decode(raw))
	} catch (err) {
		const invalid = Object.assign(new Error('Invalid content'), {
			status: 422,
			details: err instanceof Error ? err.message : String(err),
		})
		return next(invalid)
	}

	return next()
}

/** Creates the host-neutral SSR handler from an HTML slot template. */
export async function create(template: Template, registries: Registries = {
	routes: routes as Registries['routes'],
	handlers: handlers as Registries['handlers'],
	wares: discoveredWares as Registries['wares'],
}) {
	register(registries.routes)

	const secure: Middleware = (_, res, next) => {
		headers.set(res, headers.security(), true)
		next()
	}

	const timing: Middleware = (req, _, next) => {
		req.timing = start()
		next()
	}

	const data = (page: Page, stack: Middleware[]): Middleware => async (req, res, next) => {

		req.topics = new Set<string>()
		req.verifyLive = () => verify(req, stack)

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
		// else — a missing header included — takes the loader path and gets an
		// answer computed with its own credentials.
		if (ajax(req) && req.headers['x-ajo-scope'] === scope(req) && fresh(parse(req.headers['x-ajo-versions']))) {
			if (req.timing) req.timing.loader = 0
			write(req, res, req.headers['x-have']?.toString(), true)
			return
		}

		const execute = async () => {

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

			const heads = await Promise.all([
				...paths.map((path, index) => handlers.get(path)?.head?.(req, async () => data[index]) ?? Promise.resolve({})),
				handlers.get(key)?.head?.(req, async () => entry) ?? Promise.resolve({})
			])

			return [merge(...heads), ...data] as Payload
		}

		const begun = performance.now()

		try {

			const result = await execute();
			if (req.timing) req.timing.loader = elapsed(begun)

			req.revalidate = execute
			req.head = result[0]
			req.entries = result.slice(1)

			next()

		} catch (err) {
			if (req.timing) req.timing.loader = elapsed(begun)
			next(normalize(err))
		}
	}

	const sse: Middleware = (req, res, next) => {

		if (req.headers.accept !== 'text/event-stream') return next()

		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'X-Accel-Buffering': 'no',
		})

		const stream = res.sse()

		const head = (req.head ?? {}) as Head
		const entries = (req.entries ?? []) as Data
		const hash = digest(head, entries)

		const conn: Connection = {
			req,
			auth: mode(req),
			scope: scope(req),
			topics: req.topics ?? new Set<string>(),
			hash,
			verify: req.verifyLive,
			revalidate: req.revalidate!,
			send: (message) => stream.send(`data: ${JSON.stringify(message)}\n\n`),
			close: () => {}
		}

		connections.add(conn)

		const heartbeat = setInterval(() => stream.send(':hb\n\n'), 30000)
		let closed = false

		const cleanup = () => {
			if (closed) return
			closed = true
			clearInterval(heartbeat)
			connections.delete(conn)
		}

		conn.close = () => {
			cleanup()
			stream.close()
		}

		void stream.closed.then(cleanup)
	}

	const render = async (req: Request, res: Reply, page: Page, error?: Failure) => {

		const begun = performance.now()
		const head = (req.head ?? {}) as Head
		const entries = (req.entries ?? []) as Data

		if (ajax(req)) {

			headers.set(res, base('application/json; charset=utf-8'))

			if (error) {
				const body = JSON.stringify({ error: error.toJSON() })

				if (req.timing) req.timing.render = elapsed(begun)
				done(req, res, error.status, size(body))

				return send(res, error.status, body)
			}

			const body = payload(head, entries)
			const hash = digest(head, entries)
			const match = req.headers['x-have'] === hash || req.headers['if-none-match'] === `"${hash}"`
			const meta = metadata(req.topics ?? new Set<string>())

			res.setHeader('ETag', `"${hash}"`)

			if (match) {
				if (req.timing) req.timing.render = elapsed(begun)
				write(req, res, hash)
				return
			}

			res.setHeader('X-Ajo-Cache', 'miss')

			const response = JSON.stringify({ ...body, hash, ...meta, scope: scope(req) })

			if (req.timing) req.timing.render = elapsed(begun)
			done(req, res, 200, size(response), 'miss')

			return send(res, 200, response)
		}

		let resolved: { page: Component; state?: State } | undefined

		for await (const r of resolve(req.originalUrl, layouts, page, entries, error)) resolved = r

		const hash = error ? undefined : digest(head, entries)
		const meta = metadata(req.topics ?? new Set<string>())
		const status = resolved?.state?.error?.status ?? error?.status ?? 200
		const state = {
			...resolved!.state,
			error: resolved!.state?.error?.toJSON?.() ?? resolved!.state?.error,
			head,
			hash,
			...meta,
			scope: scope(req),
		}
		const body = template({
			head: view(head as Head),
			data: script(state),
			root: html.render(<App page={resolved!.page} />),
		})

		if (req.timing) req.timing.render = elapsed(begun)
		done(req, res, status, size(body))

		send(
			res,
			status,
			body,
			base('text/html; charset=utf-8')
		)
	}

	const action = (segments: string[]): Middleware => async (req, res) => {
		const name = Object.keys(req.query).find(key => key.startsWith('/'))?.slice(1) || 'default'
		let handler: Action | undefined

		for (const path of ancestors(segments).filter(path => handlers.has(path)).reverse()) {
			handler = handlers.get(path)?.actions?.[name]
			if (handler) break
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
			return render(req, res, error(), normalized)
		},
		missing: (req, res) => {
			const missing = new Failure(404, 'Not found')
			if (api(req)) return send(res, 404, missing.toJSON())
			return render(req, res, error(), missing)
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

	for (const [file, loader] of Object.entries(registries.handlers)) {

		const exports = await loader()
		const segments = parts(file)
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
				app.route(method, `api/${pattern}`, body, ...collect(segments), route)
			}
		}
	}

	for (const page of pages) {

		const { pattern, segments } = page
		const path = `/${pattern || ''}`
		const stack = collect(segments)

		app.get(path, timing, ...stack, data(page, stack), sse, (req, res) => render(req, res, page))
		app.post(path, body, ...stack, action(segments))
	}

	return app.handler
}
