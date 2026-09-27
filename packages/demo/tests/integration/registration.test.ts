import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { close, connect, db } from 'ajo-kit/database'
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

		const user = await db<any>().insertInto('users').values({
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

	test('policy fails closed without the migrated row', async () => {
		await db<any>().deleteFrom('registration').execute()

		await expect(registration.policy()).rejects.toThrow()
		expect(await db<any>().selectFrom('registration').selectAll().execute()).toEqual([])
	})
})
