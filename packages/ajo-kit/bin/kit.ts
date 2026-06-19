#!/usr/bin/env tsx
import 'dotenv/config'
import sade from 'sade'
import type { Kysely } from 'kysely'
import { pathToFileURL } from 'node:url'
import { dev, build, start, listen } from 'ajo-kit/node'
import { discover } from 'ajo-kit/discover'
import { defaults } from 'ajo-kit/vite'

// Status markers:

const ok = '\x1b[32m✓\x1b[0m'
const fail = '\x1b[31m✗\x1b[0m'
const pending = '\x1b[33m○\x1b[0m'

// Database lifecycle wrapper (try/finally ensures close on error):

async function database(path: string, fn: (db: () => Kysely<any>) => Promise<void>) {
	const { connect, db, close } = await import('ajo-kit/database')
	connect(path)
	try { await fn(db) }
	finally { await close() }
}

// Migration result reporter:

function report(results: { status: string; migrationName: string }[] | undefined, error: unknown, empty: string, suffix = '') {
	for (const r of results ?? []) console.log(`${r.status === 'Success' ? ok : fail} ${r.migrationName}${suffix}`)
	if (error) { console.error(error); process.exit(1) }
	if (!results?.length) console.log(empty)
}

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

// Migrate commands:

cli.command('migrate up')
	.describe('Run pending migrations')
	.option('-d, --database', 'Database path', defaults.database)
	.action(async (opts: { database: string }) => {
		await database(opts.database, async (db) => {
			const { migrator } = await import('ajo-kit/migrate')
			const { results, error } = await migrator(db()).migrateToLatest()
			report(results, error, 'No pending migrations')
		})
	})

cli.command('migrate down')
	.describe('Rollback last migration')
	.option('-d, --database', 'Database path', defaults.database)
	.action(async (opts: { database: string }) => {
		await database(opts.database, async (db) => {
			const { migrator } = await import('ajo-kit/migrate')
			const { results, error } = await migrator(db()).migrateDown()
			report(results, error, 'No migrations to rollback', ' (rolled back)')
		})
	})

cli.command('migrate status')
	.describe('Show migration status')
	.option('-d, --database', 'Database path', defaults.database)
	.action(async (opts: { database: string }) => {
		await database(opts.database, async (db) => {
			const { migrator } = await import('ajo-kit/migrate')
			const migrations = await migrator(db()).getMigrations()
			for (const m of migrations) console.log(`${m.executedAt ? ok : pending} ${m.name}`)
		})
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
		await database(opts.database, async (db) => {

			const { join } = await import('node:path')
			const { readdirSync } = await import('node:fs')

			const dir = join(process.cwd(), defaults.seeds)

			let files: string[]
			try { files = readdirSync(dir).filter(f => f.endsWith('.ts')).sort() } catch { files = [] }

			if (!files.length) { console.log('No seed files found'); return }

			for (const file of files) {
				const mod = await import(pathToFileURL(join(dir, file)).href)
				if (typeof mod.seed === 'function') {
					await mod.seed(db())
					console.log(`${ok} ${file}`)
				}
			}
		})
	})

// Discover plugin commands:

for (const plugin of discover()) {

	if (!plugin.commands) continue

	try {
		const mod = await import(pathToFileURL(plugin.commands).href)
		if (typeof mod.register === 'function') mod.register(cli)
	} catch (error) {
		console.error(`Failed to load commands from ${plugin.name}:`, error)
	}
}

cli.parse(process.argv)
