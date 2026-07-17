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
	MenuCheckboxItemArgs as BaseMenuCheckboxItemArgs,
	MenuContentArgs,
	MenuGroupArgs,
	MenuItemArgs,
	MenuLabelArgs,
	MenuRadioGroupArgs,
	MenuRadioItemArgs as BaseMenuRadioItemArgs,
	MenuSeparatorArgs,
	MenuShortcutArgs,
	MenuSubArgs,
	MenuSubContentArgs,
	MenuSubTriggerArgs as BaseMenuSubTriggerArgs,
	MenuTriggerArgs,
	MenuVariant,
} from 'ajo-ui/menu'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import {
	menuCheckIcon,
	menuChoiceRow,
	menuContent,
	menuIndicator,
	menuItem,
	menuLabel,
	menuRadioIcon,
	menuSeparator,
	menuShortcut,
	menuSubTriggerIcon,
	menuSubTriggerOpen,
} from './internal/recipes'

export { MenuGroup, MenuRadioGroup, MenuSub, MenuTrigger } from 'ajo-ui/menu'

export type { MenuArgs, MenuContentArgs, MenuGroupArgs, MenuItemArgs, MenuLabelArgs, MenuRadioGroupArgs, MenuSeparatorArgs, MenuShortcutArgs, MenuSubArgs, MenuSubContentArgs, MenuTriggerArgs, MenuVariant }
export type { PopupPlacement, PopupPosition } from 'ajo-ui/menu'
export type MenuCheckboxItemArgs = OmitArg<BaseMenuCheckboxItemArgs, 'indicatorClass' | 'indicatorIconClass'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'>
export type MenuRadioItemArgs = OmitArg<BaseMenuRadioItemArgs, 'indicatorClass' | 'indicatorIconClass' | 'value'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'> & {
	value: string
}
export type MenuSubTriggerArgs = OmitArg<BaseMenuSubTriggerArgs, 'iconClass'> & FixedArgs<'iconClass'>

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
