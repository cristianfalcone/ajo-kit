// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { storage } from 'ajo-cloves'

type View = ReturnType<typeof storage>

const memory = (): Storage => {
	const values = new Map<string, string>()

	return {
		get length() {
			return values.size
		},
		clear() {
			values.clear()
		},
		getItem(key: string) {
			return values.get(key) ?? null
		},
		key(index: number) {
			return [...values.keys()][index] ?? null
		},
		removeItem(key: string) {
			values.delete(key)
		},
		setItem(key: string, value: string) {
			values.set(key, value)
		},
	} as Storage
}

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	Object.defineProperty(window, 'localStorage', { configurable: true, value: memory() })
	Object.defineProperty(window, 'sessionStorage', { configurable: true, value: memory() })
	document.body.textContent = ''
}

const event = (init: {
	key?: string | null
	newValue?: string | null
	storageArea?: Storage | null
}) => {
	const next = new Event('storage') as StorageEvent

	Object.defineProperties(next, {
		key: { configurable: true, value: init.key ?? null },
		newValue: { configurable: true, value: init.newValue ?? null },
		storageArea: { configurable: true, value: init.storageArea ?? null },
	})

	return next
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
		view = storage(this, { key: () => 'unit-shape', fallback: 'empty' })
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(needView(view))).toEqual(['value', 'set', 'remove'])
})

test('reads fallback, writes strings, invalidates same-tab set, and removes to fallback', () => {
	let view: View | undefined

	function* Gen(this: Host) {
		view = storage(this, { key: () => 'unit-theme', fallback: 'light' })

		while (true) yield jsx('span', { children: needView(view).value })
	}

	render(jsx(Gen, {}), document.body)

	expect(document.body.textContent).toBe('light')

	needView(view).set('dark')

	expect(window.localStorage.getItem('unit-theme')).toBe('dark')
	expect(document.body.textContent).toBe('dark')

	needView(view).remove()

	expect(window.localStorage.getItem('unit-theme')).toBeNull()
	expect(document.body.textContent).toBe('light')
})

test('storage events update only the matching key and area', () => {
	let view: View | undefined

	function* Gen(this: Host) {
		view = storage(this, { key: () => 'unit-cross-tab', fallback: 'light' })

		while (true) yield jsx('span', { children: needView(view).value })
	}

	render(jsx(Gen, {}), document.body)

	window.dispatchEvent(event({
		key: 'other',
		newValue: 'dark',
		storageArea: window.localStorage,
	}))

	expect(document.body.textContent).toBe('light')

	window.dispatchEvent(event({
		key: 'unit-cross-tab',
		newValue: 'dark',
		storageArea: window.sessionStorage,
	}))

	expect(document.body.textContent).toBe('light')

	window.dispatchEvent(event({
		key: 'unit-cross-tab',
		newValue: 'dark',
		storageArea: window.localStorage,
	}))

	expect(document.body.textContent).toBe('dark')

	window.dispatchEvent(event({
		key: 'unit-cross-tab',
		newValue: null,
		storageArea: window.localStorage,
	}))

	expect(document.body.textContent).toBe('light')
})

test('live keys read a new storage slot on the next value access', () => {
	let host: Host | null = null
	let key = 'unit-key-a'

	window.localStorage.setItem('unit-key-b', 'b')

	function* Gen(this: Host) {
		const view = storage(this, { key: () => key, fallback: 'fallback' })

		while (true) yield jsx('span', { children: view.value })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	expect(document.body.textContent).toBe('fallback')

	key = 'unit-key-b'
	needHost(host).next()

	expect(document.body.textContent).toBe('b')
})

test('throwing storage access falls back and write APIs do not crash', () => {
	let view: View | undefined

	Object.defineProperty(window, 'localStorage', {
		configurable: true,
		get() {
			throw new Error('blocked')
		},
	})

	function* Gen(this: Host) {
		view = storage(this, { key: () => 'unit-throwing', fallback: 'fallback' })

		while (true) yield jsx('span', { children: needView(view).value })
	}

	expect(() => render(jsx(Gen, {}), document.body)).not.toThrow()
	expect(document.body.textContent).toBe('fallback')
	expect(() => needView(view).set('next')).not.toThrow()
	expect(() => needView(view).remove()).not.toThrow()
})

test('reset recreates a fresh storage view', () => {
	let host: Host | null = null
	let created = 0

	function* Gen(this: Host) {
		created++
		const view = storage(this, { key: () => 'unit-reset', fallback: 'empty' })

		while (true) yield jsx('span', { children: view.value })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	window.localStorage.setItem('unit-reset', 'ready')
	needHost(host).return()
	needHost(host).next()

	expect(created).toBe(2)
	expect(document.body.textContent).toBe('ready')
})

test('SSR returns fallback and never evaluates the key or writes', () => {
	function* Gen(this: Host) {
		const view = storage(this, {
			key: () => {
				throw new Error('key should not run on the server')
			},
			fallback: 'server',
		})

		view.set('client')
		view.remove()

		yield jsx('span', { children: view.value })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
})
