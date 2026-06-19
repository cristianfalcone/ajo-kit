import navaid from 'navaid'
import type { Component, Stateful } from 'ajo'
import { AppError, navigate, ancestors } from './constants'
import type {
	PageArgs,
	LayoutArgs,
	Data,
	Module,
	Loader,
	Page,
	State,
	RoutePayload,
} from './constants'
import { apply, type Head } from './head'
import { getCache, setCache } from './cache'
import { routes } from 'virtual:ajo/routes'

// Pattern compilation

const reGroup = /^\(.*\)$/
const reDynamic = /^\[(.+?)\]$/

export const toPattern = (segments: string[]) =>
	segments
		.filter(segment => segment && !reGroup.test(segment))
		.map(segment => segment.replace(reDynamic, (_, name) => name === '...' ? '*' : `:${name}`))
		.join('/')

export const toSegments = (path: string) => path.slice(4).split('/').slice(0, -1)

let initialState: State | undefined

export function setInitialState(state: State | null) {
	initialState = state ?? undefined
}

export const error: () => Page = () => ({
	segments: [''],
	loader: async () => ({ default: () => null }),
})

// Build pages from file system

export const layouts = new Map<string, Loader>()
export const pages: Page[] = []

// Path helpers

export const layoutPaths = (segments: string[]) => ancestors(segments).filter(path => layouts.has(path))

for (const [path, loader] of Object.entries(routes as Record<string, Loader>)) {

	const segments = toSegments(path)
	const kind = path.split('/').pop()?.split('.')[0]

	if (kind === 'layout') layouts.set(segments.join('/'), loader)
	if (kind === 'page') pages.push({ pattern: toPattern(segments), segments, loader })
}

// HMR: wrap loaders to use hot-updated modules

