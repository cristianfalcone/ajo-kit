import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Command as BaseCommand,
	CommandDialog as BaseCommandDialog,
	CommandEmpty as BaseCommandEmpty,
	CommandGroup as BaseCommandGroup,
	CommandInput as BaseCommandInput,
	CommandItem as BaseCommandItem,
	CommandList as BaseCommandList,
	CommandSeparator as BaseCommandSeparator,
	CommandShortcut as BaseCommandShortcut,
} from 'ajo-ui/command'
import type {
	CommandArgs,
	CommandDialogArgs as BaseCommandDialogArgs,
	CommandEmptyArgs,
	CommandFilter,
	CommandGroupArgs as BaseCommandGroupArgs,
	CommandInputArgs as BaseCommandInputArgs,
	CommandItemArgs,
	CommandListArgs,
	CommandSeparatorArgs,
	CommandShortcutArgs,
} from 'ajo-ui/command'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { menuItem, menuShortcut } from './menu'
import { modalCentered, modalClose, modalClosed, modalEnter, modalSurface } from './modal'
import { scrollAreaVariants } from './scroll-area'

export type { CommandArgs, CommandEmptyArgs, CommandFilter, CommandItemArgs, CommandListArgs, CommandSeparatorArgs, CommandShortcutArgs }
export type CommandDialogArgs = OmitArg<BaseCommandDialogArgs, 'commandClass' | 'closeClass' | 'closeIconClass' | 'descriptionClass' | 'titleClass'> & FixedArgs<'commandClass' | 'closeClass' | 'closeIconClass' | 'descriptionClass' | 'titleClass'> & {
	/** Additional UnoCSS classes for dialog content. */
	class?: string
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Accessible dialog description. */
	description?: string
	/** Called whenever the dialog opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Controlled dialog open state. */
	open?: boolean
	/** Show the default close button. */
	showCloseButton?: boolean
	/** Accessible dialog title. */
	title?: string
}
export type CommandInputArgs = OmitArg<BaseCommandInputArgs, 'iconClass' | 'wrapperClass'> & FixedArgs<'iconClass' | 'wrapperClass'>
export type CommandGroupArgs = OmitArg<BaseCommandGroupArgs, 'headingClass'> & FixedArgs<'headingClass'>

const base = 'flex h-full w-full flex-col overflow-hidden rounded-md text-popover-foreground'
const dialogBase = clsx(
	modalClosed,
	modalSurface,
	modalCentered,
	modalEnter,
	'max-h-[85vh] w-[min(92vw,32rem)] overflow-hidden rounded-xl edge p-0',
)
const dialogCommandBase = '**:data-[slot=command-input-wrapper]:h-12 [&_[data-slot=command-input-wrapper]_svg]:size-5 [&_[data-slot=command-input]]:h-12 [&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item]]:py-3 [&_[data-slot=command-item]_svg]:size-5'
const inputBase = 'flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50'
const listBase = clsx(scrollAreaVariants({ axis: 'y' }), 'max-h-[300px] scroll-py-1')
// Shares the menu row token: command speaks the same data-highlighted/
// data-disabled vocabulary; the token's focus/inset/danger selectors never
// match here (items are unfocusable option divs without those attrs).
const itemBase = menuItem

/** Searchable command menu. */
const Command: Stateless<CommandArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommand {...attrs} class={clsx(base, classes)} />
)

/** Native dialog wrapper for a Command palette. */
const CommandDialog: Stateless<CommandDialogArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandDialog
		{...attrs}
		class={clsx(dialogBase, classes)}
		closeClass={modalClose}
		closeIconClass="i-lucide-x block size-4"
		commandClass={clsx(base, dialogCommandBase)}
		titleClass="sr-only"
	/>
)

/** Search input for a Command menu. */
const CommandInput: Stateless<CommandInputArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandInput
		{...attrs}
		class={clsx(inputBase, classes)}
		iconClass="i-lucide-search size-4 shrink-0 opacity-50"
		wrapperClass="flex h-9 items-center gap-2 border-b px-3"
	/>
)

/** Scrollable list for command options. */
const CommandList: Stateless<CommandListArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandList {...attrs} class={clsx(listBase, classes)} />
)

/** Empty state shown when filtering hides every command item. */
const CommandEmpty: Stateless<CommandEmptyArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandEmpty {...attrs} class={clsx('py-6 text-center text-sm', classes)} />
)

/** Group of related command items. */
const CommandGroup: Stateless<CommandGroupArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandGroup
		{...attrs}
		class={clsx('overflow-hidden p-1 text-foreground', classes)}
		headingClass="px-2 py-1.5 text-xs font-medium text-muted-foreground"
	/>
)

/** Visual separator between command groups. */
const CommandSeparator: Stateless<CommandSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandSeparator {...attrs} class={clsx('-mx-1 h-px bg-border', classes)} />
)

/** Selectable command option. */
const CommandItem: Stateless<CommandItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandItem {...attrs} class={clsx(itemBase, classes)} />
)

/** Right-aligned shortcut hint inside a CommandItem. */
const CommandShortcut: Stateless<CommandShortcutArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandShortcut {...attrs} class={clsx(menuShortcut, classes)} />
)

export {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
}
