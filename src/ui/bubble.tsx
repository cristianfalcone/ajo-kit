import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

export type BubbleVariant =
	| 'default'
	| 'danger'
	| 'ghost'
	| 'muted'
	| 'outline'
	| 'secondary'
	| 'tinted'

export type BubbleAlign = 'end' | 'start'

export type BubbleReactionSide = 'bottom' | 'top'

export type BubbleArgs = WithChildren<IntrinsicElements['div'] & {
	/** Visual treatment for the bubble content. */
	variant?: BubbleVariant
	/** Inline alignment in a conversation row. */
	align?: BubbleAlign
	/** Additional UnoCSS classes. */
	class?: string
}>

type BubbleContentBaseArgs = WithChildren<{
	/** Render content as a div, button, or anchor. */
	as?: 'a' | 'button' | 'div'
	/** Additional UnoCSS classes. */
	class?: string
}>

type BubbleContentDivArgs = BubbleContentBaseArgs & IntrinsicElements['div'] & {
	as?: 'div'
	href?: undefined
}

type BubbleContentButtonArgs = BubbleContentBaseArgs & IntrinsicElements['button'] & {
	as: 'button'
	href?: undefined
}

type BubbleContentAnchorArgs = BubbleContentBaseArgs & IntrinsicElements['a'] & {
	as: 'a'
	href: string
}

export type BubbleContentArgs =
	| BubbleContentAnchorArgs
	| BubbleContentButtonArgs
	| BubbleContentDivArgs

export type BubbleReactionsArgs = WithChildren<IntrinsicElements['div'] & {
	/** Side of the bubble edge to overlap. */
	side?: BubbleReactionSide
	/** Inline reaction alignment. */
	align?: BubbleAlign
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BubbleGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

// Tight stack; only the last bubble keeps its tail corner so the run reads
// as one speaker's set.
const groupBase = [
	'flex min-w-0 flex-col gap-1',
	'[&>[data-slot=bubble]:not(:last-child)>[data-slot=bubble-content]]:rounded-bl-2xl',
	'[&>[data-slot=bubble]:not(:last-child)>[data-slot=bubble-content]]:rounded-br-2xl',
].join(' ')

const rootBase = [
	'group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1',
	'group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full',
].join(' ')

const rootVariants: Record<BubbleVariant, string> = {
	default: '*:data-[slot=bubble-content]:bg-primary *:data-[slot=bubble-content]:text-primary-foreground [&>[data-slot=bubble-content]:is(button,a):hover]:bg-primary/90',
	secondary: '*:data-[slot=bubble-content]:bg-secondary *:data-[slot=bubble-content]:text-secondary-foreground [&>[data-slot=bubble-content]:is(button,a):hover]:bg-secondary/80',
	muted: '*:data-[slot=bubble-content]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:bg-muted/80',
	tinted: '*:data-[slot=bubble-content]:bg-primary/10 *:data-[slot=bubble-content]:text-foreground [&>[data-slot=bubble-content]:is(button,a):hover]:bg-primary/15',
	outline: '*:data-[slot=bubble-content]:bg-card/80 *:data-[slot=bubble-content]:text-card-foreground *:data-[slot=bubble-content]:backdrop-blur-md *:data-[slot=bubble-content]:inset-ring *:data-[slot=bubble-content]:inset-ring-border [&>[data-slot=bubble-content]:is(button,a):hover]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:text-foreground',
	ghost: '*:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0 [&>[data-slot=bubble-content]:is(button,a):hover]:bg-accent [&>[data-slot=bubble-content]:is(button,a):hover]:text-accent-foreground',
	danger: '*:data-[slot=bubble-content]:bg-danger/10 *:data-[slot=bubble-content]:text-danger *:data-[slot=bubble-content]:inset-ring *:data-[slot=bubble-content]:inset-ring-danger/25 [&>[data-slot=bubble-content]:is(button,a):hover]:bg-danger/20',
}

const contentBase = [
	'w-fit max-w-full min-w-0 overflow-hidden px-3.5 py-2 text-sm leading-relaxed [overflow-wrap:anywhere]',
	// Bubble shape: fully rounded with a flatter tail corner on the speaker
	// side; alignment comes from the bubble itself or its message row.
	'rounded-2xl rounded-bl-md',
	'[[data-slot=bubble][data-align=end]_&]:rounded-bl-2xl [[data-slot=bubble][data-align=end]_&]:rounded-br-md',
	'[[data-slot=message][data-align=end]_&]:rounded-bl-2xl [[data-slot=message][data-align=end]_&]:rounded-br-md',
	'[[data-slot=bubble][data-variant=ghost]_&]:rounded-none',
	'group-data-[align=end]/bubble:self-end',
	'[&:is(button)]:text-left [&:is(button,a)]:transition-colors [&:is(button,a)]:outline-none [&:is(button,a)]:focus-visible:ring-3 [&:is(button,a)]:focus-visible:ring-ring/50',
].join(' ')

const reactionsBase = 'absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1 rounded-full glass-overlay edge px-1.5 py-0.5 text-sm shadow-xs has-[button]:p-0'

const reactionSides: Record<BubbleReactionSide, string> = {
	bottom: 'bottom-0 translate-y-3/4',
	top: 'top-0 -translate-y-3/4',
}

const reactionAligns: Record<BubbleAlign, string> = {
	end: 'right-3',
	start: 'left-3',
}

/** Groups consecutive bubbles from one speaker. */
const BubbleGroup: Stateless<BubbleGroupArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(groupBase, classes)} data-slot="bubble-group">
		{children}
	</div>
)

/** Presentational chat bubble wrapper. Keep message-level semantics outside this component. */
const Bubble: Stateless<BubbleArgs> = ({
	align = 'start',
	children,
	class: classes,
	variant = 'default',
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx(rootBase, rootVariants[variant], classes)}
		data-align={align}
		data-slot="bubble"
		data-variant={variant}
	>
		{children}
	</div>
)

/** Bubble content surface. Use `as="button"` or `as="a"` for interactive bubbles. */
const BubbleContent: Stateless<BubbleContentArgs> = ({
	as = 'div',
	children,
	class: classes,
	type = 'button',
	...attrs
}) => {
	const styles = clsx(contentBase, classes)

	if (as === 'a') {
		const anchor = attrs as IntrinsicElements['a']
		return (
			<a {...anchor} class={styles} data-slot="bubble-content" href={String(anchor.href)}>
				{children}
			</a>
		)
	}

	if (as === 'button') {
		const button = attrs as IntrinsicElements['button']
		return (
			<button {...button} class={styles} data-slot="bubble-content" type={type}>
				{children}
			</button>
		)
	}

	const div = attrs as IntrinsicElements['div']
	return (
		<div {...div} class={styles} data-slot="bubble-content">
			{children}
		</div>
	)
}

/** Reaction row anchored to a bubble edge. */
const BubbleReactions: Stateless<BubbleReactionsArgs> = ({
	align = 'end',
	children,
	class: classes,
	side = 'bottom',
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx(reactionsBase, reactionSides[side], reactionAligns[align], classes)}
		data-align={align}
		data-side={side}
		data-slot="bubble-reactions"
	>
		{children}
	</div>
)

export {
	Bubble,
	BubbleContent,
	BubbleGroup,
	BubbleReactions,
}
