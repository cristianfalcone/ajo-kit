import { normalizePath, parseAst, parseSync, type Plugin } from 'vite'
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

/** One import edge inspected in an emitted engine module. */
export interface ImportRecord {
	importer: string
	kind: 'dynamic' | 'static'
	literal: boolean
	specifier?: string
}

/** A closed-graph violation found in an emitted engine module. */
export interface GraphIssue extends ImportRecord {
	type: 'bare' | 'css' | 'dynamic' | 'node' | 'typescript'
	message: string
}

/** Input used to construct ajoc's exact schema-1 descriptor. */
export interface DescriptorInput {
	modules: readonly string[]
	migrations: readonly { name: string; module: string }[]
	data: boolean
	net: boolean
}

/** The strict descriptor consumed by ajoc --input. */
export interface Descriptor {
	schema: 1
	entry: 'server/entry.js'
	modules: string[]
	client: 'client'
	migrations: { name: string; module: string }[]
	env: {
		required: ['NODE_ENV', 'APP_URL']
		optional: ['APP_SECRET', 'DATABASE_PATH', 'TRUST_PROXY', 'AJO_TIMING', 'HOST', 'PORT']
	}
	data: { required: boolean }
	capabilities: string[]
}

/** Build-time migration source passed to the generated engine entry. */
export interface EngineMigration {
	name: string
	file: string
}

/** Information captured while emitting the engine server graph. */
export interface EngineBuild {
	auth: boolean
	database: boolean
	files: string[]
	findings: GraphIssue[]
	migrations: { name: string; module: string }[]
	net: boolean
}

const clean = (id: string) => normalizePath(id.split('?')[0])

const message = (type: GraphIssue['type'], specifier: string | undefined, importer: string) => {
	const module = specifier ?? '<nonliteral>'
	const reasons: Record<GraphIssue['type'], string> = {
		bare: 'surviving import is neither relative nor runtime:*',
		css: 'CSS import survived the server build',
		dynamic: 'dynamic import must use a string literal',
		node: 'Node builtin is unavailable on the ajo runtime',
		typescript: 'TypeScript source import survived the server build',
	}
	return `${reasons[type]}: "${module}" imported by "${importer}"`
}

