/** @jsxImportSource ajo */
import { render, type Children, type Stateful, type Stateless } from 'ajo'
import { context } from 'ajo/context'
import Badge from '/src/ui/badge'
import Button from '/src/ui/button'
import Checkbox from '/src/ui/checkbox'
import Feedback from '/src/ui/feedback'
import Input from '/src/ui/input'
import Panel from '/src/ui/panel'
import 'virtual:uno.css'

export type Control =
	| 'boolean'
	| 'color'
	| 'number'
	| 'object'
	| 'radio'
	| 'range'
	| 'select'
	| 'text'

export type ArgType = {
	control?: Control
	description?: string
	label?: string
	max?: number
	min?: number
	options?: readonly unknown[]
	step?: number
}

type ComponentLike = (args: Record<string, unknown>) => Children

export type Parameters = {
	docs?: {
		description?: string
	}
	empty?: boolean
	layout?: 'centered' | 'fullscreen' | 'padded'
}

export type Meta<C = ComponentLike> = {
	title: string
	component?: C
	args?: Record<string, unknown>
	argTypes?: Record<string, ArgType>
	parameters?: Parameters
	render?: (args: Record<string, unknown>, context: StoryContext) => Children
}

export type Story<C = ComponentLike> = {
	component?: C
	name?: string
	args?: Record<string, unknown>
	argTypes?: Record<string, ArgType>
	parameters?: Parameters
	render?: (args: Record<string, unknown>, context: StoryContext) => Children
	play?: (context: PlayContext) => void | Promise<void>
}

export type StoryContext = {
	id: string
	name: string
	title: string
}

export type PlayContext = StoryContext & {
	canvas: HTMLElement
}

type StoryModule = {
	default?: Meta
	[key: string]: Meta | Story | undefined
}

type StoryEntry = {
	argTypes: Record<string, ArgType>
	args: Record<string, unknown>
	exportName: string
	file: string
	id: string
	meta: Meta
	name: string
	parameters: Parameters
	story: Story
	title: string
}

type StorySummary = {
	exportName: string
	file: string
	id: string
	name: string
	parameters: Parameters
	title: string
}

type State = {
	active?: StoryEntry
	drafts: Record<string, string>
	entries: StoryEntry[]
	errors: Record<string, string>
	failure?: string
	failureKey?: string
	live: Map<string, Record<string, unknown>>
	loading: boolean
	message: string
	theme: ThemeMode
}

type ThemeMode = 'system' | 'light' | 'dark'

type ArgHandlers = {
	setArg: (name: string, value: unknown) => void
	setObject: (name: string, value: string) => void
}

type StoriesApi = ArgHandlers & {
	cycleTheme: () => void
	navigate: (id: string) => void
	theme: ThemeMode
}

declare global {
	var __AJO_STORIES_INDEX__: StorySummary[] | undefined
}

const modules = import.meta.glob<StoryModule>('./*.stories.tsx')
const themeKey = 'theme.v1'
const StoriesContext = context<StoriesApi | null>(null)

const stories = () => {
	const api = StoriesContext()
	if (!api) throw new Error('Stories context is missing')
	return api
}

const isThemeMode = (value: unknown): value is ThemeMode =>
	value === 'system' || value === 'light' || value === 'dark'

const readTheme = (): ThemeMode => {
	const query = new URLSearchParams(location.search).get('theme')
	if (isThemeMode(query)) return query

	try {
		const stored = globalThis.localStorage?.getItem(themeKey)
		if (isThemeMode(stored)) return stored
	} catch { }

	return 'system'
}

const slug = (value: unknown) => String(value)
	.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
	.toLowerCase()
	.replace(/[^a-z0-9]+/g, '-')
	.replace(/^-|-$/g, '') || 'story'

const label = (value: unknown) => String(value)
	.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
	.replace(/[-_]+/g, ' ')
	.replace(/\b\w/g, letter => letter.toUpperCase())

const mergeRecord = (
	first?: Record<string, unknown>,
	second?: Record<string, unknown>,
): Record<string, unknown> => ({
	...(first ?? {}),
	...(second ?? {}),
})

