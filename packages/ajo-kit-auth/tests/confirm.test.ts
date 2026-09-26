import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { check, clear, clearSession, clearToken, clearUser, stamp } from '../src/confirm'

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
})

afterEach(() => {
	for (const user of [123, 456, 789]) clearUser(user)
	vi.useRealTimers()
})

describe('ajo-kit-auth password confirmation', () => {
	test('belongs to the exact credential and expires after three minutes', () => {
		const session = { user: { id: 123 }, session: { id: 'session-a' } } as any
		const other = { user: { id: 123 }, session: { id: 'session-b' } } as any
		const token = { user: { id: 123 }, token: { id: 'token-a', abilities: ['*'], subject: null } } as any
		const mixed = { user: { id: 123 }, session: { id: 'session-a' }, token: { id: 'token-a', abilities: ['*'], subject: null } } as any

		expect(check(session)).toBe(false)

		stamp(session)
		expect(check(session)).toBe(true)
		expect(check(other)).toBe(false)
		expect(check(token)).toBe(false)

		stamp(token)
		expect(check(mixed)).toBe(true)

		vi.advanceTimersByTime(179_999)
		expect(check(session)).toBe(true)

		vi.advanceTimersByTime(1)
		expect(check(session)).toBe(false)
		expect(stamp({ user: { id: 1 } } as any)).toBe(false)
	})

	// Observable only by turning the clock back: a stale stamp that was merely
	// refused, not deleted, would pass again.
	test('check() deletes a stamp it refuses as stale', () => {
		const session = { user: { id: 456 }, session: { id: 'session-c' } } as any

		stamp(session)
		vi.advanceTimersByTime(180_000)
		expect(check(session)).toBe(false)

		vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
		expect(check(session)).toBe(false)
	})

	// A stamp that is never checked again is removed by the next stamp() after
	// it expires; turning the clock back shows it is gone, not merely stale.
	test('stamp() sweeps expired stamps of other credentials', () => {
		const a = { user: { id: 789 }, session: { id: 'session-d' } } as any
		const b = { user: { id: 789 }, session: { id: 'session-e' } } as any

		stamp(a)
		vi.advanceTimersByTime(180_000)
		stamp(b)

		vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
		expect(check(a)).toBe(false)
	})

	test('can be cleared by credential, session, token or user', () => {
		const session = { user: { id: 123 }, session: { id: 'session-a' } } as any
		const token = { user: { id: 123 }, token: { id: 'token-a', abilities: ['*'], subject: null } } as any
		const other = { user: { id: 456 }, session: { id: 'session-c' } } as any

		stamp(session)
		clear(session)
		expect(check(session)).toBe(false)

		stamp(session)
		clearSession(123, 'session-a')
		expect(check(session)).toBe(false)

		stamp(token)
		clearToken(123, 'token-a')
		expect(check(token)).toBe(false)

		stamp(session)
		stamp(token)
		stamp(other)
		clearUser(123)
		expect(check(session)).toBe(false)
		expect(check(token)).toBe(false)
		expect(check(other)).toBe(true)
	})
})
