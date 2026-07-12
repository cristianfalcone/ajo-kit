import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, id, listen, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { bar } from './bar'
import type { FixedArgs, OmitArg } from './utils'
import {
	DropdownMenu,
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
	DropdownMenuTrigger,
	focusEdge,
} from './dropdown-menu'
import type {
	DropdownMenuCheckboxItemArgs,
	DropdownMenuContentArgs,
	DropdownMenuGroupArgs,
	DropdownMenuItemArgs,
	DropdownMenuLabelArgs,
	DropdownMenuRadioGroupArgs,
	DropdownMenuRadioItemArgs,
	DropdownMenuSeparatorArgs,
	DropdownMenuShortcutArgs,
	DropdownMenuSubContentArgs,
	DropdownMenuSubArgs,
	DropdownMenuSubTriggerArgs,
	DropdownMenuTriggerArgs,
} from './dropdown-menu'
import { text, withSlot } from './utils'

export type MenubarArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange'> & {
	/** Controlled open top-level menu value. */
	value?: string
	/** Initial open top-level menu value for uncontrolled usage. */
	defaultValue?: string
	/** Disable every menubar trigger and menu item. */
	disabled?: boolean
	/** Wrap arrow-key navigation at the ends. */
	loop?: boolean
	/** Called whenever the open top-level menu changes. Empty string means closed. */
	onValueChange?: (value: string, event?: Event) => void
	/** Additional UnoCSS classes. */
	class?: string
}> & FixedArgs<'onchange'>

export type MenubarMenuArgs = WithChildren<IntrinsicElements['div'] & {
	/** Top-level menu value used by controlled Menubar state. */
	value?: string
	/** Disable this top-level menu. */
	disabled?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}>

export type MenubarTriggerArgs = WithChildren<DropdownMenuTriggerArgs & {
	/** Plain-text label used for menubar typeahead. */
	textValue?: string
}>

export type MenubarContentArgs = WithChildren<DropdownMenuContentArgs & {
	/** Pixel shift along the alignment axis. */
	alignOffset?: number
}>

export type MenubarItemArgs = DropdownMenuItemArgs
export type MenubarCheckboxItemArgs = DropdownMenuCheckboxItemArgs
export type MenubarRadioGroupArgs = DropdownMenuRadioGroupArgs
export type MenubarRadioItemArgs = DropdownMenuRadioItemArgs
export type MenubarLabelArgs = DropdownMenuLabelArgs
export type MenubarGroupArgs = DropdownMenuGroupArgs
export type MenubarSeparatorArgs = DropdownMenuSeparatorArgs
export type MenubarShortcutArgs = DropdownMenuShortcutArgs
export type MenubarSubArgs = DropdownMenuSubArgs
export type MenubarSubTriggerArgs = DropdownMenuSubTriggerArgs
export type MenubarSubContentArgs = DropdownMenuSubContentArgs

type MenubarContextValue = {
	close: (event?: Event) => void
	disabled: boolean
	focus: (value: string, event?: Event) => void
	follow: (value: string, event?: Event) => void
	isTabbable: (value: string) => boolean
	open: (value: string, event?: Event) => void
	register: (value: string, element: HTMLButtonElement | null) => void
	value: string
}

type MenubarMenuContextValue = {
	disabled: boolean
	value: string
}

const MenubarContext = context<MenubarContextValue | null>(null)
const MenubarMenuContext = context<MenubarMenuContextValue | null>(null)

const order = (root: HTMLElement) =>
	Array.from(root.querySelectorAll<HTMLButtonElement>('[data-menubar-trigger="true"]'))
		.filter(trigger => !trigger.disabled && trigger.offsetParent !== null)

