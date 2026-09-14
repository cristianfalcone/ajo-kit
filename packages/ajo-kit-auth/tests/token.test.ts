import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from 'ajo-kit/database'
import * as token from '../src/token'
import { hash } from '../src/session'
import * as team from '../src/team'
import * as confirm from '../src/confirm'
import { setup, teardown } from './database.fixture'

beforeEach(async () => {
	await setup()
	await db<any>().insertInto('users').values([
		{ id: 1, email: 'notes@example.test' },
		{ id: 2, email: 'root@example.test' },
	]).execute()
	await db<any>().insertInto('roles').values([
		{ id: 1, name: 'notes', abilities: '["notes:*"]' },
		{ id: 2, name: 'root', abilities: '["*"]' },
	]).execute()
	await db<any>().insertInto('members').values([
		{ user: 1, role: 1 },
		{ user: 2, role: 2 },
	]).execute()
})

afterEach(async () => {
	confirm.clearUser(1)
	confirm.clearUser(2)
	vi.useRealTimers()
	await teardown()
})

describe('API token authority', () => {
	test('minting uses current global grants and names the first uncovered ability', async () => {
		const plain = await token.create(1, 'Notes', ['notes:read'])
		await expect(token.validate(plain)).resolves.toMatchObject({
			user: 1,
			abilities: ['notes:read'],
		})

		await expect(token.create(1, 'Escalated', ['notes:write', 'tokens:*']))
			.rejects.toThrow('Requested ability exceeds account authority: tokens:*')
		await expect(token.create(2, 'Root', ['tokens:*', 'notes:read'])).resolves.toEqual(expect.any(String))

		await db<any>().updateTable('roles').set({ abilities: '[]' }).where('id', '=', 1).execute()

		await expect(token.create(1, 'Stale', ['notes:read']))
			.rejects.toThrow('Requested ability exceeds account authority: notes:read')
	})

	test('malformed stored abilities resolve to null without throwing or gaining authority', async () => {
		const malformed = [
			['not-json', 'not-json'],
			['object', '{"ability":"notes:read"}'],
			['mixed', '["notes:read",1]'],
		] as const

		await db<any>().insertInto('tokens').values(malformed.map(([plain, abilities]) => ({
			id: hash(plain),
			user: 1,
			name: plain,
			abilities,
			last: null,
			expiry: null,
		}))).execute()

		for (const [plain] of malformed) {
			await expect(token.validate(plain)).resolves.toBeNull()
		}

		expect(await db<any>().selectFrom('tokens').select('last').execute())
			.toEqual([{ last: null }, { last: null }, { last: null }])
	})
})


const lifetime = 90 * 24 * 60 * 60 * 1000

