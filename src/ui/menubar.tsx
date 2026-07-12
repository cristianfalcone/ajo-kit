import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Menubar as BaseMenubar,
	MenubarCheckboxItem as BaseMenubarCheckboxItem,
	MenubarContent as BaseMenubarContent,
	MenubarItem as BaseMenubarItem,
	MenubarLabel as BaseMenubarLabel,
	MenubarMenu as BaseMenubarMenu,
	MenubarRadioItem as BaseMenubarRadioItem,
	MenubarSeparator as BaseMenubarSeparator,
	MenubarShortcut as BaseMenubarShortcut,
	MenubarSubContent as BaseMenubarSubContent,
	MenubarSubTrigger as BaseMenubarSubTrigger,
	MenubarTrigger as BaseMenubarTrigger,
} from 'ajo-ui/menubar'
import type {
	MenubarArgs,
	MenubarCheckboxItemArgs as BaseMenubarCheckboxItemArgs,
	MenubarContentArgs,
	MenubarGroupArgs,
	MenubarItemArgs,
	MenubarLabelArgs,
	MenubarMenuArgs,
	MenubarRadioGroupArgs,
	MenubarRadioItemArgs as BaseMenubarRadioItemArgs,
	MenubarSeparatorArgs,
	MenubarShortcutArgs,
	MenubarSubArgs,
	MenubarSubContentArgs,
	MenubarSubTriggerArgs as BaseMenubarSubTriggerArgs,
	MenubarTriggerArgs,
} from 'ajo-ui/menubar'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { menuCheckIcon, menuChoiceRow, menuContent, menuIndicator, menuItem, menuLabel, menuRadioIcon, menuSeparator, menuShortcut, menuSubTriggerIcon, menuSubTriggerOpen } from './menu'
export { MenubarGroup, MenubarRadioGroup, MenubarSub } from 'ajo-ui/menubar'

export type { MenubarArgs, MenubarContentArgs, MenubarGroupArgs, MenubarItemArgs, MenubarLabelArgs, MenubarMenuArgs, MenubarRadioGroupArgs, MenubarSeparatorArgs, MenubarShortcutArgs, MenubarSubArgs, MenubarSubContentArgs, MenubarTriggerArgs }
export type MenubarCheckboxItemArgs = OmitArg<BaseMenubarCheckboxItemArgs, 'indicatorClass' | 'indicatorIconClass'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'>
export type MenubarRadioItemArgs = OmitArg<BaseMenubarRadioItemArgs, 'indicatorClass' | 'indicatorIconClass' | 'value'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'> & {
	value: string
}
export type MenubarSubTriggerArgs = OmitArg<BaseMenubarSubTriggerArgs, 'iconClass'> & FixedArgs<'iconClass'>

const base = 'flex h-9 items-center gap-1 rounded-md glass-chrome edge p-1'
const triggerBase = 'flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-none select-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
const subContentBase = menuContent()

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
const MenubarItem: Stateless<MenubarItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarItem {...attrs} class={clsx(menuItem, classes)} />
)

/** Checkable menubar item. */
const MenubarCheckboxItem: Stateless<MenubarCheckboxItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarCheckboxItem
		{...attrs}
		class={clsx(menuChoiceRow, classes)}
		indicatorClass={menuIndicator}
		indicatorIconClass={menuCheckIcon}
	/>
)

/** Radio item inside a menubar radio group. */
const MenubarRadioItem: Stateless<MenubarRadioItemArgs> = ({ class: classes, value, ...attrs }) => (
	<BaseMenubarRadioItem
		{...attrs}
		class={clsx(menuChoiceRow, classes)}
		indicatorClass={menuIndicator}
		indicatorIconClass={menuRadioIcon}
		value={String(value)}
	/>
)

/** Non-interactive label inside a menubar menu. */
const MenubarLabel: Stateless<MenubarLabelArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarLabel {...attrs} class={clsx(menuLabel, classes)} />
)

/** Visual separator between menubar groups. */
const MenubarSeparator: Stateless<MenubarSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarSeparator {...attrs} class={clsx(menuSeparator, classes)} />
)

/** Right-aligned shortcut hint inside a menubar item. */
const MenubarShortcut: Stateless<MenubarShortcutArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarShortcut {...attrs} class={clsx(menuShortcut, classes)} />
)

/** Trigger item that opens a menubar submenu. */
const MenubarSubTrigger: Stateless<MenubarSubTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarSubTrigger
		{...attrs}
		class={clsx(menuItem, menuSubTriggerOpen, classes)}
		iconClass={menuSubTriggerIcon}
	/>
)

/** Content for a menubar submenu. */
const MenubarSubContent: Stateless<MenubarSubContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarSubContent {...attrs} class={clsx(subContentBase, classes)} />
)

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
