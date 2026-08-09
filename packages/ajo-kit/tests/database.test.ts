import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import type { Generated, Kysely } from '../src/database'
import { resolveDatabasePath } from '../src/database-path'
import { close, connect, db, sql } from '../src/database.node'

interface Item {
	id: Generated<number>
	name: string
	score: number
	wide: bigint | null
	payload: Uint8Array | null
}

interface Schema {
	items: Item
}

async function memory(): Promise<Kysely<Schema>> {
	connect(':memory:')
	const database = db<Schema>()
	await database.schema
		.createTable('items')
		.addColumn('id', 'integer', column => column.primaryKey().autoIncrement())
		.addColumn('name', 'text', column => column.notNull().unique())
		.addColumn('score', 'integer', column => column.notNull())
		.addColumn('wide', 'integer')
		.addColumn('payload', 'blob')
		.execute()
	return database
}

afterEach(async () => {
	await close()
})

describe('ajo-kit Node database', () => {
	test('selects, inserts, updates, and deletes with returning rows', async () => {
		const database = await memory()
		const inserted = await database.insertInto('items')
			.values({ name: 'one', score: 1, wide: null, payload: null })
			.returning(['id', 'name', 'score'])
			.executeTakeFirstOrThrow()

		expect(inserted).toEqual({ id: 1, name: 'one', score: 1 })
		expect(await database.selectFrom('items').selectAll().executeTakeFirstOrThrow())
			.toMatchObject(inserted)

		const updated = await database.updateTable('items')
			.set({ name: 'updated', score: 2 })
			.where('id', '=', inserted.id)
			.returning(['id', 'name', 'score'])
			.executeTakeFirstOrThrow()
		expect(updated).toEqual({ id: 1, name: 'updated', score: 2 })

		const deleted = await database.deleteFrom('items')
			.where('id', '=', inserted.id)
			.returning('name')
			.executeTakeFirstOrThrow()
		expect(deleted).toEqual({ name: 'updated' })
		expect(await database.selectFrom('items').select('id').execute()).toEqual([])
	})

	test('commits successful transactions and rolls back failures', async () => {
		const database = await memory()

		await database.transaction().execute(trx => trx.insertInto('items')
			.values({ name: 'kept', score: 1, wide: null, payload: null })
			.execute())

		await expect(database.transaction().execute(async trx => {
			await trx.insertInto('items')
				.values({ name: 'dropped', score: 2, wide: null, payload: null })
				.execute()
			throw new Error('rollback')
		})).rejects.toThrow('rollback')

		expect(await database.selectFrom('items').select('name').orderBy('id').execute())
			.toEqual([{ name: 'kept' }])
	})

	test('supports nested savepoints', async () => {
		const database = await memory()
		const transaction = await database.startTransaction().execute()

		try {
			const first = await transaction.savepoint('first').execute()
			await first.insertInto('items')
				.values({ name: 'kept', score: 1, wide: null, payload: null })
				.execute()

			const second = await first.savepoint('second').execute()
			await second.insertInto('items')
				.values({ name: 'dropped', score: 2, wide: null, payload: null })
				.execute()
			await second.rollbackToSavepoint('second').execute()
			await second.releaseSavepoint('second').execute()
			await first.releaseSavepoint('first').execute()
			await transaction.commit().execute()
		} catch (error) {
			await transaction.rollback().execute()
			throw error
		}

		expect(await database.selectFrom('items').select('name').execute())
			.toEqual([{ name: 'kept' }])
	})

	test('round-trips wide integers and blobs exactly', async () => {
		const database = await memory()
		const wide = 9_007_199_254_740_993n
		const payload = new Uint8Array([0, 1, 127, 255])

		await database.insertInto('items')
			.values({ name: 'binary', score: 1, wide, payload })
			.execute()
		const row = await database.selectFrom('items')
			.select(['wide', 'payload'])
			.executeTakeFirstOrThrow()

		expect(row.wide).toBe(wide)
		expect([...row.payload!]).toEqual([...payload])
	})

	test('streams rows through the SQLite dialect iterator', async () => {
		const database = await memory()
		await database.insertInto('items').values([
			{ name: 'one', score: 1, wide: null, payload: null },
			{ name: 'two', score: 2, wide: null, payload: null },
			{ name: 'three', score: 3, wide: null, payload: null },
		]).execute()

		const names: string[] = []
		for await (const row of database.selectFrom('items').select('name').orderBy('id').stream()) {
			names.push(row.name)
		}
		expect(names).toEqual(['one', 'two', 'three'])
	})

	test('applies all four Node SQLite settings', async () => {
		const directory = mkdtempSync(join(tmpdir(), 'ajo-kit-db-'))

		try {
			connect(join(directory, 'settings.sqlite'))
			const database = db()
			const journal = await sql<{ journal_mode: string }>`pragma journal_mode`.execute(database)
			const foreign = await sql<{ foreign_keys: number }>`pragma foreign_keys`.execute(database)
			const timeout = await sql<{ timeout: number }>`pragma busy_timeout`.execute(database)
			const synchronous = await sql<{ synchronous: number }>`pragma synchronous`.execute(database)

			expect(journal.rows[0]?.journal_mode).toBe('wal')
			expect(foreign.rows[0]?.foreign_keys).toBe(1)
			expect(timeout.rows[0]?.timeout).toBe(5000)
			expect(synchronous.rows[0]?.synchronous).toBe(1)
		} finally {
			await close()
			rmSync(directory, { recursive: true, force: true })
		}
	})

	test('reopens a persistent WAL database', async () => {
		const directory = mkdtempSync(join(tmpdir(), 'ajo-kit-db-'))
		const path = join(directory, 'persistent.sqlite')

		try {
			connect(path)
			const first = db<{ durable: { value: string } }>()
			await first.schema.createTable('durable').addColumn('value', 'text').execute()
			await first.insertInto('durable').values({ value: 'kept' }).execute()
			await close()

			connect(path)
			const second = db<{ durable: { value: string } }>()
			expect(await second.selectFrom('durable').select('value').executeTakeFirstOrThrow())
				.toEqual({ value: 'kept' })
		} finally {
			await close()
			rmSync(directory, { recursive: true, force: true })
		}
	})

	test('allows Kysely destroy and repeated lifecycle close calls', async () => {
		const database = await memory()
		await database.selectFrom('items').select('id').execute()
		await database.destroy()
		await expect(close()).resolves.toBeUndefined()
		await expect(close()).resolves.toBeUndefined()
	})
})

describe('Ajo database path policy', () => {
	test('passes memory databases through without a data root', () => {
		expect(resolveDatabasePath(':memory:', undefined)).toBe(':memory:')
	})

	test('joins file paths beneath the data root', () => {
		expect(resolveDatabasePath('./nested/database.sqlite', '/var/lib/ajo/data/'))
			.toBe('/var/lib/ajo/data/nested/database.sqlite')
	})

	test('rejects absolute paths', () => {
		expect(() => resolveDatabasePath('/tmp/database.sqlite', '/var/lib/ajo'))
			.toThrow(TypeError)
	})

	test('rejects parent traversal', () => {
		expect(() => resolveDatabasePath('../database.sqlite', '/var/lib/ajo'))
			.toThrow(TypeError)
	})

	test('requires a data root for file-backed databases', () => {
		expect(() => resolveDatabasePath('database.sqlite', undefined))
			.toThrow(TypeError)
	})
})
