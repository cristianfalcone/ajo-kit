import { render as html } from 'ajo/html'
import type { Component } from 'ajo'
import polka from 'polka'
import type { Request, Response, Middleware } from 'polka'
import { json } from '@polka/parse'
import send from '@polka/send'
import { parse } from 'regexparam'
import App, { resolve, layouts, pages, error, toPattern, toSegments, layoutPaths, cacheKeys, reGroup } from '/src/app'
import { AppError, links, ancestors, normalize, ajax, api, sum, pack } from '/src/constants'
import { snapshot, tap } from '/src/data'
import type { State, Data, Entry, Page, Parent } from '/src/constants'
import { merge, render as renderHead, type Head } from '/src/head'

// Event bus

type Listener = (params: Record<string, unknown>) => void

const bus = new Map<string, Set<Listener>>()

export const on = (name: string, fn: Listener) => {
	if (!bus.has(name)) bus.set(name, new Set())
	bus.get(name)!.add(fn)
	return () => bus.get(name)!.delete(fn)
}

export const emit = (name: string, params?: Record<string, unknown>) => {
	bus.get(name)?.forEach(fn => fn(params ?? {}))
}

// SSE clients

type SSEClient = {
	req: Request
	send: (data: Entry) => void
}

const clients = new Set<SSEClient>()

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'

type EventHandler = (req: Request) => Promise<Entry>

type EventRegistration = { route: { pattern: RegExp, keys: string[] }, name: string, handler: EventHandler }

const registrations: EventRegistration[] = []

type PageHandler = {
	page?: (req: Request, parent: Parent) => Promise<Entry>
	layout?: (req: Request, parent: Parent) => Promise<Entry>
	head?: (req: Request, parent: Parent) => Promise<Head>
	deps?: string[]
	actions?: Record<string, (req: Request, res: Response) => Promise<unknown>>
	events?: Record<string, EventHandler>
}

// Parse deps array: tables + special keys (:user, :ttl:N)
const parseDeps = (deps?: string[]) => {

	if (!deps) return { tables: [] as string[], user: false, ttl: null as number | null }

	return {
		tables: deps.filter(d => !d.startsWith(':')),
		user: deps.includes(':user'),
		ttl: Number(deps.find(d => d.startsWith(':ttl:'))?.slice(5)) || null
	}
}

// Generate sum based on deps (versions + user + ttl bucket)
const depSum = (deps: string[] | undefined, userId?: number) => {

	if (!deps) return null

	const { tables, user, ttl } = parseDeps(deps)

	if (tables.length === 0) return null

	return sum({
		v: snapshot(tables),
		u: user ? userId : undefined,
		t: ttl ? Math.floor(Date.now() / ttl) : undefined
	})
}

type Template = (slots: Record<string, string>) => string

// Parse X-Have header: "head=abc,(app)=def,dashboard=ghi" → { head: "abc", "(app)": "def", ... }
const have = (header?: string): Record<string, string> =>
	header ? Object.fromEntries(header.split(',').map(p => [p.slice(0, p.indexOf('=')), p.slice(p.indexOf('=') + 1)])) : {}

// Dual execution: server (handler.ts) + client (module) in parallel
// Returns { server, merged } for consistent sum calculation
async function dual<T extends object>(
	serverFn: () => Promise<T> | undefined,
	clientFn: () => Promise<T> | undefined,
	isAjax: boolean
): Promise<{ server: T; merged: T }> {

	if (isAjax) {
		const server = await serverFn() ?? ({} as T)
		return { server, merged: server }
	}

	const [server, client] = await Promise.all([
		serverFn() ?? ({} as T),
		clientFn() ?? ({} as T)
	])

	return { server, merged: { ...server, ...client } as T }
}

