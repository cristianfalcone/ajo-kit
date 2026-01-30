import navaid, { type Params } from 'navaid'
import type { Component, Stateful } from 'ajo'
import { AppError, navigate, links, ancestors, normalize, unpack } from '/src/constants'
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
} from '/src/constants'
import { merge, apply, type Head } from '/src/head'

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

for (const [path, loader] of Object.entries(import.meta.glob('/src/**/{layout,page}.{j,t}s{,x}') as Record<string, Loader>)) {

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

	const server: { data: Data; head?: Head; redirect?: string; error?: AppError } = await (async () => {

		if (data) return { data, head: undefined }
		if (import.meta.env.SSR) return { data: [] }

		// Build X-Have header with cached sums

		const have = keys
			.map(key => [key, cache.get(key)] as const)
			.filter((entry): entry is [string, Cached] => !!entry[1])
			.map(([key, entry]) => `${key}=${entry.sum}`)
			.join(',')

		const response = await fetch(url, {
			credentials: 'include',
			headers: {
				Accept: 'application/json',
				...(have && { 'X-Have': have })
			}
		})

		const json = await response.text().then(unpack).catch(error => ({ error }))

		if (json.redirect) return { data: [], redirect: json.redirect }
		if (!response.ok) return { data: [], error: new AppError(json.error?.status ?? 500, json.error?.message ?? 'Server data load failed') }

		// Update cache and merge nulls with cached values

		const { data: raw, sums } = json as {
			data: (Head | Entry | null)[]
			sums: (string | null)[]
		}

		raw.forEach((item, i) => {
			if (item !== null) cache.set(keys[i], { value: item, sum: sums[i]! })
		})

		const merged = raw.map((item, i) => item ?? cache.get(keys[i])?.value ?? {})
		const [head, ...entries] = merged

		return { data: entries as Data, head: head as Head }
	})()

	// Handle server redirect

	if (server.redirect) {
		navigate(server.redirect)
		return
	}

	// Handle server error (e.g., 404)

	if (server.error) {
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

const App: Stateful<{ page?: Component }> = function* ({ page }) {

	let Page: Component = page ?? (() => null)

	if (page) return <Page />

	let hmr = false

	const sse = { source: null as EventSource | null, retries: 0 }

	const connect = (path: string) => {

		sse.source?.close()

		sse.source = new EventSource(path)

		sse.source.onopen = () => { sse.retries = 0 }

		sse.source.onmessage = (e) => {
			const { event, data, error } = JSON.parse(e.data)
			subscribers.get(event)?.forEach(fn => fn({ data, error }))
		}

		sse.source.onerror = () => {

			sse.source?.close()

			// Exponential backoff with jitter: 1s, 2s, 4s, 8s... max 30s
			const base = Math.min(1000 * 2 ** sse.retries, 30_000)
			const jitter = base * Math.random()
			sse.retries++

			setTimeout(() => connect(path), base + jitter)
		}
	}

	const go = async (page: Page) => {

		// Disconnect previous SSE

		sse.source?.close()
		sse.source = null
		sse.retries = 0
		subscribers.clear()

		for await (const state of resolve(location.pathname, layouts, page)) {
			if (hmr && !state.data) continue // Skip loading state during HMR
			this.next(() => Page = state.Page)
			if (state.data?.head) apply(state.data.head)
		}

		// Connect SSE only if page registered event subscribers

		if (!hmr && subscribers.size > 0) connect(location.pathname)

		if (!hmr) requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'smooth' }))

		hmr = false
	}

	const router = navaid('/', () => go(error()))

	for (const config of pages) {
		router.on(config.pattern!, params => go({ ...config, params }))
	}

	router.listen()

	const run = import.meta.env.DEV ? () => { hmr = true; router.run() } : null

	if (run) addEventListener('hmr', run)

	try {
		while (true) yield <Page />
	} finally {
		sse.source?.close()
		router.unlisten?.()
		if (run) removeEventListener('hmr', run)
	}
}

App.attrs = { class: 'h-full' }

export default App
