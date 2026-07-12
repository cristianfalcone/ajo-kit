// @vitest-environment happy-dom
import type { GridMove, Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { grid } from 'ajo-cloves'

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const must = (value: Host | null): Host => {
	if (value == null) throw new Error('missing value')
	return value
}

const key = (value: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: value,
	...init,
})

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	let view: ReturnType<typeof grid> | undefined

	function* Gen(this: Host) {
		view = grid(this, { onMove: () => {} })
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(view!)).toEqual(['handle'])
})

test('resolves every grid key, including RTL columns and ctrl/shift modifiers', () => {
	let view: ReturnType<typeof grid> | undefined
	let rtl = false
	const moves: GridMove[] = []

	function* Gen(this: Host) {
		view = grid(this, {
			rtl: () => rtl,
			onMove: move => moves.push(move),
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	for (const event of [
		key('ArrowLeft'),
		key('ArrowRight'),
		key('ArrowUp'),
		key('ArrowDown'),
		key('Home'),
		key('End'),
		key('Home', { ctrlKey: true }),
		key('End', { ctrlKey: true }),
		key('PageUp'),
		key('PageDown'),
		key('PageUp', { shiftKey: true }),
		key('PageDown', { shiftKey: true }),
	]) {
		expect(view!.handle(event)).toBe(true)
		expect(event.defaultPrevented).toBe(true)
	}

	rtl = true
	expect(view!.handle(key('ArrowLeft'))).toBe(true)
	expect(view!.handle(key('ArrowRight'))).toBe(true)

	expect(moves).toEqual([
		{ cols: -1 },
		{ cols: 1 },
		{ rows: -1 },
		{ rows: 1 },
		{ edge: 'start', extent: 'row' },
		{ edge: 'end', extent: 'row' },
		{ edge: 'start', extent: 'all' },
		{ edge: 'end', extent: 'all' },
		{ page: -1, large: false },
		{ page: 1, large: false },
		{ page: -1, large: true },
		{ page: 1, large: true },
		{ cols: 1 },
		{ cols: -1 },
	])
})

test('unknown keys return false without preventing default or moving', () => {
	let view: ReturnType<typeof grid> | undefined
	const onMove = vi.fn()

	function* Gen(this: Host) {
		view = grid(this, { onMove })
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	const event = key('Tab')

	expect(view!.handle(event)).toBe(false)
	expect(event.defaultPrevented).toBe(false)
	expect(onMove).not.toHaveBeenCalled()
})

test('invalidate updates DOM text through host.next from onMove', () => {
	let view: ReturnType<typeof grid> | undefined
	let label = 'idle'

	function* Gen(this: Host) {
		view = grid(this, {
			onMove: move => this.next(() => label = 'cols' in move ? `cols:${move.cols}` : 'other'),
		})

		while (true) yield jsx('span', { children: label })
	}

	render(jsx(Gen, {}), document.body)

	view!.handle(key('ArrowRight'))

	expect(document.body.textContent).toBe('cols:1')
})

test('teardown makes old handles unable to render after unmount', () => {
	let view: ReturnType<typeof grid> | undefined
	let label = 'idle'

	function* Gen(this: Host) {
		view = grid(this, {
			onMove: () => this.next(() => label = 'moved'),
		})

		while (true) yield jsx('span', { children: label })
	}

	render(jsx(Gen, {}), document.body)
	const old = view!
	render(null, document.body)

	old.handle(key('ArrowRight'))

	expect(document.body.textContent).toBe('')
})

test('reset recreates a fresh working view', () => {
	let host: Host | null = null
	let view: ReturnType<typeof grid> | undefined
	let label = 'idle'
	let created = 0

	function* Gen(this: Host) {
		created++
		view = grid(this, {
			onMove: () => this.next(() => label = 'moved'),
		})

		while (true) yield jsx('span', { children: label })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)
	must(host).return()
	label = 'idle'
	must(host).next()

	view!.handle(key('ArrowRight'))

	expect(created).toBe(2)
	expect(document.body.textContent).toBe('moved')
})

test('SSR resolves recognized keys without DOM access', () => {
	let move: GridMove | undefined
	let prevented = false

	function* Gen(this: Host) {
		const view = grid(this, {
			onMove: next => move = next,
		})
		const event = key('PageDown', { shiftKey: true })
		const handled = view.handle(event)

		prevented = event.defaultPrevented
		yield jsx('span', { children: handled ? 'server' : 'missed' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
	expect(prevented).toBe(true)
	expect(move).toEqual({ page: 1, large: true })
})
