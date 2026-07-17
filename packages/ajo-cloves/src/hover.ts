import type { Host } from './core'
import { timer } from './timer'

/** Hover intent: zones hold the surface open; delays gate open/close transitions. */
export const hover = (host: Host, opts: {
	/** Delay before the first held zone opens the surface, in ms. Default: 0. */
	openDelay?: () => number
	/** Delay before the last released zone closes the surface, in ms. Default: 0. */
	closeDelay?: () => number
	/** Called when the held-zone state opens or closes the surface. */
	onChange: (open: boolean, event: Event) => void
}) => {
	const zones = new Set<string>()
	const opening = timer(host)
	const closing = timer(host)
	let opened = false

	const flip = (next: boolean, event: Event) => {
		if (opened === next) return
		opened = next
		opts.onChange(next, event)
	}

	return {
		get open() {
			return opened
		},
		hold(zone: string, event: Event) {
			zones.add(zone)
			closing.stop()
			if (opened || opening.running) return

			const delay = opts.openDelay?.() ?? 0
			if (delay <= 0) flip(true, event)
			else opening.start(delay, () => flip(true, event))
		},
		release(zone: string, event: Event) {
			zones.delete(zone)
			if (zones.size) return

			opening.stop()
			if (!opened) return

			const delay = opts.closeDelay?.() ?? 0
			if (delay <= 0) flip(false, event)
			else closing.start(delay, () => flip(false, event))
		},
		sync(open: boolean) {
			opened = open
		},
		/** Stops pending transitions and forgets every held zone without notifying. */
		cancel() {
			opening.stop()
			closing.stop()
			zones.clear()
		},
	}
}
