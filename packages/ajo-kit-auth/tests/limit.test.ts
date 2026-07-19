import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { check, clear, hit, remaining } from '../src/limit'

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
})

afterEach(() => {
	clear('login:test')
	vi.useRealTimers()
})

describe('ajo-kit-auth rate limit', () => {
	test('check, hit, remaining and reset follow the configured window', () => {
		expect(check('login:test', 2)).toBe(true)
		expect(remaining('login:test', 2)).toBe(2)

		hit('login:test', 1000)
		expect(remaining('login:test', 2)).toBe(1)
		expect(check('login:test', 2)).toBe(true)

		hit('login:test', 1000)
		expect(remaining('login:test', 2)).toBe(0)
		expect(check('login:test', 2)).toBe(false)

		vi.advanceTimersByTime(1001)
		expect(check('login:test', 2)).toBe(true)
		expect(remaining('login:test', 2)).toBe(2)
	})
})
