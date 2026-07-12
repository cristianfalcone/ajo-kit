import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

export type MarkerVariant = 'border' | 'default' | 'separator'
export type MarkerAs = 'a' | 'button' | 'div' | 'span'

type MarkerBaseArgs = WithChildren<{
	/** Semantic element used for the marker root. Use `a` or `button` for interactive markers. */
	as?: MarkerAs
	/** Visual marker layout. */
	variant?: MarkerVariant
	/** Additional UnoCSS classes. */
	class?: string
}>

type MarkerAsAnchor = MarkerBaseArgs & IntrinsicElements['a'] & {
	as: 'a'
	href: string
}

type MarkerAsButton = MarkerBaseArgs & IntrinsicElements['button'] & {
	as: 'button'
	href?: undefined
}

type MarkerAsDiv = MarkerBaseArgs & IntrinsicElements['div'] & {
	as?: 'div'
	href?: undefined
}

type MarkerAsSpan = MarkerBaseArgs & IntrinsicElements['span'] & {
	as: 'span'
	href?: undefined
}

export type MarkerArgs =
	| MarkerAsAnchor
	| MarkerAsButton
	| MarkerAsDiv
	| MarkerAsSpan

export type MarkerIconArgs = WithChildren<IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type MarkerContentArgs = WithChildren<IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

type MarkerVariantOptions = {
	class?: string
	variant?: MarkerVariant
}

const base = 'group/marker relative flex min-h-4 w-full items-center gap-2 text-left text-sm text-muted-foreground [&_svg:not([class*=size-])]:size-4 [&_a]:underline [&_a]:underline-offset-3 [&_a:hover]:text-foreground'
const variants: Record<MarkerVariant, string> = {
	default: '',
	border: 'border-b border-border pb-2',
	separator: 'before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-border after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-border',
}

/** Returns the UnoCSS class list for a marker variant. */
export const markerVariants = ({
	class: classes,
	variant = 'default',
}: MarkerVariantOptions = {}) => clsx(base, variants[variant], classes)

/** Inline conversation marker for status updates, notes, separators, and bordered rows. */
const Marker: Stateless<MarkerArgs> = ({
	as = 'div',
	children,
	class: classes,
	variant = 'default',
	...attrs
}) => {
	const styles = markerVariants({ class: classes, variant })

	if (as === 'a') return <a {...(attrs as IntrinsicElements['a'])} class={styles} data-slot="marker" data-variant={variant}>{children}</a>
	if (as === 'button') {
		const button = attrs as IntrinsicElements['button']
		return <button {...button} class={styles} data-slot="marker" data-variant={variant} type={button.type ?? 'button'}>{children}</button>
	}
	if (as === 'span') return <span {...(attrs as IntrinsicElements['span'])} class={styles} data-slot="marker" data-variant={variant}>{children}</span>
	return <div {...(attrs as IntrinsicElements['div'])} class={styles} data-slot="marker" data-variant={variant}>{children}</div>
}

/** Decorative icon slot for Marker. */
const MarkerIcon: Stateless<MarkerIconArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<span
		{...attrs}
		aria-hidden="true"
		class={clsx('size-4 shrink-0 [&_svg:not([class*=size-])]:size-4', classes)}
		data-slot="marker-icon"
	>
		{children}
	</span>
)

/** Text content slot for Marker. */
const MarkerContent: Stateless<MarkerContentArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<span
		{...attrs}
		class={clsx('min-w-0 break-words group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center [&_a]:underline [&_a]:underline-offset-3 [&_a:hover]:text-foreground', classes)}
		data-slot="marker-content"
	>
		{children}
	</span>
)

export { Marker, MarkerContent, MarkerIcon }
