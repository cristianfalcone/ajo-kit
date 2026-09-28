import type { Host } from 'ajo'
import { dom, live } from './core'
import { subscribe } from './resize'

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

const offset = (el: HTMLElement, value: string | null) => {
	if (!value) el.style.removeProperty('--overflow-x-offset')
	else el.style.setProperty('--overflow-x-offset', value)
}

/**
 * Stamps `data-overflow-x` / `data-overflow-y` ("start" | "end" | "both") on
 * a live scrollable element while content overflows it, tracking scroll,
 * element resize, and re-renders. Themes pair the attrs with edge fades (the
 * `[data-overflow-*]` mask preflight); the attrs are absent while everything
 * fits. While content overflows sideways, `--overflow-x-offset` holds how far
 * it is scrolled from the inline start, so a fade drawn on the content can
 * stay on the visible edges.
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

	// Content can grow without an element resize or scroll (children added or
	// relabeled), so every sync also refreshes the stamps on the next frame.
	const view = live(host, {
		target: opts.target,
		onChange: el => {
			const x = edge(el.scrollLeft, el.clientWidth, el.scrollWidth)
			stamp(el, 'data-overflow-x', x)
			stamp(el, 'data-overflow-y', edge(el.scrollTop, el.clientHeight, el.scrollHeight))
			offset(el, x && `${Math.abs(el.scrollLeft)}px`)
		},
		bind: (el, notify, signal) => {
			el.addEventListener('scroll', notify, { passive: true, signal })
			subscribe(el, notify, signal)
			signal.addEventListener('abort', () => {
				stamp(el, 'data-overflow-x', null)
				stamp(el, 'data-overflow-y', null)
				offset(el, null)
			}, { once: true })
		},
	})

	return {
		sync() {
			view.sync()
			view.refresh()
		},
	}
}
