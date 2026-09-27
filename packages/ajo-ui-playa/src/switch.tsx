import type { Stateless } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import { Switch as BaseSwitch, type SwitchArgs as BaseSwitchArgs } from 'ajo-ui/switch'
import { choiceInput } from './internal/recipes'

export type SwitchSize = 'default' | 'sm'

export type SwitchArgs = OmitArg<BaseSwitchArgs, 'inputClass' | 'thumbClass'> & FixedArgs<'inputClass' | 'thumbClass'> & {
	/** Switch size. */
	size?: SwitchSize
	/** Additional UnoCSS classes for the switch track. */
	class?: string
}

const track = 'peer relative inline-flex shrink-0 items-center rounded-full px-px edge-input bg-transparent outline-none transition-all has-[:focus-visible]:inset-ring-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:checked]:inset-ring-transparent has-[:checked]:bg-primary'
const sizes: Record<SwitchSize, { thumb: string, track: string }> = {
	default: { thumb: 'size-4', track: 'h-[1.15rem] w-8' },
	sm: { thumb: 'size-3', track: 'h-3.5 w-6' },
}
const thumb = 'pointer-events-none block translate-x-0 rounded-full bg-foreground ring-0 transition-transform peer-checked:translate-x-[calc(100%-2px)] peer-checked:bg-primary-foreground'

/** Native switch control with component styling and form behavior. */
const Switch: Stateless<SwitchArgs> = ({
	class: classes,
	size = 'default',
	...attrs
}) => (
	<BaseSwitch
		{...attrs}
		class={clx(track, sizes[size].track, classes)}
		inputClass={choiceInput}
		thumbClass={clx(thumb, sizes[size].thumb)}
	/>
)

export { Switch }
