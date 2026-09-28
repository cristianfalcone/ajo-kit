import { spawn } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, describe, expect, test } from 'vitest'
import manifest from '../package.json' with { type: 'json' }

const bin = fileURLToPath(new URL('../bin/kit.ts', import.meta.url))
const loader = pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href
const directories: string[] = []

// The public entry, as `pnpm kit` runs it, with piped streams.
const kit = (cwd: string, ...args: string[]) => new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
	const child = spawn(process.execPath, ['--import', loader, bin, ...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
	let stdout = ''
	let stderr = ''
	child.stdout.setEncoding('utf8').on('data', chunk => stdout += chunk)
	child.stderr.setEncoding('utf8').on('data', chunk => stderr += chunk)
	child.once('error', reject)
	child.once('close', status => resolve({ status, stdout, stderr }))
})

// Exactly one JSON document on stdout.
const document = (stdout: string) => {
	expect(stdout.endsWith('\n') && !stdout.slice(0, -1).includes('\n')).toBe(true)
	return JSON.parse(stdout)
}

const directory = async (files: Record<string, string> = {}) => {
	const root = await mkdtemp(join(tmpdir(), 'ajo-kit-cli-'))
	directories.push(root)
	for (const [path, content] of Object.entries(files)) {
		await mkdir(dirname(join(root, path)), { recursive: true })
		await writeFile(join(root, path), content)
	}
	return root
}

const project = (plugins: Record<string, string> = {}, files: Record<string, string> = {}) => directory({
	'package.json': JSON.stringify({ type: 'module', dependencies: { 'ajo-kit': '*', ...Object.fromEntries(Object.keys(plugins).map(name => [name, '*'])) } }),
	...Object.fromEntries(Object.entries(plugins).flatMap(([name, commands]) => [
		[`node_modules/${name}/package.json`, JSON.stringify({ name, kit: { commands: './commands.mjs' } })],
		[`node_modules/${name}/commands.mjs`, commands],
	])),
	...files,
})

const probe = `
export function register(cli) {
	cli.command('probe <name>', {
		describe: 'Probe the runner',
		options: { loud: { type: 'boolean', describe: 'Louder' } },
		async action({ args: [name], options, report }) {
			report('○ step ' + name)
			console.log('library noise')
			return { result: { name, loud: options.loud ?? false }, next: 'pnpm kit probe again' }
		},
	})
	cli.command('refuse', {
		describe: 'Fail with a code',
		async action() { throw Object.assign(new Error('The host refused'), { code: 'deploy_refused', next: 'Free some space' }) },
	})
	cli.command('crash', {
		describe: 'Fail with a bug',
		async action() { throw new Error('kaput') },
	})
}
`

afterEach(async () => {
	await Promise.all(directories.splice(0).map(path => rm(path, { force: true, recursive: true })))
})

