import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createRequire } from 'node:module'
import { createServer as createSocketServer } from 'node:net'
import {
	access,
	cp,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	realpath,
	rm,
	stat,
	writeFile,
} from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { playa } from 'ajo-ui-playa'
import { chromium } from 'playwright'
import { createGenerator, escapeSelector } from 'unocss'

type Pack = {
	filename: string
	files: Array<{ path: string }>
	name: string
	version: string
}

type Dependency = {
	dependencies?: Record<string, Dependency>
	path?: string
	version?: string
}

type ListedProject = Dependency & {
	devDependencies?: Record<string, Dependency>
}

type PublishedManifest = {
	bin?: Record<string, string>
	dependencies?: Record<string, string>
	exports?: Record<string, { default?: string; import?: string; types?: string }>
	kit?: { migrations?: string }
	name: string
	peerDependencies?: Record<string, string>
	peerDependenciesMeta?: Record<string, { optional?: boolean }>
	sideEffects?: boolean
	types?: string
	version: string
}

type RegistryMetadata = {
	versions: Record<string, PublishedManifest>
}

type BuildOutput = {
	output: Array<{
		code?: string
		modules?: Record<string, unknown>
		type: string
	}>
}

type ArtifactSize = {
	brotli: number
	gzip: number
	raw: number
}

type CommandResult = {
	stderr: string
	stdout: string
}

class CommandFailure extends Error {
	constructor(
		readonly command: string,
		readonly code: number | null,
		readonly stderr: string,
		readonly stdout: string,
	) {
		const details = `${stdout}\n${stderr}`.trim().slice(-6_000)
		super(`${command} failed with exit code ${String(code)}${details ? `\n${details}` : ''}`)
	}
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const require = createRequire(import.meta.url)
const packageNames = ['ajo-kit', 'ajo-kit-auth', 'ajo-kit-mail', 'ajo-cloves', 'ajo-ui', 'ajo-ui-playa'] as const
const versions = Object.fromEntries(packageNames.map(name =>
	[name, (require(`../packages/${name}/package.json`) as { version: string }).version],
)) as Record<typeof packageNames[number], string>
const migrationNames = [
	'0001_initial',
	'0002_passkeys',
	'0003_teams',
] as const
const floatingDomVersion = '1.8.0'
const floatingNames = ['@floating-ui/dom', '@floating-ui/core', '@floating-ui/utils'] as const
const playaDependencies = { ajo: '0.1.35', 'ajo-ui-playa': versions['ajo-ui-playa'] }
const validDependencies = {
	ajo: '0.1.35',
	'ajo-kit': versions['ajo-kit'],
	'ajo-kit-auth': versions['ajo-kit-auth'],
	'ajo-kit-mail': versions['ajo-kit-mail'],
	'ajo-ui-playa': versions['ajo-ui-playa'],
}
const validDevDependencies = { typescript: '6.0.3', unocss: '66.7.2', vite: '8.0.16' }
const delay = (milliseconds: number) => new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds))

const run = (
	command: string,
	args: readonly string[],
	options: { cwd: string; env?: NodeJS.ProcessEnv },
) => new Promise<CommandResult>((resolveRun, reject) => {
	const child = spawn(command, args, {
		cwd: options.cwd,
		env: { ...process.env, CI: '1', NO_COLOR: '1', ...options.env },
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	})
	let stderr = ''
	let stdout = ''
	child.stdout.setEncoding('utf8').on('data', chunk => stdout += chunk)
	child.stderr.setEncoding('utf8').on('data', chunk => stderr += chunk)
	child.on('error', reject)
	child.on('close', code => code === 0
		? resolveRun({ stderr, stdout })
		: reject(new CommandFailure([command, ...args].join(' '), code, stderr, stdout)))
})

const pnpm = (args: readonly string[], cwd: string) => {
	const cli = process.env.npm_execpath
	if (cli && /\.(?:c?js|mjs)$/i.test(cli)) return run(process.execPath, [cli, ...args], { cwd })
	if (process.platform === 'win32') {
		return run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'pnpm.cmd', ...args], { cwd })
	}
	return run('pnpm', args, { cwd })
}

const expectPnpmFailure = async (args: readonly string[], cwd: string) => {
	try {
		const result = await pnpm(args, cwd)
		throw new Error([
			`pnpm ${args.join(' ')} unexpectedly succeeded`,
			result.stdout,
			result.stderr,
		].filter(Boolean).join('\n'))
	} catch (error) {
		if (error instanceof CommandFailure) return error
		throw error
	}
}

const write = async (path: string, value: string) => {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, value, 'utf8')
}

const writeJson = (path: string, value: unknown) =>
	write(path, `${JSON.stringify(value, null, 2)}\n`)

const parseJson = <Value>(output: string): Value => {
	const start = Math.min(...['{', '[']
		.map(token => output.indexOf(token))
		.filter(index => index >= 0))
	assert(Number.isFinite(start), `command did not emit JSON:\n${output}`)
	return JSON.parse(output.slice(start)) as Value
}

const freePort = () => new Promise<number>((resolvePort, reject) => {
	const socket = createSocketServer()
	socket.once('error', reject)
	socket.listen(0, '127.0.0.1', () => {
		const address = socket.address()
		assert(address && typeof address === 'object')
		const { port } = address
		socket.close(error => error ? reject(error) : resolvePort(port))
	})
})

const startRegistry = async (directory: string, port: number) => {
	const config = join(directory, 'verdaccio.yaml')
	const posix = (path: string) => path.replaceAll('\\', '/')
	await write(config, [
		`storage: ${posix(join(directory, 'storage'))}`,
		'auth:',
		'  htpasswd:',
		`    file: ${posix(join(directory, 'htpasswd'))}`,
		'uplinks:',
		'  npmjs:',
		'    url: https://registry.npmjs.org/',
		'packages:',
		...packageNames.flatMap(name => [
			`  '${name}':`,
			'    access: $all',
			'    publish: $all',
			'    unpublish: $all',
		]),
		"  '@*/*':",
		'    access: $all',
		'    publish: $all',
		'    unpublish: $all',
		'    proxy: npmjs',
		"  '**':",
		'    access: $all',
		'    publish: $all',
		'    unpublish: $all',
		'    proxy: npmjs',
		'log: { type: stdout, format: pretty, level: warn }',
		`listen: 127.0.0.1:${port}`,
		'',
	].join('\n'))

	const child = spawn(process.execPath, [require.resolve('verdaccio/bin/verdaccio'), '--config', config], {
		cwd: directory,
		env: { ...process.env, NO_COLOR: '1' },
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	})
	let logs = ''
	child.stdout.setEncoding('utf8').on('data', chunk => logs += chunk)
	child.stderr.setEncoding('utf8').on('data', chunk => logs += chunk)
	const url = `http://127.0.0.1:${port}`

	try {
		// A cold Verdaccio under load takes tens of seconds to bind on Windows;
		// this is a readiness window, and a dead child still fails immediately.
		for (let attempt = 0; attempt < 900; attempt++) {
			if (child.exitCode !== null) throw new Error(`Verdaccio exited before readiness:\n${logs.slice(-6_000)}`)
			try {
				const response = await fetch(`${url}/-/ping`)
				if (response.ok) return { child, logs: () => logs, url }
			} catch {
				// The socket is expected to reject until Verdaccio binds it.
			}
			await delay(100)
		}
		throw new Error(`Verdaccio did not become ready:\n${logs.slice(-6_000)}`)
	} catch (error) {
		await stop(child)
		throw error
	}
}

const stop = async (child: ChildProcess | undefined) => {
	if (!child || child.exitCode !== null) return
	const exited = once(child, 'exit').then(() => true)
	child.kill('SIGTERM')
	if (await Promise.race([exited, delay(3_000).then(() => false)])) return
	child.kill('SIGKILL')
	await Promise.race([exited, delay(3_000)])
}

