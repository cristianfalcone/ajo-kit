import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type Tag = 'a' | 'div' | 'form' | 'section'

type PanelProps = WithChildren<IntrinsicElements['div'] & {
	as?: Tag
	clip?: boolean
	padding?: 'lg' | 'md' | 'none' | 'sm'
	radius?: 'lg' | 'xl'
	variant?: 'glass' | 'solid'
	class?: string
}>

const variant = {
	glass: 'bg-gradient-to-br from-slate-100/80 via-slate-50/60 to-slate-100/70 backdrop-blur ring-1 ring-slate-200/50 dark:from-white/10 dark:via-white/5 dark:to-white/8 dark:ring-white/10',
	solid: 'ring-1 ring-border bg-white shadow-sm dark:bg-white/5 dark:ring-white/10 dark:shadow-none',
}

const padding = {
	none: '',
	sm: 'p-4',
	md: 'p-6',
	lg: 'p-8',
}

const radius = {
	lg: 'rounded-lg',
	xl: 'rounded-xl',
}

/** Shared panel surface for app cards, forms, and framed content. */
const Panel: Stateless<PanelProps> = ({
	as: Tag = 'div',
	clip,
	padding: space = 'md',
	radius: curve = 'lg',
	variant: surface = 'glass',
	class: classes,
	children,
	...props
}) => (
	{
		...props,
		nodeName: Tag,
		class: clsx(variant[surface], radius[curve], padding[space], clip && 'overflow-hidden', classes),
		children,
	}
)

export default Panel
