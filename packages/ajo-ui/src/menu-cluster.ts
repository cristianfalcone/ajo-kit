import { context } from 'ajo/context'
import { collection } from './collection'
import type { PositionReference } from './position'

export type MenuInvocationFocus = 'content' | 'first'

type InvokeReference = (
	reference: PositionReference,
	source: HTMLElement,
	event: Event,
	focus: MenuInvocationFocus,
) => void

/** Private ContextMenu adapter that owns virtual-reference identity. */
export type ContextMenuInvoke = (
	invoke: InvokeReference,
	x: number,
	y: number,
	event: Event,
	source: HTMLElement,
	focus: MenuInvocationFocus,
) => void

type ContextMenuComposition = {
	invoke: ContextMenuInvoke
	profile: 'context'
	restoreFocus: () => void
}

type MenubarComposition = {
	ackFocus: () => boolean
	profile: 'menubar'
}

type MenuComposition = ContextMenuComposition | MenubarComposition

type MenuInvocation = {
	adoptTriggerId: (id?: unknown) => string
	contentId: string
	disabled: boolean
	invoke: (x: number, y: number, event: Event, source: HTMLElement, focus: MenuInvocationFocus) => void
	open: boolean
}

const CompositionContext = context<MenuComposition | null>(null)
const InvocationContext = context<MenuInvocation | null>(null)

/** Selects ContextMenu policy for exactly one descendant Menu root. */
export const provideContextMenuComposition = (invoke: ContextMenuInvoke, restoreFocus: () => void) =>
	CompositionContext({ invoke, profile: 'context', restoreFocus })

/** Selects Menubar policy and its commit-time focus acknowledgement. */
export const provideMenubarComposition = (ackFocus: () => boolean) =>
	CompositionContext({ ackFocus, profile: 'menubar' })

/** Returns the private family policy selected by a composing Menu root. */
export const menuComposition = () => CompositionContext()

/** Prevents a composing family policy from leaking into nested Menu roots. */
export const isolateMenuComposition = () => CompositionContext(null)

/** Publishes Menu's private context-invocation controller to its trigger. */
export const provideMenuInvocation = (value: MenuInvocation) => InvocationContext(value)

/** Prevents a context invocation controller from leaking through a nested Menu. */
export const isolateMenuInvocation = () => InvocationContext(null)

/** Returns the nearest private context-invocation controller. */
export const menuInvocation = () => InvocationContext()

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