const packAndPublish = async (name: typeof packageNames[number], tarballs: string, registry: string) => {
	const directory = join(root, 'packages', name)
	const packed = parseJson<Pack>((await pnpm([
		'pack',
		'--json',
		'--pack-destination',
		tarballs,
	], directory)).stdout)
	assert.equal(packed.name, name)
	assert.equal(packed.version, versions[name])
	const tarball = resolve(tarballs, packed.filename)
	await access(tarball)
	const tarballBytes = (await stat(tarball)).size
	await pnpm(['publish', tarball, '--registry', registry, '--no-git-checks'], directory)

	const response = await fetch(`${registry}/${name}`)
	assert(response.ok, `registry did not expose ${name}@${versions[name]}`)
	const metadata = await response.json() as RegistryMetadata
	const manifest = metadata.versions[versions[name]]
	assert(manifest, `registry metadata omitted ${name}@${versions[name]}`)
	assert(!JSON.stringify(manifest).includes('workspace:'), `${name} published a workspace protocol`)
	return { manifest, packed, tarballBytes }
}

type Published = Awaited<ReturnType<typeof packAndPublish>>

const verifyPublishedArtifact = (name: typeof packageNames[number], published: Published) => {
	const packlist = published.packed.files.map(file => file.path)
	for (const expected of ['LICENSE', 'package.json', 'README.md', 'dist/index.js']) {
		assert(packlist.includes(expected), `${name} packlist omitted ${expected}`)
	}
	assert(packlist.every(path =>
		!path.startsWith('tests/') &&
		!path.startsWith('src/') &&
		!path.includes('node_modules') &&
		!path.startsWith('.tmp/')),
	`${name} packed source, a private test, or a generated path`)

	for (const [subpath, entry] of Object.entries(published.manifest.exports ?? {})) {
		assert(entry.import?.startsWith('./dist/'), `${name} export ${subpath} has no compiled import target`)
		assert.equal(entry.default, entry.import, `${name} export ${subpath} has divergent runtime targets`)
		assert(entry.types?.startsWith('./dist/'), `${name} export ${subpath} has no compiled type target`)
		assert(packlist.includes(entry.import!.slice(2)), `${name} export ${subpath} omitted its runtime file`)
		assert(packlist.includes(entry.types!.slice(2)), `${name} export ${subpath} omitted its declaration file`)
	}
	assert.equal(published.manifest.types, published.manifest.exports?.['.']?.types,
		`${name} top-level types diverged from its root export`)
	if (name === 'ajo-cloves' || name === 'ajo-ui' || name === 'ajo-ui-playa') {
		assert.equal(published.manifest.sideEffects, false, `${name} is not marked tree-shakeable`)
	}
	if (name === 'ajo-ui') {
		assert(published.tarballBytes <= 160_000,
			`ajo-ui tarball grew to ${published.tarballBytes} B (budget 160000 B)`)
		assert(!('@tanstack/table-core' in (published.manifest.dependencies ?? {})),
			'ajo-ui published @tanstack/table-core as a dependency')
		assert(!('@tanstack/store' in (published.manifest.dependencies ?? {})),
			'ajo-ui published @tanstack/store as a dependency')
	}

	if (name === 'ajo-kit') {
		assert.equal(published.manifest.bin?.kit, './dist/bin/kit.js')
		assert(packlist.includes('dist/bin/kit.js'), 'ajo-kit packlist omitted its compiled CLI')
	}
	if (name === 'ajo-kit-auth') {
		assert.equal(published.manifest.kit?.migrations, './dist/migrations/')
		const migrations = packlist
			.filter(path => path.startsWith('dist/migrations/') && path.endsWith('.js'))
			.map(path => path.slice('dist/migrations/'.length, -3))
			.sort()
		assert.deepEqual(migrations, [...migrationNames], 'ajo-kit-auth published an unexpected migration set')
		assert(!packlist.some(path => path.startsWith('migrations/')), 'ajo-kit-auth packed source migrations')
	}
}

const consumerFiles = async (directory: string, registry: string) => {
	await writeJson(join(directory, 'package.json'), {
		name: 'ajo-ui-playa-consumer',
		version: '0.0.0',
		private: true,
		type: 'module',
		dependencies: validDependencies,
		devDependencies: validDevDependencies,
	})
	await write(join(directory, '.npmrc'), [
		`registry=${registry}/`,
		'auto-install-peers=false',
		'package-import-method=copy',
		'strict-peer-dependencies=true',
		'',
	].join('\n'))
	await write(join(directory, 'pnpm-workspace.yaml'), [
		'allowBuilds:',
		'  argon2: true',
		'  better-sqlite3: true',
		'  esbuild: true',
		'minimumReleaseAgeExclude:',
		...packageNames.map(name => `  - ${name}@${versions[name]}`),
		'',
	].join('\n'))
	await write(join(directory, 'index.html'), '<div id="app"></div><script type="module" src="/src/main.tsx"></script>\n')
	await write(join(directory, 'uno.config.ts'), [
		"import { defineConfig } from 'unocss'",
		"import { playa } from 'ajo-ui-playa'",
		'export default defineConfig({ presets: [playa()] })',
		'',
	].join('\n'))
	await write(join(directory, 'vite.config.ts'), [
		"import { fileURLToPath } from 'node:url'",
		"import { defineConfig } from 'vite'",
		"import unocss from 'unocss/vite'",
		'export default defineConfig({',
		"  plugins: [unocss(fileURLToPath(new URL('./uno.config.ts', import.meta.url)))],",
		"  oxc: { jsx: { importSource: 'ajo' } },",
		'  ssr: { noExternal: [/^ajo-/] },',
		'})',
		'',
	].join('\n'))
	await writeJson(join(directory, 'tsconfig.json'), {
		compilerOptions: {
			jsx: 'react-jsx',
			jsxImportSource: 'ajo',
			module: 'ESNext',
			moduleResolution: 'Bundler',
			noEmit: true,
			skipLibCheck: true,
			strict: true,
			target: 'ESNext',
		},
		include: ['src'],
	})
	await write(join(directory, 'src/env.d.ts'), "declare module 'virtual:uno.css'\n")
	const manifest = parseJson<{ exports: Record<string, unknown> }>(
		await readFile(join(root, 'packages/ajo-ui-playa/package.json'), 'utf8'),
	)
	const families = Object.keys(manifest.exports)
		.filter(subpath => subpath !== '.')
		.map(subpath => subpath.slice(2))
	const imports = families.map((family, index) =>
		`import * as family${index} from 'ajo-ui-playa/${family}'`)
	await write(join(directory, 'src/all-families.ts'), [
		"import 'virtual:uno.css'",
		...imports,
		`export const families = [${families.map((_, index) => `family${index}`).join(',')}]`,
		'',
	].join('\n'))
	await write(join(directory, 'src/main.tsx'), [
		"import { render } from 'ajo'",
		"import Checkbox from 'ajo-ui-playa/checkbox'",
		"import 'virtual:uno.css'",
		'const App = () => (',
		'  <main class="[--playa-consumer-used:#123456] aria-invalid:ring-danger/25 scroll-fade-x">',
		'    <Checkbox aria-label="Published checkbox" />',
		'  </main>',
		')',
		"render(<App />, document.getElementById('app')!)",
		'',
	].join('\n'))
	await write(join(directory, 'src/ssr.tsx'), [
		"import { render } from 'ajo/html'",
		"import Checkbox from 'ajo-ui-playa/checkbox'",
		'export default () => render(<Checkbox aria-label="Published SSR checkbox" />)',
		'',
	].join('\n'))
	await write(join(directory, 'src/popover-client.tsx'), [
		"import { render } from 'ajo'",
		"import { Popover, PopoverContent, PopoverTrigger } from 'ajo-ui-playa/popover'",
		"import 'virtual:uno.css'",
		'const App = () => (',
		'  <Popover defaultOpen label="Published popover">',
		'    <PopoverTrigger>Published trigger</PopoverTrigger>',
		'    <PopoverContent arrow>Published client popover</PopoverContent>',
		'  </Popover>',
		')',
		"render(<App />, document.getElementById('app')!)",
		'',
	].join('\n'))
	await write(join(directory, 'src/popover-ssr.tsx'), [
		"import { render } from 'ajo/html'",
		"import { Popover, PopoverContent, PopoverTrigger } from 'ajo-ui-playa/popover'",
		'export default () => render(',
		'  <Popover defaultOpen label="Published popover">',
		'    <PopoverTrigger>Published trigger</PopoverTrigger>',
		'    <PopoverContent arrow>Published SSR popover</PopoverContent>',
		'  </Popover>,',
		')',
		'',
	].join('\n'))
	await write(join(directory, 'src/tooltip-client.tsx'), [
		"import { render } from 'ajo'",
		"import { Tooltip, TooltipContent, TooltipTrigger } from 'ajo-ui-playa/tooltip'",
		"import 'virtual:uno.css'",
		'const App = () => (',
		'  <Tooltip defaultOpen>',
		'    <TooltipTrigger>Published trigger</TooltipTrigger>',
		'    <TooltipContent>Published client tooltip</TooltipContent>',
		'  </Tooltip>',
		')',
		"render(<App />, document.getElementById('app')!)",
		'',
	].join('\n'))
	await write(join(directory, 'src/tooltip-ssr.tsx'), [
		"import { render } from 'ajo/html'",
		"import { Tooltip, TooltipContent, TooltipTrigger } from 'ajo-ui-playa/tooltip'",
		'export default () => render(',
		'  <Tooltip defaultOpen>',
		'    <TooltipTrigger>Published trigger</TooltipTrigger>',
		'    <TooltipContent>Published SSR tooltip</TooltipContent>',
		'  </Tooltip>,',
		')',
		'',
	].join('\n'))
	await write(join(directory, 'src/sentinel.tsx'), [
		'export const UnusedSentinel = () => <div class="[--playa-consumer-unused:#654321]" />',
		'',
	].join('\n'))
	await write(join(directory, 'src/graph-root.ts'), "export { playa } from 'ajo-ui-playa'\n")
	await write(join(directory, 'src/graph-family.ts'), "export { default } from 'ajo-ui-playa/checkbox'\n")
	await write(join(directory, 'src/graph-popover.ts'), "export * from 'ajo-ui-playa/popover'\n")
	await write(join(directory, 'src/graph-tooltip.ts'), "export * from 'ajo-ui-playa/tooltip'\n")
}

