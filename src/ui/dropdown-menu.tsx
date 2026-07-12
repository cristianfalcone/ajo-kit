import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	DropdownMenu as BaseDropdownMenu,
	DropdownMenuCheckboxItem as BaseDropdownMenuCheckboxItem,
	DropdownMenuContent as BaseDropdownMenuContent,
	DropdownMenuItem as BaseDropdownMenuItem,
	DropdownMenuLabel as BaseDropdownMenuLabel,
	DropdownMenuRadioItem as BaseDropdownMenuRadioItem,
	DropdownMenuSeparator as BaseDropdownMenuSeparator,
	DropdownMenuShortcut as BaseDropdownMenuShortcut,
	DropdownMenuSubContent as BaseDropdownMenuSubContent,
	DropdownMenuSubTrigger as BaseDropdownMenuSubTrigger,
} from 'ajo-ui/dropdown-menu'
import type {
	DropdownMenuAlign,
	DropdownMenuAnchorArgs,
	DropdownMenuArgs,
	DropdownMenuCheckboxItemArgs as BaseDropdownMenuCheckboxItemArgs,
	DropdownMenuContentArgs,
	DropdownMenuGroupArgs,
	DropdownMenuItemArgs,
	DropdownMenuLabelArgs,
	DropdownMenuRadioGroupArgs,
	DropdownMenuRadioItemArgs as BaseDropdownMenuRadioItemArgs,
	DropdownMenuSeparatorArgs,
	DropdownMenuShortcutArgs,
	DropdownMenuSide,
	DropdownMenuSubArgs,
	DropdownMenuSubContentArgs,
	DropdownMenuSubTriggerArgs as BaseDropdownMenuSubTriggerArgs,
	DropdownMenuTriggerArgs,
	DropdownMenuVariant,
} from 'ajo-ui/dropdown-menu'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { menuCheckIcon, menuChoiceRow, menuContent, menuIndicator, menuItem, menuLabel, menuRadioIcon, menuSeparator, menuShortcut, menuSubTriggerIcon, menuSubTriggerOpen } from './menu'
export { DropdownMenuAnchor, DropdownMenuGroup, DropdownMenuRadioGroup, DropdownMenuSub, DropdownMenuTrigger } from 'ajo-ui/dropdown-menu'

export type { DropdownMenuAlign, DropdownMenuAnchorArgs, DropdownMenuArgs, DropdownMenuContentArgs, DropdownMenuGroupArgs, DropdownMenuItemArgs, DropdownMenuLabelArgs, DropdownMenuRadioGroupArgs, DropdownMenuSeparatorArgs, DropdownMenuShortcutArgs, DropdownMenuSide, DropdownMenuSubArgs, DropdownMenuSubContentArgs, DropdownMenuTriggerArgs, DropdownMenuVariant }
export type DropdownMenuCheckboxItemArgs = OmitArg<BaseDropdownMenuCheckboxItemArgs, 'indicatorClass' | 'indicatorIconClass'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'>
export type DropdownMenuRadioItemArgs = OmitArg<BaseDropdownMenuRadioItemArgs, 'indicatorClass' | 'indicatorIconClass' | 'value'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'> & {
	value: string
}
export type DropdownMenuSubTriggerArgs = OmitArg<BaseDropdownMenuSubTriggerArgs, 'iconClass'> & FixedArgs<'iconClass'>

const rootBase = 'relative inline-block'
const contentBase = menuContent()

/** Root provider for a dropdown menu. */
const DropdownMenu: Stateless<DropdownMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseDropdownMenu {...attrs} class={clsx(rootBase, classes)} />
)

/** Popover menu content. */
const DropdownMenuContent: Stateless<DropdownMenuContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseDropdownMenuContent {...attrs} class={clsx(contentBase, classes)} />
)

/** Non-interactive label inside a dropdown menu. */
const DropdownMenuLabel: Stateless<DropdownMenuLabelArgs> = ({ class: classes, ...attrs }) => (
	<BaseDropdownMenuLabel {...attrs} class={clsx(menuLabel, classes)} />
)

/** Standard dropdown menu action item. */
const DropdownMenuItem: Stateless<DropdownMenuItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseDropdownMenuItem {...attrs} class={clsx(menuItem, classes)} />
)

/** Checkable dropdown menu item. */
const DropdownMenuCheckboxItem: Stateless<DropdownMenuCheckboxItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseDropdownMenuCheckboxItem
		{...attrs}
		class={clsx(menuChoiceRow, classes)}
		indicatorClass={menuIndicator}
		indicatorIconClass={menuCheckIcon}
	/>
)

/** Radio item inside a dropdown menu radio group. */
const DropdownMenuRadioItem: Stateless<DropdownMenuRadioItemArgs> = ({ class: classes, value, ...attrs }) => (
	<BaseDropdownMenuRadioItem
		{...attrs}
		class={clsx(menuChoiceRow, classes)}
		indicatorClass={menuIndicator}
		indicatorIconClass={menuRadioIcon}
		value={String(value)}
	/>
)

/** Visual separator between dropdown menu groups. */
const DropdownMenuSeparator: Stateless<DropdownMenuSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseDropdownMenuSeparator {...attrs} class={clsx(menuSeparator, classes)} />
)

/** Right-aligned shortcut hint inside a dropdown menu item. */
const DropdownMenuShortcut: Stateless<DropdownMenuShortcutArgs> = ({ class: classes, ...attrs }) => (
	<BaseDropdownMenuShortcut {...attrs} class={clsx(menuShortcut, classes)} />
)

/** Trigger item that opens a dropdown submenu. */
const DropdownMenuSubTrigger: Stateless<DropdownMenuSubTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseDropdownMenuSubTrigger
		{...attrs}
		class={clsx(menuItem, menuSubTriggerOpen, classes)}
		iconClass={menuSubTriggerIcon}
	/>
)

/** Content for a dropdown submenu. */
const DropdownMenuSubContent: Stateless<DropdownMenuSubContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseDropdownMenuSubContent {...attrs} class={clsx(contentBase, classes)} />
)

export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
}
