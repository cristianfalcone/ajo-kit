import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

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
	disabled?: boolean
	href: string
}

/** Props accepted by the themed Button surface. */
export type ButtonArgs = ButtonAsAnchor | ButtonAsButton

type ButtonVariantOptions = {
	class?: string
	/** Include the variant's standalone elevation. */
	shadow?: boolean
	size?: ButtonSize
	/** Include the general transition recipe. */
	transition?: boolean
	variant?: ButtonVariant
}

const base = 'inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:inset-ring aria-invalid:inset-ring-danger aria-invalid:ring-danger/25 [&_svg]:pointer-events-none [&_svg]:shrink-0'

const variants: Record<ButtonVariant, string> = {
	default: 'bg-primary text-primary-foreground hover:bg-primary/90',
	danger: 'bg-danger text-danger-foreground hover:bg-danger/90',
	'danger-ghost': 'text-danger hover:bg-danger/10 hover:text-danger',
	outline: 'edge bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
	secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
	ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
	link: 'text-primary underline-offset-4 hover:underline',
	'muted-ghost': 'text-muted-foreground hover:bg-accent hover:text-foreground',
}

const focusRings: Record<ButtonVariant, string> = {
	default: 'focus-visible:ring-ring/50',
	danger: 'focus-visible:ring-danger/40',
	'danger-ghost': 'focus-visible:ring-danger/40',
	ghost: 'focus-visible:ring-ring/50',
	link: 'focus-visible:ring-ring/50',
	'muted-ghost': 'focus-visible:ring-ring/50',
	outline: 'focus-visible:ring-ring/50',
	secondary: 'focus-visible:ring-ring/50',
}

const shadows: Partial<Record<ButtonVariant, string>> = {
	default: 'shadow-xs',
	danger: 'shadow-xs',
	outline: 'shadow-xs',
	secondary: 'shadow-xs',
}

// Geometry single-owner rule: base emits no geometry, so every size recipe
// (and every size:'none' composition site) is the single owner of
// h/px/py/gap/rounded/svg sizing — clsx cannot resolve conflicting
// utilities and the alphabetically-last rule wins in the stylesheet.
const sizes: Record<ButtonSize, string> = {
	default: 'h-9 gap-2 rounded-md px-4 py-2 has-[>svg]:px-3 [&_svg:not([class*=size-])]:size-4',
	xs: 'h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*=size-])]:size-3',
	sm: 'h-8 gap-2 rounded-md px-3 has-[>svg]:px-2.5 [&_svg:not([class*=size-])]:size-4',
	lg: 'h-10 gap-2 rounded-md px-6 has-[>svg]:px-4 [&_svg:not([class*=size-])]:size-4',
	icon: 'size-9 gap-2 rounded-md [&_svg:not([class*=size-])]:size-4',
	'icon-xs': 'size-6 gap-2 rounded-md [&_svg:not([class*=size-])]:size-3',
	'icon-sm': 'size-8 gap-2 rounded-md [&_svg:not([class*=size-])]:size-4',
	'icon-lg': 'size-10 gap-2 rounded-md [&_svg:not([class*=size-])]:size-4',
	none: '',
}

/** Returns the UnoCSS class list for a button variant. */
export const buttonVariants = ({
	class: classes,
	shadow = true,
	size = 'default',
	transition = true,
	variant = 'default',
}: ButtonVariantOptions = {}) => clsx(
	base,
	transition && 'transition-all',
	variants[variant],
	focusRings[variant],
	shadow && shadows[variant],
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
				href={blocked ? undefined : String(anchor.href)}
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

export default Button
