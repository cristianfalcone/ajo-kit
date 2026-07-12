import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, controlled, dom, id, listen, overflow, roving, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { useDirection } from './direction'
import type { FixedArgs, OmitArg } from './utils'

export type TabsOrientation = 'horizontal' | 'vertical'
export type TabsActivationMode = 'automatic' | 'manual'

export type TabsArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'defaultValue' | 'dir' | 'onchange'> & {
	/** Controlled selected tab value. */
	value?: string
	/** Initial selected tab value for uncontrolled usage. */
	defaultValue?: string
	/** Called whenever the selected tab changes. */
	onValueChange?: (value: string, event?: Event) => void
	/** Tab activation mode. Automatic follows focus; manual waits for Enter/Space or click. */
	activationMode?: TabsActivationMode
	/** Text direction for horizontal arrow-key navigation. Defaults to the nearest DirectionProvider. */
	dir?: 'ltr' | 'rtl'
	/** Allow arrow-key focus to wrap at the ends. */
	loop?: boolean
	/** Tablist orientation. */
	orientation?: TabsOrientation
}> & FixedArgs<'onchange'>

export type TabsListArgs = WithChildren<IntrinsicElements['div']>

export type TabsTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	/** Tab value controlled by this trigger. */
	value: string
}>

export type TabsContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Tab value that owns this panel. */
	value: string
	/** Keep the panel mounted while inactive. */
	forceMount?: boolean
}>

type TabsRootArgs = WithChildren<{
	activationMode: TabsActivationMode
	defaultValue?: string
	dir: 'ltr' | 'rtl'
	loop: boolean
	onValueChange?: (value: string, event?: Event) => void
	orientation: TabsOrientation
	value?: string
}>

type TabsContextValue = {
	activationMode: TabsActivationMode
	contentId: (value: string) => string
	dir: 'ltr' | 'rtl'
	loop: boolean
	orientation: TabsOrientation
	selected: (value: string) => boolean
	setList: (element: HTMLElement | null) => void
	setValue: (value: string, event?: Event) => void
	triggerId: (value: string) => string
	value: string
}

const TabsContext = context<TabsContextValue | null>(null)

const state = (active: boolean) => active ? 'active' : 'inactive'

const tabs = (root: HTMLElement) =>
	Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-slot="tabs-trigger"]'))
		.filter(button => !button.disabled && button.offsetParent !== null)

const TabsRoot: Stateful<TabsRootArgs> = function* ({ defaultValue, value }) {
	const rootId = id('tabs')
	let activationMode: TabsActivationMode = 'automatic'
	let dir: 'ltr' | 'rtl' = 'ltr'
	let loop = true
	let onValueChange: TabsRootArgs['onValueChange']
	let orientation: TabsOrientation = 'horizontal'
	const state = controlled<string>(this, {
		fallback: String(value ?? defaultValue ?? ''),
		onChange: (next, event) => onValueChange?.(next, event),
	})

	const triggerId = (value: string) => `${rootId}-trigger-${encodeURIComponent(value)}`
	const contentId = (value: string) => `${rootId}-content-${encodeURIComponent(value)}`
	const selected = (value: string) => state.value === value

	const setValue = (next: string, event?: Event) => {
		if (!next || next === state.value) return
		state.set(next, event)
	}

	const ensureValue = () => {
		if (state.value || state.controlled || !dom(this)) return
		const first = tabs(this)[0]
		if (first?.value) state.init(first.value)
	}

	const nav = roving(this, {
		items: () => tabs(this),
		orientation: () => orientation,
		dir: () => dir,
		loop: () => loop,
		onMove: (target, event) => {
			target.focus()
			target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
			if (activationMode === 'automatic') setValue(String((target as HTMLButtonElement).value), event)
		},
	})

	// Overflow stamps on the tablist so themes can scroll it and fade the
	// overflowing edges (data-overflow-x/-y pair with the mask preflight).
	let list: HTMLElement | null = null
	const edges = overflow(this, { target: () => list })
	const setList = (element: HTMLElement | null) => {
		list = element
		edges.sync()
	}

	listen(this, 'keydown', (event: KeyboardEvent) => {
		const target = event.target as HTMLElement | null
		if (!target?.matches('button[data-slot="tabs-trigger"]')) return

		if (nav.handle(event)) return

		if (activationMode === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault()
			setValue(String((target as HTMLButtonElement).value), event)
		}
	})

	for (const args of this) {
		activationMode = args.activationMode
		dir = args.dir
		loop = args.loop
		onValueChange = args.onValueChange
		orientation = args.orientation
		state.sync(args.value != null ? String(args.value) : undefined)

		TabsContext({
			activationMode,
			contentId,
			dir,
			loop,
			orientation,
			selected,
			setList,
			setValue,
			triggerId,
			value: state.value,
		})

		edges.sync()
		queueMicrotask(ensureValue)
		yield <>{args.children}</>
	}
}


