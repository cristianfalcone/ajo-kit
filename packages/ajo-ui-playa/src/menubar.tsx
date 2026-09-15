import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Menubar as BaseMenubar,
	MenubarContent as BaseMenubarContent,
	MenubarMenu as BaseMenubarMenu,
	MenubarTrigger as BaseMenubarTrigger,
} from 'ajo-ui/menubar'
import type {
	MenubarArgs,
	MenubarContentArgs,
	MenubarGroupArgs,
	MenubarItemArgs,
	MenubarLabelArgs,
	MenubarMenuArgs,
	MenubarRadioGroupArgs,
	MenubarSeparatorArgs,
	MenubarShortcutArgs,
	MenubarSubArgs,
	MenubarSubContentArgs,
	MenubarTriggerArgs,
} from 'ajo-ui/menubar'
import { withSlot } from 'ajo-ui/utils'
import { menuContent } from './internal/recipes'
import {
	MenuCheckboxItem,
	MenuItem,
	MenuLabel,
	MenuRadioItem,
	MenuSeparator,
	MenuShortcut,
	MenuSubContent,
	MenuSubTrigger,
	type MenuCheckboxItemArgs,
	type MenuRadioItemArgs,
	type MenuSubTriggerArgs,
} from './menu'
export { MenubarGroup, MenubarRadioGroup, MenubarSub } from 'ajo-ui/menubar'
export type { PopupPlacement, PopupPosition } from 'ajo-ui/menubar'

export type { MenubarArgs, MenubarContentArgs, MenubarGroupArgs, MenubarItemArgs, MenubarLabelArgs, MenubarMenuArgs, MenubarRadioGroupArgs, MenubarSeparatorArgs, MenubarShortcutArgs, MenubarSubArgs, MenubarSubContentArgs, MenubarTriggerArgs }
export type MenubarCheckboxItemArgs = MenuCheckboxItemArgs
export type MenubarRadioItemArgs = MenuRadioItemArgs
export type MenubarSubTriggerArgs = MenuSubTriggerArgs

const base = 'flex h-9 items-center gap-1 rounded-md glass-chrome edge p-1'
const triggerBase = 'flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-none select-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'

/** Persistent horizontal menu bar. */
const Menubar: Stateless<MenubarArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubar {...attrs} class={clsx(base, classes)} />
)

/** Top-level Menubar menu. */
const MenubarMenu: Stateless<MenubarMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarMenu {...attrs} class={clsx('contents', classes)} />
)

/** Top-level trigger inside a Menubar. */
const MenubarTrigger: Stateless<MenubarTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarTrigger {...attrs} class={clsx(triggerBase, classes)} />
)

/** Popover content for a top-level Menubar menu. */
const MenubarContent: Stateless<MenubarContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarContent {...attrs} class={clsx(menuContent({ minWidth: '12rem' }), classes)} />
)

/** Standard menubar action item. */
const MenubarItem: Stateless<MenubarItemArgs> = withSlot(MenuItem, 'menubar-item')

/** Checkable menubar item. */
const MenubarCheckboxItem: Stateless<MenubarCheckboxItemArgs> = withSlot(MenuCheckboxItem, 'menubar-checkbox-item')

/** Radio item inside a menubar radio group. */
const MenubarRadioItem: Stateless<MenubarRadioItemArgs> = withSlot(MenuRadioItem, 'menubar-radio-item')

/** Non-interactive label inside a menubar menu. */
const MenubarLabel: Stateless<MenubarLabelArgs> = withSlot(MenuLabel, 'menubar-label')

/** Visual separator between menubar groups. */
const MenubarSeparator: Stateless<MenubarSeparatorArgs> = withSlot(MenuSeparator, 'menubar-separator')

/** Right-aligned shortcut hint inside a menubar item. */
const MenubarShortcut: Stateless<MenubarShortcutArgs> = withSlot(MenuShortcut, 'menubar-shortcut')

/** Trigger item that opens a menubar submenu. */
const MenubarSubTrigger: Stateless<MenubarSubTriggerArgs> = withSlot(MenuSubTrigger, 'menubar-sub-trigger')

/** Content for a menubar submenu. */
const MenubarSubContent: Stateless<MenubarSubContentArgs> = withSlot(MenuSubContent, 'menubar-sub-content')

export {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarItem,
	MenubarLabel,
	MenubarMenu,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
}
