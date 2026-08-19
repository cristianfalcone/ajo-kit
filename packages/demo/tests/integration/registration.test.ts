import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { close, connect, db } from 'ajo-kit/database'
import { configure, invite } from '@kit/auth'
import { bundles } from '../../src/abilities'
import * as registration from '../../src/data/registration'
import { migrate } from '../migrate'

describe('registration database helpers', () => {
	let dir: string
	let admin: number

	beforeEach(async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-26T00:00:00Z'))

		dir = mkdtempSync(join(tmpdir(), 'ajo-registration-'))
		const database = join(dir, 'test.sqlite')
		migrate(database)
		connect(database)
		configure(() => db())

		const store = db<any>()

		await store.insertInto('roles').values([
			{ id: 1, name: 'admin', abilities: JSON.stringify(bundles.admin) },
			{ id: 2, name: 'user', abilities: JSON.stringify(bundles.user) },
		]).execute()

		const user = await store.insertInto('users').values({
			name: 'Admin User',
			email: 'admin@example.com',
			password: null,
			verified: '2026-06-26T00:00:00.000Z',
		}).returning('id').executeTakeFirstOrThrow()

		admin = user.id
	})

	afterEach(async () => {
		await close()
		rmSync(dir, { recursive: true, force: true })
		vi.useRealTimers()
	})

	test('policy defaults to open and setting policy persists', async () => {
		expect(await registration.policy()).toBe('open')

		await registration.set('invite', admin)

		expect(await registration.policy()).toBe('invite')

		const row = await db<any>()
			.selectFrom('registration')
			.select(['signup', 'updated', 'updater'])
			.executeTakeFirstOrThrow()

		expect(row).toEqual({
			signup: 'invite',
			updated: '2026-06-26T00:00:00.000Z',
			updater: admin,
		})
	})

	test('create stores a token hash and returns only the plaintext token', async () => {
		const plain = await invite.create({
			role: 'user',
			email: ' Invited@Example.COM ',
			name: ' Invited User ',
			inviter: admin,
		})

		const row = await db<any>()
			.selectFrom('invites')
			.select(['id', 'email', 'name', 'role', 'team', 'inviter', 'expiry'])
			.executeTakeFirstOrThrow()

		expect(row.id).not.toBe(plain)
		expect(row.id).toMatch(/^[a-f0-9]{64}$/)
		expect(row).toMatchObject({
			email: 'invited@example.com',
			name: 'Invited User',
			role: 'user',
			team: null,
			inviter: admin,
			expiry: '2026-07-03T00:00:00.000Z',
		})
		expect(await invite.get(plain)).toEqual({
			role: 'user',
			email: 'invited@example.com',
			name: 'Invited User',
			team: null,
			user: null,
		})
		expect(await invite.get(row.id)).toBeNull()
	})

	test('creating a new active invite revokes the previous active invite for that email', async () => {
		const first = await invite.create({ role: 'user', email: 'repeat@example.com' })
		const second = await invite.create({ role: 'user', email: 'REPEAT@example.com' })

		const rows = await db<any>()
			.selectFrom('invites')
			.select('revoked')
			.execute()

		expect(rows).toHaveLength(2)
		expect(rows.filter(row => row.revoked === '2026-06-26T00:00:00.000Z')).toHaveLength(1)
		expect(rows.filter(row => row.revoked === null)).toHaveLength(1)
		expect(await invite.get(first)).toBeNull()
		expect(await invite.get(second)).toEqual({
			role: 'user',
			name: '',
			email: 'repeat@example.com',
			team: null,
			user: null,
		})
	})

	test('expired and revoked invitations do not validate', async () => {
		const expired = await invite.create({
			role: 'user',
			email: 'expired@example.com',
			ttl: -1,
		})
		const revoked = await invite.create({ role: 'user', email: 'revoked@example.com' })
		const row = await db<any>()
			.selectFrom('invites')
			.select('id')
			.where('email', '=', 'revoked@example.com')
			.executeTakeFirstOrThrow()

		await invite.revoke(row.id)

		expect(await invite.get(expired)).toBeNull()
		expect(await invite.get(revoked)).toBeNull()
	})

	test('accept creates a verified user and consumes the invitation once', async () => {
		const token = await invite.create({
			role: 'user',
			email: 'new@example.com',
			name: 'Invited Name',
			inviter: admin,
		})

		const id = await invite.accept(token, {
			name: 'Accepted Name',
			password: 'hashed-password',
		})

		expect(id).toEqual(expect.any(Number))
		expect(await invite.get(token)).toBeNull()
		expect(await invite.accept(token, { password: 'other-hash' })).toBeNull()

		const user = await db<any>()
			.selectFrom('users')
			.select(['id', 'email', 'name', 'password', 'verified'])
			.where('email', '=', 'new@example.com')
			.executeTakeFirstOrThrow()
		const member = await db<any>()
			.selectFrom('members')
			.innerJoin('roles', 'roles.id', 'members.role')
			.select(['members.user', 'roles.name'])
			.where('members.user', '=', id)
			.executeTakeFirstOrThrow()
		const audit = await db<any>()
			.selectFrom('invites')
			.select(['accepted', 'acceptor', 'revoked'])
			.where('email', '=', 'new@example.com')
			.executeTakeFirstOrThrow()

		expect(user).toEqual({
			id,
			email: 'new@example.com',
			name: 'Accepted Name',
			password: 'hashed-password',
			verified: '2026-06-26T00:00:00.000Z',
		})
		expect(member).toEqual({ user: id, name: 'user' })
		expect(audit).toEqual({
			accepted: '2026-06-26T00:00:00.000Z',
			acceptor: id,
			revoked: null,
		})
	})

	test('accept leaves an invitation pending when the email already exists', async () => {
		const token = await invite.create({ role: 'user', email: 'admin@example.com' })

		expect(await invite.accept(token, { password: 'hashed-password' })).toBeNull()
		expect(await invite.get(token)).toEqual({
			role: 'user',
			name: '',
			email: 'admin@example.com',
			team: null,
			user: null,
		})
	})
})
