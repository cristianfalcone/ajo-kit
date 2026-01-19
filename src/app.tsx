import navaid, { type Params } from 'navaid'
import type { Component, Stateful } from 'ajo'
import Spinner from '/src/ui/spinner'
import { NotFoundError, type RouteError } from '/src/constants'

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
export type LoaderArgs = { params: Params; url: string }
export type Module = { default: Component; load?: (args: LoaderArgs) => Promise<Record<string, unknown>> }
export type Loader = () => Promise<Module>

export type Route = {
	loader: Loader
	pattern?: string
	segments?: string[]
	params?: Params
	error?: RouteError
}

export interface Cache {
	url: string
	params: Params
	page: Record<string, unknown>
	layout: Record<string, unknown>[]
}

export const cache = new Map<string, Cache>()

export const notFound: Route = {
	segments: [''],  // Apply root layout for error boundary
	loader: async () => ({ default: () => { throw new NotFoundError(globalThis.location?.pathname) } }),
	error: new NotFoundError(),
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

// Resolve route: load modules, execute loaders, compose page
export async function resolve(
	url: string,
	layouts: Map<string, Loader>,
	route: Route,
) {

	const { loader, segments = [], params = {} } = route

	// Check cache (SSR hydration, used once)

	const cached = cache.get(url)
	if (cached) cache.delete(url)

	// Find layout paths

	const paths = segments
		.map((_, index) => segments.slice(0, index + 1).join('/'))
		.filter(path => layouts.has(path))

	// Load page and layout modules in parallel

	const [page, ...entries] = await Promise.all([
		loader(),
		...paths.map(path => layouts.get(path)!().then(module => ({ path, module })))
	])

	// Use cached data or execute load() functions in parallel

	const args = { url, params }

	const data: Cache = cached ?? await Promise.all([
		page.load?.(args) ?? {},
		Promise.all(entries.map(entry => entry.module.load?.(args) ?? {}))
	]).then(([page, layout]) => ({ url, params, page, layout }))

	const Page = page.default as Component<{ params: Params; data: Cache['page'] }>

	return {
		data,

		// Compose: wrap page in layouts (innermost to outermost)

		Page: entries.reduceRight<Component>(
			(Child, { path, module }, index) => {
				const Layout = module.default as Component<{ params: Params; data: Cache['layout'][number] }>
				return () => <Layout key={path} params={data.params} data={data.layout[index]}><Child /></Layout>
			},
			() => <Page key={paths.join('/')} params={data.params} data={data.page} />
		)
	}
}

// App component
const App: Stateful<{ page?: Component }> = function* ({ page }) {

	let loading = false
	let Page: Component = page ?? (() => null)

	// SSR: page already resolved
	if (page) return <div class="h-full"><Page /></div>

	// Client: set up routing
	const navigate = async (route: Route) => {

		this.next(() => loading = true)

		try {
			Page = (await resolve(location.pathname, layouts, route)).Page
		} catch (error) {
			console.error('Error in routing logic', error)
		}

		this.next(() => loading = false)

		requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'smooth' }))
	}

	const router = navaid('/', () => navigate(notFound))

	for (const route of routes) {
		router.on(route.pattern!, params => navigate({ ...route, params }))
	}

	router.listen()

	try {
		while (true) yield (
			<>
				<Spinner loading={loading} />
				<div class="h-full"><Page /></div>
			</>
		)
	} finally {
		router.unlisten?.()
	}
}

App.attrs = { class: 'h-full' }

export default App
