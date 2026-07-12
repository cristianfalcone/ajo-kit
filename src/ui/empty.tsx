import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

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

type EmptyMediaVariantOptions = {
	class?: string
	variant?: EmptyMediaVariant
}

const rootBase = 'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12'
const headerBase = 'flex max-w-sm flex-col items-center gap-2 text-center'
const mediaBase = 'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0'
const mediaVariants: Record<EmptyMediaVariant, string> = {
	default: 'bg-transparent',
	icon: 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*=size-])]:size-6',
}
const titleBase = 'text-lg font-medium tracking-tight'
const descriptionBase = 'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary'
const contentBase = 'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance'

/** Returns the UnoCSS class list for an `EmptyMedia` slot. */
export const emptyMediaVariants = ({
	class: classes,
	variant = 'default',
}: EmptyMediaVariantOptions = {}) => clsx(mediaBase, mediaVariants[variant], classes)

/** Empty-state wrapper for placeholder content and actions. */
const Empty: Stateless<EmptyArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(rootBase, classes)} data-slot="empty">
		{children}
	</div>
)

/** Header slot for empty-state media, title, and description. */
const EmptyHeader: Stateless<EmptyHeaderArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(headerBase, classes)} data-slot="empty-header">
		{children}
	</div>
)

/** Media slot for empty-state icons, avatars, or illustrations. */
const EmptyMedia: Stateless<EmptyMediaArgs> = ({
	children,
	class: classes,
	variant = 'default',
	...attrs
}) => (
	<div
		{...attrs}
		class={emptyMediaVariants({ class: classes, variant })}
		data-slot="empty-media"
		data-variant={variant}
	>
		{children}
	</div>
)

/** Title slot for empty-state copy. */
const EmptyTitle: Stateless<EmptyTitleArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(titleBase, classes)} data-slot="empty-title">
		{children}
	</div>
)

/** Description slot for empty-state explanatory copy. */
const EmptyDescription: Stateless<EmptyDescriptionArgs> = ({ children, class: classes, ...attrs }) => (
	<p {...attrs} class={clsx(descriptionBase, classes)} data-slot="empty-description">
		{children}
	</p>
)

/** Content slot for empty-state actions, inputs, or links. */
const EmptyContent: Stateless<EmptyContentArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(contentBase, classes)} data-slot="empty-content">
		{children}
	</div>
)

export {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
}
