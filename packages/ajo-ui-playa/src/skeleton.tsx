import type { IntrinsicElements, Stateless } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'

export type SkeletonArgs = OmitArg<IntrinsicElements['div'], 'aria-hidden'> & FixedArgs<'aria-hidden'> & {
	/** Hide the visual placeholder from assistive technology; a semantic placeholder names its own `role`. */
	decorative?: boolean
}

// A tint of the text colour, so a placeholder shows on the page, a card or
// a muted fill alike, in both themes.
const base = 'animate-pulse rounded-md bg-foreground/10 motion-reduce:animate-none'

/** Visual placeholder for content that is still loading. */
const Skeleton: Stateless<SkeletonArgs> = ({
	class: classes,
	decorative = true,
	role,
	...attrs
}) => (
	<div
		{...attrs}
		aria-hidden={decorative ? 'true' : undefined}
		class={clx(base, classes)}
		data-slot="skeleton"
		role={decorative ? 'presentation' : role}
	/>
)

export { Skeleton }
