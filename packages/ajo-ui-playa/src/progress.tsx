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

const rootBase = 'relative h-2 w-full overflow-hidden rounded-full bg-primary/20 [&>[data-slot=progress-indicator]]:h-full [&>[data-slot=progress-indicator]]:w-full [&>[data-slot=progress-indicator]]:rounded-full [&>[data-slot=progress-indicator]]:bg-primary [&>[data-slot=progress-indicator]]:transition-transform motion-reduce:[&>[data-slot=progress-indicator]]:transition-none [&[data-state=indeterminate]>[data-slot=progress-indicator]]:w-1/3 [&[data-state=indeterminate]>[data-slot=progress-indicator]]:animate-[progress-slide_1.4s_ease-in-out_infinite] motion-reduce:[&[data-state=indeterminate]>[data-slot=progress-indicator]]:animate-none'

/** Progress bar with determinate and indeterminate states. */
const Progress: Stateless<ProgressArgs> = ({
	class: classes,
	...attrs
}) => <BaseProgress {...attrs} class={clx(rootBase, classes)} />

export { Progress }
