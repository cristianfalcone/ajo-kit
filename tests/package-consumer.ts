import assert from 'node:assert/strict'
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { access, chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { packages, root } from '../scripts/packages.ts'

type Package = typeof packages[number]

type PublishedManifest = {
	bin?: Record<string, string>
	dependencies?: Record<string, string>
	dist: { integrity: string }
	exports?: Record<string, { default?: string; import?: string; types?: string } | string>
	imports?: Record<string, Record<string, string>>
	kit?: { migrations?: string }
	peerDependencies?: Record<string, string>
	peerDependenciesMeta?: Record<string, { optional?: boolean }>
	sideEffects?: boolean | string[]
	types?: string
}

type Dependency = {
	dependencies?: Record<string, Dependency>
	path?: string
	version?: string
}

type Size = { brotli: number; files: number; gzip: number; raw: number }

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

const require = createRequire(import.meta.url)
const versions = Object.fromEntries(packages.map(({ name, version }) => [name, version]))
const pins = (require('../package.json') as { devDependencies: Record<string, string> }).devDependencies
const dependencies = {
	ajo: pins.ajo,
	'ajo-kit': versions['ajo-kit'],
	'ajo-kit-auth': versions['ajo-kit-auth'],
	'ajo-kit-mail': versions['ajo-kit-mail'],
	'ajo-ui': versions['ajo-ui'],
	'ajo-ui-playa': versions['ajo-ui-playa'],
}
const devDependencies = { typescript: pins.typescript, unocss: pins.unocss, vite: pins.vite }
// Ajo packages of the release that another repo packs and npm does not have
// yet: the workspace names each as a file:.tarballs override, and the local
// registry serves that tarball in its place.
const unpublished = [...(await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8'))
	.matchAll(/^[ \t]+['"]?([A-Za-z0-9@/._-]+?)['"]?:[ \t]*file:(\.tarballs\/\S+\.tgz)[ \t]*$/gm)]
	.map(([, name, path]) => ({ name, tarball: join(root, path) }))
const delay = (milliseconds: number) => new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds))

const run = (
	command: string,
	args: readonly string[],
	cwd: string,
	env: Record<string, string> = {},
) => new Promise<{ stderr: string; stdout: string }>((resolveRun, reject) => {
	const child = spawn(command, args, {
		cwd,
		env: { ...process.env, CI: '1', NO_COLOR: '1', ...env },
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

const pnpm = (args: readonly string[], cwd: string, env?: Record<string, string>) => {
	const cli = process.env.npm_execpath
	if (cli && /\.(?:c?js|mjs)$/i.test(cli)) return run(process.execPath, [cli, ...args], cwd, env)
	if (process.platform === 'win32') return run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'pnpm.cmd', ...args], cwd, env)
	return run('pnpm', args, cwd, env)
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

const files = async (directory: string, extension: string) =>
	(await readdir(directory, { recursive: true }))
		.filter(path => path.endsWith(extension))
		.map(path => join(directory, path))

const measure = async (paths: readonly string[]): Promise<Size> => {
	const bytes = Buffer.concat(await Promise.all(paths.map(path => readFile(path))))
	return {
		brotli: brotliCompressSync(bytes).length,
		files: paths.length,
		gzip: gzipSync(bytes).length,
		raw: bytes.length,
	}
}

const assertBudget = (label: string, size: Size, budget: Omit<Size, 'files'>) => {
	for (const format of ['raw', 'gzip', 'brotli'] as const) {
		assert(size[format] <= budget[format],
			`${label} ${format} grew to ${size[format]} B (budget ${budget[format]} B)`)
	}
}

const freePort = () => new Promise<number>((resolvePort, reject) => {
	const socket = createServer()
	socket.once('error', reject)
	socket.listen(0, '127.0.0.1', () => {
		const address = socket.address()
		assert(address && typeof address === 'object')
		const { port } = address
		socket.close(error => error ? reject(error) : resolvePort(port))
	})
})

const stop = async (child: ChildProcess | undefined) => {
	if (!child || child.exitCode !== null) return
	const exited = once(child, 'exit').then(() => true)
	child.kill('SIGTERM')
	if (await Promise.race([exited, delay(3_000).then(() => false)])) return
	child.kill('SIGKILL')
	await Promise.race([exited, delay(3_000)])
}

const startRegistry = async (directory: string, port: number) => {
	const config = join(directory, 'verdaccio.yaml')
	const posix = (path: string) => path.replaceAll('\\', '/')
	// The public packages and the unpublished tarballs resolve only from this
	// registry; everything else proxies npm.
	await write(config, [
		`storage: ${posix(join(directory, 'storage'))}`,
		'auth:',
		'  htpasswd:',
		`    file: ${posix(join(directory, 'htpasswd'))}`,
		'uplinks:',
		'  npmjs:',
		'    url: https://registry.npmjs.org/',
		'packages:',
		...[...packages, ...unpublished].flatMap(({ name }) => [
			`  '${name}':`,
			'    access: $all',
			'    publish: $all',
			'    unpublish: $all',
		]),
		"  '**':",
		'    access: $all',
		'    publish: $all',
		'    unpublish: $all',
		'    proxy: npmjs',
		'log: { type: stdout, format: pretty, level: warn }',
		`listen: 127.0.0.1:${port}`,
		'',
	].join('\n'))

	const child = spawn(process.execPath, [join(dirname(require.resolve('verdaccio/package.json')), 'bin/verdaccio'), '--config', config], {
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
		// A readiness window: a dead child still fails immediately.
		for (let attempt = 0; attempt < 900; attempt++) {
			if (child.exitCode !== null) throw new Error(`Verdaccio exited before readiness:\n${logs.slice(-6_000)}`)
			try {
				if ((await fetch(`${url}/-/ping`)).ok) return { child, logs: () => logs, url }
			} catch {
				// The socket rejects until Verdaccio binds it.
			}
			await delay(100)
		}
		throw new Error(`Verdaccio did not become ready:\n${logs.slice(-6_000)}`)
	} catch (error) {
		await stop(child)
		throw error
	}
}

// Packs, publishes the exact tarball to the local registry and reads back
// the manifest it serves.
const publish = async ({ directory, name, version }: Package, tarballs: string, registry: string) => {
	const packed = parseJson<{ filename: string; files: Array<{ path: string }>; name: string; version: string }>(
		(await pnpm(['pack', '--json', '--pack-destination', tarballs], directory)).stdout)
	assert.equal(packed.name, name)
	assert.equal(packed.version, version)
	const tarball = resolve(tarballs, packed.filename)
	await pnpm(['publish', tarball, '--registry', registry, '--no-git-checks'], directory)

	const response = await fetch(`${registry}/${name}`)
	assert(response.ok, `registry did not expose ${name}@${version}`)
	const manifest = (await response.json() as { versions: Record<string, PublishedManifest> }).versions[version]
	assert(manifest, `registry metadata omitted ${name}@${version}`)
	assert(!JSON.stringify(manifest).includes('workspace:'), `${name} published a workspace protocol`)

	const packlist = packed.files.map(file => file.path)
	for (const expected of ['LICENSE', 'package.json', 'README.md', ...name === 'ajo-kit' ? ['LLMs.md'] : []]) {
		assert(packlist.includes(expected), `${name} packlist omitted ${expected}`)
	}
	assert(packlist.every(path =>
		!path.startsWith('tests/') &&
		!path.startsWith('src/') &&
		!path.includes('node_modules') &&
		!path.startsWith('.tmp/')),
	`${name} packed source, a private test, or a generated path`)
	for (const [subpath, entry] of Object.entries(manifest.exports ?? {})) {
		if (typeof entry === 'string') {
			assert(entry.startsWith('./dist/') && packlist.includes(entry.slice(2)), `${name} export ${subpath} omitted its file`)
			continue
		}
		assert(entry.import?.startsWith('./dist/'), `${name} export ${subpath} has no compiled import target`)
		assert.equal(entry.default, entry.import, `${name} export ${subpath} has divergent runtime targets`)
		assert(entry.types?.startsWith('./dist/'), `${name} export ${subpath} has no compiled type target`)
		assert(packlist.includes(entry.import!.slice(2)), `${name} export ${subpath} omitted its runtime file`)
		assert(packlist.includes(entry.types!.slice(2)), `${name} export ${subpath} omitted its declaration file`)
	}
	for (const [specifier, conditions] of Object.entries(manifest.imports ?? {})) {
		for (const [condition, target] of Object.entries(conditions)) {
			assert(packlist.includes(target.replace(/^\.\//, '')), `${name} import ${specifier} (${condition}) omitted ${target}`)
		}
	}
	const index = manifest.exports?.['.']
	assert(typeof index !== 'string', `${name} root export is a plain file`)
	assert.equal(manifest.types, index?.types, `${name} top-level types diverged from its root export`)

	const javascript = packlist.filter(path => path.startsWith('dist/') && path.endsWith('.js'))
	const size = await measure(javascript.map(path => join(directory, path)))
	console.log(`package consumer: published ${name}@${version}, ${(await stat(tarball)).size} B tarball, dist JavaScript ${JSON.stringify(size)}`)
	if (name === 'ajo-ui-playa') {
		const runtime = await measure(javascript.filter(path => path !== 'dist/index.js').map(path => join(directory, path)))
		console.log(`package consumer: ajo-ui-playa runtime JavaScript without the build-time preset ${JSON.stringify(runtime)}`)
	}
	return { manifest, packlist }
}

// A consumer of the published packages: one manifest, the registry pinned
// to the local Verdaccio, and the files the probe needs.
const project = async (
	directory: string,
	registry: string,
	sources: Record<string, string>,
	manifest: { dependencies: Record<string, string>; devDependencies: Record<string, string> } = { dependencies, devDependencies },
) => {
	await writeJson(join(directory, 'package.json'), {
		name: basename(directory),
		version: '0.0.0',
		private: true,
		type: 'module',
		...manifest,
	})
	await write(join(directory, '.npmrc'), [
		`registry=${registry}/`,
		'',
	].join('\n'))
	// pnpm reads peer settings only from pnpm-workspace.yaml: a missing
	// required peer fails the install.
	await write(join(directory, 'pnpm-workspace.yaml'), [
		'autoInstallPeers: false',
		'strictPeerDependencies: true',
		'allowBuilds:',
		'  argon2: true',
		'  better-sqlite3: false',
		'  esbuild: true',
		'minimumReleaseAgeExclude:',
		...packages.map(({ name, version }) => `  - ${name}@${version}`),
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
	for (const [path, contents] of Object.entries(sources)) await write(join(directory, path), contents)
	await pnpm(['install', '--no-frozen-lockfile'], directory)
}

const unoConfig = [
	"import { defineConfig } from 'unocss'",
	"import { playa } from 'ajo-ui-playa'",
	'export default defineConfig({ presets: [playa()] })',
	'',
].join('\n')

const verifyDependencyGraph = async (consumer: string) => {
	const lock = await readFile(join(consumer, 'pnpm-lock.yaml'), 'utf8')
	assert(!lock.includes('workspace:'), 'consumer lock retained a workspace protocol')
	assert(!lock.includes('link:'), 'consumer linked a workspace package')

	const [listed] = parseJson<Dependency[]>((await pnpm(['list', '--json', '--depth', 'Infinity'], consumer)).stdout)
	const identity = (name: string, expected: string) => {
		const found = new Set<string>()
		const visit = (entries: Record<string, Dependency> | undefined) => {
			for (const [dependency, entry] of Object.entries(entries ?? {})) {
				if (dependency === name) found.add(`${entry.version} ${entry.path?.toLowerCase()}`)
				visit(entry.dependencies)
			}
		}
		visit(listed.dependencies)
		assert.equal(found.size, 1, `expected one ${name} identity, got ${[...found].join(', ')}`)
		assert.equal([...found][0].split(' ')[0], expected, `${name} resolved an unexpected version`)
	}
	identity('ajo', pins.ajo)
	// create-ajo creates a project; nothing depends on it.
	for (const { name, version } of packages) if (name !== 'create-ajo') identity(name, version)
}

// The server faces: root imports, argon2, the mail capture transport without
// the optional nodemailer peer, and the packaged migrations through the CLI.
const verifyServerPackages = async (consumer: string, migrations: readonly string[]) => {
	await write(join(consumer, 'package-probe.mjs'), [
		"import { date } from 'ajo-kit'",
		"import { close, connect } from 'ajo-kit/database'",
		"import { password } from 'ajo-kit-auth'",
		"import { can } from 'ajo-kit-auth/ability'",
		"import { configure, deliver } from 'ajo-kit-mail'",
		"import { capture } from 'ajo-kit-mail/capture'",
		"import { http } from 'ajo-kit-mail/http'",
		"import { Checkbox } from 'ajo-ui-playa/checkbox'",
		"if (!date('2026-01-01T00:00:00.000Z')) throw new Error('ajo-kit root export failed')",
		"if (!can(['posts:*'], 'posts:read')) throw new Error('ajo-kit-auth ability export failed')",
		"if (typeof Checkbox !== 'function') throw new Error('ajo-ui package chain failed')",
		"connect(':memory:')",
		"await close()",
		"const hash = await password.hash('published-package-probe')",
		"if (!await password.verify('published-package-probe', hash)) throw new Error('argon2 probe failed')",
		"const mailbox = capture()",
		"configure({ transport: mailbox, from: 'noreply@example.com' })",
		"const outcome = await deliver({ to: 'owner@example.com', subject: 'probe', text: 'claim https://example.com/invite/x' })",
		"if (!outcome.ok || mailbox.last()?.id !== outcome.id) throw new Error('ajo-kit-mail capture probe failed')",
		"if (!mailbox.link()?.startsWith('https://example.com/')) throw new Error('ajo-kit-mail link probe failed')",
		"if (typeof http !== 'function') throw new Error('ajo-kit-mail http export failed')",
		"console.log('package probe passed')",
		'',
	].join('\n'))
	assert.match((await run(process.execPath, ['package-probe.mjs'], consumer)).stdout, /package probe passed/)

	const database = join(consumer, 'migration-probe.sqlite')
	const kit = async (command: string) => {
		const { stderr, stdout } = await pnpm(['exec', 'kit', 'migrate', command, '--database', database], consumer)
		return `${stdout}\n${stderr}`
	}
	const up = await kit('up')
	const status = await kit('status')
	for (const migration of migrations) {
		assert.match(up, new RegExp(`plugin/ajo-kit-auth/${migration}`))
		assert.match(status, new RegExp(`plugin/ajo-kit-auth/${migration}`))
	}
	// Rollback reverses one migration per run, latest first.
	for (const migration of [...migrations].reverse()) {
		assert.match(await kit('down'), new RegExp(`plugin/ajo-kit-auth/${migration}.*rolled back`))
	}
}

// One Playa client and SSR build: CSS extracted from the published families,
// no build-time tooling in the client, the minimal consumer budget.
const buildPlaya = async (consumer: string) => {
	await pnpm(['exec', 'tsc', '--noEmit', '-p', 'tsconfig.json'], consumer)
	const vite = await import(pathToFileURL(createRequire(join(consumer, 'package.json')).resolve('vite')).href) as typeof import('vite')
	const build = (options: import('vite').BuildEnvironmentOptions) => vite.build({
		root: consumer,
		configFile: join(consumer, 'vite.config.ts'),
		logLevel: 'silent',
		build: { emptyOutDir: true, ...options },
	})
	const client = await build({ outDir: 'dist' }) as import('vite').Rollup.RollupOutput
	const tooling = client.output
		.flatMap(output => output.type === 'chunk' ? Object.keys(output.modules) : [])
		.filter(id => /(?:\/unocss@|\/@unocss\+|@iconify(?:-json)?\+)/.test(id.replaceAll('\\', '/')))
	assert.deepEqual(tooling, [], `client retained build-time modules:\n${tooling.join('\n')}`)
	await build({ outDir: 'dist-ssr', ssr: join(consumer, 'src/ssr.tsx') })

	const cssFiles = await files(join(consumer, 'dist'), '.css')
	const css = (await Promise.all(cssFiles.map(path => readFile(path, 'utf8')))).join('\n')
	assert.match(css, /:root\{[^}]*--radius:/, 'Playa preflight was absent')
	assert(css.includes('.playa-checkbox-box'), 'published Checkbox source was not extracted')
	assert(css.includes('.i-lucide-check'), 'Lucide icon CSS was absent')
	assert(!css.includes('.playa-select-trigger'), 'an unused family recipe was emitted')
	const sizes = { css: await measure(cssFiles), js: await measure(await files(join(consumer, 'dist'), '.js')) }
	console.log(`package consumer: Playa minimal consumer ${JSON.stringify(sizes)}`)
	assertBudget('minimal consumer CSS', sizes.css, { raw: 18_900, gzip: 4_700, brotli: 4_100 })
	assertBudget('minimal consumer JS', sizes.js, { raw: 12_000, gzip: 4_500, brotli: 4_000 })

	const [ssr] = await files(join(consumer, 'dist-ssr'), 'ssr.js')
	const html = (await import(pathToFileURL(ssr).href) as { default: () => string }).default()
	assert.match(html, /data-slot="checkbox"/)
	assert.match(html, /Published SSR checkbox/)
}

// Strictly checks ajo-ui's emitted .d.ts graph, with the published ajo peer,
// under NodeNext resolution.
const verifyNodeNextDeclarations = async (consumer: string) => {
	await write(join(consumer, 'node-next.ts'), [
		"import type { AccordionArgs } from 'ajo-ui/accordion'",
		"import type { ChartConfig } from 'ajo-ui/chart'",
		"import type { DataTableColumn } from 'ajo-ui/data-table'",
		"import type { InputTimeArgs } from 'ajo-ui/input-date'",
		'void ({} as AccordionArgs)',
		'void ({} as ChartConfig)',
		'void ({} as DataTableColumn<Record<string, unknown>>)',
		'void ({} as InputTimeArgs)',
		'',
	].join('\n'))
	await writeJson(join(consumer, 'tsconfig.node-next.json'), {
		compilerOptions: {
			module: 'NodeNext', moduleResolution: 'NodeNext', noEmit: true,
			skipLibCheck: false, strict: true, target: 'ESNext',
		},
		files: ['node-next.ts'],
	})
	await pnpm(['exec', 'tsc', '-p', 'tsconfig.node-next.json'], consumer)
}

// A consumer of the PUBLISHED ajo-kit resolves /src/client to the compiled
// dist/client.js, and the kit plugin's css option must still reach it: `kit
// build` stages a stylesheet and references it from the built index.html. The
// workspace resolves the .tsx source and never sees this path. The page imports
// the client-safe auth subpath, whose compiled face (dist/ability.client.js)
// must pass the server-only guard.
const kitCssProbe = async (directory: string, registry: string) => {
	await project(directory, registry, {
		'uno.config.ts': unoConfig,
		'index.html': [
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
		].join('\n'),
		'vite.config.ts': [
			"import { defineConfig } from 'vite'",
			"import { kit } from 'ajo-kit/vite'",
			"import unocss from 'unocss/vite'",
			'export default defineConfig({',
			"  plugins: [...kit({ css: ['virtual:uno.css'] }), unocss()],",
			'})',
			'',
		].join('\n'),
		'src/page.tsx': [
			"import { can } from 'ajo-kit-auth/ability'",
			'export default () => <main class="p-4">{can([\'posts:*\'], \'posts:read\') ? \'kit css probe\' : \'denied\'}</main>',
			'',
		].join('\n'),
	})
	// Without ajo-engine-compiler installed, the build stages and reports it is not sealed.
	const staged = await pnpm(['exec', 'kit', 'build', '--json'], directory)
	assert.deepEqual(JSON.parse(staged.stdout).result, { staged: '.ajo', sealed: false })
	await assert.rejects(access(join(directory, 'dist')), { code: 'ENOENT' })

	const cssFiles = await files(join(directory, '.ajo/client'), '.css')
	assert(cssFiles.length > 0, 'kit build emitted no stylesheet from the css option')
	const html = await readFile(join(directory, '.ajo/client/index.html'), 'utf8')
	assert.match(html, /<link rel="stylesheet"[^>]*\/assets\/[^"]*\.css/,
		'built index.html does not reference the stylesheet')
	const css = (await Promise.all(cssFiles.map(path => readFile(path, 'utf8')))).join('\n')
	assert.match(css, /:root\{[^}]*--radius:/, 'Playa preflight was absent from the kit build')

	if (process.platform === 'win32') {
		console.log('package consumer: executable compiler fixture requires POSIX; skipped on Windows')
		return
	}

	// kit build seals with the project's installed compiler package, as pnpm
	// installs the real one on Linux x64.
	const compiler = join(directory, 'node_modules/ajo-engine-compiler/bin/ajo-engine-compiler')
	await writeJson(join(directory, 'node_modules/ajo-engine-compiler/package.json'), {
		name: 'ajo-engine-compiler',
		version: '0.0.0',
		bin: { 'ajo-engine-compiler': 'bin/ajo-engine-compiler' },
	})
	await write(compiler, [
		'#!/usr/bin/env node',
		"import assert from 'node:assert/strict'",
		"import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'",
		"import { join } from 'node:path'",
		"assert.deepEqual(process.argv.slice(2), ['--input', '.ajo/compiler.json', '--output', 'dist/ajo'])",
		"assert.equal(JSON.parse(readFileSync('.ajo/compiler.json', 'utf8')).schema, 1)",
		// Like the native compiler, create the output only when its parent exists.
		"mkdirSync('dist/ajo')",
		"writeFileSync(join('dist/ajo', 'fixture.txt'), 'compiled')",
		'',
	].join('\n'))
	await chmod(compiler, 0o755)
	const sealed = await pnpm(['exec', 'kit', 'build', '--json'], directory)
	assert.deepEqual(JSON.parse(sealed.stdout).result, { staged: '.ajo', sealed: true, artifact: 'dist/ajo' })
	assert.equal(await readFile(join(directory, 'dist/ajo/fixture.txt'), 'utf8'), 'compiled')

	await write(join(directory, 'dist/sibling.txt'), 'preserved')
	await write(join(directory, 'dist/ajo/stale.txt'), 'old artifact')
	await pnpm(['exec', 'kit', 'build'], directory)
	await assert.rejects(access(join(directory, 'dist/ajo/stale.txt')), { code: 'ENOENT' })
	assert.equal(await readFile(join(directory, 'dist/sibling.txt'), 'utf8'), 'preserved')

	await write(compiler, '#!/usr/bin/env node\nprocess.exit(23)\n')
	await assert.rejects(pnpm(['exec', 'kit', 'build', '--json'], directory), (error: unknown) =>
		error instanceof CommandFailure && JSON.parse(error.stdout).error.code === 'seal_failed'
		&& /ajo-engine-compiler exited with status 23/.test(error.stderr))
	assert.equal(await readFile(join(directory, 'dist/sibling.txt'), 'utf8'), 'preserved')
}

// create-ajo ships the tracked starter, pinned to this release set with
// ajo-kit-server, and `pnpm create ajo <dir> --json` passes --json through
// to it. The starter installs from the local registry with pnpm's default
// release-age policy; the same-day versions are exempted in pnpm's global
// config, as on a newcomer's machine on release day, so the install writes
// nothing into the starter's own pnpm-workspace.yaml. It passes its own type
// check and unit tests against the published set, and kit deploy reaches the
// plugin, all on a Node without type stripping, as distributions build it
// without amaro.
const createProbe = async (
	directory: string,
	registry: string,
	published: Record<string, Awaited<ReturnType<typeof publish>>>,
	integrities: Record<string, string>,
) => {
	const { manifest, packlist } = published['create-ajo']
	assert.deepEqual(manifest.bin, { 'create-ajo': './dist/index.js' })
	assert(packlist.includes('dist/index.js'), 'create-ajo packlist omitted its compiled bin')
	const starter = join(root, 'packages/create-ajo/template')
	const tracked = execFileSync('git', ['ls-files', '-z', '.'], { cwd: starter, encoding: 'utf8' }).split('\0').filter(Boolean)
	assert.deepEqual(packlist.filter(path => path.startsWith('template/')).map(path => path.slice('template/'.length)).sort(), tracked.sort(),
		'create-ajo did not pack exactly the tracked starter')

	const pinned = JSON.parse(await readFile(join(starter, 'package.json'), 'utf8')) as Record<
		'dependencies' | 'devDependencies' | 'optionalDependencies', Record<string, string>>
	const policy = await readFile(join(starter, 'pnpm-workspace.yaml'), 'utf8')
	assert(!policy.includes('minimumReleaseAgeExclude'), 'the starter exempts versions from the release age in its own pnpm-workspace.yaml')
	for (const { name, version } of packages) {
		if (name in pinned.dependencies) assert.equal(pinned.dependencies[name], version, `the starter pins ${name} outside this release`)
	}
	const server = pinned.devDependencies['ajo-kit-server']
	assert.match(server ?? '', /^\d+\.\d+\.\d+$/, 'the starter does not pin ajo-kit-server exactly')

	await mkdir(directory)
	// Every Ajo package of the release: this repo's, and the ajo, engine and ajo-kit-server pins.
	const release = new Set(packages.map(({ name, version }) => `${name}@${version}`))
	for (const [name, version] of Object.entries({ ...pinned.dependencies, ...pinned.devDependencies, ...pinned.optionalDependencies })) {
		if (/^ajo(?:-|$)/.test(name)) release.add(`${name}@${version}`)
	}
	await write(join(directory, '.config/pnpm/config.yaml'), ['minimumReleaseAgeExclude:', ...[...release].map(entry => `  - ${entry}`), ''].join('\n'))
	const node = { NODE_OPTIONS: '--no-experimental-strip-types' }
	// The starter installs as its own project, so the registry reaches it through the environment.
	const created = await pnpm(['create', 'ajo', 'notes', '--json'], directory, {
		...node,
		pnpm_config_registry: `${registry}/`,
		XDG_CACHE_HOME: join(directory, '.cache'),
		XDG_CONFIG_HOME: join(directory, '.config'),
	})
	assert.deepEqual(JSON.parse(created.stdout), {
		ok: true, result: { directory: 'notes', name: 'notes' }, next: 'cd notes && pnpm kit dev',
	})
	const project = join(directory, 'notes')
	assert.equal(JSON.parse(await readFile(join(project, 'package.json'), 'utf8')).name, 'notes')
	await access(join(project, '.git/HEAD'))
	await access(join(project, '.gitignore'))
	assert.equal((await stat(join(project, '.env'))).mode & 0o777, 0o600)
	await access(join(project, 'database.sqlite'))
	assert.equal(await readFile(join(project, 'pnpm-workspace.yaml'), 'utf8'), policy, 'the install rewrote the starter\'s pnpm-workspace.yaml')
	const lock = await readFile(join(project, 'pnpm-lock.yaml'), 'utf8')
	for (const name of Object.keys(pinned.dependencies).filter(name => name in published)) {
		assert(lock.includes(published[name].manifest.dist.integrity), `the starter did not install the published ${name}`)
	}
	for (const [name, integrity] of Object.entries(integrities)) {
		assert(lock.includes(integrity), `the starter did not install the ${name} tarball`)
	}
	await pnpm(['typecheck'], project, node)
	await pnpm(['test'], project, node)
	// A fresh starter has no host yet: kit deploy is the plugin's command and asks for one.
	await assert.rejects(pnpm(['exec', 'kit', 'deploy', '--json'], project, node), (error: unknown) =>
		error instanceof CommandFailure && JSON.parse(error.stdout).error.code === 'host_unknown')
}

// An app without UnoCSS takes Playa's stylesheets only: it installs under
// strict peers without unocss, and Vite resolves tokens.css from a module and
// fonts.css from a stylesheet, emitting the face files the CSS references.
const stylesheetProbe = async (directory: string, registry: string) => {
	await project(directory, registry, {
		'index.html': '<p>Stylesheets</p><script type="module" src="/src/main.js"></script>\n',
		'src/main.js': "import 'ajo-ui-playa/tokens.css'\nimport './app.css'\n",
		'src/app.css': "@import 'ajo-ui-playa/fonts.css';\n",
	}, {
		dependencies: { ajo: pins.ajo, 'ajo-ui-playa': versions['ajo-ui-playa'] },
		devDependencies: { vite: pins.vite },
	})
	await assert.rejects(access(join(directory, 'node_modules/unocss')), { code: 'ENOENT' })

	const vite = await import(pathToFileURL(createRequire(join(directory, 'package.json')).resolve('vite')).href) as typeof import('vite')
	await vite.build({ root: directory, configFile: false, logLevel: 'silent', build: { emptyOutDir: true, outDir: 'dist' } })
	const cssFiles = await files(join(directory, 'dist'), '.css')
	const css = (await Promise.all(cssFiles.map(path => readFile(path, 'utf8')))).join('\n')
	assert.match(css, /:root\{[^}]*--radius:/, 'tokens.css was absent')
	for (const family of ['DM Sans Variable', 'JetBrains Mono Variable', 'Fraunces Variable']) {
		assert.match(css, new RegExp(`font-family:["']?${family}`), `fonts.css omitted ${family}`)
	}
	const fonts = await files(join(directory, 'dist'), '.woff2')
	assert(fonts.length > 0, 'the build emitted no face file')
	for (const url of css.matchAll(/url\(["']?\/assets\/([^"')]+\.woff2)/g)) {
		assert(fonts.some(path => basename(path) === url[1]), `built CSS references a missing ${url[1]}`)
	}
	console.log(`package consumer: Playa stylesheets without UnoCSS ${JSON.stringify({ css: await measure(cssFiles), fonts: await measure(fonts) })}`)
}

const main = async () => {
	const temporary = await mkdtemp(join(tmpdir(), 'ajo-kit-consumer-'))
	let registry: Awaited<ReturnType<typeof startRegistry>> | undefined
	try {
		registry = await startRegistry(join(temporary, 'registry'), await freePort())
		const tarballs = join(temporary, 'tarballs')
		await mkdir(tarballs)
		const published: Record<string, Awaited<ReturnType<typeof publish>>> = {}
		for (const entry of packages) published[entry.name] = await publish(entry, tarballs, registry.url)
		const integrities: Record<string, string> = {}
		for (const { name, tarball } of unpublished) {
			await access(tarball).catch(() => {
				throw new Error(`${name} is not on npm yet: pack it from its repo into ${tarball}`)
			})
			await pnpm(['publish', tarball, '--registry', registry.url, '--no-git-checks'], temporary)
			const response = await fetch(`${registry.url}/${name}`)
			const metadata = await response.json() as { versions: Record<string, PublishedManifest> }
			const served = Object.values(metadata.versions)
			assert.equal(served.length, 1, `registry served more than the ${name} tarball`)
			integrities[name] = served[0].dist.integrity
			console.log(`package consumer: published ${basename(tarball)} from .tarballs`)
		}

		const manifest = (name: string) => published[name].manifest
		for (const name of ['ajo-cloves', 'ajo-ui']) {
			assert.equal(manifest(name).sideEffects, false, `${name} is not marked tree-shakeable`)
		}
		assert.deepEqual(manifest('ajo-ui-playa').sideEffects, ['*.css'], 'ajo-ui-playa must mark only its stylesheets as side effects')
		assert.equal(manifest('ajo-kit').bin?.kit, './dist/bin/kit.js')
		assert(published['ajo-kit'].packlist.includes('dist/bin/kit.js'), 'ajo-kit packlist omitted its compiled CLI')
		assert.equal(manifest('ajo-kit-auth').peerDependencies?.['ajo-kit'], `^${versions['ajo-kit']}`)
		assert.equal(manifest('ajo-kit-mail').peerDependencies?.['ajo-kit'], `^${versions['ajo-kit']}`)
		// nodemailer is smtp-only: it stays an optional peer, or every http and
		// capture consumer under strict peers is forced to install it.
		assert.equal(manifest('ajo-kit-mail').peerDependencies?.nodemailer, '^10.0.10')
		assert.equal(manifest('ajo-kit-mail').peerDependenciesMeta?.nodemailer?.optional, true)
		assert.equal(manifest('ajo-ui').dependencies?.['ajo-cloves'], `^${versions['ajo-cloves']}`)
		assert.equal(manifest('ajo-ui-playa').dependencies?.['ajo-ui'], `^${versions['ajo-ui']}`)
		assert.equal(manifest('ajo-ui-playa').peerDependencies?.unocss, pins.unocss)
		assert.equal(manifest('ajo-ui-playa').peerDependenciesMeta?.unocss?.optional, true)

		assert.equal(manifest('ajo-kit-auth').kit?.migrations, './dist/migrations/')
		const migrations = published['ajo-kit-auth'].packlist
			.filter(path => path.startsWith('dist/migrations/'))
			.map(path => path.slice('dist/migrations/'.length, -'.js'.length))
			.sort()
		const sources = (await readdir(join(root, 'packages/ajo-kit-auth/migrations'))).map(file => file.replace(/\.ts$/, '')).sort()
		assert.deepEqual(migrations, sources, 'ajo-kit-auth published an unexpected migration set')

		const consumer = join(temporary, 'consumer')
		await project(consumer, registry.url, {
			'uno.config.ts': unoConfig,
			'index.html': '<div id="app"></div><script type="module" src="/src/main.tsx"></script>\n',
			'vite.config.ts': [
				"import { fileURLToPath } from 'node:url'",
				"import { defineConfig } from 'vite'",
				"import unocss from 'unocss/vite'",
				'export default defineConfig({',
				"  plugins: [unocss(fileURLToPath(new URL('./uno.config.ts', import.meta.url)))],",
				"  oxc: { jsx: { importSource: 'ajo' } },",
				'  ssr: { noExternal: [/^ajo-/] },',
				'})',
				'',
			].join('\n'),
			'src/env.d.ts': "declare module 'virtual:uno.css'\n",
			'src/auth-types.ts': [
				"import type { Request } from 'ajo-kit'",
				"import { admit, token } from 'ajo-kit-auth'",
				"export const create = (user: number) => token.create(user, 'Blog CI', ['apps:deploy'], { subject: 'app:blog', ttl: 60_000 })",
				"export const revoke = (user: number, id: string): Promise<boolean> => token.revoke(user, id)",
				"export const subject = (req: Request): string | null | undefined => req.token?.subject",
				"export const deploy = (req: Request) => admit(req, 'app:blog', 'apps:deploy')",
				'',
			].join('\n'),
			'src/main.tsx': [
				"import { render } from 'ajo'",
				"import { Checkbox } from 'ajo-ui-playa/checkbox'",
				"import 'virtual:uno.css'",
				"render(<Checkbox aria-label=\"Published checkbox\" />, document.getElementById('app')!)",
				'',
			].join('\n'),
			'src/ssr.tsx': [
				"import { render } from 'ajo/html'",
				"import { Checkbox } from 'ajo-ui-playa/checkbox'",
				'export default () => render(<Checkbox aria-label="Published SSR checkbox" />)',
				'',
			].join('\n'),
		})
		await verifyDependencyGraph(consumer)
		await verifyServerPackages(consumer, migrations)
		console.log('package consumer: dependencies, server packages, CLI and migrations passed')
		await buildPlaya(consumer)
		await verifyNodeNextDeclarations(consumer)
		console.log('package consumer: Playa client, SSR and CSS, ajo-ui NodeNext declarations passed')
		await kitCssProbe(join(temporary, 'kit-css-consumer'), registry.url)
		console.log('package consumer: kit build stylesheet and sealing contract passed')
		await stylesheetProbe(join(temporary, 'stylesheet-consumer'), registry.url)
		console.log('package consumer: Playa tokens and fonts without UnoCSS passed')
		await createProbe(join(temporary, 'create-consumer'), registry.url, published, integrities)
		console.log('package consumer: pnpm create ajo, the starter install, type check and tests passed')
	} catch (error) {
		const logs = registry?.logs().trim()
		if (logs) console.error(`Verdaccio tail:\n${logs.slice(-6_000)}`)
		throw error
	} finally {
		await stop(registry?.child)
		await rm(temporary, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 })
	}
}

await main()
