import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from 'ajo-kit/database'
import { create as sessionCreate, hash as sessionHash, remove as sessionRemove } from '../src/session'
import { create as tokenCreate } from '../src/token'
import { session } from '../src/wares'
import { setup, teardown } from './database.fixture'

beforeEach(setup)

afterEach(async () => {
	vi.useRealTimers()
	await teardown()
})

describe('ajo-kit-auth session middleware integration', () => {
	test('exposes validated credential ids', async () => {
		const user = await db<any>()
			.insertInto('users')
			.values({
				name: 'Credential User',
				email: 'credential@example.com',
				password: null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()
		const find = async (id: number) => ({
			id,
			name: 'Credential User',
			email: 'credential@example.com',
			verified: null,
			roles: [],
			abilities: [],
		})
		const middleware = session(find)
		const res = { setHeader: vi.fn() }

		const plain = await sessionCreate(user.id)
		const req = {
			path: '/dashboard',
			headers: { cookie: 'session=' + plain },
		} as any
		let next = false

		await middleware(req, res as any, (() => { next = true }) as any)

		expect(next).toBe(true)
		expect(req.user.id).toBe(user.id)
		expect(req.session.id).toBe(sessionHash(plain))

		const role = await db<any>()
			.insertInto('roles')
			.values({ name: 'token-reader', abilities: '["tokens:read"]' })
			.returning('id')
			.executeTakeFirstOrThrow()
		await db<any>().insertInto('members').values({ user: user.id, role: role.id }).execute()

		const secret = await tokenCreate(user.id, 'Unit API', ['tokens:read'])
		const id = createHash('sha256').update(secret).digest('hex')
		const api = {
			path: '/api/me',
			headers: {
				authorization: 'Bearer ' + secret,
				cookie: 'session=' + plain,
			},
		} as any
		let done = false

		await middleware(api, res as any, (() => { done = true }) as any)

		expect(done).toBe(true)
		expect(api.user.id).toBe(user.id)
		expect(api.token).toEqual({ id, abilities: ['tokens:read'] })
		expect(api.session).toBeUndefined()

		await sessionRemove(plain)
		let expired = false

		await middleware(req, res as any, (() => { expired = true }) as any)

		expect(expired).toBe(true)
		expect(req.user).toBeUndefined()
		expect(req.session).toBeUndefined()
		expect(req.token).toBeUndefined()

		await db<any>().deleteFrom('tokens').where('id', '=', id).execute()
		let revoked = false

		await middleware(api, res as any, (() => { revoked = true }) as any)

		expect(revoked).toBe(true)
		expect(api.user).toBeUndefined()
		expect(api.token).toBeUndefined()
		expect(api.session).toBeUndefined()
	})

	test('default resolver loads compact role ability bundles', async () => {
		const user = await db<any>()
			.insertInto('users')
			.values({
				name: 'Ability User',
				email: 'ability@example.com',
				password: null,
				verified: null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()
		const roles = await db<any>()
			.insertInto('roles')
			.values([
				{ name: 'user', abilities: JSON.stringify(['tokens:read', 'tokens:*', 'sessions:read']) },
				{ name: 'admin', abilities: 'not-json' },
			])
			.returning(['id', 'name'])
			.execute()

		await db<any>().insertInto('members').values(
			roles.map(role => ({ user: user.id, role: role.id }))
		).execute()

		const middleware = session()
		const res = { setHeader: vi.fn() }
		const plain = await sessionCreate(user.id)
		const req = {
			path: '/dashboard',
			headers: { cookie: 'session=' + plain },
		} as any
		let next = false

		await middleware(req, res as any, (() => { next = true }) as any)

		expect(next).toBe(true)
		expect(req.user).toMatchObject({
			id: user.id,
			name: 'Ability User',
			email: 'ability@example.com',
			roles: ['user', 'admin'],
			abilities: ['tokens:*', 'sessions:read'],
		})
	})

	test('rejects idle sessions and clears their cookie', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:31:00Z'))

		const user = await db<any>()
			.insertInto('users')
			.values({
				name: 'Idle User',
				email: 'idle@example.com',
				password: null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()
		const plain = 'idle-session'
		const id = sessionHash(plain)
		const find = async () => ({
			id: user.id,
			name: 'Idle User',
			email: 'idle@example.com',
			verified: null,
			roles: [],
			abilities: [],
		})
		const middleware = session(find)
		const res = { setHeader: vi.fn() }
		const req = {
			path: '/dashboard',
			headers: { cookie: 'session=' + plain },
		} as any
		let next = false

		await db<any>().insertInto('sessions').values({
			id,
			user: user.id,
			expiry: '2026-06-20T00:00:00.000Z',
			ip: null,
			agent: null,
			last: '2026-06-19T00:00:00.000Z',
			created: '2026-06-19T00:00:00.000Z',
		}).execute()

		await middleware(req, res as any, (() => { next = true }) as any)

		const stored = await db<any>()
			.selectFrom('sessions')
			.select('id')
			.where('id', '=', id)
			.executeTakeFirst()

		expect(next).toBe(true)
		expect(req.user).toBeUndefined()
		expect(req.session).toBeUndefined()
		expect(stored).toBeUndefined()
		expect(res.setHeader).toHaveBeenCalledWith(
			'Set-Cookie',
			'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
		)
	})
})
