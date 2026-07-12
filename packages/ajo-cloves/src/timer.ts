import type { Host } from './core'

/** Managed one-shot timer with pause/resume, auto-cleared with the host lifecycle. */
export const timer = (host: Host) => {
	const signal = host.signal
	let handle: ReturnType<typeof setTimeout> | undefined
	let task: (() => void) | undefined
	let due = 0
	let left = 0
	let paused = false

	const stop = () => {
		if (handle != null) clearTimeout(handle)
		handle = undefined
		task = undefined
		due = 0
		left = 0
		paused = false
	}

	const done = () => {
		const fn = task
		handle = undefined
		task = undefined
		due = 0
		left = 0
		paused = false
		fn?.()
	}

	const schedule = (ms: number) => {
		left = Math.max(0, ms)
		due = Date.now() + left
		handle = setTimeout(done, left)
	}

	const view = {
		start(ms: number, fn: () => void) {
			stop()
			if (signal.aborted) return
			task = fn
			paused = false
			schedule(ms)
		},
		stop,
		pause() {
			if (handle == null) return
			left = Math.max(0, due - Date.now())
			clearTimeout(handle)
			handle = undefined
			paused = true
		},
		resume() {
			if (!paused || !task) return
			paused = false
			schedule(left)
		},
		get running() {
			return handle != null
		},
		get remaining() {
			if (handle) return Math.max(0, due - Date.now())
			return paused ? left : 0
		},
	}

	signal.addEventListener('abort', stop, { once: true })

	return view
}
