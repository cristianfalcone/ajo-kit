import navaid, { type Params } from 'navaid'
export type { Params }
import type { Component, Stateful } from 'ajo'
import Spinner from '/src/ui/spinner'
import { NotFoundError, type RouteError } from '/src/constants'

// Types
export type LoaderArgs = { params: Params; url: string }
export type Module = { default: Component; load?: (args: LoaderArgs) => Promise<Record<string, unknown>> }
export type Loader = () => Promise<Module>

export type Route = {
	pattern: string
	segments: string[]
	loader: Loader
	params?: Params
	error?: RouteError
}

export interface Data {
	url: string
	params: Params
	page: Record<string, unknown>
	layout: Record<string, unknown>[]
}

export const cache = new Map<string, Data>()

export const notFound: Route = {
	pattern: '*',
	segments: [''],
	loader: async () => ({ default: () => { throw new NotFoundError(globalThis.location?.pathname) } }),
	error: new NotFoundError(),
}

// Build routes from file system
export const layouts = new Map<string, Loader>()
export const routes: Route[] = []

for (const [path, loader] of Object.entries(import.meta.glob('/src/**/{layout,page}.{j,t}s{,x}') as Record<string, Loader>)) {

	const segments = path.slice(4).split('/') // Remove '/src'
	const type = segments.pop()?.split('.')[0]

	if (type === 'layout') {
		layouts.set(segments.join('/'), loader)
	}

	if (type === 'page') {
		const pattern = segments
			.filter(seg => seg && !/^\(.*\)$/.test(seg))
			.map(seg => seg.replace(/^\[(.+?)\]$/, (_, name) => name === '...' ? '*' : ':' + name))
			.join('/')
		routes.push({ pattern, segments, loader })
	}
}

// Resolve route: load modules, execute loaders, compose page
export async function resolve(
	url: string,
	layouts: Map<string, Loader>,
	route: Route,
) {

	const { segments, loader, params = {} } = route

	// Check cache (SSR hydration, used once)

	const cached = cache.get(url)
	if (cached) cache.delete(url)

	// Find layout paths

	const paths = segments
		.map((_, index) => segments.slice(0, index + 1).join('/'))
		.filter(path => layouts.has(path))

	// Load page and layout modules in parallel

	const [page, ...layoutEntries] = await Promise.all([
		loader(),
		...paths.map(path => layouts.get(path)!().then(module => ({ path, module })))
	])

	// Use cached data or execute load() functions in parallel

	const args = { url, params }

	const data: Data = cached ?? {
		url,
		params,
		page: await page.load?.(args) ?? {},
		layout: await Promise.all(layoutEntries.map(entry => entry.module.load?.(args) ?? {}))
	}

	// Compose: wrap page in layouts (innermost to outermost)

	const key = paths.join('/')

	const Page = page.default as Component<{ params: Params; data: Data['page'] }>

	return {
		data,
		Page: layoutEntries.reduceRight<Component>(
			(Child, { path, module }, index) => {
				const Layout = module.default as Component<{ params: Params; data: Data['layout'][number] }>
				return () => <Layout key={path} params={data.params} data={data.layout[index]}><Child /></Layout>
			},
			() => <Page key={key} params={data.params} data={data.page} />
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
			Page = () => <div class="p-4 text-red-500">Error: {error instanceof Error ? error.message : 'Unknown error'}</div>
		}

		this.next(() => loading = false)
	
		requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'smooth' }))
	}

	const router = navaid('/', () => navigate(notFound))

	for (const route of routes) {
		router.on(route.pattern, params => navigate({ ...route, params }))
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
