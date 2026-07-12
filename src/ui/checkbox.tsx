import type { Stateless } from 'ajo'
import clsx from 'clsx'
import { Checkbox as BaseCheckbox, type CheckboxArgs as BaseCheckboxArgs } from 'ajo-ui/checkbox'
import { FieldContext } from 'ajo-ui/field'
import { bool, type FixedArgs, type OmitArg } from 'ajo-ui/utils'

export type CheckboxArgs = OmitArg<BaseCheckboxArgs, 'checkedIndicatorClass' | 'indeterminateIndicatorClass' | 'inputClass'> & FixedArgs<'checkedIndicatorClass' | 'indeterminateIndicatorClass' | 'inputClass'> & {
	/** Additional UnoCSS classes for the visual checkbox box. */
	class?: string
}

/** Shared visual box for Checkbox and CheckboxGroup items. */
export const checkboxBox = 'relative inline-flex size-4 shrink-0 items-center justify-center rounded-xs edge-input bg-transparent outline-none transition-shadow has-[:focus-visible]:inset-ring-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[[aria-invalid=true]]:inset-ring-danger has-[[aria-invalid=true]]:ring-danger/20'

/** Checked and indeterminate colors for valid checkboxes. */
export const checkboxState = 'has-[:checked]:inset-ring-transparent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:indeterminate]:inset-ring-transparent has-[:indeterminate]:bg-primary has-[:indeterminate]:text-primary-foreground'

/** Checked and indeterminate colors for invalid checkboxes. */
export const checkboxInvalidState = 'has-[:checked]:inset-ring-transparent has-[:checked]:bg-danger has-[:checked]:text-danger-foreground has-[:indeterminate]:inset-ring-transparent has-[:indeterminate]:bg-danger has-[:indeterminate]:text-danger-foreground'

/** Checked-state icon recipe shared with CheckboxGroup. */
export const checkboxCheckedIndicator = 'i-lucide-check pointer-events-none size-3.5 text-current opacity-0 transition-none peer-checked:opacity-100 peer-indeterminate:opacity-0'

/** Indeterminate-state icon recipe shared with CheckboxGroup. */
export const checkboxIndeterminateIndicator = 'i-lucide-minus pointer-events-none absolute size-3.5 text-current opacity-0 transition-none peer-indeterminate:opacity-100'

/** Invisible native input overlay shared by checkbox-like controls. */
export const choiceInput = 'peer absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed'

/** Shared layout recipes for choice groups. */
export const choiceGroupOrientation: Record<'horizontal' | 'vertical', string> = {
	vertical: 'grid gap-3',
	horizontal: 'flex flex-wrap items-center gap-3',
}

/** Native checkbox control styled as a custom control while preserving form behavior. */
const Checkbox: Stateless<CheckboxArgs> = ({
	class: classes,
	type: _type,
	...attrs
}) => {
	const field = FieldContext()
	const inputAttrs = { ...(field?.controlAttrs ?? {}), ...attrs }
	const invalid = bool(inputAttrs['aria-invalid'])

	return (
		<BaseCheckbox
			{...inputAttrs}
			checkedIndicatorClass={checkboxCheckedIndicator}
			class={clsx(checkboxBox, invalid ? checkboxInvalidState : checkboxState, classes)}
			indeterminateIndicatorClass={checkboxIndeterminateIndicator}
			inputClass={choiceInput}
		/>
	)
}

export { Checkbox }
export default Checkbox
