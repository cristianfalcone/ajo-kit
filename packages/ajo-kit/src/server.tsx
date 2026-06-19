import { render as html } from 'ajo/html'
import { h as createElement } from 'ajo/jsx-runtime'
import type { Component } from 'ajo'
import { AsyncLocalStorage } from 'node:async_hooks'
import polka from 'polka'
import type { Request, Response, Middleware } from 'polka'
import { json } from '@polka/parse'
export { default as send } from '@polka/send'
import send from '@polka/send'
import App, { resolve, layouts, pages, error, toPattern, toSegments, layoutPaths } from './app'
import { AppError, links, ancestors, normalize, ajax, api } from './constants'
import type { State, Data, Entry, Page, Parent } from './constants'
import { merge, render as renderHead, type Head } from './head'
import { bumpTopics, isFresh, normalizeTopics, parseVersions, routeHash, versionsFor, type TopicVersions } from './freshness'
import { elapsed, finishRouteTiming, logRouteTiming, serverTiming, startRouteTiming } from './timing'
import { renderSSRScript } from './ssr'
import { replacePatch, type Patch } from './patch'
import { handlers as handlerFiles, wares as wareFiles } from 'virtual:ajo/handlers'

const emitted = new AsyncLocalStorage<Set<string>>()

const payload = (head: Head, entries: Data) => ({ data: entries, head })

const digest = (head: Head, entries: Data) => routeHash(JSON.stringify(payload(head, entries)))

const metadata = (topics: Set<string>) => {
	const list = [...topics].sort()
	return { topics: list, versions: versionsFor(list) }
}

const byteLength = (body: string) => Buffer.byteLength(body)

const routeVary = 'Accept, Cookie'

const configuredHttps = () => {
	if (process.env.NODE_ENV !== 'production' || !process.env.APP_URL) return false
	try {
		return new URL(process.env.APP_URL).protocol === 'https:'
	} catch {
		return false
	}
}

const securityHeaders = () => ({
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
	'Content-Security-Policy': "frame-ancestors 'none'",
	...(configuredHttps() && { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }),
})

const routeHeaders = (type?: string) => ({
	'Cache-Control': 'no-store',
	Vary: routeVary,
	...(type && { 'Content-Type': type }),
})

const headers = (res: Response, values: Record<string, string | number | readonly string[]>, missing = false) => {
	for (const [key, value] of Object.entries(values)) {
		if (!missing || !res.hasHeader(key)) res.setHeader(key, value)
	}
}

const finishTiming = (req: Request, res: Response, status: number, bytes: number, cache?: string) => {
	const result = finishRouteTiming(req.timing, { status, bytes, cache })

	if (!result) return

	res.setHeader('Server-Timing', serverTiming(result))
	res.setHeader('X-Ajo-Bytes', String(bytes))
	logRouteTiming(`${req.method} ${req.originalUrl}`, result)
}

const writeFresh = (req: Request, res: Response, hash?: string, early = false) => {
	const cache = early ? 'fresh' : 'revalidated'

	res.statusCode = 304
	headers(res, routeHeaders())
	res.setHeader('X-Ajo-Cache', cache)
	if (hash) res.setHeader('ETag', `"${hash}"`)
	finishTiming(req, res, 304, 0, cache)
	res.end()
}

type LiveConnection = {
	req: Request
	auth: 'anonymous' | 'bearer' | 'session' | 'user'
	topics: Set<string>
	hash: string
	verify?: () => Promise<boolean>
	revalidate: () => Promise<any[]>
	send: (message: { patches: Patch[]; hash: string; topics: string[]; versions: TopicVersions }) => void
	close: () => void
}

const liveConnections = new Set<LiveConnection>()

const pendingTopics = new Set<string>()

let debounceTimeout: NodeJS.Timeout | null = null

const sseConcurrency = 4

const liveAuth = (req: Request): LiveConnection['auth'] => {
	if (req.token) return 'bearer'
	if (req.session) return 'session'
	if (req.user) return 'user'
	return 'anonymous'
}

const hasTopic = (conn: LiveConnection, topics: Set<string>) => {
	return [...topics].some(topic => conn.topics.has(topic))
}