const peerMatrix = async (directory: string, registry: string) => {
	const prepare = async (name: string, manifest: object, strict: boolean) => {
		const fixture = join(directory, `peer-${name}`)
		await writeJson(join(fixture, 'package.json'), manifest)
		await write(join(fixture, '.npmrc'), [
			`registry=${registry}/`,
			'auto-install-peers=false',
			`strict-peer-dependencies=${String(strict)}`,
			'',
		].join('\n'))
		await write(join(fixture, 'pnpm-workspace.yaml'), [
			'minimumReleaseAgeExclude:',
			...packageNames.map(packageName => `  - ${packageName}@${versions[packageName]}`),
			'',
		].join('\n'))
		return fixture
	}

	for (const [name, unocss] of [['missing', undefined], ['incompatible', '66.7.3']] as const) {
		const fixture = await prepare(name, {
			name: `ajo-ui-playa-peer-${name}`,
			version: '0.0.0',
			private: true,
			dependencies: playaDependencies,
			devDependencies: { typescript: '6.0.3', vite: '8.0.16', ...(unocss ? { unocss } : {}) },
		}, true)
		const failure = await expectPnpmFailure([
			'install',
			'--no-frozen-lockfile',
			'--strict-peer-dependencies',
			'--config.auto-install-peers=false',
		], fixture)
		assert.match(`${failure.stdout}\n${failure.stderr}`, /unocss/i)
	}

	const fixture = await prepare('runtime-missing', {
		name: 'ajo-ui-playa-peer-runtime-missing',
		version: '0.0.0',
		private: true,
		type: 'module',
		dependencies: playaDependencies,
	}, false)
	await pnpm([
		'install',
		'--no-frozen-lockfile',
		'--config.strict-peer-dependencies=false',
		'--config.auto-install-peers=false',
	], fixture)
	const probe = join(fixture, 'probe.ts')
	await write(probe, "import { playa } from 'ajo-ui-playa'\nvoid playa\n")
	let failure: CommandFailure
	try {
		await run(process.execPath, [
			'--import',
			pathToFileURL(require.resolve('tsx')).href,
			probe,
		], { cwd: fixture })
		throw new Error('importing the Playa preset without UnoCSS unexpectedly succeeded')
	} catch (error) {
		if (!(error instanceof CommandFailure)) throw error
		failure = error
	}
	const diagnostic = `${failure.stdout}\n${failure.stderr}`
	assert.match(diagnostic, /\b(?:ERR_)?MODULE_NOT_FOUND\b/)
	assert.match(diagnostic, /unocss/i)
}

const visitDependencies = (
	dependencies: Record<string, Dependency> | undefined,
	visitor: (name: string, dependency: Dependency) => void,
) => {
	for (const [name, dependency] of Object.entries(dependencies ?? {})) {
		visitor(name, dependency)
		visitDependencies(dependency.dependencies, visitor)
	}
}

const verifyDependencyGraph = async (consumer: string) => {
	const manifest = JSON.parse(await readFile(join(consumer, 'package.json'), 'utf8')) as {
		dependencies: Record<string, string>
		devDependencies: Record<string, string>
	}
	assert.deepEqual(manifest.dependencies, validDependencies)
	assert.deepEqual(manifest.devDependencies, validDevDependencies)
	assert(!('ajo-ui' in manifest.dependencies) && !('ajo-cloves' in manifest.dependencies))
	assert(floatingNames.every(name => !(name in manifest.dependencies)), 'consumer declared Floating UI directly')
	const lock = await readFile(join(consumer, 'pnpm-lock.yaml'), 'utf8')
	assert(!lock.includes('workspace:'), 'consumer lock retained a workspace protocol')
	assert(!lock.includes('link:../ajo'), 'consumer linked a workspace package')

	const listed = parseJson<ListedProject[]>((await pnpm(['list', '--json', '--depth', 'Infinity'], consumer)).stdout)[0]
	const playa = listed.dependencies?.['ajo-ui-playa']
	const kit = listed.dependencies?.['ajo-kit']
	const auth = listed.dependencies?.['ajo-kit-auth']
	const base = playa?.dependencies?.['ajo-ui']
	const cloves = base?.dependencies?.['ajo-cloves']
	assert.equal(kit?.version, versions['ajo-kit'])
	assert.equal(auth?.version, versions['ajo-kit-auth'])
	assert.equal(playa?.version, versions['ajo-ui-playa'])
	assert.equal(base?.version, versions['ajo-ui'])
	assert.equal(cloves?.version, versions['ajo-cloves'])

	const assertIdentity = (name: string, expected?: string) => {
		const paths = new Set<string>()
		const foundVersions = new Set<string>()
		const collect = (dependencyName: string, dependency: Dependency) => {
			if (dependencyName !== name) return
			if (dependency.path) paths.add(dependency.path.toLowerCase())
			if (dependency.version) foundVersions.add(dependency.version)
		}
		visitDependencies(listed.dependencies, collect)
		visitDependencies(listed.devDependencies, collect)
		assert.equal(foundVersions.size, 1, `${name} resolved unexpected versions: ${[...foundVersions].join(', ')}`)
		if (expected) assert.deepEqual([...foundVersions], [expected], `${name} resolved an unexpected version`)
		assert.equal(paths.size, 1, `expected one ${name} identity, got ${[...paths].join(', ')}`)
	}
	assertIdentity('ajo', '0.1.35')
	for (const name of packageNames) assertIdentity(name, versions[name])
	for (const name of floatingNames) assertIdentity(name, name === '@floating-ui/dom' ? floatingDomVersion : undefined)
}

