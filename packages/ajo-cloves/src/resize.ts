import type { Host } from 'ajo'
import { dom, live } from './core'

const registry = new WeakMap<Element, Set<() => void>>()
let observer: ResizeObserver | undefined
let subscriptions = 0

const notify: ResizeObserverCallback = entries => {
	for (const entry of entries) {
		for (const callback of [...registry.get(entry.target) ?? []]) callback()
	}
}

/** Calls fn when el resizes through one shared observer, until signal aborts. For sibling cloves only. */
export const subscribe = (el: Element, fn: () => void, signal: AbortSignal) => {
	observer ??= new ResizeObserver(notify)

	const callbacks = registry.get(el) ?? new Set()
	if (!registry.has(el)) {
		registry.set(el, callbacks)
		observer.observe(el)
	}

	callbacks.add(fn)
	subscriptions++

	signal.addEventListener('abort', () => {
		callbacks.delete(fn)
		subscriptions--

		if (!callbacks.size) {
			registry.delete(el)
			observer?.unobserve(el)
		}

		if (subscriptions) return

		observer?.disconnect()
		observer = undefined
	}, { once: true })
}

/**
 * Shared ResizeObserver notification for a live target element.
 *
 * @example
 * ```ts
 * const size = resize(this, { target: () => panel, onResize: el => measure(el) })
 * while (true) {
 * 	size.sync()
 * 	yield <section ref={el => panel = el} />
 * }
 * ```
 */
export const resize = (host: Host, opts: {
	/** Live element to observe; call sync() after refs may have changed. */
	target: () => Element | null | undefined
	/** Frame-coalesced on size change and on retarget or initial sync. */
	onResize: (el: Element) => void
}) => {
	if (!dom(host) || typeof ResizeObserver == 'undefined') {
		return {
			sync() {},
		}
	}

	const view = live(host, {
		target: opts.target,
		onChange: opts.onResize,
		bind: subscribe,
	})

	return { sync: view.sync }
}
