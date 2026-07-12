import type { Children, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, controlled, id, listen, roving, statefulRootAttrs as rootAttrs, typeahead } from 'ajo-cloves'
import { context } from 'ajo/context'
import type { FixedArgs, OmitArg } from './utils'
import { flag, text } from './utils'
import { contentAttrs, datasetPlacement, floating, popupStyle, surface, triggerAttrs, type FloatingView } from './floating'
import { collection } from './collection'

export type DropdownMenuAlign = 'center' | 'end' | 'start'
export type DropdownMenuSide = 'bottom' | 'left' | 'right' | 'top'
export type DropdownMenuVariant = 'default' | 'danger'

export type DropdownMenuArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange'> & {
	/** Controlled open state. */
	open?: boolean
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Disable the trigger and item activation. */
	disabled?: boolean
	/** Called whenever the menu opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Additional UnoCSS classes for the root. */
	class?: string
}> & FixedArgs<'onchange'>

export type DropdownMenuTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type DropdownMenuAnchorArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type DropdownMenuContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Horizontal alignment relative to the trigger. */
	align?: DropdownMenuAlign
	/** Pixel shift along the alignment axis. */
	alignOffset?: number
	/** Preferred side relative to the trigger. */
	side?: DropdownMenuSide
	/** Gap between trigger and content in pixels. */
	sideOffset?: number
	/** Additional UnoCSS classes. */
	class?: string
}>

export type DropdownMenuItemArgs = WithChildren<IntrinsicElements['div'] & {
	/** Left-indent text for iconless groups. */
	inset?: boolean
	/** Disable activation. */
	disabled?: boolean
	/** Called after click/key activation before the menu closes. Prevent default to keep it open. */
	onSelect?: (event: Event) => void
	/** Plain-text label used for typeahead. */
	textValue?: string
	/** Visual tone. */
	variant?: DropdownMenuVariant
	/** Additional UnoCSS classes. */
	class?: string
}>

export type DropdownMenuCheckboxItemArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'checked'> & {
	/** Controlled checked state. */
	checked?: boolean
	/** Disable activation. */
	disabled?: boolean
	/** Called whenever checked changes. */
	onCheckedChange?: (checked: boolean, event: Event) => void
	/** Plain-text label used for typeahead. */
	textValue?: string
	/** Additional UnoCSS classes. */
	class?: string
	indicatorClass?: string
	indicatorIconClass?: string
}>

export type DropdownMenuRadioGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Controlled selected value. */
	value?: string
	/** Initial selected value for uncontrolled usage. */
	defaultValue?: string
	/** Called whenever selected value changes. */
	onValueChange?: (value: string, event: Event) => void
	/** Additional UnoCSS classes. */
	class?: string
}>

export type DropdownMenuRadioItemArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'value'> & {
	/** Item value used by the parent radio group. */
	value: string
	/** Disable activation. */
	disabled?: boolean
	/** Plain-text label used for typeahead. */
	textValue?: string
	/** Additional UnoCSS classes. */
	class?: string
	indicatorClass?: string
	indicatorIconClass?: string
}>

export type DropdownMenuLabelArgs = WithChildren<IntrinsicElements['div'] & {
	/** Left-indent text for iconless groups. */
	inset?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}>

export type DropdownMenuGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type DropdownMenuSeparatorArgs = IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type DropdownMenuShortcutArgs = WithChildren<IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type DropdownMenuSubArgs = WithChildren<IntrinsicElements['div'] & {
	/** Controlled open state. */
	open?: boolean
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Called whenever the submenu opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
}>

export type DropdownMenuSubTriggerArgs = DropdownMenuItemArgs & {
	iconClass?: string
}
export type DropdownMenuSubContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'align'> & {
	/** Additional UnoCSS classes. */
	class?: string
}> & FixedArgs<'align'>

