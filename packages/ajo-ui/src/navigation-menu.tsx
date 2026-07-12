import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, dom, id, listen, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { bar } from './bar'
import { openPopover, text } from './utils'
import { floating, popupStyle, type FloatingView } from './floating'

export type NavigationMenuValue = string

export type NavigationMenuArgs = WithChildren<IntrinsicElements['nav'] & {
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
}>

export type NavigationMenuListArgs = WithChildren<IntrinsicElements['ul'] & {
	/** Additional CSS classes. */
	class?: string
}>

export type NavigationMenuItemArgs = WithChildren<IntrinsicElements['li'] & {
	/** Stable value used by controlled NavigationMenu state. */
	value?: NavigationMenuValue
	/** Disable this item and its trigger. */
	disabled?: boolean
	/** Additional CSS classes. */
	class?: string
}>

export type NavigationMenuTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	/** Plain-text label used for keyboard typeahead. */
	textValue?: string
	/** Additional CSS classes. */
	class?: string
}>

export type NavigationMenuContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Gap between trigger and content in pixels. */
	sideOffset?: number
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}>

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
	open: (value: string, event?: Event) => void
	openDelay: number
	/** One-shot: true when a keyboard open requested focus into this value's panel. */
	takeFocus: (value: string) => boolean
	value: string
}

