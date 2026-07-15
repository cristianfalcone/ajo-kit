/** @jsxImportSource ajo */
import { render, type Children, type Stateful, type Stateless } from 'ajo'
import { context } from 'ajo/context'
import { scheme, storage } from 'ajo-cloves'
import clsx from 'clsx'
import Button from 'ajo-ui-playa/button'
import { Card, CardContent } from 'ajo-ui-playa/card'
import Checkbox from 'ajo-ui-playa/checkbox'
import Chip from 'ajo-ui-playa/chip'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from 'ajo-ui-playa/collapsible'
import {
	Field as UiField,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from 'ajo-ui-playa/field'
import Input from 'ajo-ui-playa/input'
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from 'ajo-ui-playa/resizable'
import ScrollArea from 'ajo-ui-playa/scroll-area'
import { Select, SelectContent, SelectItem, SelectList, SelectTrigger, SelectValue } from 'ajo-ui-playa/select'
import Slider from 'ajo-ui-playa/slider'
import Textarea from 'ajo-ui-playa/textarea'
import { ToggleGroup, ToggleGroupItem } from 'ajo-ui-playa/toggle-group'
import 'virtual:uno.css'

export type Control =
	| 'boolean'
	| 'color'
	| 'multi-select'
	| 'number'
	| 'object'
	| 'radio'
	| 'range'
	| 'select'
	| 'text'

export type ArgType = {
	/** Control kind. `false` hides an otherwise inferable control the story does not consume. */
	control?: Control | false
	description?: string
	label?: string
	max?: number
	min?: number
	options?: readonly unknown[]
	step?: number
}

/** Story args are loosely typed so renders can spread them straight into components. */
export type Args = Record<string, any>

type ComponentLike = (args: Args) => Children

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
	args?: Args
	argTypes?: Record<string, ArgType>
	parameters?: Parameters
	render?: (args: Args, context: StoryContext) => Children
}

export type Story<C = ComponentLike> = {
	component?: C
	name?: string
	args?: Args
	argTypes?: Record<string, ArgType>
	parameters?: Parameters
	render?: (args: Args, context: StoryContext) => Children
	play?: (context: PlayContext) => void | Promise<void>
}

export type StoryContext = {
	id: string
	name: string
	title: string
	/** Writes one live arg so controlled stories reflect component state back into the controls panel. */
	setArg: (name: string, value: unknown) => void
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

type StorySetArgMessage = {
	id: string
	name: string
	source: 'ajo-stories'
	type: 'set-arg'
	value: unknown
}

type StoryRenderMessage = {
	args: Record<string, unknown>
	id: string
	source: 'ajo-stories'
	theme: ThemeMode
	type: 'render-story'
}

type StoryReadyMessage = {
	id?: string
	source: 'ajo-stories'
	type: 'story-ready'
}

type StoryFrameMessage = StoryReadyMessage | StoryRenderMessage | StorySetArgMessage

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
	search: string
	theme: ThemeMode
}

type ThemeMode = 'system' | 'light' | 'dark'

type ArgHandlers = {
	resetArgs: () => void
	setArg: (name: string, value: unknown) => void
	setObject: (name: string, value: string) => void
}

type StoriesApi = ArgHandlers & {
	cycleTheme: () => void
	navigate: (id: string) => void
	setSearch: (value: string) => void
	theme: ThemeMode
}

declare global {
	var __AJO_STORIES_INDEX__: StorySummary[] | undefined
}

const modules = import.meta.glob<StoryModule>('./*.stories.tsx')
const searchKey = 'search'
const themeKey = 'theme.v1'
const StoriesContext = context<StoriesApi | null>(null)

const stories = () => {
	const api = StoriesContext()
	if (!api) throw new Error('Stories context is missing')
	return api
}

const isThemeMode = (value: unknown): value is ThemeMode =>
	value === 'system' || value === 'light' || value === 'dark'

const readTheme = (stored = 'system'): ThemeMode => {
	const query = new URLSearchParams(location.search).get('theme')
	if (isThemeMode(query)) return query

	if (isThemeMode(stored)) return stored

	return 'system'
}

