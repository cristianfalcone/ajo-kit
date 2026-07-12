// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { hover } from 'ajo-cloves'

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const must = (value: Host | null): Host => {
	if (value == null) throw new Error('missing value')
	return value
}

const event = () => new Event('hover')

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	vi.useRealTimers()
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	let view: ReturnType<typeof hover> | undefined

	function* Gen(this: Host) {
		view = hover(this, { onChange: () => {} })
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(view!)).toEqual(['open', 'hold', 'release', 'sync', 'cancel'])
})

test('reacts to open and close delays', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof hover> | undefined
	const changes: boolean[] = []

	function* Gen(this: Host) {
		view = hover(this, {
			openDelay: () => 20,
			closeDelay: () => 30,
			onChange: open => changes.push(open),
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	view!.hold('trigger', event())

	expect(view!.open).toBe(false)
	expect(changes).toEqual([])

	vi.advanceTimersByTime(20)

	expect(view!.open).toBe(true)
	expect(changes).toEqual([true])

	view!.release('trigger', event())
	vi.advanceTimersByTime(29)

	expect(view!.open).toBe(true)

	vi.advanceTimersByTime(1)

	expect(view!.open).toBe(false)
	expect(changes).toEqual([true, false])
})

test('invalidate updates DOM text through host.next from onChange', () => {
	let view: ReturnType<typeof hover> | undefined
	let label = 'closed'

	function* Gen(this: Host) {
		view = hover(this, {
			onChange: open => this.next(() => label = open ? 'open' : 'closed'),
		})

		while (true) yield jsx('span', { children: label })
	}

	render(jsx(Gen, {}), document.body)

	view!.hold('trigger', event())

	expect(document.body.textContent).toBe('open')

	view!.release('trigger', event())

	expect(document.body.textContent).toBe('closed')
})

test('teardown prevents a pending open from landing', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof hover> | undefined
	const changes: boolean[] = []

	function* Gen(this: Host) {
		view = hover(this, {
			openDelay: () => 10,
			onChange: open => changes.push(open),
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)
	view!.hold('trigger', event())
	render(null, document.body)

	expect(vi.getTimerCount()).toBe(0)

	vi.advanceTimersByTime(10)

	expect(changes).toEqual([])
})

test('reset clears old pending work and recreates a working hover', () => {
	vi.useFakeTimers()

	let host: Host | null = null
	let view: ReturnType<typeof hover> | undefined
	const changes: string[] = []

	function* Gen(this: Host) {
		view = hover(this, {
			openDelay: () => 10,
			onChange: open => changes.push(open ? 'open' : 'closed'),
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	const first = view!
	first.hold('trigger', event())
	must(host).return()
	must(host).next()

	vi.advanceTimersByTime(10)

	expect(changes).toEqual([])

	view!.hold('trigger', event())
	vi.advanceTimersByTime(10)

	expect(changes).toEqual(['open'])
})

test('SSR abort cleanup clears pending hover timers', () => {
	vi.useFakeTimers()

	const changes: boolean[] = []

	function* Gen(this: Host) {
		const view = hover(this, {
			openDelay: () => 10,
			onChange: open => changes.push(open),
		})

		view.hold('trigger', event())

		yield jsx('span', { children: view.open ? 'open' : 'closed' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>closed</span></div>')
	expect(vi.getTimerCount()).toBe(0)
	expect(changes).toEqual([])
})

test('zone, cancel, and sync contracts match surface behavior', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof hover> | undefined
	const changes: boolean[] = []

	function* Gen(this: Host) {
		view = hover(this, {
			openDelay: () => 10,
			closeDelay: () => 10,
			onChange: open => changes.push(open),
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	view!.hold('trigger', event())
	vi.advanceTimersByTime(10)
	view!.hold('content', event())
	view!.release('trigger', event())
	vi.advanceTimersByTime(10)

	expect(view!.open).toBe(true)
	expect(changes).toEqual([true])

	view!.release('content', event())
	vi.advanceTimersByTime(10)

	expect(view!.open).toBe(false)
	expect(changes).toEqual([true, false])

	view!.hold('trigger', event())
	view!.cancel()
	vi.advanceTimersByTime(10)

	expect(changes).toEqual([true, false])

	view!.release('trigger', event())
	view!.sync(true)
	view!.sync(false)
	view!.hold('trigger', event())
	vi.advanceTimersByTime(10)

	expect(view!.open).toBe(true)
	expect(changes).toEqual([true, false, true])
})
