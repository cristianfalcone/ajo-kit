// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'
import { overflow } from 'ajo-cloves'

type View = ReturnType<typeof overflow>

const needDiv = (value: HTMLDivElement | null): HTMLDivElement => {
	if (value == null) throw new Error('missing value')
	return value
}

const needView = (value: View | null): View => {
	if (value == null) throw new Error('missing value')
	return value
}

const installRaf = () => {
	const callbacks = new Map<number, FrameRequestCallback>()
	const originalRaf = globalThis.requestAnimationFrame
	const originalCancel = globalThis.cancelAnimationFrame
	let next = 1

	Object.defineProperty(globalThis, 'requestAnimationFrame', {
		configurable: true,
		value: (callback: FrameRequestCallback) => {
			const handle = next++
			callbacks.set(handle, callback)
			return handle
		},
	})
	Object.defineProperty(globalThis, 'cancelAnimationFrame', {
		configurable: true,
		value: (handle: number) => callbacks.delete(handle),
	})

	return {
		flush() {
			const pending = [...callbacks]
			callbacks.clear()
			for (const [handle, callback] of pending) callback(handle)
		},
		restore() {
			Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: originalRaf })
			Object.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: originalCancel })
		},
	}
}

const metrics = (element: HTMLElement) => {
	Object.defineProperties(element, {
		clientHeight: { configurable: true, value: 100 },
		clientWidth: { configurable: true, value: 100 },
		scrollHeight: { configurable: true, value: 300 },
		scrollLeft: { configurable: true, value: 50 },
		scrollTop: { configurable: true, value: 50 },
		scrollWidth: { configurable: true, value: 300 },
	})
}

afterEach(() => {
	render(null, document.body)
	vi.restoreAllMocks()
	document.body.textContent = ''
})

test('clears owned overflow stamps on retarget, null, and host abort', () => {
	const raf = installRaf()
	let a: HTMLDivElement | null = null
	let b: HTMLDivElement | null = null
	let target: HTMLElement | null = null
	let view: View | null = null

	function* Gen(this: Host) {
		view = overflow(this, { target: () => target })
		yield [
			jsx('div', { key: 'a', ref: (element: unknown) => a = element as HTMLDivElement | null }),
			jsx('div', { key: 'b', ref: (element: unknown) => b = element as HTMLDivElement | null }),
		]
	}

	try {
		render(jsx(Gen, {}), document.body)
		const first = needDiv(a)
		const second = needDiv(b)
		const edges = needView(view)
		metrics(first)
		metrics(second)

		target = first
		edges.sync()
		raf.flush()
		expect(first.getAttribute('data-overflow-x')).toBe('both')
		expect(first.getAttribute('data-overflow-y')).toBe('both')

		target = second
		edges.sync()
		expect(first.hasAttribute('data-overflow-x')).toBe(false)
		expect(first.hasAttribute('data-overflow-y')).toBe(false)
		raf.flush()
		expect(second.getAttribute('data-overflow-x')).toBe('both')
		expect(second.getAttribute('data-overflow-y')).toBe('both')

		target = null
		edges.sync()
		expect(second.hasAttribute('data-overflow-x')).toBe(false)
		expect(second.hasAttribute('data-overflow-y')).toBe(false)

		target = second
		edges.sync()
		raf.flush()
		expect(second.getAttribute('data-overflow-y')).toBe('both')
		render(null, document.body)
		expect(second.hasAttribute('data-overflow-x')).toBe(false)
		expect(second.hasAttribute('data-overflow-y')).toBe(false)
	} finally {
		raf.restore()
	}
})
