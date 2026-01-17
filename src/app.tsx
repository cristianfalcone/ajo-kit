import navaid, { type Params } from 'navaid'
import type { Component, Stateful } from 'ajo'
import Spinner from '/src/ui/spinner'
import { NotFoundError } from '/src/constants'

// Types
export type LoaderArgs = { params: Params; url: string }
export type LoadFn = (args: LoaderArgs) => Promise<Record<string, unknown>>
export type RouteModule = { default: Component; load?: LoadFn }
export type ModuleLoader = () => Promise<RouteModule>

type Route = {
	pattern: string
	segments: string[]
	loader: ModuleLoader
	notFound?: boolean
}

type LayoutEntry = {
	path: string
	module: RouteModule
}

// Cache for SSR hydration
interface Cache {
	page: Record<string, unknown>
	layout: Record<string, unknown>[]
}

const cache = new Map<string, Cache>()

export function set({ url, ...data }: { url: string } & Cache) {
	cache.set(url, data)
}

// 404 route (used by navaid's on404 callback)
const notFound: Route = {
	pattern: '*',
	segments: [''],
	loader: async () => ({ default: () => { throw new NotFoundError(globalThis.location?.pathname ?? '') } }),
	notFound: true,
}

// Build routes from globs (runs once at startup)
export function build(globs: Record<string, ModuleLoader>) {

	const layouts = new Map<string, ModuleLoader>()
	const routes: Route[] = []

	for (const [path, loader] of Object.entries(globs)) {

		const segments = path.slice(4).split('/') // Remove '/src'
		const type = segments.pop()?.split('.')[0]

		if (type === 'layout') {

			layouts.set(segments.join('/'), loader)

		} else if (type === 'page') {

			// Pattern for navaid (without leading slash, filter empty strings)
			const pattern = segments
				.filter(s => s && !/^\(.*\)$/.test(s)) // filter empty strings and route groups
				.map(s => s.replace(/^\[(.+?)\]$/, (_, p) => p === '...' ? '*' : ':' + p))
				.join('/')

			routes.push({ pattern, segments, loader })
		}
	}

	return { layouts, routes }
}

// Match URL using navaid (on404 handles not found)
export function match(url: string, routes: Route[]) {

	let result: Route & { params: Params }

	const matcher = navaid('/', () => {
		result = { ...notFound, params: {} }
	})

	for (const route of routes) {
		matcher.on(route.pattern, params => {
			result = { ...route, params: params ?? {} }
		})
	}

	matcher.run(url)

	return result!
}

// Resolve route: load modules + execute loaders + compose
export async function resolve(
	url: string,
	layouts: Map<string, ModuleLoader>,
	{ segments, loader, params }: Pick<Route, 'segments' | 'loader'> & { params: Params },
) {

	// Check cache first (for SSR hydration)
	const data = cache.get(url)

	if (data) cache.delete(url) // Use only once

	// Find ancestor layout paths
	const paths = segments
		.map((_, i) => segments.slice(0, i + 1).join('/'))
		.filter(p => layouts.has(p))

	// Load all modules in parallel
	const [module, ...layoutEntries] = await Promise.all([
		loader(),
		...paths.map(path => layouts.get(path)!().then(module => ({ path, module })))
	])

	// If we have cached data, skip load() calls
	if (data) {
		const Page = compose(layoutEntries, module, params, data)
		return { params, data, Page }
	}

	// Execute all load() functions in parallel

	const args: LoaderArgs = { url, params }

	const [page, ...layout] = await Promise.all([
		module.load?.(args) ?? {},
		...layoutEntries.map(e => e.module.load?.(args) ?? {})
	])

	// Compose components - each receives only its own data
	const Page = compose(layoutEntries, module, params, { page, layout })

	return { params, data: { page, layout }, Page }
}

function compose(
	layouts: LayoutEntry[],
	module: RouteModule,
	params: Params,
	data: Cache
): Component {

	const Page = module.default as Component<{ params: Params; data: Cache['page'] }>
	const key = layouts.map(e => e.path).join('/') || 'root'

	return layouts.reduceRight(
		(Child, { path, module }, i) => {
			const Layout = module.default as Component<{ params: Params; data: Cache['layout'][number] }>
			return () => <Layout key={path} params={params} data={data.layout[i]}><Child /></Layout>
		},
		() => <Page key={key} params={params} data={data.page} />
	)
}

// Globs and route building
const globs = import.meta.glob('/src/**/{layout,page}.{j,t}s{,x}') as Record<string, ModuleLoader>

export const { layouts, routes } = build(globs)

// App component
type AppProps = { page?: Component }

const App: Stateful<AppProps> = function* ({ page }) {

	let loading = false
	let Page: Component = page ?? (() => null)

	// SSR mode - page already resolved, just render once
	if (page) return <div class="h-full"><Page /></div>

	// Client mode - set up routing
	const navigate = async (segments: string[], params: Params, loader: ModuleLoader) => {

		this.next(() => loading = true)

		try {
			Page = (await resolve(location.pathname, layouts, { segments, params, loader })).Page
		} catch (e) {
			Page = () => <div class="p-4 text-red-500">Error: {e instanceof Error ? e.message : 'Unknown error'}</div>
		}

		this.next(() => loading = false)

		globalThis.requestAnimationFrame?.(() => globalThis.scrollTo?.({ top: 0, behavior: 'smooth' }))
	}

	const router = navaid('/', () => navigate(notFound.segments, {}, notFound.loader))

	for (const { pattern, segments, loader } of routes) {
		router.on(pattern, params => navigate(segments, params ?? {}, loader))
	}

	router.listen()

	try {

		while (true) yield (
			<>
				<Spinner loading={loading} />
				<div class="h-full">
					<Page />
				</div>
			</>
		)

	} finally {
		router.unlisten?.()
	}
}

App.attrs = { class: 'h-full' }

export default App
