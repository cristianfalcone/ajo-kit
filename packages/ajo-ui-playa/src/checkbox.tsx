import type { Stateless } from 'ajo'
import clsx from 'clsx'
import { Checkbox as BaseCheckbox, type CheckboxArgs as BaseCheckboxArgs } from 'ajo-ui/checkbox'
import { FieldContext } from 'ajo-ui/field'
import { bool, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import {
	checkboxBox,
	checkboxCheckedIndicator,
	checkboxIndeterminateIndicator,
	checkboxInvalidState,
	checkboxState,
	choiceInput,
} from './internal/recipes'

export type CheckboxArgs = OmitArg<BaseCheckboxArgs, 'checkedIndicatorClass' | 'indeterminateIndicatorClass' | 'inputClass'> & FixedArgs<'checkedIndicatorClass' | 'indeterminateIndicatorClass' | 'inputClass'> & {
	/** Additional UnoCSS classes for the visual checkbox box. */
	class?: string
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
