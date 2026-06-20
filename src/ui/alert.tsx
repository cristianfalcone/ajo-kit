import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type AlertProps = WithChildren<IntrinsicElements['div'] & {
	tone?: 'danger' | 'success'
	class?: string
}>

const toneClass = {
	success: 'bg-green-50/85 text-green-800 shadow-green-900/5 inset-ring-green-700/18 dark:bg-green-900/20 dark:text-green-200 dark:shadow-none dark:inset-ring-green-300/18',
	danger: 'bg-red-50/85 text-red-800 shadow-red-900/5 inset-ring-red-700/18 dark:bg-red-900/20 dark:text-red-200 dark:shadow-none dark:inset-ring-red-300/18',
}

/** Shows a boxed status message. */
const Alert: Stateless<AlertProps> = ({
	tone = 'success',
	class: classes,
	children,
	...props
}) => (
	<div {...props} class={clsx('p-4 rounded-lg shadow-xs inset-ring', toneClass[tone], classes)}>
		{children}
	</div>
)

export default Alert