export type MenuContextValue = {
	close: (event?: Event) => void
	closeSubmenus: (event?: Event, except?: HTMLElement | null) => void
	content: HTMLElement | null
	contentId: string
	disabled: boolean
	focusFirst: () => void
	focusLast: () => void
	open: boolean
	registerSubmenu: (submenu: SubmenuRegistration) => () => void
	setAnchor: (element: HTMLElement | null) => void
	setContent: (element: HTMLDivElement | null) => void
	setOpen: (open: boolean, event?: Event, focus?: 'first' | 'last') => void
	setTrigger: (element: HTMLButtonElement | null) => void
	trigger: HTMLButtonElement | null
	triggerId: string
}

type RadioContextValue = {
	change: (value: string, event: Event) => void
	value: string
}

type SubContextValue = {
	close: (event?: Event) => void
	content: HTMLElement | null
	contentId: string
	open: boolean
	setContent: (element: HTMLDivElement | null) => void
	setOpen: (open: boolean, event?: Event, focus?: boolean) => void
	setTrigger: (element: HTMLElement | null) => void
	trigger: HTMLElement | null
	triggerId: string
}

type SubmenuRegistration = {
	close: (event?: Event) => void
	trigger: () => HTMLElement | null
}

// MenuContext, the collection instance, the surface selector, and the edge
// helpers are the substrate reuse contract for composing menu families
// (context-menu, menubar) — exported like CollapsibleContext for Accordion.
/** Shared menu state consumed by DropdownMenu parts and composed menu families. */
export const MenuContext = context<MenuContextValue | null>(null)
const RadioContext = context<RadioContextValue | null>(null)
const SubContext = context<SubContextValue | null>(null)

// Disabled menu items stay focusable for discoverability (APG menu pattern).
/** Collection registry for menu items, including disabled items in the focusable menu order. */
export const menuItems = collection('menu', { enabled: false })

/** Matches root and submenu content surfaces so direct items can exclude nested menus. */
export const SURFACE_SELECTOR = '[data-menu-sub-content="true"],[data-menu-content="true"]'

/** Items owned directly by one menu surface, excluding nested submenu items. */
export const surfaceItems = (surface: HTMLElement | null) =>
	menuItems.items(surface).filter(item => item.closest(SURFACE_SELECTOR) === surface)

/** Focuses the first or last direct item of one menu surface. */
export const focusEdge = (surface: HTMLElement | null, which: 'first' | 'last') => {
	const list = surfaceItems(surface)
	menuItems.focusItem(surface, which === 'first' ? list[0] : list[list.length - 1])
}

const pointerHighlight = (
	disabled: boolean,
	closeSubmenus?: MenuContextValue['closeSubmenus'],
	keepCurrentSubmenu = false,
) => (event: Event) => {
	if (disabled) return
	const target = event.currentTarget as HTMLElement
	const content = target.closest<HTMLElement>(SURFACE_SELECTOR)
	menuItems.focusItem(content, event.currentTarget as HTMLElement)
	if (!target.closest('[data-menu-sub-content="true"]')) {
		closeSubmenus?.(event, keepCurrentSubmenu ? target : null)
	}
}

