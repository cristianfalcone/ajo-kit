import type { Stateless } from 'ajo'
import clsx from 'clsx'
import { bool, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import {
	CheckboxGroup as BaseCheckboxGroup,
	CheckboxGroupItem as BaseCheckboxGroupItem,
	type CheckboxGroupArgs as BaseCheckboxGroupArgs,
	type CheckboxGroupItemArgs as BaseCheckboxGroupItemArgs,
} from 'ajo-ui/checkbox-group'
import { FieldContext } from 'ajo-ui/field'
import {
	checkboxBox,
	checkboxCheckedIndicator,
	checkboxIndeterminateIndicator,
	checkboxInvalidState,
	checkboxState,
	choiceGroupOrientation,
	choiceInput,
} from './checkbox'

export type CheckboxGroupOrientation = 'horizontal' | 'vertical'

export type CheckboxGroupArgs = BaseCheckboxGroupArgs & {
	/** Layout orientation. */
	orientation?: CheckboxGroupOrientation
	/** Additional UnoCSS classes. */
	class?: string
}

export type CheckboxGroupItemArgs = OmitArg<BaseCheckboxGroupItemArgs, 'checkedIndicatorClass' | 'indeterminateIndicatorClass' | 'inputClass'> & FixedArgs<'checkedIndicatorClass' | 'indeterminateIndicatorClass' | 'inputClass'> & {
	/** Additional UnoCSS classes for the visual checkbox box. */
	class?: string
}

/** Checkbox input group matching composition while preserving native forms. */
const CheckboxGroup: Stateless<CheckboxGroupArgs> = ({
	class: classes,
	orientation = 'vertical',
	...attrs
}) => {
	const field = FieldContext()

	return (
		<BaseCheckboxGroup
			{...(field?.groupAttrs ?? {})}
			{...attrs}
			class={clsx(choiceGroupOrientation[orientation], classes)}
			data-orientation={orientation}
		/>
	)
}

/** Native checkbox item styled as a custom control. */
const CheckboxGroupItem: Stateless<CheckboxGroupItemArgs> = ({
	class: classes,
	type: _type,
	...attrs
}) => {
	const invalid = bool(attrs['aria-invalid'])

	return (
		<BaseCheckboxGroupItem
			{...attrs}
			checkedIndicatorClass={checkboxCheckedIndicator}
			class={clsx(checkboxBox, invalid ? checkboxInvalidState : checkboxState, classes)}
			indeterminateIndicatorClass={checkboxIndeterminateIndicator}
			inputClass={choiceInput}
		/>
	)
}

export { CheckboxGroup, CheckboxGroupItem }
