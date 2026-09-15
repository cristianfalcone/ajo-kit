import type { Stateless } from 'ajo'
import clsx from 'clsx'
import { ContextMenu as BaseContextMenu } from 'ajo-ui/context-menu'
import type {
	ContextMenuArgs as BaseContextMenuArgs,
	ContextMenuContentArgs,
	ContextMenuGroupArgs,
	ContextMenuItemArgs,
	ContextMenuLabelArgs,
	ContextMenuRadioGroupArgs,
	ContextMenuSeparatorArgs,
	ContextMenuShortcutArgs,
	ContextMenuSubArgs,
	ContextMenuSubContentArgs,
	ContextMenuTriggerArgs,
} from 'ajo-ui/context-menu'
import { withSlot } from 'ajo-ui/utils'
import {
	MenuCheckboxItem,
	MenuContent,
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
export { ContextMenuGroup, ContextMenuRadioGroup, ContextMenuSub, ContextMenuTrigger } from 'ajo-ui/context-menu'

export type ContextMenuArgs = BaseContextMenuArgs
export type ContextMenuCheckboxItemArgs = MenuCheckboxItemArgs
export type ContextMenuRadioItemArgs = MenuRadioItemArgs
export type ContextMenuSubTriggerArgs = MenuSubTriggerArgs
export type { ContextMenuContentArgs, ContextMenuGroupArgs, ContextMenuItemArgs, ContextMenuLabelArgs, ContextMenuRadioGroupArgs, ContextMenuSeparatorArgs, ContextMenuShortcutArgs, ContextMenuSubArgs, ContextMenuSubContentArgs, ContextMenuTriggerArgs }

/** Root provider for a context menu. */
const ContextMenu: Stateless<ContextMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenu
		{...attrs}
		class={clsx('contents', classes)}
	/>
)

/** Popover menu content opened by a ContextMenuTrigger. */
const ContextMenuContent: Stateless<ContextMenuContentArgs> = withSlot(MenuContent, 'context-menu-content')

/** Standard context menu action item. */
const ContextMenuItem: Stateless<ContextMenuItemArgs> = withSlot(MenuItem, 'context-menu-item')

/** Checkable context menu item. */
const ContextMenuCheckboxItem: Stateless<ContextMenuCheckboxItemArgs> = withSlot(MenuCheckboxItem, 'context-menu-checkbox-item')

/** Radio item inside a context menu radio group. */
const ContextMenuRadioItem: Stateless<ContextMenuRadioItemArgs> = withSlot(MenuRadioItem, 'context-menu-radio-item')

/** Non-interactive label inside a context menu. */
const ContextMenuLabel: Stateless<ContextMenuLabelArgs> = withSlot(MenuLabel, 'context-menu-label')

/** Visual separator between context menu groups. */
const ContextMenuSeparator: Stateless<ContextMenuSeparatorArgs> = withSlot(MenuSeparator, 'context-menu-separator')

/** Right-aligned shortcut hint inside a context menu item. */
const ContextMenuShortcut: Stateless<ContextMenuShortcutArgs> = withSlot(MenuShortcut, 'context-menu-shortcut')

/** Trigger item that opens a context submenu. */
const ContextMenuSubTrigger: Stateless<ContextMenuSubTriggerArgs> = withSlot(MenuSubTrigger, 'context-menu-sub-trigger')

/** Content for a context submenu. */
const ContextMenuSubContent: Stateless<ContextMenuSubContentArgs> = withSlot(MenuSubContent, 'context-menu-sub-content')

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
