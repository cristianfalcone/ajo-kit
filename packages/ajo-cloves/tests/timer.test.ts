// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { timer } from 'ajo-cloves'

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const must = (value: Host | null): Host => {
	if (value == null) throw new Error('missing value')
	return value
}

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	vi.useRealTimers()
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	let view: ReturnType<typeof timer> | undefined

	function* Gen(this: Host) {
		view = timer(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(view!)).toEqual(['start', 'stop', 'pause', 'resume', 'running', 'remaining'])
})

test('reacts by firing once after the requested delay', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof timer> | undefined
	const fn = vi.fn()

	function* Gen(this: Host) {
		view = timer(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	view!.start(100, fn)

	expect(view!.running).toBe(true)
	expect(view!.remaining).toBe(100)

	vi.advanceTimersByTime(99)

	expect(fn).not.toHaveBeenCalled()
	expect(view!.remaining).toBe(1)

	vi.advanceTimersByTime(1)

	expect(fn).toHaveBeenCalledTimes(1)
	expect(view!.running).toBe(false)
	expect(view!.remaining).toBe(0)
})

test('starting again replaces the pending task and restarts the delay', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof timer> | undefined
	const first = vi.fn()
	const second = vi.fn()

	function* Gen(this: Host) {
		view = timer(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	view!.start(100, first)
	vi.advanceTimersByTime(60)
	view!.start(100, second)
	vi.advanceTimersByTime(99)

	expect(first).not.toHaveBeenCalled()
	expect(second).not.toHaveBeenCalled()
	expect(view!.remaining).toBe(1)

	vi.advanceTimersByTime(1)

	expect(first).not.toHaveBeenCalled()
	expect(second).toHaveBeenCalledTimes(1)
	expect(view!.running).toBe(false)
})

test('stop cancels a pending task and resets its public state', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof timer> | undefined
	const fn = vi.fn()

	function* Gen(this: Host) {
		view = timer(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	view!.start(100, fn)
	vi.advanceTimersByTime(40)
	view!.stop()

	expect(view!.running).toBe(false)
	expect(view!.remaining).toBe(0)

	vi.advanceTimersByTime(100)

	expect(fn).not.toHaveBeenCalled()
})

test('pause freezes remaining time and resume continues it', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof timer> | undefined
	const fn = vi.fn()

	function* Gen(this: Host) {
		view = timer(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	view!.start(100, fn)
	vi.advanceTimersByTime(40)
	view!.pause()

	expect(view!.running).toBe(false)
	expect(view!.remaining).toBe(60)

	vi.advanceTimersByTime(100)

	expect(fn).not.toHaveBeenCalled()
	expect(view!.remaining).toBe(60)

	view!.resume()
	vi.advanceTimersByTime(59)

	expect(fn).not.toHaveBeenCalled()

	vi.advanceTimersByTime(1)

	expect(fn).toHaveBeenCalledTimes(1)
})

test('resume runs a paused task whose deadline has elapsed', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof timer> | undefined
	const fn = vi.fn()

	function* Gen(this: Host) {
		view = timer(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)
	const due = Date.now() + 100
	view!.start(100, fn)
	vi.setSystemTime(due)
	view!.pause()

	expect(view!.remaining).toBe(0)
	view!.resume()
	vi.runOnlyPendingTimers()

	expect(fn).toHaveBeenCalledTimes(1)
	expect(view!.running).toBe(false)
})

test('invalidate updates DOM text through host.next from the timer callback', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof timer> | undefined
	let host: Host | null = null
	let text = 'waiting'

	function* Gen(this: Host) {
		view = timer(this)

		while (true) yield jsx('span', { children: text })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	view!.start(10, () => must(host).next(() => text = 'done'))
	vi.advanceTimersByTime(10)

	expect(document.body.textContent).toBe('done')
})

test('teardown clears a pending timer on unmount', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof timer> | undefined
	const fn = vi.fn()

	function* Gen(this: Host) {
		view = timer(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)
	view!.start(10, fn)
	render(null, document.body)

	expect(vi.getTimerCount()).toBe(0)

	vi.advanceTimersByTime(10)

	expect(fn).not.toHaveBeenCalled()
})

test('a stale timer view cannot start work after host teardown', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof timer> | undefined
	const fn = vi.fn()

	function* Gen(this: Host) {
		view = timer(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)
	const stale = view!
	render(null, document.body)

	stale.start(10, fn)

	expect(stale.running).toBe(false)
	expect(stale.remaining).toBe(0)
	expect(vi.getTimerCount()).toBe(0)

	vi.advanceTimersByTime(10)
	expect(fn).not.toHaveBeenCalled()
})

test('an old timer view cannot start work after its host resets', () => {
	vi.useFakeTimers()

	let host: Host | null = null
	let view: ReturnType<typeof timer> | undefined
	const fn = vi.fn()

	function* Gen(this: Host) {
		view = timer(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)
	const stale = view!
	must(host).return()
	must(host).next()

	stale.start(10, fn)

	expect(stale.running).toBe(false)
	expect(stale.remaining).toBe(0)
	expect(vi.getTimerCount()).toBe(0)

	vi.advanceTimersByTime(10)
	expect(fn).not.toHaveBeenCalled()
})

test('reset clears old timers and recreates a working timer', () => {
	vi.useFakeTimers()

	let host: Host | null = null
	let view: ReturnType<typeof timer> | undefined
	const calls: string[] = []

	function* Gen(this: Host) {
		view = timer(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	const first = view!
	first.start(10, () => calls.push('old'))
	must(host).return()
	must(host).next()

	vi.advanceTimersByTime(10)

	expect(calls).toEqual([])

	view!.start(10, () => calls.push('new'))
	vi.advanceTimersByTime(10)

	expect(calls).toEqual(['new'])
})

test('SSR abort cleanup clears timers created during render', () => {
	vi.useFakeTimers()

	const fn = vi.fn()

	function* Gen(this: Host) {
		const view = timer(this)
		view.start(10, fn)

		yield jsx('span', { children: 'server' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
	expect(vi.getTimerCount()).toBe(0)
})