const mergeArgTypes = (
	first?: Record<string, ArgType>,
	second?: Record<string, ArgType>,
): Record<string, ArgType> => ({
	...(first ?? {}),
	...(second ?? {}),
})

const mergeParameters = (first?: Parameters, second?: Parameters): Parameters => ({
	...(first ?? {}),
	...(second ?? {}),
})

const stringify = (value: unknown) => {
	try {
		return JSON.stringify(value, null, 2)
	} catch {
		return String(value)
	}
}

const option = (value: unknown) => JSON.stringify(value)

const read = (value: string) => {
	try {
		return JSON.parse(value) as unknown
	} catch {
		return value
	}
}

const input = (event: Event) => event.currentTarget as HTMLInputElement
const select = (event: Event) => event.currentTarget as HTMLSelectElement
const textarea = (event: Event) => event.currentTarget as HTMLTextAreaElement

const systemDark = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

const applyTheme = (mode: ThemeMode) => {
	document.documentElement.classList.toggle('dark', mode === 'dark' || (mode === 'system' && systemDark()))
}

const storeTheme = (mode: ThemeMode) => {
	try {
		globalThis.localStorage?.setItem(themeKey, mode)
	} catch { }
}

const nextTheme = (mode: ThemeMode): ThemeMode => mode === 'system'
	? 'light'
	: mode === 'light'
		? 'dark'
		: 'system'

const themeIcon = (mode: ThemeMode) => mode === 'system'
	? 'i-lucide-monitor'
	: mode === 'light'
		? 'i-lucide-sun'
		: 'i-lucide-moon'

const parseArgs = () => {
	const raw = new URLSearchParams(location.search).get('args')
	if (!raw) return {}

	try {
		return JSON.parse(raw) as Record<string, unknown>
	} catch {
		return {}
	}
}

const pick = (entries: StoryEntry[]) => {
	const match = location.pathname.match(/^\/story\/([^/]+)$/)
	const id = match?.[1]
	return entries.find(entry => entry.id === id) ?? entries[0]
}

const publicIndex = (entries: StoryEntry[]): StorySummary[] => entries.map(entry => ({
	id: entry.id,
	title: entry.title,
	name: entry.name,
	file: entry.file,
	exportName: entry.exportName,
	parameters: entry.parameters,
}))

const publish = (entries: StoryEntry[]) => {
	globalThis.__AJO_STORIES_INDEX__ = publicIndex(entries)
}

const loadStories = async () => {
	const loaded = await Promise.all(Object.entries(modules).map(async ([file, load]) => {
		const module = await load()
		return [file, module] as const
	}))

	const entries: StoryEntry[] = []

	for (const [file, module] of loaded) {
		const meta = module.default
		if (!meta?.title) continue

		for (const [exportName, story] of Object.entries(module)) {
			if (exportName === 'default') continue
			if (!story || typeof story !== 'object') continue

			const item = story as Story
			const name = item.name ?? label(exportName)
			const id = `${slug(meta.title)}--${slug(exportName)}`

			entries.push({
				id,
				name,
				title: meta.title,
				file,
				exportName,
				meta,
				story: item,
				args: mergeRecord(meta.args, item.args),
				argTypes: mergeArgTypes(meta.argTypes, item.argTypes),
				parameters: mergeParameters(meta.parameters, item.parameters),
			})
		}
	}

	return entries.sort((a, b) => (a.title + a.name).localeCompare(b.title + b.name))
}

const storyArgs = (entry: StoryEntry, state: State) => ({
	...entry.args,
	...parseArgs(),
	...(state.live.get(entry.id) ?? {}),
})

const storyKey = (entry: StoryEntry, args: Record<string, unknown>) => `${entry.id}:${stringify(args)}`

const visible = (entries: StoryEntry[], filter: string) => {
	const query = filter.trim().toLowerCase()
	if (!query) return entries

	return entries.filter(entry =>
		entry.title.toLowerCase().includes(query) ||
		entry.name.toLowerCase().includes(query) ||
		entry.id.toLowerCase().includes(query)
	)
}

const group = (entries: StoryEntry[]) => {
	const groups = new Map<string, StoryEntry[]>()

	for (const entry of entries) {
		const list = groups.get(entry.title) ?? []
		list.push(entry)
		groups.set(entry.title, list)
	}

	return Array.from(groups.entries())
}

