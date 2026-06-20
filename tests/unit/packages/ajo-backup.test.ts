import { existsSync as exists, mkdtempSync as temp, readFileSync as read, rmSync as rm, writeFileSync as write } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach as after, describe, expect, test, vi } from 'vitest'
import { push } from '../../../packages/ajo-backup/src/push'

let dir: string | null = null

after(() => {
	if (dir) rm(dir, { recursive: true, force: true })
	dir = null
})

const fake = (path: string) => ({
	name: path,
	pragma: vi.fn(),
	backup: vi.fn(async (dest: string) => {
		write(dest, 'snapshot')
	}),
})

describe('ajo-backup push', () => {
	test('once rotates a snapshot and uploads WAL changes when present', async () => {
		dir = temp(join(tmpdir(), 'ajo-backup-'))
		const path = join(dir, 'database.sqlite')
		const wal = `${path}-wal`
		write(path, 'database')
		write(wal, 'wal changes')

		const database = fake(path)
		const snapshot = vi.fn(async (snapshot: string) => {
			expect(exists(snapshot)).toBe(true)
			expect(read(snapshot, 'utf8')).toBe('snapshot')
		})
		const changes = vi.fn(async (changes: string) => {
			expect(exists(changes)).toBe(true)
			expect(read(changes, 'utf8')).toBe('wal changes')
		})
		const clear = vi.fn(async () => undefined)

		await push({
			database: database as any,
			snapshot,
			changes,
			clear,
		}).once()

		expect(database.pragma).toHaveBeenCalledWith('wal_autocheckpoint = 0')
		expect(database.pragma).toHaveBeenCalledWith('wal_checkpoint(TRUNCATE)')
		expect(database.backup).toHaveBeenCalledOnce()
		expect(snapshot).toHaveBeenCalledOnce()
		expect(clear).toHaveBeenCalledOnce()
		expect(changes).toHaveBeenCalledOnce()
	})

	test('once skips WAL upload when there are no changes', async () => {
		dir = temp(join(tmpdir(), 'ajo-backup-'))
		const path = join(dir, 'database.sqlite')
		write(path, 'database')

		const database = fake(path)
		const snapshot = vi.fn(async () => undefined)
		const changes = vi.fn(async () => undefined)
		const clear = vi.fn(async () => undefined)

		await push({
			database: database as any,
			snapshot,
			changes,
			clear,
		}).once()

		expect(snapshot).toHaveBeenCalledOnce()
		expect(clear).toHaveBeenCalledOnce()
		expect(changes).not.toHaveBeenCalled()
	})
})
