import navaid from 'navaid'
import type { Component, Stateful } from 'ajo'
import { Failure, navigate, ancestors } from './constants'
import type {
	PageArgs,
	LayoutArgs,
	Data,
	Module,
	Loader,
	Page,
	State,
	Payload,
} from './constants'
import { apply, type Head } from './head'
import { drop, evict, get, set } from './cache'
import { routes as discovered } from 'virtual:ajo/routes'

// Pattern compilation

const group = /^\(.*\)$/
const dynamic = /^\[(.+?)\]$/

/** Compiles filesystem segments into the client router's group-free pattern. */
export const match = (segments: string[]) =>
	segments
		.filter(segment => segment && !group.test(segment))
		.map(segment => segment.replace(dynamic, (_, name) => name === '...' ? '*' : `:${name}`))
		.join('/')

/** Extracts route segments from a generated page or layout module path under `/src`. */
export const parts = (path: string) => path.slice(4).split('/').slice(0, -1)

let initial: State | undefined

// The scope the server declared for this client's identity. Every cache read
// and write is keyed under it — the cache module fails closed without one —
// so entries cached as one identity are unreachable as another inside the
// same tab. Login and logout are SPA redirects here, never full reloads: this
// variable and adopt() are what stand between two identities sharing one
// module-level cache Map.
let scope: string | undefined

// Which identity the client is on, counted rather than named. A response
// carries the era its request was issued under, and only a response issued
// after the last change may declare the next one: identity moves forward, so
// a reply computed under the previous identity — an abandoned navigation, a
// refresh dispatched before the cookie changed — cannot roll the scope back,
// drop the partition that replaced it, and re-cache what the client has
// already stopped being.
let era = 0

/** @internal Exposes the identity era for tests only — not public API. */
export const current = () => era

/** Adopts a scope declared by a response issued in era `since`. */
const adopt = (next: string | undefined, since = era) => {
	if (!next || next === scope || since !== era) return
	if (scope) drop(scope)
	scope = next
	era++
}

/** Seeds the one-shot hydration state and adopts its server-declared cache scope. */
export function init(state: State | null) {
	initial = state ?? undefined
	adopt(initial?.scope)
}

/** Supplies the inert page module used for missing routes and navigation failures. */
export const error: () => Page = () => ({
	segments: [''],
	loader: async () => ({ default: () => null }),
})

// Build pages from file system

/** Layout loaders installed by the generated route registry and refreshed by HMR. */
export const layouts = new Map<string, Loader>()
/** Page definitions installed by the generated route registry and consumed by both routers. */
export const pages: Page[] = []

/** Selects the registered layout ancestors for a route from outermost to innermost. */
export const parents = (segments: string[]) => ancestors(segments).filter(path => layouts.has(path))

/** Installs the page and layout registry generated for the current host build. */
export function register(routes: Record<string, Loader>): void {
	layouts.clear()
	pages.length = 0

	for (const [path, loader] of Object.entries(routes)) {
		const segments = parts(path)
		const kind = path.split('/').pop()?.split('.')[0]

		if (kind === 'layout') layouts.set(segments.join('/'), loader)
		if (kind === 'page') pages.push({ pattern: match(segments), segments, loader })
	}
}

register(discovered as Record<string, Loader>)

// HMR: wrap loaders to use hot-updated modules

