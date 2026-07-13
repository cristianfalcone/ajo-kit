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

export { MenuAnchor, MenuGroup, MenuRadioGroup, MenuSub, MenuTrigger } from 'ajo-ui/menu'

export type { MenuAlign, MenuAnchorArgs, MenuArgs, MenuContentArgs, MenuGroupArgs, MenuItemArgs, MenuLabelArgs, MenuRadioGroupArgs, MenuSeparatorArgs, MenuShortcutArgs, MenuSide, MenuSubArgs, MenuSubContentArgs, MenuTriggerArgs, MenuVariant }
export type MenuCheckboxItemArgs = OmitArg<BaseMenuCheckboxItemArgs, 'indicatorClass' | 'indicatorIconClass'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'>
export type MenuRadioItemArgs = OmitArg<BaseMenuRadioItemArgs, 'indicatorClass' | 'indicatorIconClass' | 'value'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'> & {
	value: string
}
export type MenuSubTriggerArgs = OmitArg<BaseMenuSubTriggerArgs, 'iconClass'> & FixedArgs<'iconClass'>

// Shared popup motion remains consumable by other floating families. Menu's
// complete visual recipes live in named Uno shortcuts so base descendants in
// composite families consume the exact same theme seam as this adapter.

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
	'playa-menu-content',
	minWidth[min],
)

/** Action item row; submenu triggers compose menuSubTriggerOpen over it. */
export const menuItem = 'playa-menu-item'

/** Checkbox/radio item row: indicator gutter instead of the item's inset. */
export const menuChoiceRow = 'playa-menu-choice-row'

/** Indicator slot inside a choice row. */
export const menuIndicator = 'playa-menu-indicator'

/** Non-interactive group label (menu design: text-sm, unlike select/command). */
export const menuLabel = 'playa-menu-label'

/** Separator between menu groups. */
export const menuSeparator = 'playa-menu-separator'

/** Right-aligned shortcut hint inside an item. */
export const menuShortcut = 'playa-menu-shortcut'

/** Check indicator icon for checkbox items. */
export const menuCheckIcon = 'playa-menu-check-icon'

/** Filled-circle indicator icon for radio items. */
export const menuRadioIcon = 'playa-menu-radio-icon'

/** Chevron icon for submenu triggers. */
export const menuSubTriggerIcon = 'playa-menu-sub-trigger-icon'

/** Open-state addon composed over menuItem on submenu triggers. */
export const menuSubTriggerOpen = 'playa-menu-sub-trigger-open'

const rootBase = 'playa-menu-root'
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
