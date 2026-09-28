import type { Args, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, part } from 'ajo-ui/utils'

export type CardSize =
	| 'default'
	| 'sm'

type CardTag = 'a' | 'article' | 'div' | 'form' | 'section'

type CardBaseArgs = WithChildren<{
	/** Semantic element for the card root. Defaults to `div`. */
	as?: CardTag
	/** Card spacing size. */
	size?: CardSize
	/** Additional UnoCSS classes. */
	class?: string
	/** Slot marker for composed card variants. */
	'data-slot'?: string
}>

type CardAsAnchor = CardBaseArgs & IntrinsicElements['a'] & {
	as: 'a'
	href: string
}

type CardAsArticle = CardBaseArgs & IntrinsicElements['article'] & {
	as: 'article'
}

type CardAsForm = CardBaseArgs & IntrinsicElements['form'] & {
	as: 'form'
}

type CardAsSection = CardBaseArgs & IntrinsicElements['section'] & {
	as: 'section'
}

type CardAsDiv = CardBaseArgs & IntrinsicElements['div'] & {
	as?: 'div'
}

export type CardArgs =
	| CardAsAnchor
	| CardAsArticle
	| CardAsDiv
	| CardAsForm
	| CardAsSection

type CardSlotArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Slot marker for composed card variants. */
	'data-slot'?: string
}>

// Enamel: a flat fill with a hairline and no resting shadow. Media placed
// first (an image, video, figure or AspectRatio) sits flush with the top, and
// the card's radius clips it; any other first child, such as the wrapper of a
// stateful page or a form, keeps the top padding. A Table
// inside a card melts into the card frame: the wrapper's own rounded-lg
// outline would double the card's hairline at a mismatched radius.
const base = 'group/card flex flex-col gap-6 overflow-hidden rounded-lg panel py-6 data-[size=sm]:gap-4 data-[size=sm]:py-4 data-[size=sm]:text-sm has-[>:is(img,picture,video,figure,[data-slot=aspect-ratio]):first-child]:pt-0 [&_[data-slot=table-container]]:rounded-[0px] [&_[data-slot=table-container]]:outline-none'

// The inline padding of the header, content and footer follows the card's size.
const inset = 'px-6 group-data-[size=sm]/card:px-4'

/** Structured content container with header, body, and footer slots. */
const Card: Stateless<CardArgs> = ({
	as: Tag = 'div',
	class: classes,
	'data-slot': slot = 'card',
	size = 'default',
	...attrs
}) => (
	<Tag {...(attrs as Args)} class={clx(base, classes)} data-size={size} data-slot={slot} />
)

/** Header slot for card titles, descriptions, and actions. */
const CardHeader = part<CardSlotArgs>('div', 'card-header', { class: clx('@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 has-[>[data-slot=card-action]]:grid-cols-[1fr_auto] [&.border-b]:pb-6 group-data-[size=sm]/card:[&.border-b]:pb-4', inset) })

/** Title slot for `CardHeader`. */
const CardTitle = part<CardSlotArgs>('div', 'card-title', { class: 'self-baseline font-medium' })

/** Helper text slot for `CardHeader`, across the full header width below the title and action. */
const CardDescription = part<CardSlotArgs>('div', 'card-description', { class: 'col-span-full text-sm text-muted-foreground' })

/** Header action slot, at the end of the title line and on its baseline. */
const CardAction = part<CardSlotArgs>('div', 'card-action', { class: 'col-start-2 row-start-1 self-baseline justify-self-end' })

/** Main body slot for card content. */
const CardContent = part<CardSlotArgs>('div', 'card-content', { class: inset })

/** Footer slot for actions and secondary content. */
const CardFooter = part<CardSlotArgs>('div', 'card-footer', { class: clx('flex items-center [&.border-t]:pt-6 group-data-[size=sm]/card:[&.border-t]:pt-4', inset) })

export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
}
