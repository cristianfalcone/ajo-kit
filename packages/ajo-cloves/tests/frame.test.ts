// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'
import { frame } from 'ajo-cloves'

type RafStub = {
	cancelled: number[]
	flush(): void
	restore(): void
}

const installRaf = (): RafStub => {
	const callbacks = new Map<number, FrameRequestCallback>()
	const originalRaf = globalThis.requestAnimationFrame
	const originalCancel = globalThis.cancelAnimationFrame
	let next = 1

	Object.defineProperty(globalThis, 'requestAnimationFrame', {
		configurable: true,
		value: (callback: FrameRequestCallback) => {
			const id = next++
			callbacks.set(id, callback)
			return id
		},
	})

	const cancelled: number[] = []

	Object.defineProperty(globalThis, 'cancelAnimationFrame', {
		configurable: true,
		value: (id: number) => {
			cancelled.push(id)
			callbacks.delete(id)
		},
	})

	return {
		cancelled,
		flush() {
			const pending = [...callbacks]
			callbacks.clear()
			for (const [id, callback] of pending) callback(id)
		},
		restore() {
			Object.defineProperty(globalThis, 'requestAnimationFrame', {
				configurable: true,
				value: originalRaf,
			})
			Object.defineProperty(globalThis, 'cancelAnimationFrame', {
				configurable: true,
				value: originalCancel,
			})
		},
	}
}

afterEach(() => {
	vi.unstubAllGlobals()
})

test('shape is a callable scheduler with cancel', () => {
	const run = frame(() => {})

	expect(typeof run).toBe('function')
	expect(Object.keys(run)).toEqual(['cancel'])
})

test('collapses many calls in one animation frame into one run', () => {
	const raf = installRaf()
	const fn = vi.fn()

	try {
		const run = frame(fn)

		run()
		run()
		run()

		expect(fn).not.toHaveBeenCalled()

		raf.flush()

		expect(fn).toHaveBeenCalledTimes(1)

		run()
		raf.flush()

		expect(fn).toHaveBeenCalledTimes(2)
	} finally {
		raf.restore()
	}
})

test('cancel prevents a pending frame from running', () => {
	const raf = installRaf()
	const fn = vi.fn()

	try {
		const run = frame(fn)

		run()
		run.cancel()
		raf.flush()

		expect(fn).not.toHaveBeenCalled()
		expect(raf.cancelled).toEqual([1])
	} finally {
		raf.restore()
	}
})

test('runs synchronously and cancels as a no-op when requestAnimationFrame is absent', () => {
	vi.stubGlobal('requestAnimationFrame', undefined)
	vi.stubGlobal('cancelAnimationFrame', undefined)

	const fn = vi.fn()
	const run = frame(fn)

	run()
	run()
	run.cancel()

	expect(fn).toHaveBeenCalledTimes(2)
})
