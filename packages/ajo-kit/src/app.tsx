import navaid, { type Params } from 'navaid'
import type { Component, Stateful } from 'ajo'
import { AppError, navigate, links, ancestors, normalize, unpack } from './constants'
import type {
	PageArgs,
	LayoutArgs,
	Data,
	Entry,
	Parent,
	Module,
	Loader,
	Page,
	State,
	Cached,
	EventState
} from './constants'
import { merge, apply, type Head } from './head'
import { routes } from 'virtual:ajo/routes'

// Pattern compilation

export const reGroup = /^\(.*\)$/
const reDynamic = /^\[(.+?)\]$/

export const toPattern = (segments: string[]) =>
	segments
		.filter(segment => segment && !reGroup.test(segment))
		.map(segment => segment.replace(reDynamic, (_, name) => name === '...' ? '*' : `:${name}`))
		.join('/')

export const toSegments = (path: string) => {
	const parts = path.slice(4).split('/')
	parts.pop()
	return parts
}

export const getFileName = (path: string) => path.split('/').pop()?.split('.')[0]

export const ssr = new Map<string, State>()

// Navigation cache: key → { value, sum }

export const cache = new Map<string, Cached>()

// Event seals: name → sum (persists across navigations for SSE skip)

export const seals = new Map<string, string | Record<string, string>>()

// Event subscribers: name → Set<callback>

export const subscribers = new Map<string, Set<(state: EventState) => void>>()

export const error: () => Page = () => ({
	segments: [''],
	loader: async () => ({ default: () => null }),
})

// Build pages from file system

export const layouts = new Map<string, Loader>()
export const pages: Page[] = []

// Path helpers for cache keys

export const layoutPaths = (segments: string[]) => ancestors(segments).filter(path => layouts.has(path))
export const cacheKeys = (paths: string[], segments: string[]) => ['head', ...paths, `page:${segments.join('/')}`]

for (const [path, loader] of Object.entries(routes as Record<string, Loader>)) {

	const segments = toSegments(path)
	const kind = getFileName(path)

	if (kind === 'layout') layouts.set(segments.join('/'), loader)
	if (kind === 'page') pages.push({ pattern: toPattern(segments), segments, loader })
}

// HMR: wrap loaders to use hot-updated modules

if (import.meta.env.DEV && !import.meta.env.SSR) {

	const modules = (globalThis as { __MODULES__?: Map<string, Module> }).__MODULES__ ?? new Map();

	(globalThis as { __MODULES__?: Map<string, Module> }).__MODULES__ = modules

	const hmr = (loader: Loader, file: string): Loader => async () => {
		if (modules.has(file)) return modules.get(file)
		const module = await loader()
		modules.set(file, module)
		return module
	}

	for (const [path, loader] of layouts) layouts.set(path, hmr(loader, `/src${path}/layout.tsx`))
	for (const page of pages) page.loader = hmr(page.loader, `/src${page.segments.join('/')}/page.tsx`)
}

// Execute handler() with parent() support

async function execute(
	target: Module,
	context: { url: string; params: Params },
	parent: Parent
): Promise<{ data?: Entry; error?: AppError }> {

	if (!target.handler) return { data: {} }

	try {
		return { data: await target.handler(context, parent) }
	} catch (error) {
		return { error: normalize(error) }
	}
}

// Compose component tree

function compose(
	page: Module,
	tree: Array<{ path: string; module: Module }>,
	paths: string[],
	state: State
): Component {

	const Page = page.default as Component<PageArgs>

	// Find who handles loading: page first, then innermost layout with defer

	const deferred = page.defer ? 'page' : tree.findLast(entry => entry.module.defer)?.path

	return tree.reduceRight<Component>(
		(Child, { path, module }, depth) => {
			const Layout = module.default as Component<LayoutArgs>
			return () => (
				<Layout
					key={path}
					params={state.params}
					data={state.data[depth]}
					loading={state.loading && deferred === path}
					error={state.error}
				>
					<Child />
				</Layout>
			)
		},
		() => (
			<Page
				key={paths.join('/')}
				params={state.params}
				data={state.data.at(-1)}
				loading={state.loading && deferred === 'page'}
				error={state.error}
			/>
		)
	)
}

