// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { hotkey } from 'ajo-cloves'

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

test('mod+b matches ctrl+b and meta+b', () => {
	const fn = vi.fn()

	function* Gen(this: Host) {
		hotkey(this, {
			keys: () => 'mod+b',
			onPress: fn,
		})

		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	window.dispatchEvent(key('b', { ctrlKey: true }))
	window.dispatchEvent(key('B', { metaKey: true }))

	expect(fn).toHaveBeenCalledTimes(2)
})

test('plain key without modifiers does not match mod+b', () => {
	const fn = vi.fn()

	function* Gen(this: Host) {
		hotkey(this, {
			keys: () => 'mod+b',
			onPress: fn,
		})

		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)
	window.dispatchEvent(key('b'))

	expect(fn).not.toHaveBeenCalled()
})

test('extra modifiers do not match mod+b', () => {
	const fn = vi.fn()

	function* Gen(this: Host) {
		hotkey(this, {
			keys: () => 'mod+b',
			onPress: fn,
		})

		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)
	window.dispatchEvent(key('b', { ctrlKey: true, shiftKey: true }))
	window.dispatchEvent(key('b', { ctrlKey: true, metaKey: true }))

	expect(fn).not.toHaveBeenCalled()
})

test('F8 matches case-insensitively without modifiers', () => {
	const fn = vi.fn()

	function* Gen(this: Host) {
		hotkey(this, {
			keys: () => 'f8',
			onPress: fn,
		})

		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)
	window.dispatchEvent(key('F8'))

	expect(fn).toHaveBeenCalledTimes(1)
})

test('active false blocks matched keys before preventing default', () => {
	const fn = vi.fn()

	function* Gen(this: Host) {
		hotkey(this, {
			keys: () => 'mod+b',
			active: () => false,
			onPress: fn,
		})

		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	const event = key('b', { ctrlKey: true })
	window.dispatchEvent(event)

	expect(fn).not.toHaveBeenCalled()
	expect(event.defaultPrevented).toBe(false)
})

test('prevent defaults to true on match', () => {
	const fn = vi.fn()

	function* Gen(this: Host) {
		hotkey(this, {
			keys: () => 'mod+b',
			onPress: fn,
		})

		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	const event = key('b', { ctrlKey: true })
	window.dispatchEvent(event)

	expect(event.defaultPrevented).toBe(true)
	expect(fn).toHaveBeenCalledTimes(1)
})

test('prevent false leaves a matched event alone', () => {
	const fn = vi.fn()

	function* Gen(this: Host) {
		hotkey(this, {
			keys: () => 'mod+b',
			prevent: false,
			onPress: fn,
		})

		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	const event = key('b', { ctrlKey: true })
	window.dispatchEvent(event)

	expect(event.defaultPrevented).toBe(false)
	expect(fn).toHaveBeenCalledTimes(1)
})

test('unmount removes the global listener', () => {
	const fn = vi.fn()

	function* Gen(this: Host) {
		hotkey(this, {
			keys: () => 'mod+b',
			onPress: fn,
		})

		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)
	render(null, document.body)
	window.dispatchEvent(key('b', { ctrlKey: true }))

	expect(fn).not.toHaveBeenCalled()
})

test('reset re-arms the global listener', () => {
	let host: Host | null = null
	const fn = vi.fn()

	function* Gen(this: Host) {
		hotkey(this, {
			keys: () => 'mod+b',
			onPress: fn,
		})

		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	window.dispatchEvent(key('b', { ctrlKey: true }))
	must(host).return()
	must(host).next()
	window.dispatchEvent(key('b', { ctrlKey: true }))

	expect(fn).toHaveBeenCalledTimes(2)
})

test('SSR renders without installing or parsing shortcuts', () => {
	function* Gen(this: Host) {
		hotkey(this, {
			keys: () => {
				throw new Error('keys should not run on the server')
			},
			onPress: () => {},
		})

		yield jsx('span', { children: 'server' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
})
