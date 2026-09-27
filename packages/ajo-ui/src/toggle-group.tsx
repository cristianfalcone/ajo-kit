import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { listen, roving, selection } from 'ajo-cloves'
import { context } from 'ajo/context'
import { type Direction, DirectionContext } from './direction'
import { flag, rootAttrs } from './shared'
import type { FixedArgs, OmitArg } from './utils'
import { Toggle, type ToggleArgs } from './toggle'

/** Selection cardinality of a toggle group. */
export type ToggleGroupType = 'multiple' | 'single'
/** Layout and keyboard-navigation axis of a toggle group. */
export type ToggleGroupOrientation = 'horizontal' | 'vertical'

type ToggleGroupSharedArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'defaultValue' | 'dir' | 'type' | 'value'> & {
	/** Text direction for horizontal arrow-key navigation. Defaults to the nearest DirectionProvider. */
	dir?: Direction
	/** Disable every item in the group. */
	disabled?: boolean
	/** Allow arrow-key focus to wrap at the ends. */
	loop?: boolean
	/** Layout orientation. */
	orientation?: ToggleGroupOrientation
}>

/** Props for a toggle group that selects at most one value. */
export type ToggleGroupSingleArgs = ToggleGroupSharedArgs & {
	type?: 'single'
	/** Controlled selected value. */
	value?: string
	/** Initial selected value for uncontrolled usage. */
	defaultValue?: string
	/** Called whenever the selected value changes. */
	onValueChange?: (value: string, event: Event) => void
}

/** Props for a toggle group that selects multiple values. */
export type ToggleGroupMultipleArgs = ToggleGroupSharedArgs & {
	type: 'multiple'
	/** Controlled selected values. */
	value?: string[]
	/** Initial selected values for uncontrolled usage. */
	defaultValue?: string[]
	/** Called whenever the selected values change. */
	onValueChange?: (value: string[], event: Event) => void
}

/** Props accepted by either single- or multiple-selection toggle groups. */
export type ToggleGroupArgs = ToggleGroupSingleArgs | ToggleGroupMultipleArgs

/** Props for a toggle button whose pressed state belongs to its group. */
export type ToggleGroupItemArgs = OmitArg<ToggleArgs, 'defaultPressed' | 'onPressedChange' | 'pressed'> & {
	/** Item value used by the parent toggle group. */
	value: string
} & FixedArgs<'defaultPressed' | 'onPressedChange' | 'pressed'>

/** State exposed to descendant toggle-group items. */
export type ToggleGroupContextValue = {
	disabled?: boolean
	orientation: ToggleGroupOrientation
	pressed: (value: string) => boolean
	toggle: (value: string, event: Event) => void
	type: ToggleGroupType
}

type ToggleGroupRootArgs = ToggleGroupArgs & Required<Pick<ToggleGroupSharedArgs, 'dir' | 'orientation'>>

/** Composition context exposing ToggleGroup state to descendant items. */
export const ToggleGroupContext = context<ToggleGroupContextValue | null>(null)

const selected = (type: ToggleGroupType, value: string | string[] | undefined) =>
	type === 'multiple' ? value as string[] | undefined : value ? [value as string] : []

const isButton = (value: EventTarget | null): value is HTMLButtonElement =>
	value instanceof HTMLButtonElement && value.dataset.slot === 'toggle-group-item'

const focusableItems = (root: HTMLElement) =>
	Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-slot="toggle-group-item"]'))
		.filter(button => !button.disabled)

const ToggleGroupRoot: Stateful<ToggleGroupRootArgs> = function* ({ defaultValue, type: initialType = 'single' }) {
	let dir: Direction = 'ltr'
	let disabled = false
	let loop = true
	let onValueChange: ToggleGroupRootArgs['onValueChange']
	let orientation: ToggleGroupOrientation = 'horizontal'
	let type: ToggleGroupType = initialType
	const sel = selection(this, {
		multiple: () => type === 'multiple',
		fallback: selected(initialType, defaultValue),
		onChange: (next, event) => {
			if (type === 'multiple') {
				(onValueChange as ((value: string[], event: Event) => void) | undefined)?.(next, event as Event)
			} else {
				(onValueChange as ((value: string, event: Event) => void) | undefined)?.(next[0] ?? '', event as Event)
			}
		},
	})

	const pressed = (value: string) =>
		sel.has(value)

	const change = (value: string, event: Event) => {
		if (disabled) return
		sel.toggle(value, event)
	}

	const nav = roving(this, {
		items: () => focusableItems(this),
		orientation: () => orientation,
		dir: () => dir,
		loop: () => loop,
		onMove: target => target.focus(),
	})

	listen(this, 'keydown', (event: KeyboardEvent) => {
		if (!isButton(event.target)) return
		// Inside a Toolbar the group's items join the toolbar's roving instead
		// (Base UI model): one tab stop, arrows traverse into and out of the
		// group without double-roving. The toolbar must be within the group's
		// own layer: a group inside popover/dialog content that is a DOM
		// descendant of a toolbar keeps its own roving (the toolbar's control
		// row excludes it).
		if (this.closest('[role="toolbar"], [popover], dialog')?.matches('[role="toolbar"]')) return
		nav.handle(event)
	})

	for (const args of this) {
		type = args.type ?? 'single'
		dir = args.dir
		orientation = args.orientation
		disabled = Boolean(args.disabled)
		loop = args.loop !== false
		onValueChange = args.onValueChange
		sel.sync(args.value == null ? undefined : selected(type, args.value))

		ToggleGroupContext({
			disabled,
			orientation,
			pressed,
			toggle: change,
			type,
		})

		yield <>{args.children}</>
	}
}


/** Unstyled toggle group with selection state and roving keyboard focus. */
const ToggleGroup: Stateless<ToggleGroupArgs> = ({
	dir,
	orientation = 'horizontal',
	role = 'group',
	...args
}) => {
	const disabled = flag(args.disabled)

	return (
		<ToggleGroupRoot
			{...rootAttrs(args, ['defaultValue', 'disabled', 'loop', 'onValueChange', 'type', 'value'])}
			dir={dir ?? DirectionContext()}
			orientation={orientation}
			attr:aria-disabled={disabled}
			attr:data-disabled={disabled}
			attr:data-orientation={orientation}
			attr:data-slot="toggle-group"
			attr:dir={dir}
			attr:role={role}
		/>
	)
}

/** Unstyled toggle group item wired to the nearest group. */
const ToggleGroupItem: Stateless<ToggleGroupItemArgs> = ({
	disabled,
	value,
	...attrs
}) => {
	const group = ToggleGroupContext()
	const disabledFlag = Boolean(disabled ?? group?.disabled)
	const pressed = group?.pressed(value) ?? false

	return (
		<Toggle
			{...attrs}
			data-orientation={group?.orientation ?? 'horizontal'}
			data-slot="toggle-group-item"
			disabled={disabledFlag}
			pressed={pressed}
			value={value}
			onPressedChange={(_pressed, event) => group?.toggle(value, event)}
		/>
	)
}

export { ToggleGroup, ToggleGroupItem }
