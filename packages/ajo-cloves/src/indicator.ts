import type { Host } from 'ajo'
import { dom, frame, live } from './core'
import { subscribe } from './resize'

/**
 * Tracks a marked child inside a live container and stamps its box on the
 * container as CSS variables (`--indicator-x/y/w/h`, px in the container's
 * content coordinates) plus a `data-indicator="true"` marker while a mark
 * exists. Themes draw a pseudo-element positioned by the variables and
 * transition it, so the active marker glides between children instead of
 * jumping.
 *
 * On first placement the variables land one frame before the marker
 * attribute, so a theme pseudo-element fades in at its resting position
 * instead of sliding in from the container origin.
 *
 * @example
 * ```ts
 * const mark = indicator(this, {
 * 	target: () => list,
 * 	of: container => container.querySelector('[data-state="active"]'),
 * })
 * while (true) {
 * 	mark.sync()
 * 	yield ...
 * }
 * ```
 */
export const indicator = (host: Host, opts: {
	/** Live container that receives the variables; call sync() after refs may have changed. */
	target: () => HTMLElement | null | undefined
	/** Resolves the marked child inside the container. */
	of: (container: HTMLElement) => HTMLElement | null
}) => {
	if (!dom(host)) {
		return {
			sync() {},
		}
	}

	// The container whose marker is placed; the marker attribute trails the
	// variables by one frame so the theme's transitioned pseudo-element first
	// paints already in position.
	let placed: HTMLElement | undefined

	const reveal = frame(() => placed?.setAttribute('data-indicator', 'true'))

	const measure = (container: HTMLElement) => {
		const mark = opts.of(container)

		if (!mark || !container.contains(mark)) {
			container.removeAttribute('data-indicator')
			placed = undefined
			return
		}

		// Content coordinates (scroll included) so the mark stays glued to its
		// child while the container scrolls.
		const box = container.getBoundingClientRect()
		const rect = mark.getBoundingClientRect()
		const style = container.style
		style.setProperty('--indicator-x', `${rect.left - box.left + container.scrollLeft}px`)
		style.setProperty('--indicator-y', `${rect.top - box.top + container.scrollTop}px`)
		style.setProperty('--indicator-w', `${rect.width}px`)
		style.setProperty('--indicator-h', `${rect.height}px`)

		if (placed) return
		placed = container
		reveal()
	}

	const view = live(host, {
		target: opts.target,
		onChange: measure,
		bind: (container, notify, signal) => {
			subscribe(container, notify, signal)
			signal.addEventListener('abort', () => {
				reveal.cancel()
				placed = undefined
				container.removeAttribute('data-indicator')
				for (const name of ['x', 'y', 'w', 'h']) container.style.removeProperty(`--indicator-${name}`)
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
