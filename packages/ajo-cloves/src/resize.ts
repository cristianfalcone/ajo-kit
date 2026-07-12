import type { Host } from './core'
import { dom, live } from './core'

type Callback = (el: Element) => void

const registry = new WeakMap<Element, Set<Callback>>()
let observer: ResizeObserver | undefined
let subscriptions = 0

const notify: ResizeObserverCallback = (entries, source) => {
	if (source !== observer) return
	for (const entry of entries) {
		const callbacks = registry.get(entry.target)
		if (!callbacks) continue

		for (const callback of [...callbacks]) callback(entry.target)
	}
}

const subscribe = (el: Element, fn: Callback, signal: AbortSignal) => {
	if (signal.aborted) return

	observer ??= new ResizeObserver(notify)
	const currentObserver = observer

	let callbacks = registry.get(el)
	if (!callbacks) {
		callbacks = new Set()
		try {
			currentObserver.observe(el)
		} catch (error) {
			try { currentObserver.unobserve(el) } catch { }
			if (!subscriptions) {
				try { currentObserver.disconnect() } catch { }
				if (observer === currentObserver) observer = undefined
			}
			throw error
		}
		registry.set(el, callbacks)
	}

	callbacks.add(fn)
	subscriptions++

	const unsubscribe = () => {
		const current = registry.get(el)
		if (!current?.delete(fn)) return

		subscriptions--
		if (!current.size) {
			registry.delete(el)
			observer?.unobserve(el)
		}

		if (subscriptions) return

		observer?.disconnect()
		observer = undefined
	}

	signal.addEventListener('abort', unsubscribe, { once: true })
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

	return live(host, {
		target: opts.target,
		onChange: opts.onResize,
		bind: (element, notify, signal) => subscribe(element, notify, signal),
	})
}
