import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, dom, listen, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { ariaChecked, bool, flag, syncCheckedState } from './utils'

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
export type RadioGroupItemArgs = IntrinsicElements['input'] & {
	/** Classes for the indicator element. */
	indicatorClass?: string
	/** Classes for the native input element. */
	inputClass?: string
}

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

const syncRadioInput = (input: HTMLInputElement) =>
	syncCheckedState(input, input.closest<HTMLElement>('[data-slot="radio-group-item"]'))

const syncRadioGroup = (root: HTMLElement) => {
	for (const input of root.querySelectorAll<HTMLInputElement>('input[data-slot="radio-group-input"]')) {
		syncRadioInput(input)
	}
}

const itemState = (active: boolean | undefined, attrs: IntrinsicElements['input']) =>
	bool(active ?? attrs['set:checked'] ?? attrs.checked ?? attrs.defaultChecked) ? 'checked' : 'unchecked'

const change = (
	value: string | undefined,
	previous: unknown,
	onValueChange: RadioGroupContextValue['onValueChange'],
) => (event: Event) => {
	callHandler(previous, event)

	const input = event.currentTarget as HTMLInputElement
	if (input.checked && value != null) onValueChange?.(value, event)
	queueMicrotask(() => {
		const root = input.closest<HTMLElement>('[data-slot="radio-group"]')
		if (root) syncRadioGroup(root)
		else syncRadioInput(input)
	})
}

const RadioGroupRoot: Stateful<RadioGroupRootArgs, 'fieldset'> = function* () {
	listen(this, 'change', () => {
		queueMicrotask(() => syncRadioGroup(this))
	})

	for (const { children, defaultValue, disabled, name, onValueChange, required, value } of this) {
		RadioGroupContext({ defaultValue, disabled, name, onValueChange, required, value })
		if (dom(this)) queueMicrotask(() => syncRadioGroup(this))
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
			attr:aria-orientation={orientation}
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
	checked,
	class: classes,
	disabled,
	indicatorClass,
	inputClass,
	name,
	ref,
	required,
	'set:checked': setChecked,
	'set:onchange': setOnChange,
	type: _type,
	value,
	...attrs
}) => {
	const group = RadioGroupContext()
	const itemValue = value == null ? undefined : String(value)
	const ownChecked = checked == null ? undefined : Boolean(checked)
	const groupChecked = group?.value != null
		? itemValue === group.value
		: group?.defaultValue != null
			? itemValue === group.defaultValue
			: undefined
	const active = ownChecked ?? groupChecked
	const syncChecked = active ?? setChecked as boolean | undefined
	const state = itemState(active, { ...attrs, checked, defaultChecked: attrs.defaultChecked, 'set:checked': setChecked })
	const disabledValue = disabled ?? group?.disabled

	return (
		<span
			class={classes}
			data-disabled={flag(disabledValue)}
			data-slot="radio-group-item"
			data-state={state}
		>
			<input
				{...attrs}
				aria-checked={ariaChecked(state)}
				checked={active}
				class={inputClass}
				data-slot="radio-group-input"
				data-state={state}
				disabled={disabledValue}
				name={name ?? group?.name}
				ref={element => {
					callRef(ref, element)
					if (element) queueMicrotask(() => syncRadioInput(element))
				}}
				required={required ?? group?.required}
				set:checked={syncChecked}
				set:onchange={change(itemValue, setOnChange, group?.onValueChange)}
				type="radio"
				value={value}
			/>
			<span
				aria-hidden="true"
				class={indicatorClass}
				data-slot="radio-group-indicator"
				data-state={state}
			/>
		</span>
	)
}

export { RadioGroup, RadioGroupItem }
