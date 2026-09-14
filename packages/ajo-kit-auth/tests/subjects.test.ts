import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { db, sql } from 'ajo-kit/database'
import { down, up } from '../migrations/0006_subjects'
import { hash } from '../src/session'
import { validate } from '../src/token'
import { setup, teardown } from './database.fixture'

beforeEach(setup)
afterEach(teardown)

describe('migration 0006', () => {
	test('preserves old global credentials and revokes scoped credentials before rollback removes the boundary', async () => {
		await down(db<any>())
		await db<any>().insertInto('users').values({ id: 1, email: 'migration@example.test' }).execute()
		await db<any>().insertInto('tokens').values({
			id: hash('old-global'), user: 1, name: 'Old global', abilities: '["apps:deploy"]', last: null, expiry: null,
		}).execute()

		await up(db<any>())
		await expect(validate('old-global')).resolves.toMatchObject({ subject: null, expiry: null })
		await db<any>().insertInto('tokens').values({
			id: hash('new-scoped'), user: 1, name: 'New scoped', abilities: '["apps:deploy"]', last: null,
			subject: 'app:blog', expiry: '2099-01-01T00:00:00Z',
		}).execute()
		await expect(validate('new-scoped')).resolves.toMatchObject({ subject: 'app:blog' })

		await down(db<any>())
		const columns = await sql<{ name: string }>`PRAGMA table_info(tokens)`.execute(db<any>())
		expect(columns.rows.some(column => column.name === 'subject')).toBe(false)
		expect(await db<any>().selectFrom('tokens').select(['id', 'name', 'abilities', 'expiry']).execute())
			.toEqual([{ id: hash('old-global'), name: 'Old global', abilities: '["apps:deploy"]', expiry: null }])

		await up(db<any>())
		await expect(validate('old-global')).resolves.toMatchObject({ subject: null })
		await expect(validate('new-scoped')).resolves.toBeNull()
	})
})
