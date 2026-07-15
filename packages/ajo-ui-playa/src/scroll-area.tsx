import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { scrollAreaViewportVariants } from './internal/recipes'
import { ScrollAreaFrame } from './internal/scroll-area'

/** Native viewport args; `class` and `style` target its visual clip frame. */
export type ScrollAreaArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes for the visual frame. */
	class?: string
}>

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