const MenubarRoot: Stateful<MenubarArgs> = function* ({ defaultValue, value }) {
	const triggers = new Map<string, HTMLButtonElement>()
	let disabled = false
	let loop = true
	let onValueChange: MenubarArgs['onValueChange']
	let queued = false

	const state = bar(this, {
		triggers: () => order(this),
		initialValue: String(value ?? defaultValue ?? ''),
		disabled: () => disabled,
		loop: () => loop,
		onValueChange: (next, event) => onValueChange?.(next, event),
	})

	// Trigger mount/unmount changes the tab-stop row after the render that
	// caused it; the microtask queue coalesces the follow-up pass (ajo render
	// semantics: refs run during render, no reentrant render).
	const rerender = () => {
		if (queued) return
		queued = true
		queueMicrotask(() => {
			queued = false
			this.next()
		})
	}

	const register = (itemValue: string, element: HTMLButtonElement | null) => {
		if (element) {
			if (triggers.get(itemValue) === element) return
			triggers.set(itemValue, element)
			rerender()
		} else if (triggers.delete(itemValue)) {
			// Tab-stop repair falls back to DOM order through the row query.
			if (state.focused === itemValue) state.adopt('')
			rerender()
		}
	}

	listen(this, 'keydown', (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		const target = event.target as HTMLElement | null

		if (event.key === 'Tab') {
			// Tab leaves the bar (from a trigger or from inside an open menu):
			// close and let focus proceed.
			state.close(event)
			return
		}

		if (target?.closest('[data-menubar-trigger="true"]')) {
			state.handle(event)
			return
		}

		// ArrowLeft/Right from inside an open menu move to the adjacent
		// top-level menu with its first item focused (APG). Submenu-owned
		// arrows stay with the submenu machinery: ArrowRight enters a submenu
		// from its trigger, ArrowLeft closes one from inside.
		if (state.value && (event.key === 'ArrowLeft' || event.key === 'ArrowRight') && target?.closest('[data-menu-content="true"]')) {
			if (event.key === 'ArrowRight' && target.closest('[data-menu-sub-trigger="true"]')) return
			if (event.key === 'ArrowLeft' && target.closest('[data-menu-sub-content="true"]')) return
			const row = order(this)
			const index = row.findIndex(trigger => trigger.dataset.value === state.value)
			if (index < 0) return
			const step = event.key === 'ArrowRight' ? 1 : -1
			const next = row[index + step] ?? (loop ? row[(index + step + row.length) % row.length] : undefined)
			if (!next || next === row[index]) return
			event.preventDefault()
			state.follow(next.dataset.value ?? '', event)
			// The fresh menu shows in the sync microtask; enter it afterwards
			// through the substrate's edge helper (registers the highlight and
			// skips items owned by nested submenu surfaces).
			queueMicrotask(() => {
				const contentId = next.getAttribute('aria-controls')
				focusEdge(contentId ? document.getElementById(contentId) : null, 'first')
			})
		}
	})

	for (const args of this) {
		disabled = Boolean(args.disabled)
		loop = args.loop !== false
		onValueChange = args.onValueChange
		state.sync(args.value != null ? String(args.value ?? '') : undefined)

		MenubarContext({
			close: state.close,
			disabled,
			focus: state.focus,
			follow: state.follow,
			isTabbable: state.isTabbable,
			open: state.setValue,
			register,
			value: state.value,
		})

		yield <>{args.children}</>
	}
}


/** Persistent horizontal menu bar. */
const Menubar: Stateless<MenubarArgs> = ({
	children,
	class: classes,
	defaultValue,
	disabled,
	loop,
	onValueChange,
	value,
	...attrs
}) => (
	<MenubarRoot
		{...rootAttrs(attrs)}
		defaultValue={defaultValue}
		disabled={disabled}
		loop={loop}
		onValueChange={onValueChange}
		value={value}
		attr:aria-orientation="horizontal"
		attr:class={classes}
		attr:data-slot="menubar"
		attr:role="menubar"
	>
		{children}
	</MenubarRoot>
)

const MenubarMenuRoot: Stateful<MenubarMenuArgs> = function* ({ value }) {
	const fallback = id('menubar-menu')

	for (const args of this) {
		const bar = MenubarContext()
		const itemValue = String(args.value ?? value ?? fallback)
		const disabled = Boolean(args.disabled ?? bar?.disabled)

		MenubarMenuContext({ disabled, value: itemValue })

		yield (
			// Without a Menubar ancestor the menu degrades to a standalone
			// uncontrolled DropdownMenu instead of a permanently-closed one.
			<DropdownMenu
				disabled={disabled}
				onOpenChange={(open, event) => open ? bar?.open(itemValue, event) : bar?.close(event)}
				open={bar ? bar.value === itemValue : undefined}
			>
				{args.children}
			</DropdownMenu>
		)
	}
}


/** Top-level Menubar menu. */
const MenubarMenu: Stateless<MenubarMenuArgs> = ({
	children,
	class: classes,
	disabled,
	value,
	...attrs
}) => (
	<MenubarMenuRoot
		{...rootAttrs(attrs)}
		disabled={disabled}
		value={value}
		attr:class={classes}
		attr:data-slot="menubar-menu"
	>
		{children}
	</MenubarMenuRoot>
)

