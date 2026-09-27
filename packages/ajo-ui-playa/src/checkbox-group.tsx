import type { Stateless } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import {
	CheckboxGroup as BaseCheckboxGroup,
	CheckboxGroupItem as BaseCheckboxGroupItem,
	type CheckboxGroupArgs as BaseCheckboxGroupArgs,
	type CheckboxGroupItemArgs as BaseCheckboxGroupItemArgs,
} from 'ajo-ui/checkbox-group'
import { checkboxIndicator, checkboxState, choiceGroupOrientation, choiceInput } from './internal/choice'

export type CheckboxGroupOrientation = 'horizontal' | 'vertical'

export type CheckboxGroupArgs = BaseCheckboxGroupArgs & {
	/** Layout orientation. */
	orientation?: CheckboxGroupOrientation
	/** Additional UnoCSS classes. */
	class?: string
}

export type CheckboxGroupItemArgs = OmitArg<BaseCheckboxGroupItemArgs, 'indicatorClass' | 'inputClass'> & FixedArgs<'indicatorClass' | 'inputClass'> & {
	/** Additional UnoCSS classes for the visual checkbox box. */
	class?: string
}

/** Checkbox input group matching composition while preserving native forms. */
const CheckboxGroup: Stateless<CheckboxGroupArgs> = ({
	class: classes,
	orientation = 'vertical',
	...attrs
}) => (
	<BaseCheckboxGroup
		{...attrs}
		class={clx(choiceGroupOrientation[orientation], classes)}
		data-orientation={orientation}
	/>
)

/** Native checkbox item styled as a custom control. */
const CheckboxGroupItem: Stateless<CheckboxGroupItemArgs> = ({
	class: classes,
	type: _type,
	...attrs
}) => (
	<BaseCheckboxGroupItem
		{...attrs}
		class={clx('playa-checkbox-box', checkboxState, classes)}
		indicatorClass={checkboxIndicator}
		inputClass={choiceInput}
	/>
)

export { CheckboxGroup, CheckboxGroupItem }