export async function create(template: Template) {

	const data = (page: Page): Middleware => async (req, _, next) => {

		const url = req.originalUrl
		const { segments, loader } = page
		const params = req.params
		const isAjax = ajax(req)

		const paths = layoutPaths(segments)
		const chain = links(paths.length + 1)
		const keys = cacheKeys(paths, segments)

		// Parse client cache header

		const clientHave = have(req.headers['x-have'] as string | undefined)

		// Check if handler can be skipped (client sum matches current deps state)

		const canSkip = (handler: PageHandler | undefined, key: string) =>
			handler?.deps && isAjax && clientHave[key] === depSum(handler.deps, req.user?.id)

		// Load layouts with dual execution

		const layoutTasks = paths.map(async (path, depth) => {

			const { parent, deferred } = chain[depth]
			const handler = handlers.get(path)

			// Skip if client sum matches current deps state

			if (canSkip(handler, keys[depth + 1])) {
				const cached = clientHave[keys[depth + 1]]
				deferred.resolve({})
				return { server: {}, merged: {}, module: undefined, handler: undefined, skipped: cached }
			}

			try {

				const module = await layouts.get(path)?.()

				const entry = await dual(
					() => handler?.layout?.(req, parent),
					() => module?.handler?.({ url, params }, parent),
					isAjax
				)

				deferred.resolve(entry.merged)

				return { ...entry, module, handler }

			} catch (error) {
				deferred.reject(normalize(error))
				throw error
			}
		})

		// Load page with dual execution

		const pageTask = (async () => {

			const depth = paths.length
			const { parent, deferred } = chain[depth]
			const handler = handlers.get(segments.join('/'))
			const pageKey = keys[keys.length - 1]

			// Skip if client sum matches current deps state

			if (canSkip(handler, pageKey)) {
				const cached = clientHave[pageKey]
				deferred.resolve({})
				return { server: {}, merged: {}, module: undefined, handler: undefined, skipped: cached }
			}

			try {

				const module = await loader()

				const entry = await dual(
					() => handler?.page?.(req, parent),
					() => module?.handler?.({ url, params }, parent),
					isAjax
				)

				deferred.resolve(entry.merged)

				return { ...entry, module, handler }

			} catch (error) {
				deferred.reject(normalize(error))
				throw error
			}
		})()

		const [layoutResults, pageResult] = await Promise.all([
			Promise.all(layoutTasks),
			pageTask
		])

		// Load head with dual execution

		const headTasks = await Promise.all([
			...layoutResults.map(({ module, handler, merged, skipped }) =>
				skipped ? Promise.resolve({ server: {}, merged: {} }) : dual(
					() => handler?.head?.(req, async () => merged),
					() => module?.head?.({ url, params }, async () => merged),
					isAjax
				)
			),
			pageResult.skipped ? Promise.resolve({ server: {}, merged: {} }) : dual(
				() => pageResult.handler?.head?.(req, async () => pageResult.merged),
				() => pageResult.module?.head?.({ url, params }, async () => pageResult.merged),
				isAjax
			)
		])

		// Build unified arrays: [head, ...layouts, page]
		// Server-only for sums, merged for response

		const serverHead = merge(...headTasks.map(h => h.server))
		const head = merge(...headTasks.map(h => h.merged))

		const results = [null, ...layoutResults, pageResult]
		const unified = [head, ...layoutResults.map(r => r.merged), pageResult.merged]
		const server = [serverHead, ...layoutResults.map(r => r.server), pageResult.server]

		// Sums: deps-based for handlers with deps, content-based otherwise

		const sums = results.map((result, i) => {
			if (result?.skipped) return result.skipped
			const deps = result?.handler?.deps
			return depSum(deps, req.user?.id) ?? sum(server[i])
		})

		// For skipped handlers, return null (client uses cache)

		const optimized = unified.map((item, i) =>
			results[i]?.skipped ? null : (clientHave[keys[i]] === sums[i] ? null : item)
		)

		req.data = optimized
		req.sums = sums.map((s, i) => optimized[i] === null ? null : s)

		next()
	}

	// Core render logic - used by pages and error handlers

	const render = async (req: Request, res: Response, page: Page, error?: AppError) => {

		if (ajax(req)) {
			return send(res, error?.status ?? 200, pack(error
				? { error }
				: { data: req.data, sums: req.sums }
			))
		}

		// SSR: extract head and entries from unified data
		const [head, ...entries] = req.data ?? []

		// Calculate keys for client cache population
		const paths = layoutPaths(page.segments)
		const keys = cacheKeys(paths, page.segments)

		let resolved: { Page: Component; data?: State }

		for await (const state of resolve(req.originalUrl, layouts, page, entries as Data, error)) {
			resolved = state
		}

		send(
			res,
			resolved!.data?.error?.status ?? 200,
			template({
				head: renderHead(head as Head),
				data: `<script>globalThis.__SSR__=${JSON.stringify(pack({ ...resolved!.data, head, keys, sums: req.sums }))}</script>`,
				root: html(<App page={resolved!.Page} />),
			}),
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

	// Handler factory: execute action and respond

	const invoke = (): Middleware => async (req, res) => {

		if (!req.action) return

		const result = await req.action.invoke(req, res) as { redirect?: string } | void

		if (ajax(req)) {
			const payload = result?.redirect ? { redirect: result.redirect } : (result ?? { ok: true })
			send(res, 200, pack(payload))
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
			api(req)
				? send(res, normalized.status, normalized.toJSON())
				: render(req, res, error(), normalized)
		},
		onNoMatch: (req, res) => {
			const notFound = new AppError(404, 'Not found')
			api(req)
				? send(res, 404, notFound.toJSON())
				: render(req, res, error(), notFound)
		}
	})

	const collect = (segments: string[]): Middleware[] => ancestors(segments).flatMap(path => wares.get(path) ?? [])

	// Load wares first

	const wareFiles = import.meta.glob('/src/**/wares.{j,t}s{,x}') as Record<string, () => Promise<Record<string, unknown>>>
	const wares = new Map<string, Middleware[]>()

	for (const [file, loader] of Object.entries(wareFiles)) {
		const exports = await loader()
		const key = toSegments(file).join('/')
		const items = Array.isArray(exports.default) ? exports.default : [exports.default]
		wares.set(key, (wares.get(key) ?? []).concat(items as Middleware[]))
	}

	// Then load handlers (wares guaranteed available)

	const handlerFiles = import.meta.glob('/src/**/handler.{j,t}s{,x}') as Record<string, () => Promise<Record<string, unknown>>>
	const handlers = new Map<string, PageHandler>()

	for (const [file, loader] of Object.entries(handlerFiles)) {

		const exports = await loader()
		const segments = toSegments(file)
		const key = segments.join('/')
		const pattern = toPattern(segments)

		const { default: api, page, layout, head, deps, actions, events } = exports
		handlers.set(key, { page, layout, head, deps, actions, events } as PageHandler)

		// Register event listeners

		if (events) {

			const trailing = reGroup.test(segments.at(-1) ?? '')
			const route = parse(`/${trailing ? (pattern ? pattern + '/*' : '*') : pattern}`)

			for (const [name, fn] of Object.entries(events as Record<string, EventHandler>)) {

				registrations.push({ route, name, handler: fn })

				on(name, async (params) => {

					for (const client of clients) {

						// Match client path against handler pattern

						const match = route.pattern.exec(client.req.path)

						if (!match) continue

						// Extract params from matched path

						const extracted = route.keys.reduce((acc, key, i) => ({ ...acc, [key]: match[i + 1] }), {} as Record<string, string>)

						// Check emit params match extracted route params

						const skip = Object.entries(params).some(([k, v]) => extracted[k] !== undefined && extracted[k] !== v)

						if (skip) continue

						// Execute event handler with error handling

						try {
							const data = await fn(Object.assign(Object.create(client.req), { params: extracted }))
							client.send({ event: name, data, error: null })
						} catch (e) {
							client.send({ event: name, data: null, error: normalize(e).toJSON() })
						}
					}
				})
			}
		}

		if (api) {
			for (const method of Object.keys(api) as HttpMethod[]) {
				app[method](`api/${pattern}`, json(), ...collect(segments), (api as Record<HttpMethod, Middleware>)[method])
			}
		}
	}

	// Auto-emit: table writes → event broadcasts (debounced per microtask)

	const binds = new Map<string, Set<string>>()

	for (const [, handler] of handlers) if (handler.events && handler.deps) {

		const tables = handler.deps.filter(d => !d.startsWith(':'))

		for (const table of tables) {
			if (!binds.has(table)) binds.set(table, new Set())
			for (const name of Object.keys(handler.events)) binds.get(table)!.add(name)
		}
	}

	const pending = new Set<string>()

	tap(table => {

		const names = binds.get(table)

		if (!names) return

		if (!pending.size) queueMicrotask(() => {
			pending.forEach(name => emit(name))
			pending.clear()
		})

		names.forEach(name => pending!.add(name))
	})

	// SSE middleware - intercepts EventSource requests (Accept: text/event-stream)

	const SSE_MAX_PER_USER = 5
	const SSE_HEARTBEAT_MS = 30_000

	const sse: Middleware = (req, res, next) => {

		if (req.headers.accept !== 'text/event-stream') return next()

		// Per-user connection limits

		if (req.user) {

			const count = [...clients].filter(c => c.req.user?.id === req.user!.id).length

			if (count >= SSE_MAX_PER_USER) {
				res.writeHead(429)
				res.end()
				return
			}
		}

		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		})

		res.flushHeaders()

		const client: SSEClient = {
			req,
			send: (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)
		}

		clients.add(client)

		// Send initial event data

		for (const { route, name, handler } of registrations) {

			const match = route.pattern.exec(client.req.path)

			if (!match) continue

			const extracted = route.keys.reduce((acc, key, i) => ({ ...acc, [key]: match[i + 1] }), {} as Record<string, string>)

			handler(Object.assign(Object.create(client.req), { params: extracted }))
				.then(data => client.send({ event: name, data, error: null }))
				.catch(e => client.send({ event: name, data: null, error: normalize(e).toJSON() }))
		}

		// Heartbeat to detect dead connections

		const heartbeat = setInterval(() => {
			if (!res.write(':heartbeat\n\n')) {
				clearInterval(heartbeat)
				clients.delete(client)
			}
		}, SSE_HEARTBEAT_MS)

		req.socket?.on('close', () => {
			clearInterval(heartbeat)
			clients.delete(client)
		})
	}

	// Register pages

	for (const page of pages) {

		const { pattern, segments } = page
		const path = `/${pattern || ''}`
		const wares = collect(segments)

		app.get(path, json(), ...wares, sse, data(page), (req, res) => render(req, res, page))
		app.post(path, action(segments), json(), ...wares, invoke())
	}

	return app
}
