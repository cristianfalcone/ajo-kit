import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, part } from 'ajo-ui/utils'

export type EmptyMediaVariant =
	| 'default'
	| 'icon'

type EmptySlotArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Slot marker for composed empty-state variants. */
	'data-slot'?: string
}>

export type EmptyArgs = EmptySlotArgs
export type EmptyHeaderArgs = EmptySlotArgs
export type EmptyTitleArgs = EmptySlotArgs
export type EmptyContentArgs = EmptySlotArgs

export type EmptyMediaArgs = EmptySlotArgs & {
	/** Visual treatment for the media container. */
	variant?: EmptyMediaVariant
}

export type EmptyDescriptionArgs = WithChildren<IntrinsicElements['p'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

const mediaBase = 'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0'
const mediaVariants: Record<EmptyMediaVariant, string> = {
	default: 'bg-transparent',
	// A 40 px enamel disc; the icon inside reads at 20 px.
	icon: 'size-10 rounded-full panel text-xl [&_svg:not([class*=size-])]:size-5',
}

/** Empty-state wrapper for placeholder content and actions. */
const Empty = part<EmptyArgs>('div', 'empty', { class: 'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12' })

/** Header slot for empty-state media, title, and description. */
const EmptyHeader = part<EmptyHeaderArgs>('div', 'empty-header', { class: 'flex max-w-sm flex-col items-center gap-2 text-center' })

/** Media slot for empty-state icons, avatars, or illustrations. */
const EmptyMedia: Stateless<EmptyMediaArgs> = ({ class: classes, variant = 'default', ...attrs }) => (
	<div {...attrs} class={clx(mediaBase, mediaVariants[variant], classes)} data-slot="empty-media" data-variant={variant} />
)

/** Title slot for empty-state copy. */
const EmptyTitle = part<EmptyTitleArgs>('div', 'empty-title', { class: 'text-base font-medium' })

/** Description slot for empty-state explanatory copy. */
const EmptyDescription = part<EmptyDescriptionArgs>('p', 'empty-description', { class: 'playa-inline-links text-sm text-muted-foreground text-pretty' })

/** Content slot for empty-state actions, inputs, or links. */
const EmptyContent = part<EmptyContentArgs>('div', 'empty-content', { class: 'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance' })

export {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
}