const verifyServerPackages = async (consumer: string) => {
	const probe = join(consumer, 'package-probe.mjs')
	await write(probe, [
		"import { date } from 'ajo-kit'",
		"import { close, connect } from 'ajo-kit/database'",
		"import { password } from 'ajo-kit-auth'",
		"import { can } from 'ajo-kit-auth/ability'",
		"import { configure, send } from 'ajo-kit-mail'",
		"import { capture } from 'ajo-kit-mail/capture'",
		"import { http } from 'ajo-kit-mail/http'",
		"import Checkbox from 'ajo-ui-playa/checkbox'",
		"if (!date('2026-01-01T00:00:00.000Z')) throw new Error('ajo-kit root export failed')",
		"if (!can(['posts:*'], 'posts:read')) throw new Error('ajo-kit-auth ability export failed')",
		"if (typeof Checkbox !== 'function') throw new Error('ajo-ui package chain failed')",
		"connect(':memory:')",
		"await close()",
		"const hash = await password.hash('published-package-probe')",
		"if (!await password.verify('published-package-probe', hash)) throw new Error('argon2 probe failed')",
		// nodemailer is absent from this consumer on purpose: root, capture and
		// http must work without the optional smtp peer, end to end.
		"const mailbox = capture()",
		"configure({ transport: mailbox, from: 'noreply@example.com' })",
		"const id = await send({ to: 'owner@example.com', subject: 'probe', text: 'claim https://example.com/invite/x' })",
		"if (mailbox.last()?.id !== id) throw new Error('ajo-kit-mail capture probe failed')",
		"if (!mailbox.link()?.startsWith('https://example.com/')) throw new Error('ajo-kit-mail link probe failed')",
		"if (typeof http !== 'function') throw new Error('ajo-kit-mail http export failed')",
		"console.log('package probe passed')",
		'',
	].join('\n'))
	const direct = await run(process.execPath, [probe], { cwd: consumer })
	assert.match(direct.stdout, /package probe passed/)

	const help = await pnpm(['exec', 'kit', '--help'], consumer)
	const helpOutput = `${help.stdout}\n${help.stderr}`
	assert.match(helpOutput, /Available Commands/)
	assert.match(helpOutput, /migrate status/)

	const database = join(consumer, 'migration-probe.sqlite')
	const up = await pnpm(['exec', 'kit', 'migrate', 'up', '--database', database], consumer)
	const upOutput = `${up.stdout}\n${up.stderr}`
	for (const migration of migrationNames) {
		assert.match(upOutput, new RegExp(`plugin/ajo-kit-auth/${migration}`))
	}

	// The probe receives how many migrations should be applied and derives the
	// expected history prefix, plus one table per migration as schema evidence.
	const qualified = migrationNames.map(name => `plugin/ajo-kit-auth/${name}`)
	const migrationProbe = join(consumer, 'migration-state-probe.mjs')
	await write(migrationProbe, [
		"import { close, connect, db } from 'ajo-kit/database'",
		"connect(process.argv[2])",
		"try {",
		"  const applied = Number(process.argv[3])",
		`  const wanted = ${JSON.stringify(qualified)}.slice(0, applied)`,
		"  const names = await db().selectFrom('kysely_migration').select('name').orderBy('name').execute()",
		"  const actual = names.map(row => row.name)",
		"  if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new Error('unexpected migration history: ' + JSON.stringify(actual))",
		"  const table = async name => Boolean(await db().selectFrom('sqlite_master').select('name').where('type', '=', 'table').where('name', '=', name).executeTakeFirst())",
		"  if (await table('users') !== (applied >= 1)) throw new Error('users table did not match migration state')",
		"  if (await table('credentials') !== (applied >= 2)) throw new Error('credentials table did not match migration state')",
		"} finally { await close() }",
		'',
	].join('\n'))
	await run(process.execPath, [migrationProbe, database, String(migrationNames.length)], { cwd: consumer })

	const status = await pnpm(['exec', 'kit', 'migrate', 'status', '--database', database], consumer)
	for (const migration of migrationNames) {
		assert.match(`${status.stdout}\n${status.stderr}`, new RegExp(`plugin/ajo-kit-auth/${migration}`))
	}

	// Rollback reverses one qualified identity per run, latest first; walk the
	// history down to empty so both directions of 0002 get exercised.
	for (let applied = migrationNames.length; applied > 0; applied--) {
		const down = await pnpm(['exec', 'kit', 'migrate', 'down', '--database', database], consumer)
		assert.match(`${down.stdout}\n${down.stderr}`, new RegExp(`plugin/ajo-kit-auth/${migrationNames[applied - 1]}.*rolled back`))
		await run(process.execPath, [migrationProbe, database, String(applied - 1)], { cwd: consumer })
	}

	const restored = await pnpm(['exec', 'kit', 'migrate', 'up', '--database', database], consumer)
	for (const migration of migrationNames) {
		assert.match(`${restored.stdout}\n${restored.stderr}`, new RegExp(`plugin/ajo-kit-auth/${migration}`))
	}
	await run(process.execPath, [migrationProbe, database, String(migrationNames.length)], { cwd: consumer })
}

const modulesOf = (result: unknown) => ((Array.isArray(result) ? result : [result]) as BuildOutput[])
	.flatMap(build => build.output)
	.flatMap(output => output.type === 'chunk' ? Object.keys(output.modules ?? {}) : [])
	.map(id => id.replaceAll('\\', '/'))

const assertFloatingGraph = (label: string, modules: readonly string[], expected: boolean) => {
	for (const name of floatingNames) {
		const marker = `/node_modules/${name}/`
		const identities = new Set(modules
			.filter(id => id.includes(marker))
			.map(id => id.slice(0, id.indexOf(marker) + marker.length - 1)))
		assert.equal(identities.size, expected ? 1 : 0,
			`${label} expected ${expected ? 'one' : 'no'} ${name} identity, got ${[...identities].join(', ')}`)
	}
}

const hasModulePath = (modules: readonly string[], path: string) => modules.some(id => id.includes(path))

const assertPopupGraph = (
	label: string,
	modules: readonly string[],
	family: 'popover' | 'tooltip',
) => {
	assertFloatingGraph(label, modules, true)
	for (const path of [
		`ajo-ui-playa/dist/${family}.js`,
		`ajo-ui/dist/${family}.js`,
		'ajo-ui/dist/chunks/position-',
		'ajo-ui/dist/chunks/popup-',
	]) {
		assert(hasModulePath(modules, path), `${label} omitted ${path}`)
	}
	assert(!modules.some(id => id.includes('/node_modules/ajo-') && id.includes('/src/')),
		`${label} executed package TypeScript source`)
	assert(!hasModulePath(modules, 'ajo-ui/dist/floating.js'), `${label} retained legacy floating.js`)
}

const loadVite = async (consumer: string) => {
	const consumerRequire = createRequire(join(consumer, 'package.json'))
	return await import(pathToFileURL(consumerRequire.resolve('vite')).href) as typeof import('vite')
}

const artifactSize = async (paths: readonly string[]): Promise<ArtifactSize> => {
	const contents = await Promise.all(paths.map(path => readFile(path)))
	return contents.reduce<ArtifactSize>((size, content) => ({
		brotli: size.brotli + brotliCompressSync(content).length,
		gzip: size.gzip + gzipSync(content).length,
		raw: size.raw + content.length,
	}), { brotli: 0, gzip: 0, raw: 0 })
}

const assertBudget = (label: string, size: ArtifactSize, budget: ArtifactSize) => {
	for (const format of ['raw', 'gzip', 'brotli'] as const) {
		assert(size[format] <= budget[format],
			`${label} ${format} grew to ${size[format]} B (budget ${budget[format]} B)`)
	}
}

const runtimeTokens = async () => {
	const directory = join(root, 'packages/ajo-ui-playa/dist')
	const artifacts = (await filesWithExtension(directory, '.js'))
		.filter(path => path !== join(directory, 'index.js'))
	const source = (await Promise.all(artifacts.map(path => readFile(path, 'utf8')))).join('\n')
	const uno = await createGenerator({ presets: [playa()] })
	return [...(await uno.generate(source)).matched].sort()
}

