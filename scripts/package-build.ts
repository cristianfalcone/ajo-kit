import { readFile, readdir } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { build } from 'vite'

type Manifest = {
	exports: Record<string, { ajo?: string; browser?: string; default: string; types: string }>
	imports?: Record<string, Record<string, string>>
	kit?: { migrations?: string }
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const compiler = ts.parseJsonConfigFileContent(
	ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile).config, ts.sys, root).options

const external = (id: string) =>
	id.startsWith('node:') ||
	id.startsWith('virtual:') ||
	(!id.startsWith('.') && !id.startsWith('\0') && !isAbsolute(id))

// Sources import relative modules without an extension; emitted declarations
// name the runtime file so NodeNext consumers resolve them.
const relativeModule = /((?:from|import)\s*(?:\(\s*)?)(['"])(\.\.?\/[^'"]+)\2/g

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
	const emitted = program.emit(undefined, (file, contents, byteOrderMark) =>
		ts.sys.writeFile(file, contents.replace(relativeModule, '$1$2$3.js$2'), byteOrderMark))
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

for (const name of process.argv.slice(2)) {
	const directory = resolve(root, 'packages', name)
	const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')) as Manifest
	const source = (path: string) => resolve(directory, path)

	// One pass per export, under the same `base` names .pnpmfile.cjs writes
	// into the packed manifest. A *.client.* source keeps its marker in the
	// compiled name, which exempts the published face from the server-only guard.
	const entries: Record<string, string> = {}
	for (const [subpath, entry] of Object.entries(manifest.exports)) {
		const base = subpath === '.' ? 'index' : subpath.slice(2)
		entries[/\.client\.[jt]sx?$/.test(entry.default) ? `${base}.client` : base] = source(entry.default)
		if (entry.ajo) entries[`${base}.ajo`] = source(entry.ajo)
		if (entry.browser) entries[`${base}.client`] = source(entry.browser)
	}
	// Private `#` imports stay external and resolve against the packed manifest,
	// so each conditional target ships under its source name.
	const imports = Object.values(manifest.imports ?? {})
	for (const conditions of imports) {
		for (const [condition, path] of Object.entries(conditions)) {
			if (condition !== 'types') entries[path.replace(/^\.\/src\//, '').replace(/\.[jt]sx?$/, '')] = source(path)
		}
	}
	if (name === 'ajo-kit') entries['bin/kit'] = source('bin/kit.ts')
	if (manifest.kit?.migrations) {
		const migrations = source(manifest.kit.migrations)
		for (const migration of await readdir(migrations)) {
			entries[`migrations/${migration.replace(/\.ts$/, '')}`] = resolve(migrations, migration)
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
		...Object.values(manifest.exports).map(entry => source(entry.types)),
		...imports.map(conditions => source(conditions.types)),
		...(name === 'ajo-kit' ? [source('src/runtime.d.ts')] : []),
	])
}
