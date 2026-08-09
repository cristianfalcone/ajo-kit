import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { close, connect, db } from '../src/database.node'
import { migrationStatus, migrator } from '../src/migrate'

describe('ajo-kit migrations integration', () => {
	test('plugin and project own independent sequences', async () => {
		const root = mkdtempSync(join(tmpdir(), 'ajo-kit-migrate-'))
		const app = join(root, 'db/migrations')
		const plugin = join(root, 'node_modules/ajo-authored')
		const folder = join(plugin, 'migrations')
		const path = join(root, 'test.sqlite')

		mkdirSync(app, { recursive: true })
		mkdirSync(folder, { recursive: true })
		writeFileSync(join(plugin, 'package.json'), JSON.stringify({
			name: 'ajo-authored',
			kit: { migrations: './migrations' },
		}))
		writeFileSync(join(folder, '0001_initial.ts'), [
			'export async function up(db) {',
			"  await db.schema.createTable('plugin_ready').addColumn('id', 'integer', c => c.primaryKey()).execute()",
			"  await db.insertInto('plugin_ready').values({ id: 1 }).execute()",
			'}',
			"export async function down(db) { await db.schema.dropTable('plugin_ready').execute() }",
		].join('\n'))
		writeFileSync(join(app, '0001_initial.ts'), [
			'export async function up(db) {',
			"  await db.selectFrom('plugin_ready').select('id').executeTakeFirstOrThrow()",
			"  await db.schema.createTable('project_ready').addColumn('id', 'integer').execute()",
			'}',
			"export async function down(db) { await db.schema.dropTable('project_ready').execute() }",
		].join('\n'))

		try {
			connect(path)
			const first = await migrator(db(), root).migrateToLatest()
			expect(first.error).toBeUndefined()
			expect(first.results?.map(result => result.migrationName)).toEqual([
				'plugin/ajo-authored/0001_initial',
				'project/0001_initial',
			])

			writeFileSync(join(folder, '0002_later.ts'), [
				'export async function up(db) {',
				"  await db.schema.alterTable('plugin_ready').addColumn('later', 'text').execute()",
				'}',
				"export async function down(db) { await db.schema.alterTable('plugin_ready').dropColumn('later').execute() }",
			].join('\n'))

			const later = await migrator(db(), root).migrateToLatest()
			expect(later.error).toBeUndefined()
			expect(later.results?.map(result => result.migrationName))
				.toEqual(['plugin/ajo-authored/0002_later'])
			expect(await db().selectFrom('kysely_migration').select('name').orderBy('timestamp').execute())
				.toEqual([
					{ name: 'plugin/ajo-authored/0001_initial' },
					{ name: 'project/0001_initial' },
					{ name: 'plugin/ajo-authored/0002_later' },
				])

			const rolledBack = await migrator(db(), root).migrateDown()
			expect(rolledBack.error).toBeUndefined()
			expect(rolledBack.results?.map(result => result.migrationName))
				.toEqual(['plugin/ajo-authored/0002_later'])
			expect(await db().selectFrom('kysely_migration').select('name').orderBy('timestamp').execute())
				.toEqual([
					{ name: 'plugin/ajo-authored/0001_initial' },
					{ name: 'project/0001_initial' },
				])
		} finally {
			await close()
			rmSync(root, { recursive: true, force: true })
		}
	})

	test('every migration must define a real rollback', async () => {
		const root = mkdtempSync(join(tmpdir(), 'ajo-kit-migrate-down-'))
		const app = join(root, 'db/migrations')
		const path = join(root, 'test.sqlite')

		mkdirSync(app, { recursive: true })
		writeFileSync(join(app, '0001_irreversible.ts'), 'export async function up() {}\n')

		try {
			connect(path)
			await expect(migrator(db(), root).getMigrations())
				.rejects.toThrow('must export up() and down(): 0001_irreversible')
		} finally {
			await close()
			rmSync(root, { recursive: true, force: true })
		}
	})

	test('status rejects executed migrations missing from their source', async () => {
		const root = mkdtempSync(join(tmpdir(), 'ajo-kit-migrate-status-'))
		const app = join(root, 'db/migrations')
		const path = join(root, 'test.sqlite')
		const initial = join(app, '0001_initial.ts')

		mkdirSync(app, { recursive: true })
		writeFileSync(initial, [
			"export async function up(db) { await db.schema.createTable('ready').addColumn('id', 'integer').execute() }",
			"export async function down(db) { await db.schema.dropTable('ready').execute() }",
		].join('\n'))

		try {
			connect(path)
			const migrated = await migrator(db(), root).migrateToLatest()
			expect(migrated.error).toBeUndefined()
			renameSync(initial, join(app, '0001_rebased.ts'))
			await expect(migrationStatus(db(), root))
				.rejects.toThrow('Migration history references missing migrations: project/0001_initial')
		} finally {
			await close()
			rmSync(root, { recursive: true, force: true })
		}
	})

	test('each migration source must start at 0001 and stay contiguous', async () => {
		const root = mkdtempSync(join(tmpdir(), 'ajo-kit-migrate-gap-'))
		const app = join(root, 'db/migrations')
		const path = join(root, 'test.sqlite')
		const migration = 'export async function up() {}\n'

		mkdirSync(app, { recursive: true })
		writeFileSync(join(app, '0001_initial.ts'), migration)
		writeFileSync(join(app, '0003_gap.ts'), migration)

		try {
			connect(path)
			await expect(migrator(db(), root).getMigrations())
				.rejects.toThrow('expected 0002_*, found 0003_gap')
		} finally {
			await close()
			rmSync(root, { recursive: true, force: true })
		}
	})
})
