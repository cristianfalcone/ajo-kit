import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { check, clear, clearUser, stamp } from '../src/confirm'

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
})

afterEach(() => {
	clearUser(123)
	vi.useRealTimers()
})

describe('ajo-kit-auth password confirmation', () => {
	test('expires and can be cleared by credential or user', () => {
		const session = { user: { id: 123 }, session: { id: 'session-a' } } as any
		const other = { user: { id: 123 }, session: { id: 'session-b' } } as any
		const token = { user: { id: 123 }, token: { id: 'token-a', abilities: ['*'] } } as any
		const mixed = { user: { id: 123 }, session: { id: 'session-a' }, token: { id: 'token-a', abilities: ['*'] } } as any

		expect(check(session, 1000)).toBe(false)

		stamp(session)
		expect(check(session, 1000)).toBe(true)
		expect(check(other, 1000)).toBe(false)
		expect(check(token, 1000)).toBe(false)

		vi.advanceTimersByTime(1001)
		expect(check(session, 1000)).toBe(false)

		stamp(token)
		expect(check(token, 1000)).toBe(true)
		expect(check(mixed, 1000)).toBe(true)
		clear(token)
		expect(check(token, 1000)).toBe(false)

		stamp(session)
		stamp({ user: { id: 456 }, session: { id: 'session-c' } } as any)
		clearUser(123)
		expect(check(session, 1000)).toBe(false)
		expect(check({ user: { id: 456 }, session: { id: 'session-c' } } as any, 1000)).toBe(true)
	})
})
