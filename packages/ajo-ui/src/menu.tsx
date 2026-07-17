import type { Children, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, controlled, dom, frame, listen, roving, statefulRootAttrs as rootAttrs, typeahead } from 'ajo-cloves'
import { context } from 'ajo/context'
import {
	cluster,
	focusEdge,
	isolateMenuComposition,
	isolateMenuInvocation,
	menuComposition,
	menuItems,
	provideMenuInvocation,
	SURFACE_SELECTOR,
	surfaceItems,
	type MenuBranch,
	type MenuCluster,
	type MenuInvocationFocus,
} from './menu-cluster'
import { contentAttrs, popup, type PopupView } from './popup'
import type { PositionReference, ReservedPositionArg } from './position'
import type { FixedArgs, OmitArg, PopupPosition } from './utils'
import { flag, popupStyle, text, triggerAttrs } from './utils'
export type { PopupPlacement, PopupPosition } from './utils'

/** Semantic tone applied to an actionable menu item. */
export type MenuVariant = 'default' | 'danger'

/** Arguments for the Menu open-state provider. */
export type MenuArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange' | ReservedPositionArg> & PopupPosition & {
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
}> & FixedArgs<'onchange' | ReservedPositionArg>

/** Arguments for the button that toggles a Menu. */
export type MenuTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Arguments for the Menu surface; positioning and semantics belong to Menu. */
export type MenuContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'aria-labelledby' | 'hidden' | 'id' | 'popover' | 'role' | 'tabindex' | 'tabIndex' | ReservedPositionArg> & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Inline CSS declarations composed with live positioning styles. */
	style?: string
}> & FixedArgs<'aria-labelledby' | 'gap' | 'hidden' | 'id' | 'placement' | 'popover' | 'role' | 'tabindex' | 'tabIndex' | ReservedPositionArg>

