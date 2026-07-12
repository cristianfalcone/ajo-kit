import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

export type ItemVariant =
	| 'default'
	| 'muted'
	| 'outline'

export type ItemSize =
	| 'default'
	| 'sm'
	| 'xs'

export type ItemMediaVariant =
	| 'default'
	| 'icon'
	| 'image'

type ItemBaseArgs = WithChildren<{
	/** Semantic element to render. Prefer this over React/Radix `asChild`. */
	as?: 'a' | 'button' | 'div'
	/** Visual size. */
	size?: ItemSize
	/** Visual style. */
	variant?: ItemVariant
	/** Additional UnoCSS classes. */
	class?: string
}>

type ItemAsDiv = ItemBaseArgs & IntrinsicElements['div'] & {
	as?: 'div'
	href?: undefined
}

type ItemAsAnchor = ItemBaseArgs & IntrinsicElements['a'] & {
	as: 'a'
	href: string
}

type ItemAsButton = ItemBaseArgs & IntrinsicElements['button'] & {
	as: 'button'
}

export type ItemArgs = ItemAsAnchor | ItemAsButton | ItemAsDiv

export type ItemGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type ItemSeparatorArgs = IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type ItemMediaArgs = WithChildren<IntrinsicElements['div'] & {
	/** Media presentation style. */
	variant?: ItemMediaVariant
	/** Additional UnoCSS classes. */
	class?: string
}>

type ItemSlotArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Slot marker for composed item variants. */
	'data-slot'?: string
}>

export type ItemContentArgs = ItemSlotArgs
export type ItemTitleArgs = ItemSlotArgs
export type ItemActionsArgs = ItemSlotArgs
export type ItemHeaderArgs = ItemSlotArgs
export type ItemFooterArgs = ItemSlotArgs
export type ItemDescriptionArgs = WithChildren<IntrinsicElements['p'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

const itemBase = 'group/item flex w-full flex-wrap items-center rounded-md text-sm transition-colors duration-100 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-accent hover:text-accent-foreground'
const variantClasses: Record<ItemVariant, string> = {
	default: 'bg-transparent',
	muted: 'bg-muted/50',
	outline: 'edge bg-transparent',
}
const itemSizes: Record<ItemSize, string> = {
	default: 'gap-4 p-4',
	sm: 'gap-2.5 px-4 py-3',
	xs: 'gap-2 px-2.5 py-2 text-xs',
}
const mediaBase = 'flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none'
const mediaVariants: Record<ItemMediaVariant, string> = {
	default: 'bg-transparent',
	icon: 'size-8 rounded-sm edge bg-muted [&_svg:not([class*=size-])]:size-4',
	image: 'size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover',
}

/** Returns the UnoCSS class list for an Item root. */
export const itemVariants = ({
	class: classes,
	size = 'default',
	variant = 'default',
}: {
	class?: string
	size?: ItemSize
	variant?: ItemVariant
} = {}) => clsx(itemBase, variantClasses[variant], itemSizes[size], classes)

/** Container for grouping related items. */
const ItemGroup: Stateless<ItemGroupArgs> = ({ children, class: classes, role = 'list', ...attrs }) => (
	<div {...attrs} class={clsx('group/item-group flex flex-col', classes)} data-slot="item-group" role={role}>
		{children}
	</div>
)

/** Horizontal separator between items in an item group. */
const ItemSeparator: Stateless<ItemSeparatorArgs> = ({ class: classes, role = 'none', ...attrs }) => (
	<div {...attrs} class={clsx('my-0 h-px w-full shrink-0 bg-border', classes)} data-slot="item-separator" role={role} />
)

/** Main item surface for content, media, and actions. */
const Item: Stateless<ItemArgs> = ({
	as = 'div',
	children,
	class: classes,
	size = 'default',
	variant = 'default',
	...attrs
}) => {
	const styles = itemVariants({ class: classes, size, variant })

	if (as === 'a') {
		const anchor = attrs as IntrinsicElements['a']
		return (
			<a {...anchor} class={styles} data-size={size} data-slot="item" data-variant={variant} href={String(anchor.href)}>
				{children}
			</a>
		)
	}

	if (as === 'button') {
		const button = attrs as IntrinsicElements['button']
		return (
			<button {...button} class={styles} data-size={size} data-slot="item" data-variant={variant}>
				{children}
			</button>
		)
	}

	const div = attrs as IntrinsicElements['div']
	return (
		<div {...div} class={styles} data-size={size} data-slot="item" data-variant={variant}>
			{children}
		</div>
	)
}

/** Media slot for icons, images, avatars, or custom visual content. */
const ItemMedia: Stateless<ItemMediaArgs> = ({ children, class: classes, variant = 'default', ...attrs }) => (
	<div {...attrs} class={clsx(mediaBase, mediaVariants[variant], classes)} data-slot="item-media" data-variant={variant}>
		{children}
	</div>
)

/** Primary content column for title and description. */
const ItemContent: Stateless<ItemContentArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx('flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none', classes)} data-slot="item-content">
		{children}
	</div>
)

/** Item title text. */
const ItemTitle: Stateless<ItemTitleArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx('flex w-fit items-center gap-2 text-sm font-medium leading-snug', classes)} data-slot="item-title">
		{children}
	</div>
)

/** Item descriptive text. */
const ItemDescription: Stateless<ItemDescriptionArgs> = ({ children, class: classes, ...attrs }) => (
	<p {...attrs} class={clsx('line-clamp-2 text-balance text-sm font-normal leading-normal text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary', classes)} data-slot="item-description">
		{children}
	</p>
)

/** Action slot for buttons, menus, or status controls. */
const ItemActions: Stateless<ItemActionsArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx('flex items-center gap-2', classes)} data-slot="item-actions">
		{children}
	</div>
)

/** Full-width item header slot. */
const ItemHeader: Stateless<ItemHeaderArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx('flex basis-full items-center justify-between gap-2', classes)} data-slot="item-header">
		{children}
	</div>
)

/** Full-width item footer slot. */
const ItemFooter: Stateless<ItemFooterArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx('flex basis-full items-center justify-between gap-2', classes)} data-slot="item-footer">
		{children}
	</div>
)

export {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemHeader,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
}
