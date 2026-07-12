import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, controlled, listen, restore, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import {
	DropdownMenu,
	DropdownMenuAnchor,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	MenuContext,
	SURFACE_SELECTOR,
	focusEdge,
} from './dropdown-menu'
import type {
	DropdownMenuCheckboxItemArgs,
	DropdownMenuContentArgs,
	DropdownMenuGroupArgs,
	DropdownMenuItemArgs,
	DropdownMenuLabelArgs,
	DropdownMenuArgs,
	DropdownMenuRadioGroupArgs,
	DropdownMenuRadioItemArgs,
	DropdownMenuSeparatorArgs,
	DropdownMenuShortcutArgs,
	DropdownMenuSubContentArgs,
	DropdownMenuSubArgs,
	DropdownMenuSubTriggerArgs,
} from './dropdown-menu'
import { withSlot } from './utils'

export type ContextMenuArgs = DropdownMenuArgs
export type ContextMenuContentArgs = DropdownMenuContentArgs
export type ContextMenuItemArgs = DropdownMenuItemArgs
export type ContextMenuCheckboxItemArgs = DropdownMenuCheckboxItemArgs
export type ContextMenuRadioGroupArgs = DropdownMenuRadioGroupArgs
export type ContextMenuRadioItemArgs = DropdownMenuRadioItemArgs
export type ContextMenuLabelArgs = DropdownMenuLabelArgs
export type ContextMenuGroupArgs = DropdownMenuGroupArgs
export type ContextMenuSeparatorArgs = DropdownMenuSeparatorArgs
export type ContextMenuShortcutArgs = DropdownMenuShortcutArgs
export type ContextMenuSubArgs = DropdownMenuSubArgs
export type ContextMenuSubTriggerArgs = DropdownMenuSubTriggerArgs
export type ContextMenuSubContentArgs = DropdownMenuSubContentArgs

export type ContextMenuTriggerArgs = WithChildren<IntrinsicElements['div'] & {
	/** Disable context menu activation. */
	disabled?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}>

type ContextMenuContextValue = {
	disabled: boolean
	open: boolean
	openAt: (x: number, y: number, event: Event, source: HTMLElement | null, focus?: 'first') => void
	setContent: (element: HTMLElement | null) => void
}

const ContextMenuContext = context<ContextMenuContextValue | null>(null)

const ContextMenuRoot: Stateful<ContextMenuArgs> = function* ({ defaultOpen, open }) {
	// This menu's own surface, captured through ContextMenuContent's ref — a
	// DOM query would resolve a nested menu family's content in tree order.
	let content: HTMLElement | null = null
	let disabled = false
	let onOpenChange: ContextMenuArgs['onOpenChange']
	let point = { x: 0, y: 0 }
	const focus = restore(this)
	const openState = controlled<boolean>(this, {
		fallback: Boolean(open ?? defaultOpen),
		onChange: (next, event) => onOpenChange?.(next, event),
	})

	const setContent = (element: HTMLElement | null) => content = element

	const setOpen = (next: boolean, event?: Event) => {
		if (disabled && next) return
		if (next !== openState.value) openState.set(next, event)
		if (!next) focus.restore()
	}

	const openAt = (x: number, y: number, event: Event, element: HTMLElement | null, focusItem?: 'first') => {
		if (disabled) return
		point = { x, y }
		focus.capture(element)
		if (!openState.value) openState.set(true, event)
		else this.next()
		// Focus follows input modality: keyboard opens land on the first item
		// (the substrate's policy — disabled items stay focusable via the
		// exported focusEdge); pointer opens focus the surface itself, so
		// arrows enter the items without a phantom highlight.
		queueMicrotask(() => focusItem === 'first' ? focusEdge(content, 'first') : content?.focus())
	}

	// While open, a right-click (or ContextMenu key) over the menu itself
	// must not summon the browser's native context menu.
	listen(this, 'contextmenu', (event: Event) => {
		if (!openState.value) return
		const target = event.target as HTMLElement | null
		if (target?.closest(SURFACE_SELECTOR)) event.preventDefault()
	})

	for (const args of this) {
		disabled = Boolean(args.disabled)
		onOpenChange = args.onOpenChange
		openState.sync(args.open != null ? Boolean(args.open) : undefined)

		ContextMenuContext({ disabled, open: openState.value, openAt, setContent })

		yield (
			<DropdownMenu
				disabled={disabled}
				onOpenChange={setOpen}
				open={openState.value}
			>
				<DropdownMenuAnchor
					data-slot="context-menu-anchor"
					style={`position:fixed;left:${point.x}px;top:${point.y}px;width:0;height:0`}
				/>
				{args.children}
			</DropdownMenu>
		)
	}
}


/** Root provider for a context menu. */
const ContextMenu: Stateless<ContextMenuArgs> = ({
	children,
	class: classes,
	defaultOpen,
	disabled,
	onOpenChange,
	open,
	...attrs
}) => (
	<ContextMenuRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		disabled={disabled}
		onOpenChange={onOpenChange}
		open={open}
		attr:class={classes}
		attr:data-slot="context-menu"
	>
		{children}
	</ContextMenuRoot>
)