if (import.meta.env.DEV && !import.meta.env.SSR) {

	const shared = globalThis as { __MODULES__?: Map<string, Module> }
	const modules = shared.__MODULES__ ??= new Map()

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

	// Find who handles pending navigation: page first, then innermost layout.

	const boundary = page.pending ? 'page' : tree.findLast(entry => entry.module.pending)?.path

	return tree.reduceRight<Component>(
		(Child, { path, module }, depth) => {
			const Layout = module.default as Component<LayoutArgs>
			return () => (
				<Layout
					key={path}
					params={state.params}
					data={state.data[depth]}
					loading={state.loading && boundary === path}
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
				loading={state.loading && boundary === 'page'}
				error={state.error}
			/>
		)
	)
}

type Load = {
	data: Data
	head?: Head
	hash?: string
	topics?: string[]
	versions?: Record<string, number>
	scope?: string
	/** The era this request was issued under; a later era ignores its scope. */
	since: number
	redirect?: string
	error?: Failure
}

async function load(url: string): Promise<Load> {

	const since = era
	const cached = get(url, { scope })
	const versions = cached?.versions ? JSON.stringify(cached.versions) : undefined

	// The scope travels with the freshness material: the server's fresh
	// shortcut only confirms a hash for the identity that cached it, so a
	// stale scope makes these headers inert instead of dangerous.
	const response = await fetch(url, {
		credentials: 'include',
		cache: 'no-store',
		headers: {
			Accept: 'application/json',
			...(cached?.hash && { 'X-Have': cached.hash }),
			...(versions && { 'X-Ajo-Versions': versions }),
			...(cached?.hash && scope && { 'X-Ajo-Scope': scope })
		}
	})

	if (response.status === 304 && cached) {
		return {
			data: cached.data,
			head: cached.head,
			hash: cached.hash,
			topics: cached.topics,
			versions: cached.versions,
			scope: cached.scope ?? scope,
			since
		}
	}

	const json = await response.json().catch(() => null) as
		| { data?: Data; head?: Head; hash?: string; topics?: string[]; versions?: Record<string, number>; scope?: string; redirect?: string; error?: { status?: number; message?: string } }
		| null

	if (!json || !response.ok) {
		return {
			data: [],
			since,
			error: new Failure(
				json?.error?.status ?? response.status,
				json?.error?.message ?? 'Load failed'
			)
		}
	}

	if (json.redirect) return { data: [], since, redirect: json.redirect }

	return {
		data: json.data ?? [],
		head: json.head,
		hash: json.hash,
		topics: json.topics,
		versions: json.versions,
		scope: json.scope,
		since
	}
}

/** Composes a route and yields its pending state before its settled client data. */
export async function* resolve(
	url: string,
	layouts: Map<string, Loader>,
	page: Page,
	data?: Data,
	error?: Failure
): AsyncGenerator<{ page: Component; state?: State }> {

	const { loader, segments, params = {} } = page

	const paths = parents(segments)

	const [target, ...tree] = await Promise.all([
		loader(),
		...paths.map(path => layouts.get(path)!().then(module => ({ path, module })))
	])

	if (error) {
		const state: State = { url, params, data: [], loading: false, error }
		yield { page: compose(target, tree, paths, state), state }
		return
	}

	const cached = initial?.url === url ? initial : undefined

	if (cached) {

		initial = undefined
		if (cached.hash) set(url, cached, { scope })

		yield {
			page: compose(target, tree, paths, cached),
			state: cached,
		}

		return
	}

	yield { page: compose(target, tree, paths, { url, params, data: [], loading: true }) }

	const server: Load = data
		? { data, since: era }
		: import.meta.env.SSR
			? { data: [], since: era }
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

	// Adopt before writing: a response carrying a new scope means the identity
	// changed since the last paint, and the write must land in the new
	// partition — never beside the previous identity's entries. The era guard
	// makes a reply from an abandoned navigation inert: this generator runs to
	// completion after go() has stopped reading it, so nothing else here can
	// stop a late response from cementing a dead identity.
	adopt(server.scope, server.since)

	const state: State = {
		url,
		params,
		data: server.data,
		loading: false,
		head: server.head,
		hash: server.hash,
		topics: server.topics,
		versions: server.versions,
		scope: server.scope,
	}

	// Only material computed for the partition the client is on may enter it.
	// When the era guard above refused a late response, its scope no longer
	// matches and the payload is rendered but not cached — one identity's
	// answer never lands in another's partition.
	if (state.hash && state.scope === scope) set(url, state, { scope })

	yield {
		page: compose(target, tree, paths, state),
		state
	}
}

type Message = {
	data: Payload
	hash?: string
	topics?: string[]
	versions?: Record<string, number>
	scope?: string
}

type Status = 'closed' | 'connecting' | 'open'

type Detail = {
	topics?: string[]
}

function stream(update: (message: Message) => void, notify?: (status: Status) => void, expire?: () => void) {

	let source: EventSource | null = null

	const status = (value: Status) => notify?.(value)

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
			const message = JSON.parse(event.data) as Message
			if (message.data) update(message)
		}

		// The server names this close a dead credential — reconnecting cannot
		// help, so the stream ends here and the owner reacts (re-running the
		// loaders walks an expired session to the login screen) instead of
		// idling on stale data.
		source.addEventListener('expired', () => {
			source?.close()
			source = null
			status('closed')
			expire?.()
		})

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
	let active: State | null = null
	let timer: ReturnType<typeof setTimeout> | null = null
	let generation = 0
	let live = 0
	let phase: Status = 'closed'

	const sse = stream(message => {

		if (!active || !message.data) return

		// A message declaring another scope was computed for an identity this
		// client is not on — it is never adopted and never rendered. The
		// disagreement reads both ways, though: a stale connection racing its
		// own close, or a client whose identity changed under it (expiry,
		// logout in another tab) hearing from an already-current connection —
		// and there reconnecting alone can never converge, because the stale
		// side is this module's scope, not the socket. Either way: drop the
		// connection and re-run the loaders. The response carries the current
		// scope with its era, adopt() orders the adoption, and the reconnect
		// waits for the settled identity — unless a navigation won meanwhile
		// and owns the connection.
		if (message.scope && scope && message.scope !== scope) {
			const gen = generation
			sse.close()
			void refresh().then(() => {
				if (gen === generation && active) sse.connect(active.url)
			})
			return
		}

		live++

		const [head, ...entries] = message.data

		active.data = entries
		active.hash = message.hash ?? active.hash
		active.topics = message.topics ?? active.topics
		active.versions = message.versions ?? active.versions
		active.scope = message.scope ?? active.scope

		if (head) apply(active.head = head)

		adopt(message.scope)
		if (active.hash && active.scope === scope) set(active.url, active, { scope })

		this.next()
	// On expiry the loaders re-run for the current URL: the server answers a
	// dead session with its redirect envelope and refresh() follows it, so
	// the screen walks itself to login instead of waiting for a click.
	}, status => phase = status, () => void refresh())

	const go = async (target: Page, options: { scroll?: boolean } = {}) => {

		const gen = ++generation
		const url = location.pathname + location.search
		const scroll = options.scroll ?? true

		sse.close()

		try {

			for await (const { page, state } of resolve(url, layouts, target)) {

				if (gen !== generation) return
				if (hmr && !state) continue

				this.next(() => Page = page)

				if (state?.head) apply(state.head)

				if (state && !state.loading) {
					active = state
				}
			}

		} catch (err) {

			if (gen !== generation) return

			err = err instanceof Failure ? err : new Failure(500, err instanceof Error ? err.message : 'Navigation failed')

			for await (const { page } of resolve(url, layouts, error(), undefined, err as Failure)) {

				if (gen !== generation) return

				this.next(() => Page = page)
			}

			return
		}

		if (gen !== generation) return

		if (!hmr) {
			sse.connect(url)
			if (scroll) requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'smooth' }))
		}

		hmr = false
	}

	const refresh = async () => {
		if (!active) return

		const gen = generation
		const state = active
		const server = await load(state.url)

		if (gen !== generation || active !== state) return

		if (server.redirect) {
			navigate(server.redirect)
			return
		}

		if (server.error) {
			// The cache holds this very object, so emptying it in place would
			// leave an entry whose hash promises a payload it no longer has —
			// and a later 304 confirming that hash would paint the emptiness as
			// success. Evict first, then report the error.
			evict(state.url, { scope })
			state.data = []
			state.error = server.error
			state.loading = false
			state.hash = undefined
		} else {
			state.data = server.data
			state.error = undefined
			state.head = server.head
			state.hash = server.hash
			state.topics = server.topics
			state.versions = server.versions
			state.scope = server.scope

			if (server.head) apply(server.head)
			adopt(server.scope, server.since)
			if (state.hash && state.scope === scope) set(state.url, state, { scope })
		}

		this.next()
	}

	const reconcile = (topics?: string[]) => {

		if (!topics?.length || !active?.topics?.length) return

		const changed = new Set(topics)

		if (!active.topics.some(topic => changed.has(topic))) return

		const seen = live
		const delay = phase === 'open' ? 250 : 0

		if (timer) clearTimeout(timer)

		timer = setTimeout(() => {
			timer = null
			if (live !== seen) return
			void refresh()
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
		event => reconcile((event as CustomEvent<Detail>).detail?.topics),
		{ signal: this.signal }
	)

	this.signal.addEventListener('abort', () => {
		if (timer) clearTimeout(timer)
		sse.close()
		router.unlisten?.()
	})

	while (true) yield <Page />
}

App.attrs = { class: 'h-full' }

/** Client root that owns navigation, scoped caching, live updates, and HMR reconciliation. */
export default App
