import type { InputGroupAddonAlign } from 'ajo-ui/input-group'
import { clx } from 'ajo-ui/utils'

// The group is one control: it takes the control height of its size and
// the control text size, which its input, addons and text inherit, and it
// shows its control's focus and invalid states (playa-field-within). A
// textarea or a stacked addon lets it grow, whatever its size.
const inputGroupRoot = [
	'group/input-group relative flex h-control min-w-0 items-center playa-field playa-field-within text-base sm:text-sm',
	'data-[size=sm]:h-control-sm data-[size=lg]:h-control-lg data-[size]:has-[>textarea,>[data-align^=block]]:h-auto',
	'[&:has(>[data-align=inline-start])>input]:ps-2',
	'[&:has(>[data-align=inline-end])>input]:pe-2',
	'has-[>[data-align=block-start]]:flex-col [&:has(>[data-align=block-start])>input]:pb-3',
	'has-[>[data-align=block-end]]:flex-col [&:has(>[data-align=block-end])>input]:pt-3',
].join(' ')

const inputGroupWidth = {
	auto: undefined,
	full: 'w-full',
}

/** Builds shared input-group chrome; full owns w-full, auto leaves width to the caller. */
export const inputGroupVariants = ({
	class: classes,
	width = 'full',
}: {
	class?: string
	width?: keyof typeof inputGroupWidth
} = {}) => clx(inputGroupRoot, inputGroupWidth[width], classes)

export const inputGroupAddon = 'flex h-auto cursor-text select-none items-center justify-center gap-2 py-1 font-medium text-muted-foreground group-data-[disabled=true]/input-group:opacity-[var(--disabled-opacity)] [&>svg:not([class*=size-])]:size-4'

// A button in an addon beside the control sits 4px from the group's boundary,
// concentric with its corner; a key hint sits 8px from it.
export const inputGroupAddonAlign: Record<InputGroupAddonAlign, string> = {
	'block-end': 'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2 [&.border-t]:pt-3',
	'block-start': 'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2 [&.border-b]:pb-3',
	'inline-end': 'order-last pe-3 has-[>button]:pe-1 has-[>kbd]:pe-2',
	'inline-start': 'order-first ps-3 has-[>button]:ps-1 has-[>kbd]:ps-2',
}
