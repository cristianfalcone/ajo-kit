import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { stlx } from 'ajo-ui/utils'
import { scrollAreaFrameVariants } from './recipes'

type ScrollAreaFrameArgs = WithChildren<{
	class?: string
	style?: IntrinsicElements['div']['style']
}>

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
