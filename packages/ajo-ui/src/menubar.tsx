import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, id, listen, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { bar } from './bar'
import type { ReservedPositionArg } from './position'
import type { FixedArgs, OmitArg, PopupPosition } from './utils'
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
	MenuTrigger,
} from './menu'
import type {
	MenuCheckboxItemArgs,
	MenuContentArgs,
	MenuGroupArgs,
	MenuItemArgs,
	MenuLabelArgs,
	MenuRadioGroupArgs,
	MenuRadioItemArgs,
	MenuSeparatorArgs,
	MenuShortcutArgs,
	MenuSubContentArgs,
	MenuSubArgs,
	MenuSubTriggerArgs,
	MenuTriggerArgs,
} from './menu'
import { provideMenubarComposition } from './menu-cluster'
import { text, withSlot } from './utils'
export type { PopupPlacement, PopupPosition } from './utils'

/** Arguments for a horizontal Menubar and its controlled open menu. */
export type MenubarArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange' | ReservedPositionArg> & PopupPosition & {
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
}> & FixedArgs<'onchange' | ReservedPositionArg>

/** Arguments for one value-bearing top-level menu in a Menubar. */
export type MenubarMenuArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'gap' | 'placement' | ReservedPositionArg> & {
	/** Top-level menu value used by controlled Menubar state. */
	value?: string
	/** Disable this top-level menu. */
	disabled?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}> & FixedArgs<'gap' | 'placement' | ReservedPositionArg>

/** Arguments for the trigger of a top-level Menubar menu. */
export type MenubarTriggerArgs = WithChildren<MenuTriggerArgs & {
	/** Plain-text label used for menubar typeahead. */
	textValue?: string
}>

/** Arguments for positioned content belonging to a top-level Menubar menu. */
export type MenubarContentArgs = MenuContentArgs

/** Arguments for a standard actionable Menubar item. */
export type MenubarItemArgs = MenuItemArgs
/** Arguments for a checkable Menubar item. */
export type MenubarCheckboxItemArgs = MenuCheckboxItemArgs
/** Arguments for a single-selection group inside a Menubar menu. */
export type MenubarRadioGroupArgs = MenuRadioGroupArgs
/** Arguments for one value-bearing Menubar radio item. */
export type MenubarRadioItemArgs = MenuRadioItemArgs
/** Arguments for a non-interactive label inside a Menubar menu. */
export type MenubarLabelArgs = MenuLabelArgs
/** Arguments for a semantic group of Menubar items. */
export type MenubarGroupArgs = MenuGroupArgs
/** Arguments for a visual separator between Menubar groups. */
export type MenubarSeparatorArgs = MenuSeparatorArgs
/** Arguments for a shortcut hint beside a Menubar item. */
export type MenubarShortcutArgs = MenuShortcutArgs
/** Arguments for a nested Menubar submenu provider. */
export type MenubarSubArgs = MenuSubArgs
/** Arguments for the item that opens a nested Menubar submenu. */
export type MenubarSubTriggerArgs = MenuSubTriggerArgs
/** Arguments for positioned content belonging to a Menubar submenu. */
export type MenubarSubContentArgs = MenuSubContentArgs

