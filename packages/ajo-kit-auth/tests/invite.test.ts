// Single-use invitations across both attachment points and both credential
// paths. The suite runs all real auth migrations so token claims, membership
// constraints, passkey detection, and audit state use the shipped schema.

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { close, connect, db, sql } from 'ajo-kit/database'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { up as initial } from '../migrations/0001_initial'
import { up as passkeys } from '../migrations/0002_passkeys'
import { up as teams } from '../migrations/0003_teams'
import { up as invites } from '../migrations/0004_invites'
import { up as integrity } from '../migrations/0005_integrity'
import * as invite from '../src/invite'
import { hash } from '../src/session'
import { configure } from '../src/store'
import * as team from '../src/team'

const now = '2026-06-26T00:00:00.000Z'
let directory: string

beforeEach(async () => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date(now))
	directory = mkdtempSync(join(tmpdir(), 'ajo-kit-auth-invite-'))
	connect(join(directory, 'test.sqlite'))
	configure(() => db())

	await initial(db<any>())
	await passkeys(db<any>())
	await teams(db<any>())
	await invites(db<any>())
	await integrity(db<any>())
	await db<any>().insertInto('roles').values([
		{ id: 1, name: 'owner', abilities: '["*"]' },
		{ id: 2, name: 'member', abilities: '[]' },
	]).execute()
	await db<any>().insertInto('users').values({
		id: 1,
		name: 'Inviter',
		email: 'inviter@example.test',
		password: 'inviter-hash',
		verified: now,
	}).execute()
})

afterEach(async () => {
	await close()
	rmSync(directory, { recursive: true, force: true })
	vi.useRealTimers()
})

describe('invite presentation', () => {
	test('create returns the prefixed wire token and get resolves its normalized invitation', async () => {
		const token = await invite.create({
			role: 'member',
			email: ' Invited@Example.TEST ',
			name: ' Invited User ',
			inviter: 1,
		})

		expect(token).toMatch(/^ajoinv_[A-Za-z0-9_-]{43}$/)
		expect(await db<any>().selectFrom('invites').selectAll().executeTakeFirstOrThrow()).toEqual({
			id: hash(token),
			email: 'invited@example.test',
			name: 'Invited User',
			role: 'member',
			team: null,
			inviter: 1,
			expiry: '2026-07-03T00:00:00.000Z',
			accepted: null,
			acceptor: null,
			revoked: null,
		})
		expect(await invite.get(token)).toEqual({
			role: 'member',
			name: 'Invited User',
			email: 'invited@example.test',
			team: null,
			user: null,
		})
		expect(await invite.get(hash(token))).toBeNull()
		expect(await invite.list()).toEqual([{
			id: hash(token),
			email: 'invited@example.test',
			name: 'Invited User',
			role: 'member',
			team: null,
			inviter: 1,
			expiry: '2026-07-03T00:00:00.000Z',
		}])
	})

	test('email-bound creation deduplicates pending invites while unbound creation does not', async () => {
		const first = await invite.create({ role: 'member', email: 'repeat@example.test' })
		const second = await invite.create({ role: 'member', email: 'REPEAT@example.test' })
		const openA = await invite.create({ role: 'member' })
		const openB = await invite.create({ role: 'member' })

		const rows = await db<any>()
			.selectFrom('invites')
			.select(['id', 'email', 'revoked'])
			.execute()

		expect(rows.find(row => row.id === hash(first))).toEqual({
			id: hash(first),
			email: 'repeat@example.test',
			revoked: now,
		})
		expect(rows.find(row => row.id === hash(second))).toEqual({
			id: hash(second),
			email: 'repeat@example.test',
			revoked: null,
		})
		expect(rows.filter(row => row.email === null).map(row => row.id).sort()).toEqual([
			hash(openA),
			hash(openB),
		].sort())
		expect(await invite.get(first)).toBeNull()
		expect(await invite.get(second)).toEqual({
			role: 'member',
			name: '',
			email: 'repeat@example.test',
			team: null,
			user: null,
		})
		await expect(invite.create({ role: 'member', email: '   ' }))
			.rejects.toThrow('Invitation email is required')
	})

	test('expired and revoked invitations are neither presentable nor acceptable', async () => {
		const expired = await invite.create({ role: 'member', email: 'expired@example.test', ttl: -1 })
		const revoked = await invite.create({ role: 'member', email: 'revoked@example.test' })

		await invite.revoke(hash(revoked))

		expect(await invite.get(expired)).toBeNull()
		expect(await invite.accept(expired, { passwordHash: 'expired-hash' })).toBeNull()
		expect(await invite.get(revoked)).toBeNull()
		expect(await invite.accept(revoked, { passwordHash: 'revoked-hash' })).toBeNull()
		expect(await invite.list()).toEqual([])
		expect(await db<any>().selectFrom('invites').select(['id', 'revoked']).orderBy('id').execute()).toEqual([
			{ id: hash(expired), revoked: null },
			{ id: hash(revoked), revoked: now },
		].sort((a, b) => a.id.localeCompare(b.id)))
	})
})

