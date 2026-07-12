import type { Stateless } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { FieldContext } from 'ajo-ui/field'
import { Switch as BaseSwitch, type SwitchArgs as BaseSwitchArgs } from 'ajo-ui/switch'
import { choiceInput } from './checkbox'

export type SwitchSize = 'default' | 'sm'

export type SwitchArgs = OmitArg<BaseSwitchArgs, 'inputClass' | 'size' | 'thumbClass'> & FixedArgs<'inputClass' | 'thumbClass'> & {
	/** Switch size. */
	size?: SwitchSize
	/** Additional UnoCSS classes for the switch track. */
	class?: string
}

const track = 'peer group/switch relative inline-flex shrink-0 items-center rounded-full px-px edge-input bg-transparent shadow-xs outline-none transition-all has-[:focus-visible]:inset-ring-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:checked]:inset-ring-transparent has-[:checked]:bg-primary'
const sizes: Record<SwitchSize, string> = {
	default: 'h-[1.15rem] w-8',
	sm: 'h-3.5 w-6',
}
const thumb = 'pointer-events-none block translate-x-0 rounded-full bg-foreground ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 peer-checked:translate-x-[calc(100%-2px)] peer-checked:bg-primary-foreground'

/** Native switch control with component styling and form behavior. */
const Switch: Stateless<SwitchArgs> = ({
	class: classes,
	size = 'default',
	...attrs
}) => {
	const field = FieldContext()

	return (
		<BaseSwitch
			{...(field?.controlAttrs ?? {})}
			{...attrs}
			class={clsx(track, sizes[size], classes)}
			inputClass={choiceInput}
			size={size}
			thumbClass={thumb}
		/>
	)
}

export { Switch }
export default Switch
