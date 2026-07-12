import type { Host } from './core'
import { dom } from './core'

/** Captures the focused element and returns focus to it later. */
export const restore = (host: Host) => {
	const inert = {
		capture(_element?: HTMLElement | null) {},
		restore() {},
	}

	if (!dom(host)) return inert

	let captured: HTMLElement | null = null

	return {
		capture(element?: HTMLElement | null) {
			captured = arguments.length ? element ?? null : document.activeElement as HTMLElement | null
		},
		restore() {
			const element = captured
			captured = null
			if (!element) return

			queueMicrotask(() => {
				if (element.isConnected) element.focus()
			})
		},
	}
}
