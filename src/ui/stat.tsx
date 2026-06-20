import type { IntrinsicElements, Stateless } from 'ajo'
import clsx from 'clsx'
import Panel from '/src/ui/panel'

type StatProps = IntrinsicElements['div'] & {
	icon: string
	label: string
	value: number | string
	href?: string
	tone?: 'accent' | 'danger'
	class?: string
}

const toneClass = {
	accent: {
		icon: 'bg-accent/10 inset-ring-accent/15 dark:bg-accent/15 dark:inset-ring-accent/20',
		text: 'text-accent',
		value: 'text-slate-900 dark:text-white',
	},
	danger: {
		icon: 'bg-red-500/10 inset-ring-red-500/15 dark:bg-red-400/15 dark:inset-ring-red-300/20',
		text: 'text-red-500 dark:text-red-400',
		value: 'text-red-600 dark:text-red-400',
	},
}

/** Displays a compact metric card with a leading icon. */
const Stat: Stateless<StatProps> = ({
	icon,
	label,
	value,
	href,
	tone = 'accent',
	class: classes,
	...props
}) => (
	<Panel
		{...props}
		as={href ? 'a' : 'div'}
		href={href}
		padding="none"
		class={clsx('p-5 flex items-center gap-4', href && 'hover:shadow-sm hover:shadow-slate-900/10 transition-shadow', classes)}
	>
		<div class={clsx('flex items-center justify-center w-12 h-12 rounded-lg inset-ring', toneClass[tone].icon)}>
			<span class={clsx(icon, 'w-6 h-6', toneClass[tone].text)} />
		</div>
		<div>
			<p class={clsx('text-2xl font-bold', toneClass[tone].value)}>{value}</p>
			<p class="text-sm text-slate-500 dark:text-slate-400">{label}</p>
		</div>
	</Panel>
)

export default Stat