/** Surface that opens its ContextMenu from right-click, long-press contextmenu events, or keyboard menu keys. */
const ContextMenuTrigger: Stateless<ContextMenuTriggerArgs> = ({
	children,
	class: classes,
	disabled,
	ref,
	tabindex,
	'set:oncontextmenu': onContextMenu,
	'set:onkeydown': onKeydown,
	...attrs
}) => {
	const menu = ContextMenuContext()
	const dropdown = MenuContext()
	const disabledFlag = Boolean(disabled ?? menu?.disabled)
	const reference = (element: HTMLDivElement | null) => {
		callRef(ref, element)
	}

	return (
		<div
			{...attrs}
			aria-controls={dropdown?.contentId}
			aria-disabled={disabledFlag ? 'true' : undefined}
			aria-expanded={menu?.open ? 'true' : 'false'}
			aria-haspopup="menu"
			class={classes}
			data-disabled={disabledFlag ? 'true' : undefined}
			data-slot="context-menu-trigger"
			data-state={menu?.open ? 'open' : 'closed'}
			ref={reference}
			set:oncontextmenu={(event: MouseEvent) => {
				const element = event.currentTarget as HTMLElement | null
				callHandler(onContextMenu, event)
				if (event.defaultPrevented || disabledFlag) return
				event.preventDefault()
				menu?.openAt(event.clientX, event.clientY, event, element)
			}}
			set:onkeydown={(event: KeyboardEvent) => {
				const element = event.currentTarget as HTMLElement | null
				callHandler(onKeydown, event)
				if (event.defaultPrevented || disabledFlag) return
				if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return
				event.preventDefault()
				const rect = element?.getBoundingClientRect()
				menu?.openAt(rect?.left ?? 0, rect?.bottom ?? 0, event, element, 'first')
			}}
			tabindex={disabledFlag ? undefined : tabindex ?? 0}
		>
			{children}
		</div>
	)
}

/** Popover menu content opened by a ContextMenuTrigger. */
const ContextMenuContent: Stateless<ContextMenuContentArgs> = ({ ref, ...attrs }) => {
	const menu = ContextMenuContext()

	return (
		<DropdownMenuContent
			align="start"
			side="bottom"
			sideOffset={2}
			{...attrs}
			data-slot="context-menu-content"
			ref={(element: HTMLDivElement | null) => {
				menu?.setContent(element)
				callRef(ref, element)
			}}
		/>
	)
}

/** Standard context menu action item. */
const ContextMenuItem: Stateless<ContextMenuItemArgs> = withSlot<ContextMenuItemArgs>(DropdownMenuItem, 'context-menu-item')

/** Checkable context menu item. */
const ContextMenuCheckboxItem: Stateless<ContextMenuCheckboxItemArgs> = withSlot<ContextMenuCheckboxItemArgs>(DropdownMenuCheckboxItem, 'context-menu-checkbox-item')

/** Radio group inside a context menu. */
const ContextMenuRadioGroup: Stateless<ContextMenuRadioGroupArgs> = withSlot<ContextMenuRadioGroupArgs>(DropdownMenuRadioGroup, 'context-menu-radio-group')

/** Radio item inside a context menu radio group. */
const ContextMenuRadioItem: Stateless<ContextMenuRadioItemArgs> = withSlot<ContextMenuRadioItemArgs>(DropdownMenuRadioItem, 'context-menu-radio-item')

/** Group of context menu items. */
const ContextMenuGroup: Stateless<ContextMenuGroupArgs> = withSlot<ContextMenuGroupArgs>(DropdownMenuGroup, 'context-menu-group')

/** Non-interactive label inside a context menu. */
const ContextMenuLabel: Stateless<ContextMenuLabelArgs> = withSlot<ContextMenuLabelArgs>(DropdownMenuLabel, 'context-menu-label')

/** Visual separator between context menu groups. */
const ContextMenuSeparator: Stateless<ContextMenuSeparatorArgs> = withSlot<ContextMenuSeparatorArgs>(DropdownMenuSeparator, 'context-menu-separator')

/** Right-aligned shortcut hint inside a context menu item. */
const ContextMenuShortcut: Stateless<ContextMenuShortcutArgs> = withSlot<ContextMenuShortcutArgs>(DropdownMenuShortcut, 'context-menu-shortcut')

/** Root provider for a context submenu. */
const ContextMenuSub: Stateless<ContextMenuSubArgs> = withSlot<ContextMenuSubArgs>(DropdownMenuSub, 'context-menu-sub')

/** Trigger item that opens a context submenu. */
const ContextMenuSubTrigger: Stateless<ContextMenuSubTriggerArgs> = withSlot<ContextMenuSubTriggerArgs>(DropdownMenuSubTrigger, 'context-menu-sub-trigger')

/** Content for a context submenu. */
const ContextMenuSubContent: Stateless<ContextMenuSubContentArgs> = withSlot<ContextMenuSubContentArgs>(DropdownMenuSubContent, 'context-menu-sub-content')

export {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
}
