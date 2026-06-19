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
} from './constants'
import { apply, type Head } from './head'
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

export const cache = new Map<string, State>()

export const clearCache = () => cache.clear()

export const invalidateCache = (topics?: string[]) => {
	if (!topics?.length) {
		cache.clear()
		return
	}

	const changed = new Set(topics)

	for (const [url, state] of cache) {
		if (!state.topics?.length || state.topics.some(topic => changed.has(topic))) cache.delete(url)
	}
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

	const cached = cache.get(url)
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

function applyPatch(obj: any, patches: any[]) {
	for (const { op, path, value } of patches) {

		if (path === '/') {

			if (Array.isArray(obj) && Array.isArray(value)) {
				obj.length = 0
				obj.push(...value)
			} else {
				Object.keys(obj).forEach(k => delete obj[k])
				Object.assign(obj, value)
			}

			continue
		}

		const keys = path.split('/').filter(Boolean)
		const last = keys.pop()!

		let target = obj

		for (const key of keys) target = target[key]

		if (op === 'replace') {

			target[last] = value

		} else if (op === 'add') {

			if (Array.isArray(target)) {
				if (last === '-') target.push(value)
				else target.splice(Number(last), 0, value)
			} else {
				target[last] = value
			}

		} else if (op === 'remove') {

			if (Array.isArray(target)) target.splice(Number(last), 1)
			else delete target[last]
		}
	}
}

// Resolve page: async generator yielding loading then data states

export async function* resolve(
	url: string,
	layouts: Map<string, Loader>,
	page: Page,
	data?: Data,
	error?: AppError
): AsyncGenerator<{ page: Component; state?: State; recompose?: () => Component }> {

	const { loader, segments, params = {} } = page

	const paths = ancestors(segments).filter(path => layouts.has(path))

	const [target, ...tree] = await Promise.all([
		loader(),
		...paths.map(path => layouts.get(path)!().then(module => ({ path, module })))
	])

	if (error) {
		const state: State = { url, params, data: [], loading: false, error }
		yield { page: compose(target, tree, paths, state), state }
		return
	}

	const cached = ssr.get(url)

	if (cached) {

		ssr.delete(url)
		if (cached.hash) cache.set(url, cached)

		yield {
			page: compose(target, tree, paths, cached),
			state: cached,
			recompose: () => compose(target, tree, paths, cached),
		}

		return
	}

	yield { page: compose(target, tree, paths, { url, params, data: [], loading: true }) }

	const server = data
		? { data, head: undefined as Head | undefined }
		: import.meta.env.SSR
			? { data: [] as Data, head: undefined as Head | undefined }
			: await load(url)

	if ('redirect' in server && server.redirect) {
		navigate(server.redirect)
		return
	}

	if ('error' in server && server.error) {
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
		rawServerData: [server.head, ...server.data]
	}

	if (state.hash) cache.set(url, state)

	yield {
		page: compose(target, tree, paths, state),
		recompose: () => compose(target, tree, paths, state),
		state
	}
}

type LiveMessage = {
	patches: any[]
	hash?: string
	topics?: string[]
	versions?: Record<string, number>
}

function stream(onPatch: (message: LiveMessage) => void) {

	let source: EventSource | null = null
	let retries = 0

	const connect = (path: string) => {

		source?.close()

		source = new EventSource(path)

		source.onopen = () => retries = 0

		source.onmessage = event => {
			if (event.data === ':hb') return
			const data = JSON.parse(event.data)
			const message = Array.isArray(data) ? { patches: data } : data as LiveMessage
			if (message.patches?.length) onPatch(message)
		}

		source.onerror = () => {
			source?.close()
			retries++
			if (retries > 10) return
			setTimeout(() => connect(path), Math.min(1000 * 2 ** retries, 30000))
		}
	}

	const close = () => {
		source?.close()
		source = null
		retries = 0
	}

	return { connect, close }
}

const App: Stateful<{ page?: Component }> = function* ({ page }) {

	let Page: Component = page ?? (() => null)

	if (page) return <Page />

	let hmr = false
	let activeState: State | null = null
	let activeRecompose: (() => Component) | null = null
	let generation = 0

	const sse = stream(message => {

		if (!activeState || !activeState.rawServerData || message.patches.length === 0) return

		applyPatch(activeState.rawServerData, message.patches)

		const [head, ...entries] = activeState.rawServerData

		activeState.data = entries
		activeState.hash = message.hash ?? activeState.hash
		activeState.topics = message.topics ?? activeState.topics
		activeState.versions = message.versions ?? activeState.versions

		if (head) apply(activeState.head = head)

		if (activeState.hash) cache.set(activeState.url, activeState)

		const recompose = activeRecompose

		if (recompose) this.next(() => Page = recompose())
	})

	const go = async (target: Page) => {

		const gen = ++generation
		const currentUrl = location.pathname + location.search

		sse.close()

		try {

			for await (const { page, state, recompose } of resolve(currentUrl, layouts, target)) {

				if (gen !== generation) return
				if (hmr && !state) continue

				this.next(() => Page = page)

				if (state?.head) apply(state.head)

				if (state && !state.loading) {

					activeState = state
					activeRecompose = recompose ?? null

					if (!activeState.rawServerData) activeState.rawServerData = [state.head, ...state.data]
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
			requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'smooth' }))
		}

		hmr = false
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

	this.signal.addEventListener('abort', () => {
		sse.close()
		router.unlisten?.()
	})

	while (true) yield <Page />
}

App.attrs = { class: 'h-full' }

export default App
