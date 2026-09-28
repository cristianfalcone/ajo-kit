import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx } from 'ajo-ui/utils'
import { Spinner } from './spinner'

/** Visual treatment available to Button surfaces. */
export type ButtonVariant =
	| 'default'
	| 'danger'
	| 'danger-ghost'
	| 'ghost'
	| 'link'
	| 'muted-ghost'
	| 'outline'
	| 'secondary'

/** Geometry recipe available to Button surfaces. */
export type ButtonSize =
	| 'default'
	| 'icon'
	| 'icon-lg'
	| 'icon-sm'
	| 'icon-xs'
	| 'lg'
	| 'none'
	| 'sm'
	| 'xs'

type ButtonBaseArgs = WithChildren<{
	/** Visual button treatment. */
	variant?: ButtonVariant
	/** Button size. */
	size?: ButtonSize
	/** Additional UnoCSS classes. */
	class?: string
	/** Slot marker for composed button variants. */
	'data-slot'?: string
}>

type ButtonAsButton = ButtonBaseArgs & IntrinsicElements['button'] & {
	as?: 'button'
	href?: undefined
	/**
	 * Busy: a Spinner stands in for the leading icon, or covers a label that
	 * has none; the button keeps its width and look, reports `aria-busy` and
	 * `aria-disabled`, and ignores activation until it clears.
	 */
	loading?: boolean
}

type ButtonAsAnchor = ButtonBaseArgs & IntrinsicElements['a'] & {
	as: 'a'
	/** Drops `href`, marks the link `aria-disabled` and takes it out of the Tab order. */
	disabled?: boolean
	loading?: undefined
}

/** Props accepted by the themed Button surface. */
export type ButtonArgs = ButtonAsAnchor | ButtonAsButton

type ButtonVariantOptions = {
	class?: string
	size?: ButtonSize
	/** Include the general transition recipe. */
	transition?: boolean
	variant?: ButtonVariant
}

// An icon is an svg element or an icon utility span (`i-lucide-*`), which
// starts its class list by convention. Every icon fills the same 16-pixel slot
// (12 in xs), and so does a status Spinner a caller puts in its place. Busy
// keeps full opacity, so the plate stays metal, and playa-busy keeps the width
// (preset/actions.ts).
const base = 'inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap playa-focus playa-invalid playa-disabled playa-busy aria-busy:aria-disabled:opacity-100 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 [&_:is(svg,[class^=i-])]:pointer-events-none [&_:is(svg,[class^=i-])]:shrink-0'

const variants: Record<ButtonVariant, string> = {
	// The one primary action wears the plate; hover slides its sheen in.
	default: 'gilt-plate playa-sheen',
	// Every other fill is flat, with no highlight line.
	danger: 'bg-danger-fill text-danger-fill-foreground hover:bg-[color-mix(in_oklab,var(--danger-fill),black_12%)]',
	'danger-ghost': 'text-danger hover:bg-danger/10 hover:text-danger',
	// Outline sits at the input boundary, so it reads apart from the enamel.
	outline: 'edge-input bg-transparent text-foreground hover:bg-accent/70 hover:text-accent-foreground',
	secondary: 'edge bg-secondary text-secondary-foreground hover:bg-muted',
	ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
	link: 'text-link underline underline-offset-4 hover:decoration-2',
	'muted-ghost': 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
}

// Geometry single-owner rule: base emits no geometry, so every size recipe
// (and every size:'none' composition site) is the single owner of
// h/px/py/gap/rounded/icon sizing; clx cannot resolve conflicting
// utilities and the alphabetically-last rule wins in the stylesheet.
const sizes: Record<ButtonSize, string> = {
	default: 'h-control gap-2 rounded-md px-4 py-2 has-[>:is(svg,[class^=i-],[role=status])]:px-3 [&_:is(svg,[class^=i-]):not([class*=size-])]:size-4',
	xs: 'h-6 gap-1 rounded-sm px-2 text-xs has-[>:is(svg,[class^=i-],[role=status])]:px-1 [&_:is(svg,[class^=i-]):not([class*=size-])]:size-3 [&>[data-slot=spinner]]:size-3',
	sm: 'h-control-sm gap-2 rounded-md px-3 has-[>:is(svg,[class^=i-],[role=status])]:px-2 [&_:is(svg,[class^=i-]):not([class*=size-])]:size-4',
	lg: 'h-control-lg gap-2 rounded-md px-6 has-[>:is(svg,[class^=i-],[role=status])]:px-4 [&_:is(svg,[class^=i-]):not([class*=size-])]:size-4',
	icon: 'size-control gap-2 rounded-md [&_:is(svg,[class^=i-]):not([class*=size-])]:size-4',
	'icon-xs': 'size-6 gap-2 rounded-sm [&_:is(svg,[class^=i-]):not([class*=size-])]:size-3 [&>[data-slot=spinner]]:size-3',
	'icon-sm': 'size-control-sm gap-2 rounded-md [&_:is(svg,[class^=i-]):not([class*=size-])]:size-4',
	'icon-lg': 'size-control-lg gap-2 rounded-md [&_:is(svg,[class^=i-]):not([class*=size-])]:size-4',
	none: '',
}

// While busy, a click (or the Enter or Space that becomes one) does nothing:
// no handler runs and a submit button does not submit its form.
const ignore = (event: Event) => {
	event.preventDefault()
	event.stopImmediatePropagation()
}

/** Returns the UnoCSS class list for a button variant. */
export const buttonVariants = ({
	class: classes,
	size = 'default',
	transition = true,
	variant = 'default',
}: ButtonVariantOptions = {}) => clx(
	base,
	transition && 'transition-all',
	variants[variant],
	sizes[size],
	// A composed plate (size none) sits flush in its control: it keeps its
	// edge and casts nothing on the page.
	size === 'none' && variant === 'default' && '[&.gilt-plate]:[--un-shadow:0_0_#0000]',
	classes,
)

/** Interactive action surface for buttons, links, and icon controls. */
const Button: Stateless<ButtonArgs> = ({
	as = 'button',
	class: classes,
	children,
	'data-slot': slot = 'button',
	disabled,
	loading,
	size = 'default',
	variant = 'default',
	...attrs
}) => {
	const styles = buttonVariants({ class: classes, size, variant })

	if (as === 'a') {
		const anchor = attrs as IntrinsicElements['a']
		const blocked = Boolean(disabled)

		return (
			<a
				{...anchor}
				aria-disabled={blocked ? 'true' : undefined}
				class={styles}
				data-size={size}
				data-slot={slot}
				data-variant={variant}
				href={blocked ? undefined : anchor.href}
				tabIndex={blocked ? -1 : anchor.tabIndex}
			>
				{children}
			</a>
		)
	}

	const button = attrs as IntrinsicElements['button']

	return (
		<button
			{...button}
			aria-busy={loading ? 'true' : button['aria-busy']}
			aria-disabled={loading ? 'true' : button['aria-disabled']}
			class={styles}
			data-size={size}
			data-slot={slot}
			data-variant={variant}
			disabled={disabled}
			set:onclick={loading ? ignore : button['set:onclick']}
		>
			{loading && <Spinner aria-hidden="true" role="presentation" />}
			{children}
		</button>
	)
}

export { Button }