/** Unstyled root provider for tab state. */
const Tabs: Stateless<TabsArgs> = ({
	activationMode = 'automatic',
	children,
	defaultValue,
	dir,
	loop = true,
	onValueChange,
	orientation = 'horizontal',
	value,
	...attrs
}) => {
	const resolvedDir = dir ?? useDirection()

	return (
		<TabsRoot
			{...rootAttrs(attrs)}
			activationMode={activationMode}
			defaultValue={defaultValue}
			dir={resolvedDir}
			loop={loop}
			onValueChange={onValueChange}
			orientation={orientation}
			value={value}
			attr:data-orientation={orientation}
			attr:data-slot="tabs"
			attr:dir={resolvedDir}
		>
			{children}
		</TabsRoot>
	)
}

/** Unstyled container for tab triggers. */
const TabsList: Stateless<TabsListArgs> = ({
	children,
	ref,
	role = 'tablist',
	...attrs
}) => {
	const context = TabsContext()

	return (
		<div
			{...attrs}
			aria-orientation={context?.orientation}
			data-orientation={context?.orientation}
			data-slot="tabs-list"
			ref={(element: HTMLDivElement | null) => {
				context?.setList(element)
				callRef(ref, element)
			}}
			role={role}
		>
			{children}
		</div>
	)
}

/** Unstyled button that activates a tab panel. */
const TabsTrigger: Stateless<TabsTriggerArgs> = ({
	children,
	disabled,
	id,
	'set:onclick': onClick,
	'set:onfocus': onFocus,
	type = 'button',
	value,
	...attrs
}) => {
	const context = TabsContext()
	const tabValue = String(value)
	const active = Boolean(context?.selected(tabValue))
	const disabledFlag = Boolean(disabled)
	const triggerId = id ?? context?.triggerId(tabValue)

	return (
		<button
			{...attrs}
			aria-controls={context?.contentId(tabValue)}
			aria-selected={active ? 'true' : 'false'}
			data-slot="tabs-trigger"
			data-state={state(active)}
			data-value={tabValue}
			disabled={disabledFlag}
			id={triggerId}
			role="tab"
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented || disabledFlag) return
				context?.setValue(tabValue, event)
				// A partially visible tab in an overflowing list scrolls fully
				// into view on activation; scroll-padding keeps it clear of
				// the theme's edge fade. No-op while the list fits.
				;(event.currentTarget as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest' })
			}}
			set:onfocus={(event: FocusEvent) => {
				callHandler(onFocus, event)
				if (event.defaultPrevented || disabledFlag || active || context?.activationMode !== 'automatic') return
				context?.setValue(tabValue, event)
			}}
			tabindex={active ? 0 : -1}
			type={type}
			value={tabValue}
		>
			{children}
		</button>
	)
}

/** Unstyled panel displayed by its matching tab trigger. */
const TabsContent: Stateless<TabsContentArgs> = ({
	children,
	forceMount,
	value,
	...attrs
}) => {
	const context = TabsContext()
	const tabValue = String(value)
	const active = Boolean(context?.selected(tabValue))

	if (!active && !forceMount) return null

	return (
		<div
			{...attrs}
			aria-labelledby={context?.triggerId(tabValue)}
			data-slot="tabs-content"
			data-state={state(active)}
			data-value={tabValue}
			hidden={active ? undefined : true}
			id={context?.contentId(tabValue)}
			role="tabpanel"
			tabindex={0}
		>
			{children}
		</div>
	)
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
