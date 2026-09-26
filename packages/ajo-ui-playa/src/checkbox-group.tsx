import type { Stateless } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import {
	CheckboxGroup as BaseCheckboxGroup,
	CheckboxGroupItem as BaseCheckboxGroupItem,
	type CheckboxGroupArgs as BaseCheckboxGroupArgs,
	type CheckboxGroupItemArgs as BaseCheckboxGroupItemArgs,
} from 'ajo-ui/checkbox-group'
import {
	checkboxBox,
	checkboxIndicator,
	checkboxState,
	choiceGroupOrientation,
	choiceInput,
} from './internal/recipes'

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
		class={clsx(choiceGroupOrientation[orientation], classes)}
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
		class={clsx(checkboxBox, checkboxState, classes)}
		indicatorClass={checkboxIndicator}
		inputClass={choiceInput}
	/>
)

export { CheckboxGroup, CheckboxGroupItem }
