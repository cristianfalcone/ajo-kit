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

/** Page-level heading text. */
const TypographyH1 = part<TypographyH1Args>('h1', 'typography-h1', { class: 'scroll-m-20 text-center text-4xl font-extrabold text-balance' })

/** Section heading text. */
const TypographyH2 = part<TypographyH2Args>('h2', 'typography-h2', { class: 'scroll-m-20 border-b pb-2 text-3xl font-semibold first:mt-0' })

/** Subsection heading text. */
const TypographyH3 = part<TypographyH3Args>('h3', 'typography-h3', { class: 'scroll-m-20 text-2xl font-semibold' })

/** Minor heading text. */
const TypographyH4 = part<TypographyH4Args>('h4', 'typography-h4', { class: 'scroll-m-20 text-xl font-semibold' })

/** Paragraph text. */
const TypographyP = part<TypographyPArgs>('p', 'typography-p', { class: 'leading-7 [&:not(:first-child)]:mt-6' })

/** Block quote text. */
const TypographyBlockquote = part<TypographyBlockquoteArgs>('blockquote', 'typography-blockquote', { class: 'mt-6 border-l-2 pl-6 italic' })

/** Inline code text. */
const TypographyInlineCode = part<TypographyInlineCodeArgs>('code', 'typography-inline-code', { class: 'relative rounded-xs bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold' })

/** Lead paragraph text. */
const TypographyLead = part<TypographyLeadArgs>('p', 'typography-lead', { class: 'text-xl text-muted-foreground' })

/** Large text. */
const TypographyLarge = part<TypographyLargeArgs>('div', 'typography-large', { class: 'text-lg font-semibold' })

/** Small text. */
const TypographySmall = part<TypographySmallArgs>('small', 'typography-small', { class: 'text-sm font-medium leading-none' })

/** Muted helper text. */
const TypographyMuted = part<TypographyMutedArgs>('p', 'typography-muted', { class: 'text-sm text-muted-foreground' })

/** Typography list wrapper. */
const TypographyList: Stateless<TypographyListArgs> = ({ class: classes, ordered = false, ...attrs }) => {
	const Tag = ordered ? 'ol' : 'ul'
	return <Tag {...(attrs as Args)} class={clx('my-6 ml-6 [&>li]:mt-2', ordered ? 'list-decimal' : 'list-disc', classes)} data-slot="typography-list" />
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