describe('kit runner', { timeout: 30_000 }, () => {
	test('prints the package version', async () => {
		const { status, stdout } = await kit(await directory(), '--version')
		expect(status).toBe(0)
		expect(stdout).toBe(`${manifest.version}\n`)
	})

	test('usage failures carry the usage code and the help command', async () => {
		const root = await project()
		const cases = [
			[['nope', '--json'], 'Unknown command: nope', 'pnpm kit --help'],
			[['build', '--bogus', '--json'], "Unknown option '--bogus'", 'pnpm kit build --help'],
			[['build', 'extra', '--json'], 'Unexpected argument: extra', 'pnpm kit build --help'],
			[['migrate', 'create', '--json'], 'Missing <name>', 'pnpm kit migrate create --help'],
			[['dev', '--port', 'x', '--json'], 'Invalid port: x', 'pnpm kit dev --port 5173'],
		] as const
		for (const [args, message, next] of cases) {
			const { status, stdout } = await kit(root, ...args)
			expect(status).toBe(1)
			expect(document(stdout)).toEqual({ ok: false, error: { code: 'usage', message }, next })
		}
	})

	test('outside a project a command fails with not_a_project on stderr and in the document', async () => {
		const root = await directory()
		const { status, stdout, stderr } = await kit(root, 'build', '--json')
		expect(status).toBe(1)
		expect(document(stdout)).toMatchObject({ ok: false, error: { code: 'not_a_project' } })
		expect(stderr).toContain(`✗ No package.json depending on ajo-kit in ${root}`)
		expect(stderr).toContain('next: Run kit in a project directory whose package.json depends on ajo-kit')
		// Expected failures print no stack, and piped output has no color.
		expect(stderr).not.toMatch(/^\s+at /m)
		expect(stderr).not.toContain('\x1b[')
	})

	test('a plugin whose commands fail to load fails with plugin_failed naming it', async () => {
		const root = await project({ 'ajo-broken': "throw new Error('boom')\n" })
		const { status, stdout } = await kit(root, 'build', '--json')
		expect(status).toBe(1)
		expect(document(stdout)).toEqual({
			ok: false,
			error: { code: 'plugin_failed', message: 'ajo-broken could not add its commands: boom' },
			next: 'Reinstall the project dependencies with pnpm install',
		})
	})

	test('a plugin action returns its result and next, reports on stderr and keeps stdout for the document', async () => {
		const root = await project({ 'ajo-probe': probe })

		const piped = await kit(root, 'probe', 'x', '--loud', '--json')
		expect(piped.status).toBe(0)
		expect(document(piped.stdout)).toEqual({ ok: true, result: { name: 'x', loud: true }, next: 'pnpm kit probe again' })
		expect(piped.stderr).toContain('○ step x\n')
		expect(piped.stderr).toContain('library noise\n')
		expect(piped.stderr).toContain('next: pnpm kit probe again\n')

		const human = await kit(root, 'probe', 'x')
		expect(human.status).toBe(0)
		expect(human.stdout).toBe('')
		expect(human.stderr).toContain('○ step x\n')
	})

	test('a thrown code is an expected failure; anything else is internal with its stack', async () => {
		const root = await project({ 'ajo-probe': probe })

		const refused = await kit(root, 'refuse', '--json')
		expect(refused.status).toBe(1)
		expect(document(refused.stdout)).toEqual({ ok: false, error: { code: 'deploy_refused', message: 'The host refused' }, next: 'Free some space' })
		expect(refused.stderr).not.toMatch(/^\s+at /m)

		const crashed = await kit(root, 'crash', '--json')
		expect(crashed.status).toBe(1)
		expect(document(crashed.stdout)).toMatchObject({ ok: false, error: { code: 'internal', message: 'kaput' } })
		expect(crashed.stderr).toContain('✗ Error: kaput')
		expect(crashed.stderr).toMatch(/^\s+at /m)
	})

	test('an invalid engine declaration fails the build with build_failed', async () => {
		const root = await directory({ 'package.json': JSON.stringify({ dependencies: { 'ajo-kit': '*' }, kit: { engine: { net: 'yes' } } }) })
		const { status, stdout } = await kit(root, 'build', '--json')
		expect(status).toBe(1)
		expect(document(stdout)).toMatchObject({
			ok: false,
			error: { code: 'build_failed' },
			next: 'Fix the error above, then run pnpm kit build',
		})
	})

	test('migrate create writes the next migration; a failing migration is migrate_failed and named', async () => {
		const root = await project({}, {
			'db/migrations/0001_broken.ts': [
				'export async function up() { throw new Error("no such table: users") }',
				'export async function down() {}',
				'',
			].join('\n'),
		})

		const created = await kit(root, 'migrate', 'create', 'Add users', '--json')
		expect(document(created.stdout)).toEqual({ ok: true, result: { file: 'db/migrations/0002_add_users.ts' }, next: null })
		await access(join(root, 'db/migrations/0002_add_users.ts'))

		const invalid = await kit(root, 'migrate', 'create', '!!!', '--json')
		expect(invalid.status).toBe(1)
		expect(document(invalid.stdout).error).toEqual({ code: 'migrate_failed', message: 'Migration name must contain a letter or number' })

		const up = await kit(root, 'migrate', 'up', '--database', join(root, 'app.sqlite'), '--json')
		expect(up.status).toBe(1)
		expect(document(up.stdout)).toEqual({
			ok: false,
			error: { code: 'migrate_failed', message: 'project/0001_broken: no such table: users' },
			next: 'Fix the error above, then run pnpm kit migrate up',
		})
		expect(up.stderr).toContain('✗ project/0001_broken\n')
		expect(await readFile(join(root, 'db/migrations/0002_add_users.ts'), 'utf8')).toContain('export async function down(')
	})
})
