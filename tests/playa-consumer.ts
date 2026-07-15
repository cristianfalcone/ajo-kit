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
	dependencies?: Record<string, string>
	name: string
	peerDependencies?: Record<string, string>
	version: string
}

type RegistryMetadata = {
	versions: Record<string, PublishedManifest>
}

type BuildOutput = {
	output: Array<{
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
const packageNames = ['ajo-cloves', 'ajo-ui', 'ajo-ui-playa'] as const
const versions = {
	'ajo-cloves': '0.1.0',
	'ajo-ui': '0.1.0',
	'ajo-ui-playa': '0.1.0',
} as const
const validDependencies = { ajo: '0.1.35', 'ajo-ui-playa': '0.1.0' }
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
		for (let attempt = 0; attempt < 120; attempt++) {
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
	await pnpm(['publish', tarball, '--registry', registry, '--no-git-checks'], directory)

	const response = await fetch(`${registry}/${name}`)
	assert(response.ok, `registry did not expose ${name}@${versions[name]}`)
	const metadata = await response.json() as RegistryMetadata
	const manifest = metadata.versions[versions[name]]
	assert(manifest, `registry metadata omitted ${name}@${versions[name]}`)
	assert(!JSON.stringify(manifest).includes('workspace:'), `${name} published a workspace protocol`)
	return { manifest, packed }
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
		"import { defineConfig } from 'vite'",
		"import unocss from 'unocss/vite'",
		'export default defineConfig({',
		'  plugins: [unocss()],',
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
	await write(join(directory, 'src/sentinel.tsx'), [
		'export const UnusedSentinel = () => <div class="[--playa-consumer-unused:#654321]" />',
		'',
	].join('\n'))
	await write(join(directory, 'src/graph-root.ts'), "export { playa } from 'ajo-ui-playa'\n")
	await write(join(directory, 'src/graph-family.ts'), "export { default } from 'ajo-ui-playa/checkbox'\n")
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
			dependencies: validDependencies,
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
		dependencies: validDependencies,
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
	const lock = await readFile(join(consumer, 'pnpm-lock.yaml'), 'utf8')
	assert(!lock.includes('workspace:'), 'consumer lock retained a workspace protocol')
	assert(!lock.includes('link:../ajo'), 'consumer linked a workspace package')

	const listed = parseJson<ListedProject[]>((await pnpm(['list', '--json', '--depth', 'Infinity'], consumer)).stdout)[0]
	const playa = listed.dependencies?.['ajo-ui-playa']
	const base = playa?.dependencies?.['ajo-ui']
	const cloves = base?.dependencies?.['ajo-cloves']
	assert.equal(playa?.version, versions['ajo-ui-playa'])
	assert.equal(base?.version, versions['ajo-ui'])
	assert.equal(cloves?.version, versions['ajo-cloves'])

	const ajoPaths = new Set<string>()
	const ajoVersions = new Set<string>()
	const collect = (name: string, dependency: Dependency) => {
		if (name !== 'ajo') return
		if (dependency.path) ajoPaths.add(dependency.path.toLowerCase())
		if (dependency.version) ajoVersions.add(dependency.version)
	}
	visitDependencies(listed.dependencies, collect)
	visitDependencies(listed.devDependencies, collect)
	assert.deepEqual([...ajoVersions], ['0.1.35'])
	assert.equal(ajoPaths.size, 1, `expected one Ajo identity, got ${[...ajoPaths].join(', ')}`)
}

const modulesOf = (result: unknown) => ((Array.isArray(result) ? result : [result]) as BuildOutput[])
	.flatMap(build => build.output)
	.flatMap(output => output.type === 'chunk' ? Object.keys(output.modules ?? {}) : [])
	.map(id => id.replaceAll('\\', '/'))

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
	const sources = await filesWithExtension(join(root, 'packages/ajo-ui-playa/src'), '.tsx')
	const source = (await Promise.all(sources.map(path => readFile(path, 'utf8')))).join('\n')
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
	const tooling = clientModules.filter(id => /(?:\/unocss@|\/@unocss\+|@iconify(?:-json)?\+)/.test(id))
	assert.deepEqual(tooling, [], `client retained build-time modules:\n${tooling.join('\n')}`)

	await vite.build({
		root: consumer,
		configFile,
		logLevel: 'silent',
		build: { emptyOutDir: true, outDir: 'dist-ssr', ssr: join(consumer, 'src/ssr.tsx') },
	})
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
	const graph = async (entry: 'graph-family' | 'graph-root') => modulesOf(await vite.build({
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
	const has = (modules: readonly string[], part: string) => modules.some(id => id.includes(part))
	const hasUno = (modules: readonly string[]) => modules.some(id => /(?:\/unocss@|\/@unocss\+|\/unocss\/dist)/.test(id))
	const hasIconify = (modules: readonly string[]) => modules.some(id => /@iconify(?:-json)?[+/]/.test(id))

	assert(has(rootGraph, 'ajo-ui-playa/src/styles.ts'), 'root graph omitted the preset implementation')
	assert(hasUno(rootGraph), 'root graph did not retain UnoCSS tooling')
	assert(hasIconify(rootGraph), 'root graph did not retain Iconify tooling')
	for (const runtime of ['ajo-ui-playa/src/checkbox.tsx', 'ajo-ui/src/', 'ajo-cloves/src/']) {
		assert(!has(rootGraph, runtime), `root graph retained runtime module ${runtime}`)
	}
	assert(!rootGraph.some(id => id.includes('/node_modules/ajo-ui-playa/src/') && id.endsWith('.tsx')),
		'root graph retained a Playa runtime family')

	assert(has(familyGraph, 'ajo-ui-playa/src/checkbox.tsx'), 'family graph omitted the themed Checkbox')
	assert(has(familyGraph, 'ajo-ui/src/'), 'family graph omitted its transitive base')
	const playaModules = familyGraph.filter(id => id.includes('/node_modules/ajo-ui-playa/src/'))
	const unexpectedPlaya = playaModules.filter(id =>
		!id.endsWith('/src/checkbox.tsx') && !id.endsWith('/src/internal/recipes.tsx'))
	assert.deepEqual(unexpectedPlaya, [], `family graph retained unrelated Playa modules:\n${unexpectedPlaya.join('\n')}`)
	assert(!has(familyGraph, 'ajo-ui-playa/src/styles.ts'), 'family graph retained the preset')
	assert(!hasUno(familyGraph), 'family graph retained UnoCSS tooling')
	assert(!hasIconify(familyGraph), 'family graph retained Iconify tooling')
	assert(!has(familyGraph, '/src/sentinel.tsx'), 'family graph retained the unused sentinel')
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
		"import { defineConfig } from 'vite'",
		"import unocss from 'unocss/vite'",
		'export default defineConfig({',
		'  plugins: [unocss()],',
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
		console.log('playa consumer: ephemeral registry ready')
		const tarballs = join(temporary, 'tarballs')
		await mkdir(tarballs, { recursive: true })
		const published = new Map<string, Awaited<ReturnType<typeof packAndPublish>>>()
		for (const name of packageNames) {
			published.set(name, await packAndPublish(name, tarballs, registry.url))
			console.log(`playa consumer: published ${name}@${versions[name]}`)
		}
		assert.equal(published.get('ajo-ui')?.manifest.dependencies?.['ajo-cloves'], versions['ajo-cloves'])
		assert.equal(published.get('ajo-ui-playa')?.manifest.dependencies?.['ajo-ui'], versions['ajo-ui'])
		const packlist = published.get('ajo-ui-playa')?.packed.files.map(file => file.path) ?? []
		for (const expected of ['package.json', 'README.md', 'src/index.ts', 'src/styles.ts', 'src/checkbox.tsx']) {
			assert(packlist.includes(expected), `Playa packlist omitted ${expected}`)
		}
		assert(packlist.every(path => !path.startsWith('tests/') && !path.includes('node_modules') && !path.startsWith('.tmp/')))

		await peerMatrix(temporary, registry.url)
		console.log('playa consumer: strict peer matrix passed')
		const consumer = join(temporary, 'consumer')
		await consumerFiles(consumer, registry.url)
		await pnpm(['install', '--no-frozen-lockfile'], consumer)
		await verifyDependencyGraph(consumer)
		console.log('playa consumer: published dependency graph passed')
		const vite = await buildConsumer(consumer)
		await inspectGraphs(consumer, vite)
		console.log('playa consumer: client, SSR, CSS, and module graphs passed')
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
