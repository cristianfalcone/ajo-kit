import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Progress as BaseProgress,
	type ProgressArgs as BaseProgressArgs,
} from 'ajo-ui/progress'

export type ProgressArgs = BaseProgressArgs & {
	/** Additional UnoCSS classes for the root. */
	class?: string
	/** Additional UnoCSS classes for the indicator. */
	indicatorClass?: string
}

const rootBase = 'relative h-2 w-full overflow-hidden rounded-full bg-primary/20'
const indicatorBase = 'h-full rounded-full bg-primary transition-transform motion-reduce:transition-none'

/** Progress bar with determinate and indeterminate states. */
const Progress: Stateless<ProgressArgs> = ({
	class: classes,
	indicatorClass,
	value = null,
	...attrs
}) => (
	<BaseProgress
		{...attrs}
		class={clsx(rootBase, classes)}
		indicatorClass={clsx(
			indicatorBase,
			value == null
				? 'w-1/3 animate-[progress-slide_1.4s_ease-in-out_infinite] motion-reduce:animate-none'
				: 'w-full',
			indicatorClass,
		)}
		value={value}
	/>
)

export { Progress }