const DropdownMenuRoot: Stateful<DropdownMenuArgs> = function* ({ defaultOpen, open }) {
	const submenus = new Set<SubmenuRegistration>()
	let disabled = false
	let onOpenChange: DropdownMenuArgs['onOpenChange']
	let pendingFocus: 'first' | 'last' | undefined
	let menu: FloatingView<HTMLButtonElement, HTMLDivElement>

	menu = floating<HTMLButtonElement, HTMLDivElement>(this, {
		prefix: 'dropdown-menu',
		initialOpen: Boolean(open ?? defaultOpen),
		disabled: () => disabled,
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		reference: view => view.anchor ?? view.trigger,
		placement: {
			...datasetPlacement(() => menu.content, {
				side: 'bottom',
				align: 'center',
				sideOffset: 4,
				padding: 4,
			}),
			padding: () => 4,
		},
		onSync: opened => {
			if (opened) {
				if (pendingFocus) focusEdge(menu.content, pendingFocus)
			} else {
				menuItems.clearHighlight(menu.content)
			}
			pendingFocus = undefined
		},
	})

	const setOpen = (next: boolean, event?: Event, focus?: 'first' | 'last') => {
		if (disabled && next) return
		if (next === menu.open) return

		pendingFocus = next ? focus : undefined
		menu.setOpen(next, event)
	}

	const close = (event?: Event) => {
		setOpen(false, event)
		queueMicrotask(() => menu.trigger?.focus())
	}

	const closeSubmenus = (event?: Event, except?: HTMLElement | null) => {
		for (const submenu of submenus) {
			if (submenu.trigger() !== except) submenu.close(event)
		}
	}

	const registerSubmenu = (submenu: SubmenuRegistration) => {
		submenus.add(submenu)
		return () => submenus.delete(submenu)
	}

	// Keyboard movement stays inside the surface that owns focus: an open
	// submenu cycles its own items, never the parent menu's.
	const focusedSurface = () => {
		const active = document.activeElement
		const surface = active instanceof HTMLElement ? active.closest<HTMLElement>(SURFACE_SELECTOR) : null
		return surface ?? menu.content
	}

	const nav = roving(this, {
		items: () => surfaceItems(focusedSurface()),
		onMove: target => menuItems.focusItem(focusedSurface(), target),
	})

	const ta = typeahead(this, {
		items: () => surfaceItems(focusedSurface()),
		onMatch: target => menuItems.focusItem(focusedSurface(), target),
	})

	listen(this, 'keydown', (event: KeyboardEvent) => {
		// A submenu that handled the key (Escape closes one level) prevents
		// default; the root must not also act on it.
		if (event.defaultPrevented) return
		const target = event.target as HTMLElement | null
		if (!target?.closest('[data-menu-trigger="true"],[data-menu-content="true"]')) return

		if (target.closest('[data-menu-trigger="true"]')) {
			// A pointer click may have opened the menu without moving focus;
			// arrows from the still-focused trigger enter it.
			if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				if (menu.open) focusEdge(menu.content, 'first')
				else setOpen(true, event, 'first')
			} else if (event.key === 'ArrowUp') {
				event.preventDefault()
				if (menu.open) focusEdge(menu.content, 'last')
				else setOpen(true, event, 'last')
			}
			return
		}

		if (event.key === 'Escape') {
			event.preventDefault()
			close(event)
		} else if (nav.handle(event)) {
			return
		} else if (event.key === 'Enter' || event.key === ' ') {
			const item = menuItems.item(event)
			if (!item) return
			event.preventDefault()
			item.click()
		} else if (ta.handle(event)) {
			event.preventDefault()
		}
	})

	for (const args of this) {
		disabled = Boolean(args.disabled)
		onOpenChange = args.onOpenChange
		menu.sync(args.open != null ? Boolean(args.open) : null)

		MenuContext({
			close,
			closeSubmenus,
			content: menu.content,
			contentId: menu.contentId,
			disabled,
			focusFirst: () => focusEdge(menu.content, 'first'),
			focusLast: () => focusEdge(menu.content, 'last'),
			open: menu.open,
			registerSubmenu,
			setAnchor: menu.setAnchor,
			setContent: menu.setContent,
			setOpen,
			setTrigger: menu.setTrigger,
			trigger: menu.trigger,
			triggerId: menu.triggerId,
		})

		yield <>{args.children}</>
	}
}


/** Root provider for a dropdown menu. */
const DropdownMenu: Stateless<DropdownMenuArgs> = ({
	children,
	class: classes,
	defaultOpen,
	disabled,
	onOpenChange,
	open,
	...attrs
}) => (
	<DropdownMenuRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		disabled={disabled}
		onOpenChange={onOpenChange}
		open={open}
		attr:class={classes}
		attr:data-slot="dropdown-menu"
	>
		{children}
	</DropdownMenuRoot>
)

