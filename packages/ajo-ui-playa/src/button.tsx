import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx } from 'ajo-ui/utils'

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
}

type ButtonAsAnchor = ButtonBaseArgs & IntrinsicElements['a'] & {
	as: 'a'
	/** Drops `href`, marks the link `aria-disabled` and takes it out of the tab order. */
	disabled?: boolean
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

const base = 'inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap playa-focus playa-invalid playa-disabled active:scale-[0.98] motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0'

const variants: Record<ButtonVariant, string> = {
	default: 'bg-primary text-primary-foreground hover:bg-primary/90',
	danger: 'bg-danger text-danger-foreground hover:bg-danger/90',
	'danger-ghost': 'text-danger hover:bg-danger/10 hover:text-danger',
	outline: 'edge bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
	secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
	ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
	link: 'text-link underline-offset-4 hover:underline',
	'muted-ghost': 'text-muted-foreground hover:bg-accent hover:text-foreground',
}

// Geometry single-owner rule: base emits no geometry, so every size recipe
// (and every size:'none' composition site) is the single owner of
// h/px/py/gap/rounded/svg sizing; clx cannot resolve conflicting
// utilities and the alphabetically-last rule wins in the stylesheet.
const sizes: Record<ButtonSize, string> = {
	default: 'h-control gap-2 rounded-md px-4 py-2 has-[>svg]:px-3 [&_svg:not([class*=size-])]:size-4',
	xs: 'h-6 gap-1 rounded-sm px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*=size-])]:size-3',
	sm: 'h-control-sm gap-2 rounded-md px-3 has-[>svg]:px-2.5 [&_svg:not([class*=size-])]:size-4',
	lg: 'h-control-lg gap-2 rounded-md px-6 has-[>svg]:px-4 [&_svg:not([class*=size-])]:size-4',
	icon: 'size-control gap-2 rounded-md [&_svg:not([class*=size-])]:size-4',
	'icon-xs': 'size-6 gap-2 rounded-sm [&_svg:not([class*=size-])]:size-3',
	'icon-sm': 'size-control-sm gap-2 rounded-md [&_svg:not([class*=size-])]:size-4',
	'icon-lg': 'size-control-lg gap-2 rounded-md [&_svg:not([class*=size-])]:size-4',
	none: '',
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
	classes,
)

/** Interactive action surface for buttons, links, and icon controls. */
const Button: Stateless<ButtonArgs> = ({
	as = 'button',
	class: classes,
	children,
	'data-slot': slot = 'button',
	disabled,
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
			class={styles}
			data-size={size}
			data-slot={slot}
			data-variant={variant}
			disabled={disabled}
		>
			{children}
		</button>
	)
}

export { Button }
