import type { InputGroupAddonAlign } from 'ajo-ui/input-group'
import { clx } from 'ajo-ui/utils'

const inputGroupRoot = [
	'group/input-group relative flex h-9 min-w-0 items-center playa-field',
	'has-[>textarea]:h-auto',
	'has-[>[data-align=inline-start]]:[&>input]:pl-2',
	'has-[>[data-align=inline-end]]:[&>input]:pr-2',
	'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
	'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',
	'has-[>input:focus-visible]:inset-ring-ring has-[>input:focus-visible]:ring-3 has-[>input:focus-visible]:ring-ring/25 has-[>textarea:focus-visible]:inset-ring-ring has-[>textarea:focus-visible]:ring-3 has-[>textarea:focus-visible]:ring-ring/25',
	// The direct-input focus path never matches contenteditable segment divs.
	'has-[[data-segment]:focus-visible]:inset-ring-ring has-[[data-segment]:focus-visible]:ring-3 has-[[data-segment]:focus-visible]:ring-ring/25',
	'has-[[data-slot][aria-invalid=true]]:inset-ring-danger has-[[data-slot][aria-invalid=true]]:ring-danger/20',
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

export const inputGroupAddon = 'flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*=size-])]:size-4'

export const inputGroupAddonAlign: Record<InputGroupAddonAlign, string> = {
	'block-end': 'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [&.border-t]:pt-3',
	'block-start': 'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [&.border-b]:pb-3',
	'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]',
	'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
}
