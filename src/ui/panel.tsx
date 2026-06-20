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
	glass: 'bg-[#f8fbf9]/78 supports-[backdrop-filter]:bg-[#f8fbf9]/66 backdrop-blur-md shadow-xs shadow-slate-900/8 inset-ring inset-ring-slate-900/10 dark:bg-white/8 dark:supports-[backdrop-filter]:bg-white/7 dark:shadow-none dark:inset-ring-white/10',
	solid: 'bg-[#fbfdfb] shadow-xs shadow-slate-900/7 inset-ring inset-ring-slate-900/10 dark:bg-white/5 dark:shadow-none dark:inset-ring-white/10',
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
