import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, listen, restore, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import {
	Menu,
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
} from './menu'
import type {
	MenuArgs,
	MenuCheckboxItemArgs,
	MenuContentArgs,
	MenuGroupArgs,
	MenuItemArgs,
	MenuLabelArgs,
	MenuRadioGroupArgs,
	MenuRadioItemArgs,
	MenuSeparatorArgs,
	MenuShortcutArgs,
	MenuSubArgs,
	MenuSubContentArgs,
	MenuSubTriggerArgs,
} from './menu'
import {
	menuInvocation,
	provideContextMenuComposition,
	SURFACE_SELECTOR,
	type ContextMenuInvoke,
} from './menu-cluster'
import { pointReference, type PositionReference } from './position'
import { type FixedArgs, type OmitArg, withSlot } from './utils'

/** Arguments for the invocation-driven ContextMenu root. */
export type ContextMenuArgs = OmitArg<MenuArgs, 'defaultOpen' | 'gap' | 'open' | 'placement'> & FixedArgs<'defaultOpen' | 'gap' | 'open' | 'placement'>
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

/** Arguments for the single region that invokes a ContextMenu. */
export type ContextMenuTriggerArgs = WithChildren<IntrinsicElements['div'] & {
	/** Disable context menu activation. */
	disabled?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}>

const ContextMenuRoot: Stateful<ContextMenuArgs> = function* () {
	const focus = restore(this)
	let invoker: HTMLElement | null = null
	let point = { x: 0, y: 0 }
	let reference: PositionReference | null = null

	const invoke: ContextMenuInvoke = (controller, x, y, event, source, focusIntent) => {
		point.x = x
		point.y = y
		if (source !== invoker || !reference) {
			invoker = source
			point = { x, y }
			reference = pointReference(source, () => point)
		}
		focus.capture(source)
		controller(reference, source, event, focusIntent)
	}

	listen(this, 'contextmenu', (event: Event) => {
		const target = event.target as HTMLElement | null
		if (target?.closest(SURFACE_SELECTOR)) event.preventDefault()
	})

	for (const args of this) {
		provideContextMenuComposition(invoke, focus.restore)

		yield (
			<Menu disabled={args.disabled} onOpenChange={args.onOpenChange}>
				{args.children}
			</Menu>
		)
	}
}

/** Root provider for a context menu. */
const ContextMenu: Stateless<ContextMenuArgs> = ({
	children,
	class: classes,
	disabled,
	onOpenChange,
	...attrs
}) => (
	<ContextMenuRoot
		{...rootAttrs(attrs)}
		disabled={disabled}
		onOpenChange={onOpenChange}
		attr:class={classes}
		attr:data-slot="context-menu"
	>
		{children}
	</ContextMenuRoot>
)

/** The single region that invokes its ContextMenu by pointer or keyboard. */
const ContextMenuTrigger: Stateless<ContextMenuTriggerArgs> = ({
	children,
	class: classes,
	disabled,
	id,
	ref,
	tabindex,
	'set:oncontextmenu': onContextMenu,
	'set:onkeydown': onKeydown,
	...attrs
}) => {
	const menu = menuInvocation()
	const disabledFlag = Boolean(disabled ?? menu?.disabled)
	const adoptedId = menu?.adoptTriggerId(id)

	return (
		<div
			{...attrs}
			aria-controls={menu?.contentId}
			aria-disabled={disabledFlag ? 'true' : undefined}
			aria-expanded={menu?.open ? 'true' : 'false'}
			aria-haspopup="menu"
			class={classes}
			data-disabled={disabledFlag ? 'true' : undefined}
			data-slot="context-menu-trigger"
			data-state={menu?.open ? 'open' : 'closed'}
			id={adoptedId ?? id}
			ref={ref}
			set:oncontextmenu={(event: MouseEvent) => {
				const element = event.currentTarget as HTMLElement
				callHandler(onContextMenu, event)
				if (event.defaultPrevented || disabledFlag) return
				event.preventDefault()
				menu?.invoke(event.clientX, event.clientY, event, element, 'content')
			}}
			set:onkeydown={(event: KeyboardEvent) => {
				const element = event.currentTarget as HTMLElement
				callHandler(onKeydown, event)
				if (event.defaultPrevented || disabledFlag) return
				if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return
				event.preventDefault()
				const rect = element.getBoundingClientRect()
				menu?.invoke(rect.left, rect.bottom, event, element, 'first')
			}}
			tabindex={disabledFlag ? undefined : tabindex ?? 0}
		>
			{children}
		</div>
	)
}

/** Popover menu content opened by a ContextMenuTrigger. */
const ContextMenuContent: Stateless<ContextMenuContentArgs> = withSlot<ContextMenuContentArgs>(MenuContent, 'context-menu-content')

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
