import type { Host } from './core'
import { dom, on } from './core'

/** Closes a surface on Escape within the given elements and/or pointerdown outside them. */
export const dismiss = (host: Host, opts: {
	/** Gate that enables dismissal channels only while true. */
	active: () => boolean
	/** Additional elements treated as inside the surface, such as portaled content. */
	inside?: () => (Element | null | undefined)[]
	/** Listen for Escape. Default: true (existing behavior). */
	escape?: boolean
	/** Also dismiss on pointerdown outside the host and the inside() elements. Default: false. */
	outside?: boolean
	/** preventDefault the Escape keydown (never applied to outside pointerdown). Default: false. */
	prevent?: boolean
	/** Receives the Escape keydown or outside pointerdown that requested dismissal. */
	onDismiss: (event: Event) => void
}): void => {
	if (!dom(host)) return

	if (opts.escape ?? true) {
		on(host, 'keydown', event => {
			if (event.key !== 'Escape' || !opts.active()) return

			if (opts.inside) {
				const target = event.target
				const elements = opts.inside().filter((element): element is Element => !!element)

				if (elements.length && !(target instanceof Node && elements.some(element => element.contains(target)))) return
			}

			if (opts.prevent) event.preventDefault()
			opts.onDismiss(event)
		}, host)
	}

	if (opts.outside) {
		on(document, 'pointerdown', event => {
			if (!opts.active()) return

			const target = event.target
			if (!(target instanceof Node)) return
			if ((host as Element).contains(target)) return
			if (opts.inside?.().some(element => element?.contains(target))) return

			opts.onDismiss(event)
		}, host, { capture: true })
	}
}
