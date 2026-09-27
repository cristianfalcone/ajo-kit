// Node is a dev/build/test host only; production executes on the ajo engine.
import fs from 'node:fs/promises'
import { join } from 'node:path'
import * as http from 'node:http'
import * as vite from 'vite'
import { attach, reader, request, type Handler } from './http'
import { appEngine, descriptor, engine } from './build'
import { migrationModules } from './migrate'

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

/** Creates the development request listener: Vite middleware first, then the kit handler with route reloads. */
export async function dev(options: Options = {}): Promise<http.RequestListener> {

	const server = await vite.createServer({
		server: { middlewareMode: true, ...(options.hmr !== undefined && { hmr: options.hmr }) },
		appType: 'custom',
	})

	const template = await server.transformIndexHtml('/', await html())

	const { create } = await server.ssrLoadModule('ajo-kit/server')
	let inner = handler(await create(template))

	const route = /(handler|wares|page|layout)\.[jt]sx?$/
	// Edited pages and layouts hot-swap in the browser; only added or removed routes reload it.
	const reload = (event: 'add' | 'change' | 'unlink') => async (file: string) => {
		if (!route.test(file)) return
		try {
			const { create } = await server.ssrLoadModule('ajo-kit/server')
			inner = handler(await create(template))
			console.log('\x1b[32m✓\x1b[0m Server routes reloaded')
			if (event !== 'change' && /(page|layout)\.[jt]sx?$/.test(file)) server.ws.send({ type: 'full-reload', path: '*' })
		} catch (error) {
			console.error('\x1b[31m✗\x1b[0m Failed to reload routes:')
			console.error(error)
		}
	}

	for (const event of ['add', 'change', 'unlink'] as const) server.watcher.on(event, reload(event))

	return (req, res) => server.middlewares(req, res, () => inner(req, res))
}

/** Builds the client and closed server graph into .ajo and emits its descriptor. */
export async function build(): Promise<void> {
	const root = process.cwd()
	const authority = await appEngine(root)
	const origins = [...authority.env.required, ...authority.env.optional].includes('AJO_ORIGINS_FILE')
		&& authority.fs.roots.includes('/ajo/origin')
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
	const target = engine({ template, migrations, database: migrations.length > 0, origins })
	// A real file: Rolldown resolves entries natively and never consults
	// plugin hooks for a virtual entry id.
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

	const { files, database } = target.result
	const value = descriptor({ ...authority, modules: files, data: database })
	await fs.writeFile(join(staging, 'compiler.json'), JSON.stringify(value, null, '\t') + '\n')
}

/** Serves a Node dev/test request listener, incrementing the port unless strict is set. */
export const listen = (listener: http.RequestListener, port = 5173, options: { strict?: boolean } = {}): Promise<number> => new Promise((resolve, reject) => {
	http.createServer(listener)
		.listen(port, () => {
			console.log(`Server started at http://localhost:${port}`)
			resolve(port)
		})
		.once('error', (error: NodeJS.ErrnoException) =>
			error.code === 'EADDRINUSE' && !options.strict
				? resolve(listen(listener, port + 1, options))
				: reject(error)
		)
})
