import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, id, listen, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { bar } from './bar'
import { contentAttrs, popup, type PopupView } from './popup'
import type { ReservedPositionArg } from './position'
import type { FixedArgs, OmitArg, PopupPosition } from './utils'
import { text, triggerAttrs } from './utils'
export type { PopupPlacement, PopupPosition } from './utils'

/** Stable identifier for an open navigation-menu item. */
export type NavigationMenuValue = string

/** Props for the navigation-menu root and its controlled state. */
export type NavigationMenuArgs = WithChildren<OmitArg<IntrinsicElements['nav'], 'onchange' | ReservedPositionArg> & PopupPosition & {
	/** Controlled open item value. Empty string closes every content panel. */
	value?: NavigationMenuValue
	/** Initial open item value for uncontrolled usage. */
	defaultValue?: NavigationMenuValue
	/** Hover-intent delay before a panel opens, in milliseconds. */
	openDelay?: number
	/** Hover-intent delay before a panel closes after the pointer leaves, in milliseconds. */
	closeDelay?: number
	/** Called whenever the open item value changes. */
	onValueChange?: (value: NavigationMenuValue, event?: Event) => void
	/** Additional CSS classes. */
	class?: string
}> & FixedArgs<'onchange' | ReservedPositionArg>

/** Props for the list containing navigation-menu items. */
export type NavigationMenuListArgs = WithChildren<IntrinsicElements['ul'] & {
	/** Additional CSS classes. */
	class?: string
}>

/** Props for a navigation-menu item and its stable value. */
export type NavigationMenuItemArgs = WithChildren<OmitArg<IntrinsicElements['li'], 'gap' | 'placement' | ReservedPositionArg> & {
	/** Stable value used by controlled NavigationMenu state. */
	value?: NavigationMenuValue
	/** Disable this item and its trigger. */
	disabled?: boolean
	/** Additional CSS classes. */
	class?: string
}> & FixedArgs<'gap' | 'placement' | ReservedPositionArg>

/** Props for a button that opens a navigation-menu panel. */
export type NavigationMenuTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	/** Plain-text label used for keyboard typeahead. */
	textValue?: string
	/** Additional CSS classes. */
	class?: string
}>

/** Props for a floating navigation-menu panel. */
export type NavigationMenuContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'aria-labelledby' | 'hidden' | 'id' | 'popover' | 'tabindex' | 'tabIndex' | ReservedPositionArg> & {
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS declarations composed with live positioning styles. */
	style?: string
}> & FixedArgs<'aria-labelledby' | 'gap' | 'hidden' | 'id' | 'placement' | 'popover' | 'tabindex' | 'tabIndex' | ReservedPositionArg>

/** Props for an anchor or button rendered inside navigation-menu content. */
export type NavigationMenuLinkArgs = WithChildren<(IntrinsicElements['a'] & IntrinsicElements['button']) & {
	/** Render as a native anchor or button. */
	as?: 'a' | 'button'
	/** Mark the link as active. */
	active?: boolean
	/** Additional CSS classes. */
	class?: string
}>

type RootContextValue = {
	close: (event?: Event) => void
	closeDelay: number
	follow: (value: string, event?: Event) => void
	gap: PopupPosition['gap']
	open: (value: string, event?: Event) => void
	openDelay: number
	placement: PopupPosition['placement']
	/** One-shot: true when a keyboard open requested focus into this value's panel. */
	takeFocus: (value: string) => boolean
	value: string
}

type ItemContextValue = {
	adoptTriggerId: PopupView['adoptTriggerId']
	clickTrigger: (event: Event) => void
	close: (event?: Event) => void
	contentId: string
	contentStyle: PopupView['contentStyle']
	disabled: boolean
	open: boolean
	registerContentHover: (hovering: boolean, event: Event) => void
	registerTriggerFocus: (event: FocusEvent) => void
	registerTriggerHover: (hovering: boolean, event: Event) => void
	setContent: (element: HTMLDivElement | null) => void
	setTrigger: (element: HTMLButtonElement | null) => void
	triggerId: string
	value: string
}

const RootContext = context<RootContextValue | null>(null)
const ItemContext = context<ItemContextValue | null>(null)

