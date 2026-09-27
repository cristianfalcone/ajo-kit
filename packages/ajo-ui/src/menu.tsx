import type { Children, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, controlled, listen } from 'ajo-cloves'
import { context } from 'ajo/context'
import { DirectionContext } from './direction'
import {
	cluster,
	focusEdge,
	LevelContext,
	MenuContext,
	menuItems,
	MenuRoot,
	SURFACE_SELECTOR,
	type MenuBranch,
	type MenuCluster,
	type MenuContextValue,
} from './menu-cluster'
import { contentAttrs, popup, type PopupPosition, popupStyle, type PopupView, triggerAttrs } from './popup'
import { activate, flag, rootAttrs, text } from './shared'
import { part, type FixedArgs, type OmitArg } from './utils'
export type { PopupPlacement, PopupPosition } from './popup'

/** Semantic tone applied to an actionable menu item. */
export type MenuVariant = 'default' | 'danger'

/** Arguments for the Menu open-state provider. */
export type MenuArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange'> & PopupPosition & {
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

/** Arguments for the button that toggles a Menu. */
export type MenuTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Arguments for the Menu surface; positioning and semantics belong to Menu. */
export type MenuContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'aria-labelledby' | 'hidden' | 'id' | 'popover' | 'role' | 'tabindex' | 'tabIndex'> & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Inline CSS declarations composed with live positioning styles. */
	style?: string
}> & FixedArgs<'aria-labelledby' | 'gap' | 'hidden' | 'id' | 'placement' | 'popover' | 'role' | 'tabindex' | 'tabIndex'>

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
export type MenuSubArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'gap' | 'onchange' | 'placement'> & {
	/** Controlled open state. */
	open?: boolean
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Called whenever the submenu opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
}> & FixedArgs<'gap' | 'onchange' | 'placement'>

/** Arguments for the item that opens a nested Menu. */
export type MenuSubTriggerArgs = MenuItemArgs
/** Arguments for a nested Menu surface with system-owned positioning and semantics. */
export type MenuSubContentArgs = MenuContentArgs

type RadioContextValue = {
	change: (value: string, event: Event) => void
	value: string
}

type SubContextValue = {
	adoptTriggerId: PopupView['adoptTriggerId']
	branch: MenuBranch
	contentId: string
	contentStyle: PopupView['contentStyle']
	open: boolean
	setContent: (element: HTMLDivElement | null) => void
	setOpen: (open: boolean, event?: Event, focus?: boolean) => void
	setTrigger: (element: HTMLElement | null) => void
	triggerId: string
}

const RadioContext = context<RadioContextValue | null>(null)
const SubContext = context<SubContextValue | null>(null)

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

/** Root provider for a menu. */
const Menu: Stateless<MenuArgs> = args => (
	<MenuRoot {...rootAttrs(args, ['defaultOpen', 'disabled', 'gap', 'onOpenChange', 'open', 'placement'])} attr:data-slot="menu" />
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
const MenuGroup = part<MenuGroupArgs>('div', 'menu-group', { role: 'group' })

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
	label: string
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
			<span data-slot="menu-item-indicator">
				{opts.checked ? <span aria-hidden="true" data-slot="menu-item-indicator-icon" /> : null}
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
		label: textValue ?? text(children),
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
const MenuRadioGroup: Stateless<MenuRadioGroupArgs> = ({ 'data-slot': slot = 'menu-radio-group', ...args }) => (
	<MenuRadioGroupRoot
		{...rootAttrs(args, ['defaultValue', 'onValueChange', 'value'])}
		attr:data-slot={slot}
		attr:role="group"
	/>
)

/** Radio item inside a menu radio group. */
const MenuRadioItem: Stateless<MenuRadioItemArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'menu-radio-item',
	disabled,
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
		label: textValue ?? text(children),
		action: event => group?.change(itemValue, event),
		onClick,
		role: 'menuitemradio',
		slot,
		value: itemValue,
	})
}

/** Visual separator between menu groups. */
const MenuSeparator = part<MenuSeparatorArgs>('div', 'menu-separator', { role: 'separator' })

/** Right-aligned shortcut hint inside a menu item. */
const MenuShortcut = part<MenuShortcutArgs>('span', 'menu-shortcut')

const MenuSubRoot: Stateful<MenuSubArgs> = function* ({ defaultOpen, open }) {
	const children = cluster()
	const parent = LevelContext()
	let menu: MenuContextValue | null = null
	let onOpenChange: MenuSubArgs['onOpenChange']
	const parentCluster = parent?.cluster ?? null
	let dir: 'ltr' | 'rtl' = 'ltr'
	let unregister: (() => void) | undefined
	let branch: MenuBranch
	let submenu: PopupView<HTMLElement, HTMLDivElement>

	submenu = popup<HTMLElement, HTMLDivElement>(this, {
		prefix: 'menu-sub',
		profile: 'submenu',
		initialOpen: Boolean(open ?? defaultOpen),
		onOpenChange: (next, event) => onOpenChange?.(next, event),
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
			if (!opened) {
				menuItems.clearHighlight(submenu.content)
				children.close()
			}
		},
	})

	const setOpen = (next: boolean, event?: Event, focus = false) => {
		if (next !== submenu.open) {
			if (next) parentCluster?.close(event, branch)
			else children.close(event)
			submenu.setOpen(next, event)
		}
		if (next && focus) submenu.focusAfterReveal(() => focusEdge(submenu.content, 'first'))
	}

	branch = {
		close: event => setOpen(false, event),
		content: () => submenu.content,
		prune: (target, event) => children.prune(target, event),
		trigger: () => submenu.trigger,
	}
	unregister = parentCluster?.register(branch)

	const close = (event?: Event) => {
		children.close(event)
		submenu.close(event, submenu.trigger)
	}

	this.signal.addEventListener('abort', () => unregister?.())

	listen(this, 'keydown', (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		const target = event.target as HTMLElement | null
		if (!target?.closest('[data-menu-sub-trigger="true"],[data-menu-sub-content="true"]')) return
		// The inline-end arrow opens, the inline-start arrow closes.
		const enter = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
		const leave = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
		if (event.key === enter && target.matches('[data-menu-sub-trigger="true"]')) {
			event.preventDefault()
			setOpen(true, event, true)
		} else if (event.key === leave) {
			// While closed the key belongs to an enclosing submenu or menubar.
			if (!submenu.open) return
			event.preventDefault()
			close(event)
		}
	})

	for (const args of this) {
		menu = MenuContext()
		dir = DirectionContext()
		onOpenChange = args.onOpenChange
		const parentOpen = parent?.open() ?? menu?.open ?? true
		if (!parentOpen) {
			children.close()
			submenu.init(false)
		}
		const wasOpen = submenu.open
		const opened = submenu.sync(parentOpen ? (args.open != null ? Boolean(args.open) : null) : false)
		if (wasOpen && !opened) children.close()

		SubContext({
			adoptTriggerId: submenu.adoptTriggerId,
			branch,
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
const MenuSub: Stateless<MenuSubArgs> = ({ 'data-slot': slot = 'menu-sub', ...args }) => (
	<MenuSubRoot {...rootAttrs(args, ['defaultOpen', 'onOpenChange', 'open'])} attr:data-slot={slot} />
)

/** Trigger item that opens a nested menu. */
const MenuSubTrigger: Stateless<MenuSubTriggerArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'menu-sub-trigger',
	disabled,
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
			<span aria-hidden="true" data-slot="menu-sub-trigger-icon" />
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
