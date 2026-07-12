import clsx from 'clsx'
import { scrollAreaVariants } from './scroll-area'

// Shared themed popup and cascading-menu tokens. Dialect decisions live here,
// taken once: popup motion, `data-[...=true]` selectors (the base always
// renders explicit 'true' values, never bare flags), tabular-nums on shortcuts,
// and dropdown's real height cap. Internal to src/ui.

/** Shared open/closed fade and zoom chain for floating popup surfaces. */
export const popupAnimation = 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'

/** Placement-aware entrance motion; families that should not slide omit it. */
export const popupSlide = 'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'

type MenuContentOptions = {
	/** Minimum popup width; menubar top-level menus read wider. */
	minWidth?: keyof typeof minWidth
}

// Literal utilities keyed by parameter so UnoCSS can extract them and the
// output carries exactly one min-w (MenubarContent used to stack min-w-[12rem]
// over the base's min-w-[8rem]).
const minWidth = {
	'8rem': 'min-w-[8rem]',
	'12rem': 'min-w-[12rem]',
}

/** Returns the popup surface for menu content and submenu content. */
export const menuContent = ({ minWidth: min = '8rem' }: MenuContentOptions = {}) => clsx(
	'z-50 m-0 max-h-[max(96px,min(320px,var(--available-height)))]',
	minWidth[min],
	scrollAreaVariants({ axis: 'y' }),
	'rounded-md glass-overlay edge p-1 shadow-lg outline-none',
)

/** Action item row; submenu triggers compose menuSubTriggerOpen over it. */
export const menuItem = 'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[inset]:pl-8 data-[variant=danger]:text-danger data-[variant=danger]:focus:bg-danger/10 data-[variant=danger]:focus:text-danger data-[variant=danger]:data-[highlighted=true]:bg-danger/10 data-[variant=danger]:data-[highlighted=true]:text-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground data-[variant=danger]:[&_svg]:text-danger'

/** Checkbox/radio item row: indicator gutter instead of the item's inset. */
export const menuChoiceRow = 'relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'

/** Indicator slot inside a choice row. */
export const menuIndicator = 'pointer-events-none absolute left-2 flex size-3.5 items-center justify-center'

/** Non-interactive group label (menu design: text-sm, unlike select/command). */
export const menuLabel = 'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8'

/** Separator between menu groups. */
export const menuSeparator = '-mx-1 my-1 h-px bg-border'

/** Right-aligned shortcut hint inside an item. */
export const menuShortcut = 'ml-auto text-xs tracking-widest text-muted-foreground tabular-nums'

/** Check indicator icon for checkbox items. */
export const menuCheckIcon = 'i-lucide-check size-4'

/** Filled-circle indicator icon for radio items. */
export const menuRadioIcon = 'i-lucide-circle size-2 fill-current'

/** Chevron icon for submenu triggers. */
export const menuSubTriggerIcon = 'i-lucide-chevron-right ml-auto size-4'

/** Open-state addon composed over menuItem on submenu triggers. */
export const menuSubTriggerOpen = 'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'
