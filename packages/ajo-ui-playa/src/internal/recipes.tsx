import type { InputGroupAddonAlign } from 'ajo-ui/input-group'
import clsx from 'clsx'

// Shared style recipes live behind the family entrypoints. They are implementation
// seams between Playa adapters, not part of any component family's public API.

// Native details enter/exit: ::details-content transitions block-size to auto
// (via the preflight's interpolate-size opt-in), with allow-discrete
// content-visibility so closing content stays visible while it shrinks.
// Engines without ::details-content keep the instant toggle.
export const disclosureContent = '[&::details-content]:overflow-hidden [&::details-content]:[block-size:0] [&[open]::details-content]:[block-size:auto] [&::details-content]:transition-[block-size,content-visibility] [&::details-content]:duration-200 [&::details-content]:ease-out [&::details-content]:[transition-behavior:allow-discrete] motion-reduce:[&::details-content]:transition-none'

/** Visual box shared by Checkbox and CheckboxGroup items. */
export const checkboxBox = 'playa-checkbox-box'

export const checkboxState = 'has-[:checked]:inset-ring-transparent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:indeterminate]:inset-ring-transparent has-[:indeterminate]:bg-primary has-[:indeterminate]:text-primary-foreground'
export const checkboxInvalidState = 'has-[:checked]:inset-ring-transparent has-[:checked]:bg-danger has-[:checked]:text-danger-foreground has-[:indeterminate]:inset-ring-transparent has-[:indeterminate]:bg-danger has-[:indeterminate]:text-danger-foreground'

// The box fill lands first, then the glyph pops with a springy overshoot.
// Unchecking collapses immediately so the control never feels laggy.
export const checkboxCheckedIndicator = 'i-lucide-check pointer-events-none size-3.5 text-current scale-50 opacity-0 transition-[opacity,scale] duration-100 ease-in motion-reduce:transition-none peer-checked:scale-100 peer-checked:opacity-100 peer-checked:duration-250 peer-checked:delay-75 peer-checked:ease-[cubic-bezier(0.34,1.56,0.64,1)] peer-indeterminate:scale-50 peer-indeterminate:opacity-0 peer-indeterminate:duration-100 peer-indeterminate:delay-0 peer-indeterminate:ease-in'
export const checkboxIndeterminateIndicator = 'i-lucide-minus pointer-events-none absolute size-3.5 text-current scale-50 opacity-0 transition-[opacity,scale] duration-100 ease-in motion-reduce:transition-none peer-indeterminate:scale-100 peer-indeterminate:opacity-100 peer-indeterminate:duration-250 peer-indeterminate:delay-75 peer-indeterminate:ease-[cubic-bezier(0.34,1.56,0.64,1)]'

/** Invisible native input overlay shared by checkbox-like controls. */
export const choiceInput = 'peer absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed'

export const choiceGroupOrientation: Record<'horizontal' | 'vertical', string> = {
	vertical: 'grid gap-3',
	horizontal: 'flex flex-wrap items-center gap-3',
}

/** Shared open/closed motion for popup surfaces, disabled for reduced motion. */
export const popupAnimation = 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-reduce:animate-none'

/** Placement-aware entrance motion; families that should not slide omit it. */
export const popupSlide = 'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'

/** Transparent stacking boundary around the single painted popup surface. */
export const popupContent = 'playa-popup-content'

const menuMinWidth = {
	'8rem': 'min-w-[8rem]',
	'12rem': 'min-w-[12rem]',
}

// Widths stay as literal utilities so UnoCSS extracts both options while each
// caller emits exactly one min-width class.
/** Returns the popup surface for menu content and submenu content. */
export const menuContent = ({ minWidth = '8rem' }: {
	minWidth?: keyof typeof menuMinWidth
} = {}) => clsx('playa-menu-content', menuMinWidth[minWidth])

export const menuItem = 'playa-menu-item'
export const menuChoiceRow = 'playa-menu-choice-row'
export const menuIndicator = 'playa-menu-indicator'
export const menuLabel = 'playa-menu-label'
export const menuSeparator = 'playa-menu-separator'
export const menuShortcut = 'playa-menu-shortcut'
export const menuCheckIcon = 'playa-menu-check-icon'
export const menuRadioIcon = 'playa-menu-radio-icon'
export const menuSubTriggerIcon = 'playa-menu-sub-trigger-icon'
export const menuSubTriggerOpen = 'playa-menu-sub-trigger-open'

const inputGroupRoot = [
	'group/input-group relative flex h-9 min-w-0 items-center rounded-md edge-input bg-transparent transition-[color,box-shadow] outline-none',
	'has-[>textarea]:h-auto',
	'has-[>[data-align=inline-start]]:[&>input]:pl-2',
	'has-[>[data-align=inline-end]]:[&>input]:pr-2',
	'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
	'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',
	'has-[>input:focus-visible]:inset-ring-ring has-[>input:focus-visible]:ring-3 has-[>input:focus-visible]:ring-ring/25 has-[>textarea:focus-visible]:inset-ring-ring has-[>textarea:focus-visible]:ring-3 has-[>textarea:focus-visible]:ring-ring/25',
	// The direct-input focus path never matches contenteditable segment divs.
	'has-[[data-segment]:focus-visible]:inset-ring-ring has-[[data-segment]:focus-visible]:ring-3 has-[[data-segment]:focus-visible]:ring-ring/25',
	'has-[[data-slot][aria-invalid=true]]:inset-ring-danger has-[[data-slot][aria-invalid=true]]:ring-danger/20',
	// Group-level invalid rides aria-invalid on the group itself.
	'aria-invalid:inset-ring-danger aria-invalid:ring-danger/20',
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
} = {}) => clsx(inputGroupRoot, inputGroupWidth[width], classes)

export const inputGroupAddon = 'flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*=size-])]:size-4'

export const inputGroupAddonAlign: Record<InputGroupAddonAlign, string> = {
	'block-end': 'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [&.border-t]:pt-3',
	'block-start': 'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [&.border-b]:pb-3',
	'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]',
	'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
}

/** Shared native input chrome inside input-group compositions. */
export const inputGroupInput = 'flex h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-1 text-base shadow-none transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:ring-0 aria-invalid:ring-0'

const scrollOverflow = {
	both: 'overflow-auto',
	x: 'overflow-x-auto overflow-y-hidden',
	y: 'overflow-y-auto overflow-x-hidden',
}

type ScrollAreaVariantOptions = {
	axis?: keyof typeof scrollOverflow
	class?: string
}

/** Shared scroll idiom for themed scroll regions and popup lists. */
export const scrollAreaVariants = ({
	axis = 'both',
	class: classes,
}: ScrollAreaVariantOptions = {}) => clsx(scrollOverflow[axis], 'overscroll-contain scrollbar-soft', classes)

const scrollAreaFrame = 'relative min-h-0 min-w-0 rounded-[inherit] transition-[color,box-shadow] has-[>:focus-visible]:ring-3 has-[>:focus-visible]:ring-ring/50'
const scrollAreaViewport = 'scrollbar-framed relative h-full w-full min-h-0 min-w-0 rounded-[inherit] outline-none [scrollbar-gutter:stable]'

export const scrollAreaFrameVariants = ({ class: classes }: Pick<ScrollAreaVariantOptions, 'class'> = {}) =>
	clsx(scrollAreaFrame, classes)

export const scrollAreaViewportVariants = ({
	axis = 'both',
	class: classes,
}: ScrollAreaVariantOptions = {}) => clsx(scrollAreaVariants({ axis }), scrollAreaViewport, classes)
