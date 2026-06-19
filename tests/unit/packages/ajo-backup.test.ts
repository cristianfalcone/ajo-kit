import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { push } from '../../../packages/ajo-backup/src/push'

let dir: string | null = null

afterEach(() => {
	if (dir) rmSync(dir, { recursive: true, force: true })
	dir = null
})

const fakeDatabase = (path: string) => ({
	name: path,
	pragma: vi.fn(),
	backup: vi.fn(async (dest: string) => {
		writeFileSync(dest, 'snapshot')
	}),
})

describe('ajo-backup push', () => {
	test('once rotates a snapshot and uploads WAL changes when present', async () => {
		dir = mkdtempSync(join(tmpdir(), 'ajo-backup-'))
		const path = join(dir, 'database.sqlite')
		const wal = `${path}-wal`
		writeFileSync(path, 'database')
		writeFileSync(wal, 'wal changes')

		const database = fakeDatabase(path)
		const snapshot = vi.fn(async (snapshotPath: string) => {
			expect(existsSync(snapshotPath)).toBe(true)
			expect(readFileSync(snapshotPath, 'utf8')).toBe('snapshot')
		})
		const changes = vi.fn(async (changesPath: string) => {
			expect(existsSync(changesPath)).toBe(true)
			expect(readFileSync(changesPath, 'utf8')).toBe('wal changes')
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
		dir = mkdtempSync(join(tmpdir(), 'ajo-backup-'))
		const path = join(dir, 'database.sqlite')
		writeFileSync(path, 'database')

		const database = fakeDatabase(path)
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
