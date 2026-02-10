#!/usr/bin/env tsx
import 'dotenv/config'
import sade from 'sade'
import { dev, build, start, listen } from 'ajo-kit/node'
import { discover } from 'ajo-kit/discover'
import { defaults } from 'ajo-kit/vite'

const cli = sade('kit')

cli.command('dev')
	.describe('Start development server')
	.option('-p, --port', 'Port number', 5173)
	.action(async (opts: { port: number }) => {
		await listen(await dev(), opts.port)
	})

cli.command('build')
	.describe('Build for production')
	.action(async () => {
		await build()
	})

cli.command('start')
	.describe('Start production server')
	.option('-p, --port', 'Port number', 5173)
	.action(async (opts: { port: number }) => {
		process.env.NODE_ENV ??= 'production'
		await listen(await start(), opts.port)
	})

// Migrate commands

cli.command('migrate up')
	.describe('Run pending migrations')
	.option('-d, --database', 'Database path', defaults.database)
	.action(async (opts: { database: string }) => {

		const { connect, db, close } = await import('ajo-kit/database')
		const { migrator } = await import('ajo-kit/migrate')

		connect(opts.database)

		const { results, error } = await migrator(db()).migrateToLatest()

		for (const r of results ?? []) {
			const status = r.status === 'Success' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
			console.log(`${status} ${r.migrationName}`)
		}

		if (error) { console.error(error); process.exit(1) }
		if (!results?.length) console.log('No pending migrations')

		await close()
	})

cli.command('migrate down')
	.describe('Rollback last migration')
	.option('-d, --database', 'Database path', defaults.database)
	.action(async (opts: { database: string }) => {

		const { connect, db, close } = await import('ajo-kit/database')
		const { migrator } = await import('ajo-kit/migrate')

		connect(opts.database)

		const { results, error } = await migrator(db()).migrateDown()

		for (const r of results ?? []) {
			const status = r.status === 'Success' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
			console.log(`${status} ${r.migrationName} (rolled back)`)
		}

		if (error) { console.error(error); process.exit(1) }
		if (!results?.length) console.log('No migrations to rollback')

		await close()
	})

cli.command('migrate status')
	.describe('Show migration status')
	.option('-d, --database', 'Database path', defaults.database)
	.action(async (opts: { database: string }) => {

		const { connect, db, close } = await import('ajo-kit/database')
		const { migrator } = await import('ajo-kit/migrate')

		connect(opts.database)

		const migrations = await migrator(db()).getMigrations()

		for (const m of migrations) {
			const status = m.executedAt ? '\x1b[32m✓\x1b[0m' : '\x1b[33m○\x1b[0m'
			console.log(`${status} ${m.name}`)
		}

		await close()
	})

cli.command('migrate create <name>')
	.describe('Create a new migration file')
	.action(async (name: string) => {

		const { mkdirSync, writeFileSync, readdirSync } = await import('node:fs')
		const { join } = await import('node:path')

		const dir = join(process.cwd(), defaults.migrations)

		mkdirSync(dir, { recursive: true })

		const files = readdirSync(dir).filter(f => f.endsWith('.ts'))
		const next = String(files.length + 1).padStart(4, '0')
		const file = `${next}_${name}.ts`

		writeFileSync(join(dir, file), `import type { Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {
}

export async function down(db: Kysely<any>): Promise<void> {
}
`)
		console.log(`Created ${join(defaults.migrations, file)}`)
	})

cli.command('seed')
	.describe('Run database seeds')
	.option('-d, --database', 'Database path', defaults.database)
	.action(async (opts: { database: string }) => {

		const { connect, db, close } = await import('ajo-kit/database')
		const { join } = await import('node:path')
		const { readdirSync } = await import('node:fs')

		connect(opts.database)

		const dir = join(process.cwd(), defaults.seeds)

		let files: string[]

		try { files = readdirSync(dir).filter(f => f.endsWith('.ts')).sort() } catch { files = [] }

		if (!files.length) { console.log('No seed files found'); await close(); return }

		for (const file of files) {

			const mod = await import(join(dir, file))

			if (typeof mod.seed === 'function') {
				await mod.seed(db())
				console.log(`\x1b[32m✓\x1b[0m ${file}`)
			}
		}

		await close()
	})

// Discover plugin commands

for (const plugin of discover()) {

	if (!plugin.commands) continue

	try {
		const mod = await import(plugin.commands)
		if (typeof mod.register === 'function') mod.register(cli)
	} catch (error) {
		console.error(`Failed to load commands from ${plugin.name}:`, error)
	}
}

cli.parse(process.argv)
