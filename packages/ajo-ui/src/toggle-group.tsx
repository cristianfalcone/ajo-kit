import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { listen, roving, selection, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import type { FixedArgs, OmitArg } from './utils'
import { flag, strings } from './utils'
import { Toggle, type ToggleArgs } from './toggle'

export type ToggleGroupType = 'multiple' | 'single'
export type ToggleGroupOrientation = 'horizontal' | 'vertical'

type ToggleGroupSharedArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'defaultValue' | 'type' | 'value'> & {
	/** Disable every item in the group. */
	disabled?: boolean
	/** Allow arrow-key focus to wrap at the ends. */
	loop?: boolean
	/** Layout orientation. */
	orientation?: ToggleGroupOrientation
	/** Shared item size marker. */
	size?: string
	/** Spacing marker shared with items. */
	spacing?: number
	/** Shared item variant marker. */
	variant?: string
}>

export type ToggleGroupSingleArgs = ToggleGroupSharedArgs & {
	type?: 'single'
	/** Controlled selected value. */
	value?: string
	/** Initial selected value for uncontrolled usage. */
	defaultValue?: string
	/** Called whenever the selected value changes. */
	onValueChange?: (value: string, event: Event) => void
}

export type ToggleGroupMultipleArgs = ToggleGroupSharedArgs & {
	type: 'multiple'
	/** Controlled selected values. */
	value?: string[]
	/** Initial selected values for uncontrolled usage. */
	defaultValue?: string[]
	/** Called whenever the selected values change. */
	onValueChange?: (value: string[], event: Event) => void
}

export type ToggleGroupArgs = ToggleGroupSingleArgs | ToggleGroupMultipleArgs

export type ToggleGroupItemArgs = OmitArg<ToggleArgs, 'defaultPressed' | 'onPressedChange' | 'pressed'> & {
	/** Item value used by the parent toggle group. */
	value: string
	/** Item size marker. */
	size?: string
	/** Item variant marker. */
	variant?: string
} & FixedArgs<'defaultPressed' | 'onPressedChange' | 'pressed'>

export type ToggleGroupContextValue = {
	disabled?: boolean
	orientation: ToggleGroupOrientation
	pressed: (value: string) => boolean
	size?: string
	spacing: number
	toggle: (value: string, pressed: boolean, event: Event) => void
	type: ToggleGroupType
	variant?: string
}

type ToggleGroupRootArgs = WithChildren<{
	defaultValue?: string | string[]
	disabled?: boolean
	loop?: boolean
	onValueChange?: ((value: string, event: Event) => void) | ((value: string[], event: Event) => void)
	orientation: ToggleGroupOrientation
	size?: string
	spacing: number
	type: ToggleGroupType
	value?: string | string[]
	variant?: string
}>

/** Composition context exposing ToggleGroup state and styling markers to descendant items. */
export const ToggleGroupContext = context<ToggleGroupContextValue | null>(null)

const selected = (type: ToggleGroupType, value: unknown) =>
	type === 'multiple'
		? strings(value)
		: value == null || value === '' ? [] : [String(value)]

const isButton = (value: EventTarget | null): value is HTMLButtonElement =>
	value instanceof HTMLButtonElement && value.dataset.slot === 'toggle-group-item'

const focusableItems = (root: HTMLElement) =>
	Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-slot="toggle-group-item"]'))
		.filter(button => !button.disabled)

const ToggleGroupRoot: Stateful<ToggleGroupRootArgs> = function* ({ defaultValue, type: initialType }) {
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

	const change = (value: string, _nextPressed: boolean, event: Event) => {
		if (disabled) return
		sel.toggle(value, event)
	}

	const nav = roving(this, {
		items: () => focusableItems(this),
		orientation: () => orientation,
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
		type = args.type
		orientation = args.orientation
		disabled = Boolean(args.disabled)
		loop = args.loop !== false
		onValueChange = args.onValueChange
		sel.sync(args.value != null ? selected(type, args.value) : undefined)

		ToggleGroupContext({
			disabled,
			orientation,
			pressed,
			size: args.size,
			spacing: args.spacing,
			toggle: change,
			type,
			variant: args.variant,
		})

		yield <>{args.children}</>
	}
}


/** Unstyled toggle group with selection state and roving keyboard focus. */
const ToggleGroup: Stateless<ToggleGroupArgs> = ({
	children,
	defaultValue,
	disabled,
	loop = true,
	onValueChange,
	orientation = 'horizontal',
	role = 'group',
	size,
	spacing = 2,
	type = 'single',
	value,
	variant,
	...attrs
}) => {
	const disabledFlag = Boolean(disabled)

	return (
		<ToggleGroupRoot
			{...rootAttrs(attrs)}
			defaultValue={defaultValue}
			disabled={disabledFlag}
			loop={loop}
			onValueChange={onValueChange}
			orientation={orientation}
			size={size}
			spacing={spacing}
			type={type}
			value={value}
			variant={variant}
			attr:aria-disabled={flag(disabledFlag)}
			attr:aria-orientation={orientation}
			attr:data-disabled={flag(disabledFlag)}
			attr:data-orientation={orientation}
			attr:data-size={size}
			attr:data-slot="toggle-group"
			attr:data-spacing={spacing}
			attr:data-variant={variant}
			attr:role={role}
		>
			{children}
		</ToggleGroupRoot>
	)
}

/** Unstyled toggle group item wired to the nearest group. */
const ToggleGroupItem: Stateless<ToggleGroupItemArgs> = ({
	disabled,
	size,
	value,
	variant,
	...attrs
}) => {
	const group = ToggleGroupContext()
	const itemValue = String(value)
	const itemSize = size ?? group?.size
	const itemVariant = variant ?? group?.variant
	const disabledFlag = Boolean(disabled ?? group?.disabled)
	const pressed = group?.pressed(itemValue) ?? false

	return (
		<Toggle
			{...attrs}
			data-orientation={group?.orientation ?? 'horizontal'}
			data-size={itemSize}
			data-slot="toggle-group-item"
			data-spacing={group?.spacing ?? 2}
			data-variant={itemVariant}
			disabled={disabledFlag}
			pressed={pressed}
			value={itemValue}
			onPressedChange={(next, event) => group?.toggle(itemValue, next, event)}
		/>
	)
}

export { ToggleGroup, ToggleGroupItem }