const triggers = (root: HTMLElement) =>
	Array.from(root.querySelectorAll<HTMLButtonElement>('[data-navigation-menu-trigger="true"]'))
		.filter(trigger =>
			!trigger.disabled
			&& trigger.offsetParent !== null
			&& trigger.closest('[data-slot="navigation-menu"]') === root)

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const NavigationMenuRoot: Stateful<NavigationMenuArgs, 'nav'> = function* ({ defaultValue, value }) {
	let closeDelay = 300
	const closeFocus = { current: null as HTMLElement | null }
	let onValueChange: NavigationMenuArgs['onValueChange']
	let openDelay = 200
	let pendingFocus = ''

	const state = bar(this, {
		triggers: () => triggers(this),
		initialValue: String(value ?? defaultValue ?? ''),
		onValueChange: (next, event) => onValueChange?.(next, event),
	})

	const openTrigger = () =>
		triggers(this).find(trigger => trigger.dataset.value === state.value)

	const focusPanel = (trigger: HTMLElement) => {
		const contentId = trigger.getAttribute('aria-controls')
		const panel = contentId ? document.getElementById(contentId) : null
		panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
	}

	const close = (event?: Event, focus?: HTMLElement | null) => {
		pendingFocus = ''
		closeFocus.current = focus ?? null
		state.close(event)
	}

	listen(this, 'keydown', (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		const target = event.target as HTMLElement | null
		if (target?.closest('[data-slot="navigation-menu"]') !== this) return
		const trigger = target?.closest<HTMLButtonElement>('[data-navigation-menu-trigger="true"]')

		if (!trigger) {
			// Escape inside an open panel returns focus to its trigger and
			// closes; while closed the key passes through untouched (a hosting
			// dialog keeps its Escape).
			if (event.key === 'Escape' && state.value) {
				event.preventDefault()
				close(event, openTrigger())
			}
			return
		}

		if (state.handle(event)) return

		if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			const next = trigger.dataset.value ?? ''
			if (state.value === next) {
				// Already open: ArrowDown enters the panel, Enter/Space toggle closed.
				if (event.key === 'ArrowDown') focusPanel(trigger)
				else close(event)
			} else {
				pendingFocus = next
				state.setValue(next, event)
			}
		}
	})

	// Focus-out close: panel links stay tabbable, so Tab walks through them;
	// tabbing past the last one (or focus leaving the nav and its panels
	// entirely) closes the open panel. Focus landing on another trigger runs
	// the follow policy instead of closing.
	listen(this, 'focusout', (event: FocusEvent) => {
		if (!state.value) return
		const next = event.relatedTarget as Node | null
		if (next && this.contains(next)) return
		// Window blur (alt-tab) fires focusout with a null relatedTarget while
		// the focused element stays inside the nav: not a focus departure.
		if (!next && this.contains(document.activeElement)) return
		close(event)
	})

	for (const args of this) {
		closeDelay = Math.max(0, Number(args.closeDelay ?? 300))
		onValueChange = args.onValueChange
		openDelay = Math.max(0, Number(args.openDelay ?? 200))
		state.sync(args.value != null ? String(args.value ?? '') : undefined)
		if (pendingFocus && pendingFocus !== state.value) pendingFocus = ''
		if (closeFocus.current) {
			const target = closeFocus.current
			closeFocus.current = null
			if (!state.value) queueMicrotask(() => {
				if (!state.value) target.focus()
			})
		}

		RootContext({
			close,
			closeDelay,
			// Pointer-driven opens clear any stale keyboard focus request.
			follow: (next, event) => {
				pendingFocus = ''
				state.follow(next, event)
			},
			gap: args.gap,
			open: (next, event) => {
				// An engine echo for the same keyboard-requested value must not
				// invalidate its post-geometry focus token. Pointer opens have no
				// matching token and clear any stale request.
				if (pendingFocus !== next) pendingFocus = ''
				state.setValue(next, event)
			},
			openDelay,
			placement: args.placement,
			takeFocus: value => {
				if (!value || pendingFocus !== value) return false
				pendingFocus = ''
				return true
			},
			value: state.value,
		})

		yield <>{args.children}</>
	}
}

NavigationMenuRoot.is = 'nav'

/** Unstyled root landmark and state provider for a navigation menu. */
const NavigationMenu: Stateless<NavigationMenuArgs> = ({
	children,
	class: classes,
	closeDelay,
	defaultValue,
	gap,
	onValueChange,
	openDelay,
	placement,
	value,
	...attrs
}) => (
	<NavigationMenuRoot
		{...rootAttrs(attrs)}
		closeDelay={closeDelay}
		defaultValue={defaultValue}
		gap={gap}
		onValueChange={onValueChange}
		openDelay={openDelay}
		placement={placement}
		value={value}
		attr:class={classes}
		attr:data-slot="navigation-menu"
	>
		{children}
	</NavigationMenuRoot>
)

