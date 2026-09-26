import type { Host } from 'ajo'

/** Managed one-shot timer, auto-cleared with the host lifecycle. */
export const timer = (host: Host) => {
	const signal = host.signal
	let handle: ReturnType<typeof setTimeout> | undefined

	const stop = () => {
		if (handle != null) clearTimeout(handle)
		handle = undefined
	}

	signal.addEventListener('abort', stop, { once: true })

	return {
		/** Replaces any pending task and runs fn once after ms. */
		start(ms: number, fn: () => void) {
			stop()
			if (signal.aborted) return
			handle = setTimeout(() => {
				handle = undefined
				fn()
			}, Math.max(0, ms))
		},
		stop,
		get running() {
			return handle != null
		},
	}
}