const buildConsumer = async (consumer: string) => {
	await pnpm(['exec', 'tsc', '--noEmit', '-p', 'tsconfig.json'], consumer)
	const vite = await loadVite(consumer)
	const configFile = join(consumer, 'vite.config.ts')
	const client = await vite.build({
		root: consumer,
		configFile,
		logLevel: 'silent',
		build: { emptyOutDir: true, outDir: 'dist' },
	})
	const clientModules = modulesOf(client)
	assertFloatingGraph('Checkbox client graph', clientModules, false)
	const tooling = clientModules.filter(id => /(?:\/unocss@|\/@unocss\+|@iconify(?:-json)?\+)/.test(id))
	assert.deepEqual(tooling, [], `client retained build-time modules:\n${tooling.join('\n')}`)

	const ssrBuild = await vite.build({
		root: consumer,
		configFile,
		logLevel: 'silent',
		build: { emptyOutDir: true, outDir: 'dist-ssr', ssr: join(consumer, 'src/ssr.tsx') },
	})
	assertFloatingGraph('Checkbox SSR graph', modulesOf(ssrBuild), false)
	const buildPopup = async (family: 'popover' | 'tooltip') => {
		const label = family[0].toUpperCase() + family.slice(1)
		const client = await vite.build({
			root: consumer,
			configFile,
			logLevel: 'silent',
			build: {
				emptyOutDir: true,
				outDir: `dist-${family}`,
				rollupOptions: { input: join(consumer, `src/${family}-client.tsx`) },
			},
		})
		assertPopupGraph(`${label} client graph`, modulesOf(client), family)
		const ssr = await vite.build({
			root: consumer,
			configFile,
			logLevel: 'silent',
			build: {
				emptyOutDir: true,
				outDir: `dist-${family}-ssr`,
				ssr: join(consumer, `src/${family}-ssr.tsx`),
			},
		})
		assertPopupGraph(`${label} SSR graph`, modulesOf(ssr), family)
	}
	await buildPopup('popover')
	await buildPopup('tooltip')
	await vite.build({
		root: consumer,
		configFile,
		logLevel: 'silent',
		build: {
			emptyOutDir: true,
			outDir: 'dist-all',
			rollupOptions: { input: join(consumer, 'src/all-families.ts') },
		},
	})

	const cssFiles = await filesWithExtension(join(consumer, 'dist'), '.css')
	const jsFiles = await filesWithExtension(join(consumer, 'dist'), '.js')
	assert(cssFiles.length > 0, 'client build emitted no CSS')
	assert(jsFiles.length > 0, 'client build emitted no JavaScript')
	const css = (await Promise.all(cssFiles.map(path => readFile(path, 'utf8')))).join('\n')
	const javascript = (await Promise.all(jsFiles.map(path => readFile(path, 'utf8')))).join('\n')
	assert.match(css, /:root\{--radius:0?\.75rem/, 'Playa preflight was absent')
	assert(css.includes('.playa-checkbox-box'), 'published Checkbox source was not extracted')
	assert(css.includes('.i-lucide-check'), 'Lucide icon CSS was absent')
	assert(css.includes('--playa-consumer-used:#123456'), 'used sentinel was absent')
	assert(!css.includes('--playa-consumer-unused:#654321'), 'unused sentinel was emitted eagerly')
	assert(!css.includes('.playa-select-trigger'), 'an unused real family recipe was emitted eagerly')
	assert(css.includes('mask-image:linear-gradient(90deg'), 'Playa mask contract was absent')
	assert(css.includes('[aria-invalid=true]'), 'Playa custom variant was absent')
	assert.doesNotMatch(javascript, /(?:\bunocss\b|@unocss|@iconify(?:-json)?|["']prefix["']\s*:\s*["']lucide)/i)
	const sizes = {
		css: await artifactSize(cssFiles),
		js: await artifactSize(jsFiles),
	}
	console.log(`playa consumer: artifact sizes ${JSON.stringify(sizes)}`)
	assertBudget('minimal consumer CSS', sizes.css, { raw: 48_000, gzip: 9_000, brotli: 8_000 })
	assertBudget('minimal consumer JS', sizes.js, { raw: 12_000, gzip: 4_500, brotli: 4_000 })

	const allCssFiles = await filesWithExtension(join(consumer, 'dist-all'), '.css')
	assert(allCssFiles.length > 0, 'all-family build emitted no CSS')
	const allCss = (await Promise.all(allCssFiles.map(path => readFile(path, 'utf8')))).join('\n')
	const protocol = await runtimeTokens()
	assert(protocol.length > 1_000, `runtime protocol unexpectedly shrank to ${protocol.length} tokens`)
	const missing = protocol.filter(token => !allCss.includes(`.${escapeSelector(token)}`))
	assert.equal(missing.length, 0,
		`published all-family pipeline omitted ${missing.length} selectors:\n${missing.slice(0, 30).join('\n')}`)

	const ssrFiles = [
		...await filesWithExtension(join(consumer, 'dist-ssr'), '.js'),
		...await filesWithExtension(join(consumer, 'dist-ssr'), '.mjs'),
	]
	assert.equal(ssrFiles.length, 1, `expected one SSR entry, got ${ssrFiles.join(', ')}`)
	const ssr = await import(`${pathToFileURL(ssrFiles[0]).href}?acceptance=${Date.now()}`) as { default: () => string }
	const html = ssr.default()
	assert.match(html, /data-slot="checkbox"/)
	assert.match(html, /Published SSR checkbox/)

	const popoverSsrFiles = [
		...await filesWithExtension(join(consumer, 'dist-popover-ssr'), '.js'),
		...await filesWithExtension(join(consumer, 'dist-popover-ssr'), '.mjs'),
	]
	assert.equal(popoverSsrFiles.length, 1, `expected one Popover SSR entry, got ${popoverSsrFiles.join(', ')}`)
	const popoverSsrModule = await import(`${pathToFileURL(popoverSsrFiles[0]).href}?acceptance=${Date.now()}`) as { default: () => string }
	const popoverHtml = popoverSsrModule.default()
	assert.match(popoverHtml, /data-slot="popover"/)
	assert.match(popoverHtml, /aria-labelledby="popover-\d+-content-title"/)
	assert.match(popoverHtml, /data-slot="popover-title"[^>]*>Published popover<\/h2>/)
	assert.match(popoverHtml, /data-slot="popup-surface"/)
	assert.match(popoverHtml, /data-slot="popup-arrow"/)
	assert.match(popoverHtml, /Published SSR popover/)

	const tooltipSsrFiles = [
		...await filesWithExtension(join(consumer, 'dist-tooltip-ssr'), '.js'),
		...await filesWithExtension(join(consumer, 'dist-tooltip-ssr'), '.mjs'),
	]
	assert.equal(tooltipSsrFiles.length, 1, `expected one Tooltip SSR entry, got ${tooltipSsrFiles.join(', ')}`)
	const tooltipSsrModule = await import(`${pathToFileURL(tooltipSsrFiles[0]).href}?acceptance=${Date.now()}`) as { default: () => string }
	const tooltipHtml = tooltipSsrModule.default()
	const tooltipTrigger = tooltipHtml.match(/<button[^>]*data-slot="tooltip-trigger"[^>]*>/)?.[0]
	const tooltipContent = tooltipHtml.match(/<div[^>]*data-slot="tooltip-content"[^>]*>/)?.[0]
	assert(tooltipTrigger && tooltipContent, `Tooltip SSR omitted its trigger or content:\n${tooltipHtml}`)
	const describedby = tooltipTrigger.match(/aria-describedby="([^"]+)"/)?.[1]
	const contentId = tooltipContent.match(/id="([^"]+)"/)?.[1]
	assert(contentId, 'Tooltip SSR content omitted its Ajo-owned id')
	assert.equal(describedby, contentId, 'Tooltip SSR trigger did not describe its content')
	assert.match(tooltipContent, /role="tooltip"/)
	assert.match(tooltipContent, /popover="manual"/)
	assert.match(tooltipHtml, /data-slot="popup-surface"/)
	assert.match(tooltipHtml, /data-slot="popup-arrow"/)
	assert.match(tooltipHtml, /Published SSR tooltip/)
	return vite
}

async function filesWithExtension(directory: string, extension: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true })
	const nested = await Promise.all(entries.map(entry => {
		const path = join(directory, entry.name)
		return entry.isDirectory() ? filesWithExtension(path, extension) : Promise.resolve(path.endsWith(extension) ? [path] : [])
	}))
	return nested.flat()
}

