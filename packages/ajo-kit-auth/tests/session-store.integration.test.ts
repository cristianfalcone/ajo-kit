import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from 'ajo-kit/database'
import * as reset from '../src/reset'
import { create, hash, prune, remove, validate } from '../src/session'
import * as token from '../src/token'
import { setup, teardown } from './database.fixture'

const { credential } = vi.hoisted(() => ({
	credential: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',
}))

vi.mock('ajo-kit/platform', async importOriginal => ({
	...await importOriginal<typeof import('ajo-kit/platform')>(),
	randomBase64Url: (bytes: number) => {
		if (bytes !== 32) throw new Error(`Unexpected credential size: ${bytes}`)
		return credential
	},
}))

const stored = 'ea866a757e4c38babfa8127cbe9a409d3e1f93a00ff1488ff735fcf917afffd0'

beforeEach(setup)

afterEach(async () => {
	vi.useRealTimers()
	await teardown()
})

describe('ajo-kit-auth session store integration', () => {
	test('stores hashed session ids and validates only plaintext cookie values', async () => {
		const user = await db<any>()
			.insertInto('users')
			.values({
				name: 'Session User',
				email: 'session@example.com',
				password: null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()

		const plain = await create(user.id)
		const stored = await db<any>()
			.selectFrom('sessions')
			.select(['id', 'user'])
			.executeTakeFirstOrThrow()

		expect(stored.id).toBe(hash(plain))
		expect(stored.id).not.toBe(plain)

		await expect(validate(plain)).resolves.toMatchObject({
			id: stored.id,
			user: user.id,
		})
		await expect(validate(stored.id)).resolves.toBeNull()

		await remove(plain)
		await expect(validate(plain)).resolves.toBeNull()
	})

	test('pins the shared session, token, and reset credential vector', async () => {
		const user = await db<any>()
			.insertInto('users')
			.values({
				name: 'Vector User',
				email: 'vector@example.com',
				password: null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()

		expect(await create(user.id)).toBe(credential)
		expect(await token.create(user.id, 'Vector', [])).toBe(credential)
		expect(await reset.create(user.id)).toBe(credential)
		expect(hash(credential)).toBe(stored)

		await expect(db<any>().selectFrom('sessions').select('id').executeTakeFirstOrThrow()).resolves.toEqual({ id: stored })
		await expect(db<any>().selectFrom('tokens').select('id').executeTakeFirstOrThrow()).resolves.toEqual({ id: stored })
		await expect(db<any>().selectFrom('resets').select('id').executeTakeFirstOrThrow()).resolves.toEqual({ id: stored })
	})

	test('validation touches stale activity at a throttled pace', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))

		const user = await db<any>()
			.insertInto('users')
			.values({
				name: 'Active User',
				email: 'active@example.com',
				password: null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()
		const plain = await create(user.id)
		const id = hash(plain)
		const last = async () => db<any>()
			.selectFrom('sessions')
			.select('last')
			.where('id', '=', id)
			.executeTakeFirstOrThrow()

		await db<any>()
			.updateTable('sessions')
			.set({
				last: '2026-06-18T23:54:00.000Z',
				created: '2026-06-18T23:54:00.000Z',
			})
			.where('id', '=', id)
			.execute()

		await validate(plain, false)
		expect((await last()).last).toBe('2026-06-18T23:54:00.000Z')

		await expect(validate(plain)).resolves.toMatchObject({
			id,
			user: user.id,
			last: '2026-06-19T00:00:00.000Z',
		})
		expect((await last()).last).toBe('2026-06-19T00:00:00.000Z')

		vi.setSystemTime(new Date('2026-06-19T00:04:59Z'))
		await validate(plain)
		expect((await last()).last).toBe('2026-06-19T00:00:00.000Z')

		vi.setSystemTime(new Date('2026-06-19T00:05:01Z'))
		await validate(plain)
		expect((await last()).last).toBe('2026-06-19T00:05:01.000Z')
	})

	test('pruning removes absolute and idle expired rows', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:40:00Z'))

		const user = await db<any>()
			.insertInto('users')
			.values({
				name: 'Prune User',
				email: 'prune@example.com',
				password: null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()

		await db<any>().insertInto('sessions').values([
			{
				id: 'active',
				user: user.id,
				expiry: '2026-06-20T00:00:00.000Z',
				ip: null,
				agent: null,
				last: '2026-06-19T00:30:00.000Z',
				created: '2026-06-19T00:00:00.000Z',
			},
			{
				id: 'idle',
				user: user.id,
				expiry: '2026-06-20T00:00:00.000Z',
				ip: null,
				agent: null,
				last: '2026-06-19T00:09:00.000Z',
				created: '2026-06-19T00:00:00.000Z',
			},
			{
				id: 'legacy',
				user: user.id,
				expiry: '2026-06-20T00:00:00.000Z',
				ip: null,
				agent: null,
				last: null,
				created: '2026-06-19T00:09:00.000Z',
			},
			{
				id: 'absolute',
				user: user.id,
				expiry: '2026-06-19T00:39:00.000Z',
				ip: null,
				agent: null,
				last: '2026-06-19T00:30:00.000Z',
				created: '2026-06-19T00:00:00.000Z',
			},
		]).execute()

		await prune()

		const rows = await db<any>()
			.selectFrom('sessions')
			.select('id')
			.orderBy('id')
			.execute()

		expect(rows).toEqual([{ id: 'active' }])
	})
})
