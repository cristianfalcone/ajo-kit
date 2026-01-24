import { defineConfig, type Plugin } from 'vite'
import unocss from 'unocss/vite'

type Pattern = RegExp | string | ((id: string) => boolean)

const match = (id: string, pattern: Pattern) =>
	typeof pattern === 'function' ? pattern(id) :
		typeof pattern === 'string' ? id.includes(pattern) :
			pattern.test(id)

const matchAny = (id: string, patterns: Pattern[]) =>
	patterns.some(p => match(id, p))

/**
 * Prevents server-only modules from being imported into client code.
 * Tracks the import chain to catch transitive imports through barrel files.
 */
const serverOnly = (patterns: Pattern[]): Plugin => {

	const chain = new Map<string, string>()

	return {
		name: 'server-only',
		enforce: 'pre',
		resolveId: {
			order: 'pre',
			async handler(source, importer) {

				if (this.environment.name !== 'client') return

				if (!importer) return

				const resolved = await this.resolve(source, importer, { skipSelf: true })

				if (!resolved) return

				const id = resolved.id

				// Track who imported this module
				chain.set(id, importer)

				// Check if this module is server-only
				if (matchAny(id, patterns)) {

					// Build the import chain for error message
					const trace = [id]
					let current = importer

					while (current && trace.length < 10) {
						trace.unshift(current)
						current = chain.get(current)!
					}

					const path = trace.map(p => p.replace(/^.*\/src\//, 'src/')).join('\n  → ')

					throw new Error(
						`Server-only module imported into client code:\n\n  ${path}\n\n` +
						`Module "${id.replace(/^.*\/src\//, 'src/')}" cannot be imported by client code.`
					)
				}
			}
		}
	}
}

const hmr = (pattern: RegExp): Plugin => ({
	name: 'ajo-hmr',
	apply: 'serve',
	transform(code, id) {

		if (!pattern.test(id)) return null

		const HMR = `Symbol.for('ajo.hmr')`
		const path = '/' + id.replace(/^.*?(src\/)/, '$1')

		const tagged = code.match(/export\s+default\s+(\w+)\s*[\n;]/)
			? code.replace(/export\s+default\s+(\w+)/, `export default $1;$1[${HMR}]=${JSON.stringify(path)}`)
			: code

		const accept = `
if(import.meta.hot)import.meta.hot.accept(m=>{
  if(m?.default)m.default[${HMR}]=${JSON.stringify(path)};
  if(m)(globalThis.__MODULES__??=new Map).set(${JSON.stringify(path)},m),globalThis.__HMR__?.(${JSON.stringify(path)});
})`

		return { code: tagged + accept, map: null }
	}
})

export default defineConfig({
	plugins: [
		serverOnly([
			// Files
			/(handler|wares)\.[jt]sx?$/,
			// Directories
			/\/src\/data\//,
			/\/src\/auth\//,
		]),
		hmr(/(page|layout)\.[jt]sx?$/),
		unocss(),
	],
	esbuild: {
		jsxFactory: 'h',
		jsxFragment: 'Fragment',
		jsxInject: `import { h, Fragment } from 'ajo'`,
	}
})
