import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Toggle as BaseToggle,
	type ToggleArgs as BaseToggleArgs,
} from 'ajo-ui/toggle'

export type ToggleVariant = 'default' | 'outline'
export type ToggleSize = 'default' | 'lg' | 'sm'

export type ToggleArgs = BaseToggleArgs & {
	/** Visual toggle treatment. */
	variant?: ToggleVariant
	/** Toggle size. */
	size?: ToggleSize
	/** Additional UnoCSS classes. */
	class?: string
}

type ToggleVariantOptions = {
	class?: string
	size?: ToggleSize
	variant?: ToggleVariant
}

const base = 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:inset-ring aria-invalid:inset-ring-danger aria-invalid:ring-danger/25 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'

const variants: Record<ToggleVariant, string> = {
	default: 'bg-transparent',
	outline: 'edge bg-transparent hover:edge-on-accent',
}

const sizes: Record<ToggleSize, string> = {
	default: 'h-9 min-w-9 px-2',
	sm: 'h-8 min-w-8 px-1.5',
	lg: 'h-10 min-w-10 px-2.5',
}

/** Returns the UnoCSS class list for a toggle variant. */
export const toggleVariants = ({
	class: classes,
	size = 'default',
	variant = 'default',
}: ToggleVariantOptions = {}) => clsx(base, variants[variant], sizes[size], classes)

/** Two-state button using aria-pressed. */
const Toggle: Stateless<ToggleArgs> = ({
	class: classes,
	size = 'default',
	variant = 'default',
	...attrs
}) => (
	<BaseToggle
		{...attrs}
		class={toggleVariants({ class: classes, size, variant })}
		data-size={size}
		data-variant={variant}
	/>
)

export { Toggle }
export default Toggle
