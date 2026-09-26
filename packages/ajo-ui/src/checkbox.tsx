import type { Stateless } from 'ajo'
import { Checked, type CheckedArgs } from './checked'

/** Arguments for the native checkbox and its indicator. */
export type CheckboxArgs = CheckedArgs & {
	/** Classes for the indicator element; the host `data-state` tells checked from indeterminate. */
	indicatorClass?: string
}

/** Unstyled native checkbox with a state indicator and form behavior. */
const Checkbox: Stateless<CheckboxArgs> = ({ indicatorClass, ...attrs }) => (
	<Checked {...attrs} slot="checkbox">
		<span aria-hidden="true" class={indicatorClass} data-slot="checkbox-indicator" />
	</Checked>
)

export { Checkbox }