const inspectGraphs = async (consumer: string, vite: typeof import('vite')) => {
	const graph = async (entry: 'graph-family' | 'graph-popover' | 'graph-root' | 'graph-tooltip') => modulesOf(await vite.build({
		root: consumer,
		configFile: false,
		logLevel: 'silent',
		oxc: { jsx: { importSource: 'ajo' } },
		build: {
			minify: false,
			write: false,
			lib: { entry: join(consumer, `src/${entry}.ts`), formats: ['es'] },
			rolldownOptions: { external: [/^@oxc-parser\/binding-/] },
		},
	}))
	const rootGraph = await graph('graph-root')
	const familyGraph = await graph('graph-family')
	const popoverGraph = await graph('graph-popover')
	const tooltipGraph = await graph('graph-tooltip')
	const has = (modules: readonly string[], part: string) => modules.some(id => id.includes(part))
	const hasUno = (modules: readonly string[]) => modules.some(id => /(?:\/unocss@|\/@unocss\+|\/unocss\/dist)/.test(id))
	const hasIconify = (modules: readonly string[]) => modules.some(id => /@iconify(?:-json)?[+/]/.test(id))

	assert(has(rootGraph, 'ajo-ui-playa/dist/index.js'), 'root graph omitted the compiled preset implementation')
	assert(hasUno(rootGraph), 'root graph did not retain UnoCSS tooling')
	assert(hasIconify(rootGraph), 'root graph did not retain Iconify tooling')
	for (const runtime of ['ajo-ui-playa/dist/checkbox.js', 'ajo-ui/dist/', 'ajo-cloves/dist/']) {
		assert(!has(rootGraph, runtime), `root graph retained runtime module ${runtime}`)
	}
	assert(!rootGraph.some(id => id.includes('/node_modules/ajo-ui-playa/dist/') && !id.endsWith('/dist/index.js')),
		'root graph retained a Playa runtime family')
	assert(!has(rootGraph, '/node_modules/ajo-ui-playa/src/'), 'root graph executed package TypeScript source')

	assert(has(familyGraph, 'ajo-ui-playa/dist/checkbox.js'), 'family graph omitted the compiled themed Checkbox')
	assert(has(familyGraph, 'ajo-ui/dist/'), 'family graph omitted its compiled transitive base')
	const playaModules = familyGraph.filter(id => id.includes('/node_modules/ajo-ui-playa/dist/'))
	const unexpectedPlaya = playaModules.filter(id =>
		!id.endsWith('/dist/checkbox.js') && !/\/dist\/chunks\/recipes-[^/]+\.js$/.test(id))
	assert.deepEqual(unexpectedPlaya, [], `family graph retained unrelated Playa modules:\n${unexpectedPlaya.join('\n')}`)
	assert(!has(familyGraph, 'ajo-ui-playa/dist/index.js'), 'family graph retained the preset')
	assert(!hasUno(familyGraph), 'family graph retained UnoCSS tooling')
	assert(!hasIconify(familyGraph), 'family graph retained Iconify tooling')
	assert(!has(familyGraph, '/dist/sentinel.js'), 'family graph retained the unused sentinel')
	assert(!has(familyGraph, '/node_modules/ajo-ui-playa/src/'), 'family graph executed package TypeScript source')
	assertFloatingGraph('Checkbox family graph', familyGraph, false)

	assertPopupGraph('Popover family graph', popoverGraph, 'popover')
	assert(!has(popoverGraph, 'ajo-ui-playa/dist/index.js'), 'Popover graph retained the preset')
	assert(!hasUno(popoverGraph), 'Popover graph retained UnoCSS tooling')
	assert(!hasIconify(popoverGraph), 'Popover graph retained Iconify tooling')

	assertPopupGraph('Tooltip family graph', tooltipGraph, 'tooltip')
	assert(!has(tooltipGraph, 'ajo-ui-playa/dist/index.js'), 'Tooltip graph retained the preset')
	assert(!hasUno(tooltipGraph), 'Tooltip graph retained UnoCSS tooling')
	assert(!hasIconify(tooltipGraph), 'Tooltip graph retained Iconify tooling')
}

const verifyAjoUiNodeNextDeclarations = async (directory: string) => {
	// ajo@0.1.35's ambient types.ts is itself invalid under NodeNext. Stub only
	// that peer so this strictly checks ajo-ui's emitted .d.ts graph instead.
	await write(join(directory, 'ajo.d.ts'), [
		'export type Children = unknown',
		'export type Host<E extends object = object, A = object> = E & { signal: AbortSignal }',
		'export type IntrinsicElements = Record<string, Record<string, unknown>>',
		'export type Stateful<A = object> = (args: A) => Iterator<Children>',
		'export type Stateless<A = object> = (args: A) => Children',
		'export type WithChildren<A = object> = A & { children?: Children }',
		'',
	].join('\n'))
	await write(join(directory, 'types.ts'), [
		'import type { AccordionArgs, ChartConfig, DataTableColumn, InputTimeArgs } from \'ajo-ui\'',
		'import type { AccordionArgs as SubpathArgs } from \'ajo-ui/accordion\'',
		'void ({} as AccordionArgs)',
		'void ({} as SubpathArgs)',
		'void ({} as ChartConfig)',
		'void ({} as DataTableColumn<Record<string, unknown>>)',
		'void ({} as InputTimeArgs)',
		'',
	].join('\n'))
	await writeJson(join(directory, 'tsconfig.node-next.json'), {
		compilerOptions: {
			module: 'NodeNext', moduleResolution: 'NodeNext', noEmit: true,
			paths: { ajo: ['./ajo.d.ts'] }, skipLibCheck: false, strict: true, target: 'ESNext',
		},
		files: ['types.ts'],
	})
	await pnpm(['exec', 'tsc', '-p', 'tsconfig.node-next.json'], directory)
}

