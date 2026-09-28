import { execFile } from 'node:child_process'
import { access, chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

// The bin runs from source under Node's type stripping. A fake pnpm on PATH
// records every call, so these tests never install anything; the tarball
// consumer test runs the real install and setup.

const bin = fileURLToPath(new URL('../src/index.ts', import.meta.url))
let root: string
let log: string

const create = async (cwd: string, args: string[], env: Record<string, string> = {}) => {
	const result = await promisify(execFile)(process.execPath, [bin, ...args], {
		cwd,
		env: { ...process.env, PATH: `${join(root, 'bin')}${delimiter}${process.env.PATH}`, PNPM_LOG: log, ...env },
	}).then(({ stdout, stderr }) => ({ status: 0, stdout, stderr }), error => ({ status: error.code as number, stdout: error.stdout as string, stderr: error.stderr as string }))
	return { ...result, document: result.stdout ? JSON.parse(result.stdout) : undefined }
}

const exists = (path: string) => access(path).then(() => true, () => false)

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), 'create-ajo-'))
	log = join(root, 'pnpm.log')
	await mkdir(join(root, 'bin'))
	await writeFile(join(root, 'bin/pnpm'), [
		'#!/bin/sh',
		'echo "$PWD $*" >> "$PNPM_LOG"',
		'echo "pnpm output"',
		'if [ "$1" = install ]; then exit "${PNPM_INSTALL_STATUS:-0}"; fi',
		'',
	].join('\n'))
	await chmod(join(root, 'bin/pnpm'), 0o755)
	await mkdir(join(root, 'work'))
})

afterEach(() => rm(root, { recursive: true, force: true }))

describe('usage', () => {
	test.each([
		[[], 'Missing <dir>'],
		[['one', 'two'], 'Unexpected argument: two'],
		[['notes', '--template', 'blog'], "Unknown option '--template'"],
	])('%j is a usage error', async (args, message) => {
		const { status, stdout, stderr, document } = await create(join(root, 'work'), [...args, '--json'])
		expect(status).toBe(1)
		expect(stdout.trim().split('\n')).toHaveLength(1)
		expect(document).toEqual({ ok: false, error: { code: 'usage', message }, next: 'pnpm create ajo <dir>' })
		expect(stderr).toContain(`✗ ${message}`)
	})

	test('a non-empty directory or a file is target_exists and stays untouched', async () => {
		await mkdir(join(root, 'work/notes'))
		await writeFile(join(root, 'work/notes/keep.txt'), 'mine')
		await writeFile(join(root, 'work/file'), 'mine')
		for (const [target, message] of [['notes', 'notes is not empty'], ['file', 'file is a file']]) {
			const { status, document } = await create(join(root, 'work'), [target, '--json'])
			expect(status).toBe(1)
			expect(document.error).toEqual({ code: 'target_exists', message })
		}
		expect(await readFile(join(root, 'work/notes/keep.txt'), 'utf8')).toBe('mine')
		expect(await exists(join(root, 'work/notes/package.json'))).toBe(false)
		expect(await exists(log)).toBe(false)
	})
})

test('creates the starter, names it, initializes Git, installs and runs the setup', async () => {
	const work = join(root, 'work')
	await mkdir(join(work, 'notes'))
	const { status, stdout, stderr, document } = await create(work, ['notes', '--json'])
	const target = join(work, 'notes')

	expect(status).toBe(0)
	expect(document).toEqual({ ok: true, result: { directory: 'notes', name: 'notes' }, next: 'cd notes && pnpm kit dev' })
	// Command output goes to stderr, so stdout holds only the document.
	expect(stdout.trim().split('\n')).toHaveLength(1)
	expect(stderr).toContain('pnpm output')
	expect(stderr).toContain('next: cd notes && pnpm kit dev')

	const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
	expect(manifest.name).toBe('notes')
	expect(manifest.dependencies['ajo-kit']).toMatch(/^\d+\.\d+\.\d+$/)
	expect(manifest.devDependencies['ajo-kit-server']).toMatch(/^\d+\.\d+\.\d+$/)
	expect(await exists(join(target, '.gitignore'))).toBe(true)
	expect(await exists(join(target, 'gitignore'))).toBe(false)
	expect(await readFile(join(target, '.git/HEAD'), 'utf8')).toBe('ref: refs/heads/main\n')
	expect((await stat(join(target, '.env'))).mode & 0o777).toBe(0o600)
	expect((await readFile(log, 'utf8')).trim().split('\n')).toEqual([
		`${target} install`,
		`${target} exec kit migrate up --database ./database.sqlite`,
	])
})

test('does not initialize Git inside an existing repository', async () => {
	const work = join(root, 'work')
	await promisify(execFile)('git', ['init', '--quiet', work])
	const { status } = await create(work, ['apps/notes'])
	expect(status).toBe(0)
	expect(await exists(join(work, 'apps/notes/package.json'))).toBe(true)
	expect(await exists(join(work, 'apps/notes/.git'))).toBe(false)
})

test('a failed install is install_failed and names how to finish', async () => {
	const { status, document } = await create(join(root, 'work'), ['notes', '--json'], { PNPM_INSTALL_STATUS: '1' })
	expect(status).toBe(1)
	expect(document).toEqual({
		ok: false,
		error: { code: 'install_failed', message: 'pnpm install failed' },
		next: 'cd notes && pnpm install && node scripts/setup.mjs',
	})
	expect(await exists(join(root, 'work/notes/.env'))).toBe(false)
})
