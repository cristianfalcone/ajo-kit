import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

export type LabelArgs = WithChildren<IntrinsicElements['label'] & {
	/** Slot marker for composed label variants. */
	'data-slot'?: string
}>

const base = 'flex items-center gap-2 text-sm font-medium leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50'

/** Accessible label associated with a form control. */
const Label: Stateless<LabelArgs> = ({
	class: classes,
	children,
	'data-slot': slot = 'label',
	...attrs
}) => (
	<label
		{...attrs}
		class={clsx(base, classes)}
		data-slot={slot}
	>
		{children}
	</label>
)

export { Label }
export default Label
