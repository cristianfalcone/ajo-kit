import navaid, { type Params } from 'navaid'
import type { Children, Component, Stateful } from 'ajo'
import { NotFoundError, RouteError } from '/src/constants'

export type { Params }

// Pattern compilation

const groupRE = /^\(.*\)$/
const dynamicRE = /^\[(.+?)\]$/

export const toPattern = (segments: string[]) =>
	segments
		.filter(s => s && !groupRE.test(s))
		.map(s => s.replace(dynamicRE, (_, n) => n === '...' ? '*' : `:${n}`))
		.join('/')

export const toSegments = (path: string) => {
	const parts = path.slice(4).split('/')
	parts.pop()
	return parts
}

export const getType = (path: string) => path.split('/').pop()?.split('.')[0]

// Types

export type LoaderArgs = {
	params: Params
	url: string
	parent: () => Promise<Record<string, unknown>>
}

export type PageArgs<T = Record<string, unknown>> = {
	params: Params
	data: T | undefined
	loading: boolean
	error: RouteError | undefined
}

export type LayoutArgs<T = Record<string, unknown>> = PageArgs<T> & {
	children: Children
}

export type Module = {
	default: Component
	load?: (args: LoaderArgs) => Promise<Record<string, unknown>>
	defer?: boolean
}

export type Loader = () => Promise<Module>

export type Route = {
	loader: Loader
	pattern?: string
	segments?: string[]
	params?: Params
}

export interface Data {
	url: string
	params: Params
	page: { data?: Record<string, unknown>; error?: RouteError }
	layout: Array<{ data?: Record<string, unknown>; error?: RouteError }>
}

export const cache = new Map<string, Data>()

export const notFound: Route = {
	segments: [''], // use root layout
	loader: async () => ({
		default: () => null,
		load: async ({ url }: LoaderArgs) => { throw new NotFoundError(`Page not found: ${url}`) }
	}),
}

// Build routes from file system

export const layouts = new Map<string, Loader>()
export const routes: Route[] = []

for (const [path, loader] of Object.entries(import.meta.glob('/src/**/{layout,page}.{j,t}s{,x}') as Record<string, Loader>)) {

	const segments = toSegments(path)
	const type = getType(path)

	if (type === 'layout') layouts.set(segments.join('/'), loader)
	if (type === 'page') routes.push({ pattern: toPattern(segments), segments, loader })
}

// Execute load() with parent() support

async function execute(
	module: Module,
	args: { url: string; params: Params },
	ancestors: Array<{ data?: Record<string, unknown>; error?: RouteError }>
): Promise<{ data?: Record<string, unknown>; error?: RouteError }> {

	if (!module.load) return { data: {} }

	const parent = async () => {
		const error = ancestors.find(a => a.error)?.error
		if (error) throw error
		return ancestors.reduce((merged, a) => ({ ...merged, ...a.data }), {})
	}

	try {
		return { data: await module.load({ ...args, parent }) }
	} catch (error) {
		return {
			error: error instanceof RouteError
				? error
				: new RouteError(500, error instanceof Error ? error.message : 'Load failed')
		}
	}
}

// Compose component tree

type LoadingData = { url: string; params: Params; loading: true }

function compose(
	page: Module,
	entries: Array<{ path: string; module: Module }>,
	paths: string[],
	data: Data | LoadingData
): Component {

	const Page = page.default as Component<PageArgs>
	const loading = 'loading' in data
	const error = loading ? undefined : data.page.error

	return entries.reduceRight<Component>(
		(Child, { path, module }, index) => {
			const Layout = module.default as Component<LayoutArgs>
			const result = loading ? undefined : data.layout[index]
			return () => (
				<Layout
					key={path}
					params={data.params}
					data={result?.data}
					loading={loading}
					error={result?.error ?? error}
				>
					<Child />
				</Layout>
			)
		},
		() => {
			const result = loading ? undefined : data.page
			return (
				<Page
					key={paths.join('/')}
					params={data.params}
					data={result?.data}
					loading={loading}
					error={result?.error}
				/>
			)
		}
	)
}

// Resolve route: async generator yielding loading then data states

export async function* resolve(
	url: string,
	layouts: Map<string, Loader>,
	route: Route
): AsyncGenerator<{ Page: Component; data?: Data }> {

	const { loader, segments = [], params = {} } = route

	// Find layout paths

	const paths = segments
		.map((_, i) => segments.slice(0, i + 1).join('/'))
		.filter(path => layouts.has(path))

	// Load modules in parallel (fast - already bundled)

	const [page, ...entries] = await Promise.all([
		loader(),
		...paths.map(path => layouts.get(path)!().then(module => ({ path, module })))
	])

	// Check cache (SSR hydration) - skip loading phase if cached

	const cached = cache.get(url)

	if (cached) {
		cache.delete(url)
		yield { Page: compose(page, entries, paths, cached), data: cached }
		return
	}

	// First yield: loading state

	yield { Page: compose(page, entries, paths, { url, params, loading: true }) }

	// Execute load functions with parent() support (sequential for cascade)

	const results: Array<{ data?: Record<string, unknown>; error?: RouteError }> = []

	for (const entry of entries) {
		results.push(await execute(entry.module, { url, params }, results))
	}

	const data: Data = {
		url,
		params,
		page: await execute(page, { url, params }, results),
		layout: results
	}

	// Second yield: data state

	yield { Page: compose(page, entries, paths, data), data }
}

// App component

const App: Stateful<{ page?: Component }> = function* ({ page }) {

	let Page: Component = page ?? (() => null)

	// SSR: page already resolved

	if (page) return <Page />

	// Client: set up routing

	const navigate = async (route: Route) => {

		for await (const state of resolve(location.pathname, layouts, route)) {
			this.next(() => Page = state.Page)
		}

		requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'smooth' }))
	}

	const router = navaid('/', () => navigate(notFound))

	for (const route of routes) {
		router.on(route.pattern!, params => navigate({ ...route, params }))
	}

	router.listen()

	try {
		while (true) yield <Page />
	} finally {
		router.unlisten?.()
	}
}

App.attrs = { class: 'h-full' }

export default App
