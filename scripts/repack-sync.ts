// Packs the public packages and refreshes a consumer repo that pins them
// through file:.tarballs overrides: tarballs replaced, override lines
// rewritten to the packed versions, lockfile refreshed with one install.
// Usage: pnpm repack:sync <consumer repo root>
import { spawn } from 'node:child_process'
import { access, copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const packages = ['ajo-kit', 'ajo-kit-auth', 'ajo-kit-mail', 'ajo-cloves', 'ajo-ui', 'ajo-ui-playa'] as const
const override = /^(\s+['"]?)([A-Za-z0-9@/._-]+?)(['"]?):\s*file:\.tarballs\/.+\.tgz\s*$/

const destination = process.argv[2]
if (!destination) throw new Error('Usage: pnpm repack:sync <consumer repo root>')
const consumer = resolve(destination)
const workspace = join(consumer, 'pnpm-workspace.yaml')
const tarballs = join(consumer, '.tarballs')

const run = (command: string, args: readonly string[], cwd: string) => new Promise<void>((done, fail) => {
	const windows = process.platform === 'win32'
	const child = spawn(
		windows ? process.env.ComSpec ?? 'cmd.exe' : command,
		windows ? ['/d', '/s', '/c', `${command}.cmd`, ...args] : args,
		{ cwd, env: { ...process.env, CI: '1', NO_COLOR: '1' }, stdio: 'inherit', windowsHide: true },
	)
	child.on('error', fail)
	child.on('close', code => code === 0
		? done()
		: fail(new Error(`${command} ${args.join(' ')} failed with exit code ${String(code)}`)))
})

const versions = new Map<string, string>()
for (const name of packages) {
	const manifest = JSON.parse(await readFile(join(root, 'packages', name, 'package.json'), 'utf8')) as { name: string; version: string }
	if (manifest.name !== name) throw new Error(`Package path/name mismatch: ${name} / ${manifest.name}`)
	versions.set(name, manifest.version)
}

const lines = (await readFile(workspace, 'utf8')).split('\n')
const selected: string[] = []
for (const line of lines) {
	const match = override.exec(line)
	if (!match) continue
	const name = match[2]
	if (!versions.has(name)) throw new Error(`Override names a tarball this repo does not pack: ${name}`)
	selected.push(name)
}
if (!selected.length) throw new Error(`No file:.tarballs overrides found in ${workspace}`)

await run('pnpm', ['build:packages'], root)
const staging = await mkdtemp(join(tmpdir(), 'repack-sync-'))
try {
	for (const name of selected) {
		await run('pnpm', ['--filter', name, 'pack', '--pack-destination', staging], root)
	}
	await mkdir(tarballs, { recursive: true })
	for (const name of selected) {
		const packed = `${name}-${versions.get(name)}.tgz`
		await access(join(staging, packed))
		for (const stale of await readdir(tarballs)) {
			if (stale.startsWith(`${name}-`) && stale.endsWith('.tgz')) await rm(join(tarballs, stale))
		}
		await copyFile(join(staging, packed), join(tarballs, packed))
	}
} finally {
	await rm(staging, { recursive: true, force: true })
}

const rewritten = lines.map(line => {
	const match = override.exec(line)
	if (!match) return line
	return `${match[1]}${match[2]}${match[3]}: file:.tarballs/${match[2]}-${versions.get(match[2])}.tgz`
})
if (rewritten.join('\n') !== lines.join('\n')) await writeFile(workspace, rewritten.join('\n'))
// Replacing a tarball changes its integrity; the lockfile must follow the
// deliberate replacement instead of refusing it (and CI-style frozen
// installs would refuse to touch it at all).
await run('pnpm', ['install', '--update-checksums', '--no-frozen-lockfile'], consumer)
for (const name of selected) console.log(`repack-sync: ${name}@${versions.get(name)} -> ${tarballs}`)
