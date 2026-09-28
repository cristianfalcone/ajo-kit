#!/usr/bin/env node
import 'dotenv/config'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import type { Kysely } from 'kysely'
import { build, dev, listen } from 'ajo-kit/node'
import { discover } from '../src/discover.ts'
import type { Migrations } from '../src/migrate.ts'
import manifest from '../package.json' with { type: 'json' }

// The runner owns the output contract of every command, plugin commands
// included: human lines on stderr, one JSON document on stdout with --json,
// and every failure a snake_case code with a message and a next step.

type Option = { type: 'string' | 'boolean'; short?: string; default?: string; describe: string }

type Command = {
	describe: string
	options?: Record<string, Option>
	action: (input: {
		args: string[]
		options: Record<string, string | boolean | undefined>
		report: (line: string) => void
	}) => Promise<{ result: unknown; next?: string }>
}

const commands = new Map<string, Command & { usage: string }>()

/** What a plugin's `register(cli)` receives. */
const cli = {
	/** Adds a command; `usage` is its words, then `<required>` and `[optional]` arguments. */
	command(usage: string, command: Command) {
		const name = usage.split(' ').filter(word => !/^[<[]/.test(word)).join(' ')
		if (commands.has(name)) throw new Error(`the command "${name}" already exists`)
		commands.set(name, { ...command, usage })
	},
}

const failure = (code: string, message: string, next: string) => Object.assign(new Error(message), { code, next })

const message = (error: unknown) => error instanceof Error ? error.message : String(error)

// Node and SQLite codes are upper case: only a snake_case code marks an expected failure.
const expected = (error: unknown): error is Error & { code: string; next?: string } => {
	const code = (error as { code?: unknown } | null)?.code
	return error instanceof Error && typeof code === 'string' && /^[a-z]+(?:_[a-z]+)*$/.test(code)
}

const json = process.argv.includes('--json')
const write = process.stdout.write.bind(process.stdout)
const color = process.stderr.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb'
const marks: Record<string, number> = { '✓': 32, '✗': 31, '○': 33 }

function report(line: string) {
	const mark = color && marks[line[0]]
	process.stderr.write(`${mark ? `\x1b[${mark}m${line[0]}\x1b[0m${line.slice(1)}` : line}\n`)
}

const table = (rows: string[][]) => {
	const width = Math.max(...rows.map(([left]) => left.length))
	return rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`).join('\n')
}

const flags = [['--json', 'Print one JSON document on stdout'], ['-h, --help', 'Show help']]

function help(name?: string) {
	if (!name) return [
		'Usage: kit <command> [options]',
		'',
		'Commands:',
		table([...commands.values()].map(({ usage, describe }) => [usage, describe])),
		'',
		'Options:',
		table([...flags, ['-v, --version', 'Show the version']]),
		'',
		'Run pnpm kit <command> --help for the options of a command.',
	].join('\n')

	const { usage, describe, options = {} } = commands.get(name)!
	return [
		`Usage: kit ${usage} [options]`,
		'',
		describe,
		'',
		'Options:',
		table([
			...Object.entries(options).map(([key, option]) => [
				`${option.short ? `-${option.short}, ` : ''}--${key}${option.type === 'string' ? ` <${key}>` : ''}`,
				option.default === undefined ? option.describe : `${option.describe} (default ${option.default})`,
			]),
			...flags,
		]),
	].join('\n')
}

function project() {
	let pkg: { dependencies?: object; devDependencies?: object } | undefined
	try { pkg = JSON.parse(readFileSync('package.json', 'utf8')) } catch {}
	if (!pkg || !('ajo-kit' in { ...pkg.dependencies, ...pkg.devDependencies })) {
		throw failure('not_a_project', `No package.json depending on ajo-kit in ${process.cwd()}`,
			'Run kit in a project directory whose package.json depends on ajo-kit')
	}
}

/** Seals .ajo into dist/ajo with the project's own ajo-engine-compiler; false when it is not installed. */
async function seal() {
	// Walks up node_modules like Node's resolution but skips NODE_PATH, which
	// pnpm points at packages the project did not declare.
	let directory = process.cwd()
	while (!existsSync(join(directory, 'node_modules/ajo-engine-compiler/package.json'))) {
		if (dirname(directory) === directory) return false
		directory = dirname(directory)
	}
	const installed = join(directory, 'node_modules/ajo-engine-compiler')
	const compiler = join(installed, JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8')).bin['ajo-engine-compiler'])

	await mkdir('dist', { recursive: true })
	await rm('dist/ajo', { force: true, recursive: true })
	await new Promise<void>((resolve, reject) => {
		const child = spawn(compiler, ['--input', '.ajo/compiler.json', '--output', 'dist/ajo'], { stdio: ['ignore', 2, 2] })
		child.once('error', reject)
		child.once('exit', (code, signal) => code === 0
			? resolve()
			: reject(new Error(signal ? `ajo-engine-compiler terminated by ${signal}` : `ajo-engine-compiler exited with status ${code}`)))
	})
	return true
}

/** Runs `fn` on the database at `path` with the application's migrations; any failure is `migrate_failed`. */
async function migrations<T>(path: string, command: string, fn: (db: Kysely<any>, compiled: Migrations) => Promise<T>) {
	try {
		const { migrationModules } = await import('../src/migrate.ts')
		const compiled = await migrationModules()
		const { connect, db, close } = await import('ajo-kit/database')
		connect(path)
		try { return await fn(db(), compiled) }
		finally { await close() }
	} catch (error) {
		throw failure('migrate_failed', message(error), `Fix the error above, then run pnpm kit migrate ${command}`)
	}
}

type Result = { status: 'Success' | 'Error' | 'NotExecuted'; migrationName: string }

/** Reports each migration and names the failed one in the error it throws. */
function settle(results: readonly Result[] = [], error: unknown, suffix = '') {
	const marker = { Success: '✓', Error: '✗', NotExecuted: '○' }
	for (const { status, migrationName } of results) report(`${marker[status]} ${migrationName}${suffix}`)
	const failed = results.find(({ status }) => status === 'Error')
	if (error) throw failed ? new Error(`${failed.migrationName}: ${message(error)}`) : error
	return results
}

const database: Option = { type: 'string', short: 'd', default: './database.sqlite', describe: 'Database path' }

cli.command('dev', {
	describe: 'Start the development server',
	options: { port: { type: 'string', short: 'p', default: '5173', describe: 'Port, or the next free one' } },
	async action({ options }) {
		project()
		const port = Number(options.port)
		if (!Number.isInteger(port) || port < 1 || port > 65_535) {
			throw failure('usage', `Invalid port: ${options.port}`, 'pnpm kit dev --port 5173')
		}
		const url = `http://localhost:${await listen(await dev(), port)}`
		report(`✓ Serving ${url}`)
		return { result: { url } }
	},
})

cli.command('build', {
	describe: 'Build for ajo-engine, sealed into dist/ajo when ajo-engine-compiler is installed',
	async action() {
		project()
		try { await build() }
		catch (error) { throw failure('build_failed', message(error), 'Fix the error above, then run pnpm kit build') }
		report('✓ Staged .ajo')

		let sealed: boolean
		try { sealed = await seal() }
		catch (error) { throw failure('seal_failed', message(error), 'Fix the error above, then run pnpm kit build') }
		if (!sealed) {
			report('○ Not sealed: ajo-engine-compiler is not installed')
			return {
				result: { staged: '.ajo', sealed: false },
				next: 'On Linux x64, pnpm add --save-optional --save-exact ajo-engine ajo-engine-compiler, then pnpm kit build',
			}
		}
		report('✓ Sealed dist/ajo')
		return { result: { staged: '.ajo', sealed: true, artifact: 'dist/ajo' } }
	},
})

cli.command('migrate up', {
	describe: 'Run pending migrations',
	options: { database },
	async action({ options }) {
		project()
		const results = await migrations(options.database as string, 'up', async (db, compiled) => {
			const { migrator } = await import('../src/migrate.ts')
			const { results, error } = await migrator(db, compiled).migrateToLatest()
			return settle(results, error)
		})
		if (!results.length) report('No pending migrations')
		return { result: results.map(({ migrationName }) => ({ name: migrationName, status: 'applied' })) }
	},
})

cli.command('migrate down', {
	describe: 'Roll back the latest migration',
	options: { database },
	async action({ options }) {
		project()
		const results = await migrations(options.database as string, 'down', async (db, compiled) => {
			const { migrator } = await import('../src/migrate.ts')
			const { results, error } = await migrator(db, compiled).migrateDown()
			return settle(results, error, ' (rolled back)')
		})
		if (!results.length) report('No migrations to roll back')
		return { result: results.map(({ migrationName }) => ({ name: migrationName, status: 'rolled_back' })) }
	},
})

cli.command('migrate status', {
	describe: 'Show migration status',
	options: { database },
	async action({ options }) {
		project()
		const list = await migrations(options.database as string, 'status', async (db, compiled) => {
			const { migrationStatus } = await import('../src/migrate.ts')
			return migrationStatus(db, compiled)
		})
		for (const { name, executedAt } of list) report(`${executedAt ? '✓' : '○'} ${name}`)
		return { result: list.map(({ name, executedAt }) => ({ name, status: executedAt ? 'applied' : 'pending' })) }
	},
})

cli.command('migrate create <name>', {
	describe: 'Create the next project migration file',
	async action({ args: [name] }) {
		project()
		const folder = 'db/migrations'
		let file: string
		try {
			const { migrationFile } = await import('../src/migrate.ts')
			mkdirSync(folder, { recursive: true })
			file = join(folder, migrationFile(readdirSync(folder), name))
		} catch (error) {
			throw failure('migrate_failed', message(error), 'pnpm kit migrate create <name>')
		}
		writeFileSync(file, `import type { Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {
}

export async function down(db: Kysely<any>): Promise<void> {
}
`)
		report(`✓ Created ${file}`)
		return { result: { file } }
	},
})

cli.command('seed', {
	describe: 'Run the db/seeds files in name order',
	options: { database },
	async action({ options }) {
		project()
		const folder = join(process.cwd(), 'db/seeds')
		let files: string[]
		try { files = readdirSync(folder).filter(file => file.endsWith('.ts')).sort() } catch { files = [] }
		if (!files.length) {
			report('No seed files found')
			return { result: [] }
		}

		const { connect, db, close } = await import('ajo-kit/database')
		const seeded: string[] = []
		try {
			connect(options.database as string)
			for (const file of files) {
				const mod = await import(pathToFileURL(join(folder, file)).href)
				if (typeof mod.seed !== 'function') continue
				await mod.seed(db())
				report(`✓ ${file}`)
				seeded.push(file)
			}
		} catch (error) {
			throw failure('seed_failed', message(error), 'Fix the error above, then run pnpm kit seed')
		} finally {
			await close()
		}
		return { result: seeded }
	},
})

async function load() {
	let name = 'A plugin'
	try {
		for (const plugin of discover()) {
			if (!plugin.commands) continue
			name = plugin.name
			const { register } = await import(pathToFileURL(plugin.commands).href)
			register(cli)
		}
	} catch (error) {
		throw failure('plugin_failed', `${name} could not add its commands: ${message(error)}`, 'Reinstall the project dependencies with pnpm install')
	}
}

/** Runs one command and returns its outcome; undefined when it printed help or the version instead. */
async function run(argv: string[]) {
	await load()

	const first = argv.findIndex(arg => arg.startsWith('-'))
	const words = first === -1 ? argv : argv.slice(0, first)
	let size = words.length
	while (size > 0 && !commands.has(words.slice(0, size).join(' '))) size--

	if (!size) {
		if (argv.includes('-v') || argv.includes('--version')) {
			write(`${manifest.version}\n`)
			return
		}
		if (!argv.length || argv.includes('-h') || argv.includes('--help')) {
			write(`${help()}\n`)
			return
		}
		throw failure('usage', words.length ? `Unknown command: ${words.join(' ')}` : 'No command given', 'pnpm kit --help')
	}

	const name = words.slice(0, size).join(' ')
	const command = commands.get(name)!
	const usage = `pnpm kit ${name} --help`
	let parsed
	try {
		parsed = parseArgs({
			args: argv.slice(size),
			options: {
				...Object.fromEntries(Object.entries(command.options ?? {}).map(([key, { describe, ...option }]) => [key, option])),
				json: { type: 'boolean' },
				help: { type: 'boolean', short: 'h' },
			},
			allowPositionals: true,
			strict: true,
		})
	} catch (error) {
		// Node's unknown-option message continues with advice about positionals.
		throw failure('usage', message(error).replace(/\. To specify a positional.*$/s, ''), usage)
	}
	if (parsed.values.help) {
		write(`${help(name)}\n`)
		return
	}

	const parts = command.usage.split(' ')
	const required = parts.filter(part => part.startsWith('<'))
	const limit = required.length + parts.filter(part => part.startsWith('[')).length
	const { positionals } = parsed
	if (positionals.length < required.length) throw failure('usage', `Missing ${required.slice(positionals.length).join(' ')}`, usage)
	if (positionals.length > limit) throw failure('usage', `Unexpected argument: ${positionals[limit]}`, usage)

	// Stdout carries only the JSON document: Vite, libraries and plugins that
	// log with console.log reach stderr for the rest of the process.
	process.stdout.write = process.stderr.write.bind(process.stderr) as typeof process.stdout.write
	return command.action({ args: positionals, options: parsed.values, report })
}

try {
	const outcome = await run(process.argv.slice(2))
	if (outcome?.next) report(`next: ${outcome.next}`)
	if (outcome && json) write(`${JSON.stringify({ ok: true, result: outcome.result, next: outcome.next ?? null })}\n`)
} catch (error) {
	const known = expected(error)
	const next = known ? error.next : 'This is a bug: report it with the stack above'
	report(`✗ ${known ? error.message : (error instanceof Error && error.stack) || message(error)}`)
	if (next) report(`next: ${next}`)
	if (json) write(`${JSON.stringify({ ok: false, error: { code: known ? error.code : 'internal', message: message(error) }, next: next ?? null })}\n`)
	process.exitCode = 1
}
