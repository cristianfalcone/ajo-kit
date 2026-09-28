module.exports = {
	hooks: {
		beforePacking(manifest) {
			// The public packages are the manifests that are not private.
			if (manifest.private) return manifest

			if (manifest.exports) manifest.exports = Object.fromEntries(Object.entries(manifest.exports).map(([subpath, entry]) => {
				// The same `base` names scripts/package-build.ts compiles; client-safe
				// *.client.* sources keep their marker so the server-only guard
				// exempts the published face too.
				const base = subpath === '.' ? 'index' : subpath.slice(2)
				const marked = /\.client\.[jt]sx?$/.test(entry.types || '') ? `${base}.client` : base
				const runtime = `./dist/${marked}.js`
				const types = entry.types.replace(/^\.\/src\//, './dist/').replace(/\.[jt]sx?$/, '.d.ts')
				const packed = { ...entry, types, import: runtime, default: runtime }
				// Host-conditioned subpaths ship their ajo/browser builds too (the
				// spread keeps both conditions ahead of default in resolution order).
				if (entry.ajo) packed.ajo = `./dist/${marked}.ajo.js`
				if (entry.browser) packed.browser = `./dist/${marked}.client.js`
				return [subpath, packed]
			}))
			// Private `#` imports point at the compiled face of each condition.
			if (manifest.imports) manifest.imports = Object.fromEntries(Object.entries(manifest.imports).map(([name, conditions]) => [
				name,
				Object.fromEntries(Object.entries(conditions).map(([condition, source]) => [
					condition,
					source.replace(/^\.\/src\//, './dist/').replace(/\.[jt]sx?$/, condition === 'types' ? '.d.ts' : '.js'),
				])),
			]))
			if (manifest.exports?.['.']) manifest.types = manifest.exports['.'].types
			// The same names scripts/package-build.ts compiles each bin to.
			if (manifest.bin) manifest.bin = Object.fromEntries(Object.entries(manifest.bin).map(([command, path]) => [
				command,
				path.replace(/^\.\/(?:src\/)?/, './dist/').replace(/\.ts$/, '.js'),
			]))
			if (manifest.kit?.migrations) {
				manifest.kit = { ...manifest.kit, migrations: './dist/migrations/' }
			}
			return manifest
		},
	},
}