/** Button that opens a DropdownMenu. */
const DropdownMenuTrigger: Stateless<DropdownMenuTriggerArgs> = ({
	children,
	'data-slot': slot = 'dropdown-menu-trigger',
	disabled,
	id,
	ref,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const menu = MenuContext()
	const disabledFlag = Boolean(disabled ?? menu?.disabled)

	return (
		<button
			{...attrs}
			{...triggerAttrs({
				controls: menu?.contentId,
				expanded: Boolean(menu?.open),
				haspopup: 'menu',
				id,
				open: Boolean(menu?.open),
				ref,
				setTrigger: menu?.setTrigger,
				triggerId: menu?.triggerId,
			})}
			data-menu-trigger="true"
			data-slot={slot}
			disabled={disabledFlag}
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented) return
				// Focus intent follows input modality: keyboard/AT activation
				// (detail 0) focuses the first item; pointer clicks open the
				// menu without moving focus (keyboard opens go through the
				// root keydown handler, which preventDefaults the click).
				menu?.setOpen(!menu.open, event, (event as MouseEvent).detail === 0 ? 'first' : undefined)
			}}
			type={type}
		>
			{children}
		</button>
	)
}

/** Optional explicit anchor used to position DropdownMenuContent independently of the trigger. */
const DropdownMenuAnchor: Stateless<DropdownMenuAnchorArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'dropdown-menu-anchor',
	ref,
	...attrs
}) => {
	const menu = MenuContext()
	const reference = (element: HTMLDivElement | null) => {
		menu?.setAnchor(element)
		callRef(ref, element)
	}

	return (
		<div {...attrs} class={classes} data-slot={slot} ref={reference}>
			{children}
		</div>
	)
}

/** Popover menu content. */
const DropdownMenuContent: Stateless<DropdownMenuContentArgs> = ({
	align = 'center',
	alignOffset = 0,
	children,
	class: classes,
	'data-slot': slot = 'dropdown-menu-content',
	id,
	ref,
	side = 'bottom',
	sideOffset = 4,
	style,
	...attrs
}) => {
	const menu = MenuContext()

	return (
		<div
			{...attrs}
			{...contentAttrs({
				align,
				alignOffset,
				id: id ?? menu?.contentId,
				popover: 'auto',
				ref,
				setContent: menu?.setContent,
				side,
				sideOffset,
				style,
				tabindex: '-1',
			})}
			aria-labelledby={menu?.trigger ? menu.triggerId : undefined}
			class={classes}
			data-menu-content="true"
			data-slot={slot}
			role="menu"
		>
			{children}
		</div>
	)
}

/** Group of dropdown menu items. */
const DropdownMenuGroup: Stateless<DropdownMenuGroupArgs> = ({ children, class: classes, 'data-slot': slot = 'dropdown-menu-group', ...attrs }) => (
	<div {...attrs} class={classes} data-slot={slot} role="group">
		{children}
	</div>
)

/** Non-interactive label inside a dropdown menu. */
const DropdownMenuLabel: Stateless<DropdownMenuLabelArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'dropdown-menu-label',
	inset,
	...attrs
}) => (
	<div
		{...attrs}
		class={classes}
		data-inset={flag(inset)}
		data-slot={slot}
	>
		{children}
	</div>
)

/** Single activation guard for every item kind: disabled check, composed onclick, then the kind's action. */
const activate = (
	disabled: boolean,
	onClick: unknown,
	action: (event: Event) => void,
) => (event: Event) => {
	if (disabled) return
	callHandler(onClick, event)
	if (event.defaultPrevented) return
	action(event)
}