describe('invite acceptance', () => {
	test('an email-bound password hash creates a verified account and closes the window', async () => {
		const token = await invite.create({
			role: 'member',
			email: 'password@example.test',
			name: 'Suggested Name',
		})

		const user = await invite.accept(token, { name: 'Accepted Name', passwordHash: 'password-hash' })

		expect(user).toBe(2)
		expect(await invite.get(token)).toBeNull()
		expect(await invite.accept(token, { passwordHash: 'other-hash' })).toBeNull()
		expect(await db<any>().selectFrom('users').select([
			'id', 'name', 'email', 'password', 'verified',
		]).where('id', '=', 2).executeTakeFirstOrThrow()).toEqual({
			id: 2,
			name: 'Accepted Name',
			email: 'password@example.test',
			password: 'password-hash',
			verified: now,
		})
		expect(await db<any>().selectFrom('invites').select([
			'accepted', 'acceptor', 'revoked',
		]).where('id', '=', hash(token)).executeTakeFirstOrThrow()).toEqual({
			accepted: now,
			acceptor: 2,
			revoked: null,
		})
	})

	test('a bare account can re-enter until it gains a password or passkey', async () => {
		const passwordToken = await invite.create({
			role: 'member',
			email: 'bare-password@example.test',
			name: 'Bare Password',
		})
		const passwordUser = await invite.accept(passwordToken, {})

		expect(passwordUser).toBe(2)
		expect(await invite.get(passwordToken)).toEqual({
			role: 'member',
			name: 'Bare Password',
			email: 'bare-password@example.test',
			team: null,
			user: 2,
		})
		expect(await invite.accept(passwordToken, {})).toBe(2)

		await db<any>().updateTable('users').set({ password: 'added-hash' }).where('id', '=', 2).execute()

		expect(await invite.get(passwordToken)).toBeNull()
		expect(await invite.accept(passwordToken, {})).toBeNull()

		const passkeyToken = await invite.create({
			role: 'member',
			email: 'bare-passkey@example.test',
			name: 'Bare Passkey',
		})
		const passkeyUser = await invite.accept(passkeyToken, {})

		expect(passkeyUser).toBe(3)
		expect(await invite.accept(passkeyToken, {})).toBe(3)

		await db<any>().insertInto('credentials').values({
			id: 'credential-id',
			user: 3,
			handle: 'credential-handle',
			key: 'credential-key',
			alg: -7,
			transports: null,
			verified: null,
			last: null,
		}).execute()

		expect(await invite.get(passkeyToken)).toBeNull()
		expect(await invite.accept(passkeyToken, {})).toBeNull()
		expect(await db<any>().selectFrom('users').select([
			'id', 'password', 'verified',
		]).where('id', 'in', [2, 3]).orderBy('id').execute()).toEqual([
			{ id: 2, password: 'added-hash', verified: null },
			{ id: 3, password: null, verified: null },
		])
	})

	test('an unbound invitation requires an input email and normalizes it', async () => {
		const token = await invite.create({ role: 'member', name: 'Open Invite' })

		expect(await invite.accept(token, { name: 'No Email' })).toBeNull()
		expect(await invite.get(token)).toEqual({
			role: 'member',
			name: 'Open Invite',
			email: null,
			team: null,
			user: null,
		})
		expect(await invite.accept(token, {
			email: ' Open@Example.TEST ',
			passwordHash: 'open-hash',
		})).toBe(2)
		expect(await db<any>().selectFrom('users').select([
			'email', 'name', 'password', 'verified',
		]).where('id', '=', 2).executeTakeFirstOrThrow()).toEqual({
			email: 'open@example.test',
			name: 'Open Invite',
			password: 'open-hash',
			verified: null,
		})
	})

	test('an email-bound invitation without a password hash stays unverified', async () => {
		const token = await invite.create({ role: 'member', email: 'bound-bare@example.test' })

		expect(await invite.accept(token, {})).toBe(2)
		expect(await db<any>().selectFrom('users').select([
			'password', 'verified',
		]).where('id', '=', 2).executeTakeFirstOrThrow()).toEqual({
			password: null,
			verified: null,
		})
	})

	test('team invitations attach teammates only and global invitations attach members only', async () => {
		const group = await db<any>().insertInto('teams').values({ name: 'platform' })
			.returning('id').executeTakeFirstOrThrow()
		const scoped = await invite.create({
			role: 'member',
			email: 'scoped@example.test',
			team: group.id,
		})
		const global = await invite.create({ role: 'owner', email: 'global@example.test' })

		expect(await invite.accept(scoped, { passwordHash: 'scoped-hash' })).toBe(2)
		expect(await invite.accept(global, { passwordHash: 'global-hash' })).toBe(3)
		expect(await db<any>().selectFrom('teammates').select([
			'team', 'user', 'role',
		]).execute()).toEqual([{ team: group.id, user: 2, role: 2 }])
		expect(await db<any>().selectFrom('members').select(['user', 'role']).execute()).toEqual([
			{ user: 3, role: 1 },
		])
	})

	test('an unknown role throws and rolls back the account and claim', async () => {
		const token = await invite.create({ role: 'missing', email: 'missing-role@example.test' })

		await expect(invite.accept(token, { passwordHash: 'missing-hash' }))
			.rejects.toThrow('Unknown invitation role: missing')
		expect(await db<any>().selectFrom('users').select('id')
			.where('email', '=', 'missing-role@example.test').execute()).toEqual([])
		expect(await db<any>().selectFrom('invites').select([
			'accepted', 'acceptor',
		]).where('id', '=', hash(token)).executeTakeFirstOrThrow()).toEqual({
			accepted: null,
			acceptor: null,
		})
	})

	test('a duplicate account email returns null without consuming the invite', async () => {
		const token = await invite.create({ role: 'member', email: 'inviter@example.test' })

		expect(await invite.accept(token, { passwordHash: 'duplicate-hash' })).toBeNull()
		expect(await invite.get(token)).toEqual({
			role: 'member',
			name: '',
			email: 'inviter@example.test',
			team: null,
			user: null,
		})
		expect(await db<any>().selectFrom('invites').select([
			'accepted', 'acceptor',
		]).where('id', '=', hash(token)).executeTakeFirstOrThrow()).toEqual({
			accepted: null,
			acceptor: null,
		})
	})

	test('two concurrent password claims produce exactly one account and one winner', async () => {
		const token = await invite.create({ role: 'member', email: 'race@example.test' })
		const inputs = [
			{ name: 'First Claim', passwordHash: 'first-hash' },
			{ name: 'Second Claim', passwordHash: 'second-hash' },
		]
		const results = await Promise.all(inputs.map(input => invite.accept(token, input)))
		const winners = results.filter((user): user is number => user !== null)

		expect(winners).toHaveLength(1)
		expect(results.filter(user => user === null)).toEqual([null])
		const winner = winners[0]
		const index = results.indexOf(winner)
		expect(await db<any>().selectFrom('users').select([
			'id', 'email', 'name', 'password', 'verified',
		]).where('email', '=', 'race@example.test').execute()).toEqual([{
			id: winner,
			email: 'race@example.test',
			name: inputs[index].name,
			password: inputs[index].passwordHash,
			verified: now,
		}])
		expect(await db<any>().selectFrom('invites').select([
			'accepted', 'acceptor',
		]).where('id', '=', hash(token)).executeTakeFirstOrThrow()).toEqual({
			accepted: now,
			acceptor: winner,
		})
	})

	test('team removal revokes pending invitations and stale tokens stay inert', async () => {
		const group = await team.create('temporary')
		const token = await invite.create({
			role: 'member',
			email: 'removed-team@example.test',
			team: group,
		})

		await team.remove(group)

		expect(await invite.get(token)).toBeNull()
		expect(await invite.accept(token, { passwordHash: 'unused-hash' })).toBeNull()
		expect(await db<any>().selectFrom('invites').select([
			'accepted', 'acceptor', 'revoked',
		]).where('id', '=', hash(token)).executeTakeFirstOrThrow()).toEqual({
			accepted: null,
			acceptor: null,
			revoked: now,
		})
	})

	test('creation rejects an unknown team before publishing an invitation', async () => {
		await expect(invite.create({ role: 'member', team: 999 }))
			.rejects.toThrow('Unknown team: 999')
		expect(await db<any>().selectFrom('invites').select('id').execute()).toEqual([])
	})

	test('global member attachment is idempotent when the row already exists', async () => {
		await sql`
			CREATE TRIGGER attach_member AFTER INSERT ON users
			WHEN NEW.email = 'attached@example.test'
			BEGIN
				INSERT INTO members(user, role) VALUES(NEW.id, 2);
			END
		`.execute(db<any>())
		const token = await invite.create({ role: 'member', email: 'attached@example.test' })

		expect(await invite.accept(token, { passwordHash: 'attached-hash' })).toBe(2)
		expect(await db<any>().selectFrom('members').select(['user', 'role'])
			.where('user', '=', 2).execute()).toEqual([{ user: 2, role: 2 }])
	})
})
