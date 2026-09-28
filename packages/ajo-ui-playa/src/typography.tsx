import type { Args, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, part } from 'ajo-ui/utils'

type TextArgs<T extends keyof IntrinsicElements> = WithChildren<IntrinsicElements[T] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type TypographyH1Args = TextArgs<'h1'>
export type TypographyH2Args = TextArgs<'h2'>
export type TypographyH3Args = TextArgs<'h3'>
export type TypographyH4Args = TextArgs<'h4'>
export type TypographyPArgs = TextArgs<'p'>
export type TypographyBlockquoteArgs = TextArgs<'blockquote'>
export type TypographyInlineCodeArgs = TextArgs<'code'>
export type TypographyLeadArgs = TextArgs<'p'>
export type TypographyLargeArgs = TextArgs<'div'>
export type TypographySmallArgs = TextArgs<'small'>
export type TypographyMutedArgs = TextArgs<'p'>
export type TypographyListItemArgs = TextArgs<'li'>

export type TypographyListArgs = WithChildren<(IntrinsicElements['ul'] | IntrinsicElements['ol']) & {
	/** Render an ordered list instead of an unordered list. */
	ordered?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}>

/** The page title: the one Fraunces line on a page, light and start-aligned. */
const TypographyH1 = part<TypographyH1Args>('h1', 'typography-h1', { class: 'font-title text-2xl font-[360] text-balance sm:text-title' })

/** Section heading text. */
const TypographyH2 = part<TypographyH2Args>('h2', 'typography-h2', { class: 'text-xl font-medium text-balance' })

/** Subsection heading text. */
const TypographyH3 = part<TypographyH3Args>('h3', 'typography-h3', { class: 'text-base font-medium' })

/** Minor heading text. */
const TypographyH4 = part<TypographyH4Args>('h4', 'typography-h4', { class: 'text-sm font-medium' })

/** Paragraph text. */
const TypographyP = part<TypographyPArgs>('p', 'typography-p', { class: 'playa-inline-links text-base [&:not(:first-child)]:mt-4' })

/** Block quote text: indented from the start and muted, without a stripe. */
const TypographyBlockquote = part<TypographyBlockquoteArgs>('blockquote', 'typography-blockquote', { class: 'mt-6 ps-6 text-base text-muted-foreground' })

/** Inline code text. */
const TypographyInlineCode = part<TypographyInlineCodeArgs>('code', 'typography-inline-code', { class: 'rounded-xs bg-muted px-1 font-mono text-[0.875em]' })

/** Lead paragraph text. */
const TypographyLead = part<TypographyLeadArgs>('p', 'typography-lead', { class: 'text-base text-muted-foreground' })

/** Large text. */
const TypographyLarge = part<TypographyLargeArgs>('div', 'typography-large', { class: 'text-base font-medium' })

/** Small text. */
const TypographySmall = part<TypographySmallArgs>('small', 'typography-small', { class: 'text-xs font-medium' })

/** Muted helper text. */
const TypographyMuted = part<TypographyMutedArgs>('p', 'typography-muted', { class: 'text-sm text-muted-foreground' })

/** Typography list wrapper, one rhythm step below the block before it, as a paragraph. */
const TypographyList: Stateless<TypographyListArgs> = ({ class: classes, ordered = false, ...attrs }) => {
	const Tag = ordered ? 'ol' : 'ul'
	return <Tag {...(attrs as Args)} class={clx('ms-6 [&:not(:first-child)]:mt-4 [&>li]:mt-2', ordered ? 'list-decimal' : 'list-disc', classes)} data-slot="typography-list" />
}

/** List item slot for typography lists. */
const TypographyListItem = part<TypographyListItemArgs>('li', 'typography-list-item')

export {
	TypographyBlockquote,
	TypographyH1,
	TypographyH2,
	TypographyH3,
	TypographyH4,
	TypographyInlineCode,
	TypographyLarge,
	TypographyLead,
	TypographyList,
	TypographyListItem,
	TypographyMuted,
	TypographyP,
	TypographySmall,
}
