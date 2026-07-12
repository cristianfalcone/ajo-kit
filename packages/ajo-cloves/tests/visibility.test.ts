// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { visibility } from 'ajo-cloves'

type View = ReturnType<typeof visibility>

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
	document.body.textContent = ''
}

const state = (value: DocumentVisibilityState) => {
	Object.defineProperty(document, 'visibilityState', { configurable: true, value })
	document.dispatchEvent(new Event('visibilitychange'))
}

const missing = () => new Error('missing value')

const needHost = (value: Host | null): Host => {
	if (value == null) throw missing()
	return value
}

const needView = (value: View | undefined): View => {
	if (value == null) throw missing()
	return value
}

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	vi.restoreAllMocks()
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	let view: View | undefined

	function* Gen(this: Host) {
		view = visibility(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(needView(view))).toEqual(['visible'])
})

test('two hosts share the visibility source until the last unsubscribe', () => {
	const add = vi.spyOn(document, 'addEventListener')
	const remove = vi.spyOn(document, 'removeEventListener')
	let hostA: Host | null = null
	let hostB: Host | null = null

	function* Child(this: Host, args: { name: string }) {
		const view = visibility(this)

		while (true) yield jsx('span', { children: `${args.name}:${view.visible ? 'visible' : 'hidden'};` })
	}

	function* Gen(this: Host) {
		yield [
			jsx(Child, { key: 'a', name: 'a', ref: (element: unknown) => hostA = element as Host | null }),
			jsx(Child, { key: 'b', name: 'b', ref: (element: unknown) => hostB = element as Host | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	expect(add.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(1)
	expect(document.body.textContent).toBe('a:visible;b:visible;')

	state('hidden')

	expect(document.body.textContent).toBe('a:hidden;b:hidden;')

	needHost(hostA).return()
	state('visible')

	expect(document.body.textContent).toBe('a:hidden;b:visible;')
	expect(remove.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(0)

	needHost(hostB).return()

	expect(remove.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(1)
})

test('reset recreates a fresh visibility subscription', () => {
	let host: Host | null = null
	let created = 0

	function* Gen(this: Host) {
		created++
		const view = visibility(this)

		while (true) yield jsx('span', { children: view.visible ? 'visible' : 'hidden' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	state('hidden')
	expect(document.body.textContent).toBe('hidden')

	needHost(host).return()
	needHost(host).next()

	expect(created).toBe(2)
	expect(document.body.textContent).toBe('hidden')

	state('visible')

	expect(document.body.textContent).toBe('visible')
})

test('SSR is visible by default', () => {
	function* Gen(this: Host) {
		const view = visibility(this)
		yield jsx('span', { children: view.visible ? 'visible' : 'hidden' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>visible</span></div>')
})