/** Standard dropdown menu action item. */
const DropdownMenuItem: Stateless<DropdownMenuItemArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'dropdown-menu-item',
	disabled,
	inset,
	onSelect,
	textValue,
	variant = 'default',
	'set:onclick': onClick,
	...attrs
}) => {
	const menu = MenuContext()
	const disabledFlag = Boolean(disabled ?? menu?.disabled)
	const label = textValue ?? text(children)
	const highlight = pointerHighlight(disabledFlag, menu?.closeSubmenus)

	return (
		<div
			{...attrs}
			{...menuItems.attrs({ disabled: disabledFlag, label })}
			aria-disabled={flag(disabledFlag)}
			class={classes}
			data-inset={flag(inset)}
			data-slot={slot}
			data-variant={variant}
			role="menuitem"
			set:onclick={activate(disabledFlag, onClick, event => {
				onSelect?.(event)
				if (!event.defaultPrevented) menu?.close(event)
			})}
			set:onpointerenter={highlight}
			set:onpointermove={highlight}
			tabindex="-1"
		>
			{children}
		</div>
	)
}

/** Shared row shell for checkbox/radio choice items; only role, checked source, and action differ. */
const choiceItem = (opts: {
	attrs: Record<string, unknown>
	checked: boolean
	children: Children
	class?: string
	disabled: boolean
	indicatorClass?: string
	indicatorIconClass?: string
	label: string
	menu: MenuContextValue | null
	action: (event: Event) => void
	onClick: unknown
	role: 'menuitemcheckbox' | 'menuitemradio'
	slot: unknown
	value?: string
}) => {
	const highlight = pointerHighlight(opts.disabled, opts.menu?.closeSubmenus)

	return (
		<div
			{...opts.attrs}
			{...menuItems.attrs({ disabled: opts.disabled, label: opts.label, value: opts.value })}
			aria-checked={opts.checked ? 'true' : 'false'}
			aria-disabled={flag(opts.disabled)}
			class={opts.class}
			data-checked={flag(opts.checked)}
			data-slot={opts.slot}
			role={opts.role}
			set:onclick={activate(opts.disabled, opts.onClick, opts.action)}
			set:onpointerenter={highlight}
			set:onpointermove={highlight}
			tabindex="-1"
		>
			<span class={opts.indicatorClass}>
				{opts.checked ? <span aria-hidden="true" class={opts.indicatorIconClass} /> : null}
			</span>
			{opts.children}
		</div>
	)
}

/** Checkable dropdown menu item. */
const DropdownMenuCheckboxItem: Stateless<DropdownMenuCheckboxItemArgs> = ({
	checked,
	children,
	class: classes,
	'data-slot': slot = 'dropdown-menu-checkbox-item',
	disabled,
	indicatorClass,
	indicatorIconClass,
	onCheckedChange,
	textValue,
	'set:onclick': onClick,
	...attrs
}) => {
	const menu = MenuContext()
	const checkedFlag = Boolean(checked)

	return choiceItem({
		attrs,
		checked: checkedFlag,
		children,
		class: classes,
		disabled: Boolean(disabled ?? menu?.disabled),
		indicatorClass,
		indicatorIconClass,
		label: textValue ?? text(children),
		menu,
		action: event => onCheckedChange?.(!checkedFlag, event),
		onClick,
		role: 'menuitemcheckbox',
		slot,
	})
}

const DropdownMenuRadioGroupRoot: Stateful<DropdownMenuRadioGroupArgs> = function* ({ defaultValue, value }) {
	let onValueChange: DropdownMenuRadioGroupArgs['onValueChange']
	const state = controlled<string>(this, {
		fallback: String(value ?? defaultValue ?? ''),
		onChange: (next, event) => onValueChange?.(next, event!),
	})

	const change = (next: string, event: Event) => {
		state.set(next, event)
	}

	for (const args of this) {
		onValueChange = args.onValueChange
		state.sync(args.value != null ? String(args.value ?? '') : undefined)

		RadioContext({ change, value: state.value })
		yield <>{args.children}</>
	}
}


