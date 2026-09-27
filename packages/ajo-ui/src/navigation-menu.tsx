import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, id, listen } from 'ajo-cloves'
import { context } from 'ajo/context'
import { bar } from './bar'
import { type Direction, DirectionContext } from './direction'
import { contentAttrs, popup, type PopupPosition, type PopupView, triggerAttrs } from './popup'
import { rootAttrs, text } from './shared'
import { part, type FixedArgs, type OmitArg } from './utils'
export type { PopupPlacement, PopupPosition } from './popup'

/** Stable identifier for an open navigation-menu item. */
export type NavigationMenuValue = string

/** Props for the navigation-menu root and its controlled state. */
export type NavigationMenuArgs = WithChildren<OmitArg<IntrinsicElements['nav'], 'dir' | 'onchange'> & PopupPosition & {
	/** Controlled open item value. Empty string closes every content panel. */
	value?: NavigationMenuValue
	/** Initial open item value for uncontrolled usage. */
	defaultValue?: NavigationMenuValue
	/** Hover-intent delay before a panel opens, in milliseconds. */
	openDelay?: number
	/** Hover-intent delay before a panel closes after the pointer leaves, in milliseconds. */
	closeDelay?: number
	/** Text direction for horizontal arrow-key navigation. Defaults to the nearest DirectionProvider. */
	dir?: Direction
	/** Called whenever the open item value changes. */
	onValueChange?: (value: NavigationMenuValue, event?: Event) => void
	/** Additional CSS classes. */
	class?: string
}> & FixedArgs<'onchange'>

/** Props for the list containing navigation-menu items. */
export type NavigationMenuListArgs = WithChildren<IntrinsicElements['ul'] & {
	/** Additional CSS classes. */
	class?: string
}>

/** Props for a navigation-menu item and its stable value. */
export type NavigationMenuItemArgs = WithChildren<OmitArg<IntrinsicElements['li'], 'gap' | 'placement'> & {
	/** Stable value used by controlled NavigationMenu state. */
	value?: NavigationMenuValue
	/** Disable this item and its trigger. */
	disabled?: boolean
	/** Additional CSS classes. */
	class?: string
}> & FixedArgs<'gap' | 'placement'>

/** Props for a button that opens a navigation-menu panel. */
export type NavigationMenuTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	/** Plain-text label used for keyboard typeahead. */
	textValue?: string
	/** Additional CSS classes. */
	class?: string
}>