type MenubarContextValue = {
	ackFocus: (value: string) => boolean
	close: (event?: Event) => void
	disabled: boolean
	focus: (value: string, event?: Event) => void
	follow: (value: string, event?: Event) => void
	gap: PopupPosition['gap']
	isTabbable: (value: string) => boolean
	open: (value: string, event?: Event) => void
	placement: PopupPosition['placement']
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
		.filter(trigger =>
			!trigger.disabled
			&& trigger.offsetParent !== null
			&& trigger.closest('[data-slot="menubar"]') === root)

const MenubarRoot: Stateful<MenubarArgs> = function* ({ defaultValue, value }) {
	const triggers = new Map<string, HTMLButtonElement>()
	let disabled = false
	let entering = false
	let loop = true
	let onValueChange: MenubarArgs['onValueChange']
	let pendingFocus = ''
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

	const close = (event?: Event) => {
		pendingFocus = ''
		state.close(event)
	}

	const focus = (next: string, event?: Event) => {
		if (!entering) pendingFocus = ''
		state.focus(next, event)
	}

	const follow = (next: string, event?: Event) => {
		if (!entering) pendingFocus = ''
		state.follow(next, event)
	}

	const open = (next: string, event?: Event) => {
		pendingFocus = ''
		state.setValue(next, event)
	}

	const enter = (next: string, event: Event) => {
		pendingFocus = next
		entering = true
		try {
			state.follow(next, event)
		} finally {
			entering = false
		}
	}

	const ackFocus = (next: string) => {
		if (!next || pendingFocus !== next) return false
		pendingFocus = ''
		return true
	}

	listen(this, 'keydown', (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		const target = event.target as HTMLElement | null
		if (target?.closest('[data-slot="menubar"]') !== this) return

		if (event.key === 'Tab') {
			// Tab leaves the bar (from a trigger or from inside an open menu):
			// close and let focus proceed.
			close(event)
			return
		}

		if (target?.closest('[data-menubar-trigger="true"]')) {
			if (event.key === 'Escape') pendingFocus = ''
			const transfer = Boolean(pendingFocus)
			if (transfer) entering = true
			try {
				if (state.handle(event) && transfer) pendingFocus = state.value
			} finally {
				if (transfer) entering = false
			}
			return
		}

		// ArrowLeft/Right from inside an open menu move to the adjacent
		// top-level menu with its first item focused (APG). Submenu-owned
		// arrows stay with the submenu machinery: ArrowRight enters a submenu
		// from its trigger, ArrowLeft closes one from inside.
		if (state.value && (event.key === 'ArrowLeft' || event.key === 'ArrowRight') && target?.closest('[data-menu-content="true"]')) {
			if (event.key === 'ArrowRight' && target.closest('[data-menu-sub-trigger="true"]')) return
			if (target.closest('[data-menu-sub-content="true"]')) return
			const row = order(this)
			const index = row.findIndex(trigger => trigger.dataset.value === state.value)
			if (index < 0) return
			const step = event.key === 'ArrowRight' ? 1 : -1
			const next = row[index + step] ?? (loop ? row[(index + step + row.length) % row.length] : undefined)
			if (!next || next === row[index]) return
			event.preventDefault()
			enter(next.dataset.value ?? '', event)
		}
	})

	for (const args of this) {
		disabled = Boolean(args.disabled)
		loop = args.loop !== false
		onValueChange = args.onValueChange
		state.sync(args.value != null ? String(args.value ?? '') : undefined)

		MenubarContext({
			ackFocus,
			close,
			disabled,
			focus,
			follow,
			gap: args.gap,
			isTabbable: state.isTabbable,
			open,
			placement: args.placement,
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
	gap,
	loop,
	onValueChange,
	placement,
	value,
	...attrs
}) => (
	<MenubarRoot
		{...rootAttrs(attrs)}
		defaultValue={defaultValue}
		disabled={disabled}
		gap={gap}
		loop={loop}
		onValueChange={onValueChange}
		placement={placement}
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
	let bar: MenubarContextValue | null = null
	let itemValue = String(value ?? fallback)
	const ackFocus = () => bar?.ackFocus(itemValue) ?? false

	for (const args of this) {
		bar = MenubarContext()
		itemValue = String(args.value ?? value ?? fallback)
		const disabled = Boolean(args.disabled ?? bar?.disabled)

		MenubarMenuContext({ disabled, value: itemValue })
		if (bar) provideMenubarComposition(ackFocus)

		yield (
			// Without a Menubar ancestor the menu degrades to a standalone
			// uncontrolled Menu instead of a permanently-closed one.
			<Menu
				disabled={disabled}
				gap={bar?.gap}
				onOpenChange={(open, event) => open ? bar?.open(itemValue, event) : bar?.close(event)}
				open={bar ? bar.value === itemValue : undefined}
				placement={bar?.placement}
			>
				{args.children}
			</Menu>
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
		<MenuTrigger
			{...attrs}
			class={classes}
			data-label={bar ? label : undefined}
			data-menubar-trigger={bar ? 'true' : undefined}
			data-slot="menubar-trigger"
			data-value={bar ? itemValue : undefined}
			disabled={disabledFlag}
			ref={reference}
			role={bar ? 'menuitem' : undefined}
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
			tabindex={bar ? (bar.isTabbable(itemValue) ? 0 : -1) : undefined}
		>
			{children}
		</MenuTrigger>
	)
}

/** Popover content for a top-level Menubar menu. */
const MenubarContent: Stateless<MenubarContentArgs> = withSlot<MenubarContentArgs>(
	MenuContent,
	'menubar-content',
)

/** Standard menubar action item. */
const MenubarItem: Stateless<MenubarItemArgs> = withSlot<MenubarItemArgs>(MenuItem, 'menubar-item')

/** Checkable menubar item. */
const MenubarCheckboxItem: Stateless<MenubarCheckboxItemArgs> = withSlot<MenubarCheckboxItemArgs>(MenuCheckboxItem, 'menubar-checkbox-item')

/** Radio group inside a menubar menu. */
const MenubarRadioGroup: Stateless<MenubarRadioGroupArgs> = withSlot<MenubarRadioGroupArgs>(MenuRadioGroup, 'menubar-radio-group')

/** Radio item inside a menubar radio group. */
const MenubarRadioItem: Stateless<MenubarRadioItemArgs> = withSlot<MenubarRadioItemArgs>(MenuRadioItem, 'menubar-radio-item')

/** Group of menubar items. */
const MenubarGroup: Stateless<MenubarGroupArgs> = withSlot<MenubarGroupArgs>(MenuGroup, 'menubar-group')

/** Non-interactive label inside a menubar menu. */
const MenubarLabel: Stateless<MenubarLabelArgs> = withSlot<MenubarLabelArgs>(MenuLabel, 'menubar-label')

/** Visual separator between menubar groups. */
const MenubarSeparator: Stateless<MenubarSeparatorArgs> = withSlot<MenubarSeparatorArgs>(MenuSeparator, 'menubar-separator')

/** Right-aligned shortcut hint inside a menubar item. */
const MenubarShortcut: Stateless<MenubarShortcutArgs> = withSlot<MenubarShortcutArgs>(MenuShortcut, 'menubar-shortcut')

/** Root provider for a menubar submenu. */
const MenubarSub: Stateless<MenubarSubArgs> = withSlot<MenubarSubArgs>(MenuSub, 'menubar-sub')

/** Trigger item that opens a menubar submenu. */
const MenubarSubTrigger: Stateless<MenubarSubTriggerArgs> = withSlot<MenubarSubTriggerArgs>(MenuSubTrigger, 'menubar-sub-trigger')

/** Content for a menubar submenu. */
const MenubarSubContent: Stateless<MenubarSubContentArgs> = withSlot<MenubarSubContentArgs>(MenuSubContent, 'menubar-sub-content')

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
