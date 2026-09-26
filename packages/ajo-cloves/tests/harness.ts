import type { Host } from 'ajo'
import { render } from 'ajo'
import { render as html } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, vi } from 'vitest'

afterEach(() => {
	render(null, document.body)
	document.body.textContent = ''
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

/** Returns a value the test needs to exist by now. */
export const must = <T>(value: T | null | undefined): T => {
	if (value == null) throw new Error('missing value')
	return value
}

/** Resolves after the microtasks queued so far. */
export const tick = () => new Promise<void>(resolve => queueMicrotask(resolve))

/** A bubbling, cancelable keydown. */
export const key = (value: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: value,
	...init,
})

const component = <View>(setup: (host: Host) => View, draw: (view: View) => unknown) =>
	function* (this: Host) {
		const view = setup(this)
		while (true) yield draw(view)
	}

/** Mounts a stateful host that runs `setup` once and renders `draw(view)` on every pass. */
export const mount = <View>(setup: (host: Host) => View, draw: (view: View) => unknown = () => null) => {
	let host = null as Host | null
	let view: View | undefined
	const Gen = component(next => view = setup(next), draw)

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	return { host: must(host), view: view as View }
}

/** Renders the same stateful host with `ajo/html` and returns its markup. */
export const serve = <View>(setup: (host: Host) => View, draw: (view: View) => unknown = () => 'server') =>
	html(jsx(component(setup, draw), {}))

/** Replaces requestAnimationFrame with a queue the test flushes by hand. */
export const frames = () => {
	const callbacks = new Map<number, FrameRequestCallback>()
	const cancelled: number[] = []
	let next = 1

	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		callbacks.set(next, callback)
		return next++
	})
	vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
		cancelled.push(handle)
		callbacks.delete(handle)
	})

	return {
		cancelled,
		/** Runs the queued callbacks and returns how many ran. */
		flush() {
			const pending = [...callbacks]
			callbacks.clear()
			for (const [handle, callback] of pending) callback(handle)
			return pending.length
		},
	}
}

/** Replaces ResizeObserver with spies whose callbacks the test triggers by hand. */
export const observers = () => {
	const instances: {
		disconnect: ReturnType<typeof vi.fn>
		observe: ReturnType<typeof vi.fn>
		trigger: (target: Element) => void
		unobserve: ReturnType<typeof vi.fn>
	}[] = []

	vi.stubGlobal('ResizeObserver', class {
		disconnect = vi.fn()
		observe = vi.fn()
		unobserve = vi.fn()

		constructor(callback: ResizeObserverCallback) {
			instances.push({
				disconnect: this.disconnect,
				observe: this.observe,
				trigger: target => callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver),
				unobserve: this.unobserve,
			})
		}
	})

	return instances
}
