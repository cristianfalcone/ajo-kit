import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
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
import { menuCheckIndicator, menuContent } from './internal/menu'

export { MenuGroup, MenuRadioGroup, MenuSub, MenuTrigger } from 'ajo-ui/menu'

export type { MenuArgs, MenuCheckboxItemArgs, MenuContentArgs, MenuGroupArgs, MenuItemArgs, MenuLabelArgs, MenuRadioGroupArgs, MenuRadioItemArgs, MenuSeparatorArgs, MenuShortcutArgs, MenuSubArgs, MenuSubContentArgs, MenuSubTriggerArgs, MenuTriggerArgs, MenuVariant }
export type { PopupPlacement, PopupPosition } from 'ajo-ui/menu'

const rootBase = 'playa-menu-root'
// The radio indicator and the submenu chevron are base-owned nodes, themed by slot.
const radioIndicator = '*:data-[slot=menu-item-indicator]:playa-menu-indicator **:data-[slot=menu-item-indicator-icon]:playa-menu-radio-icon'
const subTriggerIcon = '*:data-[slot=menu-sub-trigger-icon]:playa-menu-sub-trigger-icon'

/** Root provider for a menu. */
const Menu: Stateless<MenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenu {...attrs} class={clx(rootBase, classes)} />
)

/** Popover menu content. */
const MenuContent: Stateless<MenuContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuContent {...attrs} class={clx(menuContent, classes)} />
)

/** Non-interactive label inside a menu. */
const MenuLabel: Stateless<MenuLabelArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuLabel {...attrs} class={clx('playa-menu-label', classes)} />
)

/** Standard menu action item. */
const MenuItem: Stateless<MenuItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuItem {...attrs} class={clx('playa-menu-item', classes)} />
)

/** Checkable menu item. */
const MenuCheckboxItem: Stateless<MenuCheckboxItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuCheckboxItem {...attrs} class={clx('playa-menu-choice-row', menuCheckIndicator, classes)} />
)

/** Radio item inside a menu radio group. */
const MenuRadioItem: Stateless<MenuRadioItemArgs> = ({ class: classes, value, ...attrs }) => (
	<BaseMenuRadioItem {...attrs} class={clx('playa-menu-choice-row', radioIndicator, classes)} value={String(value)} />
)

/** Visual separator between menu groups. */
const MenuSeparator: Stateless<MenuSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuSeparator {...attrs} class={clx('playa-menu-separator', classes)} />
)

/** Right-aligned shortcut hint inside a menu item. */
const MenuShortcut: Stateless<MenuShortcutArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuShortcut {...attrs} class={clx('playa-menu-shortcut', classes)} />
)

/** Trigger item that opens a submenu. */
const MenuSubTrigger: Stateless<MenuSubTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuSubTrigger {...attrs} class={clx('playa-menu-item playa-menu-sub-trigger-open', subTriggerIcon, classes)} />
)

/** Content for a submenu. */
const MenuSubContent: Stateless<MenuSubContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenuSubContent {...attrs} class={clx(menuContent, classes)} />
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
