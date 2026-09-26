// @vitest-environment node
import { expect, test } from 'vitest'
import { browser, clamp, id, remember } from '../src'

test('browser is false without Window and Document', () => {
	expect(browser()).toBe(false)
})

test('remember keeps at most 32 keys, first in first out, without refreshing updated keys', () => {
	const cache = new Map<number, string>()
	for (let index = 0; index < 32; index++) remember(cache, index, String(index))
	remember(cache, 0, 'updated')
	remember(cache, 32, '32')

	expect(cache).toHaveLength(32)
	expect(cache.has(0)).toBe(false)
	expect(cache.get(32)).toBe('32')

	for (let index = 33; index < 100; index++) remember(cache, index, String(index))

	expect([...cache.keys()]).toEqual(Array.from({ length: 32 }, (_, index) => index + 68))
})

test('clamp limits values to an inclusive range', () => {
	expect(clamp(-1, 0, 10)).toBe(0)
	expect(clamp(4, 0, 10)).toBe(4)
	expect(clamp(11, 0, 10)).toBe(10)
})

test('id counts monotonically per prefix', () => {
	expect(id('clove-id-a')).toBe('clove-id-a-1')
	expect(id('clove-id-a')).toBe('clove-id-a-2')
	expect(id('clove-id-b')).toBe('clove-id-b-1')
	expect(id('clove-id-a')).toBe('clove-id-a-3')
})
