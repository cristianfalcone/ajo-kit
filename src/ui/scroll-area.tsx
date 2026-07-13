import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { stlx } from 'ajo-ui/utils'
import clsx from 'clsx'

/** Native viewport args; `class` and `style` target its visual clip frame. */
export type ScrollAreaArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes for the visual frame. */
	class?: string
}>

type ScrollAreaFrameArgs = WithChildren<{
	class?: string
	style?: IntrinsicElements['div']['style']
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

const areaFrame = 'relative min-h-0 min-w-0 rounded-[inherit] transition-[color,box-shadow] has-[>:focus-visible]:ring-3 has-[>:focus-visible]:ring-ring/50'
const areaViewport = 'scrollbar-framed relative h-full w-full min-h-0 min-w-0 rounded-[inherit] outline-none [scrollbar-gutter:stable]'

/** Internal clip-frame recipe shared by the themed native scroll owners. */
const scrollAreaFrameVariants = ({ class: classes }: Pick<ScrollAreaVariantOptions, 'class'> = {}) =>
	clsx(areaFrame, classes)

/** Internal viewport recipe shared by the themed native scroll owners. */
export const scrollAreaViewportVariants = ({
	axis = 'both',
	class: classes,
}: ScrollAreaVariantOptions = {}) => clsx(scrollAreaVariants({ axis }), areaViewport, classes)

/** Internal visual frame; its child remains the only element with a scroll range. */
export const ScrollAreaFrame: Stateless<ScrollAreaFrameArgs> = ({ children, class: classes, style }) => (
	<div
		class={scrollAreaFrameVariants({ class: classes })}
		data-slot="scroll-area-frame"
		style={stlx(style, { overflow: 'hidden' })}
	>
		{children}
	</div>
)

/** Native scroll container with styled scrollbars. */
const ScrollArea: Stateless<ScrollAreaArgs> = ({
	children,
	class: classes,
	style,
	tabindex = 0,
	...attrs
}) => (
	<ScrollAreaFrame class={classes} style={style}>
		<div
			{...attrs}
			class={scrollAreaViewportVariants()}
			data-slot="scroll-area"
			tabindex={tabindex}
		>
			{children}
		</div>
	</ScrollAreaFrame>
)

export { ScrollArea }
export default ScrollArea
