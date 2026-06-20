import type { IntrinsicElements, Stateless } from 'ajo'
import clsx from 'clsx'

type InputProps = IntrinsicElements['input'] & {
	type?: 'email' | 'password' | 'text'
	height?: 'lg' | 'md'
	tone?: 'danger' | 'default' | 'muted'
	width?: 'full' | 'sm' | 'xs'
	label?: string
	hint?: string
	wrapper?: string
	class?: string
}

const label = {
	default: 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1',
	danger: 'block text-sm font-medium text-red-700 dark:text-red-300 mb-1',
	muted: 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1',
}

const hint = 'mt-1 text-xs text-slate-500 dark:text-slate-400'

const base = 'border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-accent focus:border-transparent'

const heightClass = {
	md: 'h-10 px-4 py-2',
	lg: 'h-11 px-4 py-2.5',
}

const toneClass = {
	default: '',
	danger: 'border-red-300 dark:border-red-700 focus:ring-red-500',
	muted: 'bg-slate-100 dark:bg-white/10',
}

const widthClass = {
	full: '',
	sm: 'max-w-sm',
	xs: 'max-w-xs',
}

/** Renders a labeled text-like input with shared ajo-kit field styling. */
const Input: Stateless<InputProps> = ({
	type = 'text',
	height = 'md',
	tone = 'default',
	width = 'full',
	label: text,
	hint: help,
	placeholder,
	wrapper,
	class: classes,
	'aria-label': aria,
	...props
}) => (
	<label class={clsx('block', wrapper)}>
		{text && <span class={label[tone]}>{text}</span>}
		<input
			{...props}
			type={type}
			placeholder={placeholder}
			aria-label={aria ?? (text ? undefined : placeholder)}
			class={clsx('w-full', base, heightClass[height], toneClass[tone], widthClass[width], classes)}
		/>
		{help && <p class={hint}>{help}</p>}
	</label>
)

export default Input
