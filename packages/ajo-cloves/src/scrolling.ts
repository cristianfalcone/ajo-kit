import type { Host } from './core'
import { dom, live, on } from './core'

/**
 * Scroll tracking for a live target element with leak-proof retargeting.
 *
 * @example
 * ```ts
 * const track = scrolling(this, { target: () => list, onScroll: el => read(el.scrollTop) })
 * while (true) {
 * 	track.sync()
 * 	yield <div ref={el => list = el} />
 * }
 * ```
 */
export const scrolling = (host: Host, opts: {
	/** Live element to observe; call sync() after refs may have changed. */
	target: () => HTMLElement | null | undefined
	/** Frame-coalesced on scroll and on retarget or initial sync. */
	onScroll: (el: HTMLElement) => void
	/** Uncoalesced scrollend passthrough. */
	onEnd?: (el: HTMLElement) => void
}) => {
	if (!dom(host)) {
		return {
			sync() {},
		}
	}

	return live(host, {
		target: opts.target,
		onChange: opts.onScroll,
		bind: (element, notify, signal) => {
			on(element, 'scroll', notify, host, { passive: true, signal })
			if (opts.onEnd) {
				on(element, 'scrollend', () => opts.onEnd?.(element), host, { passive: true, signal })
			}
		},
	})
}
