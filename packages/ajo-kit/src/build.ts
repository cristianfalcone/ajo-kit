import { readFile } from 'node:fs/promises'
import { join, posix } from 'node:path'
import { normalizePath, parseAst, parseSync, type Plugin } from 'vite'
import { discover } from './discover'

/** One import edge inspected in an emitted engine module. */
interface ImportRecord {
	importer: string
	kind: 'dynamic' | 'static'
	literal: boolean
	specifier?: string
}

/** A closed-graph violation found in an emitted engine module. */
interface GraphIssue extends ImportRecord {
	type: 'bare' | 'css' | 'dynamic' | 'node' | 'typescript'
	message: string
}

/** Engine authority declared by `package.json#kit.engine` blocks. */
interface Authority {
	env: { required: string[]; optional: string[] }
	fs: { roots: string[] }
	ipc: { pipes: string[] }
	net: boolean
}

/** The strict descriptor consumed by ajo-engine-compiler --input. */
interface Descriptor {
	schema: 1
	entry: 'server/entry.js'
	modules: string[]
	client: 'client'
	env: { required: string[] }
	data: { required: boolean }
	fs: { roots: string[] }
	ipc: { pipes: string[] }
	capabilities: string[]
}

const base = {
	required: ['NODE_ENV', 'APP_URL'],
	optional: ['DATABASE_PATH', 'TRUST_PROXY', 'AJO_TIMING', 'HOST', 'PORT'],
} as const

const object = (value: unknown, name: string, allowed: readonly string[]): Record<string, unknown> => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object`)
	for (const key of Object.keys(value)) {
		if (!allowed.includes(key)) throw new Error(`${name} has unknown key "${key}"`)
	}
	return value as Record<string, unknown>
}

const strings = (value: unknown, name: string, seen = new Set<string>()): string[] => {
	if (!Array.isArray(value)) throw new Error(`${name} must be an array`)
	return value.map((item, index) => {
		if (typeof item !== 'string' || !item.length) throw new Error(`${name}[${index}] must be a non-empty string`)
		if (seen.has(item)) throw new Error(`${name}[${index}] duplicates "${item}"`)
		seen.add(item)
		return item
	})
}

const paths = (value: unknown, name: string) => strings(value, name).map((path, index) => {
	if (!path.startsWith('/') || path.includes('\\') || posix.normalize(path) !== path || (path !== '/' && path.endsWith('/'))) {
		throw new Error(`${name}[${index}] must be an absolute normalized POSIX path: "${path}"`)
	}
	return path
})

/** Validates one `kit.engine` contribution; `name` locates it, owning package included, in every error. */
function parseEngine(value: unknown, name = 'package.json#kit.engine'): Authority {
	const engine = value === undefined ? {} : object(value, name, ['env', 'fs', 'ipc', 'net'])
	const env = engine.env === undefined ? {} : object(engine.env, `${name}.env`, ['required', 'optional'])
	const seen = new Set<string>([...base.required, ...base.optional])
	const variables = (kind: 'required' | 'optional') => env[kind] === undefined ? [] :
		strings(env[kind], `${name}.env.${kind}`, seen).map((variable, index) => {
			if (!/^[A-Z_][A-Z0-9_]*$/.test(variable)) {
				throw new Error(`${name}.env.${kind}[${index}] has invalid environment name "${variable}"`)
			}
			return variable
		})
	if (engine.net !== undefined && typeof engine.net !== 'boolean') throw new Error(`${name}.net must be a boolean`)

	return {
		env: { required: variables('required'), optional: variables('optional') },
		fs: { roots: engine.fs === undefined ? [] : paths(object(engine.fs, `${name}.fs`, ['roots']).roots, `${name}.fs.roots`) },
		ipc: { pipes: engine.ipc === undefined ? [] : paths(object(engine.ipc, `${name}.ipc`, ['pipes']).pipes, `${name}.ipc.pipes`) },
		net: engine.net === true,
	}
}

/** Merges the App's engine authority with that of its declared plugins; required wins over optional. */
export async function appEngine(root: string): Promise<Authority> {
	const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
	const contributions = [parseEngine(manifest?.kit?.engine)]
	for (const plugin of discover(root)) {
		if (plugin.engine !== undefined) contributions.push(parseEngine(plugin.engine, `${plugin.name}: package.json#kit.engine`))
	}

	const all = (pick: (item: Authority) => string[]) => [...new Set(contributions.flatMap(pick))]
	const required = all(item => item.env.required)
	return {
		env: { required, optional: all(item => item.env.optional).filter(variable => !required.includes(variable)) },
		fs: { roots: all(item => item.fs.roots) },
		ipc: { pipes: all(item => item.ipc.pipes) },
		net: contributions.some(item => item.net),
	}
}

