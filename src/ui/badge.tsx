import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type BadgeProps = WithChildren<IntrinsicElements['span'] & {
	tone?: 'danger' | 'neutral' | 'primary' | 'success' | 'warning'
	class?: string
}>

type CountBadgeProps = IntrinsicElements['span'] & {
	count: number
	class?: string
}

const toneClass = {
	primary: 'bg-primary text-white dark:bg-accent dark:text-primary',
	neutral: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300',
	success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
	warning: 'text-amber-600 dark:text-amber-400',
	danger: 'bg-red-500 text-white',
}

/** Small status or role label. */
export const Badge: Stateless<BadgeProps> = ({
	tone = 'neutral',
	class: classes,
	children,
	...props
}) => (
	<span {...props} class={clsx('inline-flex px-2 py-0.5 rounded text-xs font-medium', toneClass[tone], classes)}>
		{children}
	</span>
)

/** Compact numeric badge used for unread counts. */
export const CountBadge: Stateless<CountBadgeProps> = ({
	count,
	class: classes,
	...props
}) => (
	<span
		{...props}
		class={clsx('inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white', classes)}
	>
		{count}
	</span>
)

export default Badge
