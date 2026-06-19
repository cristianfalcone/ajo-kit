import { render as html } from 'ajo/html'
import { h as createElement, type Component } from 'ajo'
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
import { handlers as handlerFiles, wares as wareFiles } from 'virtual:ajo/handlers'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const joinPath = (path: string, key: string | number) => `${path || ''}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`

const emitted = new AsyncLocalStorage<Set<string>>()

const payload = (head: Head, entries: Data) => ({ data: entries, head })

const metadata = (topics: Set<string>) => {
	const list = [...topics].sort()
	return { topics: list, versions: versionsFor(list) }
}

const byteLength = (body: string) => Buffer.byteLength(body)

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
	res.setHeader('Cache-Control', 'no-store')
	res.setHeader('X-Ajo-Cache', cache)
	if (hash) res.setHeader('ETag', `"${hash}"`)
	finishTiming(req, res, 304, 0, cache)
	res.end()
}

export function diff(a: any, b: any, path = ''): any[] {

	if (a === b) return []

	if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
		return [{ op: 'replace', path: path || '/', value: b }]
	}

	if (Array.isArray(a) && Array.isArray(b)) {

		let same = a.length === b.length

		if (same) {
			for (let i = 0; i < a.length; i++) {
				if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
					same = false
					break
				}
			}
		}

		if (same) return []

		if (b.length > a.length && JSON.stringify(a) === JSON.stringify(b.slice(0, a.length))) {

			const patches: any[] = []

			for (let i = a.length; i < b.length; i++) patches.push({ op: 'add', path: `${path || ''}/-`, value: b[i] })

			return patches
		}

		if (b.length > a.length && JSON.stringify(a) === JSON.stringify(b.slice(b.length - a.length))) {

			const patches: any[] = []

			for (let i = 0; i < b.length - a.length; i++) patches.push({ op: 'add', path: joinPath(path, i), value: b[i] })

			return patches
		}

		if (a.length === b.length && a.length > 0) {
			for (let shift = 1; shift < Math.min(10, a.length); shift++) {
				if (JSON.stringify(a.slice(shift)) === JSON.stringify(b.slice(0, b.length - shift))) {

					const patches: any[] = []

					for (let i = 0; i < shift; i++) patches.push({ op: 'remove', path: `${path || ''}/0` })
					for (let i = b.length - shift; i < b.length; i++) patches.push({ op: 'add', path: `${path || ''}/-`, value: b[i] })

					return patches
				}
			}
		}

		const patches: any[] = []

		for (let i = 0; i < Math.max(a.length, b.length); i++) {
			if (i >= a.length) patches.push({ op: 'add', path: joinPath(path, i), value: b[i] })
			else if (i >= b.length) patches.push({ op: 'remove', path: joinPath(path, i) })
			else patches.push(...diff(a[i], b[i], joinPath(path, i)))
		}

		return patches
	}

	const patches: any[] = []
	const keys = new Set([...Object.keys(a), ...Object.keys(b)])

	for (const key of keys) {

		const currentPath = joinPath(path, key)

		if (!(key in a)) patches.push({ op: 'add', path: currentPath, value: b[key] })
		else if (!(key in b)) patches.push({ op: 'remove', path: currentPath })
		else patches.push(...diff(a[key], b[key], currentPath))
	}

	return patches
}

export type LiveConnection = {
	req: Request
	topics: Set<string>
	hash: string
	lastData: any[]
	revalidate: () => Promise<any[]>
	send: (message: { patches: any[]; hash: string; topics: string[]; versions: TopicVersions }) => void
}

export const liveConnections = new Set<LiveConnection>()

const pendingTopics = new Set<string>()

let debounceTimeout: NodeJS.Timeout | null = null

