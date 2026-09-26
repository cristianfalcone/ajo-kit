import type { Stateless } from 'ajo'
import { Checked, type CheckedArgs } from './checked'
import { FieldContext } from './field'

/** Arguments for a checkbox-backed binary switch and its visual thumb. */
export type SwitchArgs = CheckedArgs & {
	/** Classes for the thumb element. */
	thumbClass?: string
}

/** Unstyled native switch control with form behavior; inside a Field it is the field's control. */
const Switch: Stateless<SwitchArgs> = ({ thumbClass, ...attrs }) => (
	<Checked {...FieldContext()?.controlAttrs} {...attrs} role="switch" slot="switch">
		<span aria-hidden="true" class={thumbClass} data-slot="switch-thumb" />
	</Checked>
)

export { Switch }
