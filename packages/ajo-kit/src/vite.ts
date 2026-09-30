import type { Plugin } from 'vite'
import { discover } from './discover'

type Pattern = RegExp | string | ((id: string) => boolean)

const match = (id: string, pattern: Pattern) =>
	typeof pattern === 'function' ? pattern(id) :
		typeof pattern === 'string' ? id.includes(pattern) :
			pattern.test(id)

const any = (id: string, patterns: Pattern[]) =>
	patterns.some(p => match(id, p))

/**
 * Prevents server-only modules from being imported into client code.
 * Tracks the import chain to catch transitive imports through barrel files.
 */
const guard = (patterns: Pattern[]): Plugin => {

	const chain = new Map<string, string>()

	return {
		name: 'ajo-server-only',
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

				// *.client.* modules are explicitly client-safe; their own imports are still checked
				if (/\.client\.[jt]sx?$/.test(id)) return

				// Check if this module is server-only
				if (any(id, patterns)) {

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

/** Options for the ajo-kit Vite plugin. */
export interface Options {
	guard?: Pattern[]
	css?: string[]
}

const guards = (found: ReturnType<typeof discover>): Pattern[] => [
	/(handler|wares)\.[jt]sx?$/,
	...found.filter(p => p.serverOnly).map(p => new RegExp(`${p.name}/`)),
]

/** Returns the Vite plugins required by an ajo-kit app. */
export function kit(options?: Options): Plugin[] {

	const css = options?.css ?? []
	const found = discover()

	return [
		{
			name: 'ajo-kit',
			resolveId(id) {
				if (id === 'virtual:ajo/routes') return '\0virtual:ajo/routes'
				if (id === 'virtual:ajo/handlers') return '\0virtual:ajo/handlers'
			},
			load(id) {
				if (id === '\0virtual:ajo/routes') {
					return "export const routes = import.meta.glob('/src/**/{layout,page}.{j,t}s{,x}')"
				}
				if (id === '\0virtual:ajo/handlers') {
					return [
						"export const handlers = import.meta.glob('/src/**/handler.{j,t}s{,x}')",
						"export const wares = import.meta.glob('/src/**/wares.{j,t}s{,x}')",
					].join('\n')
				}
			},
			transform(code, id) {
				// The kit client entry: src/client.tsx in the workspace, dist/client.js from npm (with Vite's ?v= in dev).
				if (css.length && /\/ajo-kit\/(?:src\/client\.tsx|dist\/client\.js)$/.test(id.split('?', 1)[0])) {
					return css.map(c => `import '${c}'`).join('\n') + '\n' + code
				}
			},
			config() {
				return {
					// The client entry owns a virtual route graph; keep it in Vite's plugin pipeline.
					// Its route modules are scanned from the start instead, so the first visit to a
					// page does not find new dependencies and reload the tab mid-interaction.
					optimizeDeps: {
						exclude: ['ajo-kit/client'],
						entries: ['index.html', 'src/**/{layout,page}.{js,jsx,ts,tsx}'],
					},
					ssr: { noExternal: [/^ajo-/] },
					resolve: { alias: [{ find: '/src/client', replacement: 'ajo-kit/client' }] },
				}
			}
		},
		guard([...guards(found), ...(options?.guard ?? [])]),
		hmr(/(page|layout)\.[jt]sx?$/),
	]
}