export function emit(topic: string | string[]) {

	const topics = bumpTopics(topic)
	const store = emitted.getStore()

	topics.forEach(t => {
		pendingTopics.add(t)
		store?.add(t)
	})

	if (!debounceTimeout) {

		debounceTimeout = setTimeout(async () => {

			const currentTopics = new Set(pendingTopics)

			pendingTopics.clear()

			debounceTimeout = null

			for (const conn of liveConnections) {

				let affected = false

				for (const t of currentTopics) {
					if (conn.topics.has(t)) {
						affected = true
						break
					}
				}

				if (!affected) continue

				try {

					conn.req.topics = new Set<string>()
					const newData = await conn.revalidate()
					conn.topics = conn.req.topics ?? new Set<string>()
					const [head, ...entries] = newData as [Head, ...Data]
					const digest = routeHash(JSON.stringify(payload(head, entries)))

					if (digest === conn.hash) continue

					const patches = diff(conn.lastData, newData)

					conn.hash = digest
					conn.lastData = clone(newData)

					if (patches.length > 0) conn.send({ patches, hash: digest, ...metadata(conn.topics) })

				} catch (err) {
					console.error('[SSE] Live update failed:', err)
				}
			}
		}, 10)
	}
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

	const timing: Middleware = (req, _, next) => {
		req.timing = startRouteTiming()
		next()
	}

	const data = (page: Page): Middleware => async (req, res, next) => {

		req.topics = new Set<string>()

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
		const digest = routeHash(JSON.stringify(payload(head, entries)))

		const conn: LiveConnection = {
			req,
			topics: req.topics ?? new Set<string>(),
			hash: digest,
			lastData: clone([head, ...entries]),
			revalidate: req.revalidate!,
			send: (message) => res.write(`data: ${JSON.stringify(message)}\n\n`)
		}

		liveConnections.add(conn)

		const heartbeat = setInterval(() => res.write(':hb\n\n'), 30000)

		req.socket?.on('close', () => {
			clearInterval(heartbeat)
			liveConnections.delete(conn)
		})
	}

	const render = async (req: Request, res: Response, page: Page, error?: AppError) => {

		const renderStart = performance.now()
		const head = (req.head ?? {}) as Head
		const entries = (req.entries ?? []) as Data

		if (ajax(req)) {

			res.setHeader('Cache-Control', 'no-store')
			res.setHeader('Content-Type', 'application/json')

			if (error) {
				const body = JSON.stringify({ error: error.toJSON() })

				if (req.timing) req.timing.render = elapsed(renderStart)
				finishTiming(req, res, error.status, byteLength(body))

				return send(res, error.status, body)
			}

			const body = payload(head, entries)
			const digest = routeHash(JSON.stringify(body))
			const match = req.headers['x-have'] === digest || req.headers['if-none-match'] === `"${digest}"`
			const meta = metadata(req.topics ?? new Set<string>())

			res.setHeader('ETag', `"${digest}"`)

			if (match) {
				if (req.timing) req.timing.render = elapsed(renderStart)
				writeFresh(req, res, digest)
				return
			}

			res.setHeader('X-Ajo-Cache', 'miss')

			const response = JSON.stringify({ ...body, hash: digest, ...meta })

			if (req.timing) req.timing.render = elapsed(renderStart)
			finishTiming(req, res, 200, byteLength(response), 'miss')

			return send(res, 200, response)
		}

		let resolved: { page: Component; state?: State } | undefined

		for await (const r of resolve(req.originalUrl, layouts, page, entries, error)) resolved = r

		const digest = error ? undefined : routeHash(JSON.stringify(payload(head, entries)))
		const meta = metadata(req.topics ?? new Set<string>())
		const status = resolved?.state?.error?.status ?? error?.status ?? 200
		const body = template({
			head: renderHead(head as Head),
			data: `<script>globalThis.__SSR__=${JSON.stringify(JSON.stringify({ ...resolved!.state, head, hash: digest, ...meta, rawServerData: [head, ...entries] }))}</script>`,
			root: html(createElement(App, { page: resolved!.page })),
		})

		if (req.timing) req.timing.render = elapsed(renderStart)
		finishTiming(req, res, status, byteLength(body))

		send(
			res,
			status,
			body,
			{ 'Content-Type': 'text/html' }
		)
	}

	const action = (segments: string[]): Middleware => (req, _, next) => {

		const url = new URL(req.originalUrl, `http://${req.headers.host}`)
		const name = [...url.searchParams.keys()].find(key => key.startsWith('/'))?.slice(1) || 'default'

		for (const path of ancestors(segments).filter(path => handlers.has(path)).reverse()) {

			const invoke = handlers.get(path)?.actions?.[name]

			if (invoke) {
				req.action = { name, invoke }
				return next()
			}
		}

		throw new AppError(400, `Action '${name}' not found`)
	}

	const invoke = (): Middleware => async (req, res) => {

		if (!req.action) return

		const topics = new Set<string>()
		const result = await emitted.run(topics, () => req.action!.invoke(req, res)) as { redirect?: string } | void

		if (ajax(req)) {
			const body = result?.redirect ? { redirect: result.redirect } : (result ?? { ok: true })
			const payload = {
				...body,
				...(topics.size > 0 && { topics: normalizeTopics([...topics]) })
			}

			res.setHeader('Cache-Control', 'no-store')
			res.setHeader('Content-Type', 'application/json')

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

		app.get(path, timing, json(), ...routeWares, data(page), sse, (req, res) => render(req, res, page))
		app.post(path, action(segments), json(), ...routeWares, invoke())
	}

	return app
}