describe('API token subjects and lifecycle', () => {
	test('minting composes current global and exact team grants without widening them', async () => {
		const alpha = await team.create('alpha')
		await db<any>().insertInto('roles').values({ id: 3, name: 'developer', abilities: '["apps:deploy"]' }).execute()
		await team.join(alpha, 1, 3)
		await team.claim(alpha, 'app:blog')

		const plain = await token.create(1, 'Blog CI', ['notes:read', 'apps:deploy'], { subject: 'app:blog' })
		await expect(token.validate(plain)).resolves.toMatchObject({
			user: 1, subject: 'app:blog', abilities: ['notes:read', 'apps:deploy'],
		})
		await expect(token.create(1, 'Global CI', ['apps:deploy']))
			.rejects.toThrow('Requested ability exceeds account authority: apps:deploy')
		await expect(token.create(1, 'Other CI', ['apps:deploy'], { subject: 'app:shop' }))
			.rejects.toThrow('Requested ability exceeds account authority: apps:deploy')
		await expect(token.create(1, 'Restore', ['bkp:restore'], { subject: 'app:blog' }))
			.rejects.toThrow('Requested ability exceeds account authority: bkp:restore')
		await expect(token.create(1, 'Wildcard', ['apps:*'], { subject: 'app:blog' }))
			.rejects.toThrow('Requested ability exceeds account authority: apps:*')

		await team.release(alpha, 'app:blog')
		await expect(token.create(1, 'Stale CI', ['apps:deploy'], { subject: 'app:blog' }))
			.rejects.toThrow('Requested ability exceeds account authority: apps:deploy')
	})

	test('subjects are nonblank opaque strings and are never trimmed or normalized', async () => {
		for (const subject of ['', ' \t ', null, 23]) {
			await expect(token.create(2, 'Invalid', ['apps:deploy'], { subject } as any)).rejects.toThrow()
		}
		const subject = ' app:Blog '
		const plain = await token.create(2, 'Exact', ['apps:deploy'], { subject })
		await expect(token.validate(plain)).resolves.toMatchObject({ subject })
	})

	test('defaults to 90 days, bounds scoped expiry, and allows explicit global non-expiry', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-09-13T12:00:00Z'))
		const expiry = new Date(Date.now() + lifetime).toISOString()
		const global = await token.create(1, 'Global', ['notes:read'])
		const scoped = await token.create(2, 'Scoped', ['apps:deploy'], { subject: 'app:blog' })
		const forever = await token.create(1, 'Forever', ['notes:read'], { ttl: null })
		await expect(token.validate(global)).resolves.toMatchObject({ subject: null, expiry })
		await expect(token.validate(scoped)).resolves.toMatchObject({ subject: 'app:blog', expiry })
		await expect(token.validate(forever)).resolves.toMatchObject({ subject: null, expiry: null })

		for (const ttl of [0, -1, Infinity, -Infinity, NaN]) {
			await expect(token.create(2, 'Invalid global', ['apps:deploy'], { ttl })).rejects.toThrow()
			await expect(token.create(2, 'Invalid scoped', ['apps:deploy'], { subject: 'app:blog', ttl })).rejects.toThrow()
		}
		for (const ttl of [null, lifetime + 1]) {
			await expect(token.create(2, 'Unbounded scoped', ['apps:deploy'], { subject: 'app:blog', ttl })).rejects.toThrow()
		}
		const maximum = await token.create(2, 'Maximum', ['apps:deploy'], { subject: 'app:blog', ttl: lifetime })
		await expect(token.validate(maximum)).resolves.toMatchObject({ expiry })
		const short = await token.create(2, 'Short', ['apps:deploy'], { subject: 'app:blog', ttl: 1000 })
		vi.advanceTimersByTime(999)
		await expect(token.validate(short)).resolves.not.toBeNull()
		vi.advanceTimersByTime(1)
		await expect(token.validate(short)).resolves.toBeNull()
	})

	test('malformed stored scope and expiry fail closed without recording use', async () => {
		const rows = [
			{ plain: 'blank-subject', subject: '', expiry: '2099-01-01T00:00:00Z' },
			{ plain: 'space-subject', subject: ' \t ', expiry: '2099-01-01T00:00:00Z' },
			{ plain: 'unbounded-subject', subject: 'app:blog', expiry: null },
			{ plain: 'bad-expiry', subject: 'app:blog', expiry: 'not-a-date' },
			{ plain: 'bad-global-expiry', subject: null, expiry: 'not-a-date' },
		]
		await db<any>().insertInto('tokens').values(rows.map(({ plain, ...row }) => ({
			id: hash(plain), user: 2, name: plain, abilities: '["apps:deploy"]', last: null, ...row,
		}))).execute()
		for (const { plain } of rows) await expect(token.validate(plain)).resolves.toBeNull()
		const retained = await db<any>().selectFrom('tokens').select('last').execute()
		expect(retained.every(row => row.last === null)).toBe(true)
	})

	test('lists only owner metadata and revokes by owner and hash while clearing confirmation', async () => {
		const plain = await token.create(1, 'Notes', ['notes:read'])
		const other = await token.create(2, 'Blog CI', ['apps:deploy'], { subject: 'app:blog' })
		const id = hash(plain)
		const req = { user: { id: 1 }, token: { id, abilities: ['notes:read'], subject: null } } as any
		confirm.stamp(req)
		const listed = await token.list(1)
		expect(listed).toHaveLength(1)
		expect(listed[0]).toMatchObject({ id, name: 'Notes', subject: null, last: null })
		expect(JSON.stringify(listed)).not.toContain(plain)
		expect(JSON.stringify(listed)).not.toContain(other)
		await expect(token.list(2)).resolves.toEqual([expect.objectContaining({ id: hash(other), subject: 'app:blog' })])
		await expect(token.validate(id)).resolves.toBeNull()

		await expect(token.revoke(2, id)).resolves.toBe(false)
		expect(confirm.check(req)).toBe(true)
		await expect(token.validate(plain)).resolves.not.toBeNull()
		await expect(token.revoke(1, plain)).resolves.toBe(false)
		await expect(token.revoke(1, id)).resolves.toBe(true)
		expect(confirm.check(req)).toBe(false)
		await expect(token.validate(plain)).resolves.toBeNull()
		await expect(token.revoke(1, id)).resolves.toBe(false)
		await expect(token.validate(other)).resolves.not.toBeNull()
	})
})
