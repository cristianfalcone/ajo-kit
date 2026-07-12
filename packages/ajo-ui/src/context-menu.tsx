import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, controlled, listen, restore, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import {
	Menu,
	MenuAnchor,
	MenuCheckboxItem,
	MenuContent,
	MenuGroup,
	MenuItem,
	MenuLabel,
	MenuRadioGroup,
	MenuRadioItem,
	MenuSeparator,
	MenuShortcut,
	MenuSub,
	MenuSubContent,
	MenuSubTrigger,
	MenuContext,
	SURFACE_SELECTOR,
	focusEdge,
} from './menu'
import type {
	MenuCheckboxItemArgs,
	MenuContentArgs,
	MenuGroupArgs,
	MenuItemArgs,
	MenuLabelArgs,
	MenuArgs,
	MenuRadioGroupArgs,
	MenuRadioItemArgs,
	MenuSeparatorArgs,
	MenuShortcutArgs,
	MenuSubContentArgs,
	MenuSubArgs,
	MenuSubTriggerArgs,
} from './menu'
import { withSlot } from './utils'

/** Arguments for the pointer-anchored ContextMenu root. */
export type ContextMenuArgs = MenuArgs
/** Arguments for the floating ContextMenu surface. */
export type ContextMenuContentArgs = MenuContentArgs
/** Arguments for an actionable ContextMenu item. */
export type ContextMenuItemArgs = MenuItemArgs
/** Arguments for a checked ContextMenu item. */
export type ContextMenuCheckboxItemArgs = MenuCheckboxItemArgs
/** Arguments for a single-value ContextMenu radio group. */
export type ContextMenuRadioGroupArgs = MenuRadioGroupArgs
/** Arguments for one ContextMenu radio option. */
export type ContextMenuRadioItemArgs = MenuRadioItemArgs
/** Arguments for a non-interactive ContextMenu label. */
export type ContextMenuLabelArgs = MenuLabelArgs
/** Arguments for a semantic ContextMenu item group. */
export type ContextMenuGroupArgs = MenuGroupArgs
/** Arguments for a ContextMenu separator. */
export type ContextMenuSeparatorArgs = MenuSeparatorArgs
/** Arguments for shortcut text displayed in a ContextMenu. */
export type ContextMenuShortcutArgs = MenuShortcutArgs
/** Arguments for a nested ContextMenu root. */
export type ContextMenuSubArgs = MenuSubArgs
/** Arguments for the item that opens a nested ContextMenu. */
export type ContextMenuSubTriggerArgs = MenuSubTriggerArgs
/** Arguments for a nested ContextMenu surface. */
export type ContextMenuSubContentArgs = MenuSubContentArgs

/** Arguments for the region that invokes a ContextMenu. */
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
			<Menu
				disabled={disabled}
				onOpenChange={setOpen}
				open={openState.value}
			>
				<MenuAnchor
					data-slot="context-menu-anchor"
					style={`position:fixed;left:${point.x}px;top:${point.y}px;width:0;height:0`}
				/>
				{args.children}
			</Menu>
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
	const contextMenu = ContextMenuContext()
	const menu = MenuContext()
	const disabledFlag = Boolean(disabled ?? contextMenu?.disabled)
	const reference = (element: HTMLDivElement | null) => {
		callRef(ref, element)
	}

	return (
		<div
			{...attrs}
			aria-controls={menu?.contentId}
			aria-disabled={disabledFlag ? 'true' : undefined}
			aria-expanded={contextMenu?.open ? 'true' : 'false'}
			aria-haspopup="menu"
			class={classes}
			data-disabled={disabledFlag ? 'true' : undefined}
			data-slot="context-menu-trigger"
			data-state={contextMenu?.open ? 'open' : 'closed'}
			ref={reference}
			set:oncontextmenu={(event: MouseEvent) => {
				const element = event.currentTarget as HTMLElement | null
				callHandler(onContextMenu, event)
				if (event.defaultPrevented || disabledFlag) return
				event.preventDefault()
				contextMenu?.openAt(event.clientX, event.clientY, event, element)
			}}
			set:onkeydown={(event: KeyboardEvent) => {
				const element = event.currentTarget as HTMLElement | null
				callHandler(onKeydown, event)
				if (event.defaultPrevented || disabledFlag) return
				if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return
				event.preventDefault()
				const rect = element?.getBoundingClientRect()
				contextMenu?.openAt(rect?.left ?? 0, rect?.bottom ?? 0, event, element, 'first')
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
		<MenuContent
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
const ContextMenuItem: Stateless<ContextMenuItemArgs> = withSlot<ContextMenuItemArgs>(MenuItem, 'context-menu-item')

/** Checkable context menu item. */
const ContextMenuCheckboxItem: Stateless<ContextMenuCheckboxItemArgs> = withSlot<ContextMenuCheckboxItemArgs>(MenuCheckboxItem, 'context-menu-checkbox-item')

/** Radio group inside a context menu. */
const ContextMenuRadioGroup: Stateless<ContextMenuRadioGroupArgs> = withSlot<ContextMenuRadioGroupArgs>(MenuRadioGroup, 'context-menu-radio-group')

/** Radio item inside a context menu radio group. */
const ContextMenuRadioItem: Stateless<ContextMenuRadioItemArgs> = withSlot<ContextMenuRadioItemArgs>(MenuRadioItem, 'context-menu-radio-item')

/** Group of context menu items. */
const ContextMenuGroup: Stateless<ContextMenuGroupArgs> = withSlot<ContextMenuGroupArgs>(MenuGroup, 'context-menu-group')

/** Non-interactive label inside a context menu. */
const ContextMenuLabel: Stateless<ContextMenuLabelArgs> = withSlot<ContextMenuLabelArgs>(MenuLabel, 'context-menu-label')

/** Visual separator between context menu groups. */
const ContextMenuSeparator: Stateless<ContextMenuSeparatorArgs> = withSlot<ContextMenuSeparatorArgs>(MenuSeparator, 'context-menu-separator')

/** Right-aligned shortcut hint inside a context menu item. */
const ContextMenuShortcut: Stateless<ContextMenuShortcutArgs> = withSlot<ContextMenuShortcutArgs>(MenuShortcut, 'context-menu-shortcut')

/** Root provider for a context submenu. */
const ContextMenuSub: Stateless<ContextMenuSubArgs> = withSlot<ContextMenuSubArgs>(MenuSub, 'context-menu-sub')

/** Trigger item that opens a context submenu. */
const ContextMenuSubTrigger: Stateless<ContextMenuSubTriggerArgs> = withSlot<ContextMenuSubTriggerArgs>(MenuSubTrigger, 'context-menu-sub-trigger')

/** Content for a context submenu. */
const ContextMenuSubContent: Stateless<ContextMenuSubContentArgs> = withSlot<ContextMenuSubContentArgs>(MenuSubContent, 'context-menu-sub-content')

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
