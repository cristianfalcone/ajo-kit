import type { Stateless } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import { Switch as BaseSwitch, type SwitchArgs as BaseSwitchArgs } from 'ajo-ui/switch'
import { choiceInput } from './internal/choice'

export type SwitchSize = 'default' | 'sm'

export type SwitchArgs = OmitArg<BaseSwitchArgs, 'inputClass' | 'thumbClass'> & FixedArgs<'inputClass' | 'thumbClass'> & {
	/** Switch size. */
	size?: SwitchSize
	/** Additional UnoCSS classes for the switch track. */
	class?: string
}

// Off is a neutral track with the input boundary and an ivory thumb; on is
// the ink (D28) with the thumb in the page colour, the mark of every on
// control. The thumb travels by its logical start, so it stays in the track in
// either direction. The input's 24 px target reaches past the track.
const track = 'peer relative inline-flex shrink-0 items-center rounded-full edge-input bg-muted playa-choice-focus transition-colors duration-150 motion-reduce:transition-none has-[:checked]:bg-ink has-[[aria-invalid=true]]:inset-ring-danger has-[:disabled]:opacity-[var(--disabled-opacity)]'
const sizes: Record<SwitchSize, { thumb: string, track: string }> = {
	default: { thumb: 'size-4 peer-checked:start-4.5', track: 'h-5 w-9' },
	sm: { thumb: 'size-3 peer-checked:start-3.5', track: 'h-4 w-7' },
}
const thumb = 'playa-thumb absolute start-0.5 [transition-property:inset-inline-start] duration-150 ease-[var(--ease)] motion-reduce:transition-none peer-checked:bg-background forced-colors:peer-checked:bg-[Highlight]'

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
