import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { selection, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import type { FixedArgs, OmitArg } from './utils'
import { flag, strings } from './utils'
import { Checkbox, type CheckboxArgs } from './checkbox'

/** Arguments for a group that coordinates checkbox values. */
export type CheckboxGroupArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'defaultValue' | 'value'> & {
	/** Controlled checked values. */
	value?: string[]
	/** Initial checked values for uncontrolled usage. */
	defaultValue?: string[]
	/** Called whenever the checked values change. */
	onValueChange?: (value: string[], event: Event) => void
	/** Disable every item in the group. */
	disabled?: boolean
	/** Shared checkbox input name. */
	name?: string
}>

/** Arguments for one Checkbox registered with a CheckboxGroup. */
export type CheckboxGroupItemArgs = OmitArg<CheckboxArgs, 'checked' | 'defaultChecked' | 'onCheckedChange'> & {
	/** Item value used by the parent checkbox group. */
	value: string
} & FixedArgs<'checked' | 'defaultChecked' | 'onCheckedChange'>

type CheckboxGroupContextValue = {
	checked: (value: string) => boolean
	disabled?: boolean
	name?: string
	toggle: (value: string, checked: boolean, event: Event) => void
}

type CheckboxGroupRootArgs = WithChildren<{
	defaultValue?: string[]
	disabled?: boolean
	name?: string
	onValueChange?: (value: string[], event: Event) => void
	value?: string[]
}>

const CheckboxGroupContext = context<CheckboxGroupContextValue | null>(null)

const CheckboxGroupRoot: Stateful<CheckboxGroupRootArgs> = function* ({ defaultValue }) {
	let disabled = false
	let name: string | undefined
	let onValueChange: CheckboxGroupRootArgs['onValueChange']
	const sel = selection(this, {
		multiple: () => true,
		fallback: strings(defaultValue),
		onChange: (next, event) => onValueChange?.(next, event as Event),
	})

	const checked = (value: string) =>
		sel.has(value)

	const change = (value: string, _checked: boolean, event: Event) => {
		if (disabled) return
		sel.toggle(value, event)
	}

	for (const args of this) {
		disabled = Boolean(args.disabled)
		name = args.name
		onValueChange = args.onValueChange
		sel.sync(args.value != null ? strings(args.value) : undefined)

		CheckboxGroupContext({ checked, disabled, name, toggle: change })

		yield <>{args.children}</>
	}
}


/** Unstyled checkbox group cascading checked values, name, and disabled state to its items. */
const CheckboxGroup: Stateless<CheckboxGroupArgs> = ({
	children,
	defaultValue,
	disabled,
	name,
	onValueChange,
	role = 'group',
	value,
	...attrs
}) => {
	const disabledFlag = Boolean(disabled)

	return (
		<CheckboxGroupRoot
			{...rootAttrs(attrs)}
			defaultValue={defaultValue}
			disabled={disabledFlag}
			name={name}
			onValueChange={onValueChange}
			value={value}
			attr:aria-disabled={flag(disabledFlag)}
			attr:data-disabled={flag(disabledFlag)}
			attr:data-slot="checkbox-group"
			attr:role={role}
		>
			{children}
		</CheckboxGroupRoot>
	)
}

/** Unstyled native checkbox item wired to the nearest group. */
const CheckboxGroupItem: Stateless<CheckboxGroupItemArgs> = ({
	disabled,
	name,
	value,
	...attrs
}) => {
	const group = CheckboxGroupContext()
	const item = String(value)
	const checked = group?.checked(item) ?? false

	return (
		<Checkbox
			{...attrs}
			checked={checked}
			data-slot="checkbox-group-item"
			disabled={disabled ?? group?.disabled}
			name={name ?? group?.name}
			set:checked={checked}
			value={item}
			onCheckedChange={(next, event) => group?.toggle(item, next, event)}
		/>
	)
}

export { CheckboxGroup, CheckboxGroupItem }
