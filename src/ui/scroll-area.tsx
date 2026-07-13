import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

export type ScrollAreaArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

type ScrollAreaVariantOptions = {
	/** Scrollable axis; the off axis hides overflow. */
	axis?: 'both' | 'x' | 'y'
	/** Additional UnoCSS classes. */
	class?: string
}

const overflow = {
	both: 'overflow-auto',
	x: 'overflow-x-auto overflow-y-hidden',
	y: 'overflow-y-auto overflow-x-hidden',
}

/** Internal shared scroll idiom for themed scroll regions and popup lists. */
export const scrollAreaVariants = ({
	axis = 'both',
	class: classes,
}: ScrollAreaVariantOptions = {}) => clsx(overflow[axis], 'overscroll-contain scrollbar-soft', classes)

const areaRoot = 'relative rounded-[inherit] outline-none transition-[color,box-shadow] [scrollbar-gutter:stable] focus-visible:ring-3 focus-visible:ring-ring/50'

/** Internal root recipe shared by the themed native scroll owners. */
export const scrollAreaRootVariants = ({
	axis = 'both',
	class: classes,
}: ScrollAreaVariantOptions = {}) => clsx(scrollAreaVariants({ axis }), areaRoot, classes)

/** Native scroll container with styled scrollbars. */
const ScrollArea: Stateless<ScrollAreaArgs> = ({
	children,
	class: classes,
	tabindex = 0,
	...attrs
}) => (
	<div
		{...attrs}
		class={scrollAreaRootVariants({ class: classes })}
		data-slot="scroll-area"
		tabindex={tabindex}
	>
		{children}
	</div>
)

export { ScrollArea }
export default ScrollArea
