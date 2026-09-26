// @vitest-environment happy-dom
import { render } from 'ajo'
import { expect, test, vi } from 'vitest'
import { timer } from 'ajo-cloves'
import { mount, serve } from './harness'

/** Mounts a timer under fake timers. */
const setup = () => {
	vi.useFakeTimers()
	return mount(timer).view
}

test('reacts by firing once after the requested delay', () => {
	const view = setup()
	const fn = vi.fn()

	view.start(100, fn)

	expect(view.running).toBe(true)

	vi.advanceTimersByTime(99)

	expect(fn).not.toHaveBeenCalled()

	vi.advanceTimersByTime(1)

	expect(fn).toHaveBeenCalledTimes(1)
	expect(view.running).toBe(false)
})

test('starting again replaces the pending task and restarts the delay', () => {
	const view = setup()
	const first = vi.fn()
	const second = vi.fn()

	view.start(100, first)
	vi.advanceTimersByTime(60)
	view.start(100, second)
	vi.advanceTimersByTime(99)

	expect(first).not.toHaveBeenCalled()
	expect(second).not.toHaveBeenCalled()

	vi.advanceTimersByTime(1)

	expect(first).not.toHaveBeenCalled()
	expect(second).toHaveBeenCalledTimes(1)
	expect(view.running).toBe(false)
})

test('stop cancels a pending task', () => {
	const view = setup()
	const fn = vi.fn()

	view.start(100, fn)
	vi.advanceTimersByTime(40)
	view.stop()

	expect(view.running).toBe(false)

	vi.advanceTimersByTime(100)

	expect(fn).not.toHaveBeenCalled()
})

test('unmount clears a pending timer and a retained view cannot start new work', () => {
	const view = setup()
	const fn = vi.fn()

	view.start(10, fn)
	render(null, document.body)

	expect(vi.getTimerCount()).toBe(0)

	view.start(10, fn)

	expect(view.running).toBe(false)
	expect(vi.getTimerCount()).toBe(0)

	vi.advanceTimersByTime(10)

	expect(fn).not.toHaveBeenCalled()
})

test('SSR abort cleanup clears timers created during render', () => {
	vi.useFakeTimers()

	expect(serve(host => timer(host).start(10, vi.fn()))).toBe('<div>server</div>')
	expect(vi.getTimerCount()).toBe(0)
})