const query = (params: URLSearchParams) => {
	const value = params.toString()
	return value ? `?${value}` : ''
}

const readSearch = () => new URLSearchParams(location.search).get(searchKey) ?? ''

const storyHref = (id: string, search: string, options: { args?: Record<string, unknown>; canvas?: boolean; preview?: boolean; theme?: ThemeMode } = {}) => {
	const current = new URLSearchParams(location.search)
	const params = new URLSearchParams()
	const theme = options.theme ?? current.get('theme')
	const filter = search.trim()

	if (isThemeMode(theme)) params.set('theme', theme)
	if (filter) params.set(searchKey, filter)
	if (options.canvas) params.set('canvas', '1')
	if (options.preview) params.set('preview', '1')
	if (options.args && Object.keys(options.args).length) params.set('args', JSON.stringify(options.args))

	return `/story/${id}${query(params)}`
}

const replaceSearchQuery = (search: string) => {
	const params = new URLSearchParams(location.search)
	const filter = search.trim()

	if (filter) params.set(searchKey, filter)
	else params.delete(searchKey)

	const next = `${location.pathname}${query(params)}${location.hash}`
	const current = `${location.pathname}${location.search}${location.hash}`
	if (next !== current) history.replaceState(null, '', next)
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value)

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

const plain = (value: unknown) => Boolean(value) && typeof value === 'object' &&
	(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)

const infer = (name: string, value: unknown): Control | undefined => {
	if (typeof value === 'boolean') return 'boolean'
	if (typeof value === 'number') return 'number'
	if (typeof value === 'string') return 'text'
	if (name === 'children') return undefined
	if (Array.isArray(value) || plain(value)) return 'object'
	return undefined
}

type ControlField = [name: string, arg: ArgType, control: Control]

/** Declared argTypes first, then every remaining arg with an inferable control. */
const controlFields = (entry: StoryEntry, args: Record<string, unknown>): ControlField[] => {
	const fields: ControlField[] = []

	for (const [name, arg] of Object.entries(entry.argTypes)) {
		if (arg.control === false) continue
		fields.push([name, arg, arg.control ?? (arg.options ? 'select' : infer(name, args[name]) ?? 'text')])
	}

	for (const [name, value] of Object.entries(args)) {
		if (name in entry.argTypes) continue
		const control = infer(name, value)
		if (control) fields.push([name, {}, control])
	}

	return fields
}

const read = (value: string) => {
	try {
		return JSON.parse(value) as unknown
	} catch {
		return value
	}
}

const input = (event: Event) => event.currentTarget as HTMLInputElement
const textarea = (event: Event) => event.currentTarget as HTMLTextAreaElement

