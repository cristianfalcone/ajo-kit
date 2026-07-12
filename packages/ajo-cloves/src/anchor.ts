import type { Host } from './core'
import { clamp, dom, frame, shared } from './core'

type Side = 'top' | 'right' | 'bottom' | 'left'
type Align = 'start' | 'center' | 'end'
type Constrain = 'height' | 'width' | 'both' | 'none'

type AnchorView = {
	/** Measures and positions now. Call synchronously right after showing the target. */
	place(): void
	/** Starts shared update subscriptions. */
	watch(): void
	/** Stops shared update subscriptions. */
	unwatch(): void
	/** Resolved placement after the last place(). */
	readonly side: Side
	/** Resolved alignment after the last place(). */
	readonly align: Align
}

const scrollOptions = { capture: true, passive: true }
const passiveOptions = { passive: true }

const opposite = (side: Side): Side =>
	side === 'top' ? 'bottom'
		: side === 'bottom' ? 'top'
			: side === 'left' ? 'right'
				: 'left'

const origin = (side: Side, align: Align) => {

	const cross = align === 'start' ? 'left' : align === 'end' ? 'right' : 'center'
	const vertical = align === 'start' ? 'top' : align === 'end' ? 'bottom' : 'center'

	if (side === 'top') return `${cross} bottom`
	if (side === 'bottom') return `${cross} top`
	if (side === 'left') return `right ${vertical}`

	return `left ${vertical}`
}

// Keeps the caret off the target's rounded corners.
const arrowPadding = 8

const startResize = (notify: () => void) => {
	window.addEventListener('resize', notify, passiveOptions)
	return () => window.removeEventListener('resize', notify)
}

const startScroll = (notify: () => void) => {
	document.addEventListener('scroll', notify, scrollOptions)
	return () => document.removeEventListener('scroll', notify, scrollOptions)
}

const startViewportResize = (notify: () => void) => {

	const viewport = window.visualViewport

	if (!viewport) return () => { }

	viewport.addEventListener('resize', notify, passiveOptions)

	return () => viewport.removeEventListener('resize', notify)
}

const startViewportScroll = (notify: () => void) => {

	const viewport = window.visualViewport

	if (!viewport) return () => { }

	viewport.addEventListener('scroll', notify, passiveOptions)

	return () => viewport.removeEventListener('scroll', notify)
}