// Encode cache + seals state into X-Have header string

function encode(keys: string[]): string {
	return [
		...keys
			.map(key => [key, cache.get(key)] as const)
			.filter((entry): entry is [string, Cached] => !!entry[1])
			.flatMap(([key, entry]) => {
				if (typeof entry.sum === 'string') return [`${key}=${entry.sum}`]
				return Object.entries(entry.sum).map(([field, hash]) => `${key}::${field}=${hash}`)
			}),
		...[...seals].flatMap(([name, value]) => {
			if (typeof value === 'string') return [`es:${name}=${value}`]
			return Object.entries(value).map(([field, hash]) => `es:${name}::${field}=${hash}`)
		})
	].join(',')
}

// Fetch server data, update cache, return entries

async function load(url: string, keys: string[]): Promise<{ data: Data; head?: Head; redirect?: string; error?: AppError }> {

	const header = encode(keys)

	const response = await fetch(url, {
		credentials: 'include',
		headers: { Accept: 'application/json', ...(header && { 'X-Have': header }) }
	})

	const json = await response.text().then(unpack).catch(error => ({ error }))

	if (json.redirect) return { data: [], redirect: json.redirect }

	if (!response.ok) return { data: [], error: new AppError(json.error?.status ?? 500, json.error?.message ?? 'Server data load failed') }

	const { data: raw, sums, es } = json as {
		data: (Head | Entry | null)[]
		sums: (string | Record<string, string> | null)[]
		es?: Record<string, string | Record<string, string>>
	}

	raw.forEach((item, index) => {

		if (item === null) return

		const value = sums[index]

		if (typeof value === 'object' && value !== null) {
			const existing = cache.get(keys[index])?.value ?? {}
			cache.set(keys[index], { value: { ...existing, ...item }, sum: value })
		} else if (value) {
			cache.set(keys[index], { value: item, sum: value })
		}
	})

	if (es) for (const [name, value] of Object.entries(es)) seals.set(name, value)

	const merged = raw.map((item, index) => cache.get(keys[index])?.value ?? item ?? {})

	const [head, ...entries] = merged

	return { data: entries as Data, head: head as Head }
}

// Resolve page: async generator yielding loading then data states

export async function* resolve(
	url: string,
	layouts: Map<string, Loader>,
	page: Page,
	data?: Data,
	error?: AppError
): AsyncGenerator<{ Page: Component; data?: State }> {

	const { loader, segments, params = {} } = page

	const paths = ancestors(segments).filter(path => layouts.has(path))

	// Load modules in parallel (fast - already bundled)

	const [target, ...tree] = await Promise.all([
		loader(),
		...paths.map(path => layouts.get(path)!().then(module => ({ path, module })))
	])

	// Error page: skip loading/fetching, compose directly with error

	if (error) {
		const state: State = { url, params, data: [], loading: false, error }
		yield { Page: compose(target, tree, paths, state), data: state }
		return
	}

	// Check cache (SSR hydration) - skip loading phase if cached

	const cached = ssr.get(url)

	if (cached) {
		ssr.delete(url)
		yield { Page: compose(target, tree, paths, cached), data: cached }
		return
	}

	// First yield: loading state

	yield { Page: compose(target, tree, paths, { url, params, data: [], loading: true }) }

	// Fetch server data on client navigation

	const keys = cacheKeys(paths, segments)

	const server = data
		? { data, head: undefined as Head | undefined }
		: import.meta.env.SSR
			? { data: [] as Data }
			: await load(url, keys)

	if ('redirect' in server && server.redirect) {
		navigate(server.redirect)
		return
	}

	if ('error' in server && server.error) {
		const state: State = { url, params, data: [], loading: false, error: server.error }
		yield { Page: compose(target, tree, paths, state), data: state }
		return
	}

	// Execute handler() functions with parent() support and merge server data

	const chain = links(tree.length + 1)

	const layoutTasks = tree.map(async ({ module }, depth) => {

		const { parent, deferred } = chain[depth]

		try {
			const client = await execute(module, { url, params }, parent)
			const merged = { ...server.data[depth], ...client.data }
			deferred.resolve(merged)
			return { merged, error: client.error }
		} catch (error) {
			const appError = normalize(error)
			deferred.reject(appError)
			return { merged: server.data[depth] ?? {}, error: appError }
		}
	})

	const pageTask = (async () => {

		const depth = tree.length
		const { parent, deferred } = chain[depth]

		try {
			const client = await execute(target, { url, params }, parent)
			const merged = { ...server.data.at(-1), ...client.data }
			deferred.resolve(merged)
			return { merged, error: client.error }
		} catch (error) {
			const appError = normalize(error)
			deferred.reject(appError)
			return { merged: server.data.at(-1) ?? {}, error: appError }
		}
	})()

	const [layoutResults, pageResult] = await Promise.all([
		Promise.all(layoutTasks),
		pageTask
	])

	const state: State = {
		url,
		params,
		data: [...layoutResults.map(r => r.merged), pageResult.merged],
		loading: false,
		error: layoutResults.find(r => r.error)?.error ?? pageResult.error
	}

	const clientHeads = await Promise.all([
		...tree.map(({ module }, depth) => module.head?.({ url, params }, async () => layoutResults[depth].merged)),
		target.head?.({ url, params }, async () => state.data.at(-1)!)
	])

	state.head = merge(server.head, ...clientHeads)

	// Second yield: data state

	yield { Page: compose(target, tree, paths, state), data: state }
}