const applyTheme = (mode: ThemeMode, dark: boolean) => {
	document.documentElement.classList.toggle('dark', mode === 'dark' || (mode === 'system' && dark))
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

const storyOverrides = (entry: StoryEntry, state: State) => ({
	...parseArgs(),
	...(state.live.get(entry.id) ?? {}),
})

const storyKey = (entry: StoryEntry, args: Record<string, unknown>) => `${entry.id}:${stringify(args)}`

const embedded = () => typeof window !== 'undefined' && window.parent !== window

const storyFrameMessage = (value: unknown): value is StoryFrameMessage => {
	if (!isRecord(value) || value.source !== 'ajo-stories') return false

	if (value.type === 'set-arg') {
		return typeof value.id === 'string' && typeof value.name === 'string'
	}

	if (value.type === 'render-story') {
		return typeof value.id === 'string' && isRecord(value.args) && isThemeMode(value.theme)
	}

	if (value.type === 'story-ready') {
		return value.id === undefined || typeof value.id === 'string'
	}

	return false
}

const storyRenderMessage = (
	id: string,
	args: Record<string, unknown>,
	theme: ThemeMode,
): StoryRenderMessage => ({
	args,
	id,
	source: 'ajo-stories',
	theme,
	type: 'render-story',
})

const postStoryRender = (
	target: Window | null | undefined,
	id: string,
	args: Record<string, unknown>,
	theme: ThemeMode,
) => {
	target?.postMessage(storyRenderMessage(id, args, theme), location.origin)
}

const postStoryFrameRender = (
	frame: HTMLIFrameElement | null,
	id: string,
	args: Record<string, unknown>,
	theme: ThemeMode,
) => postStoryRender(frame?.contentWindow, id, args, theme)

const postStoryArg = (id: string, name: string, value: unknown) => {
	if (!embedded()) return
	globalThis.parent.postMessage({ id, name, source: 'ajo-stories', type: 'set-arg', value }, location.origin)
}

const postStoryReady = (id?: string) => {
	if (!embedded()) return
	globalThis.parent.postMessage({ id, source: 'ajo-stories', type: 'story-ready' }, location.origin)
}

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

const renderStory = (entry: StoryEntry, args: Record<string, unknown>, setArg: StoryContext['setArg']) => {
	const context: StoryContext = { id: entry.id, name: entry.name, title: entry.title, setArg }
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
			<Card data-stories-error="true" size="sm">
				<CardContent>
					<p class="text-sm font-medium text-danger">No story selected.</p>
				</CardContent>
			</Card>
		)
	}

	const { setArg } = stories()
	const layout = entry.parameters.layout ?? 'padded'
	const height = fill ? 'min-h-full' : 'min-h-[18rem]'
	const classes = layout === 'fullscreen'
		? fill ? 'min-h-full' : 'min-h-screen'
		: layout === 'centered'
			? `${height} flex items-center justify-center p-8`
			: `${height} p-8`

	try {
		return (
			<div key={entry.id} ref={root} data-story-root={entry.id} class={classes}>
				{renderStory(entry, args, setArg)}
			</div>
		)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return (
			<Card data-stories-error="true" size="sm">
				<CardContent>
					<p class="text-sm font-medium text-danger">Story render failed</p>
					<pre class="mt-2 whitespace-pre-wrap text-xs">{message}</pre>
				</CardContent>
			</Card>
		)
	}
}

const StoryFrame: Stateful<{
	entry: StoryEntry
	overrides: Record<string, unknown>
	theme: ThemeMode
}> = function* ({ entry, overrides, theme }) {
	const src = storyHref(entry.id, '', { args: overrides, canvas: true, preview: true, theme })
	let frame: HTMLIFrameElement | null = null
	let current = { id: entry.id, overrides, theme }
	const send = () => postStoryFrameRender(frame, current.id, current.overrides, current.theme)

	for (const next of this) {
		current = { id: next.entry.id, overrides: next.overrides, theme: next.theme }
		queueMicrotask(send)

		yield (
			<iframe
				ref={element => {
					frame = element
					if (frame) queueMicrotask(send)
				}}
				class="block h-full w-full border-0 bg-background"
				data-story-frame={next.entry.id}
				src={src}
				set:onload={send}
				title={`${next.entry.title} / ${next.entry.name}`}
			/>
		)
	}
}

StoryFrame.attrs = { class: 'block h-full w-full' }

