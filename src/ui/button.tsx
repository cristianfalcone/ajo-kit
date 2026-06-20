import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type ButtonBaseProps = WithChildren<{
	height?: 'lg' | 'md'
	icon?: string
	tone?: 'danger' | 'neutral' | 'primary' | 'warning'
	wide?: boolean
	class?: string
}>

type ButtonProps = ButtonBaseProps & (
	| (IntrinsicElements['button'] & { to?: undefined })
	| (IntrinsicElements['a'] & { disabled?: boolean, to: string })
)

const base = 'inline-flex items-center justify-center transition disabled:cursor-not-allowed'

const variantClass = {
	button: 'text-sm font-medium rounded-lg shadow-xs shadow-slate-900/8 inset-ring inset-ring-slate-900/10 dark:shadow-none dark:inset-ring-white/10',
	icon: 'rounded-md transition disabled:opacity-50',
}

const heightClass = {
	button: {
		md: 'h-10 px-4',
		lg: 'h-11 px-4',
	},
	icon: {
		md: 'size-7',
		lg: 'size-8',
	},
}

const toneClass = {
	button: {
		primary: 'bg-primary text-white inset-ring-white/10 shadow-primary/15 hover:bg-primary/88 disabled:bg-primary/60 dark:bg-accent dark:text-primary dark:shadow-none dark:inset-ring-white/15 dark:hover:bg-accent/85 dark:disabled:bg-accent/60',
		danger: 'bg-red-600 text-white inset-ring-white/15 shadow-red-700/15 hover:bg-red-500 disabled:bg-red-400 dark:shadow-none',
		neutral: 'bg-[#f8fbf9]/80 text-slate-700 inset-ring-slate-900/12 hover:bg-[#fbfdfb] hover:text-slate-950 dark:bg-white/10 dark:text-slate-200 dark:inset-ring-white/10 dark:hover:bg-white/15',
		warning: 'bg-orange-600 text-white inset-ring-white/15 shadow-orange-700/15 hover:bg-orange-500 disabled:bg-orange-400 dark:shadow-none',
	},
	icon: {
		primary: 'text-primary hover:bg-primary/12 hover:shadow-xs hover:shadow-primary/10 hover:inset-ring hover:inset-ring-primary/20 dark:text-accent dark:hover:bg-accent/15 dark:hover:shadow-none dark:hover:inset-ring-accent/20',
		danger: 'text-slate-400 hover:text-red-600 hover:bg-red-100/80 hover:shadow-xs hover:shadow-red-900/15 hover:inset-ring hover:inset-ring-red-600/20 dark:hover:text-red-400 dark:hover:bg-red-500/12 dark:hover:shadow-none dark:hover:inset-ring-red-300/15',
		neutral: 'text-slate-500 hover:text-slate-950 hover:bg-[#d7e4e8]/85 hover:shadow-xs hover:shadow-slate-900/10 hover:inset-ring hover:inset-ring-slate-900/12 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 dark:hover:shadow-none dark:hover:inset-ring-white/12',
		warning: 'text-slate-400 hover:text-orange-600 hover:bg-orange-100/85 hover:shadow-xs hover:shadow-orange-900/15 hover:inset-ring hover:inset-ring-orange-600/20 dark:hover:text-orange-400 dark:hover:bg-orange-500/12 dark:hover:shadow-none dark:hover:inset-ring-orange-300/15',
	},
}

/** Shared button surface for form actions and icon-only controls. */
const Button: Stateless<ButtonProps> = ({
	height = 'md',
	disabled,
	icon,
	to,
	tone,
	wide,
	class: classes,
	children,
	title,
	'aria-label': aria,
	...props
}) => {
	const iconOnly = Boolean(icon && !children)
	const variant = iconOnly ? 'icon' : 'button'
	const color = tone ?? (iconOnly ? 'neutral' : 'primary')
	const blocked = Boolean(disabled)
	const content = (
		<>
			{icon && <span class={clsx(icon, 'w-4 h-4 block')} />}
			{children}
		</>
	)
	const styles = clsx(
		base,
		variantClass[variant],
		heightClass[variant][height],
		toneClass[variant][color],
		icon && !iconOnly ? 'gap-2' : undefined,
		wide && 'w-full',
		to && blocked && 'pointer-events-none opacity-60',
		classes as string | undefined,
	)

	if (to) {
		const anchor = props as IntrinsicElements['a']

		return (
			<a
				{...anchor}
				href={blocked ? undefined : to}
				title={title}
				aria-label={aria ?? (iconOnly ? title : undefined)}
				aria-disabled={blocked ? 'true' : undefined}
				tabIndex={blocked ? -1 : undefined}
				class={styles}
			>
				{content}
			</a>
		)
	}

	const button = props as IntrinsicElements['button']

	return (
		<button
			{...button}
			disabled={blocked}
			title={title}
			aria-label={aria ?? (iconOnly ? title : undefined)}
			class={styles}
		>
			{content}
		</button>
	)
}

export default Button
