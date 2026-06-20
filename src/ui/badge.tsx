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
	primary: 'bg-primary text-white inset-ring-white/10 dark:bg-accent dark:text-primary dark:inset-ring-white/15',
	neutral: 'bg-[#edf4f3]/80 text-slate-700 inset-ring-slate-900/10 dark:bg-white/10 dark:text-slate-300 dark:inset-ring-white/10',
	success: 'bg-green-100/80 text-green-800 inset-ring-green-700/15 dark:bg-green-900/40 dark:text-green-300 dark:inset-ring-green-300/15',
	warning: 'bg-amber-100/75 text-amber-700 inset-ring-amber-700/15 dark:bg-amber-400/10 dark:text-amber-300 dark:inset-ring-amber-300/15',
	danger: 'bg-red-500 text-white inset-ring-white/15',
}

/** Small status or role label. */
export const Badge: Stateless<BadgeProps> = ({
	tone = 'neutral',
	class: classes,
	children,
	...props
}) => (
	<span {...props} class={clsx('inline-flex px-2 py-0.5 rounded text-xs font-medium inset-ring', toneClass[tone], classes)}>
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
		class={clsx('inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white inset-ring inset-ring-white/15 shadow-xs shadow-red-900/15 dark:shadow-none', classes)}
	>
		{count}
	</span>
)

export default Badge