type ItemContextValue = {
	clickTrigger: (event: Event) => void
	close: (event?: Event) => void
	contentId: string
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
		.filter(trigger => !trigger.disabled && trigger.offsetParent !== null)

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const NavigationMenuRoot: Stateful<NavigationMenuArgs, 'nav'> = function* ({ defaultValue, value }) {
	let closeDelay = 300
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

	listen(this, 'keydown', (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		const target = event.target as HTMLElement | null
		const trigger = target?.closest<HTMLButtonElement>('[data-navigation-menu-trigger="true"]')

		if (!trigger) {
			// Escape inside an open panel returns focus to its trigger and
			// closes; while closed the key passes through untouched (a hosting
			// dialog keeps its Escape).
			if (event.key === 'Escape' && state.value) {
				event.preventDefault()
				openTrigger()?.focus()
				state.close(event)
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
				else state.close(event)
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
		state.close(event)
	})

	for (const args of this) {
		closeDelay = Math.max(0, Number(args.closeDelay ?? 300))
		onValueChange = args.onValueChange
		openDelay = Math.max(0, Number(args.openDelay ?? 200))
		state.sync(args.value != null ? String(args.value ?? '') : undefined)

		RootContext({
			close: state.close,
			closeDelay,
			// Pointer-driven opens clear any stale keyboard focus request.
			follow: (next, event) => {
				pendingFocus = ''
				state.follow(next, event)
			},
			open: (next, event) => {
				pendingFocus = ''
				state.setValue(next, event)
			},
			openDelay,
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
	onValueChange,
	openDelay,
	value,
	...attrs
}) => (
	<NavigationMenuRoot
		{...rootAttrs(attrs)}
		closeDelay={closeDelay}
		defaultValue={defaultValue}
		onValueChange={onValueChange}
		openDelay={openDelay}
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
	let item: FloatingView<HTMLButtonElement, HTMLDivElement>

	item = floating<HTMLButtonElement, HTMLDivElement>(this, {
		prefix: 'navigation-menu',
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
		onSync: opened => {
			// Keyboard open moves focus to the panel's first focusable element.
			if (opened && root?.takeFocus(itemValue)) {
				item.content?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
			}
		},
		placement: {
			side: () => 'bottom',
			align: () => 'center',
			sideOffset: () => Number(item.content?.dataset.sideOffset ?? 8),
			padding: () => 8,
			constrain: () => 'height',
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

	// What a trigger press should do, resolved from live state: a closed
	// panel opens, a hover-opened panel holds (the hover→click race), any
	// other open panel closes.
	const resolve = () => item.open ? (cause === 'hover' ? 'hold' : 'close') : 'open'

	// Trigger-press protocol: Chromium light-dismisses on the source press
	// regardless of showPopover({source}), and the native close, the click,
	// and the toggle echo arrive in browser-dependent order — so the action
	// is recorded at press start (while engine state is still accurate) and
	// executed by whichever event runs. pressedAt scopes it to presses that
	// landed on THIS item's own trigger; the document captured listeners
	// clear it for any other press, so an outside-click light dismiss is
	// never undone.
	let pressAction: ReturnType<typeof resolve> = 'open'
	let pressedAt = 0
	const guarded = new WeakSet<HTMLDivElement>()

	if (dom(this)) {
		// Both press edges: the native light dismiss can commit on pointerup
		// (long press), which must still fall inside the recorded window.
		const press = (event: Event) => {
			const target = event.target as Node | null
			if (target && item.trigger?.contains(target)) {
				if (event.type === 'pointerdown') pressAction = resolve()
				pressedAt = Date.now()
			} else {
				pressedAt = 0
			}
		}
		document.addEventListener('pointerdown', press, { capture: true, signal: this.signal })
		document.addEventListener('pointerup', press, { capture: true, signal: this.signal })
	}

	const clickTrigger = (event: Event) => {
		if (disabled) return
		// Inside the press window the recorded action wins — the panel may
		// already be natively hidden with its toggle echo still pending, so
		// live open state cannot drive the decision. Keyboard/AT clicks
		// arrive without a pointer press and resolve live.
		const action = Date.now() - pressedAt <= 500 ? pressAction : resolve()
		if (action === 'open') openItem(event)
		else if (action === 'hold') cause = 'press'
		else closeItem(event)
	}

	const setContent = (element: HTMLDivElement | null) => {
		if (element && !guarded.has(element)) {
			guarded.add(element)
			// Registered before the engine's echo listener: a native close from
			// a holding trigger press is undone (re-shown before the engine
			// hears about it); any other close stands and the echo syncs it.
			element.addEventListener('toggle', event => {
				const state = (event as Event & { newState?: string }).newState
				if (state !== 'closed' || !item.open || Date.now() - pressedAt > 500) return
				if (pressAction !== 'hold') return
				event.stopImmediatePropagation()
				openPopover(element, item.trigger)
				item.place()
			}, { signal: this.signal })
		}
		item.setContent(element)
	}

	let wasOpen = false

	for (const args of this) {
		root = RootContext()
		itemValue = String(args.value ?? fallback)
		disabled = Boolean(args.disabled)
		// Without a NavigationMenu ancestor the item degrades to an
		// uncontrolled hover panel instead of a permanently-closed one.
		const opened = item.sync(root ? root.value === itemValue : null)
		if (wasOpen && !opened) cause = ''
		wasOpen = opened

		ItemContext({
			clickTrigger,
			close: closeItem,
			contentId: item.contentId,
			disabled,
			open: opened,
			registerContentHover,
			registerTriggerFocus,
			registerTriggerHover,
			setContent,
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
	const reference = (element: HTMLButtonElement | null) => {
		item?.setTrigger(element)
		callRef(ref, element)
	}

	return (
		<button
			{...attrs}
			aria-controls={item?.contentId}
			aria-expanded={item?.open ? 'true' : 'false'}
			class={classes}
			data-label={label}
			data-navigation-menu-trigger="true"
			data-slot="navigation-menu-trigger"
			data-state={item?.open ? 'open' : 'closed'}
			data-value={item?.value}
			disabled={disabledFlag}
			id={item?.triggerId}
			ref={reference}
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
	sideOffset = 8,
	style,
	'set:onmouseenter': onMouseEnter,
	'set:onmouseleave': onMouseLeave,
	...attrs
}) => {
	const item = ItemContext()
	const reference = (element: HTMLDivElement | null) => {
		item?.setContent(element)
		callRef(ref, element)
	}

	return (
		<div
			{...attrs}
			aria-labelledby={item?.triggerId}
			class={classes}
			data-side-offset={sideOffset}
			data-slot="navigation-menu-content"
			data-state={item?.open ? 'open' : 'closed'}
			id={item?.contentId}
			popover="auto"
			ref={reference}
			style={popupStyle(style)}
			tabindex="-1"
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

// The Radix-style morphing viewport (one shared panel surface that resizes
// under a sliding indicator) is a recorded extension point, not rebuilt here:
// per-item anchored panels are the complete design and the themed surface
// lives on NavigationMenuContent. See ai/menus.md.

export {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
}
