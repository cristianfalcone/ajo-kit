import { clx } from 'ajo-ui/utils'
import type { ToggleSize, ToggleVariant } from '../toggle'

const toggleBase = 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:inset-ring aria-invalid:inset-ring-danger aria-invalid:ring-danger/25 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'

const toggleTones: Record<ToggleVariant, string> = {
	default: 'bg-transparent',
	outline: 'edge bg-transparent',
}

const toggleSizes: Record<ToggleSize, string> = {
	default: 'h-9 min-w-9 px-2',
	sm: 'h-8 min-w-8 px-1.5',
	lg: 'h-10 min-w-10 px-2.5',
}

/** Toggle surface shared by Toggle and ToggleGroup items. */
export const toggleVariants = ({
	class: classes,
	size = 'default',
	variant = 'default',
}: {
	class?: string
	size?: ToggleSize
	variant?: ToggleVariant
} = {}) => clx(toggleBase, toggleTones[variant], toggleSizes[size], classes)
