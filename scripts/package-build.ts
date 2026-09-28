import { execFileSync } from 'node:child_process'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

type Manifest = {
	bin?: Record<string, string>
	exports?: Record<string, { ajo?: string; browser?: string; default: string; types: string }>
	imports?: Record<string, Record<string, string>>
	kit?: { migrations?: string }
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tsc = resolve(dirname(createRequire(import.meta.url).resolve('typescript/package.json')), 'bin/tsc')

const external = (id: string) =>
	id.startsWith('node:') ||
	id.startsWith('virtual:') ||
	(!id.startsWith('.') && !id.startsWith('\0') && !isAbsolute(id))

// Sources import relative modules without an extension; emitted declarations
// name the runtime file so NodeNext consumers resolve them.
const relativeModule = /((?:from|import)\s*(?:\(\s*)?)(['"])(\.\.?\/[^'"]+)\2/g

// Declarations come from the tsc CLI over the root options: TypeScript 7
// ships no JavaScript compiler API.
const declarations = async (directory: string, sources: string[]) => {
	const outDir = resolve(directory, 'dist')
	const project = resolve(directory, 'tsconfig.declarations.json')
	await writeFile(project, JSON.stringify({
		extends: resolve(root, 'tsconfig.json'),
		compilerOptions: { declaration: true, emitDeclarationOnly: true, noEmit: false, outDir, rootDir: resolve(directory, 'src') },
		files: sources,
		include: [],
	}))
	try {
		execFileSync(process.execPath, [tsc, '-p', project], { stdio: 'inherit' })
	} finally {
		await rm(project)
	}
	for (const file of await readdir(outDir, { recursive: true })) {
		if (!file.endsWith('.d.ts')) continue
		const path = resolve(outDir, file)
		await writeFile(path, (await readFile(path, 'utf8')).replace(relativeModule, '$1$2$3.js$2'))
	}
}

for (const name of process.argv.slice(2)) {
	const directory = resolve(root, 'packages', name)
	const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')) as Manifest
	const source = (path: string) => resolve(directory, path)

	// One pass per export, under the same `base` names .pnpmfile.cjs writes
	// into the packed manifest. A *.client.* source keeps its marker in the
	// compiled name, which exempts the published face from the server-only guard.
	const entries: Record<string, string> = {}
	for (const [subpath, entry] of Object.entries(manifest.exports ?? {})) {
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
	// Each bin compiles to the name .pnpmfile.cjs points the packed bin at.
	for (const path of Object.values(manifest.bin ?? {})) entries[path.replace(/^\.\/(?:src\/)?/, '').replace(/\.ts$/, '')] = source(path)
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
	// A package without exports, such as a bin-only one, has no declarations.
	const exports = Object.values(manifest.exports ?? {})
	if (exports.length) await declarations(directory, [
		...exports.map(entry => source(entry.types)),
		...imports.map(conditions => source(conditions.types)),
		...(name === 'ajo-kit' ? [source('src/runtime.d.ts')] : []),
	])
}
