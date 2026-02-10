import { render as html } from 'ajo/html'
import type { Component } from 'ajo'
import polka from 'polka'
import type { Request, Response, Middleware } from 'polka'
import { json } from '@polka/parse'
import send from '@polka/send'
import { parse } from 'regexparam'
import App, { resolve, layouts, pages, error, toPattern, toSegments, layoutPaths, cacheKeys, reGroup } from './app'
import { AppError, links, ancestors, normalize, ajax, api, sum, pack } from './constants'
import { snapshot, version, tap } from './tracker'
import type { State, Data, Entry, Page, Parent, Module } from './constants'
import { merge, render as renderHead, type Head } from './head'
import { handlers as handlerFiles, wares as wareFiles } from 'virtual:ajo/handlers'

// Event bus

type Listener = (params: Record<string, unknown>) => void

const bus = new Map<string, Set<Listener>>()

export const on = (name: string, fn: Listener) => {
	if (!bus.has(name)) bus.set(name, new Set())
	bus.get(name)!.add(fn)
	return () => bus.get(name)!.delete(fn)
}

const pending = new Set<string>()

export const emit = (name: string, params?: Record<string, unknown>) => {
	pending.delete(name)
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

type EventRegistration = { route: { pattern: RegExp, keys: string[] }, name: string, handler: EventHandler, deps?: string[] | Record<string, string[]>, key: string, cacheKey: string }

const registrations: EventRegistration[] = []

// Deliver event to a client: match route, execute handler, send result

let delivering = 0
const deferred = new Set<string>()
let depth = 0
let flush = () => { }

const deliver = async (client: SSEClient, reg: EventRegistration) => {

	const match = reg.route.pattern.exec(client.req.path)

	if (!match) return false

	const extracted = reg.route.keys.reduce((acc, key, index) => ({ ...acc, [key]: match[index + 1] }), {} as Record<string, string>)
	const request = Object.assign(Object.create(client.req), { params: extracted })

	delivering++

	try {

		const data = await reg.handler(request)
		const sealed = digest(reg.deps, client.req.user?.id, reg.key)
		const navigation = digest(reg.deps, client.req.user?.id)

		client.send({
			event: reg.name, data, error: null, sum: sealed,
			nav: navigation ? { key: reg.cacheKey, sum: navigation } : undefined
		})

	} catch (error) {
		client.send({ event: reg.name, data: null, error: normalize(error).toJSON() })
	} finally {

		delivering--

		if (delivering === 0) {
			if (deferred.size && depth < 2) { depth++; flush() }
			else { depth = 0; deferred.clear() }
		}
	}

	return true
}

type PageHandler = {
	page?: (req: Request, parent: Parent) => Promise<Entry>
	layout?: (req: Request, parent: Parent) => Promise<Entry>
	head?: (req: Request, parent: Parent) => Promise<Head>
	deps?: string[] | Record<string, string[]>
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
const depSum = (deps: string[] | undefined, userId?: number, key?: string) => {

	if (!deps) return null

	const { tables, user, ttl } = parseDeps(deps)

	if (tables.length === 0) return null

	return sum({
		v: snapshot(tables),
		u: user ? userId : undefined,
		t: ttl ? Math.floor(Date.now() / ttl) : undefined,
		k: key
	})
}

// Per-key deps helpers

const keyed = (deps?: string[] | Record<string, string[]>): deps is Record<string, string[]> =>
	!!deps && !Array.isArray(deps)

const depSums = (deps: Record<string, string[]>, userId?: number, key?: string): Record<string, string> => {
	const result: Record<string, string> = {}
	for (const [k, d] of Object.entries(deps)) {
		const s = depSum(d, userId, key)
		if (s) result[k] = s
	}
	return result
}

const tables = (deps: string[] | Record<string, string[]>): string[] => {
	if (Array.isArray(deps)) return deps.filter(d => !d.startsWith(':'))
	return [...new Set(Object.values(deps).flat().filter(d => !d.startsWith(':')))]
}

// Unified deps → sum (handles both array and per-key deps)

const digest = (deps: string[] | Record<string, string[]> | undefined, userId?: number, key?: string): string | Record<string, string> | null => {
	if (!deps) return null
	if (keyed(deps)) return depSums(deps, userId, key)
	return depSum(deps, userId, key)
}

// Unified comparison: does the client already have this digest?

const fresh = (value: string | Record<string, string> | null, key: string, known: Record<string, string>): boolean => {
	if (value === null) return false
	if (typeof value === 'string') return known[key] === value
	return Object.entries(value).every(([field, hash]) => known[`${key}::${field}`] === hash)
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

	let eventTables: string[] = []

	const data = (page: Page): Middleware => async (req, _, next) => {

		req.versions = snapshot(eventTables)

		const url = req.originalUrl
		const { segments, loader } = page
		const params = req.params
		const isAjax = ajax(req)

		const paths = layoutPaths(segments)
		const chain = links(paths.length + 1)
		const keys = cacheKeys(paths, segments)

		// Parse client cache header

		const clientHave = have(req.headers['x-have'] as string | undefined)

		// Check if handler can be skipped — returns sums if skippable, false otherwise

		const canSkip = (handler: PageHandler | undefined, key: string): string | Record<string, string> | false => {
			if (!handler?.deps || !isAjax) return false
			const value = digest(handler.deps, req.user?.id)
			return value !== null && fresh(value, key, clientHave) && value
		}

		// Prepare a handler entry: skip if fresh, otherwise dual-execute

		const prepare = async (
			handler: PageHandler | undefined,
			load: () => Promise<Module | undefined> | undefined,
			key: string,
			link: typeof chain[0],
			server: (parent: Parent) => Promise<Entry> | undefined,
			client: (module: Module, parent: Parent) => Promise<Entry> | undefined,
		) => {

			const skipped = canSkip(handler, key)

			if (skipped) {
				link.deferred.resolve({})
				return { server: {} as Entry, merged: {} as Entry, module: undefined, handler: undefined, skipped }
			}

			try {
				const module = await load?.()
				const entry = await dual(
					() => server(link.parent),
					() => module ? client(module, link.parent) : undefined,
					isAjax
				)
				link.deferred.resolve(entry.merged)
				return { ...entry, module, handler, skipped: false as const }
			} catch (error) {
				link.deferred.reject(normalize(error))
				throw error
			}
		}

		// Load layouts + page with dual execution

		const layoutTasks = paths.map((path, depth) =>
			prepare(
				handlers.get(path),
				() => layouts.get(path)?.(),
				keys[depth + 1],
				chain[depth],
				(parent) => handlers.get(path)?.layout?.(req, parent),
				(module, parent) => module.handler?.({ url, params }, parent),
			)
		)

		const pageTask = prepare(
			handlers.get(segments.join('/')),
			() => loader(),
			keys[keys.length - 1],
			chain[paths.length],
			(parent) => handlers.get(segments.join('/'))?.page?.(req, parent),
			(module, parent) => module.handler?.({ url, params }, parent),
		)

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

		// Finalize: compute sums + optimize response

		const serverHead = merge(...headTasks.map(h => h.server))
		const head = merge(...headTasks.map(h => h.merged))

		const entries = [...layoutResults, pageResult]
		const all = [head, ...entries.map(r => r.merged)]
		const origin = [serverHead, ...entries.map(r => r.server)]

		const sums = [null as null, ...entries].map((result, index) =>
			result?.skipped || (digest(result?.handler?.deps, req.user?.id) ?? sum(origin[index]))
		)

		req.data = all.map((item, index) => {

			if (entries[index - 1]?.skipped) return null

			const value = sums[index]

			if (typeof value === 'object' && value !== null) {

				const partial: Record<string, unknown> = {}

				let changed = false

				for (const [field, hash] of Object.entries(value)) if (clientHave[`${keys[index]}::${field}`] !== hash) {
					partial[field] = (item as Record<string, unknown>)?.[field]
					changed = true
				}

				return changed ? partial : null
			}

			return clientHave[keys[index]] === value ? null : item
		})

		req.sums = sums.map((value, index) => req.data![index] === null ? null : value)

		next()
	}

	// Core render logic - used by pages and error handlers

	const render = async (req: Request, res: Response, page: Page, error?: AppError) => {

		if (ajax(req)) {

			const es = error ? undefined : seal(req.path, req.user?.id, req.versions)
			const known = have(req.headers['x-have'] as string | undefined)
			const sealed = es && Object.keys(es).length > 0 && Object.entries(es).every(([name, value]) => fresh(value, `es:${name}`, known))

			return send(res, error?.status ?? 200, pack(error
				? { error }
				: { data: req.data, sums: req.sums, es: sealed ? null : es }
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
				data: `<script>globalThis.__SSR__=${JSON.stringify(pack({ ...resolved!.data, head, keys, sums: req.sums, es: seal(req.path, req.user?.id, req.versions) }))}</script>`,
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

	const wares = new Map<string, Middleware[]>()

	for (const [file, loader] of Object.entries(wareFiles as Record<string, () => Promise<Record<string, unknown>>>)) {
		const exports = await loader()
		const key = toSegments(file).join('/')
		const items = Array.isArray(exports.default) ? exports.default : [exports.default]
		wares.set(key, (wares.get(key) ?? []).concat(items as Middleware[]))
	}

	// Then load handlers (wares guaranteed available)

	const handlers = new Map<string, PageHandler>()

	for (const [file, loader] of Object.entries(handlerFiles as Record<string, () => Promise<Record<string, unknown>>>)) {

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

			const handlerDeps = deps as string[] | Record<string, string[]> | undefined

			for (const [name, fn] of Object.entries(events as Record<string, EventHandler>)) {

				const cacheKey = handlers.get(key)?.layout ? key : `page:${key}`

				const registration = { route, name, handler: fn, deps: handlerDeps, key, cacheKey }

				registrations.push(registration)

				on(name, async (params) => {

					for (const client of clients) {

						const match = route.pattern.exec(client.req.path)

						if (!match) continue

						// Filter by params (for manual emit with route params)

						if (Object.keys(params).length) {
							const extracted = route.keys.reduce((acc, key, index) => ({ ...acc, [key]: match[index + 1] }), {} as Record<string, string>)
							if (Object.entries(params).some(([key, value]) => extracted[key] !== undefined && extracted[key] !== value)) continue
						}

						deliver(client, registration)
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
		for (const table of tables(handler.deps)) {
			if (!binds.has(table)) binds.set(table, new Set())
			for (const name of Object.keys(handler.events)) binds.get(table)!.add(name)
		}
	}

	eventTables = [...new Set(registrations.flatMap(r => r.deps ? tables(r.deps) : []))]

	flush = () => {
		const names = new Set<string>()
		for (const table of deferred) binds.get(table)?.forEach(n => names.add(n))
		deferred.clear()
		if (names.size) queueMicrotask(() => names.forEach(name => emit(name)))
	}

	tap(table => {

		if (delivering > 0) { deferred.add(table); return }

		const names = binds.get(table)

		if (!names) return

		if (!pending.size) queueMicrotask(() => {
			pending.forEach(name => emit(name))
			pending.clear()
		})

		names.forEach(name => pending.add(name))
	})

	// Compute event sums for a path (used in SSR + ajax responses and SSE skip)

	const seal = (path: string, userId?: number, before?: Record<string, number>) => {

		const es: Record<string, string | Record<string, string>> = {}

		for (const reg of registrations) {

			if (!reg.route.pattern.exec(path)) continue
			if (before && reg.deps && tables(reg.deps).some(t => version(t) !== (before[t] ?? 0))) continue

			const value = digest(reg.deps, userId, reg.key)

			if (value) es[reg.name] = value
		}

		return es
	}

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

		// Send initial event data (skip if client already has matching sums)

		const url = new URL(req.originalUrl, `http://${req.headers.host}`)

		const known = Object.fromEntries(
			(url.searchParams.get('es') ?? '').split(',').filter(Boolean).map(p => {
				const i = p.lastIndexOf(':')
				return [p.slice(0, i), p.slice(i + 1)]
			})
		)

		for (const reg of registrations) {
			const value = digest(reg.deps, req.user?.id, reg.key)
			if (value && fresh(value, reg.name, known)) continue
			deliver(client, reg)
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
