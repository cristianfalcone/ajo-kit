#!/usr/bin/env node
import 'dotenv/config'
import sade from 'sade'
import type { Kysely } from 'kysely'
import * as url from 'node:url'
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { dev, build, listen } from 'ajo-kit/node'
import { defaults } from 'ajo-kit/vite'
import { discover } from '../src/discover.ts'

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
	if (error) throw error
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
	.describe('Build for ajo-engine')
	.option('--compiler', 'ajo-engine-compiler executable path')
	.option('--check', 'Fail on temporary Node builtin findings')
	.action(async (opts: { compiler?: string; check?: boolean }) => {
		await build({ check: opts.check })

		if (!opts.compiler) {
			console.log('ajo-engine-compiler --input .ajo/compiler.json --output dist/ajo')
			return
		}

		await rm('dist/ajo', { force: true, recursive: true })
		await new Promise<void>((resolve, reject) => {
			const child = spawn(opts.compiler!, ['--input', '.ajo/compiler.json', '--output', 'dist/ajo'], { stdio: 'inherit' })
			child.once('error', reject)
			child.once('exit', (code, signal) => code === 0
				? resolve()
				: reject(new Error(signal ? `compiler terminated by ${signal}` : `compiler exited with status ${code}`)))
		})
	})

// Migrate commands:

cli.command('migrate up')
	.describe('Run pending migrations')
	.option('-d, --database', 'Database path', defaults.database)
	.action(async (opts: { database: string }) => {
		const { migrator, registry } = await import('../src/migrate.ts')
		const compiled = await registry()
		await database(opts.database, async (db) => {
			const { results, error } = await migrator(db(), compiled).migrateToLatest()
			report(results, error, 'No pending migrations')
		})
	})

cli.command('migrate down')
	.describe('Rollback last migration')
	.option('-d, --database', 'Database path', defaults.database)
	.action(async (opts: { database: string }) => {
		const { migrator, registry } = await import('../src/migrate.ts')
		const compiled = await registry()
		await database(opts.database, async (db) => {
			const { results, error } = await migrator(db(), compiled).migrateDown()
			report(results, error, 'No migrations to rollback', ' (rolled back)')
		})
	})

cli.command('migrate status')
	.describe('Show migration status')
	.option('-d, --database', 'Database path', defaults.database)
	.action(async (opts: { database: string }) => {
		const { migrationStatus, registry } = await import('../src/migrate.ts')
		const compiled = await registry()
		await database(opts.database, async (db) => {
			const migrations = await migrationStatus(db(), compiled)
			for (const m of migrations) console.log(`${m.executedAt ? ok : pending} ${m.name}`)
		})
	})

cli.command('migrate create <name>')
	.describe('Create a new migration file')
	.action(async (name: string) => {

		const { mkdirSync, writeFileSync, readdirSync } = await import('node:fs')
		const { join } = await import('node:path')
		const { migrationFile } = await import('../src/migrate.ts')

		const dir = join(process.cwd(), defaults.migrations)

		mkdirSync(dir, { recursive: true })

		const file = migrationFile(readdirSync(dir), name)

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
				const mod = await import(url.pathToFileURL(join(dir, file)).href)
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
		const mod = await import(url.pathToFileURL(plugin.commands).href)
		if (typeof mod.register === 'function') mod.register(cli)
	} catch (error) {
		console.error(`Failed to load commands from ${plugin.name}:`, error)
	}
}

cli.parse(process.argv)