/** Top-level trigger inside a Menubar. */
const MenubarTrigger: Stateless<MenubarTriggerArgs> = ({
	children,
	class: classes,
	disabled,
	ref,
	textValue,
	'set:onfocus': onFocus,
	'set:onmouseenter': onMouseEnter,
	...attrs
}) => {
	const bar = MenubarContext()
	const menu = MenubarMenuContext()
	const itemValue = menu?.value ?? ''
	const disabledFlag = Boolean(disabled ?? menu?.disabled ?? bar?.disabled)
	const label = textValue ?? text(children)
	const reference = (element: HTMLButtonElement | null) => {
		if (itemValue) bar?.register(itemValue, element)
		callRef(ref, element)
	}

	return (
		<DropdownMenuTrigger
			{...attrs}
			class={classes}
			data-label={label}
			data-menubar-trigger="true"
			data-slot="menubar-trigger"
			data-value={itemValue}
			disabled={disabledFlag}
			ref={reference}
			role="menuitem"
			set:onfocus={(event: FocusEvent) => {
				callHandler(onFocus, event)
				if (event.defaultPrevented || disabledFlag) return
				// Single follow path: roving/typeahead only focus, this follows.
				bar?.focus(itemValue, event)
			}}
			set:onmouseenter={(event: MouseEvent) => {
				callHandler(onMouseEnter, event)
				if (event.defaultPrevented || disabledFlag) return
				bar?.follow(itemValue, event)
			}}
			tabindex={!bar || bar.isTabbable(itemValue) ? 0 : -1}
		>
			{children}
		</DropdownMenuTrigger>
	)
}

/** Popover content for a top-level Menubar menu. */
const MenubarContent: Stateless<MenubarContentArgs> = withSlot<MenubarContentArgs>(
	DropdownMenuContent,
	'menubar-content',
	{ align: 'start', alignOffset: -4, side: 'bottom', sideOffset: 8 },
)

/** Standard menubar action item. */
const MenubarItem: Stateless<MenubarItemArgs> = withSlot<MenubarItemArgs>(DropdownMenuItem, 'menubar-item')

/** Checkable menubar item. */
const MenubarCheckboxItem: Stateless<MenubarCheckboxItemArgs> = withSlot<MenubarCheckboxItemArgs>(DropdownMenuCheckboxItem, 'menubar-checkbox-item')

/** Radio group inside a menubar menu. */
const MenubarRadioGroup: Stateless<MenubarRadioGroupArgs> = withSlot<MenubarRadioGroupArgs>(DropdownMenuRadioGroup, 'menubar-radio-group')

/** Radio item inside a menubar radio group. */
const MenubarRadioItem: Stateless<MenubarRadioItemArgs> = withSlot<MenubarRadioItemArgs>(DropdownMenuRadioItem, 'menubar-radio-item')

/** Group of menubar items. */
const MenubarGroup: Stateless<MenubarGroupArgs> = withSlot<MenubarGroupArgs>(DropdownMenuGroup, 'menubar-group')

/** Non-interactive label inside a menubar menu. */
const MenubarLabel: Stateless<MenubarLabelArgs> = withSlot<MenubarLabelArgs>(DropdownMenuLabel, 'menubar-label')

/** Visual separator between menubar groups. */
const MenubarSeparator: Stateless<MenubarSeparatorArgs> = withSlot<MenubarSeparatorArgs>(DropdownMenuSeparator, 'menubar-separator')

/** Right-aligned shortcut hint inside a menubar item. */
const MenubarShortcut: Stateless<MenubarShortcutArgs> = withSlot<MenubarShortcutArgs>(DropdownMenuShortcut, 'menubar-shortcut')

/** Root provider for a menubar submenu. */
const MenubarSub: Stateless<MenubarSubArgs> = withSlot<MenubarSubArgs>(DropdownMenuSub, 'menubar-sub')

/** Trigger item that opens a menubar submenu. */
const MenubarSubTrigger: Stateless<MenubarSubTriggerArgs> = withSlot<MenubarSubTriggerArgs>(DropdownMenuSubTrigger, 'menubar-sub-trigger')

/** Content for a menubar submenu. */
const MenubarSubContent: Stateless<MenubarSubContentArgs> = withSlot<MenubarSubContentArgs>(DropdownMenuSubContent, 'menubar-sub-content')

export {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarGroup,
	MenubarItem,
	MenubarLabel,
	MenubarMenu,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
}
