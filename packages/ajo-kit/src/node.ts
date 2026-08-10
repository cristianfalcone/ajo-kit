// Node is a dev/build/test host only; production executes on the ajo engine.
import fs from 'node:fs/promises'
import { join } from 'node:path'
import * as http from 'node:http'
import * as vite from 'vite'
import { attach, reader, request, type Handler } from './http'
import { compile } from './template'
import { descriptor, engine, type Descriptor, type DescriptorInput, type GraphIssue } from './vite'
import { migrationModules } from './migrate'

export { compile } from './template'

const fallback = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- ssr:head -->
</head>
<body>
  <!-- ssr:data -->
  <div id="root"><!-- ssr:root --></div>
  <script src="/src/client" type="module"></script>
</body>
</html>`

async function html() {
	try { return await fs.readFile('./index.html', 'utf-8') }
	catch { return fallback }
}

const adapt = (req: http.IncomingMessage) => request({
	method: req.method ?? 'GET',
	target: (req as http.IncomingMessage & { originalUrl?: string }).originalUrl ?? req.url ?? '/',
	headers: req.headers,
	remoteAddress: req.socket.remoteAddress,
	read: reader(req),
})

/** Adapts a host-neutral ajo-kit handler to the Node dev/test HTTP transport. */
export const handler = (app: Handler): http.RequestListener => (req, res) => {
	void app(adapt(req)).then(reply => {
		res.statusCode = reply.statusCode
		for (const [key, value] of reply.headers) res.setHeader(key, value)

		if (reply.stream) {
			res.flushHeaders()
			let finish!: () => void
			const closed = new Promise<void>(resolve => finish = resolve)
			res.once('close', finish)
			res.once('finish', finish)
			attach(reply, {
				send: text => { if (!res.writableEnded) res.write(text) },
				close: () => { if (!res.writableEnded) res.end() },
				closed,
			})
			return
		}

		res.end(reply.body)
	}, error => {
		console.error(error)
		if (!res.headersSent) {
			res.statusCode = 500
			res.end('Internal Server Error')
		} else res.destroy()
	})
}

/** Development server options accepted by dev(). */
export type Options = {
	hmr?: vite.ServerOptions['hmr']
}

/** Creates the development Polka app with Vite middleware and route reloads. */
export async function dev(options: Options = {}) {

	const { default: polka } = await import('polka')
	const app = polka()

	const server = await vite.createServer({
		server: { middlewareMode: true, ...(options.hmr !== undefined && { hmr: options.hmr }) },
		appType: 'custom',
	})

	app.use(server.middlewares)

	let raw = await html()
	raw = await server.transformIndexHtml('/', raw)
	const template = compile(raw)

	const { create } = await server.ssrLoadModule('ajo-kit/server')
	let inner = handler(await create(template))

	app.use((req, res) => inner(req, res))

	const route = /(handler|wares|page|layout)\.[jt]sx?$/
	const reload = async (file: string) => {
		if (!route.test(file)) return
		try {
			const { create } = await server.ssrLoadModule('ajo-kit/server')
			inner = handler(await create(template))
			console.log('\x1b[32m✓\x1b[0m Server routes reloaded')
			if (/(page|layout)\.[jt]sx?$/.test(file)) server.ws.send({ type: 'full-reload', path: '*' })
		} catch (error) {
			console.error('\x1b[31m✗\x1b[0m Failed to reload routes:')
			console.error(error)
		}
	}

	server.watcher.on('change', reload)
	server.watcher.on('add', reload)
	server.watcher.on('unlink', reload)

	return app
}

/** Options accepted by the engine artifact build. */
export interface BuildOptions {
	check?: boolean
}

/** Engine staging information returned by a build. */
export interface EngineOutput {
	descriptor: Descriptor
	findings: GraphIssue[]
	staging: string
}

/**
 * The `package.json#kit.engine` authority block. Everything is optional and
 * defaults to empty authority; the engine build validates fail-closed
 * (duplicates, invalid env names, non-absolute or non-normalized POSIX
 * paths all fail the build naming the offender) and seals the result into
 * the artifact descriptor — env names append after the kit's base lists,
 * roots/pipes become the runtime:fs / runtime:ipc authority.
 */
export type AppEngineConfig = {
	env?: { required?: string[]; optional?: string[] }
	fs?: { roots: string[] }
	ipc?: { pipes: string[] }
}

