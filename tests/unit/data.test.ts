import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { close } from '@kit/database'

const dbpath = process.env.DATABASE_PATH

afterEach(async () => {
	if (dbpath === undefined) delete process.env.DATABASE_PATH
	else process.env.DATABASE_PATH = dbpath
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
	await close()
})

describe('app data helpers', () => {
	test('unread count uses ISO timestamp ordering and active chat exclusion', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ajo-app-unread-'))
		const path = join(dir, 'test.sqlite')

		process.env.DATABASE_PATH = path

		try {
			const { db: open, unread } = await import('/src/data')
			const store = open()

			await store.schema
				.createTable('participants')
				.addColumn('chat', 'integer')
				.addColumn('user', 'integer')
				.addColumn('seen', 'text')
				.execute()
			await store.schema
				.createTable('messages')
				.addColumn('id', 'integer', c => c.primaryKey())
				.addColumn('chat', 'integer')
				.addColumn('user', 'integer')
				.addColumn('text', 'text')
				.addColumn('created', 'text')
				.execute()

			await store.insertInto('participants').values([
				{ chat: 1, user: 1, seen: '2026-06-19T10:00:00.000Z' },
				{ chat: 2, user: 1, seen: null },
			]).execute()
			await store.insertInto('messages').values([
				{ id: 1, chat: 1, user: 2, text: 'old', created: '2026-06-19T09:59:59.000Z' },
				{ id: 2, chat: 1, user: 2, text: 'new', created: '2026-06-19T10:00:01.000Z' },
				{ id: 3, chat: 1, user: 1, text: 'own', created: '2026-06-19T10:00:02.000Z' },
				{ id: 4, chat: 2, user: 2, text: 'unseen', created: '2026-06-19T08:00:00.000Z' },
			]).execute()

			await expect(unread(1)).resolves.toBe(2)
			await expect(unread(1, 1)).resolves.toBe(1)
		} finally {
			await close()
			rmSync(dir, { recursive: true, force: true })
		}
	})

	test('sample seed fetches remote data before deleting local tables', async () => {
		const fetch = vi.fn(async () => ({ ok: false }))
		const db = { deleteFrom: vi.fn() }
		vi.stubGlobal('fetch', fetch)

		const { seed } = await import('../../db/seeds/sample')

		await expect(seed(db as any)).rejects.toThrow('Failed to fetch')
		expect(fetch).toHaveBeenCalledWith('https://dummyjson.com/users?limit=10')
		expect(db.deleteFrom).not.toHaveBeenCalled()
	})
})
