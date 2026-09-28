import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	Progress as BaseProgress,
	type ProgressArgs as BaseProgressArgs,
} from 'ajo-ui/progress'

export type ProgressArgs = BaseProgressArgs & {
	/** Additional UnoCSS classes for the root. */
	class?: string
}

// A neutral groove filled with the ink (D28). The indicator slides in from
// the physical left, so a right-to-left page mirrors the bar. Forced colours
// drop both fills: the transparent outline paints the groove and the
// indicator paints itself in the text colour.
const rootBase = 'playa-progress relative h-2 w-full overflow-hidden rounded-full bg-muted outline-1 outline-transparent rtl:-scale-x-100 [&>[data-slot=progress-indicator]]:h-full [&>[data-slot=progress-indicator]]:w-full [&>[data-slot=progress-indicator]]:rounded-full [&>[data-slot=progress-indicator]]:bg-ink [&>[data-slot=progress-indicator]]:transition-transform motion-reduce:[&>[data-slot=progress-indicator]]:transition-none forced-colors:[&>[data-slot=progress-indicator]]:forced-color-adjust-none forced-colors:[&>[data-slot=progress-indicator]]:bg-[CanvasText] [&[data-state=indeterminate]>[data-slot=progress-indicator]]:w-1/3 motion-reduce:[&[data-state=indeterminate]>[data-slot=progress-indicator]]:animate-none'

/** Progress bar with determinate and indeterminate states. */
const Progress: Stateless<ProgressArgs> = ({
	class: classes,
	...attrs
}) => <BaseProgress {...attrs} class={clx(rootBase, classes)} />

export { Progress }