const renderStory = (entry: StoryEntry, args: Record<string, unknown>) => {
	const context = { id: entry.id, name: entry.name, title: entry.title }
	if (entry.story.render) return entry.story.render(args, context)
	if (entry.meta.render) return entry.meta.render(args, context)
	if (entry.meta.component) {
		const Component = entry.meta.component as ComponentLike
		return <Component {...args} />
	}
	throw new Error(`Story ${entry.id} has no render function or component`)
}

const StoryView: Stateless<{
	args?: Record<string, unknown>
	entry?: StoryEntry
	fill?: boolean
	root?: (el: HTMLElement | null) => void
}> = ({
	args = {},
	entry,
	fill,
	root,
}) => {
	if (!entry) {
		return (
			<Panel data-stories-error="true" variant="solid" padding="sm">
				<Feedback>No story selected.</Feedback>
			</Panel>
		)
	}

	const key = storyKey(entry, args)
	const layout = entry.parameters.layout ?? 'padded'
	const height = fill ? 'min-h-full' : 'min-h-[18rem]'
	const classes = layout === 'fullscreen'
		? fill ? 'min-h-full' : 'min-h-screen'
		: layout === 'centered'
			? `${height} flex items-center justify-center p-8`
			: `${height} p-8`

	try {
		return (
			<div key={key} ref={root} data-story-root={entry.id} class={classes}>
				{renderStory(entry, args)}
			</div>
		)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return (
			<Panel data-stories-error="true" variant="solid" padding="sm">
				<Feedback class="font-medium">Story render failed</Feedback>
				<pre class="mt-2 whitespace-pre-wrap text-xs">{message}</pre>
			</Panel>
		)
	}
}