/** Radio group inside a dropdown menu. */
const DropdownMenuRadioGroup: Stateless<DropdownMenuRadioGroupArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'dropdown-menu-radio-group',
	defaultValue,
	onValueChange,
	value,
	...attrs
}) => (
	<DropdownMenuRadioGroupRoot
		{...rootAttrs(attrs)}
		defaultValue={defaultValue}
		onValueChange={onValueChange}
		value={value}
		attr:class={classes}
		attr:data-slot={slot}
		attr:role="group"
	>
		{children}
	</DropdownMenuRadioGroupRoot>
)

/** Radio item inside a dropdown menu radio group. */
const DropdownMenuRadioItem: Stateless<DropdownMenuRadioItemArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'dropdown-menu-radio-item',
	disabled,
	indicatorClass,
	indicatorIconClass,
	textValue,
	value,
	'set:onclick': onClick,
	...attrs
}) => {
	const menu = MenuContext()
	const group = RadioContext()
	const itemValue = String(value)

	return choiceItem({
		attrs,
		checked: group?.value === itemValue,
		children,
		class: classes,
		disabled: Boolean(disabled ?? menu?.disabled),
		indicatorClass,
		indicatorIconClass,
		label: textValue ?? text(children),
		menu,
		action: event => group?.change(itemValue, event),
		onClick,
		role: 'menuitemradio',
		slot,
		value: itemValue,
	})
}

/** Visual separator between dropdown menu groups. */
const DropdownMenuSeparator: Stateless<DropdownMenuSeparatorArgs> = ({ class: classes, 'data-slot': slot = 'dropdown-menu-separator', ...attrs }) => (
	<div
		{...attrs}
		class={classes}
		data-slot={slot}
		role="separator"
	/>
)

/** Right-aligned shortcut hint inside a dropdown menu item. */
const DropdownMenuShortcut: Stateless<DropdownMenuShortcutArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'dropdown-menu-shortcut',
	...attrs
}) => (
	<span
		{...attrs}
		class={classes}
		data-slot={slot}
	>
		{children}
	</span>
)

const DropdownMenuSubRoot: Stateful<DropdownMenuSubArgs> = function* ({ defaultOpen, open }) {
	const subId = id('dropdown-sub')
	let content: HTMLDivElement | null = null
	let localOpen = Boolean(open ?? defaultOpen)
	let onOpenChange: DropdownMenuSubArgs['onOpenChange']
	let openControlled = open != null
	let opened = localOpen
	let parentMenu: MenuContextValue | null = null
	let trigger: HTMLElement | null = null
	let unregister: (() => void) | undefined

	const pane = surface(this, {
		anchor: () => trigger,
		target: () => content,
		placement: {
			side: () => 'right',
			align: () => 'start',
			sideOffset: () => 4,
			padding: () => 4,
		},
	})

	const sync = (focus = false) => queueMicrotask(() => {
		if (!content) return
		if (opened) {
			content.hidden = false
			pane.show(trigger)
			content.style.zIndex = '60'
			if (focus) focusEdge(content, 'first')
		} else {
			menuItems.clearHighlight(content)
			pane.hide()
			content.hidden = true
		}
	})

	const setOpen = (next: boolean, event?: Event, focus = false) => {
		if (next === opened) return
		onOpenChange?.(next, event)
		if (!openControlled) localOpen = next
		this.next(() => opened = next)
		sync(focus)
	}

	const registration: SubmenuRegistration = {
		close: event => setOpen(false, event),
		trigger: () => trigger,
	}

	const close = (event?: Event) => {
		setOpen(false, event)
		queueMicrotask(() => trigger?.focus())
	}

	this.signal.addEventListener('abort', () => unregister?.())

	listen(this, 'keydown', (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		const target = event.target as HTMLElement | null
		if (!target?.closest('[data-menu-sub-trigger="true"],[data-menu-sub-content="true"]')) return
		if (event.key === 'ArrowRight' && target.matches('[data-menu-sub-trigger="true"]')) {
			event.preventDefault()
			// A pointer may have opened the submenu already; ArrowRight still enters it.
			if (opened) queueMicrotask(() => focusEdge(content, 'first'))
			else setOpen(true, event, true)
		} else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
			// Only an open submenu owns these keys; while closed they fall
			// through (Escape to the root menu, ArrowLeft to a hosting menubar).
			if (!opened) return
			event.preventDefault()
			close(event)
		}
	})

	for (const args of this) {
		const menu = MenuContext()
		if (menu !== parentMenu) {
			unregister?.()
			parentMenu = menu
			unregister = menu?.registerSubmenu(registration)
		}
		const parentOpen = menu?.open ?? true
		onOpenChange = args.onOpenChange
		openControlled = args.open != null
		if (!parentOpen && !openControlled) localOpen = false
		opened = parentOpen && (openControlled ? Boolean(args.open) : localOpen)

		SubContext({
			close,
			content,
			contentId: `${subId}-content`,
			open: opened,
			setContent: element => {
				content = element
				sync()
			},
			setOpen,
			setTrigger: element => trigger = element,
			trigger,
			triggerId: `${subId}-trigger`,
		})

		sync()
		yield <>{args.children}</>
	}
}