const object = (value: unknown, name: string): Record<string, unknown> => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${name} must be an object`)
	}
	return value as Record<string, unknown>
}

const keys = (value: Record<string, unknown>, allowed: readonly string[], name: string) => {
	for (const key of Object.keys(value)) {
		if (!allowed.includes(key)) throw new Error(`${name} has unknown key "${key}"`)
	}
}

const list = (value: unknown, name: string): string[] => {
	if (!Array.isArray(value)) throw new Error(`${name} must be an array`)
	return value.map((item, index) => {
		if (typeof item !== 'string' || !item.length) {
			throw new Error(`${name}[${index}] must be a non-empty string`)
		}
		return item
	})
}

const parseEngine = (value: unknown): AppEngineConfig => {
	if (value === undefined) return {}

	const engine = object(value, 'package.json#kit.engine')
	keys(engine, ['env', 'fs', 'ipc'], 'package.json#kit.engine')
	const config: AppEngineConfig = {}

	if ('env' in engine) {
		const env = object(engine.env, 'package.json#kit.engine.env')
		keys(env, ['required', 'optional'], 'package.json#kit.engine.env')
		config.env = {
			...('required' in env && { required: list(env.required, 'package.json#kit.engine.env.required') }),
			...('optional' in env && { optional: list(env.optional, 'package.json#kit.engine.env.optional') }),
		}
	}

	if ('fs' in engine) {
		const fs = object(engine.fs, 'package.json#kit.engine.fs')
		keys(fs, ['roots'], 'package.json#kit.engine.fs')
		config.fs = { roots: list(fs.roots, 'package.json#kit.engine.fs.roots') }
	}

	if ('ipc' in engine) {
		const ipc = object(engine.ipc, 'package.json#kit.engine.ipc')
		keys(ipc, ['pipes'], 'package.json#kit.engine.ipc')
		config.ipc = { pipes: list(ipc.pipes, 'package.json#kit.engine.ipc.pipes') }
	}

	return config
}

const appEngine = async (root: string): Promise<AppEngineConfig> => {
	const manifest = JSON.parse(await fs.readFile(join(root, 'package.json'), 'utf8')) as unknown
	const kit = manifest && typeof manifest === 'object' && !Array.isArray(manifest)
		? (manifest as Record<string, unknown>).kit
		: undefined
	const engine = kit && typeof kit === 'object' && !Array.isArray(kit)
		? (kit as Record<string, unknown>).engine
		: undefined
	return parseEngine(engine)
}

const modules = async (root: string, directory = 'server'): Promise<string[]> => {
	const path = join(root, directory)
	const entries = await fs.readdir(path, { withFileTypes: true })
	const files = await Promise.all(entries.map(entry => {
		const relative = `${directory}/${entry.name}`
		return entry.isDirectory() ? modules(root, relative) : Promise.resolve(entry.name.endsWith('.js') ? [relative] : [])
	}))
	return files.flat().sort()
}

const assertIntl = async (root: string, files: string[]) => {
	const allowed = new Set(['DateTimeFormat', 'RelativeTimeFormat'])
	const violations: string[] = []
	const sources = await Promise.all(files.map(async file => ({
		file,
		source: await fs.readFile(join(root, file), 'utf8'),
	})))

	for (const { file, source } of sources) {
		if (source.includes('navigator.language')) violations.push(`${file}: navigator.language`)
		for (const match of source.matchAll(/\bIntl\.([A-Za-z_$][\w$]*)\b/g)) {
			if (!allowed.has(match[1])) violations.push(`${file}: Intl.${match[1]}`)
		}
	}

	if (violations.length) throw new Error(`Engine server Intl profile violation:\n${violations.join('\n')}`)
}

/** Validates a staging tree and writes its exact compiler schema-1 descriptor. */
export async function emitDescriptor(
	root: string,
	input: Omit<DescriptorInput, 'modules' | 'env' | 'fs' | 'ipc'>,
	app = process.cwd(),
): Promise<Descriptor> {
	const config = await appEngine(app)
	const files = await modules(root)
	await assertIntl(root, files)
	const value = descriptor({ ...input, ...config, modules: files })
	await fs.writeFile(join(root, 'compiler.json'), JSON.stringify(value, null, '\t') + '\n')
	return value
}

/** Builds the client and closed server graph into .ajo and emits its descriptor. */
export async function build(options: BuildOptions = {}): Promise<EngineOutput> {
	const root = process.cwd()
	const staging = join(root, '.ajo')
	await fs.rm(staging, { force: true, recursive: true })

	await vite.build({
		build: {
			emptyOutDir: true,
			outDir: '.ajo/client',
		}
	})

	const template = await fs.readFile(join(staging, 'client/index.html'), 'utf-8')
	const migrations = await Promise.all((await migrationModules(root)).map(async ({ name, file }) => ({
		name,
		file: await fs.realpath(file),
	})))
	const database = migrations.length > 0
	const target = engine({ template, migrations, database, check: options.check })
	// A real file: Rolldown resolves entries natively and never consults
	// plugin hooks for a virtual entry id. .mjs keeps it out of modules().
	const generated = join(staging, 'entry.gen.mjs')
	await fs.writeFile(generated, target.code)

	await vite.build({
		plugins: [target.plugin],
		build: {
			copyPublicDir: false,
			emptyOutDir: true,
			outDir: '.ajo/server',
			ssr: generated,
		}
	})
	await fs.rm(generated, { force: true })

	const emitted = await modules(staging)
	if (emitted.join('\n') !== target.result.files.join('\n')) {
		throw new Error('Engine server staging files differ from the audited Vite graph')
	}

	return {
		descriptor: await emitDescriptor(staging, {
			migrations: target.result.migrations,
			data: target.result.database,
			net: target.result.net,
		}, root),
		findings: target.result.findings,
		staging,
	}
}

/** Starts a Node dev/test app, incrementing the port unless strict is set. */
export const listen = (app: any, port = 5173, options: { strict?: boolean } = {}): Promise<number> => new Promise((resolve, reject) => {
	http.createServer(app.handler)
		.listen(port, () => {
			console.log(`Server started at http://localhost:${port}`)
			resolve(port)
		})
		.once('error', (error: NodeJS.ErrnoException) =>
			error.code === 'EADDRINUSE' && !options.strict
				? resolve(listen(app, port + 1, options))
				: reject(error)
		)
})