// SSE stream manager: connect with backoff, update cache + seals on message

function stream() {

	let source: EventSource | null = null
	let retries = 0

	const connect = (path: string) => {

		source?.close()

		const sealing = [...seals].flatMap(([name, value]) => {
			if (typeof value === 'string') return [`${name}:${value}`]
			return Object.entries(value).map(([field, hash]) => `${name}::${field}:${hash}`)
		}).join(',')

		source = new EventSource(sealing ? `${path}${path.includes('?') ? '&' : '?'}es=${sealing}` : path)

		source.onopen = () => { retries = 0 }

		source.onmessage = (event) => {

			const { event: name, data, error, sum: seal, nav } = JSON.parse(event.data)

			if (seal) seals.set(name, seal)

			if (nav && data) {
				const existing = typeof nav.sum === 'object' ? cache.get(nav.key)?.value : undefined
				cache.set(nav.key, { value: existing ? { ...existing, ...data } : data, sum: nav.sum })
			}

			subscribers.get(name)?.forEach(fn => fn({ data, error }))
		}

		source.onerror = () => {
			source?.close()
			if (++retries > 10) return
			const base = Math.min(1000 * 2 ** retries, 30_000)
			setTimeout(() => connect(path), base + base * Math.random())
		}
	}

	const close = () => { source?.close(); source = null; retries = 0 }

	return { connect, close }
}

const App: Stateful<{ page?: Component }> = function* ({ page }) {

	let Page: Component = page ?? (() => null)

	if (page) return <Page />

	let hmr = false
	const sse = stream()
	let generation = 0

	const go = async (target: Page) => {

		const gen = ++generation

		sse.close()
		subscribers.clear()

		for await (const state of resolve(location.pathname, layouts, target)) {
			if (gen !== generation) return
			if (hmr && !state.data) continue
			this.next(() => Page = state.Page)
			if (state.data?.head) apply(state.data.head)
		}

		if (gen !== generation) return

		if (!hmr && subscribers.size > 0) sse.connect(location.pathname)
		if (!hmr) requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'smooth' }))

		hmr = false
	}

	const router = navaid('/', () => go(error()))

	for (const config of pages) router.on(config.pattern!, params => go({ ...config, params }))

	router.listen()

	const reload = import.meta.env.DEV ? () => { hmr = true; router.run() } : null
	if (reload) addEventListener('hmr', reload)

	try {
		while (true) yield <Page />
	} finally {
		sse.close()
		router.unlisten?.()
		if (reload) removeEventListener('hmr', reload)
	}
}

App.attrs = { class: 'h-full' }

export default App
