const packages = new Set([
	'ajo-kit',
	'ajo-kit-auth',
	'ajo-cloves',
	'ajo-ui',
	'ajo-ui-playa',
])

module.exports = {
	hooks: {
		beforePacking(manifest) {
			if (!packages.has(manifest.name)) return manifest

			manifest.exports = Object.fromEntries(Object.entries(manifest.exports).map(([subpath, entry]) => {
				const runtime = subpath === '.' ? './dist/index.js' : `./dist/${subpath.slice(2)}.js`
				return [subpath, { ...entry, import: runtime, default: runtime }]
			}))
			if (manifest.name === 'ajo-kit') manifest.bin = { kit: './dist/bin/kit.js' }
			if (manifest.kit?.migrations) {
				manifest.kit = { ...manifest.kit, migrations: './dist/migrations/' }
			}
			return manifest
		},
	},
}
