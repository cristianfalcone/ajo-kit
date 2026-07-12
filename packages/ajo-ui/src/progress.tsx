import type { IntrinsicElements, Stateless } from 'ajo'
import { clamp } from 'ajo-cloves'
import type { FixedArgs, OmitArg } from './utils'
import { toNumber } from './utils'

export type ProgressArgs = OmitArg<IntrinsicElements['div'], 'children' | 'max' | 'value'> & {
	/** Current progress value. Omit or pass `null` for an indeterminate progress bar. */
	value?: number | null
	/** Maximum progress value. */
	max?: number
	/** Custom accessible value text. */
	getValueLabel?: (value: number, max: number) => string
	/** Classes for the indicator element. */
	indicatorClass?: string
} & FixedArgs<'children'>

const state = (value: number | null, max: number) => {
	if (value == null) return 'indeterminate'
	if (value >= max) return 'complete'
	return 'loading'
}

const percent = (value: number | null, max: number) =>
	value == null || max <= 0 ? 0 : clamp((value / max) * 100, 0, 100)

/** Unstyled progress bar with determinate and indeterminate states. */
const Progress: Stateless<ProgressArgs> = ({
	'aria-label': ariaLabel,
	'aria-valuetext': ariaValueText,
	getValueLabel,
	indicatorClass,
	max = 100,
	role = 'progressbar',
	value = null,
	...attrs
}) => {
	const maxValue = Math.max(1, toNumber(max, 100))
	const current = value == null ? null : clamp(toNumber(value, 0), 0, maxValue)
	const progress = percent(current, maxValue)
	const progressState = state(current, maxValue)
	const valueText = current == null
		? ariaValueText
		: ariaValueText ?? getValueLabel?.(current, maxValue)

	return (
		<div
			{...attrs}
			aria-label={ariaLabel}
			aria-valuemax={maxValue}
			aria-valuemin="0"
			aria-valuenow={current == null ? undefined : current}
			aria-valuetext={valueText}
			data-max={maxValue}
			data-slot="progress"
			data-state={progressState}
			data-value={current == null ? undefined : current}
			role={role}
		>
			<div
				aria-hidden="true"
				class={indicatorClass}
				data-slot="progress-indicator"
				style={current == null ? undefined : `transform:translateX(-${100 - progress}%)`}
			/>
		</div>
	)
}

export { Progress }
