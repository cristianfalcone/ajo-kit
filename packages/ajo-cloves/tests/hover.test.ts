// @vitest-environment happy-dom
import { render } from 'ajo'
import { expect, test, vi } from 'vitest'
import { hover } from 'ajo-cloves'
import { mount, serve } from './harness'

const event = () => new Event('hover')

/** Mounts a hover with fake timers and records every open change. */
const setup = (openDelay: number, closeDelay: number) => {
	vi.useFakeTimers()
	const changes: boolean[] = []
	const { view } = mount(host => hover(host, {
		openDelay: () => openDelay,
		closeDelay: () => closeDelay,
		onChange: open => changes.push(open),
	}))
	return { changes, view }
}

test('reacts to open and close delays', () => {
	const { changes, view } = setup(20, 30)

	view.hold('trigger', event())
	vi.advanceTimersByTime(19)

	expect(changes).toEqual([])

	vi.advanceTimersByTime(1)

	expect(changes).toEqual([true])

	view.release('trigger', event())
	vi.advanceTimersByTime(29)

	expect(changes).toEqual([true])

	vi.advanceTimersByTime(1)

	expect(changes).toEqual([true, false])
})

test('zero delays open and close synchronously', () => {
	const { changes, view } = setup(0, 0)

	view.hold('trigger', event())

	expect(changes).toEqual([true])

	view.release('trigger', event())

	expect(changes).toEqual([true, false])
})

test('teardown prevents a pending open from landing', () => {
	const { changes, view } = setup(10, 0)

	view.hold('trigger', event())
	render(null, document.body)

	expect(vi.getTimerCount()).toBe(0)

	vi.advanceTimersByTime(10)

	expect(changes).toEqual([])
})

test('SSR abort cleanup clears pending hover timers', () => {
	vi.useFakeTimers()

	const changes: boolean[] = []

	expect(serve(host => hover(host, {
		openDelay: () => 10,
		closeDelay: () => 0,
		onChange: open => changes.push(open),
	}).hold('trigger', event()))).toBe('<div>server</div>')
	expect(vi.getTimerCount()).toBe(0)
	expect(changes).toEqual([])
})

test('zone, cancel, and sync contracts match surface behavior', () => {
	const { changes, view } = setup(10, 10)

	view.hold('trigger', event())
	vi.advanceTimersByTime(10)
	view.hold('content', event())
	view.release('trigger', event())
	vi.advanceTimersByTime(10)

	expect(changes).toEqual([true])

	view.release('content', event())
	vi.advanceTimersByTime(10)

	expect(changes).toEqual([true, false])

	view.hold('trigger', event())
	view.cancel()
	vi.advanceTimersByTime(10)

	expect(changes).toEqual([true, false])

	view.release('trigger', event())
	view.sync(true)
	view.sync(false)
	view.hold('trigger', event())
	vi.advanceTimersByTime(10)

	expect(changes).toEqual([true, false, true])
})

test('cancel clears held zones before a later interaction', () => {
	const { changes, view } = setup(10, 10)

	view.hold('content', event())
	vi.advanceTimersByTime(10)

	view.cancel()
	view.sync(false)
	view.hold('trigger', event())
	vi.advanceTimersByTime(10)
	view.release('trigger', event())
	vi.advanceTimersByTime(10)

	expect(changes).toEqual([true, true, false])
})
