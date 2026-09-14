import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from 'ajo-kit/database'
import { admit, authorize } from '../src/guard'
import { session } from '../src/wares'
import { create, revoke } from '../src/token'
import { hash } from '../src/session'
import * as team from '../src/team'
import { setup, teardown } from './database.fixture'

let alpha: number

beforeEach(async () => {
	await setup()
	await db<any>().insertInto('users').values([
		{ id: 1, email: 'developer@example.test' },
		{ id: 2, email: 'owner@example.test' },
	]).execute()
	await db<any>().insertInto('roles').values([
		{ id: 1, name: 'account', abilities: '["profile:read"]' },
		{ id: 2, name: 'owner', abilities: '["*"]' },
		{ id: 3, name: 'developer', abilities: '["apps:deploy","apps:view"]' },
	]).execute()
	await db<any>().insertInto('members').values([
		{ user: 1, role: 1 },
		{ user: 2, role: 2 },
	]).execute()
	alpha = await team.create('alpha')
	await team.join(alpha, 1, 3)
	await team.claim(alpha, 'app:blog')
	await team.claim(alpha, 'app:shop')
})

afterEach(async () => {
	vi.useRealTimers()
	await teardown()
})

const authenticate = async (plain: string) => {
	const req = { path: '/api/deploy', headers: { authorization: `Bearer ${plain}` } } as any
	const next = vi.fn()
	await session()(req, { setHeader: vi.fn() } as any, next)
	expect(next).toHaveBeenCalledOnce()
	return req
}

const deploy = async (plain: string, subject = 'app:blog') => admit(await authenticate(plain), subject, 'apps:deploy')

describe('subject token request authorization', () => {
	test('authenticates the exact subject and intersects token abilities with current grants', async () => {
		const plain = await create(1, 'Blog CI', ['apps:deploy'], { subject: 'app:blog' })
		const req = await authenticate(plain)
		expect(req.token).toEqual({ id: hash(plain), subject: 'app:blog', abilities: ['apps:deploy'] })
		expect(req.session).toBeUndefined()
		await expect(admit(req, 'app:blog', 'apps:deploy')).resolves.toBeUndefined()
		await expect(admit(req, 'app:shop', 'apps:deploy'))
			.rejects.toThrow('Token subject does not match requested subject')
		await expect(admit(req, 'app:blog', 'apps:view')).rejects.toThrow('Missing ability: apps:view')
		await expect(admit(req, 'app:blog', 'bkp:restore')).rejects.toThrow('Missing ability: bkp:restore')
		expect(() => authorize(req, 'profile:read')).toThrow('Scoped token requires subject authorization')
		await expect(admit(req, 'app:blog')).resolves.toBeUndefined()
		await expect(admit(req, 'app:shop')).rejects.toThrow('Token subject does not match requested subject')
	})

	test('an owner wildcard cannot escape an exact opaque token subject', async () => {
		const plain = await create(2, 'Owner CI', ['*'], { subject: ' app:Blog ' })
		const req = await authenticate(plain)
		await expect(admit(req, ' app:Blog ', 'apps:deploy')).resolves.toBeUndefined()
		await expect(admit(req, 'app:Blog', 'apps:deploy')).rejects.toThrow('Token subject does not match requested subject')
		await expect(admit(req, ' app:blog ', 'apps:deploy')).rejects.toThrow('Token subject does not match requested subject')
		await expect(admit(req, 'app:shop')).rejects.toThrow('Token subject does not match requested subject')
		expect(() => authorize(req, 'ops:*')).toThrow('Scoped token requires subject authorization')
	})

	test.each([
		['membership removal', () => team.leave(alpha, 1)],
		['claim removal', () => team.release(alpha, 'app:blog')],
		['team role change', () => team.join(alpha, 1, 1)],
		['team ability removal', () => db<any>().updateTable('roles').set({ abilities: '["apps:view"]' }).where('id', '=', 3).execute()],
		['team deletion', () => team.remove(alpha)],
	] as const)('rechecks %s for each request', async (_, remove) => {
		const plain = await create(1, 'Blog CI', ['apps:deploy'], { subject: 'app:blog' })
		await expect(deploy(plain)).resolves.toBeUndefined()
		await remove()
		const req = await authenticate(plain)
		expect(req.user.id).toBe(1)
		expect(req.token.subject).toBe('app:blog')
		await expect(admit(req, 'app:blog', 'apps:deploy')).rejects.toThrow('Missing ability: apps:deploy')
	})

	test('reloads global grants on the next request instead of retaining token creation authority', async () => {
		const plain = await create(2, 'Owner CI', ['apps:deploy'], { subject: 'app:blog' })
		await expect(deploy(plain)).resolves.toBeUndefined()
		await db<any>().updateTable('roles').set({ abilities: '[]' }).where('id', '=', 2).execute()
		await expect(deploy(plain)).rejects.toThrow('Missing ability: apps:deploy')
	})

	test('revocation and the expiry boundary remove authentication on the next request', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-09-13T12:00:00Z'))
		const revoked = await create(1, 'Revoked', ['apps:deploy'], { subject: 'app:blog' })
		const expiring = await create(1, 'Expiring', ['apps:deploy'], { subject: 'app:blog', ttl: 1000 })
		await expect(deploy(revoked)).resolves.toBeUndefined()
		await expect(deploy(expiring)).resolves.toBeUndefined()
		await expect(revoke(1, hash(revoked))).resolves.toBe(true)
		const req = await authenticate(revoked)
		expect(req.user).toBeUndefined()
		expect(req.token).toBeUndefined()
		await expect(admit(req, 'app:blog', 'apps:deploy')).rejects.toThrow('Authentication required')
		vi.advanceTimersByTime(1000)
		await expect(deploy(expiring)).rejects.toThrow('Authentication required')
	})
})
