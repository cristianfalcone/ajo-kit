import type { Stateless } from 'ajo'
import { Checkbox as BaseCheckbox, type CheckboxArgs as BaseCheckboxArgs } from 'ajo-ui/checkbox'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import { checkboxIndicator, checkboxState, choiceInput } from './internal/recipes'

export type CheckboxArgs = OmitArg<BaseCheckboxArgs, 'indicatorClass' | 'inputClass'> & FixedArgs<'indicatorClass' | 'inputClass'> & {
	/** Additional UnoCSS classes for the visual checkbox box. */
	class?: string
}

/** Native checkbox control styled as a custom control while preserving form behavior. */
const Checkbox: Stateless<CheckboxArgs> = ({
	class: classes,
	type: _type,
	...attrs
}) => (
	<BaseCheckbox
		{...attrs}
		class={clx('playa-checkbox-box', checkboxState, classes)}
		indicatorClass={checkboxIndicator}
		inputClass={choiceInput}
	/>
)

export { Checkbox }
