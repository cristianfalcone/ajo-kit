#!/usr/bin/env node
import { spawn, type StdioOptions } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

// Creates an App from the starter shipped in this package, pinned to the Ajo
// release it was published with. Output follows kit's contract: human lines
// on stderr, one JSON document on stdout with --json, and every failure a
// snake_case code with a message and a next step.

const template = fileURLToPath(new URL('../template/', import.meta.url))
const json = process.argv.includes('--json')

const failure = (code: string, message: string, next: string) => Object.assign(new Error(message), { code, next })

const report = (line: string) => process.stderr.write(`${line}\n`)

/** Runs a command in `cwd`, by default with its output on stderr; resolves to its exit status, or null when it cannot start. */
const run = (command: string, args: string[], cwd: string, stdio: StdioOptions = ['ignore', 2, 2]) => new Promise<number | null>(done => {
	const child = spawn(command, args, { cwd, stdio })
	child.once('error', () => done(null))
	child.once('close', code => done(code ?? 1))
})

async function create(argv: string[]) {
	let positionals: string[]
	try {
		({ positionals } = parseArgs({ args: argv, options: { json: { type: 'boolean' } }, allowPositionals: true, strict: true }))
	} catch (error) {
		throw failure('usage', (error as Error).message.replace(/\. To specify a positional.*$/s, ''), 'pnpm create ajo <dir>')
	}
	if (positionals.length !== 1) {
		throw failure('usage', positionals.length ? `Unexpected argument: ${positionals[1]}` : 'Missing <dir>', 'pnpm create ajo <dir>')
	}

	const [directory] = positionals
	const target = resolve(directory)
	const name = basename(target)
	const entries = await readdir(target).catch((error: NodeJS.ErrnoException) => {
		if (error.code === 'ENOENT') return []
		if (error.code === 'ENOTDIR') throw failure('target_exists', `${directory} is a file`, 'pnpm create ajo <new directory>')
		throw error
	})
	if (entries.length) throw failure('target_exists', `${directory} is not empty`, 'pnpm create ajo <new directory>')

	await mkdir(target, { recursive: true })
	await cp(template, target, { recursive: true })
	// npm never packs a .gitignore, so the starter ships it as gitignore.
	await rename(join(target, 'gitignore'), join(target, '.gitignore'))
	const manifest = join(target, 'package.json')
	await writeFile(manifest, JSON.stringify({ ...JSON.parse(await readFile(manifest, 'utf8')), name }, null, 2) + '\n')
	report(`✓ Created ${directory}`)

	// Status 0 means the directory is already inside a work tree; null means git is not installed.
	const inside = await run('git', ['rev-parse', '--is-inside-work-tree'], target, 'ignore')
	if (inside !== 0 && inside !== null) {
		if (await run('git', ['init', '--quiet', '-b', 'main'], target) !== 0) {
			throw failure('install_failed', 'git init failed', `cd ${directory} && git init -b main`)
		}
		report('✓ Initialized a Git repository on main')
	}

	if (await run('pnpm', ['install'], target) !== 0) {
		throw failure('install_failed', 'pnpm install failed', `cd ${directory} && pnpm install && node scripts/setup.mjs`)
	}
	report('✓ Installed the dependencies')
	if (await run(process.execPath, ['scripts/setup.mjs'], target) !== 0) {
		throw failure('install_failed', 'The starter setup failed', `cd ${directory} && node scripts/setup.mjs`)
	}
	report('✓ Created .env and the database')

	return { result: { directory, name }, next: `cd ${directory} && pnpm kit dev` }
}

try {
	const { result, next } = await create(process.argv.slice(2))
	report(`next: ${next}`)
	if (json) process.stdout.write(`${JSON.stringify({ ok: true, result, next })}\n`)
} catch (error) {
	const code = (error as { code?: unknown }).code
	const known = typeof code === 'string' && /^[a-z]+(?:_[a-z]+)*$/.test(code)
	const next = known ? (error as { next: string }).next : 'This is a bug: report it with the stack above'
	report(`✗ ${known ? (error as Error).message : (error as Error).stack ?? String(error)}`)
	report(`next: ${next}`)
	if (json) process.stdout.write(`${JSON.stringify({ ok: false, error: { code: known ? code : 'internal', message: (error as Error).message }, next })}\n`)
	process.exitCode = 1
}
