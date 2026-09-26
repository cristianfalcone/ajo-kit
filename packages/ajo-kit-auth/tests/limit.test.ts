import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// The store is module state; each test gets a fresh module.
let limit: typeof import('../src/limit')

const capacity = 10_000

beforeEach(async () => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
	vi.resetModules()
	limit = await import('../src/limit')
})

afterEach(() => {
	vi.useRealTimers()
})

const fill = (prefix: string, count: number) => {
	for (let i = 0; i < count; i++) expect(limit.hit(`${prefix}:${i}`, 5, 1000)).toBe(true)
}

describe('ajo-kit-auth rate limit', () => {
	test('allows max attempts per window, counts refusals and resets after the window', () => {
		expect(limit.hit('login:test', 2, 1000)).toBe(true)
		expect(limit.hit('login:test', 2, 1000)).toBe(true)
		expect(limit.hit('login:test', 2, 1000)).toBe(false)

		vi.advanceTimersByTime(1001)
		expect(limit.hit('login:test', 2, 1000)).toBe(true)

		limit.clear('login:test')
		expect(limit.hit('login:test', 1, 1000)).toBe(true)
		expect(limit.hit('login:test', 1, 1000)).toBe(false)
	})

	test('refuses a new key at capacity while existing keys keep their counts', () => {
		fill('flood', capacity - 1)
		expect(limit.hit('login:owner', 2, 1000)).toBe(true)

		expect(limit.hit('flood:extra', 5, 1000)).toBe(false)
		expect(limit.hit('login:owner', 2, 1000)).toBe(true)
		expect(limit.hit('login:owner', 2, 1000)).toBe(false)
	})

	test('reclaims expired keys that are never revisited and stays within capacity', () => {
		fill('old', capacity)
		expect(limit.hit('new:0', 5, 1000)).toBe(false)

		vi.advanceTimersByTime(1001)
		fill('new', capacity)
		expect(limit.hit('new:extra', 5, 1000)).toBe(false)
	})

	test('sweeps a full store at most once per second', () => {
		expect(limit.hit('short:0', 5, 100)).toBe(true)
		fill('long', capacity - 1)
		expect(limit.hit('new:0', 5, 1000)).toBe(false)

		vi.advanceTimersByTime(101)
		expect(limit.hit('new:1', 5, 1000)).toBe(false)

		vi.advanceTimersByTime(898)
		expect(limit.hit('new:1', 5, 1000)).toBe(false)

		vi.advanceTimersByTime(1)
		expect(limit.hit('new:1', 5, 1000)).toBe(true)
		expect(limit.hit('new:2', 5, 1000)).toBe(false)
	})

	test('stores long keys at a fixed size and clears them', () => {
		const set = vi.spyOn(Map.prototype, 'set')
		const long = `login:${'a'.repeat(100_000)}@example.com`
		expect(limit.hit(long, 1, 1000)).toBe(true)
		expect(limit.hit(long, 1, 1000)).toBe(false)
		expect(limit.hit(`${long}.`, 1, 1000)).toBe(true)

		expect(set.mock.calls.map(([key]) => String(key).length)).toEqual([64, 64])
		set.mockRestore()

		limit.clear(long)
		expect(limit.hit(long, 1, 1000)).toBe(true)
	})
})
