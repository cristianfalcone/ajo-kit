// @vitest-environment happy-dom
import { render } from 'ajo'
import { beforeEach, expect, test, vi } from 'vitest'
import { storage } from 'ajo-cloves'
import { mount, serve } from './harness'

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

/** Mounts a storage view that renders its value. */
const setup = (key: string, fallback: string) =>
	mount(host => storage(host, { key, fallback }), view => view.value).view

beforeEach(() => {
	Object.defineProperty(window, 'localStorage', { configurable: true, value: memory() })
	Object.defineProperty(window, 'sessionStorage', { configurable: true, value: memory() })
})

test('reads fallback, writes strings and invalidates same-tab set', () => {
	const view = setup('unit-theme', 'light')

	expect(document.body.textContent).toBe('light')

	view.set('dark')

	expect(window.localStorage.getItem('unit-theme')).toBe('dark')
	expect(document.body.textContent).toBe('dark')
})

test('storage events re-read the key and render only when its value changed', () => {
	let renders = 0

	mount(host => storage(host, { key: 'unit-cross-tab', fallback: 'light' }), view => {
		renders++
		return view.value
	})

	window.localStorage.setItem('other', 'dark')
	window.dispatchEvent(event({ key: 'other', newValue: 'dark', storageArea: window.localStorage }))
	window.sessionStorage.setItem('unit-cross-tab', 'dark')
	window.dispatchEvent(event({ key: 'unit-cross-tab', newValue: 'dark', storageArea: window.sessionStorage }))

	expect(document.body.textContent).toBe('light')
	expect(renders).toBe(1)

	window.localStorage.setItem('unit-cross-tab', 'dark')
	window.dispatchEvent(event({ key: 'unit-cross-tab', newValue: 'dark', storageArea: window.localStorage }))

	expect(document.body.textContent).toBe('dark')

	window.localStorage.clear()
	window.dispatchEvent(event({ key: null, storageArea: window.localStorage }))

	expect(document.body.textContent).toBe('light')
	expect(renders).toBe(3)
})

test('throwing storage access falls back and write APIs do not crash', () => {
	Object.defineProperty(window, 'localStorage', {
		configurable: true,
		get() {
			throw new Error('blocked')
		},
	})

	const view = setup('unit-throwing', 'fallback')

	expect(document.body.textContent).toBe('fallback')
	expect(() => view.set('next')).not.toThrow()
	expect(document.body.textContent).toBe('next')
	expect(() => window.dispatchEvent(event({ key: 'unit-throwing' }))).not.toThrow()
})

test('retained write methods are inert after lifecycle teardown', () => {
	const retained = setup('unit-retained', 'empty')
	retained.set('ready')
	render(null, document.body)

	retained.set('stale')
	window.localStorage.setItem('unit-retained', 'external')
	window.dispatchEvent(event({ key: 'unit-retained', newValue: 'external', storageArea: window.localStorage }))

	expect(retained.value).toBe('ready')
	expect(window.localStorage.getItem('unit-retained')).toBe('external')
})

test('SSR returns fallback and never writes', () => {
	const setItem = vi.spyOn(window.localStorage, 'setItem')

	expect(serve(host => {
		const view = storage(host, { key: 'unit-server', fallback: 'server' })
		view.set('client')
		return view
	}, view => view.value)).toBe('<div>server</div>')
	expect(setItem).not.toHaveBeenCalled()
})