/**
 * Assembles the compiler's exact schema-1 descriptor from validated authority and one emitted graph.
 * Optional variables stay a build input: the engine reads any variable, so only required ones are declared.
 */
export function descriptor(input: Authority & { modules: readonly string[]; data: boolean }): Descriptor {
	const entry = 'server/entry.js'
	return {
		schema: 1,
		entry,
		modules: [entry, ...input.modules.filter(module => module !== entry).toSorted()],
		client: 'client',
		env: { required: [...base.required, ...input.env.required.toSorted()] },
		data: { required: input.data },
		fs: { roots: input.fs.roots.toSorted() },
		ipc: { pipes: input.ipc.pipes.toSorted() },
		capabilities: input.net ? ['runtime:net'] : [],
	}
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

const named = (program: any, name: string) => program.body.some((node: any) => {
	if (node.type !== 'ExportNamedDeclaration' || node.exportKind === 'type') return false

	const declaration = node.declaration
	if (declaration?.id?.name === name) return true
	if (declaration?.declarations?.some((item: any) => item.id?.name === name)) return true

	return node.specifiers?.some((item: any) =>
		item.exportKind !== 'type' && (item.exported?.name === name || item.exported?.value === name))
})

const marker = '__AJO_ENGINE_DATABASE__'

/** Creates the generated engine entry and audits its emitted module graph. */
export function engine(options: {
	template: string
	migrations: readonly { name: string; file: string }[]
	database: boolean
	/** Passes runtime:fs readText only for Apps declaring the origin manifest's environment and filesystem root. */
	origins?: boolean
}) {
	const result = { database: options.database, files: [] as string[] }
	const migrations = options.migrations.map(migration => ({ ...migration, file: clean(migration.file) }))
	const migration = new Map(migrations.map((item, index) => [item.file, `migration-${String(index + 1).padStart(4, '0')}`]))

	// The generated entry is written to a real staging file: Rolldown resolves
	// entry modules natively, so a virtual entry id never reaches plugin hooks.
	const code = [
		...(options.origins ? ["import { readText } from 'runtime:fs'"] : []),
		"import { start } from 'ajo-kit/engine'",
		...migrations.map((item, index) => `import * as migration${index} from ${JSON.stringify(item.file)}`),
		`const options = JSON.parse('{"database":${marker}}')`,
		`await start({ template: ${JSON.stringify(options.template)}, migrations: [${
			migrations.map((item, index) => `{ name: ${JSON.stringify(item.name)}, migration: migration${index} }`).join(',')
		}], options${options.origins ? ', origins: readText' : ''} })`,
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
			if (/\/src\/wares\.[jt]sx?$/.test(file) && named(parseSync(file, code).program, 'bootstrap')) result.database = true
		},
		generateBundle(_, bundle) {
			// Any static or dynamic importer of the database face besides the kit's own engine entry uses the database.
			for (const id of this.getModuleIds()) {
				if (!/\/ajo-kit\/(?:src|dist)\/database\.ajo\.[cm]?[jt]s$/.test(clean(id))) continue
				const info = this.getModuleInfo(id)!
				if ([...info.importers, ...info.dynamicImporters].some(importer => !/\/ajo-kit\/(?:src|dist)\/engine\.[cm]?[jt]s$/.test(clean(importer)))) {
					result.database = true
				}
			}

			// UnoCSS emits a placeholder chunk for virtual:uno.css and deletes it
			// from the bundle AFTER this hook runs, so it never reaches staging.
			const chunks = Object.values(bundle)
				.filter(output => output.type === 'chunk')
				.filter(chunk => !(chunk.moduleIds.length && chunk.moduleIds.every(id => id.includes('uno.css'))))
			for (const chunk of chunks) chunk.code = chunk.code.replaceAll(marker, String(result.database))

			result.files = chunks.map(chunk => `server/${normalizePath(chunk.fileName)}`)

			const found = chunks.flatMap(chunk => records(parseAst(chunk.code), `server/${normalizePath(chunk.fileName)}`))
			for (const output of Object.values(bundle)) {
				if (output.type !== 'asset') continue
				if (!/\.css$/i.test(output.fileName)) this.error(`Engine server emitted unsupported asset "${output.fileName}"`)
				found.push({ importer: 'server build', kind: 'static', literal: true, specifier: output.fileName })
			}
			const issues = new Set(graph(found).map(issue => issue.message))
			if (issues.size) this.error(`Engine graph validation failed:\n${[...issues].map(issue => `  - ${issue}`).join('\n')}`)
		},
	}

	return { plugin, result, code }
}
