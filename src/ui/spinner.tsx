import type { IntrinsicElements, Stateless } from 'ajo'
import clsx from 'clsx'
import { bool, type FixedArgs, type OmitArg } from 'ajo-ui/utils'

export type SpinnerArgs = OmitArg<IntrinsicElements['span'], 'children'> & FixedArgs<'children'> & {
	/** Accessible label when the spinner is exposed as a status. */
	label?: string
}

/** Animated circular progress indicator. */
const Spinner: Stateless<SpinnerArgs> = ({
	'aria-hidden': ariaHidden,
	'aria-label': ariaLabel,
	class: classes,
	label = 'Loading',
	role = 'status',
	...attrs
}) => {
	const decorative = bool(ariaHidden) || role === 'none' || role === 'presentation'
	const text = String(ariaLabel ?? label)

	return (
		<span
			{...attrs}
			aria-hidden={ariaHidden}
			aria-label={decorative ? undefined : text}
			class={clsx('inline-flex size-4 shrink-0 items-center justify-center text-primary', classes)}
			data-slot="spinner"
			role={role}
		>
			<span
				aria-hidden="true"
				class="block size-full animate-spin rounded-full border-2 border-current border-r-transparent border-t-transparent motion-reduce:animate-none [animation-duration:900ms]"
				data-slot="spinner-ring"
			/>
			{decorative ? null : <span class="sr-only">{text}</span>}
		</span>
	)
}

export default Spinner
