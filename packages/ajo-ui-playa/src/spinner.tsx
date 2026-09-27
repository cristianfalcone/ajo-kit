import type { IntrinsicElements, Stateless } from 'ajo'
import { bool, clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'

export type SpinnerArgs = OmitArg<IntrinsicElements['span'], 'aria-label' | 'children'> & FixedArgs<'aria-label' | 'children'> & {
	/** Status text announced by assistive technology unless the spinner is decorative. */
	label?: string
}

/** Animated circular progress indicator; its only name is the `label` text. */
const Spinner: Stateless<SpinnerArgs> = ({
	class: classes,
	label = 'Loading',
	role = 'status',
	...attrs
}) => {
	const decorative = bool(attrs['aria-hidden']) || role === 'none' || role === 'presentation'

	return (
		<span
			{...attrs}
			class={clx('inline-flex size-4 shrink-0 items-center justify-center text-primary', classes)}
			data-slot="spinner"
			role={role}
		>
			<span
				aria-hidden="true"
				class="block size-full animate-spin rounded-full border-2 border-current border-r-transparent border-t-transparent motion-reduce:animate-none [animation-duration:900ms]"
				data-slot="spinner-ring"
			/>
			{decorative ? null : <span class="sr-only">{label}</span>}
		</span>
	)
}

export { Spinner }
