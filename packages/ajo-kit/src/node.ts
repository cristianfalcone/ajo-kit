import fs from 'node:fs/promises'
import * as url from 'node:url'
import { join } from 'node:path'
import * as http from 'node:http'
import * as vite from 'vite'
import polka from 'polka'
import sirv from 'sirv'

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

const markers = /<!--\s*ssr:([A-Za-z0-9_]+)\s*-->/g

/** Compiles an HTML file with ssr:* comments into a slot renderer. */
export function compile(html: string) {

	const parts = html.split(markers)

	return (slots: Record<string, string>) =>
		parts.map((part, index) => index % 2 ? slots[part] ?? '' : part).join('')
}

async function html() {
	try { return await fs.readFile('./index.html', 'utf-8') }
	catch { return fallback }
}

/** Development server options accepted by dev(). */
export type Options = {
	hmr?: vite.ServerOptions['hmr']
}

/** Creates the development Polka app with Vite middleware and route reloads. */
export async function dev(options: Options = {}) {

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
	let inner = await create(template)

	app.use((req: any, res: any) => inner.handler(req, res))

	const route = /(handler|wares|page|layout)\.[jt]sx?$/
	const reload = async (file: string) => {
		if (!route.test(file)) return
		try {
			const { create } = await server.ssrLoadModule('ajo-kit/server')
			inner = await create(template)
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

/** Creates the production Polka app from dist/client and dist/server. */
export async function start() {

	const app = polka()

	const entry = url.pathToFileURL(join(process.cwd(), 'dist/server/server.js')).href
	const { create } = await import(entry)

	const inner = await create(compile(await fs.readFile(join(process.cwd(), 'dist/client/index.html'), 'utf-8')))

	app.use(sirv(join(process.cwd(), 'dist/client'), { extensions: [] }))
	app.use((req: any, res: any) => inner.handler(req, res))

	return app
}

/** Builds client and server bundles into dist/. */
export async function build() {

	await vite.build({ build: { outDir: 'dist/client' } })

	const entry = url.fileURLToPath(import.meta.resolve('ajo-kit/server'))

	await vite.build({ build: { outDir: 'dist/server', ssr: entry } })
}

/** Starts an app, incrementing the port when it is busy unless strict is set. */
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
