import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { OmitArg } from './utils'
import { dom, listen, roving, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { useDirection } from './direction'

/** Layout and keyboard-navigation axis of a toolbar. */
export type ToolbarOrientation = 'horizontal' | 'vertical'

/** Props for a toolbar with roving focus among descendant controls. */
export type ToolbarArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'dir'> & {
	/** Text direction for horizontal arrow-key navigation. Defaults to the nearest DirectionProvider. */
	dir?: 'ltr' | 'rtl'
	/** Allow arrow-key focus to wrap at the ends. */
	loop?: boolean
	/** Toolbar orientation. */
	orientation?: ToolbarOrientation
}>

/** Props for a separator whose orientation follows the parent toolbar. */
export type ToolbarSeparatorArgs = IntrinsicElements['div']

type ToolbarRootArgs = WithChildren<{
	dir: 'ltr' | 'rtl'
	loop: boolean
	orientation: ToolbarOrientation
}>

type ToolbarContextValue = {
	orientation: ToolbarOrientation
}

const ToolbarContext = context<ToolbarContextValue | null>(null)

const CONTROL_SELECTOR = 'button, [href], input, select, textarea, summary, [tabindex]'

// Focusable toolbar controls in DOM order (the house trigger-row filter:
// enabled and visible; summary joins for details-based facets), scoped to
// the toolbar's own layer: controls inside floating popover content opened
// from the toolbar (menus, selects) or inside a composed <dialog> never join
// the row. Visibility uses checkVisibility because closed-details content is
// content-visibility-hidden in Chromium (offsetParent stays non-null there);
// the offsetParent fallback covers engines without it.
const controls = (root: HTMLElement) => {
	const layer = root.closest('[popover], dialog')
	return Array.from(root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)).filter(control =>
		!(control as HTMLButtonElement).disabled &&
		(control.checkVisibility?.() ?? control.offsetParent !== null) &&
		control.closest('[popover], dialog') === layer,
	)
}

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'])

// Text-entry controls own their caret keys (APG): roving must not steal them.
const textEntry = (element: HTMLElement) =>
	element instanceof HTMLTextAreaElement ||
	element.isContentEditable ||
	(element instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(element.type))

// A text control releases an arrow key only when caret handling no longer
// needs it: a collapsed caret sitting at the matching edge. Home/End and
// vertical arrows always stay with the caret. The escape edge follows the
// control's own resolved direction (a dir="auto" or forced-ltr input inside
// an rtl toolbar keeps its productive caret keys); the toolbar dir only
// steers roving movement.
const caretEscapes = (target: HTMLElement, event: KeyboardEvent) => {
	if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false
	if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return false
	const caret = target.selectionStart
	if (caret == null || caret !== target.selectionEnd) return false
	const rtl = getComputedStyle(target).direction === 'rtl'
	return (event.key === 'ArrowLeft') !== rtl ? caret === 0 : caret === target.value.length
}

const ToolbarRoot: Stateful<ToolbarRootArgs> = function* () {
	let active: HTMLElement | null = null
	let dir: 'ltr' | 'rtl' = 'ltr'
	let loop = true
	let orientation: ToolbarOrientation = 'horizontal'
	let queued = false

	// Single tab stop over the live control row (roving tabindex): the active
	// control keeps tabindex 0, the rest get -1; focusing any control moves the
	// stop, and the stop is repaired to the first control in DOM order when the
	// active one unmounts, hides, or disables.
	// NOTE: menubar/navigation-menu grow a shared bar() helper this wave;
	// converging this tab-stop machinery with it is a recorded follow-up
	// (ai/menus.md, "New sibling: Toolbar").
	const apply = () => {
		if (!dom(this)) return
		const row = controls(this)
		if (!active || !row.includes(active)) active = row[0] ?? null
		for (const control of row) {
			const value = control === active ? '0' : '-1'
			if (control.getAttribute('tabindex') !== value) control.setAttribute('tabindex', value)
		}
	}

	const sync = () => {
		if (queued) return
		queued = true
		queueMicrotask(() => {
			queued = false
			apply()
		})
	}

	const nav = roving(this, {
		items: () => controls(this),
		orientation: () => orientation,
		dir: () => dir,
		loop: () => loop,
		onMove: target => target.focus(),
	})

	listen(this, 'focusin', (event: FocusEvent) => {
		const target = event.target as HTMLElement | null
		if (!target || !controls(this).includes(target)) return
		active = target
		apply()
	})

	listen(this, 'keydown', (event: KeyboardEvent) => {
		const target = event.target as HTMLElement | null
		// A composed widget that already consumed the key (open menu, slider,
		// a toggle group outside a toolbar) wins over toolbar roving, and so
		// does an active IME composition (keyCode 229 covers engines that
		// fire the arrow before isComposing settles): an arrow at a caret
		// edge mid-composition must not move focus and abort the composition.
		if (!target || event.defaultPrevented || event.isComposing || event.keyCode === 229) return
		if (!controls(this).includes(target)) return
		if (textEntry(target) && !caretEscapes(target, event)) return
		nav.handle(event)
	})

	if (dom(this)) {
		// Controls can mount/unmount or flip disabled/hidden from a nested
		// component's own render without this component re-rendering; watch the
		// subtree and repair the tab stop. The equality guard in apply() keeps
		// its own tabindex writes from re-firing the observer.
		const observer = new MutationObserver(sync)
		observer.observe(this, {
			attributeFilter: ['disabled', 'hidden', 'tabindex'],
			attributes: true,
			childList: true,
			subtree: true,
		})
		this.signal.addEventListener('abort', () => observer.disconnect())
	}

	for (const args of this) {
		dir = args.dir
		loop = args.loop
		orientation = args.orientation

		ToolbarContext({ orientation })

		sync()
		yield <>{args.children}</>
	}
}


/** Unstyled toolbar: arbitrary controls behind a single tab stop with dir-aware arrow-key roving (APG toolbar pattern). Button, ToggleGroup, Select, and Input compose inside; nested ToggleGroup items join the toolbar roving. */
const Toolbar: Stateless<ToolbarArgs> = ({
	children,
	'data-slot': slot = 'toolbar',
	dir,
	loop = true,
	orientation = 'horizontal',
	role = 'toolbar',
	...attrs
}) => {
	const resolvedDir = dir ?? useDirection()

	return (
		<ToolbarRoot
			{...rootAttrs(attrs)}
			dir={resolvedDir}
			loop={loop}
			orientation={orientation}
			attr:aria-orientation={orientation}
			attr:data-orientation={orientation}
			attr:data-slot={slot}
			attr:dir={resolvedDir}
			attr:role={role}
		>
			{children}
		</ToolbarRoot>
	)
}

/** Unstyled separator between toolbar groups, oriented across the toolbar axis. */
const ToolbarSeparator: Stateless<ToolbarSeparatorArgs> = ({
	role = 'separator',
	...attrs
}) => {
	const toolbar = ToolbarContext()
	const orientation = (toolbar?.orientation ?? 'horizontal') === 'horizontal' ? 'vertical' : 'horizontal'

	return (
		<div
			{...attrs}
			aria-orientation={orientation}
			data-orientation={orientation}
			data-slot="toolbar-separator"
			role={role}
		/>
	)
}

export { Toolbar, ToolbarSeparator }