const ajoUiBundleProbe = async (consumer: string, registry: string) => {
	const families = {
		accordion: { exportName: 'Accordion', floating: false, subpath: 'accordion' },
		chart: { exportName: 'ChartContainer', floating: false, subpath: 'chart' },
		'chart-tooltip': { exportName: 'ChartTooltip', floating: true, subpath: 'chart' },
		'data-table': { exportName: 'DataTable', floating: true, subpath: 'data-table' },
		'input-date': { exportName: 'InputDate', floating: true, subpath: 'input-date' },
		'input-time': { exportName: 'InputTime', floating: false, subpath: 'input-date' },
	} as const
	const budgets: Record<keyof typeof families, ArtifactSize> = {
		accordion: { raw: 5 * 1024, gzip: 2 * 1024, brotli: 2 * 1024 },
		chart: { raw: 5_000, gzip: 2_200, brotli: 2_000 },
		'chart-tooltip': { raw: 45 * 1024, gzip: 14 * 1024, brotli: 13 * 1024 },
		'data-table': { raw: 115 * 1024, gzip: 33 * 1024, brotli: 29 * 1024 },
		'input-date': { raw: 126 * 1024, gzip: 36 * 1024, brotli: 32 * 1024 },
		'input-time': { raw: 42 * 1024, gzip: 13 * 1024, brotli: 12 * 1024 },
	}
	await writeJson(join(consumer, 'package.json'), {
		name: 'ajo-ui-bundle-consumer',
		version: '0.0.0',
		private: true,
		type: 'module',
		dependencies: { ajo: '0.1.35', 'ajo-ui': versions['ajo-ui'] },
		devDependencies: {
			typescript: validDevDependencies.typescript,
			vite: validDevDependencies.vite,
		},
	})
	await write(join(consumer, '.npmrc'), [
		`registry=${registry}/`,
		'auto-install-peers=false',
		'package-import-method=copy',
		'strict-peer-dependencies=true',
		'',
	].join('\n'))
	await write(join(consumer, 'pnpm-workspace.yaml'), [
		'allowBuilds:',
		'  esbuild: true',
		'minimumReleaseAgeExclude:',
		...packageNames.map(name => `  - ${name}@${versions[name]}`),
		'',
	].join('\n'))
	for (const [family, entry] of Object.entries(families)) {
		await write(join(consumer, `src/${family}-root.ts`), `export { ${entry.exportName} } from 'ajo-ui'\n`)
		await write(join(consumer, `src/${family}-subpath.ts`),
			`export { ${entry.exportName} } from 'ajo-ui/${entry.subpath}'\n`)
	}
	await pnpm(['install', '--no-frozen-lockfile'], consumer)
	await verifyAjoUiNodeNextDeclarations(consumer)
	const vite = await loadVite(consumer)
	const bundle = async (entry: string) => {
		const result = await vite.build({
			root: consumer,
			configFile: false,
			logLevel: 'silent',
			build: {
				minify: 'oxc',
				write: false,
				lib: { entry: join(consumer, `src/${entry}.ts`), formats: ['es'] },
				rolldownOptions: { external: [/^@oxc-parser\/binding-/] },
				target: 'es2022',
			},
		})
		const chunks = ((Array.isArray(result) ? result : [result]) as unknown as BuildOutput[])
			.flatMap(build => build.output)
			.filter(output => output.type === 'chunk')
		const size = chunks.reduce<ArtifactSize>((total, output) => {
			const code = output.code ?? ''
			return {
				brotli: total.brotli + brotliCompressSync(code).length,
				gzip: total.gzip + gzipSync(code).length,
				raw: total.raw + Buffer.byteLength(code),
			}
		}, { brotli: 0, gzip: 0, raw: 0 })
		return {
			modules: chunks.flatMap(output => Object.keys(output.modules ?? {}))
				.map(id => id.replaceAll('\\', '/')),
			size,
		}
	}
	const packageGraph = (modules: readonly string[]) =>
		modules.filter(id => id.includes('/node_modules/')).sort()
	const sizes: Record<string, ArtifactSize> = {}
	for (const [family, entry] of Object.entries(families) as Array<
		[keyof typeof families, typeof families[keyof typeof families]]
	>) {
		const rootBundle = await bundle(`${family}-root`)
		const subpathBundle = await bundle(`${family}-subpath`)
		const rootGraph = packageGraph(rootBundle.modules)
		const subpathGraph = packageGraph(subpathBundle.modules)
		assert.deepEqual(rootGraph, subpathGraph, `published ${family} root/subpath graphs diverged`)
		const implementation = family.startsWith('chart')
			? 'ajo-ui/dist/chunks/chart-'
			: family === 'data-table'
				? 'ajo-ui/dist/chunks/data-table-'
				: `ajo-ui/dist/${entry.subpath}.js`
		assert(hasModulePath(rootGraph, implementation),
			`published ${family} graph omitted its dist implementation`)
		assert(!rootGraph.some(id => id.includes('/node_modules/ajo-ui/src/')),
			`published ${family} graph executed package TypeScript source`)
		assertFloatingGraph(`Published ${family}`, rootGraph, entry.floating)
		assert(!rootGraph.some(id => id.includes('@tanstack+table-core') || id.includes('@tanstack+store')),
			`published ${family} retained TanStack Table or Store`)
		assert(!rootGraph.some(id => id.includes('@tanstack+virtual-core')),
			`published ${family} retained the VirtualList engine`)
		sizes[family] = {
			brotli: Math.max(rootBundle.size.brotli, subpathBundle.size.brotli),
			gzip: Math.max(rootBundle.size.gzip, subpathBundle.size.gzip),
			raw: Math.max(rootBundle.size.raw, subpathBundle.size.raw),
		}
	}
	console.log(`ajo-ui consumer: artifact sizes ${JSON.stringify(sizes)}`)
	for (const family of Object.keys(families) as Array<keyof typeof families>) {
		assertBudget(`Published ${family}`, sizes[family], budgets[family])
	}
}