/** Unstyled horizontal list of navigation menu items. */
const NavigationMenuList: Stateless<NavigationMenuListArgs> = ({ children, class: classes, ...attrs }) => (
	<ul {...attrs} class={classes} data-slot="navigation-menu-list">
		{children}
	</ul>
)

const NavigationMenuItemRoot: Stateful<NavigationMenuItemArgs, 'li'> = function* ({ value }) {
	const fallback = value ?? id('navigation-menu-item')
	let disabled = false
	let itemValue = String(fallback)
	let root: RootContextValue | null = null
	let item: PopupView<HTMLButtonElement, HTMLDivElement>

	item = popup<HTMLButtonElement, HTMLDivElement>(this, {
		prefix: 'navigation-menu',
		profile: 'navigation',
		initialOpen: false,
		disabled: () => disabled,
		hover: {
			openDelay: () => root?.openDelay ?? 200,
			closeDelay: () => root?.closeDelay ?? 300,
		},
		onOpenChange: (next, event) => {
			if (next) root?.open(itemValue, event)
			else if (root?.value === itemValue) root.close(event)
		},
		reference: view => view.trigger,
		source: view => view.trigger,
		referenceHidden: 'close',
		dismiss: {
			escape: false,
			outside: true,
			inside: view => [view.trigger, view.content],
			onDismiss: event => closeItem(event),
		},
		onPosition: () => {
			// Keyboard focus is committed only after the current trigger/content
			// tuple has real geometry and the panel is visible.
			if (root?.takeFocus(itemValue)) item.content?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
		},
		onSync: opened => {
			if (!opened) cause = ''
		},
	})

	// Open cause decides what a trigger press does to an open panel: only a
	// hover-opened panel holds through the press that follows (the
	// hover→click race, the recorded deviation); a press- or keyboard-opened
	// panel closes.
	let cause: 'hover' | 'press' | '' = ''

	const registerTriggerHover = (hovering: boolean, event: Event) => {
		if (hovering) {
			if (!item.open) cause = 'hover'
			item.hold('trigger', event)
			// Open-follows-hover: an already-open bar moves between panels
			// without re-running the open delay.
			if (!disabled) root?.follow(itemValue, event)
		} else {
			if (!item.open && cause === 'hover') cause = ''
			item.release('trigger', event)
		}
	}

	const registerContentHover = (hovering: boolean, event: Event) =>
		hovering ? item.hold('content', event) : item.release('content', event)

	const registerTriggerFocus = (event: FocusEvent) => {
		if (!disabled) root?.follow(itemValue, event)
	}

	const openItem = (event?: Event) => {
		if (disabled) return
		cause = 'press'
		item.cancelHover()
		if (root) root.open(itemValue, event)
		else item.setOpen(true, event)
	}

	const closeItem = (event?: Event) =>
		root ? root.close(event) : item.close(event)

	const clickTrigger = (event: Event) => {
		if (disabled) return
		if (!item.open) {
			openItem(event)
		} else if (cause === 'hover') {
			cause = 'press'
			item.cancelHover()
		} else {
			closeItem(event)
		}
	}

	for (const args of this) {
		root = RootContext()
		itemValue = String(args.value ?? fallback)
		disabled = Boolean(args.disabled)
		// Without a NavigationMenu ancestor the item degrades to an
		// uncontrolled hover panel instead of a permanently-closed one.
		const opened = item.sync(root ? root.value === itemValue : null, {
			placement: root?.placement,
			gap: root?.gap,
		})
		if (!opened) cause = ''

		ItemContext({
			adoptTriggerId: item.adoptTriggerId,
			clickTrigger,
			close: closeItem,
			contentId: item.contentId,
			contentStyle: item.contentStyle,
			disabled,
			open: opened,
			registerContentHover,
			registerTriggerFocus,
			registerTriggerHover,
			setContent: item.setContent,
			setTrigger: item.setTrigger,
			triggerId: item.triggerId,
			value: itemValue,
		})

		yield <>{args.children}</>
	}
}

NavigationMenuItemRoot.is = 'li'

