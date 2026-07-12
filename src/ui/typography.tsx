import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

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
export type TypographyTableArgs = TextArgs<'table'>
export type TypographyTHeadArgs = TextArgs<'thead'>
export type TypographyTBodyArgs = TextArgs<'tbody'>
export type TypographyTRowArgs = TextArgs<'tr'>
export type TypographyTHArgs = TextArgs<'th'>
export type TypographyTDArgs = TextArgs<'td'>
export type TypographyListItemArgs = TextArgs<'li'>

export type TypographyListArgs = WithChildren<(IntrinsicElements['ul'] | IntrinsicElements['ol']) & {
	/** Render an ordered list instead of an unordered list. */
	ordered?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}>

export type TypographyTableContainerArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

const h1 = 'scroll-m-20 text-center text-4xl font-extrabold text-balance'
const h2 = 'scroll-m-20 border-b pb-2 text-3xl font-semibold first:mt-0'
const h3 = 'scroll-m-20 text-2xl font-semibold'
const h4 = 'scroll-m-20 text-xl font-semibold'
const p = 'leading-7 [&:not(:first-child)]:mt-6'
const blockquote = 'mt-6 border-l-2 pl-6 italic'
const inlineCode = 'relative rounded-xs bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold'
const lead = 'text-xl text-muted-foreground'
const large = 'text-lg font-semibold'
const small = 'text-sm font-medium leading-none'
const muted = 'text-sm text-muted-foreground'
const tableContainer = 'my-6 w-full overflow-y-auto'
const table = 'w-full'
const row = 'm-0 border-t p-0 even:bg-muted'
const th = 'border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right'
const td = 'border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right'

/** Page-level heading text. */
const TypographyH1: Stateless<TypographyH1Args> = ({ children, class: classes, ...attrs }) => (
	<h1 {...attrs} class={clsx(h1, classes)} data-slot="typography-h1">
		{children}
	</h1>
)

/** Section heading text. */
const TypographyH2: Stateless<TypographyH2Args> = ({ children, class: classes, ...attrs }) => (
	<h2 {...attrs} class={clsx(h2, classes)} data-slot="typography-h2">
		{children}
	</h2>
)

/** Subsection heading text. */
const TypographyH3: Stateless<TypographyH3Args> = ({ children, class: classes, ...attrs }) => (
	<h3 {...attrs} class={clsx(h3, classes)} data-slot="typography-h3">
		{children}
	</h3>
)

/** Minor heading text. */
const TypographyH4: Stateless<TypographyH4Args> = ({ children, class: classes, ...attrs }) => (
	<h4 {...attrs} class={clsx(h4, classes)} data-slot="typography-h4">
		{children}
	</h4>
)

/** Paragraph text. */
const TypographyP: Stateless<TypographyPArgs> = ({ children, class: classes, ...attrs }) => (
	<p {...attrs} class={clsx(p, classes)} data-slot="typography-p">
		{children}
	</p>
)

/** Block quote text. */
const TypographyBlockquote: Stateless<TypographyBlockquoteArgs> = ({ children, class: classes, ...attrs }) => (
	<blockquote {...attrs} class={clsx(blockquote, classes)} data-slot="typography-blockquote">
		{children}
	</blockquote>
)

/** Inline code text. */
const TypographyInlineCode: Stateless<TypographyInlineCodeArgs> = ({ children, class: classes, ...attrs }) => (
	<code {...attrs} class={clsx(inlineCode, classes)} data-slot="typography-inline-code">
		{children}
	</code>
)

/** Lead paragraph text. */
const TypographyLead: Stateless<TypographyLeadArgs> = ({ children, class: classes, ...attrs }) => (
	<p {...attrs} class={clsx(lead, classes)} data-slot="typography-lead">
		{children}
	</p>
)

/** Large text. */
const TypographyLarge: Stateless<TypographyLargeArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(large, classes)} data-slot="typography-large">
		{children}
	</div>
)

/** Small text. */
const TypographySmall: Stateless<TypographySmallArgs> = ({ children, class: classes, ...attrs }) => (
	<small {...attrs} class={clsx(small, classes)} data-slot="typography-small">
		{children}
	</small>
)

/** Muted helper text. */
const TypographyMuted: Stateless<TypographyMutedArgs> = ({ children, class: classes, ...attrs }) => (
	<p {...attrs} class={clsx(muted, classes)} data-slot="typography-muted">
		{children}
	</p>
)

/** Typography list wrapper. */
const TypographyList: Stateless<TypographyListArgs> = ({
	children,
	class: classes,
	ordered = false,
	...attrs
}) => (
	ordered ? (
		<ol {...(attrs as IntrinsicElements['ol'])} class={clsx('my-6 ml-6 list-decimal [&>li]:mt-2', classes)} data-slot="typography-list">
			{children}
		</ol>
	) : (
		<ul {...(attrs as IntrinsicElements['ul'])} class={clsx('my-6 ml-6 list-disc [&>li]:mt-2', classes)} data-slot="typography-list">
			{children}
		</ul>
	)
)

/** List item slot for typography lists. */
const TypographyListItem: Stateless<TypographyListItemArgs> = ({ children, class: classes, ...attrs }) => (
	<li {...attrs} class={classes} data-slot="typography-list-item">
		{children}
	</li>
)

/** Responsive wrapper for typography tables. */
const TypographyTableContainer: Stateless<TypographyTableContainerArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(tableContainer, classes)} data-slot="typography-table-container">
		{children}
	</div>
)

/** Typography table wrapper. */
const TypographyTable: Stateless<TypographyTableArgs> = ({ children, class: classes, ...attrs }) => (
	<TypographyTableContainer>
		<table {...attrs} class={clsx(table, classes)} data-slot="typography-table">
			{children}
		</table>
	</TypographyTableContainer>
)

const TypographyTHead: Stateless<TypographyTHeadArgs> = ({ children, class: classes, ...attrs }) => (
	<thead {...attrs} class={classes} data-slot="typography-thead">
		{children}
	</thead>
)

const TypographyTBody: Stateless<TypographyTBodyArgs> = ({ children, class: classes, ...attrs }) => (
	<tbody {...attrs} class={classes} data-slot="typography-tbody">
		{children}
	</tbody>
)

const TypographyTRow: Stateless<TypographyTRowArgs> = ({ children, class: classes, ...attrs }) => (
	<tr {...attrs} class={clsx(row, classes)} data-slot="typography-tr">
		{children}
	</tr>
)

const TypographyTH: Stateless<TypographyTHArgs> = ({ children, class: classes, scope = 'col', ...attrs }) => (
	<th {...attrs} class={clsx(th, classes)} data-slot="typography-th" scope={scope}>
		{children}
	</th>
)

const TypographyTD: Stateless<TypographyTDArgs> = ({ children, class: classes, ...attrs }) => (
	<td {...attrs} class={clsx(td, classes)} data-slot="typography-td">
		{children}
	</td>
)

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
	TypographyTable,
	TypographyTableContainer,
	TypographyTBody,
	TypographyTD,
	TypographyTH,
	TypographyTHead,
	TypographyTRow,
}
