import { access, readFile, readdir } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

type Export = {
	types: string
}

type Manifest = {
	exports: Record<string, Export>
	kit?: { migrations?: string }
	name: string
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const packages = [
	'ajo-kit',
	'ajo-kit-auth',
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

for (const name of selected) {
	if (!packages.includes(name as Package)) throw new Error(`Unknown public package: ${name}`)

	const directory = resolve(root, 'packages', name)
	const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')) as Manifest
	if (manifest.name !== name) throw new Error(`Package path/name mismatch: ${name} / ${manifest.name}`)

	const entries = Object.fromEntries(Object.entries(manifest.exports).map(([subpath, entry]) => {
		if (!entry.types.startsWith('./src/')) {
			throw new Error(`${name} export ${subpath} has no source types entry`)
		}
		// A *.client.* source keeps its marker in the compiled name: the marker
		// is what exempts client-safe modules from the server-only guard, and
		// the published dist face must satisfy the same contract as src.
		const base = subpath === '.' ? 'index' : subpath.slice(2)
		return [/\.client\.[jt]sx?$/.test(entry.types) ? `${base}.client` : base, resolve(directory, entry.types)]
	}))
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

	await Promise.all(Object.keys(entries).map(entry =>
		access(resolve(directory, 'dist', `${entry}.js`))))
}
