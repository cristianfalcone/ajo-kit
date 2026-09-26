import type { IntrinsicElements, Stateless } from 'ajo'
import { clamp } from 'ajo-cloves'
import type { FixedArgs, OmitArg } from './utils'

/** Props for a determinate or indeterminate progress bar. */
export type ProgressArgs = OmitArg<IntrinsicElements['div'], 'children' | 'max' | 'value'> & {
	/** Current progress value. Omit or pass `null` for an indeterminate progress bar. */
	value?: number | null
	/** Maximum progress value. */
	max?: number
} & FixedArgs<'children'>

const state = (value: number | null, max: number) => {
	if (value == null) return 'indeterminate'
	if (value >= max) return 'complete'
	return 'loading'
}

const percent = (value: number, max: number) =>
	max > 0 ? value / max * 100 : 0

/** Unstyled progress bar with determinate and indeterminate states. */
const Progress: Stateless<ProgressArgs> = ({
	max = 100,
	role = 'progressbar',
	value = null,
	...attrs
}) => {
	const current = value == null ? null : clamp(value, 0, max)

	return (
		<div
			{...attrs}
			aria-valuemax={max}
			aria-valuemin="0"
			aria-valuenow={current ?? undefined}
			data-max={max}
			data-slot="progress"
			data-state={state(current, max)}
			data-value={current ?? undefined}
			role={role}
		>
			<div
				aria-hidden="true"
				data-slot="progress-indicator"
				style={current == null ? undefined : `transform:translateX(-${100 - percent(current, max)}%)`}
			/>
		</div>
	)
}

export { Progress }
