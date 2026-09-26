import type { Host } from 'ajo'
import { dom, frame } from './core'
import { resize } from './resize'

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

	let container: HTMLElement | undefined
	let placed = false

	const clear = (el: HTMLElement) => {
		el.removeAttribute('data-indicator')
		for (const name of ['x', 'y', 'w', 'h']) el.style.removeProperty(`--indicator-${name}`)
		placed = false
	}

	// The marker attribute trails the variables by one frame so the theme's
	// transitioned pseudo-element first paints already in position.
	const reveal = frame(() => {
		if (container && placed) container.setAttribute('data-indicator', 'true')
	})

	const measure = () => {
		if (!container) return

		const mark = opts.of(container)

		if (!mark || !container.contains(mark)) {
			container.removeAttribute('data-indicator')
			placed = false
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
		placed = true
		reveal()
	}

	const schedule = frame(measure)

	const size = resize(host, { target: () => container, onResize: () => schedule() })

	const retarget = (next: HTMLElement | undefined) => {
		if (next === container) return
		if (container) clear(container)
		container = next
	}

	host.signal.addEventListener('abort', () => {
		schedule.cancel()
		reveal.cancel()
		if (container) clear(container)
		container = undefined
	}, { once: true })

	return {
		sync() {
			if (host.signal.aborted) return
			retarget(opts.target() ?? undefined)
			size.sync()
			schedule()
		},
	}
}
