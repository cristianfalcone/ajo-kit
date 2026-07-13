import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Menu as BaseMenu,
	MenuCheckboxItem as BaseMenuCheckboxItem,
	MenuContent as BaseMenuContent,
	MenuItem as BaseMenuItem,
	MenuLabel as BaseMenuLabel,
	MenuRadioItem as BaseMenuRadioItem,
	MenuSeparator as BaseMenuSeparator,
	MenuShortcut as BaseMenuShortcut,
	MenuSubContent as BaseMenuSubContent,
	MenuSubTrigger as BaseMenuSubTrigger,
} from 'ajo-ui/menu'
import type {
	MenuAlign,
	MenuAnchorArgs,
	MenuArgs,
	MenuCheckboxItemArgs as BaseMenuCheckboxItemArgs,
	MenuContentArgs,
	MenuGroupArgs,
	MenuItemArgs,
	MenuLabelArgs,
	MenuRadioGroupArgs,
	MenuRadioItemArgs as BaseMenuRadioItemArgs,
	MenuSeparatorArgs,
	MenuShortcutArgs,
	MenuSide,
	MenuSubArgs,
	MenuSubContentArgs,
	MenuSubTriggerArgs as BaseMenuSubTriggerArgs,
	MenuTriggerArgs,
	MenuVariant,
} from 'ajo-ui/menu'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { scrollAreaVariants } from './scroll-area'

export { MenuAnchor, MenuGroup, MenuRadioGroup, MenuSub, MenuTrigger } from 'ajo-ui/menu'

export type { MenuAlign, MenuAnchorArgs, MenuArgs, MenuContentArgs, MenuGroupArgs, MenuItemArgs, MenuLabelArgs, MenuRadioGroupArgs, MenuSeparatorArgs, MenuShortcutArgs, MenuSide, MenuSubArgs, MenuSubContentArgs, MenuTriggerArgs, MenuVariant }
export type MenuCheckboxItemArgs = OmitArg<BaseMenuCheckboxItemArgs, 'indicatorClass' | 'indicatorIconClass'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'>
export type MenuRadioItemArgs = OmitArg<BaseMenuRadioItemArgs, 'indicatorClass' | 'indicatorIconClass' | 'value'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'> & {
	value: string
}
export type MenuSubTriggerArgs = OmitArg<BaseMenuSubTriggerArgs, 'iconClass'> & FixedArgs<'iconClass'>

// Shared themed popup and cascading-menu tokens. Dialect decisions live here,
// taken once: popup motion, `data-[...=true]` selectors (the base always
// renders explicit 'true' values, never bare flags), tabular-nums on shortcuts,
// and the floating menu height cap. Internal to src/ui.

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

// Menu open/close fade. Transitions read the TARGET state's transition-*, so
// the property lists are state-scoped on purpose: the open state transitions
// opacity only (a discrete display transition on entry defers rendering and
// the anchor then measures a surface that is not there yet — placement lands
// frames late and submenus aim at stale parent rects), while the closed state
// keeps display and overlay in the list so the exit stays rendered and in the
// top layer while it fades out. Visibility is additionally gated on
// data-side, which the anchor stamps in the same frame it writes the inset: a
// first-ever open renders invisible at the popover's unplaced top-layer
// origin and only fades in once placed. Reopens (attributes already present
// when display flips) seed from @starting-style instead. data-state covers
// both surface kinds (root content is a native popover, submenu content
// toggles hidden); engines without discrete transitions keep the instant
// toggle. Fade only — scale feeds the anchor's getBoundingClientRect moving
// rects, and transition-delay holds display at none; both break placement.
const menuMotion = clsx(
	'opacity-0 transition-[opacity,display,overlay] transition-discrete duration-150 ease-out motion-reduce:transition-none',
	'data-[state=open]:transition-[opacity]',
	'data-[state=open]:data-[side]:opacity-100',
	'starting:data-[state=open]:data-[side]:opacity-0',
)

/** Returns the popup surface for menu content and submenu content. */
export const menuContent = ({ minWidth: min = '8rem' }: MenuContentOptions = {}) => clsx(
	'z-50 m-0 max-h-[max(96px,min(320px,var(--available-height)))]',
	minWidth[min],
	scrollAreaVariants({ axis: 'y' }),
	'rounded-md glass-overlay edge p-1 shadow-lg outline-none',
	menuMotion,
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

const rootBase = 'relative inline-block'
const contentBase = menuContent()

/** Root provider for a menu. */
const Menu: Stateless<MenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenu {...attrs} class={clsx(rootBase, classes)} />
)

/** Popover menu content. */
const MenuContent: Stateless<MenuContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuContent {...attrs} class={clsx(contentBase, classes)} />
)

/** Non-interactive label inside a menu. */
const MenuLabel: Stateless<MenuLabelArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuLabel {...attrs} class={clsx(menuLabel, classes)} />
)

/** Standard menu action item. */
const MenuItem: Stateless<MenuItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuItem {...attrs} class={clsx(menuItem, classes)} />
)

/** Checkable menu item. */
const MenuCheckboxItem: Stateless<MenuCheckboxItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuCheckboxItem
		{...attrs}
		class={clsx(menuChoiceRow, classes)}
		indicatorClass={menuIndicator}
		indicatorIconClass={menuCheckIcon}
	/>
)

/** Radio item inside a menu radio group. */
const MenuRadioItem: Stateless<MenuRadioItemArgs> = ({ class: classes, value, ...attrs }) => (
	<BaseMenuRadioItem
		{...attrs}
		class={clsx(menuChoiceRow, classes)}
		indicatorClass={menuIndicator}
		indicatorIconClass={menuRadioIcon}
		value={String(value)}
	/>
)

/** Visual separator between menu groups. */
const MenuSeparator: Stateless<MenuSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuSeparator {...attrs} class={clsx(menuSeparator, classes)} />
)

/** Right-aligned shortcut hint inside a menu item. */
const MenuShortcut: Stateless<MenuShortcutArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuShortcut {...attrs} class={clsx(menuShortcut, classes)} />
)

/** Trigger item that opens a submenu. */
const MenuSubTrigger: Stateless<MenuSubTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuSubTrigger
		{...attrs}
		class={clsx(menuItem, menuSubTriggerOpen, classes)}
		iconClass={menuSubTriggerIcon}
	/>
)

/** Content for a submenu. */
const MenuSubContent: Stateless<MenuSubContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuSubContent {...attrs} class={clsx(contentBase, classes)} />
)

export {
	Menu,
	MenuCheckboxItem,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuRadioItem,
	MenuSeparator,
	MenuShortcut,
	MenuSubContent,
	MenuSubTrigger,
}
