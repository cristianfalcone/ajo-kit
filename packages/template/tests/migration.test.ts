import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { close, connect, db } from 'ajo-kit/database'
import { expect, test } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))
const kit = join(root, 'node_modules/.bin/kit')

test('public plugin migrations precede notes and the project migration rolls back', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'ajo-notes-migration-'))
	const database = join(directory, 'notes.sqlite')
	const migrate = (direction: string) => promisify(execFile)(kit, ['migrate', direction, '--database', database], { cwd: root })
	try {
		const result = await migrate('up')
		expect(result.stdout).toContain('plugin/ajo-kit-auth/')
		expect(result.stdout).toContain('project/0001_notes')
		connect(database)
		expect((await db().introspection.getTables()).map(table => table.name)).toEqual(expect.arrayContaining(['users', 'sessions', 'notes']))
		await close()
		expect((await migrate('down')).stdout).toContain('project/0001_notes')
		connect(database)
		const tables = (await db().introspection.getTables()).map(table => table.name)
		expect(tables).toContain('users')
		expect(tables).not.toContain('notes')
	} finally {
		await close()
		await rm(directory, { recursive: true, force: true })
	}
}, 30_000)
