import fs from 'node:fs/promises'
import { pathToFileURL as url, fileURLToPath as file } from 'node:url'
import { join } from 'node:path'
import { createServer as http } from 'node:http'
import { createServer as serve, build as bundle, type ServerOptions as Server } from 'vite'
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

export function compile(html: string) {

	const parts = html.split(markers)

	return (slots: Record<string, string>) =>
		parts.map((part, index) => index % 2 ? slots[part] ?? '' : part).join('')
}

async function html() {
	try { return await fs.readFile('./index.html', 'utf-8') }
	catch { return fallback }
}

export type Options = {
	hmr?: Server['hmr']
}

export async function dev(options: Options = {}) {

	const app = polka()

	const vite = await serve({
		server: { middlewareMode: true, ...(options.hmr !== undefined && { hmr: options.hmr }) },
		appType: 'custom',
	})

	app.use(vite.middlewares)

	let raw = await html()
	raw = await vite.transformIndexHtml('/', raw)
	const template = compile(raw)

	const { create } = await vite.ssrLoadModule('ajo-kit/server')
	let inner = await create(template)

	app.use((req: any, res: any) => inner.handler(req, res))

	const route = /(handler|wares|page|layout)\.[jt]sx?$/
	const reload = async (file: string) => {
		if (!route.test(file)) return
		try {
			const { create } = await vite.ssrLoadModule('ajo-kit/server')
			inner = await create(template)
			console.log('\x1b[32m✓\x1b[0m Server routes reloaded')
			if (/(page|layout)\.[jt]sx?$/.test(file)) vite.ws.send({ type: 'full-reload', path: '*' })
		} catch (error) {
			console.error('\x1b[31m✗\x1b[0m Failed to reload routes:')
			console.error(error)
		}
	}

	vite.watcher.on('change', reload)
	vite.watcher.on('add', reload)
	vite.watcher.on('unlink', reload)

	return app
}

export async function start() {

	const app = polka()

	const entry = url(join(process.cwd(), 'dist/server/server.js')).href
	const { create } = await import(entry)

	const inner = await create(compile(await fs.readFile(join(process.cwd(), 'dist/client/index.html'), 'utf-8')))

	app.use(sirv(join(process.cwd(), 'dist/client'), { extensions: [] }))
	app.use((req: any, res: any) => inner.handler(req, res))

	return app
}

export async function build() {

	await bundle({ build: { outDir: 'dist/client' } })

	const entry = file(import.meta.resolve('ajo-kit/server'))

	await bundle({ build: { outDir: 'dist/server', ssr: entry } })
}

export const listen = (app: any, port = 5173, options: { strict?: boolean } = {}): Promise<number> => new Promise((resolve, reject) => {
	http(app.handler)
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
