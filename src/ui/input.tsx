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

const base = 'rounded-lg bg-[#fbfdfb]/88 text-slate-900 shadow-xs shadow-slate-900/5 inset-ring inset-ring-slate-900/12 transition placeholder:text-slate-400 focus:inset-ring-2 focus:inset-ring-accent/70 disabled:cursor-not-allowed disabled:bg-[#e5eceb] disabled:text-slate-500 dark:bg-white/8 dark:text-white dark:shadow-none dark:inset-ring-white/12 dark:placeholder:text-slate-500'

const heightClass = {
	md: 'h-10 px-4 py-2',
	lg: 'h-11 px-4 py-2.5',
}

const toneClass = {
	default: '',
	danger: 'inset-ring-red-500/30 focus:inset-ring-red-500/70 dark:inset-ring-red-400/30 dark:focus:inset-ring-red-400/70',
	muted: 'bg-[#e8f0ef]/80 dark:bg-white/10',
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