/** Props for a floating navigation-menu panel. */
export type NavigationMenuContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'aria-labelledby' | 'hidden' | 'id' | 'popover' | 'tabindex' | 'tabIndex'> & {
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS declarations composed with live positioning styles. */
	style?: string
}> & FixedArgs<'aria-labelledby' | 'gap' | 'hidden' | 'id' | 'placement' | 'popover' | 'tabindex' | 'tabIndex'>

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
	/** The open item hands the root its Escape closer, which restores focus to its trigger. */
	claimEscape: (value: string, close: (event: Event) => void) => void
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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const NavigationMenuRoot: Stateful<NavigationMenuArgs, 'nav'> = function* ({ defaultValue, value }) {
	let closeDelay = 300
	let dir: Direction = 'ltr'
	let onValueChange: NavigationMenuArgs['onValueChange']
	let openDelay = 200

	const state = bar(this, {
		selector: '[data-navigation-menu-trigger="true"]',
		dir: () => dir,
		initialValue: String(value ?? defaultValue ?? ''),
		onValueChange: (next, event) => onValueChange?.(next, event),
	})

	// Escape anywhere in the nav but on a trigger (a panel link, a top-level
	// link) closes the open panel through its item, which returns focus to
	// the trigger; while closed the key passes through (a hosting dialog keeps
	// its Escape).
	let escape: { value: string, close: (event: Event) => void } | null = null

	const focusPanel = (trigger: HTMLElement) => {
		const contentId = trigger.getAttribute('aria-controls')
		const panel = contentId ? this.ownerDocument.getElementById(contentId) : null
		panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
	}

	listen(this, 'keydown', (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		const target = event.target as HTMLElement | null
		if (target?.closest('[data-slot="navigation-menu"]') !== this) return
		const trigger = target?.closest<HTMLButtonElement>('[data-navigation-menu-trigger="true"]')

		if (!trigger) {
			if (event.key !== 'Escape' || !state.value) return
			event.preventDefault()
			if (escape?.value === state.value) escape.close(event)
			else state.close(event)
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
				state.requestFocus(next)
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
		if (!next && this.contains(this.ownerDocument.activeElement)) return
		state.close(event)
	})

	for (const args of this) {
		closeDelay = args.closeDelay ?? 300
		dir = args.dir ?? 'ltr'
		onValueChange = args.onValueChange
		openDelay = args.openDelay ?? 200
		state.sync(args.value != null ? String(args.value ?? '') : undefined)

		RootContext({
			claimEscape: (value, close) => {
				escape = { value, close }
			},
			close: state.close,
			closeDelay,
			follow: state.follow,
			gap: args.gap,
			open: state.setValue,
			openDelay,
			placement: args.placement,
			takeFocus: state.takeFocus,
			value: state.value,
		})

		yield <>{args.children}</>
	}
}

NavigationMenuRoot.is = 'nav'

/** Unstyled root landmark and state provider for a navigation menu. */
const NavigationMenu: Stateless<NavigationMenuArgs> = ({ dir, ...args }) => (
	<NavigationMenuRoot
		{...rootAttrs(args, ['closeDelay', 'defaultValue', 'gap', 'onValueChange', 'openDelay', 'placement', 'value'])}
		dir={dir ?? DirectionContext()}
		attr:data-slot="navigation-menu"
		attr:dir={dir}
	/>
)

/** Unstyled horizontal list of navigation menu items. */
const NavigationMenuList = part<NavigationMenuListArgs>('ul', 'navigation-menu-list')

const NavigationMenuItemRoot: Stateful<NavigationMenuItemArgs, 'li'> = function* ({ value }) {
	const fallback = value ?? id('navigation-menu-item')
	let disabled = false
	let itemValue = String(fallback)
	let root = RootContext()!
	let item: PopupView<HTMLButtonElement, HTMLDivElement>

	item = popup<HTMLButtonElement, HTMLDivElement>(this, {
		prefix: 'navigation-menu',
		profile: 'navigation',
		initialOpen: false,
		disabled: () => disabled,
		hover: {
			openDelay: () => root.openDelay,
			closeDelay: () => root.closeDelay,
		},
		onOpenChange: (next, event) => {
			if (next) root.open(itemValue, event)
			else if (root.value === itemValue) root.close(event)
		},
		referenceHidden: 'close',
		dismiss: {
			escape: false,
			outside: true,
			inside: view => [view.trigger, view.content],
			onDismiss: event => root.close(event),
		},
		onSync: opened => {
			if (!opened) cause = ''
		},
	})

	// Open cause decides what a trigger press does to an open panel: only a
	// hover-opened panel holds through the press that follows, so hovering
	// then clicking a trigger keeps its panel open; a press- or
	// keyboard-opened panel closes.
	let cause: 'hover' | 'press' | '' = ''

	const registerTriggerHover = (hovering: boolean, event: Event) => {
		if (hovering) {
			if (!item.open) cause = 'hover'
			item.hold('trigger', event)
			// Open-follows-hover: an already-open bar moves between panels
			// without re-running the open delay.
			if (!disabled) root.follow(itemValue, event)
		} else {
			if (!item.open && cause === 'hover') cause = ''
			item.release('trigger', event)
		}
	}

	const registerContentHover = (hovering: boolean, event: Event) =>
		hovering ? item.hold('content', event) : item.release('content', event)

	const registerTriggerFocus = (event: FocusEvent) => {
		if (!disabled) root.follow(itemValue, event)
	}

	const escape = (event: Event) => item.close(event, item.trigger)

	const clickTrigger = (event: Event) => {
		if (disabled) return
		if (!item.open) {
			cause = 'press'
			item.cancelHover()
			root.open(itemValue, event)
		} else if (cause === 'hover') {
			cause = 'press'
			item.cancelHover()
		} else {
			root.close(event)
		}
	}

	for (const args of this) {
		root = RootContext()!
		itemValue = String(args.value ?? fallback)
		disabled = Boolean(args.disabled)
		const wasOpen = item.open
		const opened = item.sync(root.value === itemValue, {
			placement: root.placement,
			gap: root.gap,
		})
		if (!opened) cause = ''
		else root.claimEscape(itemValue, escape)
		// Keyboard entry is read once the panel is revealed, so a row move
		// before this panel commits can still carry it on.
		if (!wasOpen && opened) item.focusAfterReveal(() => {
			if (root.takeFocus(itemValue)) item.content?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
		})

		ItemContext({
			adoptTriggerId: item.adoptTriggerId,
			clickTrigger,
			close: root.close,
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
const NavigationMenuItem: Stateless<NavigationMenuItemArgs> = args => (
	<NavigationMenuItemRoot
		{...rootAttrs(args, ['disabled', 'value'])}
		attr:data-disabled={args.disabled ? 'true' : undefined}
		attr:data-slot="navigation-menu-item"
	/>
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
				// panel holds through its first click; any other open panel closes.
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

// Each NavigationMenuContent is its own anchored panel and themed surface.

export {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
}
