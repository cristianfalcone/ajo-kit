import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import {
	Command as BaseCommand,
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
	CommandEmptyArgs,
	CommandFilter,
	CommandGroupArgs,
	CommandInputArgs,
	CommandItemArgs,
	CommandListArgs,
	CommandSeparatorArgs,
	CommandShortcutArgs,
} from 'ajo-ui/command'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	type DialogContentArgs,
} from 'ajo-ui/dialog'
import { clx, type OmitArg } from 'ajo-ui/utils'
import { DialogClose } from './dialog'
import {
	modalCentered,
	modalClosed,
	modalEnter,
	modalSurface,
	scrollAreaVariants,
} from './internal/recipes'

export type { CommandArgs, CommandEmptyArgs, CommandFilter, CommandGroupArgs, CommandInputArgs, CommandItemArgs, CommandListArgs, CommandSeparatorArgs, CommandShortcutArgs }
/** Arguments for a native dialog that owns a Command palette. */
export type CommandDialogArgs = WithChildren<OmitArg<IntrinsicElements['dialog'], 'open'> & {
	/** Controlled dialog open state. */
	open?: boolean
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Called whenever the dialog opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Called when the native backdrop is clicked. Prevent default to keep it open. */
	onPointerDownOutside?: DialogContentArgs['onPointerDownOutside']
	/** Accessible dialog title. */
	title?: string
	/** Accessible dialog description. */
	description?: string
	/** Accessible label for the close button. */
	closeLabel?: string
	/** Additional UnoCSS classes for the dialog panel. */
	class?: string
}>

const base = 'flex h-full w-full flex-col overflow-hidden rounded-md text-popover-foreground'
const dialogBase = clx(
	modalClosed,
	modalSurface,
	modalCentered,
	modalEnter,
	'max-h-[85vh] w-[min(92vw,32rem)] overflow-hidden rounded-xl edge p-0',
)
const dialogCommandBase = '**:data-[slot=command-input-wrapper]:h-12 [&_[data-slot=command-input-wrapper]_svg]:size-5 [&_[data-slot=command-input]]:h-12 [&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item]]:py-3 [&_[data-slot=command-item]_svg]:size-5'
const inputBase = 'flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50'
// The input's wrapper and search icon, and a group's heading, are base-owned
// nodes themed through their slots from the Command root.
const slotBase = [
	'[&_:where([data-slot=command-input-wrapper])]:flex [&_:where([data-slot=command-input-wrapper])]:h-9 [&_:where([data-slot=command-input-wrapper])]:items-center [&_:where([data-slot=command-input-wrapper])]:gap-2 [&_:where([data-slot=command-input-wrapper])]:border-b [&_:where([data-slot=command-input-wrapper])]:px-3',
	'[&_:where([data-slot=command-input-icon])]:i-lucide-search [&_:where([data-slot=command-input-icon])]:size-4 [&_:where([data-slot=command-input-icon])]:shrink-0 [&_:where([data-slot=command-input-icon])]:opacity-50',
	'[&_:where([data-slot=command-group-heading])]:px-2 [&_:where([data-slot=command-group-heading])]:py-1.5 [&_:where([data-slot=command-group-heading])]:text-xs [&_:where([data-slot=command-group-heading])]:font-medium [&_:where([data-slot=command-group-heading])]:text-muted-foreground',
].join(' ')
const listBase = clx(scrollAreaVariants({ axis: 'y' }), 'max-h-[300px] scroll-py-1')
// Shares the menu row token: command speaks the same data-highlighted/
// data-disabled vocabulary; the token's focus/inset/danger selectors never
// match here (items are unfocusable option divs without those attrs).

/** Searchable command menu. */
const Command: Stateless<CommandArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommand {...attrs} class={clx(base, slotBase, classes)} />
)

/** Native dialog wrapper for a Command palette; keep it open on Escape by preventing the Escape keydown. */
const CommandDialog: Stateless<CommandDialogArgs> = ({
	children,
	class: classes,
	closeLabel = 'Close',
	defaultOpen,
	description = 'Search for a command to run...',
	onOpenChange,
	open,
	title = 'Command Palette',
	...attrs
}) => (
	<Dialog class="contents" defaultOpen={defaultOpen} onOpenChange={onOpenChange} open={open}>
		<DialogContent {...attrs} class={clx(dialogBase, classes)} data-slot="command-dialog">
			<div class="sr-only">
				<DialogTitle>{title}</DialogTitle>
				<DialogDescription>{description}</DialogDescription>
			</div>
			<DialogClose aria-label={closeLabel} />
			<Command class={dialogCommandBase}>
				{children}
			</Command>
		</DialogContent>
	</Dialog>
)

/** Search input for a Command menu. */
const CommandInput: Stateless<CommandInputArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandInput {...attrs} class={clx(inputBase, classes)} />
)

/** Scrollable list for command options. */
const CommandList: Stateless<CommandListArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandList {...attrs} class={clx(listBase, classes)} />
)

/** Empty state shown when filtering hides every command item. */
const CommandEmpty: Stateless<CommandEmptyArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandEmpty {...attrs} class={clx('py-6 text-center text-sm', classes)} />
)

/** Group of related command items. */
const CommandGroup: Stateless<CommandGroupArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandGroup {...attrs} class={clx('overflow-hidden p-1 text-foreground', classes)} />
)

/** Visual separator between command groups. */
const CommandSeparator: Stateless<CommandSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandSeparator {...attrs} class={clx('-mx-1 h-px bg-border', classes)} />
)

/** Selectable command option. */
const CommandItem: Stateless<CommandItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandItem {...attrs} class={clx('playa-menu-item', classes)} />
)

/** Right-aligned shortcut hint inside a CommandItem. */
const CommandShortcut: Stateless<CommandShortcutArgs> = ({ class: classes, ...attrs }) => (
	<BaseCommandShortcut {...attrs} class={clx('playa-menu-shortcut', classes)} />
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
