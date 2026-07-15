import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	ContextMenu as BaseContextMenu,
	ContextMenuCheckboxItem as BaseContextMenuCheckboxItem,
	ContextMenuContent as BaseContextMenuContent,
	ContextMenuItem as BaseContextMenuItem,
	ContextMenuLabel as BaseContextMenuLabel,
	ContextMenuRadioItem as BaseContextMenuRadioItem,
	ContextMenuSeparator as BaseContextMenuSeparator,
	ContextMenuShortcut as BaseContextMenuShortcut,
	ContextMenuSubContent as BaseContextMenuSubContent,
	ContextMenuSubTrigger as BaseContextMenuSubTrigger,
} from 'ajo-ui/context-menu'
import type {
	ContextMenuArgs as BaseContextMenuArgs,
	ContextMenuCheckboxItemArgs as BaseContextMenuCheckboxItemArgs,
	ContextMenuContentArgs,
	ContextMenuGroupArgs,
	ContextMenuItemArgs,
	ContextMenuLabelArgs,
	ContextMenuRadioGroupArgs,
	ContextMenuRadioItemArgs as BaseContextMenuRadioItemArgs,
	ContextMenuSeparatorArgs,
	ContextMenuShortcutArgs,
	ContextMenuSubArgs,
	ContextMenuSubContentArgs,
	ContextMenuSubTriggerArgs as BaseContextMenuSubTriggerArgs,
	ContextMenuTriggerArgs,
} from 'ajo-ui/context-menu'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { menuCheckIcon, menuChoiceRow, menuContent, menuIndicator, menuItem, menuLabel, menuRadioIcon, menuSeparator, menuShortcut, menuSubTriggerIcon, menuSubTriggerOpen } from './internal/recipes'
export { ContextMenuGroup, ContextMenuRadioGroup, ContextMenuSub, ContextMenuTrigger } from 'ajo-ui/context-menu'

export type ContextMenuArgs = BaseContextMenuArgs
export type ContextMenuCheckboxItemArgs = OmitArg<BaseContextMenuCheckboxItemArgs, 'indicatorClass' | 'indicatorIconClass'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'>
export type ContextMenuRadioItemArgs = OmitArg<BaseContextMenuRadioItemArgs, 'indicatorClass' | 'indicatorIconClass' | 'value'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'> & {
	value: string
}
export type ContextMenuSubTriggerArgs = OmitArg<BaseContextMenuSubTriggerArgs, 'iconClass'> & FixedArgs<'iconClass'>
export type { ContextMenuContentArgs, ContextMenuGroupArgs, ContextMenuItemArgs, ContextMenuLabelArgs, ContextMenuRadioGroupArgs, ContextMenuSeparatorArgs, ContextMenuShortcutArgs, ContextMenuSubArgs, ContextMenuSubContentArgs, ContextMenuTriggerArgs }

const contentBase = menuContent()

/** Root provider for a context menu. */
const ContextMenu: Stateless<ContextMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenu
		{...attrs}
		class={clsx('contents', classes)}
	/>
)

/** Popover menu content opened by a ContextMenuTrigger. */
const ContextMenuContent: Stateless<ContextMenuContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenuContent {...attrs} class={clsx(contentBase, classes)} />
)

/** Standard context menu action item. */
const ContextMenuItem: Stateless<ContextMenuItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenuItem {...attrs} class={clsx(menuItem, classes)} />
)

/** Checkable context menu item. */
const ContextMenuCheckboxItem: Stateless<ContextMenuCheckboxItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenuCheckboxItem
		{...attrs}
		class={clsx(menuChoiceRow, classes)}
		indicatorClass={menuIndicator}
		indicatorIconClass={menuCheckIcon}
	/>
)

/** Radio item inside a context menu radio group. */
const ContextMenuRadioItem: Stateless<ContextMenuRadioItemArgs> = ({ class: classes, value, ...attrs }) => (
	<BaseContextMenuRadioItem
		{...attrs}
		class={clsx(menuChoiceRow, classes)}
		indicatorClass={menuIndicator}
		indicatorIconClass={menuRadioIcon}
		value={String(value)}
	/>
)

/** Non-interactive label inside a context menu. */
const ContextMenuLabel: Stateless<ContextMenuLabelArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenuLabel {...attrs} class={clsx(menuLabel, classes)} />
)

/** Visual separator between context menu groups. */
const ContextMenuSeparator: Stateless<ContextMenuSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenuSeparator {...attrs} class={clsx(menuSeparator, classes)} />
)

/** Right-aligned shortcut hint inside a context menu item. */
const ContextMenuShortcut: Stateless<ContextMenuShortcutArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenuShortcut {...attrs} class={clsx(menuShortcut, classes)} />
)

/** Trigger item that opens a context submenu. */
const ContextMenuSubTrigger: Stateless<ContextMenuSubTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenuSubTrigger
		{...attrs}
		class={clsx(menuItem, menuSubTriggerOpen, classes)}
		iconClass={menuSubTriggerIcon}
	/>
)

/** Content for a context submenu. */
const ContextMenuSubContent: Stateless<ContextMenuSubContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenuSubContent {...attrs} class={clsx(contentBase, classes)} />
)

export {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
}