const liveProbeResponse = () => {
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

const runLiveMiddleware = (ware: Middleware, req: Request) => new Promise<boolean>((resolve, reject) => {
	const res = liveProbeResponse()
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

const verifyLiveRequest = async (req: Request, wares: Middleware[]) => {
	for (const ware of wares) {
		if (!await runLiveMiddleware(ware, req)) return false
	}

	return true
}

const forEachConcurrent = async <T,>(items: T[], limit: number, run: (item: T) => Promise<void>) => {
	let index = 0
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (index < items.length) await run(items[index++])
	})

	await Promise.all(workers)
}

const closeConnection = (conn: LiveConnection, reason?: string) => {
	if (reason) {
		console.warn('[SSE] Closing live connection:', {
			reason,
			path: conn.req.path,
			auth: conn.auth,
		})
	}

	liveConnections.delete(conn)
	conn.close()
}

const revalidateConnection = async (conn: LiveConnection) => {
	try {
		if (!liveConnections.has(conn)) return

		if (conn.verify && !await conn.verify()) {
			closeConnection(conn, 'credential revalidation failed')
			return
		}

		conn.req.topics = new Set<string>()
		const newData = await conn.revalidate()
		conn.topics = conn.req.topics ?? new Set<string>()
		const [head, ...entries] = newData as [Head, ...Data]
		const hash = digest(head, entries)

		if (hash === conn.hash) return

		conn.hash = hash
		conn.send({ patches: replacePatch(newData), hash, ...metadata(conn.topics) })

	} catch (err) {
		console.error('[SSE] Live update failed:', err)
		closeConnection(conn)
	}
}

export function emit(topic: string | string[]) {

	const topics = bumpTopics(topic)
	const store = emitted.getStore()

	topics.forEach(t => {
		pendingTopics.add(t)
		store?.add(t)
	})

	if (debounceTimeout) return

	debounceTimeout = setTimeout(async () => {
		const currentTopics = new Set(pendingTopics)
		pendingTopics.clear()
		debounceTimeout = null

		const affected = [...liveConnections].filter(conn => hasTopic(conn, currentTopics))
		await forEachConcurrent(affected, sseConcurrency, revalidateConnection)
	}, 10)
}

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'

const methods: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']

type ApiModule = Partial<Record<HttpMethod, Middleware>>

type PageHandler = {
	page?: (req: Request, parent: Parent) => Promise<Entry>
	layout?: (req: Request, parent: Parent) => Promise<Entry>
	head?: (req: Request, parent: Parent) => Promise<Head>
	actions?: Record<string, (req: Request, res: Response) => Promise<unknown>>
}

type Template = (slots: Record<string, string>) => string

export async function create(template: Template) {

	const secure: Middleware = (_, res, next) => {
		headers(res, securityHeaders(), true)
		next()
	}

	const timing: Middleware = (req, _, next) => {
		req.timing = startRouteTiming()
		next()
	}

	const data = (page: Page, routeWares: Middleware[]): Middleware => async (req, res, next) => {

		req.topics = new Set<string>()
		req.verifyLive = () => verifyLiveRequest(req, routeWares)

		req.track = (topic: string | string[]) => {
			if (Array.isArray(topic)) topic.forEach(t => req.topics!.add(t))
			else req.topics!.add(topic)
		}

		const paths = layoutPaths(page.segments)
		const key = page.segments.join('/')

		if (ajax(req) && isFresh(parseVersions(req.headers['x-ajo-versions']))) {
			if (req.timing) req.timing.loader = 0
			writeFresh(req, res, req.headers['x-have']?.toString(), true)
			return
		}

		const executeLoaders = async () => {

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

			const layoutData = await Promise.all(paths.map((path, depth) => run(handlers.get(path)?.layout, depth)))
			const pageData = await run(handlers.get(key)?.page, paths.length)
			const allData = [...layoutData, pageData]

			const headData = await Promise.all([
				...paths.map((path, index) => handlers.get(path)?.head?.(req, async () => allData[index]) ?? Promise.resolve({})),
				handlers.get(key)?.head?.(req, async () => pageData) ?? Promise.resolve({})
			])

			return [merge(...headData), ...allData] as any[]
		}

		const loaderStart = performance.now()

		try {

			const result = await executeLoaders();
			if (req.timing) req.timing.loader = elapsed(loaderStart)

			req.revalidate = executeLoaders
			req.head = result[0]
			req.entries = result.slice(1)

			next()

		} catch (err) {
			if (req.timing) req.timing.loader = elapsed(loaderStart)
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

		const conn: LiveConnection = {
			req,
			auth: liveAuth(req),
			topics: req.topics ?? new Set<string>(),
			hash,
			verify: req.verifyLive,
			revalidate: req.revalidate!,
			send: (message) => res.write(`data: ${JSON.stringify(message)}\n\n`),
			close: () => {}
		}

		liveConnections.add(conn)

		const heartbeat = setInterval(() => res.write(':hb\n\n'), 30000)
		let closed = false

		const cleanup = () => {
			if (closed) return
			closed = true
			clearInterval(heartbeat)
			liveConnections.delete(conn)
		}

		conn.close = () => {
			cleanup()
			if (!res.writableEnded) res.end()
		}

		req.socket?.on('close', cleanup)
	}

	const render = async (req: Request, res: Response, page: Page, error?: AppError) => {

		const renderStart = performance.now()
		const head = (req.head ?? {}) as Head
		const entries = (req.entries ?? []) as Data

		if (ajax(req)) {

			headers(res, routeHeaders('application/json; charset=utf-8'))

			if (error) {
				const body = JSON.stringify({ error: error.toJSON() })

				if (req.timing) req.timing.render = elapsed(renderStart)
				finishTiming(req, res, error.status, byteLength(body))

				return send(res, error.status, body)
			}

			const body = payload(head, entries)
			const hash = digest(head, entries)
			const match = req.headers['x-have'] === hash || req.headers['if-none-match'] === `"${hash}"`
			const meta = metadata(req.topics ?? new Set<string>())

			res.setHeader('ETag', `"${hash}"`)

			if (match) {
				if (req.timing) req.timing.render = elapsed(renderStart)
				writeFresh(req, res, hash)
				return
			}

			res.setHeader('X-Ajo-Cache', 'miss')

			const response = JSON.stringify({ ...body, hash, ...meta })

			if (req.timing) req.timing.render = elapsed(renderStart)
			finishTiming(req, res, 200, byteLength(response), 'miss')

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
			head: renderHead(head as Head),
			data: renderSSRScript(state),
			root: html(createElement(App, { page: resolved!.page })),
		})

		if (req.timing) req.timing.render = elapsed(renderStart)
		finishTiming(req, res, status, byteLength(body))

		send(
			res,
			status,
			body,
			routeHeaders('text/html; charset=utf-8')
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

		if (!handler) throw new AppError(400, `Action '${name}' not found`)

		const topics = new Set<string>()
		const result = await emitted.run(topics, () => handler(req, res)) as { redirect?: string } | void

		if (ajax(req)) {
			const body = result?.redirect ? { redirect: result.redirect } : (result ?? { ok: true })
			const emittedTopics = normalizeTopics([...topics])
			const payload = {
				...body,
				...(emittedTopics.length > 0 && {
					topics: emittedTopics,
					versions: versionsFor(emittedTopics),
				})
			}

			headers(res, routeHeaders('application/json; charset=utf-8'))

			send(res, 200, JSON.stringify(payload))

			return
		}

		res.statusCode = 302
		res.setHeader('Location', result?.redirect ?? req.originalUrl.split('?')[0])
		res.end()
	}

	const app = polka({
		onError: (err, req, res) => {
			if (!(err instanceof AppError)) console.error(err)
			const normalized = normalize(err)
			if (api(req)) send(res, normalized.status, normalized.toJSON())
			else render(req, res, error(), normalized)
		},
		onNoMatch: (req, res) => {
			const notFound = new AppError(404, 'Not found')
			if (api(req)) send(res, 404, notFound.toJSON())
			else render(req, res, error(), notFound)
		}
	})

	app.use(secure)

	const collect = (segments: string[]): Middleware[] => ancestors(segments).flatMap(path => wares.get(path) ?? [])

	const wares = new Map<string, Middleware[]>()

	for (const [file, loader] of Object.entries(wareFiles as Record<string, () => Promise<Record<string, unknown>>>)) {
		
		const exports = await loader()
		const key = toSegments(file).join('/')
		const items = Array.isArray(exports.default) ? exports.default : [exports.default]
		
		wares.set(key, (wares.get(key) ?? []).concat(items as Middleware[]))
	}

	const handlers = new Map<string, PageHandler>()

	for (const [file, loader] of Object.entries(handlerFiles as Record<string, () => Promise<Record<string, unknown>>>)) {

		const exports = await loader()
		const segments = toSegments(file)
		const key = segments.join('/')
		const pattern = toPattern(segments)

		const { default: apiHandlers, page, layout, head, actions } = exports as {
			default?: ApiModule
			page?: PageHandler['page']
			layout?: PageHandler['layout']
			head?: PageHandler['head']
			actions?: PageHandler['actions']
		}

		handlers.set(key, { page, layout, head, actions })

		if (apiHandlers) {
			for (const method of methods) {
				const route = apiHandlers[method]
				if (!route) continue
				app[method](`api/${pattern}`, json(), ...collect(segments), route)
			}
		}
	}

	for (const page of pages) {

		const { pattern, segments } = page
		const path = `/${pattern || ''}`
		const routeWares = collect(segments)

		app.get(path, timing, json(), ...routeWares, data(page, routeWares), sse, (req, res) => render(req, res, page))
		app.post(path, json(), ...routeWares, action(segments))
	}

	return app
}
