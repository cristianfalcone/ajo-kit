import type { IntrinsicElements, Stateless } from 'ajo'
import clsx from 'clsx'

export type SeparatorOrientation = 'horizontal' | 'vertical'
export type SeparatorArgs = IntrinsicElements['div'] & {
	/** Visual direction of the separator. */
	orientation?: SeparatorOrientation
	/** Hide the separator from assistive technology when it is purely visual. */
	decorative?: boolean
}

const base = 'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px'

/** Visual or semantic divider. */
const Separator: Stateless<SeparatorArgs> = ({
	'aria-hidden': ariaHidden,
	class: classes,
	decorative = true,
	orientation = 'horizontal',
	role,
	...attrs
}) => (
	<div
		{...attrs}
		aria-hidden={decorative ? ariaHidden ?? 'true' : ariaHidden}
		aria-orientation={decorative ? undefined : orientation}
		class={clsx(base, classes)}
		data-orientation={orientation}
		data-slot="separator"
		role={decorative ? role ?? 'none' : role ?? 'separator'}
	/>
)

export { Separator }