if (import.meta.env.DEV && !import.meta.env.SSR) {

	const scope = globalThis as { __MODULES__?: Map<string, Module> }
	const modules = scope.__MODULES__ ??= new Map()

	const hmr = (loader: Loader, file: string): Loader => async () => {

		if (modules.has(file)) return modules.get(file)

		const module = await loader()

		modules.set(file, module)

		return module
	}

	for (const [path, loader] of layouts) layouts.set(path, hmr(loader, `/src${path}/layout.tsx`))

	for (const page of pages) page.loader = hmr(page.loader, `/src${page.segments.join('/')}/page.tsx`)
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

type ServerLoad = {
	data: Data
	head?: Head
	hash?: string
	topics?: string[]
	versions?: Record<string, number>
	redirect?: string
	error?: AppError
}

async function load(url: string): Promise<ServerLoad> {

	const cached = getCache(url)
	const versions = cached?.versions ? JSON.stringify(cached.versions) : undefined

	const response = await fetch(url, {
		credentials: 'include',
		cache: 'no-store',
		headers: {
			Accept: 'application/json',
			...(cached?.hash && { 'X-Have': cached.hash }),
			...(versions && { 'X-Ajo-Versions': versions })
		}
	})

	if (response.status === 304 && cached) {
		return {
			data: cached.data,
			head: cached.head,
			hash: cached.hash,
			topics: cached.topics,
			versions: cached.versions
		}
	}

	const json = await response.json().catch(() => null) as
		| { data?: Data; head?: Head; hash?: string; topics?: string[]; versions?: Record<string, number>; redirect?: string; error?: { status?: number; message?: string } }
		| null

	if (!json || !response.ok) {
		return {
			data: [],
			error: new AppError(
				json?.error?.status ?? response.status,
				json?.error?.message ?? 'Load failed'
			)
		}
	}

	if (json.redirect) return { data: [], redirect: json.redirect }

	return {
		data: json.data ?? [],
		head: json.head,
		hash: json.hash,
		topics: json.topics,
		versions: json.versions
	}
}

// Resolve page: async generator yielding loading then data states

export async function* resolve(
	url: string,
	layouts: Map<string, Loader>,
	page: Page,
	data?: Data,
	error?: AppError
): AsyncGenerator<{ page: Component; state?: State }> {

	const { loader, segments, params = {} } = page

	const paths = layoutPaths(segments)

	const [target, ...tree] = await Promise.all([
		loader(),
		...paths.map(path => layouts.get(path)!().then(module => ({ path, module })))
	])

	if (error) {
		const state: State = { url, params, data: [], loading: false, error }
		yield { page: compose(target, tree, paths, state), state }
		return
	}

	const cached = initialState?.url === url ? initialState : undefined

	if (cached) {

		initialState = undefined
		if (cached.hash) setCache(url, cached)

		yield {
			page: compose(target, tree, paths, cached),
			state: cached,
		}

		return
	}

	yield { page: compose(target, tree, paths, { url, params, data: [], loading: true }) }

	const server: ServerLoad = data
		? { data }
		: import.meta.env.SSR
			? { data: [] }
			: await load(url)

	if (server.redirect) {
		navigate(server.redirect)
		return
	}

	if (server.error) {
		const state = { url, params, data: [], loading: false, error: server.error }
		yield { page: compose(target, tree, paths, state), state }
		return
	}

	const state: State = {
		url,
		params,
		data: server.data,
		loading: false,
		head: server.head,
		hash: server.hash,
		topics: server.topics,
		versions: server.versions,
	}

	if (state.hash) setCache(url, state)

	yield {
		page: compose(target, tree, paths, state),
		state
	}
}

type LiveMessage = {
	data: RoutePayload
	hash?: string
	topics?: string[]
	versions?: Record<string, number>
}

type LiveStatus = 'closed' | 'connecting' | 'open'

type ActionDetail = {
	topics?: string[]
}

function stream(onUpdate: (message: LiveMessage) => void, onStatus?: (status: LiveStatus) => void) {

	let source: EventSource | null = null

	const status = (value: LiveStatus) => onStatus?.(value)

	const connect = (path: string) => {

		source?.close()

		if ((globalThis as { __AJO_DISABLE_SSE__?: boolean }).__AJO_DISABLE_SSE__) {
			status('closed')
			return
		}

		status('connecting')

		source = new EventSource(path)

		source.onopen = () => status('open')

		source.onmessage = event => {
			const message = JSON.parse(event.data) as LiveMessage
			if (message.data) onUpdate(message)
		}

		source.onerror = () => status('connecting')
	}

	const close = () => {
		source?.close()
		source = null
		status('closed')
	}

	return { connect, close }
}

const App: Stateful<{ page?: Component }> = function* ({ page }) {

	let Page: Component = page ?? (() => null)

	if (page) return <Page />

	let hmr = false
	let activeState: State | null = null
	let activePage: Page | null = null
	let actionRefresh: ReturnType<typeof setTimeout> | null = null
	let generation = 0
	let liveGeneration = 0
	let sseStatus: LiveStatus = 'closed'

	const sse = stream(message => {

		if (!activeState || !message.data) return

		liveGeneration++

		const [head, ...entries] = message.data

		activeState.data = entries
		activeState.hash = message.hash ?? activeState.hash
		activeState.topics = message.topics ?? activeState.topics
		activeState.versions = message.versions ?? activeState.versions

		if (head) apply(activeState.head = head)

		if (activeState.hash) setCache(activeState.url, activeState)

		this.next()
	}, status => sseStatus = status)

	const go = async (target: Page, options: { scroll?: boolean } = {}) => {

		const gen = ++generation
		const currentUrl = location.pathname + location.search
		const scroll = options.scroll ?? true

		sse.close()

		try {

			for await (const { page, state } of resolve(currentUrl, layouts, target)) {

				if (gen !== generation) return
				if (hmr && !state) continue

				this.next(() => Page = page)

				if (state?.head) apply(state.head)

				if (state && !state.loading) {

					activeState = state
					activePage = target
				}
			}

		} catch (err) {

			if (gen !== generation) return

			err = err instanceof AppError ? err : new AppError(500, err instanceof Error ? err.message : 'Navigation failed')

			for await (const { page } of resolve(currentUrl, layouts, error(), undefined, err as AppError)) {

				if (gen !== generation) return

				this.next(() => Page = page)
			}

			return
		}

		if (gen !== generation) return

		if (!hmr) {
			sse.connect(currentUrl)
			if (scroll) requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'smooth' }))
		}

		hmr = false
	}

	const refreshActiveRoute = async () => {
		if (!activeState || !activePage) return

		const gen = generation
		const state = activeState
		const server = await load(state.url)

		if (gen !== generation || activeState !== state) return

		if (server.redirect) {
			navigate(server.redirect)
			return
		}

		if (server.error) {
			state.data = []
			state.error = server.error
			state.loading = false
		} else {
			state.data = server.data
			state.error = undefined
			state.head = server.head
			state.hash = server.hash
			state.topics = server.topics
			state.versions = server.versions

			if (server.head) apply(server.head)
			if (state.hash) setCache(state.url, state)
		}

		this.next()
	}

	const refreshAfterAction = (topics?: string[]) => {

		if (!topics?.length || !activeState?.topics?.length || !activePage) return

		const changed = new Set(topics)

		if (!activeState.topics.some(topic => changed.has(topic))) return

		const seen = liveGeneration
		const delay = sseStatus === 'open' ? 250 : 0

		if (actionRefresh) clearTimeout(actionRefresh)

		actionRefresh = setTimeout(() => {
			actionRefresh = null
			if (liveGeneration !== seen || !activePage) return
			void refreshActiveRoute()
		}, delay)
	}

	const router = navaid('/', () => go(error()))

	for (const config of pages) router.on(config.pattern!, params => go({ ...config, params }))

	router.listen()

	if (import.meta.env.DEV) addEventListener(
		'hmr',
		() => {
			hmr = true
			router.run()
		},
		{ signal: this.signal }
	)

	addEventListener('ajo:navigate', () => router.run(), { signal: this.signal })

	addEventListener(
		'ajo:action',
		event => refreshAfterAction((event as CustomEvent<ActionDetail>).detail?.topics),
		{ signal: this.signal }
	)

	this.signal.addEventListener('abort', () => {
		if (actionRefresh) clearTimeout(actionRefresh)
		sse.close()
		router.unlisten?.()
	})

	while (true) yield <Page />
}

App.attrs = { class: 'h-full' }

export default App
