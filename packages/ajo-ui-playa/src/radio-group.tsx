import type { Stateless } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import {
	RadioGroup as BaseRadioGroup,
	RadioGroupItem as BaseRadioGroupItem,
	type RadioGroupArgs as BaseRadioGroupArgs,
	type RadioGroupItemArgs as BaseRadioGroupItemArgs,
	type RadioGroupOrientation as BaseRadioGroupOrientation,
} from 'ajo-ui/radio-group'
import { choiceGroupOrientation, choiceInput } from './internal/choice'

export type RadioGroupOrientation = BaseRadioGroupOrientation

export type RadioGroupArgs = BaseRadioGroupArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type RadioGroupItemArgs = OmitArg<BaseRadioGroupItemArgs, 'indicatorClass' | 'inputClass'> & FixedArgs<'indicatorClass' | 'inputClass'> & {
	/** Additional UnoCSS classes for the visual radio item. */
	class?: string
}

/** Radio input group matching composition while preserving native forms. */
const RadioGroup: Stateless<RadioGroupArgs> = ({
	class: classes,
	orientation = 'vertical',
	...attrs
}) => (
	<BaseRadioGroup
		{...attrs}
		class={clx(choiceGroupOrientation[orientation], classes)}
		orientation={orientation}
	/>
)

/** Native radio item styled as a custom control. */
const RadioGroupItem: Stateless<RadioGroupItemArgs> = ({
	class: classes,
	type: _type,
	...attrs
}) => (
	<BaseRadioGroupItem
		{...attrs}
		class={clx('playa-checkbox-box rounded-full', classes)}
		// Composed check-in: the fill transitions on the item box while the dot
		// pops in with a springy overshoot; unchecking collapses fast.
		indicatorClass="playa-choice-glyph size-2 rounded-full scale-0 opacity-0 transition-[opacity,scale] duration-100 ease-in motion-reduce:transition-none peer-checked:scale-100 peer-checked:opacity-100 peer-checked:duration-250 peer-checked:delay-75 peer-checked:ease-[cubic-bezier(0.34,1.56,0.64,1)]"
		inputClass={choiceInput}
	/>
)

export { RadioGroup, RadioGroupItem }
