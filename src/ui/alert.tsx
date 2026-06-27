import type { Children, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type AlertProps = WithChildren<IntrinsicElements['div'] & {
	/** Optional tone of the alert, which affects its color. */
	tone?: 'danger' | 'success'
	/** Optional icon class shown to the left of the message. */
	icon?: string
	/** Optional one or more actions rendered to the right. */
	actions?: Children
	/** Optional additional classes to apply to the alert. */
	class?: string
}>

const toneClass = {
	success: 'bg-green-50/85 text-green-800 shadow-green-900/5 inset-ring-green-700/18 dark:bg-green-900/20 dark:text-green-200 dark:shadow-none dark:inset-ring-green-300/18',
	danger: 'bg-red-50/85 text-red-800 shadow-red-900/5 inset-ring-red-700/18 dark:bg-red-900/20 dark:text-red-200 dark:shadow-none dark:inset-ring-red-300/18',
}

/** Shows a boxed status message, optionally with an icon and actions. */
const Alert: Stateless<AlertProps> = ({
	tone = 'success',
	icon,
	actions,
	class: classes,
	children,
	...props
}) => (
	<div {...props} class={clsx('p-4 rounded-lg shadow-xs inset-ring', toneClass[tone], classes)}>
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<div class="flex-1 min-w-0 flex items-start gap-3">
				{icon && <span class={clsx(icon, 'w-5 h-5 shrink-0 mt-0.5')} aria-hidden="true" />}
				<div class="min-w-0">{children}</div>
			</div>
			{actions && <div class="flex items-center gap-2 shrink-0 max-sm:w-full max-sm:[&>*]:flex-1">{actions}</div>}
		</div>
	</div>
)

export default Alert
