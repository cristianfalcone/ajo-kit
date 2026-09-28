import type { Args, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, part } from 'ajo-ui/utils'
import { Separator, type SeparatorArgs } from './separator'

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

export type ItemSeparatorArgs = SeparatorArgs

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
export type ItemDescriptionArgs = WithChildren<IntrinsicElements['p'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

// Only a link or button row takes the hover tint: a static row is not a target.
const itemBase = 'group/item flex w-full flex-wrap items-center rounded-md text-sm transition-colors duration-100 playa-focus [&:is(a,button)]:hover:bg-accent [&:is(a,button)]:hover:text-accent-foreground'
const variantClasses: Record<ItemVariant, string> = {
	default: 'bg-transparent',
	muted: 'bg-muted/50',
	outline: 'edge bg-transparent',
}
const itemSizes: Record<ItemSize, string> = {
	default: 'gap-4 p-4',
	sm: 'gap-3 px-4 py-3',
	xs: 'gap-2 px-3 py-2 text-xs',
}
const mediaBase = 'flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none'
const mediaVariants: Record<ItemMediaVariant, string> = {
	default: 'bg-transparent',
	icon: 'size-8 rounded-sm edge bg-muted [&_svg:not([class*=size-])]:size-4',
	image: 'size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover',
}

/**
 * Container for grouping related items, a `group` by default. Outline items in
 * a group share one surface with a hairline between rows and no gap; spaced
 * cards are outline Items in a plain grid, not an ItemGroup. For list
 * semantics pass `role="list"` and give each row `role="listitem"` (a link row
 * goes inside one).
 */
const ItemGroup: Stateless<ItemGroupArgs> = ({ class: classes, role = 'group', ...attrs }) => (
	<div {...attrs} class={clx('group/item-group playa-item-group flex flex-col', classes)} data-slot="item-group" role={role} />
)

/** Horizontal separator between items in an item group. */
const ItemSeparator = part<ItemSeparatorArgs>(Separator, 'item-separator', { class: 'my-0' })

/** Main item surface for content, media, and actions. */
const Item: Stateless<ItemArgs> = ({
	as: Tag = 'div',
	class: classes,
	size = 'default',
	variant = 'default',
	...attrs
}) => (
	<Tag
		{...(attrs as Args)}
		class={clx(itemBase, variantClasses[variant], itemSizes[size], classes)}
		data-size={size}
		data-slot="item"
		data-variant={variant}
	/>
)

/** Media slot for icons, images, avatars, or custom visual content. */
const ItemMedia: Stateless<ItemMediaArgs> = ({ class: classes, variant = 'default', ...attrs }) => (
	<div {...attrs} class={clx(mediaBase, mediaVariants[variant], classes)} data-slot="item-media" data-variant={variant} />
)

/** Primary content column for title and description. */
const ItemContent = part<ItemContentArgs>('div', 'item-content', { class: 'flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none' })

/** Item title text. */
const ItemTitle = part<ItemTitleArgs>('div', 'item-title', { class: 'flex w-fit items-center gap-2 text-sm font-medium' })

/** Item descriptive text. */
const ItemDescription = part<ItemDescriptionArgs>('p', 'item-description', { class: 'playa-inline-links line-clamp-2 text-balance text-sm font-normal text-muted-foreground' })

/** Action slot for buttons, menus, or status controls. */
const ItemActions = part<ItemActionsArgs>('div', 'item-actions', { class: 'flex items-center gap-2' })

export {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
}
