import { clx } from 'ajo-ui/utils'
import type { ToggleSize, ToggleVariant } from '../toggle'

// Off reads quieter than on; pressed is the raised surface with a boundary,
// never an inset and never the primary fill, which belongs to the main action.
const toggleBase = 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color,box-shadow] motion-reduce:transition-none playa-focus playa-invalid playa-disabled hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-secondary data-[state=on]:text-foreground data-[state=on]:hover:bg-secondary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'

// Pressed takes a boundary one step stronger than off: a hairline where off
// has none, the input boundary (3:1) where off already has the hairline.
const toggleTones: Record<ToggleVariant, string> = {
	default: 'bg-transparent data-[state=on]:edge',
	outline: 'edge bg-transparent data-[state=on]:edge-input',
}

// Square at each control height: a 16-pixel icon plus the padding meets it.
const toggleSizes: Record<ToggleSize, string> = {
	default: 'h-control min-w-control px-2',
	sm: 'h-control-sm min-w-control-sm px-2',
	lg: 'h-control-lg min-w-control-lg px-3',
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
