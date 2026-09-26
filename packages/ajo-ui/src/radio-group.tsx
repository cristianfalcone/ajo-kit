import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { flag } from './shared'
import type { FixedArgs, OmitArg } from './utils'

/** Layout and keyboard-navigation axis of a radio group. */
export type RadioGroupOrientation = 'horizontal' | 'vertical'

/** Props for a radio-group fieldset and its controlled selection. */
export type RadioGroupArgs = WithChildren<IntrinsicElements['fieldset'] & {
	/** Shared radio input name. */
	name?: string
	/** Controlled selected value. */
	value?: string
	/** Initial selected value for uncontrolled groups. */
	defaultValue?: string
	/** Layout orientation. */
	orientation?: RadioGroupOrientation
	/** Called when a radio item becomes checked. */
	onValueChange?: (value: string, event: Event) => void
}>

/** Props for a radio item and its rendered indicator. */
export type RadioGroupItemArgs = OmitArg<IntrinsicElements['input'], 'checked' | 'set:checked' | 'value'> & {
	/** Item value selected through the parent radio group. */
	value: string
	/** Classes for the indicator element. */
	indicatorClass?: string
	/** Classes for the native input element. */
	inputClass?: string
} & FixedArgs<'checked' | 'set:checked'>

type RadioGroupContextValue = {
	defaultValue?: string
	disabled?: boolean
	name?: string
	onValueChange?: (value: string, event: Event) => void
	required?: boolean
	value?: string
}

type RadioGroupRootArgs = WithChildren<RadioGroupContextValue>

const RadioGroupContext = context<RadioGroupContextValue | null>(null)

const RadioGroupRoot: Stateful<RadioGroupRootArgs, 'fieldset'> = function* () {
	for (const { children, ...group } of this) {
		RadioGroupContext(group)
		yield <>{children}</>
	}
}

RadioGroupRoot.is = 'fieldset'

/** Unstyled radio group with native fieldset semantics. */
const RadioGroup: Stateless<RadioGroupArgs> = ({
	children,
	defaultValue,
	disabled,
	name,
	onValueChange,
	orientation = 'vertical',
	required,
	value,
	...attrs
}) => {
	const disabledFlag = disabled ? true : undefined
	const requiredFlag = required ? true : undefined

	return (
		<RadioGroupRoot
			{...rootAttrs(attrs)}
			defaultValue={defaultValue}
			disabled={disabledFlag}
			name={name}
			onValueChange={onValueChange}
			required={requiredFlag}
			value={value}
			attr:data-disabled={flag(disabled)}
			attr:data-orientation={orientation}
			attr:data-slot="radio-group"
			attr:disabled={disabledFlag}
		>
			{children}
		</RadioGroupRoot>
	)
}

/** Unstyled native radio item with indicator slot. */
const RadioGroupItem: Stateless<RadioGroupItemArgs> = ({
	class: classes,
	disabled,
	indicatorClass,
	inputClass,
	name,
	required,
	'set:onchange': onChange,
	type: _type,
	value,
	...attrs
}) => {
	const group = RadioGroupContext()
	const selected = group?.value ?? group?.defaultValue
	const active = selected == null ? undefined : value === selected
	const disabledValue = disabled ?? group?.disabled

	return (
		<span class={classes} data-disabled={flag(disabledValue)} data-slot="radio-group-item">
			<input
				{...attrs}
				checked={active}
				class={inputClass}
				data-slot="radio-group-input"
				disabled={disabledValue}
				name={name ?? group?.name}
				required={required ?? group?.required}
				set:checked={active}
				set:onchange={(event: Event) => {
					callHandler(onChange, event)
					if ((event.currentTarget as HTMLInputElement).checked) group?.onValueChange?.(value, event)
				}}
				type="radio"
				value={value}
			/>
			<span aria-hidden="true" class={indicatorClass} data-slot="radio-group-indicator" />
		</span>
	)
}

export { RadioGroup, RadioGroupItem }
