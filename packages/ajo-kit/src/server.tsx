import * as html from 'ajo/html'
import type { Component } from 'ajo'
import { AsyncLocalStorage } from 'node:async_hooks'
import polka from 'polka'
import type { Request, Response, Middleware } from 'polka'
import { json } from '@polka/parse'
/** Sends an HTTP response using Polka's send helper. */
export { default as send } from '@polka/send'
import send from '@polka/send'
import App, { resolve, layouts, pages, error, match, parts, parents } from './app'
import { Failure, links, ancestors, normalize, ajax, api } from './constants'
import type { State, Data, Entry, Page, Parent, Payload } from './constants'
import { merge, render as view, type Head } from './head'
import * as headers from './headers'
import { bump, fresh, topics as sorted, parse, hash, snapshot, type Versions } from './freshness'
import { elapsed, finish, log, header, start } from './timing'
import { script } from './ssr'
import { handlers as files, wares as stacks } from 'virtual:ajo/handlers'

const emitted = new AsyncLocalStorage<Set<string>>()

const payload = (head: Head, entries: Data) => ({ data: entries, head })

const digest = (head: Head, entries: Data) => hash(JSON.stringify(payload(head, entries)))

const metadata = (topics: Set<string>) => {
	const list = [...topics].sort()
	return { topics: list, versions: snapshot(list) }
}

const size = (body: string) => Buffer.byteLength(body)

const vary = 'Accept, Cookie'

const base = (type?: string) => ({
	'Cache-Control': 'no-store',
	Vary: vary,
	...(type && { 'Content-Type': type }),
})

const done = (req: Request, res: Response, status: number, bytes: number, cache?: string) => {
	const result = finish(req.timing, { status, bytes, cache })

	if (!result) return

	res.setHeader('Server-Timing', header(result))
	res.setHeader('X-Ajo-Bytes', String(bytes))
	log(`${req.method} ${req.originalUrl}`, result)
}

const write = (req: Request, res: Response, hash?: string, early = false) => {
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
	topics: Set<string>
	hash: string
	verify?: () => Promise<boolean>
	revalidate: () => Promise<Payload>
	send: (message: { data: Payload; hash: string; topics: string[]; versions: Versions }) => void
	close: () => void
}

const connections = new Set<Connection>()

const pending = new Set<string>()

let debounce: NodeJS.Timeout | null = null

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

const probe = () => {
	const headers = new Map<string, string | number | readonly string[]>()
	const res = {
		statusCode: 200,
		writableEnded: false,
		setHeader(key: string, value: string | number | readonly string[]) {
			headers.set(key.toLowerCase(), value)
			return res
		},
		getHeader(key: string) {
			return headers.get(key.toLowerCase())
		},
		hasHeader(key: string) {
			return headers.has(key.toLowerCase())
		},
		removeHeader(key: string) {
			headers.delete(key.toLowerCase())
		},
		writeHead(status: number, values?: Record<string, string | number | readonly string[]>) {
			res.statusCode = status
			if (values) {
				for (const [key, value] of Object.entries(values)) {
					if (value !== undefined) res.setHeader(key, value)
				}
			}
			return res
		},
		write() {
			res.writableEnded = true
			return true
		},
		end() {
			res.writableEnded = true
			return res
		}
	}

	return res as unknown as Response
}

