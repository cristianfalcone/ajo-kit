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
	MenuArgs,
	MenuCheckboxItemArgs,
	MenuContentArgs,
	MenuGroupArgs,
	MenuItemArgs,
	MenuLabelArgs,
	MenuRadioGroupArgs,
	MenuRadioItemArgs,
	MenuSeparatorArgs,
	MenuShortcutArgs,
	MenuSubArgs,
	MenuSubContentArgs,
	MenuSubTriggerArgs,
	MenuTriggerArgs,
	MenuVariant,
} from 'ajo-ui/menu'
import {
	menuCheckIndicator,
	menuChoiceRow,
	menuContent,
	menuItem,
	menuLabel,
	menuSeparator,
	menuShortcut,
	menuSubTriggerOpen,
} from './internal/recipes'

export { MenuGroup, MenuRadioGroup, MenuSub, MenuTrigger } from 'ajo-ui/menu'

export type { MenuArgs, MenuCheckboxItemArgs, MenuContentArgs, MenuGroupArgs, MenuItemArgs, MenuLabelArgs, MenuRadioGroupArgs, MenuRadioItemArgs, MenuSeparatorArgs, MenuShortcutArgs, MenuSubArgs, MenuSubContentArgs, MenuSubTriggerArgs, MenuTriggerArgs, MenuVariant }
export type { PopupPlacement, PopupPosition } from 'ajo-ui/menu'

const rootBase = 'playa-menu-root'
const contentBase = menuContent()
// The radio indicator and the submenu chevron are base-owned nodes, themed by slot.
const radioIndicator = '*:data-[slot=menu-item-indicator]:playa-menu-indicator **:data-[slot=menu-item-indicator-icon]:playa-menu-radio-icon'
const subTriggerIcon = '*:data-[slot=menu-sub-trigger-icon]:playa-menu-sub-trigger-icon'

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
	<BaseMenuCheckboxItem {...attrs} class={clsx(menuChoiceRow, menuCheckIndicator, classes)} />
)

/** Radio item inside a menu radio group. */
const MenuRadioItem: Stateless<MenuRadioItemArgs> = ({ class: classes, value, ...attrs }) => (
	<BaseMenuRadioItem {...attrs} class={clsx(menuChoiceRow, radioIndicator, classes)} value={String(value)} />
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
	<BaseMenuSubTrigger {...attrs} class={clsx(menuItem, menuSubTriggerOpen, subTriggerIcon, classes)} />
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
