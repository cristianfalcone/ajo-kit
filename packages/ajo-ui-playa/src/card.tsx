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

// A Table inside a card melts into the card frame: the wrapper's own
// rounded-lg edge would double the card's hairline at a mismatched radius.
const base = 'group/card flex flex-col gap-[var(--card-spacing)] overflow-hidden rounded-xl glass edge py-[var(--card-spacing)] shadow-xs has-[>img:first-child]:pt-0 [&>img:first-child]:rounded-t-xl [&>img:last-child]:rounded-b-xl [&_[data-slot=table-container]]:rounded-[0px] [&_[data-slot=table-container]]:outline-none'

const sizes: Record<CardSize, string> = {
	default: '[--card-spacing:1.5rem]',
	sm: '[--card-spacing:1rem] text-sm',
}

/** Structured content container with header, body, and footer slots. */
const Card: Stateless<CardArgs> = ({
	as: Tag = 'div',
	class: classes,
	'data-slot': slot = 'card',
	size = 'default',
	...attrs
}) => (
	<Tag {...(attrs as Args)} class={clx(base, sizes[size], classes)} data-size={size} data-slot={slot} />
)

/** Header slot for card titles, descriptions, and actions. */
const CardHeader = part<CardSlotArgs>('div', 'card-header', { class: '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-[var(--card-spacing)] has-[>[data-slot=card-action]]:grid-cols-[1fr_auto] [&.border-b]:pb-[var(--card-spacing)]' })

/** Title slot for `CardHeader`. */
const CardTitle = part<CardSlotArgs>('div', 'card-title', { class: 'font-semibold leading-none' })

/** Helper text slot for `CardHeader`. */
const CardDescription = part<CardSlotArgs>('div', 'card-description', { class: 'text-sm text-muted-foreground' })

/** Header action slot, aligned to the top-right. */
const CardAction = part<CardSlotArgs>('div', 'card-action', { class: 'col-start-2 row-span-2 row-start-1 self-start justify-self-end' })

/** Main body slot for card content. */
const CardContent = part<CardSlotArgs>('div', 'card-content', { class: 'px-[var(--card-spacing)]' })

/** Footer slot for actions and secondary content. */
const CardFooter = part<CardSlotArgs>('div', 'card-footer', { class: 'flex items-center px-[var(--card-spacing)] [&.border-t]:pt-[var(--card-spacing)]' })

export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
}
