import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type FeedbackProps = WithChildren<IntrinsicElements['p'] & {
	tone?: 'danger' | 'success'
	class?: string
}>

const toneClass = {
	success: 'text-green-600 dark:text-green-400',
	danger: 'text-red-600 dark:text-red-400',
}

/** Renders compact inline form feedback. */
const Feedback: Stateless<FeedbackProps> = ({
	tone = 'danger',
	class: classes,
	children,
	...props
}) => (
	<p {...props} class={clsx('text-sm', toneClass[tone], classes)}>
		{children}
	</p>
)

export default Feedback