const Field: Stateless<{
	arg: ArgType
	draft?: string
	error?: string
	name: string
	value: unknown
}> = ({
	arg,
	draft,
	error,
	name,
	value,
}) => {
	const title = arg.label ?? label(name)
	const description = arg.description
	const control = arg.control ?? 'text'
	const id = `arg-${slug(name)}`
	const { setArg, setObject } = stories()

	if (control === 'boolean') {
		return (
			<Checkbox
				name={name}
				checked={Boolean(value)}
				onToggle={() => setArg(name, !Boolean(value))}
				label={(
					<span class="block">
						<span class="block font-medium text-slate-700 dark:text-slate-200">{title}</span>
						{description && <span class="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
					</span>
				)}
			/>
		)
	}

	if (control === 'text') {
		return (
			<Input
				label={title}
				hint={description}
				set:value={String(value ?? '')}
				set:oninput={(event: Event) => setArg(name, input(event).value)}
			/>
		)
	}

	if (control === 'radio') {
		return (
			<fieldset class="text-sm">
				<legend class="mb-1 font-medium text-slate-700 dark:text-slate-200">{title}</legend>
				<div class="flex flex-wrap gap-1">
					{(arg.options ?? []).map(item => (
						<span key={option(item)}>
							<Button
								type="button"
								tone={option(item) === option(value) ? 'primary' : 'neutral'}
								aria-pressed={option(item) === option(value) ? 'true' : 'false'}
								set:onclick={() => setArg(name, item)}
							>
								{String(item)}
							</Button>
						</span>
					))}
				</div>
				{description && <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
			</fieldset>
		)
	}

	if (control === 'select') {
		return (
			<label class="block text-sm">
				<span class="mb-1 block font-medium text-slate-700 dark:text-slate-200">{title}</span>
				<select
					id={id}
					class="h-9 w-full rounded-md bg-[#fbfdfb] px-2 text-sm inset-ring inset-ring-slate-900/12 dark:bg-white/8 dark:text-white dark:inset-ring-white/12"
					set:value={option(value)}
					set:onchange={(event: Event) => setArg(name, read(select(event).value))}
				>
					{(arg.options ?? []).map(item => (
						<option key={option(item)} value={option(item)}>{String(item)}</option>
					))}
				</select>
				{description && <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
			</label>
		)
	}

	if (control === 'number' || control === 'range') {
		return (
			<label class="block text-sm">
				<span class="mb-1 block font-medium text-slate-700 dark:text-slate-200">{title}</span>
				<input
					id={id}
					type={control}
					min={arg.min}
					max={arg.max}
					step={arg.step}
					class="h-9 w-full rounded-md bg-[#fbfdfb] px-2 text-sm inset-ring inset-ring-slate-900/12 dark:bg-white/8 dark:text-white dark:inset-ring-white/12"
					set:value={String(value ?? 0)}
					set:oninput={(event: Event) => setArg(name, Number(input(event).value))}
				/>
				{description && <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
			</label>
		)
	}

	if (control === 'color') {
		return (
			<label class="block text-sm">
				<span class="mb-1 block font-medium text-slate-700 dark:text-slate-200">{title}</span>
				<input
					id={id}
					type="color"
					class="h-9 w-full rounded-md bg-[#fbfdfb] p-1 inset-ring inset-ring-slate-900/12 dark:bg-white/8 dark:inset-ring-white/12"
					set:value={String(value ?? '#000000')}
					set:oninput={(event: Event) => setArg(name, input(event).value)}
				/>
				{description && <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
			</label>
		)
	}

	if (control === 'object') {
		const text = draft ?? stringify(value ?? {})
		return (
			<label class="block text-sm">
				<span class="mb-1 block font-medium text-slate-700 dark:text-slate-200">{title}</span>
				<textarea
					id={id}
					class="min-h-24 w-full rounded-md bg-[#fbfdfb] px-2 py-1.5 font-mono text-xs inset-ring inset-ring-slate-900/12 dark:bg-white/8 dark:text-white dark:inset-ring-white/12"
					set:value={text}
					set:oninput={(event: Event) => setObject(name, textarea(event).value)}
				/>
				{error && <Feedback data-stories-error="true" class="mt-1 text-xs">{error}</Feedback>}
				{description && <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
			</label>
		)
	}

	return (
		<Input
			label={title}
			hint={description}
			set:value={String(value ?? '')}
			set:oninput={(event: Event) => setArg(name, input(event).value)}
		/>
	)
}

const Controls: Stateless<{
	args: Record<string, unknown>
	drafts: Record<string, string>
	entry?: StoryEntry
	errors: Record<string, string>
}> = ({
	args,
	drafts,
	entry,
	errors,
}) => {
	if (!entry) return null

	const fields = Object.entries(entry.argTypes)

	return (
		<aside class="h-full min-h-0 w-80 shrink-0 overflow-y-auto overscroll-contain border-l border-slate-900/10 bg-[#f8fbf9]/80 p-4 dark:border-white/10 dark:bg-white/5">
			<div class="space-y-5">
				<section>
					<p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Story</p>
					<h2 class="mt-1 text-base font-semibold text-slate-900 dark:text-white">{entry.name}</h2>
					<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{entry.id}</p>
					{entry.parameters.docs?.description && (
						<p class="mt-3 text-sm text-slate-600 dark:text-slate-300">{entry.parameters.docs.description}</p>
					)}
				</section>

				<section>
					<p class="mb-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Controls</p>
					{fields.length ? (
						<div class="space-y-4">
							{fields.map(([name, arg]) => (
								<div key={name}>
									<Field
										name={name}
										arg={arg}
										value={args[name]}
										draft={drafts[name]}
										error={errors[name]}
									/>
								</div>
							))}
						</div>
					) : (
						<p class="text-sm text-slate-500 dark:text-slate-400">No controls for this story.</p>
					)}
				</section>
			</div>
		</aside>
	)
}

type NavProps = {
	active?: StoryEntry
	entries: StoryEntry[]
}

const Nav: Stateful<NavProps, 'aside'> = function* () {
	let filter = ''

	const setFilter = (value: string) => this.next(() => {
		filter = value
	})

	for (const { active, entries } of this) {
		const { navigate } = stories()
		const matches = visible(entries, filter)

		yield (
			<>
				<div class="mb-4 flex items-center justify-between gap-3">
					<h1 class="text-lg font-semibold text-slate-950 dark:text-white">Ajo Kit UI</h1>
					<div class="flex items-center gap-2">
						<Badge tone="neutral">{matches.length} stories</Badge>
						<ThemeToggle />
					</div>
				</div>
				<Input
					placeholder="Search stories"
					tone="muted"
					wrapper="mb-4"
					set:value={filter}
					set:oninput={(event: Event) => setFilter(input(event).value)}
				/>
				<nav data-stories-list="true" class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
					{group(matches).map(([title, items]) => (
						<section key={title}>
							<p class="mb-1 px-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{title}</p>
							<div class="space-y-1">
								{items.map(item => (
									<a
										key={item.id}
										href={`/story/${item.id}`}
										data-story-link={item.id}
										class={(active?.id === item.id
											? 'bg-[#fbfdfb] text-primary shadow-xs inset-ring inset-ring-accent/20 dark:bg-accent/15 dark:text-accent dark:shadow-none'
											: 'text-slate-600 hover:bg-[#fbfdfb]/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white') +
											' block rounded-md px-2.5 py-2 text-sm font-medium'}
										set:onclick={(event: Event) => {
											event.preventDefault()
											navigate(item.id)
										}}
									>
										{item.name}
									</a>
								))}
							</div>
						</section>
					))}
				</nav>
			</>
		)
	}
}

Nav.is = 'aside'
Nav.attrs = {
	class: 'flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-slate-900/10 bg-[#edf4f3]/80 p-4 dark:border-white/10 dark:bg-primary/40',
}

const ThemeToggle: Stateless = () => {
	const { cycleTheme, theme } = stories()

	return (
		<Button
			type="button"
			aria-label="Change theme"
			title={`Theme: ${theme}`}
			icon={themeIcon(theme)}
			tone="neutral"
			height="md"
			set:onclick={cycleTheme}
		/>
	)
}

const initialState = (): State => ({
	entries: [],
	active: undefined,
	live: new Map(),
	drafts: {},
	errors: {},
	message: 'Loading stories...',
	loading: true,
	failure: undefined,
	failureKey: undefined,
	theme: readTheme(),
})

const App: Stateful = function* () {
	const state = initialState()
	let renderVersion = 0
	let storyRoot: HTMLElement | null = null

	const clearFailure = () => {
		state.failure = undefined
		state.failureKey = undefined
	}

	const assignArg = (name: string, value: unknown) => {
		const entry = state.active
		if (!entry) return

		state.live.set(entry.id, {
			...(state.live.get(entry.id) ?? {}),
			[name]: value,
		})
		delete state.errors[name]
		clearFailure()
	}

	const setArg = (name: string, value: unknown) => {
		this.next(() => assignArg(name, value))
	}

	const setObject = (name: string, value: string) => {
		try {
			const parsed = JSON.parse(value) as unknown
			this.next(() => {
				assignArg(name, parsed)
				delete state.drafts[name]
			})
		} catch (error) {
			this.next(() => {
				state.drafts[name] = value
				state.errors[name] = error instanceof Error ? error.message : 'Invalid JSON'
			})
		}
	}

	const setTheme = (mode: ThemeMode) => {
		this.next(() => {
			state.theme = mode
			storeTheme(mode)
			applyTheme(mode)
		})
	}

	const cycleTheme = () => setTheme(nextTheme(state.theme))

	const captureStoryRoot = (root: HTMLElement | null) => {
		storyRoot = root
	}

	const syncActive = () => {
		state.active = pick(state.entries)
		state.drafts = {}
		state.errors = {}
		clearFailure()
	}

	const navigate = (id: string) => {
		history.pushState(null, '', `/story/${id}`)
		this.next(syncActive)
	}

	const ready = async (version: number, key?: string) => {
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
		if (version !== renderVersion) return

		const entry = state.active
		const canvas = storyRoot?.dataset.storyRoot === entry?.id ? storyRoot : null

		if (!entry || !key || state.failureKey === key) {
			document.documentElement.dataset.ajoReady = 'true'
			return
		}

		try {
			if (entry.story.play && canvas instanceof HTMLElement) {
				await entry.story.play({ id: entry.id, name: entry.name, title: entry.title, canvas })
			}
		} catch (error) {
			if (version === renderVersion) {
				this.next(() => {
					state.failure = error instanceof Error ? error.stack ?? error.message : String(error)
					state.failureKey = key
				})
			}
			return
		}

		if (version === renderVersion) document.documentElement.dataset.ajoReady = 'true'
	}

	globalThis.addEventListener('popstate', () => this.next(syncActive), { signal: this.signal })
	globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (state.theme === 'system') {
			applyTheme('system')
			this.next()
		}
	}, { signal: this.signal })

	applyTheme(state.theme)

	void loadStories()
		.then(entries => this.next(() => {
			state.entries = entries
			state.active = pick(entries)
			state.loading = false
			state.message = entries.length ? '' : 'No stories found in tests/stories.'
			publish(entries)
		}))
		.catch(error => this.next(() => {
			state.loading = false
			state.message = error instanceof Error ? error.message : String(error)
			publish([])
		}))

	while (true) {
		const active = state.active
		const args = active ? storyArgs(active, state) : {}
		const params = new URLSearchParams(location.search)
		const canvas = params.get('canvas') === '1'
		const screenshot = params.get('screenshot') === '1'
		const key = active ? storyKey(active, args) : undefined
		const version = ++renderVersion

		StoriesContext({ cycleTheme, navigate, setArg, setObject, theme: state.theme })
		delete document.documentElement.dataset.ajoReady
		if (!state.loading) queueMicrotask(() => void ready(version, key))

		if (state.loading || !active) {
			yield (
				<main class="h-full bg-[#edf4f3] p-6 text-slate-800 dark:bg-[#0e1a2e] dark:text-slate-100">
					<Panel variant="solid" padding="sm" class="text-sm">
						{state.message}
					</Panel>
				</main>
			)
			continue
		}

		if (canvas) {
			yield (
				<main class="h-full overflow-auto overscroll-contain bg-[#edf4f3] text-slate-800 dark:bg-[#0e1a2e] dark:text-slate-100">
					{screenshot && <style>{'*,::before,::after{animation-duration:0.001ms!important;animation-delay:0ms!important;transition-duration:0.001ms!important;scroll-behavior:auto!important}'}</style>}
					<StoryView entry={active} args={args} root={captureStoryRoot} />
					{state.failure && (
						<Panel data-stories-error="true" variant="solid" padding="sm" class="m-4">
							<pre class="whitespace-pre-wrap text-xs text-red-600 dark:text-red-400">{state.failure}</pre>
						</Panel>
					)}
				</main>
			)
			continue
		}

		yield (
			<main class="flex h-full overflow-hidden bg-[#edf4f3] text-slate-800 dark:bg-[#0e1a2e] dark:text-slate-100">
				<Nav
					entries={state.entries}
					active={active}
				/>
				<section class="flex min-w-0 flex-1 flex-col overflow-hidden">
					<header class="shrink-0 flex items-center justify-between border-b border-slate-900/10 bg-[#f8fbf9]/80 px-5 py-3 dark:border-white/10 dark:bg-white/5">
						<div>
							<p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{active.title}</p>
							<h2 class="text-lg font-semibold text-slate-950 dark:text-white">{active.name}</h2>
						</div>
						<Button to={`/story/${active.id}?canvas=1`} tone="neutral" icon="i-lucide-maximize-2">
							Canvas
						</Button>
					</header>
					<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
						<StoryView entry={active} args={args} root={captureStoryRoot} fill />
					</div>
					<section data-stories-args="true" class="shrink-0 border-t border-slate-900/10 p-5 dark:border-white/10">
						<h3 class="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Args</h3>
						<Panel variant="solid" padding="sm" clip>
							<pre class="max-h-48 overflow-auto text-xs text-slate-600 dark:text-slate-300">{stringify(args)}</pre>
						</Panel>
					</section>
				</section>
				<Controls
					entry={active}
					args={args}
					drafts={state.drafts}
					errors={state.errors}
				/>
			</main>
		)
	}
}

App.attrs = { class: 'h-full overflow-hidden bg-[#edf4f3] dark:bg-[#0e1a2e]' }

if (import.meta.hot) import.meta.hot.accept(() => location.reload())

const root = document.getElementById('root')
if (root) render(<App />, root)
