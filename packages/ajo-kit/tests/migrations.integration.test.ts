import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { close, connect, db } from '../src/database.node'
import { migrationStatus, migrator, registry } from '../src/migrate'
import type { MigrationRegistry } from '../src/migrations'

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
			const initial = await registry(root)
			expect(initial.map(migration => migration.name)).toEqual([
				'plugin/ajo-authored/0001_initial',
				'project/0001_initial',
			])

			const first = await migrator(db(), initial).migrateToLatest()
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

			const extended = await registry(root)
			expect(extended.map(migration => migration.name)).toEqual([
				'plugin/ajo-authored/0001_initial',
				'plugin/ajo-authored/0002_later',
				'project/0001_initial',
			])

			const later = await migrator(db(), extended).migrateToLatest()
			expect(later.error).toBeUndefined()
			expect(later.results?.map(result => result.migrationName))
				.toEqual(['plugin/ajo-authored/0002_later'])
			expect(await db().selectFrom('kysely_migration').select('name').orderBy('timestamp').execute())
				.toEqual([
					{ name: 'plugin/ajo-authored/0001_initial' },
					{ name: 'project/0001_initial' },
					{ name: 'plugin/ajo-authored/0002_later' },
				])

			const rolledBack = await migrator(db(), extended).migrateDown()
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

	test('file-built and direct registries produce the same history and results', async () => {
		const root = mkdtempSync(join(tmpdir(), 'ajo-kit-migrate-registry-'))
		const app = join(root, 'db/migrations')
		const filePath = join(root, 'file.sqlite')
		const compiledPath = join(root, 'compiled.sqlite')

		mkdirSync(app, { recursive: true })
		writeFileSync(join(app, '0001_initial.ts'), [
			"export async function up(db) { await db.schema.createTable('ready').addColumn('id', 'integer').execute() }",
			"export async function down(db) { await db.schema.dropTable('ready').execute() }",
		].join('\n'))

		const direct: MigrationRegistry = [{
			name: 'project/0001_initial',
			migration: {
				async up(instance) {
					await instance.schema.createTable('ready').addColumn('id', 'integer').execute()
				},
				async down(instance) {
					await instance.schema.dropTable('ready').execute()
				},
			},
		}]

		async function run(path: string, compiled: MigrationRegistry) {
			connect(path)
			try {
				const result = await migrator(db(), compiled).migrateToLatest()
				expect(result.error).toBeUndefined()
				return {
					results: result.results?.map(item => ({
						name: item.migrationName,
						status: item.status,
					})),
					history: await db().selectFrom('kysely_migration').select('name').execute(),
				}
			} finally {
				await close()
			}
		}

		try {
			const files = await registry(root)
			rmSync(app, { recursive: true, force: true })
			expect(await run(compiledPath, direct)).toEqual(await run(filePath, files))

			connect(compiledPath)
			const restarted = await migrator(db(), direct).migrateToLatest()
			expect(restarted.error).toBeUndefined()
			expect(restarted.results).toEqual([])

			const applied = await migrationStatus(db(), direct)
			expect(applied.map(migration => ({
				name: migration.name,
				executed: migration.executedAt instanceof Date,
			}))).toEqual([{ name: 'project/0001_initial', executed: true }])

			const rolledBack = await migrator(db(), direct).migrateDown()
			expect(rolledBack.error).toBeUndefined()
			expect(rolledBack.results?.map(result => result.migrationName))
				.toEqual(['project/0001_initial'])
			const pending = await migrationStatus(db(), direct)
			expect(pending[0]?.executedAt).toBeUndefined()
		} finally {
			await close()
			rmSync(root, { recursive: true, force: true })
		}
	})

	test('registry construction rejects migrations without up or down', async () => {
		const root = mkdtempSync(join(tmpdir(), 'ajo-kit-migrate-down-'))
		const app = join(root, 'db/migrations')

		mkdirSync(app, { recursive: true })
		writeFileSync(join(app, '0001_missing_up.ts'), 'export async function down() {}\n')
		writeFileSync(join(app, '0002_missing_down.ts'), 'export async function up() {}\n')

		try {
			await expect(registry(root)).rejects.toThrow(
				'must export up() and down(): 0001_missing_up, 0002_missing_down'
			)
		} finally {
			rmSync(root, { recursive: true, force: true })
		}
	})

	test('registry construction rejects duplicate migration filenames', async () => {
		const root = mkdtempSync(join(tmpdir(), 'ajo-kit-migrate-duplicate-'))
		const app = join(root, 'db/migrations')
		const migration = 'export async function up() {}\nexport async function down() {}\n'

		mkdirSync(app, { recursive: true })
		writeFileSync(join(app, '0001_initial.ts'), migration)
		writeFileSync(join(app, '0001_initial.js'), migration)

		try {
			await expect(registry(root)).rejects.toThrow('project has duplicate migration filenames')
		} finally {
			rmSync(root, { recursive: true, force: true })
		}
	})

	test('registry construction rejects duplicate migration sources', async () => {
		const root = mkdtempSync(join(tmpdir(), 'ajo-kit-migrate-source-'))
		const migration = 'export async function up() {}\nexport async function down() {}\n'

		for (const folder of ['ajo-first', 'ajo-second']) {
			const plugin = join(root, 'node_modules', folder)
			mkdirSync(join(plugin, 'migrations'), { recursive: true })
			writeFileSync(join(plugin, 'package.json'), JSON.stringify({
				name: 'ajo-shared',
				kit: { migrations: './migrations' },
			}))
			writeFileSync(join(plugin, 'migrations/0001_initial.ts'), migration)
		}

		try {
			await expect(registry(root)).rejects.toThrow('Duplicate migration source "plugin/ajo-shared"')
		} finally {
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
			const initialRegistry = await registry(root)
			const migrated = await migrator(db(), initialRegistry).migrateToLatest()
			expect(migrated.error).toBeUndefined()
			renameSync(initial, join(app, '0001_rebased.ts'))
			await expect(migrationStatus(db(), await registry(root)))
				.rejects.toThrow('Migration history references missing migrations: project/0001_initial')
		} finally {
			await close()
			rmSync(root, { recursive: true, force: true })
		}
	})

	test('each migration source must start at 0001 and stay contiguous', async () => {
		const root = mkdtempSync(join(tmpdir(), 'ajo-kit-migrate-gap-'))
		const app = join(root, 'db/migrations')
		const migration = 'export async function up() {}\nexport async function down() {}\n'

		mkdirSync(app, { recursive: true })
		writeFileSync(join(app, '0001_initial.ts'), migration)
		writeFileSync(join(app, '0003_gap.ts'), migration)

		try {
			await expect(registry(root))
				.rejects.toThrow('expected 0002_*, found 0003_gap')
		} finally {
			rmSync(root, { recursive: true, force: true })
		}
	})
})