/** Floating position: places a fixed-strategy target relative to an anchor with flip, shift, and size vars. */
export const anchor = (host: Host, opts: {
	/** Reference element. */
	anchor: () => HTMLElement | null | undefined
	/** Floating element. */
	target: () => HTMLElement | null | undefined
	/** Preferred side. */
	side?: () => Side
	/** Cross-axis alignment. */
	align?: () => Align
	/** Gap between anchor and target in px. */
	sideOffset?: () => number
	/** Shift along the alignment axis in px. */
	alignOffset?: () => number
	/** Minimum distance from viewport edges in px. */
	padding?: () => number
	/** Also writes maxHeight/maxWidth from available space. */
	constrain?: () => Constrain
	/**
	 * Caret element, expected to be an absolutely positioned child of the target.
	 * Each place() writes inline left/top centering it on the anchor's center
	 * projected onto the target's near edge, clamped to the target bounds, and
	 * sets data-uncentered when clamping displaced it. Rotation stays with CSS
	 * driven by the target's data-side.
	 */
	arrow?: () => HTMLElement | null | undefined
}): AnchorView => {
	if (!dom(host)) {
		return {
			place() { },
			watch() { },
			unwatch() { },
			get side() {
				return opts.side?.() ?? 'bottom'
			},
			get align() {
				return opts.align?.() ?? 'center'
			},
		}
	}

	let currentSide = opts.side?.() ?? 'bottom'
	let currentAlign = opts.align?.() ?? 'center'
	let watching = false
	let scope: AbortController | undefined
	let observer: ResizeObserver | undefined
	let observedAnchor: Element | undefined
	let observedTarget: Element | undefined

	// Keeps the observer on the LIVE anchor/target pair; refs may retarget
	// while watching (leak-proof retarget contract, same as the resize clove).
	const observe = () => {

		if (!observer) return

		const a = opts.anchor() ?? undefined
		const t = opts.target() ?? undefined

		if (a === observedAnchor && t === observedTarget) return

		if (observedAnchor || observedTarget) observer.disconnect()
		observedAnchor = a
		observedTarget = t

		if (a) observer.observe(a)
		if (t && t !== a) observer.observe(t)
	}

	const place = () => {

		const a = opts.anchor()
		const t = opts.target()

		if (!a || !t) return

		observe()

		const viewport = window.visualViewport
		const vx = viewport?.offsetLeft ?? 0
		const vy = viewport?.offsetTop ?? 0
		const vw = viewport?.width ?? window.innerWidth
		const vh = viewport?.height ?? window.innerHeight
		const ar = a.getBoundingClientRect()
		const tw = t.offsetWidth
		const th = t.offsetHeight
		const caret = opts.arrow?.()
		// Layout-box size: themed carets rotate, which inflates
		// getBoundingClientRect, while left/top position the layout box.
		const aw = caret?.offsetWidth ?? 0
		const ah = caret?.offsetHeight ?? 0
		// clientLeft/Top convert border-box coordinates to the padding-box
		// origin that absolutely positioned children resolve against.
		const borderLeft = caret ? t.clientLeft : 0
		const borderTop = caret ? t.clientTop : 0
		const sideOffset = opts.sideOffset?.() ?? 4
		const alignOffset = opts.alignOffset?.() ?? 0
		const padding = opts.padding?.() ?? 8
		const preferred = opts.side?.() ?? 'bottom'
		const resolvedAlign = opts.align?.() ?? 'center'

		const space = (side: Side) =>
			side === 'top' ? ar.top - vy
				: side === 'bottom' ? vy + vh - ar.bottom
					: side === 'left' ? ar.left - vx
						: vx + vw - ar.right

		const size = (side: Side) =>
			side === 'top' || side === 'bottom' ? th : tw

		const preferredSpace = space(preferred)
		const other = opposite(preferred)
		const resolvedSide = preferredSpace < size(preferred) + sideOffset + padding && space(other) > preferredSpace
			? other
			: preferred

		let x = ar.left
		let y = ar.bottom + sideOffset

		if (resolvedSide === 'top') {
			y = ar.top - th - sideOffset
		} else if (resolvedSide === 'left') {
			x = ar.left - tw - sideOffset
			y = ar.top
		} else if (resolvedSide === 'right') {
			x = ar.right + sideOffset
			y = ar.top
		}

		if (resolvedSide === 'top' || resolvedSide === 'bottom') {
			if (resolvedAlign === 'center') x = ar.left + (ar.width - tw) / 2
			else if (resolvedAlign === 'end') x = ar.right - tw
			x += alignOffset
		} else {
			if (resolvedAlign === 'center') y = ar.top + (ar.height - th) / 2
			else if (resolvedAlign === 'end') y = ar.bottom - th
			y += alignOffset
		}

		x = Math.round(clamp(x, vx + padding, vx + vw - tw - padding))
		y = Math.round(clamp(y, vy + padding, vy + vh - th - padding))

		const free = space(resolvedSide)
		const availableHeight = Math.round(Math.max(0,
			resolvedSide === 'top' || resolvedSide === 'bottom'
				? free - sideOffset - padding
				: vh - padding * 2,
		))
		const availableWidth = Math.round(Math.max(0,
			resolvedSide === 'left' || resolvedSide === 'right'
				? free - sideOffset - padding
				: vw - padding * 2,
		))
		const constrain = opts.constrain?.() ?? 'none'

		t.style.position = 'fixed'
		t.style.left = `${x}px`
		t.style.top = `${y}px`
		t.style.setProperty('--anchor-width', `${ar.width}px`)
		t.style.setProperty('--anchor-height', `${ar.height}px`)
		t.style.setProperty('--available-width', `${availableWidth}px`)
		t.style.setProperty('--available-height', `${availableHeight}px`)
		if (constrain === 'height' || constrain === 'both') t.style.maxHeight = `${availableHeight}px`
		if (constrain === 'width' || constrain === 'both') t.style.maxWidth = `${availableWidth}px`
		t.dataset.side = resolvedSide
		t.dataset.align = resolvedAlign
		t.style.transformOrigin = origin(resolvedSide, resolvedAlign)

		if (caret) {
			// Anchor center projected into target coordinates, clamped inside
			// the target minus the corner padding; the main axis centers the
			// caret box on the near edge so it overlaps the border.
			let cx: number, cy: number, displaced: boolean

			if (resolvedSide === 'top' || resolvedSide === 'bottom') {
				const ideal = ar.left + ar.width / 2 - x - aw / 2
				cx = clamp(ideal, arrowPadding, Math.max(arrowPadding, tw - aw - arrowPadding))
				cy = resolvedSide === 'bottom' ? -ah / 2 : th - ah / 2
				displaced = cx !== ideal
			} else {
				const ideal = ar.top + ar.height / 2 - y - ah / 2
				cy = clamp(ideal, arrowPadding, Math.max(arrowPadding, th - ah - arrowPadding))
				cx = resolvedSide === 'right' ? -aw / 2 : tw - aw / 2
				displaced = cy !== ideal
			}

			caret.style.left = `${Math.round(cx - borderLeft)}px`
			caret.style.top = `${Math.round(cy - borderTop)}px`

			if (displaced) caret.dataset.uncentered = ''
			else delete caret.dataset.uncentered
		}

		currentSide = resolvedSide
		currentAlign = resolvedAlign
	}

	const schedule = frame(place)

	const unwatch = () => {

		if (!watching) return

		watching = false
		scope?.abort()
		scope = undefined
		observer?.disconnect()
		observer = undefined
		observedAnchor = undefined
		observedTarget = undefined
		schedule.cancel()
	}

	host.signal.addEventListener('abort', unwatch, { once: true })

	return {
		place,
		watch() {

			if (watching || host.signal.aborted) return

			watching = true
			scope = new AbortController()
			const signal = scope.signal

			host.signal.addEventListener('abort', () => scope?.abort(), { once: true, signal })

			shared('resize', startResize, schedule, signal)
			shared('scroll', startScroll, schedule, signal)

			if (window.visualViewport) {
				shared('vv-resize', startViewportResize, schedule, signal)
				shared('vv-scroll', startViewportScroll, schedule, signal)
			}

			if (typeof ResizeObserver != 'undefined') {
				observer = new ResizeObserver(schedule)
				observe()
			}
		},
		unwatch,
		get side() {
			return currentSide
		},
		get align() {
			return currentAlign
		},
	}
}
