import { access, readFile, readdir } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { build } from 'vite'

type Export = {
	ajo?: string
	browser?: string
	default: string
	types: string
}

type Manifest = {
	exports: Record<string, Export>
	kit?: { migrations?: string }
	name: string
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile)
if (config.error) {
	throw new Error(ts.formatDiagnostics([config.error], {
		getCanonicalFileName: file => file,
		getCurrentDirectory: () => root,
		getNewLine: () => '\n',
	}))
}
const compiler = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options
const packages = [
	'ajo-kit',
	'ajo-kit-auth',
	'ajo-kit-mail',
	'ajo-cloves',
	'ajo-ui',
	'ajo-ui-playa',
] as const

type Package = typeof packages[number]

const requested = process.argv.slice(2)
const selected = requested.length ? requested : packages

const external = (id: string) =>
	id.startsWith('node:') ||
	id.startsWith('virtual:') ||
	(!id.startsWith('.') && !id.startsWith('\0') && !isAbsolute(id))

const declaration = (source: string) =>
	source.replace(/^\.\/src\//, '').replace(/\.[jt]sx?$/, '.d.ts')

const relativeModule = /((?:from|import)\s*(?:\(\s*)?)(['"])(\.\.?\/[^'"]+)\2/g
const runtimeModule = (source: string) => {
	if (/\.mts$/.test(source)) return source.replace(/\.mts$/, '.mjs')
	if (/\.cts$/.test(source)) return source.replace(/\.cts$/, '.cjs')
	if (/\.tsx?$/.test(source)) return source.replace(/\.tsx?$/, '.js')
	if (/\.(?:[cm]?js|json|node|css)$/.test(source)) return source
	return source + '.js'
}

const declarations = (name: string, directory: string, sources: string[]) => {
	const program = ts.createProgram({
		rootNames: sources,
		options: {
			...compiler,
			declaration: true,
			emitDeclarationOnly: true,
			noEmit: false,
			outDir: resolve(directory, 'dist'),
			rootDir: resolve(directory, 'src'),
		},
	})
	const emitted = program.emit(undefined, (file, contents, byteOrderMark) => {
		const output = file.endsWith('.d.ts')
			? contents.replace(relativeModule, (_match, prefix: string, quote: string, source: string) =>
				prefix + quote + runtimeModule(source) + quote)
			: contents
		ts.sys.writeFile(file, output, byteOrderMark)
	})
	const diagnostics = [
		...ts.getPreEmitDiagnostics(program),
		...emitted.diagnostics,
	].filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
	if (!diagnostics.length) return

	throw new Error(name + ' declaration build failed\n' + ts.formatDiagnosticsWithColorAndContext(diagnostics, {
		getCanonicalFileName: file => file,
		getCurrentDirectory: () => root,
		getNewLine: () => '\n',
	}))
}

for (const name of selected) {
	if (!packages.includes(name as Package)) throw new Error(`Unknown public package: ${name}`)

	const directory = resolve(root, 'packages', name)
	const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')) as Manifest
	if (manifest.name !== name) throw new Error(`Package path/name mismatch: ${name} / ${manifest.name}`)

	const exports = Object.entries(manifest.exports)
	const entries = Object.fromEntries(exports.map(([subpath, entry]) => {
		if (!entry.types.startsWith('./src/')) {
			throw new Error(`${name} export ${subpath} has no source types entry`)
		}
		if (!entry.default.startsWith('./src/')) {
			throw new Error(`${name} export ${subpath} has no source default entry`)
		}
		// A *.client.* source keeps its marker in the compiled name: the marker
		// is what exempts client-safe modules from the server-only guard, and
		// the published dist face must satisfy the same contract as src.
		const base = subpath === '.' ? 'index' : subpath.slice(2)
		return [/\.client\.[jt]sx?$/.test(entry.default) ? `${base}.client` : base, resolve(directory, entry.default)]
	}))
	for (const [subpath, entry] of exports) {
		if (!entry.ajo) continue
		if (!entry.ajo.startsWith('./src/')) {
			throw new Error(`${name} export ${subpath} has no source ajo entry`)
		}
		const base = subpath === '.' ? 'index' : subpath.slice(2)
		entries[`${base}.ajo`] = resolve(directory, entry.ajo)
	}
	for (const [subpath, entry] of exports) {
		if (!entry.browser) continue
		if (!entry.browser.startsWith('./src/')) {
			throw new Error(`${name} export ${subpath} has no source browser entry`)
		}
		const base = subpath === '.' ? 'index' : subpath.slice(2)
		entries[`${base}.client`] = resolve(directory, entry.browser)
	}
	if (name === 'ajo-kit') entries['bin/kit'] = resolve(directory, 'bin/kit.ts')
	if (manifest.kit?.migrations) {
		const migrationDirectory = resolve(directory, manifest.kit.migrations)
		const migrations = (await readdir(migrationDirectory, { withFileTypes: true }))
			.filter(entry => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts'))
		if (!migrations.length) throw new Error(`${name} declares migrations but has none`)
		for (const migration of migrations) {
			entries[`migrations/${migration.name.slice(0, -3)}`] = resolve(migrationDirectory, migration.name)
		}
	}

	await build({
		root: directory,
		configFile: false,
		logLevel: 'warn',
		oxc: { jsx: { importSource: 'ajo' } },
		build: {
			copyPublicDir: false,
			emptyOutDir: true,
			lib: {
				entry: entries,
				fileName: (_format, entry) => `${entry}.js`,
				formats: ['es'],
			},
			minify: false,
			reportCompressedSize: false,
			rolldownOptions: {
				external,
				output: {
					banner: name === 'ajo-ui-playa' ? '// @unocss-include' : undefined,
					chunkFileNames: 'chunks/[name]-[hash].js',
				},
			},
			target: 'esnext',
		},
	})
	declarations(name, directory, [
		...exports.map(([, entry]) => resolve(directory, entry.types)),
		...(name === 'ajo-kit' ? [resolve(directory, 'src/runtime.d.ts')] : []),
	])
	await Promise.all(exports.map(([, entry]) =>
		access(resolve(directory, 'dist', declaration(entry.types)))))

	await Promise.all(Object.keys(entries).map(entry =>
		access(resolve(directory, 'dist', `${entry}.js`))))
}
