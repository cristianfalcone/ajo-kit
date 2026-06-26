import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { close, connect, db } from '../../packages/ajo-kit/src/database'
import { bundles } from '../../src/abilities'
import * as registration from '../../src/data/registration'
import * as initial from '../../packages/ajo-auth/migrations/0000_auth_initial'
import * as sessions from '../../packages/ajo-auth/migrations/0000_auth_sessions_last'
import * as resets from '../../packages/ajo-auth/migrations/0000_auth_resets'
import * as tokens from '../../packages/ajo-auth/migrations/0000_auth_tokens'
import * as abilities from '../../packages/ajo-auth/migrations/0005_role_abilities'
import * as migration from '../../db/migrations/0006_signup_invitations'

describe('registration data helpers', () => {
	let dir: string
	let admin: number

	beforeEach(async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-26T00:00:00Z'))

		dir = mkdtempSync(join(tmpdir(), 'ajo-registration-'))
		connect(join(dir, 'test.sqlite'))

		const store = db<any>()

		await initial.up(store)
		await sessions.up(store)
		await resets.up(store)
		await tokens.up(store)
		await abilities.up(store)
		await migration.up(store)

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
		const plain = await registration.create({
			email: ' Invited@Example.COM ',
			name: ' Invited User ',
			inviter: admin,
		})

		const row = await db<any>()
			.selectFrom('invitations')
			.select(['id', 'email', 'name', 'inviter', 'expiry'])
			.executeTakeFirstOrThrow()

		expect(row.id).not.toBe(plain)
		expect(row.id).toMatch(/^[a-f0-9]{64}$/)
		expect(row).toMatchObject({
			email: 'invited@example.com',
			name: 'Invited User',
			inviter: admin,
			expiry: '2026-07-03T00:00:00.000Z',
		})
		expect(await registration.get(plain)).toEqual({
			email: 'invited@example.com',
			name: 'Invited User',
			expiry: '2026-07-03T00:00:00.000Z',
		})
		expect(await registration.get(row.id)).toBeNull()
	})

	test('creating a new active invite revokes the previous active invite for that email', async () => {
		const first = await registration.create({ email: 'repeat@example.com' })
		const second = await registration.create({ email: 'REPEAT@example.com' })

		const rows = await db<any>()
			.selectFrom('invitations')
			.select('revoked')
			.execute()

		expect(rows).toHaveLength(2)
		expect(rows.filter(row => row.revoked === '2026-06-26T00:00:00.000Z')).toHaveLength(1)
		expect(rows.filter(row => row.revoked === null)).toHaveLength(1)
		expect(await registration.get(first)).toBeNull()
		expect(await registration.get(second)).toMatchObject({ email: 'repeat@example.com' })
	})

	test('expired and revoked invitations do not validate', async () => {
		const expired = await registration.create({
			email: 'expired@example.com',
			expiry: '2026-06-25T23:59:59.000Z',
		})
		const revoked = await registration.create({ email: 'revoked@example.com' })
		const row = await db<any>()
			.selectFrom('invitations')
			.select('id')
			.where('email', '=', 'revoked@example.com')
			.executeTakeFirstOrThrow()

		await registration.revoke(row.id)

		expect(await registration.get(expired)).toBeNull()
		expect(await registration.get(revoked)).toBeNull()
	})

	test('accept creates a verified user and consumes the invitation once', async () => {
		const token = await registration.create({
			email: 'new@example.com',
			name: 'Invited Name',
			inviter: admin,
		})

		const id = await registration.accept(token, {
			name: 'Accepted Name',
			passwordHash: 'hashed-password',
		})

		expect(id).toEqual(expect.any(Number))
		expect(await registration.get(token)).toBeNull()
		expect(await registration.accept(token, { passwordHash: 'other-hash' })).toBeNull()

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
		const invite = await db<any>()
			.selectFrom('invitations')
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
		expect(invite).toEqual({
			accepted: '2026-06-26T00:00:00.000Z',
			acceptor: id,
			revoked: null,
		})
	})

	test('accept leaves an invitation pending when the email already exists', async () => {
		const token = await registration.create({ email: 'admin@example.com' })

		expect(await registration.accept(token, { passwordHash: 'hashed-password' })).toBeNull()
		expect(await registration.get(token)).toMatchObject({ email: 'admin@example.com' })
	})
})
