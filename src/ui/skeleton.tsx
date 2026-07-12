import type { IntrinsicElements, Stateless } from 'ajo'
import clsx from 'clsx'

export type SkeletonArgs = IntrinsicElements['div'] & {
	/** Hide the visual placeholder from assistive technology. */
	decorative?: boolean
}

const base = 'animate-pulse rounded-md bg-muted motion-reduce:animate-none'

/** Visual placeholder for content that is still loading. */
const Skeleton: Stateless<SkeletonArgs> = ({
	'aria-hidden': ariaHidden,
	class: classes,
	decorative = true,
	role,
	...attrs
}) => (
	<div
		{...attrs}
		aria-hidden={decorative ? ariaHidden ?? 'true' : ariaHidden}
		class={clsx(base, classes)}
		data-slot="skeleton"
		role={decorative ? role ?? 'presentation' : role}
	/>
)

export { Skeleton }
