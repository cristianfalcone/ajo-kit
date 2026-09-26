// @vitest-environment happy-dom
import { expect, test, vi } from 'vitest'
import { frame } from 'ajo-cloves'
import { frames } from './harness'

test('collapses many calls in one animation frame into one run', () => {
	const raf = frames()
	const fn = vi.fn()
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
})

test('cancel prevents a pending frame from running', () => {
	const raf = frames()
	const fn = vi.fn()
	const run = frame(fn)

	run()
	run.cancel()
	raf.flush()

	expect(fn).not.toHaveBeenCalled()
	expect(raf.cancelled).toEqual([1])
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
