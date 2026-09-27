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

const base = 'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:inset-ring aria-invalid:inset-ring-danger aria-invalid:ring-danger/25 [&>svg]:pointer-events-none [&>svg]:size-3'

const removeBase = '-mr-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full opacity-50 hover:opacity-100'

const removeIconBase = 'i-lucide-x pointer-events-none size-3'

const variants: Record<ChipVariant, string> = {
	default: 'bg-primary text-primary-foreground hover:bg-primary/90',
	secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
	danger: 'bg-danger text-danger-foreground hover:bg-danger/90 focus-visible:ring-danger/40',
	success: 'bg-success text-success-foreground hover:bg-success/90',
	warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
	info: 'bg-info text-info-foreground hover:bg-info/90',
	outline: 'edge text-foreground hover:bg-accent hover:edge-on-accent hover:text-accent-foreground',
	ghost: 'hover:bg-accent hover:text-accent-foreground',
	link: 'text-primary underline-offset-4 hover:underline',
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
