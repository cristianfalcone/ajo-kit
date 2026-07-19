import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { close, connect } from '../src/database'

describe('ajo-kit database integration', () => {
	test('connect applies runtime SQLite pragmas', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ajo-kit-db-'))
		const path = join(dir, 'test.sqlite')

		try {
			const sqlite = connect(path)

			expect(sqlite.pragma('journal_mode', { simple: true })).toBe('wal')
			expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
			expect(sqlite.pragma('busy_timeout', { simple: true })).toBe(5000)
			expect(sqlite.pragma('synchronous', { simple: true })).toBe(1)
		} finally {
			await close()
			rmSync(dir, { recursive: true, force: true })
		}
	})
})
