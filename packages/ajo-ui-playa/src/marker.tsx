import type { Args, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, part } from 'ajo-ui/utils'

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

export type MarkerContentArgs = MarkerIconArgs

const base = 'group/marker relative flex min-h-4 w-full items-center gap-2 text-left text-sm text-muted-foreground [&_svg:not([class*=size-])]:size-4 [&_a]:underline [&_a]:underline-offset-3 [&_a:hover]:text-foreground'
const variants: Record<MarkerVariant, string> = {
	default: '',
	border: 'border-b border-border pb-2',
	separator: 'before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-border after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-border',
}

/** Inline conversation marker for status updates, notes, separators, and bordered rows. */
const Marker: Stateless<MarkerArgs> = ({
	as: Tag = 'div',
	class: classes,
	type = 'button',
	variant = 'default',
	...attrs
}) => (
	<Tag
		{...(attrs as Args)}
		class={clx(base, variants[variant], classes)}
		data-slot="marker"
		data-variant={variant}
		type={Tag === 'button' ? type : undefined}
	/>
)

/** Decorative icon slot for Marker. */
const MarkerIcon = part<MarkerIconArgs>('span', 'marker-icon', { 'aria-hidden': 'true', class: 'size-4 shrink-0 [&_svg:not([class*=size-])]:size-4' })

/** Text content slot for Marker. */
const MarkerContent = part<MarkerContentArgs>('span', 'marker-content', { class: 'min-w-0 break-words group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center [&_a]:underline [&_a]:underline-offset-3 [&_a:hover]:text-foreground' })

export { Marker, MarkerContent, MarkerIcon }
