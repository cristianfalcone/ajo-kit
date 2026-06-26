import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type Tag = 'a' | 'div' | 'form' | 'section'

type PanelBaseProps = WithChildren<{
	as?: Tag
	clip?: boolean
	padding?: 'lg' | 'md' | 'none' | 'sm'
	radius?: 'lg' | 'xl'
	variant?: 'glass' | 'solid'
	class?: string
}>

type PanelProps =
	| (PanelBaseProps & IntrinsicElements['a'] & { as: 'a' })
	| (PanelBaseProps & IntrinsicElements['form'] & { as: 'form' })
	| (PanelBaseProps & IntrinsicElements['section'] & { as: 'section' })
	| (PanelBaseProps & IntrinsicElements['div'] & { as?: 'div' })

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
	as = 'div',
	clip,
	padding: space = 'md',
	radius: curve = 'lg',
	variant: surface = 'glass',
	class: classes,
	children,
	...props
}) => {
	const styles = clsx(variant[surface], radius[curve], padding[space], clip && 'overflow-hidden', classes)

	if (as === 'a') {
		const anchor = props as IntrinsicElements['a']

		return <a {...anchor} class={styles}>{children}</a>
	}

	if (as === 'form') {
		const form = props as IntrinsicElements['form']

		return <form {...form} class={styles}>{children}</form>
	}

	if (as === 'section') {
		const section = props as IntrinsicElements['section']

		return <section {...section} class={styles}>{children}</section>
	}

	const div = props as IntrinsicElements['div']

	return <div {...div} class={styles}>{children}</div>
}

export default Panel