/** Arguments for an actionable item in a Menu. */
export type MenuItemArgs = WithChildren<IntrinsicElements['div'] & {
	/** Left-indent text for iconless groups. */
	inset?: boolean
	/** Disable activation. */
	disabled?: boolean
	/** Called after click/key activation before the menu closes. Prevent default to keep it open. */
	onSelect?: (event: Event) => void
	/** Plain-text label used for typeahead. */
	textValue?: string
	/** Visual tone. */
	variant?: MenuVariant
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Arguments for a checkable item in a Menu. */
export type MenuCheckboxItemArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'checked'> & {
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

/** Arguments for a single-selection group of menu radio items. */
export type MenuRadioGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Controlled selected value. */
	value?: string
	/** Initial selected value for uncontrolled usage. */
	defaultValue?: string
	/** Called whenever selected value changes. */
	onValueChange?: (value: string, event: Event) => void
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Arguments for one value-bearing item in a menu radio group. */
export type MenuRadioItemArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'value'> & {
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

/** Arguments for a non-interactive label inside menu content. */
export type MenuLabelArgs = WithChildren<IntrinsicElements['div'] & {
	/** Left-indent text for iconless groups. */
	inset?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Arguments for a semantic group of related menu items. */
export type MenuGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Arguments for a visual separator between menu groups. */
export type MenuSeparatorArgs = IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}

/** Arguments for a shortcut hint rendered beside a menu item. */
export type MenuShortcutArgs = WithChildren<IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Arguments for a nested Menu open-state provider. */
export type MenuSubArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'gap' | 'onchange' | 'placement' | ReservedPositionArg> & {
	/** Controlled open state. */
	open?: boolean
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Called whenever the submenu opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
}> & FixedArgs<'gap' | 'onchange' | 'placement' | ReservedPositionArg>

/** Arguments for the item that opens a nested Menu. */
export type MenuSubTriggerArgs = MenuItemArgs & {
	iconClass?: string
}
/** Arguments for a nested Menu surface with system-owned positioning and semantics. */
export type MenuSubContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'aria-labelledby' | 'hidden' | 'id' | 'popover' | 'role' | 'tabindex' | 'tabIndex' | ReservedPositionArg> & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Inline CSS declarations composed with live positioning styles. */
	style?: string
}> & FixedArgs<'aria-labelledby' | 'gap' | 'hidden' | 'id' | 'placement' | 'popover' | 'role' | 'tabindex' | 'tabIndex' | ReservedPositionArg>

/** Shared menu state private to Menu parts. */
type MenuContextValue = {
	adoptTriggerId: PopupView['adoptTriggerId']
	close: (event?: Event) => void
	contentId: string
	contentStyle: PopupView['contentStyle']
	disabled: boolean
	dismiss: (event: Event) => void
	open: boolean
	setContent: (element: HTMLDivElement | null) => void
	setOpen: (open: boolean, event?: Event, focus?: 'first' | 'last') => void
	setTrigger: (element: HTMLButtonElement | null) => void
	triggerId: string
}

type RadioContextValue = {
	change: (value: string, event: Event) => void
	value: string
}

type SubContextValue = {
	adoptTriggerId: PopupView['adoptTriggerId']
	branch: MenuBranch
	close: (event?: Event) => void
	contentId: string
	contentStyle: PopupView['contentStyle']
	open: boolean
	setContent: (element: HTMLDivElement | null) => void
	setOpen: (open: boolean, event?: Event, focus?: boolean) => void
	setTrigger: (element: HTMLElement | null) => void
	triggerId: string
}

type LevelContextValue = {
	cluster: MenuCluster
	content: () => HTMLElement | null
	open: () => boolean
}

const MenuContext = context<MenuContextValue | null>(null)
const RadioContext = context<RadioContextValue | null>(null)
const SubContext = context<SubContextValue | null>(null)
const LevelContext = context<LevelContextValue | null>(null)

const pointerHighlight = (
	disabled: boolean,
	closeSubmenus?: MenuCluster['close'],
	keep?: MenuBranch,
) => (event: Event) => {
	if (disabled) return
	const target = event.currentTarget as HTMLElement
	const content = target.closest<HTMLElement>(SURFACE_SELECTOR)
	menuItems.focusItem(content, event.currentTarget as HTMLElement)
	closeSubmenus?.(event, keep)
}

const MenuRoot: Stateful<MenuArgs> = function* ({ defaultOpen, open }) {
	const composition = menuComposition()
	const contextComposition = composition?.profile === 'context' ? composition : null
	const ownerDocument = dom(this) ? this.ownerDocument : null
	const node = (value: unknown): value is Node => {
		const view = ownerDocument?.defaultView
		return Boolean(view && value instanceof view.Node)
	}
	const submenus = cluster()
	let contextSource: HTMLElement | null = null
	let disabled = false
	let focusRestore = 0
	let geometryReady = false
	let onOpenChange: MenuArgs['onOpenChange']
	type MenuFocus = MenuInvocationFocus | 'last'
	let pendingFocus: MenuFocus | undefined
	let menu: PopupView<HTMLButtonElement, HTMLDivElement>
	const commitMenubarFocus = frame(() => {
		if (composition?.profile === 'menubar' && composition.ackFocus()) {
			focusEdge(menu.content, 'first')
		}
	})
	this.signal.addEventListener('abort', commitMenubarFocus.cancel)

	menu = popup<HTMLButtonElement, HTMLDivElement>(this, {
		prefix: 'menu',
		profile: composition?.profile ?? 'menu',
		initialOpen: Boolean(open ?? defaultOpen),
		disabled: () => disabled,
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		reference: view => view.reference ?? view.trigger,
		source: view => contextComposition
			? contextSource
			: view.trigger ?? (dom(view.reference) ? view.reference as HTMLElement : null),
		reopenOnReferenceChange: Boolean(contextComposition),
		referenceHidden: 'close',
		dismiss: {
			prevent: true,
			outside: true,
			onDismiss: event => {
				if (event.type === 'keydown') close(event)
				else setOpen(false, event)
			},
		},
		onPosition: () => {
			geometryReady = true
			if (pendingFocus === 'content') menu.content?.focus()
			else if (pendingFocus) focusEdge(menu.content, pendingFocus)
			else if (composition?.profile === 'menubar') commitMenubarFocus()
			pendingFocus = undefined
		},
		onSync: opened => {
			if (!opened) {
				commitMenubarFocus.cancel()
				geometryReady = false
				menuItems.clearHighlight(menu.content)
				submenus.close()
				pendingFocus = undefined
			}
		},
	})

	const focusWhenReady = (focus: MenuFocus) => {
		if (geometryReady) {
			if (focus === 'content') menu.content?.focus()
			else focusEdge(menu.content, focus)
		}
		else pendingFocus = focus
	}

	const setOpen = (next: boolean, event?: Event, focus?: MenuFocus) => {
		if (disabled && next) return
		if (next) focusRestore++
		if (next === menu.open) {
			if (next && focus) focusWhenReady(focus)
			return
		}

		if (!next) {
			submenus.close(event)
			pendingFocus = undefined
		}
		else geometryReady = false
		if (next && focus) pendingFocus = focus
		menu.setOpen(next, event)
	}

	const invoke = (
		reference: PositionReference,
		source: HTMLElement,
		event: Event,
		focus: MenuInvocationFocus,
	) => {
		geometryReady = false
		pendingFocus = focus
		contextSource = source
		const changed = menu.reference !== reference
		submenus.close(event)
		menu.setReference(reference)
		if (menu.open) {
			// A ContextMenu virtual point mutates coordinates without changing
			// identity; no observer can detect that same-reference update.
			if (!changed) menu.update()
		} else {
			menu.setOpen(true, event)
		}
	}

	const close = (event?: Event) => {
		const wasOpen = menu.open
		const restore = ++focusRestore
		setOpen(false, event)
		if (contextComposition) {
			if (wasOpen && !menu.open) contextComposition.restoreFocus()
		} else queueMicrotask(() => {
			if (restore === focusRestore && wasOpen && !menu.open) menu.trigger?.focus()
		})
	}

	const dismiss = (event: Event) => {
		const target = event.target
		const reference = menu.reference
		const inside = node(target) && Boolean(
			this.contains(target)
			|| menu.trigger?.contains(target)
			|| menu.content?.contains(target)
			|| (dom(reference) && reference.contains(target)),
		)
		if (inside) submenus.prune(target, event)
		else setOpen(false, event)
	}

	// Keyboard movement stays inside the surface that owns focus: an open
	// submenu cycles its own items, never the parent menu's.
	const focusedSurface = () => {
		const active = ownerDocument?.activeElement
		const surface = dom(active) ? active.closest<HTMLElement>(SURFACE_SELECTOR) : null
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
		if (event.defaultPrevented) return
		const target = event.target as HTMLElement | null
		if (!target?.closest('[data-menu-trigger="true"],[data-menu-content="true"]')) return

		if (target.closest('[data-menu-trigger="true"]')) {
			// A pointer click may have opened the menu without moving focus;
			// arrows from the still-focused trigger enter it.
			if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				setOpen(true, event, 'first')
			} else if (event.key === 'ArrowUp') {
				event.preventDefault()
				setOpen(true, event, 'last')
			}
			return
		}

		if (nav.handle(event)) {
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
		const wasOpen = menu.open
		const opened = menu.sync(args.open != null ? Boolean(args.open) : null, {
			placement: args.placement,
			gap: args.gap,
		})
		if (!wasOpen && opened) focusRestore++
		if (wasOpen && !opened) {
			// A controlled close can beat the first geometry commit, so invalidate
			// focus intent here instead of relying only on popup.onSync(false).
			geometryReady = false
			commitMenubarFocus.cancel()
			pendingFocus = undefined
			submenus.close()
		}
		// Composition applies to exactly this root; arbitrary nested Menu roots
		// retain their own menu profile and interaction policy.
		isolateMenuComposition()
		isolateMenuInvocation()

		MenuContext({
			adoptTriggerId: menu.adoptTriggerId,
			close,
			contentId: menu.contentId,
			contentStyle: menu.contentStyle,
			disabled,
			dismiss,
			open: opened,
			setContent: menu.setContent,
			setOpen,
			setTrigger: menu.setTrigger,
			get triggerId() { return menu.triggerId },
		})
		if (contextComposition) provideMenuInvocation({
			adoptTriggerId: menu.adoptTriggerId,
			contentId: menu.contentId,
			disabled,
			invoke: (x, y, event, source, focus) =>
				contextComposition.invoke(invoke, x, y, event, source, focus),
			open: opened,
		})

		LevelContext({ cluster: submenus, content: () => menu.content, open: () => menu.open })
		yield <>{args.children}</>
	}
}


/** Root provider for a menu. */
const Menu: Stateless<MenuArgs> = ({
	children,
	class: classes,
	defaultOpen,
	disabled,
	gap,
	onOpenChange,
	open,
	placement,
	...attrs
}) => (
	<MenuRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		disabled={disabled}
		gap={gap}
		onOpenChange={onOpenChange}
		open={open}
		placement={placement}
		attr:class={classes}
		attr:data-slot="menu"
	>
		{children}
	</MenuRoot>
)

/** Button that opens a Menu. */
const MenuTrigger: Stateless<MenuTriggerArgs> = ({
	children,
	'data-slot': slot = 'menu-trigger',
	disabled,
	id,
	ref,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const menu = MenuContext()
	const disabledFlag = Boolean(disabled ?? menu?.disabled)
	const adoptedId = menu?.adoptTriggerId(id)

	return (
		<button
			{...attrs}
			{...triggerAttrs({
				controls: menu?.contentId,
				expanded: Boolean(menu?.open),
				haspopup: 'menu',
				id: adoptedId ?? id,
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

/** Popover menu content. */
const MenuContent: Stateless<MenuContentArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'menu-content',
	ref,
	style,
	...attrs
}) => {
	const menu = MenuContext()

	return (
		<div
			{...attrs}
			{...contentAttrs({
				id: menu?.contentId,
				open: Boolean(menu?.open),
				ref,
				setContent: menu?.setContent,
				style: menu?.contentStyle(style) ?? popupStyle(style),
				tabindex: '-1',
			})}
			aria-labelledby={menu?.triggerId}
			class={classes}
			data-menu-content="true"
			data-slot={slot}
			hidden={undefined}
			role="menu"
		>
			{children}
		</div>
	)
}

/** Group of menu items. */
const MenuGroup: Stateless<MenuGroupArgs> = ({ children, class: classes, 'data-slot': slot = 'menu-group', ...attrs }) => (
	<div {...attrs} class={classes} data-slot={slot} role="group">
		{children}
	</div>
)

/** Non-interactive label inside a menu. */
const MenuLabel: Stateless<MenuLabelArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'menu-label',
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

/** Standard menu action item. */
const MenuItem: Stateless<MenuItemArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'menu-item',
	disabled,
	inset,
	onSelect,
	textValue,
	variant = 'default',
	'set:onclick': onClick,
	...attrs
}) => {
	const menu = MenuContext()
	const level = LevelContext()
	const disabledFlag = Boolean(disabled ?? menu?.disabled)
	const label = textValue ?? text(children)
	const highlight = pointerHighlight(disabledFlag, level?.cluster.close)

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
	const highlight = pointerHighlight(opts.disabled, LevelContext()?.cluster.close)

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

/** Checkable menu item. */
const MenuCheckboxItem: Stateless<MenuCheckboxItemArgs> = ({
	checked,
	children,
	class: classes,
	'data-slot': slot = 'menu-checkbox-item',
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

const MenuRadioGroupRoot: Stateful<MenuRadioGroupArgs> = function* ({ defaultValue, value }) {
	let onValueChange: MenuRadioGroupArgs['onValueChange']
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


/** Radio group inside a menu. */
const MenuRadioGroup: Stateless<MenuRadioGroupArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'menu-radio-group',
	defaultValue,
	onValueChange,
	value,
	...attrs
}) => (
	<MenuRadioGroupRoot
		{...rootAttrs(attrs)}
		defaultValue={defaultValue}
		onValueChange={onValueChange}
		value={value}
		attr:class={classes}
		attr:data-slot={slot}
		attr:role="group"
	>
		{children}
	</MenuRadioGroupRoot>
)

/** Radio item inside a menu radio group. */
const MenuRadioItem: Stateless<MenuRadioItemArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'menu-radio-item',
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

/** Visual separator between menu groups. */
const MenuSeparator: Stateless<MenuSeparatorArgs> = ({ class: classes, 'data-slot': slot = 'menu-separator', ...attrs }) => (
	<div
		{...attrs}
		class={classes}
		data-slot={slot}
		role="separator"
	/>
)

/** Right-aligned shortcut hint inside a menu item. */
const MenuShortcut: Stateless<MenuShortcutArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'menu-shortcut',
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

const MenuSubRoot: Stateful<MenuSubArgs> = function* ({ defaultOpen, open }) {
	const children = cluster()
	const parent = LevelContext()
	let focusRestore = 0
	let geometryReady = false
	let menu: MenuContextValue | null = null
	let onOpenChange: MenuSubArgs['onOpenChange']
	const parentCluster = parent?.cluster ?? null
	let pendingFocus = false
	let unregister: (() => void) | undefined
	let branch: MenuBranch
	let submenu: PopupView<HTMLElement, HTMLDivElement>

	submenu = popup<HTMLElement, HTMLDivElement>(this, {
		prefix: 'menu-sub',
		profile: 'submenu',
		initialOpen: Boolean(open ?? defaultOpen),
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		reference: view => view.trigger,
		source: view => view.trigger,
		// A native top-layer child escapes older popup ancestors; limiting
		// clipping to its direct parent surface avoids false referenceHidden.
		referenceBoundary: () => parent?.content() ?? null,
		referenceHidden: 'close',
		dismiss: {
			prevent: true,
			outside: true,
			onDismiss: event => {
				if (event.type === 'keydown') close(event)
				else if (menu) menu.dismiss(event)
				else setOpen(false, event)
			},
		},
		onSync: opened => {
			if (opened) {
				geometryReady = true
				if (pendingFocus) focusEdge(submenu.content, 'first')
			} else {
				geometryReady = false
				menuItems.clearHighlight(submenu.content)
				children.close()
			}
			pendingFocus = false
		},
	})

	const focusWhenReady = () => {
		if (geometryReady) focusEdge(submenu.content, 'first')
		else pendingFocus = true
	}

	const setOpen = (next: boolean, event?: Event, focus = false) => {
		if (next) focusRestore++
		if (next === submenu.open) {
			if (next && focus) focusWhenReady()
			return
		}

		if (next) {
			geometryReady = false
			parentCluster?.close(event, branch)
		} else {
			children.close(event)
		}
		pendingFocus = next && focus
		submenu.setOpen(next, event)
	}

	branch = {
		close: event => setOpen(false, event),
		content: () => submenu.content,
		prune: (target, event) => children.prune(target, event),
		trigger: () => submenu.trigger,
	}
	unregister = parentCluster?.register(branch)

	const close = (event?: Event) => {
		const wasOpen = submenu.open
		const restore = ++focusRestore
		setOpen(false, event)
		queueMicrotask(() => {
			if (restore === focusRestore && wasOpen && !submenu.open) submenu.trigger?.focus()
		})
	}

	this.signal.addEventListener('abort', () => unregister?.())

	listen(this, 'keydown', (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		const target = event.target as HTMLElement | null
		if (!target?.closest('[data-menu-sub-trigger="true"],[data-menu-sub-content="true"]')) return
		if (event.key === 'ArrowRight' && target.matches('[data-menu-sub-trigger="true"]')) {
			event.preventDefault()
			setOpen(true, event, true)
		} else if (event.key === 'ArrowLeft') {
			// While closed ArrowLeft belongs to an enclosing submenu or menubar.
			if (!submenu.open) return
			event.preventDefault()
			close(event)
		}
	})

	for (const args of this) {
		menu = MenuContext()
		onOpenChange = args.onOpenChange
		const parentOpen = parent?.open() ?? menu?.open ?? true
		if (!parentOpen) {
			children.close()
			submenu.init(false)
		}
		const wasOpen = submenu.open
		const opened = submenu.sync(parentOpen ? (args.open != null ? Boolean(args.open) : null) : false)
		if (!wasOpen && opened) focusRestore++
		if (wasOpen && !opened) {
			geometryReady = false
			pendingFocus = false
			children.close()
		}

		SubContext({
			adoptTriggerId: submenu.adoptTriggerId,
			branch,
			close,
			contentId: submenu.contentId,
			contentStyle: submenu.contentStyle,
			open: opened,
			setContent: submenu.setContent,
			setOpen,
			setTrigger: submenu.setTrigger,
			get triggerId() { return submenu.triggerId },
		})

		LevelContext({ cluster: children, content: () => submenu.content, open: () => submenu.open })
		yield <>{args.children}</>
	}
}


/** Root provider for a nested menu. */
const MenuSub: Stateless<MenuSubArgs> = ({
	children,
	'data-slot': slot = 'menu-sub',
	defaultOpen,
	onOpenChange,
	open,
	...attrs
}) => (
	<MenuSubRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		onOpenChange={onOpenChange}
		open={open}
		attr:data-slot={slot}
	>
		{children}
	</MenuSubRoot>
)

/** Trigger item that opens a nested menu. */
const MenuSubTrigger: Stateless<MenuSubTriggerArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'menu-sub-trigger',
	disabled,
	iconClass,
	id,
	inset,
	ref,
	textValue,
	'set:onclick': onClick,
	'set:onmouseenter': onMouseEnter,
	'set:onpointerenter': onPointerEnter,
	'set:onpointermove': onPointerMove,
	...attrs
}) => {
	const menu = MenuContext()
	const parent = LevelContext()
	const sub = SubContext()
	const disabledFlag = Boolean(disabled ?? menu?.disabled)
	const label = textValue ?? text(children)
	const highlight = pointerHighlight(disabledFlag, parent?.cluster.close, sub?.branch)
	const adoptedId = sub?.adoptTriggerId(id)

	return (
		<div
			{...attrs}
			{...menuItems.attrs({ disabled: disabledFlag, label })}
			{...triggerAttrs({
				controls: sub?.contentId,
				expanded: Boolean(sub?.open),
				haspopup: 'menu',
				id: adoptedId ?? id,
				open: Boolean(sub?.open),
				ref,
				setTrigger: sub?.setTrigger,
				triggerId: sub?.triggerId,
			})}
			aria-disabled={flag(disabledFlag)}
			class={classes}
			data-inset={flag(inset)}
			data-menu-sub-trigger="true"
			data-slot={slot}
			role="menuitem"
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented) return
				if (disabledFlag) return
				sub?.setOpen(!sub.open, event, true)
			}}
			set:onpointerenter={(event: Event) => {
				callHandler(onPointerEnter, event)
				if (!event.defaultPrevented) highlight(event)
			}}
			set:onpointermove={(event: Event) => {
				callHandler(onPointerMove, event)
				if (!event.defaultPrevented) highlight(event)
			}}
			set:onmouseenter={(event: Event) => {
				callHandler(onMouseEnter, event)
				if (event.defaultPrevented) return
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

/** Content for a nested menu. */
const MenuSubContent: Stateless<MenuSubContentArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'menu-sub-content',
	ref,
	style,
	...attrs
}) => {
	const sub = SubContext()

	return (
		<div
			{...attrs}
			{...contentAttrs({
				id: sub?.contentId,
				open: Boolean(sub?.open),
				ref,
				setContent: sub?.setContent,
				style: sub?.contentStyle(style) ?? popupStyle(style),
				tabindex: '-1',
			})}
			aria-labelledby={sub?.triggerId}
			class={classes}
			data-menu-sub-content="true"
			data-slot={slot}
			hidden={undefined}
			role="menu"
		>
			{children}
		</div>
	)
}

export {
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
}
