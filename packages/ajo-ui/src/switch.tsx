import type { Stateless } from 'ajo'
import { Checked, type CheckedArgs } from './checked'

/** Arguments for a checkbox-backed binary switch and its visual thumb. */
export type SwitchArgs = CheckedArgs & {
	/** Classes for the thumb element. */
	thumbClass?: string
}

/** Unstyled native switch control with form behavior. */
const Switch: Stateless<SwitchArgs> = ({ thumbClass, ...attrs }) => (
	<Checked {...attrs} role="switch" slot="switch">
		<span aria-hidden="true" class={thumbClass} data-slot="switch-thumb" />
	</Checked>
)

export { Switch }