/** Classifies import records that violate the engine's closed ESM graph. */
export function graph(records: readonly ImportRecord[]): GraphIssue[] {
	const issues: GraphIssue[] = []

	for (const record of records) {
		let type: GraphIssue['type'] | undefined
		const specifier = record.specifier
		const path = specifier?.split(/[?#]/, 1)[0] ?? ''

		if (record.kind === 'dynamic' && !record.literal) type = 'dynamic'
		else if (specifier?.startsWith('node:')) type = 'node'
		else if (/\.(?:css|less|sass|scss|styl|stylus)$/i.test(path)) type = 'css'
		else if (/\.tsx?$/i.test(path)) type = 'typescript'
		else if (specifier && !specifier.startsWith('runtime:') && !specifier.startsWith('./') && !specifier.startsWith('../')) type = 'bare'

		if (type) issues.push({ ...record, type, message: message(type, specifier, record.importer) })
	}

	return issues
}

/** Creates ajoc's exact schema-1 descriptor from one emitted staging graph. */
export function descriptor(input: DescriptorInput): Descriptor {
	const modules = [...new Set(input.modules)].sort()
	const entry = 'server/entry.js' as const
	if (!modules.includes(entry)) throw new Error(`Engine descriptor is missing ${entry}`)

	const migrations = [...input.migrations].sort((left, right) => left.name.localeCompare(right.name))
	if (new Set(migrations.map(migration => migration.name)).size !== migrations.length) {
		throw new Error('Engine descriptor has duplicate migration names')
	}
	for (const migration of migrations) {
		if (!modules.includes(migration.module)) {
			throw new Error(`Engine migration ${migration.name} names missing module ${migration.module}`)
		}
	}

	return {
		schema: 1,
		entry,
		modules: [entry, ...modules.filter(module => module !== entry)],
		client: 'client',
		migrations,
		env: {
			required: ['NODE_ENV', 'APP_URL'],
			optional: ['APP_SECRET', 'DATABASE_PATH', 'TRUST_PROXY', 'AJO_TIMING', 'HOST', 'PORT'],
		},
		data: { required: input.data },
		capabilities: input.net ? ['runtime:net'] : [],
	}
}

const records = (ast: unknown, importer: string): ImportRecord[] => {
	const found: ImportRecord[] = []
	const visit = (value: unknown): void => {
		if (!value || typeof value !== 'object') return
		if (Array.isArray(value)) {
			for (const item of value) visit(item)
			return
		}

		const node = value as Record<string, any>
		if ((node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') &&
			node.source && node.importKind !== 'type' && node.exportKind !== 'type') {
			found.push({ importer, kind: 'static', literal: true, specifier: node.source.value })
		} else if (node.type === 'ImportExpression') {
			const literal = (node.source?.type === 'Literal' || node.source?.type === 'StringLiteral') && typeof node.source.value === 'string'
			found.push({ importer, kind: 'dynamic', literal, ...(literal && { specifier: node.source.value }) })
		}

		for (const [key, child] of Object.entries(node)) {
			if (key !== 'parent' && key !== 'source') visit(child)
		}
	}

	visit(ast)
	return found
}

const imports = (code: string, importer: string) => records(parseAst(code), importer)

const auth = '__AJO_ENGINE_AUTH__'
const database = '__AJO_ENGINE_DATABASE__'

/** Creates the generated engine entry and audits its emitted module graph. */
export function engine(options: {
	template: string
	migrations: readonly EngineMigration[]
	database: boolean
	check?: boolean
}): { plugin: Plugin; result: EngineBuild; code: string } {
	const result: EngineBuild = { auth: false, database: options.database, files: [], findings: [], migrations: [], net: false }
	const migrations = options.migrations.map(migration => ({ ...migration, file: clean(migration.file) }))
	const migration = new Map(migrations.map((item, index) => [item.file, `migration-${String(index + 1).padStart(4, '0')}`]))

	// The generated entry is written to a real staging file: Rolldown resolves
	// entry modules natively, so a virtual entry id never reaches plugin hooks.
	const code = [
		"import { start } from 'ajo-kit/engine'",
		"import { routes } from 'virtual:ajo/routes'",
		"import { handlers, wares } from 'virtual:ajo/handlers'",
		...migrations.map((item, index) => `import * as migration${index} from ${JSON.stringify(item.file)}`),
		`const options = JSON.parse('{"auth":${auth},"database":${database}}')`,
		`await start({ template: ${JSON.stringify(options.template)}, registries: { routes, handlers, wares }, migrations: [${
			migrations.map((item, index) => `{ name: ${JSON.stringify(item.name)}, migration: migration${index} }`).join(',')
		}], options })`,
	].join('\n')

	const plugin: Plugin = {
		name: 'ajo-engine',
		apply: 'build',
		config() {
			return {
				resolve: { conditions: ['ajo'] },
				ssr: { external: [], noExternal: true, resolve: { conditions: ['ajo'] } },
				build: {
					manifest: false,
					minify: false,
					ssrManifest: false,
					target: 'esnext',
					rolldownOptions: {
						external: id => id.startsWith('runtime:'),
						output: {
							entryFileNames: 'entry.js',
							chunkFileNames: chunk => chunk.name.startsWith('migration-')
								? 'migrations/[name]-[hash].js'
								: 'chunks/[name]-[hash].js',
							manualChunks: id => migration.get(clean(id)),
						},
					},
				},
			}
		},
		transform(code, id) {
			const file = clean(id)
			if (!/\.[cm]?[jt]sx?$/.test(file)) return
			const parsed = parseSync(file, code)
			const imports = records(parsed.program, file)
			if (!/\/ajo-kit\/(?:src|dist)\/engine\.[cm]?[jt]s$/.test(file) && imports.some(record =>
				record.specifier === 'ajo-kit/database' || record.specifier === '@kit/database')) {
				result.database = true
			}
			// Graph validation reads the EMITTED chunks in generateBundle — the
			// ajoc-eye view. Source records here would flag imports the build
			// resolves away (virtual:uno.css in SSR, treeshaken provider code).
		},
		generateBundle(_, bundle) {
			const chunks = Object.values(bundle).filter(output => output.type === 'chunk')
			const ids = chunks.flatMap(chunk => chunk.moduleIds.map(clean))
			result.auth = ids.some(id => /\/ajo-kit-auth\//.test(id))
			result.net = ids.some(id => /\/ajo-kit-mail\/(?:src|dist)\/http\.[cm]?[jt]s$/.test(id))

			let authPatched = false
			let databasePatched = false
			for (const chunk of chunks) {
				if (chunk.code.includes(auth)) authPatched = true
				if (chunk.code.includes(database)) databasePatched = true
				if (chunk.code.includes(auth) || chunk.code.includes(database)) {
					chunk.code = chunk.code
						.replaceAll(auth, result.auth ? 'true' : 'false')
						.replaceAll(database, result.database ? 'true' : 'false')
				}
			}
			if (!authPatched || !databasePatched) this.error('Generated engine entry lost its graph declaration markers')

			result.files = chunks.map(chunk => `server/${normalizePath(chunk.fileName)}`).sort()
			result.migrations = migrations.map(item => {
				const chunk = chunks.find(output => output.moduleIds.some(id => clean(id) === item.file))
				if (!chunk || !chunk.fileName.startsWith('migrations/')) {
					this.error(`Engine migration ${item.name} was not emitted as a migration chunk`)
				}
				return { name: item.name, module: `server/${normalizePath(chunk.fileName)}` }
			})

			const records = chunks.flatMap(chunk => imports(chunk.code, `server/${normalizePath(chunk.fileName)}`))
			for (const output of Object.values(bundle)) {
				if (output.type !== 'asset') continue
				if (!/\.css$/i.test(output.fileName)) this.error(`Engine server emitted unsupported asset "${output.fileName}"`)
				records.push({ importer: 'server build', kind: 'static', literal: true, specifier: output.fileName })
			}
			const findings = graph(records)
			result.findings = [...new Map(findings.map(issue => [
				`${issue.type}\0${issue.importer}\0${issue.specifier ?? ''}`,
				issue,
			])).values()]

			const fatal = result.findings.filter(issue => issue.type !== 'node' || options.check)
			for (const issue of result.findings.filter(issue => issue.type === 'node' && !options.check)) {
				this.warn(`[ajo] ${issue.message} (temporary warning until engine auth/mail ports land; use --check to fail)`)
			}
			if (fatal.length) this.error(`Engine graph validation failed:\n${fatal.map(issue => `  - ${issue.message}`).join('\n')}`)
		},
	}

	return { plugin, result, code }
}

/** Default file locations used by the kit CLI. */
export const defaults = {
	database: './database.sqlite',
	migrations: 'db/migrations',
	seeds: 'db/seeds',
} as const

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
				// Both faces of the client entry: `src/client.tsx` is what the
				// workspace resolves, `dist/client.js` is what the published
				// package exports. Matching only the source file shipped every
				// real consumer an unstyled production build — found live on
				// 2026-07-28: `virtual:uno.css` was never imported, so no
				// stylesheet asset existed at all.
				if (css.length && id.includes('ajo-kit') && /client\.(tsx|js)$/.test(id)) {
					return css.map(c => `import '${c}'`).join('\n') + '\n' + code
				}
			},
			config() {
				const aliases = found
					.filter(p => p.alias)
					.map(p => ({ find: new RegExp(`^@kit/${p.alias}(/|$)`), replacement: `${p.name}$1` }))

				return {
					ssr: { noExternal: [/^ajo-/] },
					resolve: {
						alias: [
							...aliases,
							{ find: /^@kit(\/|$)/, replacement: 'ajo-kit$1' },
							{ find: '/src/client', replacement: 'ajo-kit/client' },
						]
					}
				}
			}
		},
		guard([...guards(found), ...(options?.guard ?? [])]),
		hmr(/(page|layout)\.[jt]sx?$/),
	]
}

/** Vite esbuild JSX settings for Ajo components. */
export const jsx = {
	jsx: 'automatic',
	jsxImportSource: 'ajo',
} as const
