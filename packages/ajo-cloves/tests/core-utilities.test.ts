// @vitest-environment node
import { afterEach, expect, test } from 'vitest'
import { browser, clamp, remember } from '../src'

const names = ['window', 'document'] as const
type Name = typeof names[number]

const originals = new Map<Name, PropertyDescriptor | undefined>(
	names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
)

const restore = () => {
	for (const name of names) {
		const descriptor = originals.get(name)
		if (descriptor) Object.defineProperty(globalThis, name, descriptor)
		else if (!Reflect.deleteProperty(globalThis, name)) throw new Error(`could not restore global ${name}`)
	}
}

const expose = (name: Name, present: boolean) => {
	if (!Reflect.deleteProperty(globalThis, name)) throw new Error(`could not replace global ${name}`)
	if (present) Object.defineProperty(globalThis, name, {
		configurable: true,
		value: {},
		writable: true,
	})
}

afterEach(restore)

test.each([
	['neither global', false, false, false],
	['window only', true, false, false],
	['document only', false, true, false],
	['both globals', true, true, true],
] as const)('browser returns Window-realm availability for %s', (_label, window, document, expected) => {
	expose('window', window)
	expose('document', document)
	expect(browser()).toBe(expected)
})

test('remember keeps a FIFO-bounded cache without refreshing updated keys', () => {
	const cache = new Map<number, string>()
	for (let index = 0; index < 32; index++) remember(cache, index, String(index))
	remember(cache, 0, 'updated')
	remember(cache, 32, '32')

	expect(cache).toHaveLength(32)
	expect(cache.has(0)).toBe(false)
	expect(cache.get(32)).toBe('32')

	const oversized = new Map([[0, '0'], [1, '1'], [2, '2']])
	remember(oversized, 3, '3', 2)
	expect([...oversized]).toEqual([[2, '2'], [3, '3']])
})

test('remember applies a smaller limit when updating an existing key', () => {
	const cache = new Map([[0, '0'], [1, '1'], [2, '2']])

	remember(cache, 2, 'updated', 2)

	expect([...cache]).toEqual([[1, '1'], [2, 'updated']])
})

test.each([0, -1, 1.5, Number.NaN])('remember rejects invalid cache limit %s', limit => {
	expect(() => remember(new Map(), 'key', 'value', limit)).toThrow(RangeError)
})

test('clamp limits values to an inclusive range', () => {
	expect(clamp(-1, 0, 10)).toBe(0)
	expect(clamp(4, 0, 10)).toBe(4)
	expect(clamp(11, 0, 10)).toBe(10)
})
