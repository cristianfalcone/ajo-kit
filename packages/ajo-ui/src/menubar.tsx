import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, id, listen } from 'ajo-cloves'
import { context } from 'ajo/context'
import { bar } from './bar'
import type { Direction } from './direction'
import { MenuTrigger, type MenuTriggerArgs } from './menu'
import { MenuRoot } from './menu-cluster'
import type { PopupPosition } from './popup'
import { direction, rootAttrs, text } from './shared'
import type { FixedArgs, OmitArg } from './utils'
export type { PopupPlacement, PopupPosition } from './popup'

/** Arguments for a horizontal Menubar and its controlled open menu. */
export type MenubarArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'dir' | 'onchange'> & PopupPosition & {
	/** Controlled open top-level menu value. */
	value?: string
	/** Initial open top-level menu value for uncontrolled usage. */
	defaultValue?: string
	/** Disable every menubar trigger and menu item. */
	disabled?: boolean
	/** Wrap arrow-key navigation at the ends. */
	loop?: boolean
	/** Text direction written on the root; without it the root follows its inherited `dir` (a DirectionProvider's or the document's). */
	dir?: Direction
	/** Called whenever the open top-level menu changes. Empty string means closed. */
	onValueChange?: (value: string, event?: Event) => void
	/** Additional UnoCSS classes. */
	class?: string
}> & FixedArgs<'onchange'>

/** Arguments for one value-bearing top-level menu in a Menubar. */
export type MenubarMenuArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'gap' | 'placement'> & {
	/** Top-level menu value used by controlled Menubar state. */
	value?: string
	/** Disable this top-level menu. */
	disabled?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}> & FixedArgs<'gap' | 'placement'>

/** Arguments for the trigger of a top-level Menubar menu. */
export type MenubarTriggerArgs = WithChildren<MenuTriggerArgs & {
	/** Plain-text label used for menubar typeahead. */
	textValue?: string
}>

type MenubarContextValue = {
	close: (event?: Event) => void
	disabled: boolean
	focus: (value: string, event?: Event) => void
	follow: (value: string, event?: Event) => void
	gap: PopupPosition['gap']
	isTabbable: (value: string) => boolean
	open: (value: string, event?: Event) => void
	placement: PopupPosition['placement']
	register: (value: string, element: HTMLButtonElement | null) => void
	takeFocus: (value: string) => boolean
	value: string
}

type MenubarMenuContextValue = {
	disabled: boolean
	value: string
}

const MenubarContext = context<MenubarContextValue | null>(null)
const MenubarMenuContext = context<MenubarMenuContextValue | null>(null)

const MenubarRoot: Stateful<MenubarArgs> = function* ({ defaultValue, value }) {
	const triggers = new Map<string, HTMLButtonElement>()
	let disabled = false
	let loop = true
	let onValueChange: MenubarArgs['onValueChange']
	let queued = false

	const state = bar(this, {
		selector: '[data-menubar-trigger="true"]',
		dir: () => direction(this),
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
		if (target?.closest('[data-slot="menubar"]') !== this) return

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

		// The inline arrows from inside an open menu move to the adjacent
		// top-level menu with its first item focused (APG). Submenu-owned
		// arrows stay with the submenu machinery: the inline-end arrow enters
		// a submenu from its trigger, the inline-start arrow closes one.
		const forward = direction(this) === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
		if (state.value && (event.key === 'ArrowLeft' || event.key === 'ArrowRight') && target?.closest('[data-menu-content="true"]')) {
			if (event.key === forward && target.closest('[data-menu-sub-trigger="true"]')) return
			if (target.closest('[data-menu-sub-content="true"]')) return
			const row = state.triggers()
			const index = row.findIndex(trigger => trigger.dataset.value === state.value)
			if (index < 0) return
			const step = event.key === forward ? 1 : -1
			const next = row[index + step] ?? (loop ? row[(index + step + row.length) % row.length] : undefined)
			if (!next || next === row[index]) return
			event.preventDefault()
			state.requestFocus(next.dataset.value ?? '')
			state.follow(next.dataset.value ?? '', event)
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
			gap: args.gap,
			isTabbable: state.isTabbable,
			open: state.setValue,
			placement: args.placement,
			register,
			takeFocus: state.takeFocus,
			value: state.value,
		})

		yield <>{args.children}</>
	}
}

/** Persistent horizontal menu bar. */
const Menubar: Stateless<MenubarArgs> = args => (
	<MenubarRoot
		{...rootAttrs(args, ['defaultValue', 'disabled', 'gap', 'loop', 'onValueChange', 'placement', 'value'])}
		attr:aria-orientation="horizontal"
		attr:data-slot="menubar"
		attr:role="menubar"
	/>
)

const MenubarMenuRoot: Stateful<MenubarMenuArgs> = function* ({ value }) {
	const fallback = id('menubar-menu')
	let bar = MenubarContext()!
	let itemValue = String(value ?? fallback)
	const ackFocus = () => bar.takeFocus(itemValue)

	for (const args of this) {
		bar = MenubarContext()!
		itemValue = String(args.value ?? value ?? fallback)
		const disabled = Boolean(args.disabled ?? bar.disabled)

		MenubarMenuContext({ disabled, value: itemValue })

		yield (
			<MenuRoot
				ackFocus={ackFocus}
				disabled={disabled}
				gap={bar.gap}
				onOpenChange={(open, event) => open ? bar.open(itemValue, event) : bar.close(event)}
				open={bar.value === itemValue}
				placement={bar.placement}
				attr:data-slot="menu"
			>
				{args.children}
			</MenuRoot>
		)
	}
}


/** Top-level Menubar menu. */
const MenubarMenu: Stateless<MenubarMenuArgs> = args => (
	<MenubarMenuRoot {...rootAttrs(args, ['disabled', 'value'])} attr:data-slot="menubar-menu" />
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
	const bar = MenubarContext()!
	const { value: itemValue, disabled: menuDisabled } = MenubarMenuContext()!
	const disabledFlag = Boolean(disabled ?? menuDisabled)
	const reference = (element: HTMLButtonElement | null) => {
		bar.register(itemValue, element)
		callRef(ref, element)
	}

	return (
		<MenuTrigger
			{...attrs}
			class={classes}
			data-label={textValue ?? text(children)}
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
				bar.focus(itemValue, event)
			}}
			set:onmouseenter={(event: MouseEvent) => {
				callHandler(onMouseEnter, event)
				if (event.defaultPrevented || disabledFlag) return
				bar.follow(itemValue, event)
			}}
			tabindex={bar.isTabbable(itemValue) ? 0 : -1}
		>
			{children}
		</MenuTrigger>
	)
}

export { Menubar, MenubarMenu, MenubarTrigger }
