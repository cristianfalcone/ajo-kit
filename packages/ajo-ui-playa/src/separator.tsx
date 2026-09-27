import type { IntrinsicElements, Stateless } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'

export type SeparatorOrientation = 'horizontal' | 'vertical'
export type SeparatorArgs = OmitArg<IntrinsicElements['div'], 'aria-hidden' | 'role'> & FixedArgs<'aria-hidden' | 'role'> & {
	/** Visual direction of the separator. */
	orientation?: SeparatorOrientation
	/** Hide the separator from assistive technology when it is purely visual. */
	decorative?: boolean
	/** Slot marker for composed separators. */
	'data-slot'?: string
}

const base = 'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px'

/** Visual or semantic divider; `decorative` alone decides its role. */
const Separator: Stateless<SeparatorArgs> = ({
	class: classes,
	'data-slot': slot = 'separator',
	decorative = true,
	orientation = 'horizontal',
	...attrs
}) => (
	<div
		{...attrs}
		aria-hidden={decorative ? 'true' : undefined}
		aria-orientation={decorative ? undefined : orientation}
		class={clx(base, classes)}
		data-orientation={orientation}
		data-slot={slot}
		role={decorative ? 'none' : 'separator'}
	/>
)

export { Separator }
