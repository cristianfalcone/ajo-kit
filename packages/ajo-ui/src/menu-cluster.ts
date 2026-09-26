import type { Stateful } from 'ajo'
import { dom, frame, listen, roving, typeahead } from 'ajo-cloves'
import { context } from 'ajo/context'
import { collection } from './collection'
import type { MenuArgs } from './menu'
import { popup, type PopupView } from './popup'
import type { PositionReference } from './position'

type MenuFocus = 'content' | 'first' | 'last'

/** Menu state shared by the Menu parts and the ContextMenu trigger. */
export type MenuContextValue = {
	adoptTriggerId: PopupView['adoptTriggerId']
	close: (event?: Event) => void
	contentId: string
	contentStyle: PopupView['contentStyle']
	disabled: boolean
	dismiss: (event: Event) => void
	/** ContextMenu only: opens at a viewport point for one invoking source. */
	invoke?: (x: number, y: number, event: Event, source: HTMLElement, focus: 'content' | 'first') => void
	open: boolean
	setContent: (element: HTMLDivElement | null) => void
	setOpen: (open: boolean, event?: Event, focus?: 'first' | 'last') => void
	setTrigger: (element: HTMLButtonElement | null) => void
	triggerId: string
}

/** One menu level: its direct submenu branches and its surface. */
export type LevelContextValue = {
	cluster: MenuCluster
	content: () => HTMLElement | null
	open: () => boolean
}

export const MenuContext = context<MenuContextValue | null>(null)
export const LevelContext = context<LevelContextValue | null>(null)

/** Collection registry for menu items; disabled items are skipped in the focus order. */
export const menuItems = collection('menu')

/** Matches root and submenu content surfaces. */
export const SURFACE_SELECTOR = '[data-menu-sub-content="true"],[data-menu-content="true"]'

/** Items owned directly by one menu surface, excluding nested submenu items. */
export const surfaceItems = (surface: HTMLElement | null) =>
	menuItems.items(surface).filter(item => item.closest(SURFACE_SELECTOR) === surface)

/** Focuses the first or last direct item of one menu surface. */
export const focusEdge = (surface: HTMLElement | null, which: 'first' | 'last') => {
	const list = surfaceItems(surface)
	menuItems.focusItem(surface, which === 'first' ? list[0] : list[list.length - 1])
}

/** One direct submenu branch owned by a menu level. */
export type MenuBranch = {
	close: (event?: Event) => void
	content: () => HTMLElement | null
	prune: (target: Node, event: Event) => void
	trigger: () => HTMLElement | null
}

/** Private tree seam: each menu level owns only its direct submenu branches. */
export const cluster = () => {
	const branches = new Set<MenuBranch>()

	const contains = (branch: MenuBranch, target: Node) =>
		Boolean(branch.trigger()?.contains(target) || branch.content()?.contains(target))

	return {
		/** Registers one direct branch for exactly its mounted lifetime. */
		register(branch: MenuBranch) {
			branches.add(branch)
			return () => branches.delete(branch)
		},
		/** Closes every direct branch except an optional active sibling. */
		close(event?: Event, except?: MenuBranch) {
			for (const branch of [...branches]) {
				if (branch !== except) branch.close(event)
			}
		},
		/** Retains the branch containing target, closes siblings, and recurses. */
		prune(target: Node, event: Event) {
			for (const branch of [...branches]) {
				if (contains(branch, target)) branch.prune(target, event)
				else branch.close(event)
			}
		},
	}
}

export type MenuCluster = ReturnType<typeof cluster>

/** Private Menu root; ContextMenu and Menubar select their family policy through private args. */
export type MenuRootArgs = MenuArgs & {
	/** Menubar policy: true once when keyboard entry requested focus into this menu. */
	ackFocus?: () => boolean
	/** ContextMenu policy: the virtual reference for a point on one invoking source. */
	invoker?: (x: number, y: number, source: HTMLElement) => PositionReference
}

export const MenuRoot: Stateful<MenuRootArgs> = function* ({ ackFocus, defaultOpen, invoker, open }) {
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
	let pendingFocus: MenuFocus | undefined
	let menu: PopupView<HTMLButtonElement, HTMLDivElement>
	const commitMenubarFocus = frame(() => {
		if (ackFocus?.()) focusEdge(menu.content, 'first')
	})
	this.signal.addEventListener('abort', commitMenubarFocus.cancel)

	menu = popup<HTMLButtonElement, HTMLDivElement>(this, {
		prefix: 'menu',
		profile: invoker ? 'context' : ackFocus ? 'menubar' : 'menu',
		initialOpen: Boolean(open ?? defaultOpen),
		disabled: () => disabled,
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		source: view => invoker
			? contextSource
			: view.trigger ?? (dom(view.reference) ? view.reference as HTMLElement : null),
		reopenOnReferenceChange: Boolean(invoker),
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
			else if (ackFocus) commitMenubarFocus()
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

	const invoke = invoker && ((x: number, y: number, event: Event, source: HTMLElement, focus: 'content' | 'first') => {
		const reference = invoker(x, y, source)
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
	})

	// Keyboard close returns focus to the invoking source (ContextMenu) or
	// the trigger, unless the menu reopened first.
	const close = (event?: Event) => {
		const wasOpen = menu.open
		const restore = ++focusRestore
		const target = invoker ? contextSource : menu.trigger
		setOpen(false, event)
		queueMicrotask(() => {
			if (restore === focusRestore && wasOpen && !menu.open && target?.isConnected) target.focus()
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

		MenuContext({
			adoptTriggerId: menu.adoptTriggerId,
			close,
			contentId: menu.contentId,
			contentStyle: menu.contentStyle,
			disabled,
			dismiss,
			invoke,
			open: opened,
			setContent: menu.setContent,
			setOpen,
			setTrigger: menu.setTrigger,
			get triggerId() { return menu.triggerId },
		})

		LevelContext({ cluster: submenus, content: () => menu.content, open: () => menu.open })
		yield args.children
	}
}
