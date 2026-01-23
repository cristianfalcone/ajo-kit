import navaid, { type Params } from 'navaid'
import type { Component, Stateful } from 'ajo'
import { current } from 'ajo/context'
import { NotFoundError, AppError, navigate } from '/src/constants'
import type { Context, PageArgs, LayoutArgs, ActionState, Data } from '/src/constants'

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

export const getFileName = (path: string) => path.split('/').pop()?.split('.')[0]

// Form action helper for stateful generator components

export function action<T = unknown>(name: string, init?: RequestInit): ActionState<T> {

	const component =  current()

	const state: ActionState<T> = {
		loading: false,
		data: undefined,
		error: undefined,
		fields: undefined,
		handle: () => {},
		reset: () => {
			state.data = undefined
			state.error = undefined
			state.fields = undefined
			component.next()
		}
	}

	if (import.meta.env.SSR) return state

	let controller: AbortController

	state.handle = async (event: SubmitEvent) => {

		event.preventDefault()

		// Abort any in-flight request
		controller?.abort()
		controller = new AbortController()

		const form = event.target as HTMLFormElement
		const body = Object.fromEntries(new FormData(form) as unknown as Iterable<[string, string]>)

		state.loading = true
		state.error = undefined
		state.fields = undefined
		component.next()

		try {
			const response = await fetch(`?/${name}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				body: JSON.stringify(body),
				signal: controller.signal,
				...init,
			})

			const json = await response.json()

			if (!response.ok) {
				state.error = json.error ?? 'Action failed'
				state.fields = json.fields
			} else if (json.redirect) {
				navigate(json.redirect)
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
			component.next()
		}
	}

	return state
}

export type Module = {
	default: Component
	handler?: (args: Context) => Promise<Record<string, unknown>>
	defer?: boolean
}

export type Loader = () => Promise<Module>

export type Page = {
	loader: Loader
	pattern?: string
	segments?: string[]
	params?: Params
}

export interface State {
	url: string
	params: Params
	page: { data?: Record<string, unknown>; error?: AppError }
	layout: Array<{ data?: Record<string, unknown>; error?: AppError }>
}

export const cache = new Map<string, State>()

export const notFound: Page = {
	segments: [''], // use root layout
	loader: async () => ({
		default: () => null,
		handler: async ({ url }: Context) => { throw new NotFoundError(`Page not found: ${url}`) }
	}),
}

// Build pages from file system

export const layouts = new Map<string, Loader>()
export const pages: Page[] = []

for (const [path, loader] of Object.entries(import.meta.glob('/src/**/{layout,page}.{j,t}s{,x}') as Record<string, Loader>)) {

	const segments = toSegments(path)
	const kind = getFileName(path)

	if (kind === 'layout') layouts.set(segments.join('/'), loader)
	if (kind === 'page') pages.push({ pattern: toPattern(segments), segments, loader })
}

// HMR: wrap loaders to use hot-updated modules

if (import.meta.env.DEV && !import.meta.env.SSR) {

	const hmr = (loader: Loader, file: string): Loader => async () => {
		const modules = (globalThis as { __MODULES__?: Map<string, Module> }).__MODULES__
		if (modules?.has(file)) return modules.get(file)!
		return loader()
	}

	for (const [path, loader] of layouts) layouts.set(path, hmr(loader, `/src${path}/layout.tsx`))
	for (const config of pages) config.loader = hmr(config.loader, `/src${config.segments!.join('/')}/page.tsx`)
}

// Execute handler() with parent() support

async function execute(
	target: Module,
	context: { url: string; params: Params },
	parents: Array<{ data?: Record<string, unknown>; error?: AppError }>
): Promise<{ data?: Record<string, unknown>; error?: AppError }> {

	if (!target.handler) return { data: {} }

	const parent = async () => {
		const error = parents.find(parent => parent.error)?.error
		if (error) throw error
		return parents.reduce((result, parent) => ({ ...result, ...parent.data }), {})
	}

	try {
		return { data: await target.handler({ ...context, parent }) }
	} catch (error) {
		return {
			error: error instanceof AppError
				? error
				: new AppError(500, error instanceof Error ? error.message : 'Load failed')
		}
	}
}

// Compose component tree

type LoadingData = { url: string; params: Params; loading: true }

function compose(
	page: Module,
	tree: Array<{ path: string; module: Module }>,
	paths: string[],
	state: State | LoadingData
): Component {

	const Page = page.default as Component<PageArgs>
	const loading = 'loading' in state
	const error = loading ? undefined : state.page.error

	// Find who handles loading: page first, then innermost layout with defer
	const deferred = page.defer ? 'page' : tree.findLast(entry => entry.module.defer)?.path

	return tree.reduceRight<Component>(
		(Child, { path, module }, depth) => {
			const Layout = module.default as Component<LayoutArgs>
			const loaded = loading ? undefined : state.layout[depth]
			return () => (
				<Layout
					key={path}
					params={state.params}
					data={loaded?.data}
					loading={loading && deferred === path}
					error={loaded?.error ?? error}
				>
					<Child />
				</Layout>
			)
		},
		() => {
			const loaded = loading ? undefined : state.page
			return (
				<Page
					key={paths.join('/')}
					params={state.params}
					data={loaded?.data}
					loading={loading && deferred === 'page'}
					error={loaded?.error}
				/>
			)
		}
	)
}

// Resolve page: async generator yielding loading then data states

export async function* resolve(
	url: string,
	layouts: Map<string, Loader>,
	page: Page,
	data?: Data
): AsyncGenerator<{ Page: Component; data?: State }> {

	const { loader, segments = [], params = {} } = page

	// Find layout paths

	const paths = segments
		.map((_, index) => segments.slice(0, index + 1).join('/'))
		.filter(path => layouts.has(path))

	// Load modules in parallel (fast - already bundled)

	const [target, ...tree] = await Promise.all([
		loader(),
		...paths.map(path => layouts.get(path)!().then(module => ({ path, module })))
	])

	// Check cache (SSR hydration) - skip loading phase if cached

	const cached = cache.get(url)

	if (cached) {
		cache.delete(url)
		yield { Page: compose(target, tree, paths, cached), data: cached }
		return
	}

	// First yield: loading state

	yield { Page: compose(target, tree, paths, { url, params, loading: true }) }

	// Fetch server data on client navigation

	const server: Data = await (async () => {
		if (data) return data
		if (import.meta.env.SSR) return { layout: [], page: {} }
		const response = await fetch(url, { headers: { Accept: 'application/json' } })
		if (response.ok) return response.json()
		const error = await response.json().catch(reason => reason?.message ?? 'Server data load failed')
		throw new AppError(response.status, error)
	})()

	// Execute load functions with parent() support and merge server data

	const results: State['layout'] = []

	for (let depth = 0; depth < tree.length; depth++) {
		const client = await execute(tree[depth].module, { url, params }, results)
		results.push({ data: { ...server.layout[depth], ...client.data }, error: client.error })
	}

	const client = await execute(target, { url, params }, results)

	const state: State = {
		url,
		params,
		page: { data: { ...server.page, ...client.data }, error: client.error },
		layout: results
	}

	// Second yield: data state

	yield { Page: compose(target, tree, paths, state), data: state }
}

const App: Stateful<{ page?: Component }> = function* ({ page }) {

	let Page: Component = page ?? (() => null)

	if (page) return <Page />

	const go = async (page: Page) => {

		for await (const state of resolve(location.pathname, layouts, page)) {
			this.next(() => Page = state.Page)
		}

		requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'smooth' }))
	}

	const router = navaid('/', () => go(notFound))
	const hmr = () => router.run()

	for (const config of pages) {
		router.on(config.pattern!, params => go({ ...config, params }))
	}

	router.listen()
	if (import.meta.env.DEV) addEventListener('hmr', hmr)

	try {
		while (true) yield <Page />
	} finally {
		router.unlisten?.()
		if (import.meta.env.DEV) removeEventListener('hmr', hmr)
	}
}

App.attrs = { class: 'h-full' }

export default App
