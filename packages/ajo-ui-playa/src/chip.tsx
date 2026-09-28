import type { Args, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx } from 'ajo-ui/utils'

export type ChipVariant =
	| 'default'
	| 'danger'
	| 'ghost'
	| 'info'
	| 'link'
	| 'outline'
	| 'secondary'
	| 'success'
	| 'warning'

type ChipBaseArgs = WithChildren<{
	/** Visual chip tone. */
	variant?: ChipVariant
	/** Additional UnoCSS classes. */
	class?: string
	/** Slot marker for composed chip variants. */
	'data-slot'?: string
	/** Renders a trailing remove button and receives its click event. */
	onRemove?: (event: Event) => void
	/** Accessible label for the remove button. */
	removeLabel?: string
	/** Additional UnoCSS classes for the remove button. */
	removeClass?: string
	/** Additional UnoCSS classes for the remove button icon. */
	removeIconClass?: string
}>

type ChipAsSpan = ChipBaseArgs & IntrinsicElements['span'] & {
	as?: 'span'
	href?: undefined
}

type ChipAsAnchor = ChipBaseArgs & IntrinsicElements['a'] & {
	as: 'a'
	href: string
}

export type ChipArgs = ChipAsAnchor | ChipAsSpan

type ChipVariantOptions = {
	class?: string
	variant?: ChipVariant
}

const base = 'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-2 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] playa-focus playa-invalid has-[>[data-slot=chip-remove]]:pe-1 [&>svg]:pointer-events-none [&>svg]:size-3'

const removeBase = 'inline-flex size-4 shrink-0 items-center justify-center rounded-full opacity-50 hover:opacity-100'

const removeIconBase = 'i-lucide-x pointer-events-none size-3'

// Status tones are quiet: the hue as text on its own 10% tint, never a
// saturated fill. The default chip is ink, so gold stays on the one primary
// action; danger keeps a fill for counts. Only an anchor chip takes a hover
// tint: a static chip is not a target.
const variants: Record<ChipVariant, string> = {
	default: 'bg-foreground text-background [&:is(a)]:hover:bg-foreground/90',
	secondary: 'bg-muted text-foreground [&:is(a)]:hover:bg-muted/80',
	danger: 'bg-danger text-danger-foreground [&:is(a)]:hover:bg-danger/90',
	success: 'bg-success/10 text-success',
	warning: 'bg-warning/10 text-warning',
	info: 'bg-info/10 text-info',
	outline: 'edge text-foreground [&:is(a)]:hover:bg-accent [&:is(a)]:hover:text-accent-foreground',
	ghost: '[&:is(a)]:hover:bg-accent [&:is(a)]:hover:text-accent-foreground',
	link: 'text-link underline-offset-4 hover:underline',
}

/** Returns the UnoCSS class list for a chip variant. */
export const chipVariants = ({
	class: classes,
	variant = 'default',
}: ChipVariantOptions = {}) => clx(base, variants[variant], classes)

/** Compact inline token for labels, status, or removable selections. */
const Chip: Stateless<ChipArgs> = ({
	as: Tag = 'span',
	class: classes,
	children,
	'data-slot': slot = 'chip',
	onRemove,
	removeClass,
	removeIconClass,
	removeLabel = 'Remove',
	variant = 'default',
	...attrs
}) => (
	<Tag {...(attrs as Args)} class={chipVariants({ class: classes, variant })} data-slot={slot} data-variant={variant}>
		{children}
		{/* Anchors never render the remove button: interactive content inside
		links is invalid HTML and ambiguous for assistive tech. */}
		{onRemove && Tag !== 'a' ? (
			<button
				aria-label={removeLabel}
				class={clx(removeBase, removeClass)}
				data-slot="chip-remove"
				type="button"
				set:onclick={(event: Event) => {
					event.stopPropagation()
					onRemove(event)
				}}
			>
				<span aria-hidden="true" class={clx(removeIconBase, removeIconClass)} />
			</button>
		) : null}
	</Tag>
)

export { Chip }
