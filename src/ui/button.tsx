import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type ButtonProps = WithChildren<IntrinsicElements['button'] & {
	height?: 'lg' | 'md'
	icon?: string
	tone?: 'danger' | 'neutral' | 'primary' | 'warning'
	wide?: boolean
	class?: string
}>

const base = 'inline-flex items-center justify-center transition disabled:cursor-not-allowed'

const variantClass = {
	button: 'border border-transparent text-sm font-medium rounded-lg',
	icon: 'rounded transition-colors disabled:opacity-50',
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
		primary: 'bg-primary hover:bg-primary/85 disabled:bg-primary/60 dark:bg-accent dark:hover:bg-accent/85 dark:disabled:bg-accent/60 dark:text-primary text-white',
		danger: 'bg-red-600 hover:bg-red-500 disabled:bg-red-400 text-white',
		neutral: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15',
		warning: 'bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white',
	},
	icon: {
		primary: 'text-primary hover:bg-primary/10 dark:text-accent dark:hover:bg-accent/15',
		danger: 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10',
		neutral: 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10',
		warning: 'text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:text-orange-400 dark:hover:bg-orange-500/10',
	},
}

/** Shared button surface for form actions and icon-only controls. */
const Button: Stateless<ButtonProps> = ({
	height = 'md',
	icon,
	tone,
	wide,
	class: classes,
	children,
	title,
	'aria-label': aria,
	...props
}) => {
	const variant = icon ? 'icon' : 'button'
	const color = tone ?? (icon ? 'neutral' : 'primary')

	return (
		<button
			{...props}
			title={title}
			aria-label={aria ?? (icon ? title : undefined)}
			class={clsx(base, variantClass[variant], heightClass[variant][height], toneClass[variant][color], wide && 'w-full', classes)}
		>
			{icon && <span class={clsx(icon, 'w-4 h-4 block')} />}
			{children}
		</button>
	)
}

export default Button
