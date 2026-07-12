import type { Stateless } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { FieldContext } from 'ajo-ui/field'
import {
	RadioGroup as BaseRadioGroup,
	RadioGroupItem as BaseRadioGroupItem,
	type RadioGroupArgs as BaseRadioGroupArgs,
	type RadioGroupItemArgs as BaseRadioGroupItemArgs,
	type RadioGroupOrientation as BaseRadioGroupOrientation,
} from 'ajo-ui/radio-group'
import { choiceGroupOrientation, choiceInput } from './checkbox'

export type RadioGroupOrientation = BaseRadioGroupOrientation

export type RadioGroupArgs = BaseRadioGroupArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type RadioGroupItemArgs = OmitArg<BaseRadioGroupItemArgs, 'indicatorClass' | 'inputClass'> & FixedArgs<'indicatorClass' | 'inputClass'> & {
	/** Additional UnoCSS classes for the visual radio item. */
	class?: string
}

const itemBase = 'relative inline-flex aspect-square size-4 shrink-0 items-center justify-center rounded-full edge-input bg-transparent outline-none transition-[color,box-shadow] has-[:checked]:inset-ring-transparent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:inset-ring-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[[aria-invalid=true]]:inset-ring-danger has-[[aria-invalid=true]]:ring-danger/20'

/** Radio input group matching composition while preserving native forms. */
const RadioGroup: Stateless<RadioGroupArgs> = ({
	class: classes,
	orientation = 'vertical',
	...attrs
}) => {
	const field = FieldContext()

	return (
		<BaseRadioGroup
			{...(field?.groupAttrs ?? {})}
			{...attrs}
			class={clsx(choiceGroupOrientation[orientation], classes)}
			orientation={orientation}
		/>
	)
}

/** Native radio item styled as a custom control. */
const RadioGroupItem: Stateless<RadioGroupItemArgs> = ({
	class: classes,
	type: _type,
	...attrs
}) => (
	<BaseRadioGroupItem
		{...attrs}
		class={clsx(itemBase, classes)}
		indicatorClass="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-0 transition-none peer-checked:opacity-100"
		inputClass={choiceInput}
	/>
)

export { RadioGroup, RadioGroupItem }
