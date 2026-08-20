import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { close, connect, db } from 'ajo-kit/database'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { up as initial } from '../migrations/0001_initial'
import { up as passkeys } from '../migrations/0002_passkeys'
import { up as teams } from '../migrations/0003_teams'
import { up as invites } from '../migrations/0004_invites'
import { down, up as integrity } from '../migrations/0005_integrity'

let directory: string

beforeEach(async () => {
	directory = mkdtempSync(join(tmpdir(), 'ajo-kit-auth-integrity-'))
	connect(join(directory, 'test.sqlite'))
	await initial(db<any>())
	await passkeys(db<any>())
	await teams(db<any>())
	await invites(db<any>())
})

afterEach(async () => {
	await close()
	rmSync(directory, { recursive: true, force: true })
})

describe('migration 0005', () => {
	test('deduplicates members before enforcing unique attachment', async () => {
		await db<any>().insertInto('users').values({ id: 1, email: 'member@example.test' }).execute()
		await db<any>().insertInto('roles').values({ id: 1, name: 'member', abilities: '[]' }).execute()
		await db<any>().insertInto('members').values([
			{ user: 1, role: 1 },
			{ user: 1, role: 1 },
		]).execute()

		await integrity(db<any>())

		expect(await db<any>().selectFrom('members').select(['user', 'role']).execute())
			.toEqual([{ user: 1, role: 1 }])
		await expect(db<any>().insertInto('members').values({ user: 1, role: 1 }).execute())
			.rejects.toThrow(/UNIQUE/i)

		await down(db<any>())
		await expect(db<any>().insertInto('members').values({ user: 1, role: 1 }).execute())
			.resolves.toBeDefined()
	})
})
