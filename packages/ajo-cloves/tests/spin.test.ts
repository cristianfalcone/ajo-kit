// @vitest-environment happy-dom
import type { Host, SpinMove } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { spin } from 'ajo-cloves'

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
	let view: ReturnType<typeof spin> | undefined

	function* Gen(this: Host) {
		view = spin(this, { onMove: () => {} })
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(view!)).toEqual(['handle'])
})

test('resolves every spin key', () => {
	let view: ReturnType<typeof spin> | undefined
	const moves: SpinMove[] = []

	function* Gen(this: Host) {
		view = spin(this, {
			onMove: move => moves.push(move),
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	for (const event of [
		key('ArrowUp'),
		key('ArrowDown'),
		key('PageUp'),
		key('PageDown'),
		key('Home'),
		key('End'),
	]) {
		expect(view!.handle(event)).toBe(true)
		expect(event.defaultPrevented).toBe(true)
	}

	expect(moves).toEqual([
		{ step: 1 },
		{ step: -1 },
		{ page: 1 },
		{ page: -1 },
		{ edge: 'min' },
		{ edge: 'max' },
	])
})

test('unknown keys return false without preventing default or moving', () => {
	let view: ReturnType<typeof spin> | undefined
	const onMove = vi.fn()

	function* Gen(this: Host) {
		view = spin(this, { onMove })
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	const event = key('ArrowLeft')

	expect(view!.handle(event)).toBe(false)
	expect(event.defaultPrevented).toBe(false)
	expect(onMove).not.toHaveBeenCalled()
})

test('invalidate updates DOM text through host.next from onMove', () => {
	let view: ReturnType<typeof spin> | undefined
	let label = 'idle'

	function* Gen(this: Host) {
		view = spin(this, {
			onMove: move => this.next(() => label = 'step' in move ? `step:${move.step}` : 'other'),
		})

		while (true) yield jsx('span', { children: label })
	}

	render(jsx(Gen, {}), document.body)

	view!.handle(key('ArrowUp'))

	expect(document.body.textContent).toBe('step:1')
})

test('teardown makes old handles unable to render after unmount', () => {
	let view: ReturnType<typeof spin> | undefined
	let label = 'idle'

	function* Gen(this: Host) {
		view = spin(this, {
			onMove: () => this.next(() => label = 'moved'),
		})

		while (true) yield jsx('span', { children: label })
	}

	render(jsx(Gen, {}), document.body)
	const old = view!
	render(null, document.body)

	old.handle(key('ArrowUp'))

	expect(document.body.textContent).toBe('')
})

test('reset recreates a fresh working view', () => {
	let host: Host | null = null
	let view: ReturnType<typeof spin> | undefined
	let label = 'idle'
	let created = 0

	function* Gen(this: Host) {
		created++
		view = spin(this, {
			onMove: () => this.next(() => label = 'moved'),
		})

		while (true) yield jsx('span', { children: label })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)
	must(host).return()
	label = 'idle'
	must(host).next()

	view!.handle(key('ArrowUp'))

	expect(created).toBe(2)
	expect(document.body.textContent).toBe('moved')
})

test('SSR resolves recognized keys without DOM access', () => {
	let move: SpinMove | undefined
	let prevented = false

	function* Gen(this: Host) {
		const view = spin(this, {
			onMove: next => move = next,
		})
		const event = key('End')
		const handled = view.handle(event)

		prevented = event.defaultPrevented
		yield jsx('span', { children: handled ? 'server' : 'missed' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
	expect(prevented).toBe(true)
	expect(move).toEqual({ edge: 'max' })
})