const kitCssProbe = async (directory: string, registry: string) => {
	// The exact path that shipped unstyled production builds on 2026-07-28: a
	// consumer of the PUBLISHED ajo-kit resolves /src/client to the compiled
	// dist/client.js, and the kit plugin's css option must still reach it —
	// `kit build` has to stage a stylesheet asset and reference it from the
	// built index.html. The workspace never sees this path (it resolves the
	// .tsx source), which is how the regression stayed invisible.
	await writeJson(join(directory, 'package.json'), {
		name: 'ajo-kit-css-consumer',
		version: '0.0.0',
		private: true,
		type: 'module',
		dependencies: validDependencies,
		devDependencies: validDevDependencies,
	})
	await write(join(directory, '.npmrc'), [
		`registry=${registry}/`,
		'auto-install-peers=false',
		'package-import-method=copy',
		'strict-peer-dependencies=true',
		'',
	].join('\n'))
	await write(join(directory, 'pnpm-workspace.yaml'), [
		'allowBuilds:',
		'  argon2: true',
		'  better-sqlite3: true',
		'  esbuild: true',
		'minimumReleaseAgeExclude:',
		...packageNames.map(name => `  - ${name}@${versions[name]}`),
		'',
	].join('\n'))
	await write(join(directory, 'index.html'), [
		'<!DOCTYPE html>',
		'<html lang="en">',
		'<head>',
		'  <meta charset="UTF-8">',
		'  <!-- ssr:head -->',
		'</head>',
		'<body>',
		'  <!-- ssr:data -->',
		'  <div id="root"><!-- ssr:root --></div>',
		'  <script src="/src/client" type="module"></script>',
		'</body>',
		'</html>',
		'',
	].join('\n'))
	await write(join(directory, 'uno.config.ts'), [
		"import { defineConfig } from 'unocss'",
		"import { playa } from 'ajo-ui-playa'",
		'export default defineConfig({ presets: [playa()] })',
		'',
	].join('\n'))
	await write(join(directory, 'vite.config.ts'), [
		"import { defineConfig } from 'vite'",
		"import { kit } from 'ajo-kit/vite'",
		"import unocss from 'unocss/vite'",
		'export default defineConfig({',
		"  plugins: [...kit({ css: ['virtual:uno.css'] }), unocss()],",
		'})',
		'',
	].join('\n'))
	await writeJson(join(directory, 'tsconfig.json'), {
		compilerOptions: {
			jsx: 'react-jsx',
			jsxImportSource: 'ajo',
			module: 'ESNext',
			moduleResolution: 'Bundler',
			noEmit: true,
			skipLibCheck: true,
			strict: true,
			target: 'ESNext',
		},
		include: ['src'],
	})
	// The ability import rides the same probe: it is the documented client-safe
	// auth subpath, and only a consumer of the PUBLISHED package exercises the
	// compiled face (dist/ability.client.js) against the server-only guard —
	// the workspace resolves the .client.ts source, which is always exempt.
	await write(join(directory, 'src/page.tsx'), [
		"import { can } from 'ajo-kit-auth/ability'",
		'export default () => <main class="p-4">{can([\'posts:*\'], \'posts:read\') ? \'kit css probe\' : \'denied\'}</main>',
		'',
	].join('\n'))
	await pnpm(['install', '--no-frozen-lockfile'], directory)
	await pnpm(['exec', 'kit', 'build'], directory)

	const cssFiles = await filesWithExtension(join(directory, '.ajo/client'), '.css')
	assert(cssFiles.length > 0, 'kit build emitted no stylesheet from the css option')
	const html = await readFile(join(directory, '.ajo/client/index.html'), 'utf8')
	assert.match(html, /<link rel="stylesheet"[^>]*\/assets\/[^"]*\.css/,
		'built index.html does not reference the stylesheet')
	const css = (await Promise.all(cssFiles.map(path => readFile(path, 'utf8')))).join('\n')
	assert.match(css, /:root\{--radius:0?\.75rem/, 'Playa preflight was absent from the kit build')
}

const hmrProbe = async (directory: string, registry: string) => {
	const workspaceSource = join(root, 'packages/ajo-ui-playa')
	const playaSource = join(directory, 'vendor/ajo-ui-playa')
	await mkdir(playaSource, { recursive: true })
	await cp(join(workspaceSource, 'src'), join(playaSource, 'src'), { recursive: true })
	const manifest = parseJson<Record<string, unknown>>(
		await readFile(join(workspaceSource, 'package.json'), 'utf8'),
	)
	manifest.dependencies = {
		...(manifest.dependencies as Record<string, string>),
		'ajo-ui': versions['ajo-ui'],
	}
	delete manifest.devDependencies
	await writeJson(join(playaSource, 'package.json'), manifest)
	const link = relative(directory, playaSource).replaceAll('\\', '/')
	await writeJson(join(directory, 'package.json'), {
		name: 'ajo-ui-playa-hmr-consumer',
		version: '0.0.0',
		private: true,
		type: 'module',
		dependencies: { ajo: '0.1.35', 'ajo-ui-playa': `link:${link}` },
		devDependencies: validDevDependencies,
	})
	await write(join(directory, '.npmrc'), [
		`registry=${registry}/`,
		'auto-install-peers=false',
		'package-import-method=copy',
		'strict-peer-dependencies=true',
		'',
	].join('\n'))
	await write(join(directory, 'pnpm-workspace.yaml'), [
		'packages:',
		'  - .',
		'  - vendor/ajo-ui-playa',
		'minimumReleaseAgeExclude:',
		...packageNames.map(name => `  - ${name}@${versions[name]}`),
		'',
	].join('\n'))
	await writeJson(join(directory, 'tsconfig.json'), {
		compilerOptions: {
			jsx: 'react-jsx',
			jsxImportSource: 'ajo',
			module: 'ESNext',
			moduleResolution: 'Bundler',
			target: 'ESNext',
		},
	})
	await write(join(directory, 'index.html'), '<div id="app"></div><script type="module" src="/src/main.tsx"></script>\n')
	await write(join(directory, 'uno.config.ts'), [
		"import { defineConfig } from 'unocss'",
		"import { playa } from 'ajo-ui-playa'",
		'export default defineConfig({ presets: [playa()] })',
		'',
	].join('\n'))
	await write(join(directory, 'vite.config.ts'), [
		"import { fileURLToPath } from 'node:url'",
		"import { defineConfig } from 'vite'",
		"import unocss from 'unocss/vite'",
		'export default defineConfig({',
		"  plugins: [unocss(fileURLToPath(new URL('./uno.config.ts', import.meta.url)))],",
		"  oxc: { jsx: { importSource: 'ajo' } },",
		`  server: { fs: { allow: [${JSON.stringify(directory)}] } },`,
		'})',
		'',
	].join('\n'))
	await write(join(directory, 'src/main.tsx'), [
		"import { render } from 'ajo'",
		"import Button from 'ajo-ui-playa/button'",
		"import 'virtual:uno.css'",
		"render(<Button id=\"probe\">HMR probe</Button>, document.getElementById('app')!)",
		'',
	].join('\n'))
	await pnpm(['install', '--no-frozen-lockfile'], directory)
	assert.equal(await realpath(join(directory, 'node_modules/ajo-ui-playa')), await realpath(playaSource))

	const button = join(playaSource, 'src/button.tsx')
	const original = await readFile(button, 'utf8')
	const base = original.match(/^const base = '[^'\r\n]+'$/m)?.[0]
	assert(base, 'Button base recipe was not found for the HMR probe')
	const initial = original.replace(base, `${base.slice(0, -1)} [--playa-hmr:1]'`)
	assert.notEqual(initial, original)
	await writeFile(button, initial, 'utf8')

	let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
	let server: Awaited<ReturnType<typeof import('vite')['createServer']>> | undefined
	try {
		const vite = await loadVite(directory)
		const port = await freePort()
		server = await vite.createServer({
			root: directory,
			configFile: join(directory, 'vite.config.ts'),
			logLevel: 'error',
			server: { host: '127.0.0.1', port, strictPort: true },
		})
		await server.listen()
		browser = await chromium.launch({ headless: true })
		const page = await browser.newPage()
		const errors: string[] = []
		page.on('pageerror', error => errors.push(error.stack ?? error.message))
		page.on('console', message => {
			if (message.type() === 'error') errors.push(message.text())
		})
		page.on('response', response => {
			if (response.status() >= 400) {
				void response.text().then(body => errors.push(`${response.status()} ${response.url()}\n${body}`))
			}
		})
		await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
		await page.locator('#probe').waitFor({ timeout: 10_000 }).catch(() => {
			throw new Error(`HMR probe did not render:\n${errors.join('\n')}`)
		})
		await page.waitForFunction(() => {
			const probe = document.querySelector('#probe')
			return probe && getComputedStyle(probe).getPropertyValue('--playa-hmr').trim() === '1'
		})
		await writeFile(button, initial.replace('[--playa-hmr:1]', '[--playa-hmr:2]'), 'utf8')
		await page.waitForFunction(() => {
			const probe = document.querySelector('#probe')
			return probe && getComputedStyle(probe).getPropertyValue('--playa-hmr').trim() === '2'
		},
			undefined,
			{ timeout: 10_000 },
		)
	} finally {
		await browser?.close()
		await server?.close()
	}
}

const main = async () => {
	const temporary = await mkdtemp(join(tmpdir(), 'ajo-ui-playa-consumer-'))
	let registry: Awaited<ReturnType<typeof startRegistry>> | undefined
	try {
		registry = await startRegistry(join(temporary, 'registry'), await freePort())
		console.log('package consumer: ephemeral registry ready')
		const tarballs = join(temporary, 'tarballs')
		await mkdir(tarballs, { recursive: true })
		const published = new Map<string, Awaited<ReturnType<typeof packAndPublish>>>()
		for (const name of packageNames) {
			const artifact = await packAndPublish(name, tarballs, registry.url)
			verifyPublishedArtifact(name, artifact)
			published.set(name, artifact)
			console.log(`package consumer: published ${name}@${versions[name]} (${artifact.tarballBytes} B)`)
		}
		assert.equal(published.get('ajo-kit-auth')?.manifest.peerDependencies?.['ajo-kit'], `^${versions['ajo-kit']}`)
		assert.equal(published.get('ajo-kit-mail')?.manifest.peerDependencies?.['ajo-kit'], `^${versions['ajo-kit']}`)
		// nodemailer is smtp-only: the published manifest must keep it optional,
		// or every http/capture consumer under strict peers is forced to install it.
		assert.equal(published.get('ajo-kit-mail')?.manifest.peerDependencies?.nodemailer, '^7.0.0')
		assert.equal(published.get('ajo-kit-mail')?.manifest.peerDependenciesMeta?.nodemailer?.optional, true)
		assert.equal(published.get('ajo-ui')?.manifest.dependencies?.['ajo-cloves'], `^${versions['ajo-cloves']}`)
		assert.equal(published.get('ajo-ui')?.manifest.dependencies?.['@floating-ui/dom'], floatingDomVersion)
		assert.equal(published.get('ajo-ui-playa')?.manifest.dependencies?.['ajo-ui'], `^${versions['ajo-ui']}`)

		await peerMatrix(temporary, registry.url)
		console.log('package consumer: strict peer matrix passed')
		const consumer = join(temporary, 'consumer')
		await consumerFiles(consumer, registry.url)
		await pnpm(['install', '--no-frozen-lockfile'], consumer)
		await verifyDependencyGraph(consumer)
		await verifyServerPackages(consumer)
		console.log('package consumer: server packages, CLI, and migrations passed')
		const vite = await buildConsumer(consumer)
		await inspectGraphs(consumer, vite)
		console.log('package consumer: dependency, client, SSR, CSS, and module graphs passed')
		await ajoUiBundleProbe(join(temporary, 'ajo-ui-bundle-consumer'), registry.url)
		console.log('package consumer: ajo-ui release bundle graph passed')
		await kitCssProbe(join(temporary, 'kit-css-consumer'), registry.url)
		console.log('package consumer: kit build stylesheet contract passed')
		await hmrProbe(join(temporary, 'hmr-consumer'), registry.url)
		console.log('playa consumer: workspace-linked HMR passed')
	} catch (error) {
		if (registry) {
			const logs = registry.logs().trim()
			if (logs) console.error(`Verdaccio tail:\n${logs.slice(-6_000)}`)
		}
		throw error
	} finally {
		await stop(registry?.child)
		await rm(temporary, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 })
	}
}

await main()