const ArgControl: Stateless<{
	arg: ArgType
	control: Control
	draft?: string
	error?: string
	name: string
	value: unknown
}> = ({
	arg,
	control,
	draft,
	error,
	name,
	value,
}) => {
	const title = arg.label ?? label(name)
	const description = arg.description
	const id = `arg-${slug(name)}`
	const { setArg, setObject } = stories()

	if (control === 'boolean') {
		return (
			<UiField orientation="horizontal">
				<Checkbox
					id={id}
					name={name}
					set:checked={Boolean(value)}
					set:onchange={(event: Event) => setArg(name, input(event).checked)}
				/>
				<FieldContent>
					<FieldLabel for={id}>{title}</FieldLabel>
					{description && <FieldDescription>{description}</FieldDescription>}
				</FieldContent>
			</UiField>
		)
	}

	if (control === 'text') {
		return (
			<UiField>
				<FieldLabel for={id}>{title}</FieldLabel>
				<Input
					id={id}
					set:value={String(value ?? '')}
					set:oninput={(event: Event) => setArg(name, input(event).value)}
				/>
				{description && <FieldDescription>{description}</FieldDescription>}
			</UiField>
		)
	}

	if (control === 'radio') {
		return (
			<UiField>
				<FieldLabel>{title}</FieldLabel>
				<ToggleGroup
					type="single"
					value={option(value)}
					size="sm"
					variant="outline"
					class="flex-wrap"
					aria-label={title}
					onValueChange={next => {
						if (next) setArg(name, read(next))
					}}
				>
					{(arg.options ?? []).map(item => (
						<ToggleGroupItem key={option(item)} value={option(item)}>
							{String(item)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				{description && <FieldDescription>{description}</FieldDescription>}
			</UiField>
		)
	}

	if (control === 'multi-select') {
		const current = Array.isArray(value) ? value.map(String) : []

		return (
			<UiField>
				<FieldLabel>{title}</FieldLabel>
				<ToggleGroup
					type="multiple"
					value={current}
					size="sm"
					variant="outline"
					class="flex-wrap"
					aria-label={title}
					onValueChange={next => setArg(name, next)}
				>
					{(arg.options ?? []).map(item => (
						<ToggleGroupItem key={String(item)} value={String(item)}>
							{String(item)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				{description && <FieldDescription>{description}</FieldDescription>}
			</UiField>
		)
	}

	if (control === 'select') {
		return (
			<UiField>
				<FieldLabel for={id}>{title}</FieldLabel>
				<Select
					class="w-full"
					value={option(value)}
					onValueChange={next => setArg(name, read(next ?? ''))}
				>
					<SelectTrigger id={id} class="w-full" aria-label={title}>
						<SelectValue placeholder={title} />
					</SelectTrigger>
					<SelectContent>
						<SelectList>
							{(arg.options ?? []).map(item => (
								<SelectItem key={option(item)} value={option(item)}>{String(item)}</SelectItem>
							))}
						</SelectList>
					</SelectContent>
				</Select>
				{description && <FieldDescription>{description}</FieldDescription>}
			</UiField>
		)
	}

	if (control === 'number') {
		return (
			<UiField>
				<FieldLabel for={id}>{title}</FieldLabel>
				<Input
					id={id}
					type="number"
					min={arg.min}
					max={arg.max}
					step={arg.step}
					set:value={String(value ?? 0)}
					set:oninput={(event: Event) => setArg(name, Number(input(event).value))}
				/>
				{description && <FieldDescription>{description}</FieldDescription>}
			</UiField>
		)
	}

	if (control === 'range') {
		const current = Number(value ?? arg.min ?? 0)

		return (
			<UiField>
				<FieldLabel for={id}>{title}</FieldLabel>
				<div class="flex items-center gap-3">
					<Slider
						id={id}
						aria-label={title}
						class="flex-1"
						min={arg.min}
						max={arg.max}
						step={arg.step}
						value={[current]}
						onValueChange={next => setArg(name, next[0] ?? current)}
					/>
					<span class="min-w-10 text-right text-xs tabular-nums text-muted-foreground">
						{current}
					</span>
				</div>
				{description && <FieldDescription>{description}</FieldDescription>}
			</UiField>
		)
	}

	if (control === 'color') {
		return (
			<UiField>
				<FieldLabel for={id}>{title}</FieldLabel>
				<Input
					id={id}
					type="color"
					class="h-9 w-full p-1"
					set:value={String(value ?? '#000000')}
					set:oninput={(event: Event) => setArg(name, input(event).value)}
				/>
				{description && <FieldDescription>{description}</FieldDescription>}
			</UiField>
		)
	}

	if (control === 'object') {
		const text = draft ?? stringify(value ?? {})
		return (
			<UiField invalid={Boolean(error)}>
				<FieldLabel for={id}>{title}</FieldLabel>
				<Textarea
					id={id}
					aria-invalid={error ? 'true' : undefined}
					class="min-h-24 font-mono text-xs"
					set:value={text}
					set:oninput={(event: Event) => setObject(name, textarea(event).value)}
				/>
				{error && <FieldError data-stories-error="true">{error}</FieldError>}
				{description && <FieldDescription>{description}</FieldDescription>}
			</UiField>
		)
	}

	return (
		<UiField>
			<FieldLabel for={id}>{title}</FieldLabel>
			<Input
				id={id}
				set:value={String(value ?? '')}
				set:oninput={(event: Event) => setArg(name, input(event).value)}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
		</UiField>
	)
}

const Controls: Stateless<{
	args: Record<string, unknown>
	dirty: boolean
	drafts: Record<string, string>
	entry?: StoryEntry
	errors: Record<string, string>
}> = ({
	args,
	dirty,
	drafts,
	entry,
	errors,
}) => {
	if (!entry) return null

	const { resetArgs } = stories()
	const fields = controlFields(entry, args)

	return (
		<aside class="h-full min-h-0 w-full overflow-y-auto overscroll-contain glass p-4">
			<div class="space-y-6">
				<section>
					<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Story</p>
					<h2 class="mt-1 truncate text-base font-semibold text-foreground">{entry.name}</h2>
					<p class="mt-1 truncate text-xs text-muted-foreground">{entry.id}</p>
					{entry.parameters.docs?.description && (
						<p class="mt-3 text-sm text-muted-foreground">{entry.parameters.docs.description}</p>
					)}
				</section>

				<section>
					<div class="mb-3 flex h-6 items-center justify-between gap-2">
						<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Controls</p>
						{dirty && (
							<Button type="button" variant="ghost" size="xs" data-stories-reset="true" set:onclick={resetArgs}>
								<span class="i-lucide-rotate-ccw size-3.5" />
								Reset
							</Button>
						)}
					</div>
					{fields.length ? (
						<div class="space-y-4">
							{fields.map(([name, arg, control]) => (
								<div key={name}>
									<ArgControl
										name={name}
										arg={arg}
										control={control}
										value={args[name]}
										draft={drafts[name]}
										error={errors[name]}
									/>
								</div>
							))}
						</div>
					) : (
						<p class="text-sm text-muted-foreground">No controls for this story.</p>
					)}
				</section>
			</div>
		</aside>
	)
}

type NavArgs = {
	active?: StoryEntry
	entries: StoryEntry[]
	search: string
}

const Nav: Stateful<NavArgs, 'aside'> = function* () {
	let list: HTMLElement | null = null
	let lastActiveId = ''
	let lastScrollKey = ''
	let openGroups = new Set<string>()
	let scrollVersion = 0

	const scheduleSelectedScroll = (activeId: string | undefined, entriesLength: number) => {
		if (!activeId) return

		const key = `${activeId}:${entriesLength}`
		if (key === lastScrollKey) return

		lastScrollKey = key
		const version = ++scrollVersion

		queueMicrotask(() => {
			if (version !== scrollVersion) return
			requestAnimationFrame(() => {
				if (version !== scrollVersion || !this.isConnected || !list) return
				const selected = Array.from(list.querySelectorAll<HTMLElement>('[data-story-link]'))
					.find(link => link.dataset.storyLink === activeId)

				selected?.scrollIntoView({ block: 'nearest' })
			})
		})
	}

	const setGroupOpen = (title: string, open: boolean) => {
		this.next(() => {
			const next = new Set(openGroups)
			if (open) next.add(title)
			else next.delete(title)
			openGroups = next
		})
	}

	for (const { active, entries, search } of this) {
		const { navigate, setSearch } = stories()
		const matches = visible(entries, search)
		const groups = group(matches)
		const filtering = Boolean(search.trim())

		if (active?.id && active.id !== lastActiveId) {
			lastActiveId = active.id
			openGroups = new Set(openGroups).add(active.title)
		}

		scheduleSelectedScroll(active?.id, entries.length)

		yield (
			<>
				<div class="mb-4 flex items-center justify-between gap-3">
					<h1 class="min-w-0 truncate text-lg font-semibold text-foreground">Ajo Kit UI</h1>
					<div class="flex shrink-0 items-center gap-2">
						<Chip variant="secondary">{matches.length} stories</Chip>
						<ThemeToggle />
					</div>
				</div>
				<div class="mb-4">
					<Input
						aria-label="Search stories"
						placeholder="Search stories"
						class="bg-muted"
						set:value={search}
						set:oninput={(event: Event) => setSearch(input(event).value)}
					/>
				</div>
				<ScrollArea ref={element => list = element} data-stories-list="true" class="min-h-0 flex-1">
					<div class="space-y-2 pb-3 pr-1">
						{groups.map(([title, items]) => {
							const open = filtering || openGroups.has(title)

							return (
								<Collapsible
									key={title}
									open={open}
									onOpenChange={next => {
										if (!filtering) setGroupOpen(title, next)
									}}
									class="group/story-section"
									data-stories-group={title}
								>
									<CollapsibleTrigger
										class="flex h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-accent-foreground"
									>
										<span class="min-w-0 flex-1 truncate">{title}</span>
										<span class="flex shrink-0 items-center gap-1.5">
											<Chip variant="secondary" class="px-1.5 py-0 text-[0.625rem] leading-5">{items.length}</Chip>
											<span aria-hidden="true" class={clsx('i-lucide-chevron-right size-3.5 transition-transform', open && 'rotate-90')} />
										</span>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<div class="ml-2 mt-1 space-y-0.5 border-l border-border/70 pl-2">
											{items.map(item => (
												<a
													key={item.id}
													href={storyHref(item.id, search)}
													data-story-link={item.id}
													class={clsx(
														'block truncate rounded-md px-2 py-1.5 text-sm font-medium',
														active?.id === item.id
															? 'bg-accent text-accent-foreground'
															: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
													)}
													set:onclick={(event: Event) => {
														event.preventDefault()
														navigate(item.id)
													}}
												>
													{item.name}
												</a>
											))}
										</div>
									</CollapsibleContent>
								</Collapsible>
							)
						})}
						{groups.length === 0 && (
							<p class="px-2 py-4 text-sm text-muted-foreground">No stories match this search.</p>
						)}
					</div>
				</ScrollArea>
			</>
		)
	}
}

Nav.is = 'aside'
Nav.attrs = {
	class: 'flex h-full w-full min-w-0 flex-col overflow-hidden glass p-4',
}

const ThemeToggle: Stateless = () => {
	const { cycleTheme, theme } = stories()

	return (
		<Button
			type="button"
			aria-label="Change theme"
			title={`Theme: ${theme}`}
			variant="ghost"
			size="icon"
			set:onclick={cycleTheme}
		>
			<span class={`${themeIcon(theme)} size-4`} />
		</Button>
	)
}

const initialState = (stored: string): State => ({
	entries: [],
	active: undefined,
	live: new Map(),
	drafts: {},
	errors: {},
	message: 'Loading stories...',
	loading: true,
	failure: undefined,
	failureKey: undefined,
	search: readSearch(),
	theme: readTheme(stored),
})

const App: Stateful = function* () {
	const color = scheme(this)
	const saved = storage(this, { key: () => themeKey, fallback: 'system' })
	const state = initialState(saved.value)
	const played = new Set<string>()
	let pendingFrameRender: StoryRenderMessage | undefined
	let renderVersion = 0
	let searchVersion = 0
	let storyRoot: HTMLElement | null = null
	let storedTheme = saved.value

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

	const applyFrameRender = (message: StoryRenderMessage) => {
		if (!state.entries.length) {
			pendingFrameRender = message
			return
		}

		const entry = state.entries.find(item => item.id === message.id)
		if (!entry) return

		state.active = entry
		state.drafts = {}
		state.errors = {}
		state.theme = message.theme
		if (Object.keys(message.args).length) state.live.set(entry.id, message.args)
		else state.live.delete(entry.id)
		clearFailure()
		applyTheme(message.theme, color.dark)
	}

	const sendFrameRender = (target: MessageEventSource | null) => {
		const entry = state.active
		if (!entry || !target || !('postMessage' in target)) return
		postStoryRender(target as Window, entry.id, storyOverrides(entry, state), state.theme)
	}

	const setArg = (name: string, value: unknown) => {
		const id = state.active?.id
		this.next(() => assignArg(name, value))
		if (id) postStoryArg(id, name, value)
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

	const resetArgs = () => {
		this.next(() => {
			const entry = state.active
			if (!entry) return
			state.live.delete(entry.id)
			state.drafts = {}
			state.errors = {}
			clearFailure()
		})
	}

	const setTheme = (mode: ThemeMode) => {
		state.theme = mode
		storedTheme = mode
		saved.set(mode)
		applyTheme(mode, color.dark)
	}

	const cycleTheme = () => setTheme(nextTheme(state.theme))

	const setSearch = (value: string) => {
		const version = ++searchVersion
		this.next(() => state.search = value)

		queueMicrotask(() => {
			if (version !== searchVersion || !this.isConnected) return
			replaceSearchQuery(value)
		})
	}

	const captureStoryRoot = (root: HTMLElement | null) => {
		storyRoot = root
	}

	const syncActive = () => {
		state.active = pick(state.entries)
		state.drafts = {}
		state.errors = {}
		clearFailure()
	}

	const syncLocation = () => {
		state.search = readSearch()
		syncActive()
	}

	const navigate = (id: string) => {
		history.pushState(null, '', storyHref(id, state.search))
		this.next(syncActive)
	}

	const ready = async (version: number, key?: string, preview = false) => {
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
		if (version !== renderVersion) return

		const entry = state.active
		const canvas = storyRoot?.dataset.storyRoot === entry?.id ? storyRoot : null

		if (!entry || !key || preview || state.failureKey === key || played.has(entry.id)) {
			document.documentElement.dataset.ajoReady = 'true'
			return
		}

		try {
			if (entry.story.play && canvas instanceof HTMLElement) {
				// Mark before running so plays fire once per story: replaying on every
				// arg change would loop when a play interacts with setArg-bound state.
				played.add(entry.id)
				await entry.story.play({ id: entry.id, name: entry.name, title: entry.title, canvas, setArg })
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

		if (version === renderVersion) {
			document.documentElement.dataset.ajoReady = 'true'
		}
	}

	globalThis.addEventListener('popstate', () => this.next(syncLocation), { signal: this.signal })
	globalThis.addEventListener('message', event => {
		if (event.origin !== location.origin || !storyFrameMessage(event.data)) return
		if (event.data.type === 'story-ready') {
			sendFrameRender(event.source)
			return
		}
		if (event.data.type === 'render-story') {
			if (!embedded()) return
			this.next(() => applyFrameRender(event.data))
			return
		}
		this.next(() => {
			if (state.active?.id !== event.data.id) return
			assignArg(event.data.name, event.data.value)
		})
	}, { signal: this.signal })
	applyTheme(state.theme, color.dark)

	void loadStories()
		.then(entries => this.next(() => {
			state.entries = entries
			state.active = pick(entries)
			if (pendingFrameRender) {
				applyFrameRender(pendingFrameRender)
				pendingFrameRender = undefined
			}
			state.loading = false
			state.message = entries.length ? '' : 'No stories found in tests/stories.'
			publish(entries)
			queueMicrotask(() => postStoryReady(state.active?.id))
		}))
		.catch(error => this.next(() => {
			state.loading = false
			state.message = error instanceof Error ? error.message : String(error)
			publish([])
		}))

	while (true) {
		// The theme query param only seeds the first paint (readTheme at init);
		// resyncing through it would pin canvas iframes to their creation-time
		// theme, overriding the parent's render-story messages.
		const nextStoredTheme = saved.value
		if (nextStoredTheme !== storedTheme) {
			storedTheme = nextStoredTheme
			state.theme = isThemeMode(nextStoredTheme) ? nextStoredTheme : 'system'
		}

		applyTheme(state.theme, color.dark)

		const active = state.active
		const args = active ? storyArgs(active, state) : {}
		const overrides = active ? storyOverrides(active, state) : {}
		const params = new URLSearchParams(location.search)
		const canvas = params.get('canvas') === '1'
		const preview = params.get('preview') === '1'
		const screenshot = params.get('screenshot') === '1'
		const key = active ? storyKey(active, args) : undefined
		const version = ++renderVersion

		StoriesContext({ cycleTheme, navigate, resetArgs, setArg, setObject, setSearch, theme: state.theme })
		delete document.documentElement.dataset.ajoReady
		if (!state.loading) queueMicrotask(() => void ready(version, key, preview))

		if (state.loading || !active) {
			yield (
				<main class="h-full bg-background p-6 text-foreground">
					<Card size="sm">
						<CardContent>
							{state.message}
						</CardContent>
					</Card>
				</main>
			)
			continue
		}

		if (canvas) {
			yield (
				<main class="h-full overflow-auto overscroll-contain bg-background text-foreground">
					{screenshot && <style>{'*,::before,::after{animation-duration:0.001ms!important;animation-delay:0ms!important;transition-duration:0.001ms!important;scroll-behavior:auto!important}'}</style>}
					<StoryView entry={active} args={args} root={captureStoryRoot} />
					{state.failure && (
						<Card data-stories-error="true" size="sm" class="m-4">
							<CardContent>
								<pre class="whitespace-pre-wrap text-xs text-danger">{state.failure}</pre>
							</CardContent>
						</Card>
					)}
				</main>
			)
			continue
		}

		yield (
			<main class="h-full overflow-hidden bg-background text-foreground">
				<ResizablePanelGroup orientation="horizontal" class="h-full" data-stories-layout="true">
					<ResizablePanel defaultSize={19} minSize={14} maxSize={32} data-stories-panel="nav">
						<Nav
							entries={state.entries}
							active={active}
							search={state.search}
						/>
					</ResizablePanel>
					<ResizableHandle data-stories-resize="nav" />
					<ResizablePanel defaultSize={60} minSize={35} data-stories-panel="story">
						<section class="flex h-full min-w-0 flex-col overflow-hidden">
							<header class="shrink-0 flex items-center justify-between gap-3 border-b glass px-4 py-3">
								<div class="min-w-0">
									<p class="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">{active.title}</p>
									<h2 class="truncate text-lg font-semibold text-foreground">{active.name}</h2>
								</div>
								<Button as="a" href={storyHref(active.id, state.search, { args: overrides, canvas: true, theme: state.theme })} variant="outline" class="shrink-0">
									<span class="i-lucide-maximize-2 size-4" />
									Canvas
								</Button>
							</header>
							<div class="min-h-0 flex-1 overflow-hidden">
								<StoryFrame entry={active} overrides={overrides} theme={state.theme} />
							</div>
							<section data-stories-args="true" class="shrink-0 border-t p-4">
								<h3 class="mb-2 text-sm font-semibold text-foreground">Args</h3>
								<Card size="sm">
									<CardContent>
										<pre class="max-h-48 overflow-auto text-xs text-muted-foreground">{stringify(args)}</pre>
									</CardContent>
								</Card>
							</section>
						</section>
					</ResizablePanel>
					<ResizableHandle data-stories-resize="controls" />
					<ResizablePanel defaultSize={21} minSize={16} maxSize={35} data-stories-panel="controls">
						<Controls
							entry={active}
							args={args}
							dirty={Boolean(Object.keys(state.live.get(active.id) ?? {}).length)}
							drafts={state.drafts}
							errors={state.errors}
						/>
					</ResizablePanel>
				</ResizablePanelGroup>
			</main>
		)
	}
}

App.attrs = { class: 'h-full overflow-hidden bg-background' }

if (import.meta.hot) import.meta.hot.accept(() => location.reload())

const root = document.getElementById('root')
if (root) render(<App />, root)