/** Root provider for a dropdown submenu. */
const DropdownMenuSub: Stateless<DropdownMenuSubArgs> = ({
	children,
	'data-slot': slot = 'dropdown-menu-sub',
	defaultOpen,
	onOpenChange,
	open,
	...attrs
}) => (
	<DropdownMenuSubRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		onOpenChange={onOpenChange}
		open={open}
		attr:data-slot={slot}
	>
		{children}
	</DropdownMenuSubRoot>
)

/** Trigger item that opens a dropdown submenu. */
const DropdownMenuSubTrigger: Stateless<DropdownMenuSubTriggerArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'dropdown-menu-sub-trigger',
	disabled,
	iconClass,
	inset,
	textValue,
	...attrs
}) => {
	const menu = MenuContext()
	const sub = SubContext()
	const disabledFlag = Boolean(disabled ?? menu?.disabled)
	const label = textValue ?? text(children)
	const reference = (element: HTMLElement | null) => sub?.setTrigger(element)
	const highlight = pointerHighlight(disabledFlag, menu?.closeSubmenus, true)

	return (
		<div
			{...attrs}
			{...menuItems.attrs({ disabled: disabledFlag, label })}
			aria-controls={sub?.contentId}
			aria-disabled={flag(disabledFlag)}
			aria-expanded={sub?.open ? 'true' : 'false'}
			aria-haspopup="menu"
			class={classes}
			data-inset={flag(inset)}
			data-menu-sub-trigger="true"
			data-slot={slot}
			data-state={sub?.open ? 'open' : 'closed'}
			id={sub?.triggerId}
			ref={reference}
			role="menuitem"
			set:onclick={(event: Event) => {
				if (disabledFlag) return
				sub?.setOpen(!sub.open, event, true)
			}}
			set:onpointerenter={highlight}
			set:onpointermove={highlight}
			set:onmouseenter={(event: Event) => {
				if (disabledFlag) return
				sub?.setOpen(true, event)
			}}
			tabindex="-1"
		>
			{children}
			<span aria-hidden="true" class={iconClass} />
		</div>
	)
}

/** Content for a dropdown submenu. */
const DropdownMenuSubContent: Stateless<DropdownMenuSubContentArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'dropdown-menu-sub-content',
	ref,
	style,
	...attrs
}) => {
	const sub = SubContext()
	const reference = (element: HTMLDivElement | null) => {
		sub?.setContent(element)
		callRef(ref, element)
	}

	return (
		<div
			{...attrs}
			aria-labelledby={sub?.triggerId}
			class={classes}
			data-menu-sub-content="true"
			data-slot={slot}
			hidden={!sub?.open}
			id={sub?.contentId}
			popover="manual"
			ref={reference}
			role="menu"
			style={popupStyle(style)}
			tabindex="-1"
		>
			{children}
		</div>
	)
}

export {
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
	DropdownMenuTrigger,
}
