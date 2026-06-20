import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type AlertProps = WithChildren<IntrinsicElements['div'] & {
	tone?: 'danger' | 'success'
	class?: string
}>

const toneClass = {
	success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
	danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
}

/** Shows a boxed status message. */
const Alert: Stateless<AlertProps> = ({
	tone = 'success',
	class: classes,
	children,
	...props
}) => (
	<div {...props} class={clsx('p-4 border rounded-lg', toneClass[tone], classes)}>
		{children}
	</div>
)

export default Alert
