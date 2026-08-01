const packages = new Set([
	'ajo-kit',
	'ajo-kit-auth',
	'ajo-kit-mail',
	'ajo-cloves',
	'ajo-ui',
	'ajo-ui-playa',
])

module.exports = {
	hooks: {
		beforePacking(manifest) {
			if (!packages.has(manifest.name)) return manifest

			manifest.exports = Object.fromEntries(Object.entries(manifest.exports).map(([subpath, entry]) => {
				// Client-safe *.client.* sources keep their marker in the compiled
				// name so the server-only guard exempts the published face too.
				const base = subpath === '.' ? 'index' : subpath.slice(2)
				const marked = /\.client\.[jt]sx?$/.test(entry.types || '') ? `${base}.client` : base
				const runtime = `./dist/${marked}.js`
				const types = entry.types.replace(/^\.\/src\//, './dist/').replace(/\.[jt]sx?$/, '.d.ts')
				return [subpath, { ...entry, types, import: runtime, default: runtime }]
			}))
			manifest.types = manifest.exports['.'].types
			if (manifest.name === 'ajo-kit') manifest.bin = { kit: './dist/bin/kit.js' }
			if (manifest.kit?.migrations) {
				manifest.kit = { ...manifest.kit, migrations: './dist/migrations/' }
			}
			return manifest
		},
	},
}
