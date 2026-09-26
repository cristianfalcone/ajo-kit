import type { Host } from 'ajo'
import { dom, on } from './core'

/** Closes a surface on Escape anywhere in its document and/or on pointerdown outside it. An Escape a descendant already prevented is consumed and never dismisses. */
export const dismiss = (host: Host, opts: {
	/** Gate that enables dismissal channels only while true. */
	active: () => boolean
	/** Additional elements treated as inside the surface for outside pointerdown, such as portaled content. */
	inside?: () => (Element | null | undefined)[]
	/** Dismiss on Escape anywhere in the host's document while active. Default: true. */
	escape?: boolean
	/** Also dismiss on pointerdown outside the host and the inside() elements. Default: false. */
	outside?: boolean
	/** preventDefault the Escape keydown (never applied to outside pointerdown). Default: false. */
	prevent?: boolean
	/** Receives the Escape keydown or outside pointerdown that requested dismissal. */
	onDismiss: (event: Event) => void
}): void => {
	if (!dom(host)) return
	const document = host.ownerDocument
	const view = document.defaultView
	const node = (value: unknown): value is Node => Boolean(view && value instanceof view.Node)

	if (opts.escape ?? true) {
		on(document, 'keydown', event => {
			if (event.key !== 'Escape' || event.defaultPrevented || !opts.active()) return
			if (opts.prevent) event.preventDefault()
			opts.onDismiss(event)
		}, host)
	}

	if (opts.outside) {
		on(document, 'pointerdown', event => {
			if (!opts.active()) return

			const target = event.target
			if (!node(target)) return
			if ((host as Element).contains(target)) return
			if (opts.inside?.().some(element => element?.contains(target))) return

			opts.onDismiss(event)
		}, host, { capture: true })
	}
}
