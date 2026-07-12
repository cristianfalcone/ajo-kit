import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'
import { stlx } from 'ajo-ui/utils'

export type AspectRatioArgs = WithChildren<IntrinsicElements['div'] & {
	/** Desired width divided by height. */
	ratio: number
}>

const base = 'relative w-full'
const ratioValue = (ratio: number) => Number.isFinite(ratio) && ratio > 0
	? String(ratio)
	: '1'

/** Responsive box that preserves a width-to-height ratio. */
const AspectRatio: Stateless<AspectRatioArgs> = ({
	class: classes,
	children,
	ratio,
	style,
	...attrs
}) => {
	const value = ratioValue(ratio)

	return (
		<div
			{...attrs}
			class={clsx(base, classes)}
			data-ratio={value}
			data-slot="aspect-ratio"
			style={stlx(style, { aspectRatio: value })}
		>
			{children}
		</div>
	)
}

export { AspectRatio }
export default AspectRatio
