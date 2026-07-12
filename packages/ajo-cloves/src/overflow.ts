import type { Host } from './core'
import { dom, frame } from './core'
import { resize } from './resize'
import { scrolling } from './scrolling'

const edge = (position: number, size: number, span: number): string | null => {
	if (span - size <= 1) return null

	// RTL scrollers report negative positions; the stamped values stay
	// inline-logical ("start" = scrolled away from the inline start).
	const offset = Math.abs(position)
	const start = offset > 1
	const end = offset < span - size - 1

	return start && end ? 'both' : start ? 'start' : 'end'
}

const stamp = (el: HTMLElement, name: string, value: string | null) => {
	if (!value) el.removeAttribute(name)
	else if (el.getAttribute(name) !== value) el.setAttribute(name, value)
}

/**
 * Stamps `data-overflow-x` / `data-overflow-y` ("start" | "end" | "both") on
 * a live scrollable element while content overflows it, tracking scroll,
 * element resize, and re-renders. Themes pair the attrs with edge fades (the
 * `[data-overflow-*]` mask preflight); the attrs are absent while everything
 * fits.
 *
 * @example
 * ```ts
 * const edges = overflow(this, { target: () => list })
 * while (true) {
 * 	edges.sync()
 * 	yield <div ref={el => list = el} />
 * }
 * ```
 */
export const overflow = (host: Host, opts: {
	/** Live element to observe; call sync() after refs may have changed. */
	target: () => HTMLElement | null | undefined
}) => {
	if (!dom(host)) {
		return {
			sync() {},
		}
	}

	const measure = (el: HTMLElement) => {
		stamp(el, 'data-overflow-x', edge(el.scrollLeft, el.clientWidth, el.scrollWidth))
		stamp(el, 'data-overflow-y', edge(el.scrollTop, el.clientHeight, el.scrollHeight))
	}
	const clear = (el: HTMLElement) => {
		stamp(el, 'data-overflow-x', null)
		stamp(el, 'data-overflow-y', null)
	}
	let target: HTMLElement | undefined

	const scroll = scrolling(host, { target: () => target, onScroll: measure })
	const size = resize(host, { target: () => target, onResize: el => measure(el as HTMLElement) })

	// Content can grow without an element resize or scroll (children added or
	// relabeled); re-measure on every sync so re-renders refresh the stamps.
	const schedule = frame(() => {
		if (target) measure(target)
	})

	host.signal.addEventListener('abort', () => {
		schedule.cancel()
		if (target) clear(target)
		target = undefined
	}, { once: true })

	return {
		sync() {
			if (host.signal.aborted) return
			const next = opts.target() ?? undefined
			if (next !== target) {
				if (target) clear(target)
				target = next
			}
			scroll.sync()
			size.sync()
			schedule()
		},
	}
}
