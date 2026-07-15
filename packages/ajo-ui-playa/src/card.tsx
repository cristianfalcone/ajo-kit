import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

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

type CardVariantOptions = {
	class?: string
	size?: CardSize
}

// A Table inside a card melts into the card frame: the wrapper's own
// rounded-lg edge would double the card's hairline at a mismatched radius.
const base = 'group/card flex flex-col gap-[var(--card-spacing)] overflow-hidden rounded-xl glass edge py-[var(--card-spacing)] shadow-xs has-[>img:first-child]:pt-0 [&>img:first-child]:rounded-t-xl [&>img:last-child]:rounded-b-xl [&_[data-slot=table-container]]:rounded-[0px] [&_[data-slot=table-container]]:outline-none'

const sizes: Record<CardSize, string> = {
	default: '[--card-spacing:1.5rem]',
	sm: '[--card-spacing:1rem] text-sm',
}

/** Returns the UnoCSS class list for a card root. */
export const cardVariants = ({
	class: classes,
	size = 'default',
}: CardVariantOptions = {}) => clsx(base, sizes[size], classes)

/** Structured content container with header, body, and footer slots. */
const Card: Stateless<CardArgs> = ({
	as = 'div',
	class: classes,
	children,
	'data-slot': slot = 'card',
	size = 'default',
	...attrs
}) => {
	const styles = cardVariants({ class: classes, size })
	if (as === 'a') return <a {...(attrs as IntrinsicElements['a'])} class={styles} data-size={size} data-slot={slot} href={String((attrs as IntrinsicElements['a']).href)}>{children}</a>
	if (as === 'article') return <article {...(attrs as IntrinsicElements['article'])} class={styles} data-size={size} data-slot={slot}>{children}</article>
	if (as === 'form') return <form {...(attrs as IntrinsicElements['form'])} class={styles} data-size={size} data-slot={slot}>{children}</form>
	if (as === 'section') return <section {...(attrs as IntrinsicElements['section'])} class={styles} data-size={size} data-slot={slot}>{children}</section>
	return <div {...(attrs as IntrinsicElements['div'])} class={styles} data-size={size} data-slot={slot}>{children}</div>
}

/** Header slot for card titles, descriptions, and actions. */
const CardHeader: Stateless<CardSlotArgs> = ({
	class: classes,
	children,
	'data-slot': slot = 'card-header',
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx('@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-[var(--card-spacing)] has-[>[data-slot=card-action]]:grid-cols-[1fr_auto] [&.border-b]:pb-[var(--card-spacing)]', classes)}
		data-slot={slot}
	>
		{children}
	</div>
)

/** Title slot for `CardHeader`. */
const CardTitle: Stateless<CardSlotArgs> = ({
	class: classes,
	children,
	'data-slot': slot = 'card-title',
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx('font-semibold leading-none', classes)}
		data-slot={slot}
	>
		{children}
	</div>
)

/** Helper text slot for `CardHeader`. */
const CardDescription: Stateless<CardSlotArgs> = ({
	class: classes,
	children,
	'data-slot': slot = 'card-description',
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx('text-sm text-muted-foreground', classes)}
		data-slot={slot}
	>
		{children}
	</div>
)

/** Header action slot, aligned to the top-right. */
const CardAction: Stateless<CardSlotArgs> = ({
	class: classes,
	children,
	'data-slot': slot = 'card-action',
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx('col-start-2 row-span-2 row-start-1 self-start justify-self-end', classes)}
		data-slot={slot}
	>
		{children}
	</div>
)

/** Main body slot for card content. */
const CardContent: Stateless<CardSlotArgs> = ({
	class: classes,
	children,
	'data-slot': slot = 'card-content',
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx('px-[var(--card-spacing)]', classes)}
		data-slot={slot}
	>
		{children}
	</div>
)

/** Footer slot for actions and secondary content. */
const CardFooter: Stateless<CardSlotArgs> = ({
	class: classes,
	children,
	'data-slot': slot = 'card-footer',
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx('flex items-center px-[var(--card-spacing)] [&.border-t]:pt-[var(--card-spacing)]', classes)}
		data-slot={slot}
	>
		{children}
	</div>
)

export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
}
export default Card
