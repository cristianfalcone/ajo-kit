import navaid from 'navaid'
import type { Component, Stateful } from 'ajo'
import { NotFoundError, RouteError } from '/src/constants'
import type { HandlerArgs, Params, PageArgs, LayoutArgs, ActionState, Server } from '/src/constants'

// Pattern compilation

const reGroup = /^\(.*\)$/
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

export const getType = (path: string) => path.split('/').pop()?.split('.')[0]

// Form action helper for stateful generator components

export function action<T = unknown>(element: { next: () => void }, name: string): ActionState<T> {

	let controller: AbortController | undefined

	const state: ActionState<T> = {
		loading: false,
		data: undefined,
		error: undefined,
		handle: () => {},
		reset: () => {
			state.data = undefined
			state.error = undefined
			element.next()
		}
	}

	state.handle = async (event: SubmitEvent) => {

		event.preventDefault()

		// Abort any in-flight request
		controller?.abort()
		controller = new AbortController()

		const form = event.target as HTMLFormElement
		const body = Object.fromEntries(new FormData(form) as unknown as Iterable<[string, string]>)

		state.loading = true
		state.error = undefined
		element.next()

		try {
			const response = await fetch(`?/${name}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				body: JSON.stringify(body),
				signal: controller.signal
			})

			const json = await response.json()

			if (!response.ok) {
				state.error = json.error ?? 'Action failed'
			} else if (json.redirect) {
				location.href = json.redirect
				return
			} else {
				state.data = json as T
				form.reset()
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') return
			state.error = error instanceof Error ? error.message : 'Action failed'
		} finally {
			state.loading = false
			element.next()
		}
	}

	return state
}

export type Module = {
	default: Component
	handler?: (args: HandlerArgs) => Promise<Record<string, unknown>>
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
		handler: async ({ url }: HandlerArgs) => { throw new NotFoundError(`Page not found: ${url}`) }
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

// Execute handler() with parent() support

async function execute(
	module: Module,
	args: { url: string; params: Params },
	ancestors: Array<{ data?: Record<string, unknown>; error?: RouteError }>
): Promise<{ data?: Record<string, unknown>; error?: RouteError }> {

	if (!module.handler) return { data: {} }

	const parent = async () => {
		const error = ancestors.find(item => item.error)?.error
		if (error) throw error
		return ancestors.reduce((merged, item) => ({ ...merged, ...item.data }), {})
	}

	try {
		return { data: await module.handler({ ...args, parent }) }
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
					loading={loading && module.defer === true}
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
					loading={loading && page.defer === true}
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
	route: Route,
	remote?: Server
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

	// Fetch server data on client navigation

	const server: Server = await (async () => {
		if (remote) return remote
		if (import.meta.env.SSR) return { page: {}, layout: [] }
		const response = await fetch(url, { headers: { Accept: 'application/json' } })
		if (response.ok) return response.json()
		const { error } = await response.json().catch(reason => ({ error: reason?.message ?? 'Load failed' }))
		throw new RouteError(response.status, error)
	})()

	// Execute load functions with parent() support and merge server data

	const layout: Data['layout'] = []

	for (let i = 0; i < entries.length; i++) {
		const result = await execute(entries[i].module, { url, params }, layout)
		layout.push({ data: { ...server.layout[i], ...result.data }, error: result.error })
	}

	const result = await execute(page, { url, params }, layout)

	const data: Data = {
		url,
		params,
		page: { data: { ...server.page, ...result.data }, error: result.error },
		layout
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
