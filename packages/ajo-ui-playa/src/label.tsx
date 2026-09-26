import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'
import { labelBase } from './internal/recipes'

export type LabelArgs = WithChildren<IntrinsicElements['label'] & {
	/** Slot marker for composed label variants. */
	'data-slot'?: string
}>

/** Accessible label associated with a form control. */
const Label: Stateless<LabelArgs> = ({
	class: classes,
	children,
	'data-slot': slot = 'label',
	...attrs
}) => (
	<label
		{...attrs}
		class={clsx(labelBase, classes)}
		data-slot={slot}
	>
		{children}
	</label>
)

export { Label }
export default Label