const run = (ware: Middleware, req: Request) => new Promise<boolean>((resolve, reject) => {
	const res = probe()
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

const revalidate = async (conn: Connection) => {
	try {
		if (!connections.has(conn)) return

		if (conn.verify && !await conn.verify()) {
			close(conn, 'credential revalidation failed')
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
			...metadata(conn.topics)
		})

	} catch (err) {
		console.error('[SSE] Live update failed:', err)
		close(conn)
	}
}

/** Marks live data topics as changed and notifies matching SSE clients. */
export function emit(topic: string | string[]) {

	const topics = bump(topic)
	const store = emitted.getStore()

	topics.forEach(t => {
		pending.add(t)
		store?.add(t)
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

type Handler = {
	page?: (req: Request, parent: Parent) => Promise<Entry>
	layout?: (req: Request, parent: Parent) => Promise<Entry>
	head?: (req: Request, parent: Parent) => Promise<Head>
	actions?: Record<string, (req: Request, res: Response) => Promise<unknown>>
}

type Template = (slots: Record<string, string>) => string

const parser = json()

const body: Middleware = (req, res, next) => {
	let called = false
	const done = (err?: Parameters<typeof next>[0]) => {
		if (called) return
		called = true
		next(err)
	}

	try {
		parser(req, res, done)
	} catch (err) {
		done(err as Parameters<typeof next>[0])
	}
}

/** Creates the SSR Polka app from an HTML slot template. */
export async function create(template: Template) {

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

		if (ajax(req) && fresh(parse(req.headers['x-ajo-versions']))) {
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
			'Connection': 'keep-alive'
		})

		res.flushHeaders()

		const head = (req.head ?? {}) as Head
		const entries = (req.entries ?? []) as Data
		const hash = digest(head, entries)

		const conn: Connection = {
			req,
			auth: mode(req),
			topics: req.topics ?? new Set<string>(),
			hash,
			verify: req.verifyLive,
			revalidate: req.revalidate!,
			send: (message) => res.write(`data: ${JSON.stringify(message)}\n\n`),
			close: () => {}
		}

		connections.add(conn)

		const heartbeat = setInterval(() => res.write(':hb\n\n'), 30000)
		let closed = false

		const cleanup = () => {
			if (closed) return
			closed = true
			clearInterval(heartbeat)
			connections.delete(conn)
		}

		conn.close = () => {
			cleanup()
			if (!res.writableEnded) res.end()
		}

		req.socket?.on('close', cleanup)
	}

	const render = async (req: Request, res: Response, page: Page, error?: Failure) => {

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

			const response = JSON.stringify({ ...body, hash, ...meta })

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
		const url = new URL(req.originalUrl, `http://${req.headers.host}`)
		const name = [...url.searchParams.keys()].find(key => key.startsWith('/'))?.slice(1) || 'default'
		let handler: ((req: Request, res: Response) => Promise<unknown>) | undefined

		for (const path of ancestors(segments).filter(path => handlers.has(path)).reverse()) {
			handler = handlers.get(path)?.actions?.[name]
			if (handler) break
		}

		if (!handler) throw new Failure(400, `Action '${name}' not found`)

		const topics = new Set<string>()
		const result = await emitted.run(topics, () => handler(req, res)) as { redirect?: string } | void

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

	const app = polka({
		onError: (err, req, res) => {
			const normalized = normalize(err)
			if (!(err instanceof Failure) && normalized.status >= 500) console.error(err)
			if (api(req)) send(res, normalized.status, normalized.toJSON())
			else render(req, res, error(), normalized)
		},
		onNoMatch: (req, res) => {
			const missing = new Failure(404, 'Not found')
			if (api(req)) send(res, 404, missing.toJSON())
			else render(req, res, error(), missing)
		}
	})

	app.use(secure)

	const collect = (segments: string[]): Middleware[] => ancestors(segments).flatMap(path => wares.get(path) ?? [])

	const wares = new Map<string, Middleware[]>()

	for (const [file, loader] of Object.entries(stacks as Record<string, () => Promise<Record<string, unknown>>>)) {
		
		const exports = await loader()
		const key = parts(file).join('/')
		const items = Array.isArray(exports.default) ? exports.default : [exports.default]
		
		wares.set(key, (wares.get(key) ?? []).concat(items as Middleware[]))
	}

	const handlers = new Map<string, Handler>()

	for (const [file, loader] of Object.entries(files as Record<string, () => Promise<Record<string, unknown>>>)) {

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
				app[method](`api/${pattern}`, body, ...collect(segments), route)
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

	return app
}
