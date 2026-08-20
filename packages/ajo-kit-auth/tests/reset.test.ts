import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from 'ajo-kit/database'
import * as reset from '../src/reset'
import * as session from '../src/session'
import { setup, teardown } from './database.fixture'

beforeEach(async () => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-06-26T00:00:00.000Z'))
	await setup()
})

afterEach(async () => {
	await teardown()
	vi.useRealTimers()
})

describe('password reset consumption', () => {
	test('consume is single-use and atomically revokes every session, token, and reset', async () => {
		await db<any>().insertInto('users').values({
			id: 1,
			email: 'reset@example.test',
			password: 'old-hash',
		}).execute()
		await session.create(1)
		await session.create(1)
		await db<any>().insertInto('tokens').values([
			{ id: 'token-a', user: 1, name: 'A', abilities: '[]', last: null, expiry: null },
			{ id: 'token-b', user: 1, name: 'B', abilities: '[]', last: null, expiry: null },
		]).execute()
		const plain = await reset.create(1)
		await db<any>().insertInto('resets').values({
			id: 'another-reset',
			user: 1,
			expiry: '2026-06-26T01:00:00.000Z',
		}).execute()

		await expect(reset.validate(plain)).resolves.toBe(1)
		await expect(reset.consume(plain, 'new-hash')).resolves.toBe(1)
		await expect(reset.consume(plain, 'replayed-hash')).resolves.toBeNull()
		await expect(reset.validate(plain)).resolves.toBeNull()
		await expect(db<any>().selectFrom('users').select(['password', 'updated']).where('id', '=', 1)
			.executeTakeFirstOrThrow()).resolves.toEqual({
			password: 'new-hash',
			updated: '2026-06-26T00:00:00.000Z',
		})
		expect(await db<any>().selectFrom('sessions').select('id').execute()).toEqual([])
		expect(await db<any>().selectFrom('tokens').select('id').execute()).toEqual([])
		expect(await db<any>().selectFrom('resets').select('id').execute()).toEqual([])
	})
})