/** Unstyled top-level item inside a NavigationMenuList. */
const NavigationMenuItem: Stateless<NavigationMenuItemArgs> = ({
	children,
	class: classes,
	disabled,
	value,
	...attrs
}) => (
	<NavigationMenuItemRoot
		{...rootAttrs(attrs)}
		disabled={disabled}
		value={value}
		attr:class={classes}
		attr:data-disabled={disabled ? 'true' : undefined}
		attr:data-slot="navigation-menu-item"
	>
		{children}
	</NavigationMenuItemRoot>
)

/** Unstyled button that opens an item content panel. */
const NavigationMenuTrigger: Stateless<NavigationMenuTriggerArgs> = ({
	children,
	class: classes,
	disabled,
	id: idArg,
	ref,
	textValue,
	type = 'button',
	'set:onclick': onClick,
	'set:onfocus': onFocus,
	'set:onmouseenter': onMouseEnter,
	'set:onmouseleave': onMouseLeave,
	...attrs
}) => {
	const item = ItemContext()
	const disabledFlag = Boolean(disabled ?? item?.disabled)
	const label = textValue ?? text(children)
	const adoptedId = item?.adoptTriggerId(idArg)

	return (
		<button
			{...attrs}
			{...triggerAttrs({
				controls: item?.contentId,
				expanded: Boolean(item?.open),
				id: adoptedId ?? idArg,
				open: Boolean(item?.open),
				ref,
				setTrigger: item?.setTrigger,
				triggerId: item?.triggerId,
			})}
			class={classes}
			data-label={label}
			data-navigation-menu-trigger="true"
			data-slot="navigation-menu-trigger"
			data-value={item?.value}
			disabled={disabledFlag}
			type={type}
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented || disabledFlag) return
				// Clicking a closed trigger opens immediately; a hover-opened
				// panel holds through its first click (the hover→click race);
				// any other open panel closes.
				item?.clickTrigger(event)
			}}
			set:onfocus={(event: FocusEvent) => {
				callHandler(onFocus, event)
				if (event.defaultPrevented || disabledFlag) return
				item?.registerTriggerFocus(event)
			}}
			set:onmouseenter={(event: MouseEvent) => {
				callHandler(onMouseEnter, event)
				if (event.defaultPrevented || disabledFlag) return
				item?.registerTriggerHover(true, event)
			}}
			set:onmouseleave={(event: MouseEvent) => {
				callHandler(onMouseLeave, event)
				item?.registerTriggerHover(false, event)
			}}
		>
			{children}
		</button>
	)
}

/** Unstyled popover panel for a NavigationMenuItem. */
const NavigationMenuContent: Stateless<NavigationMenuContentArgs> = ({
	children,
	class: classes,
	ref,
	style,
	'set:onmouseenter': onMouseEnter,
	'set:onmouseleave': onMouseLeave,
	...attrs
}) => {
	const item = ItemContext()

	return (
		<div
			{...attrs}
			{...contentAttrs({
				id: item?.contentId,
				open: Boolean(item?.open),
				ref,
				setContent: item?.setContent,
				style: item?.contentStyle(style),
				tabindex: '-1',
			})}
			aria-labelledby={item?.triggerId}
			class={classes}
			data-slot="navigation-menu-content"
			set:onmouseenter={(event: MouseEvent) => {
				callHandler(onMouseEnter, event)
				item?.registerContentHover(true, event)
			}}
			set:onmouseleave={(event: MouseEvent) => {
				callHandler(onMouseLeave, event)
				item?.registerContentHover(false, event)
			}}
		>
			{children}
		</div>
	)
}

/** Unstyled link for use inside or directly within a navigation menu item. */
const NavigationMenuLink: Stateless<NavigationMenuLinkArgs> = ({
	active,
	as = 'a',
	children,
	class: classes,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const item = ItemContext()
	const state = active ? 'true' : undefined
	const current = active ? 'page' : undefined
	const click = (event: Event) => {
		callHandler(onClick, event)
		if (!event.defaultPrevented) item?.close(event)
	}

	if (as === 'button') {
		return (
			<button
				{...attrs}
				class={classes}
				data-active={state}
				data-slot="navigation-menu-link"
				type={type}
				set:onclick={click}
			>
				{children}
			</button>
		)
	}

	return (
		<a
			{...attrs}
			aria-current={current}
			class={classes}
			data-active={state}
			data-slot="navigation-menu-link"
			set:onclick={click}
		>
			{children}
		</a>
	)
}

// NavigationMenu uses per-item anchored panels. Its themed surface lives on
// NavigationMenuContent; there is no shared Viewport or Indicator contract.

export {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
}
