import fs from 'node:fs/promises'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createServer as createHttpServer } from 'node:http'
import { createServer, build as viteBuild } from 'vite'
import polka from 'polka'
import sirv from 'sirv'

const defaultHtml = `<!DOCTYPE html>
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

const reMarkers = /<!--\s*ssr:([A-Za-z0-9_]+)\s*-->/g

export function compile(html: string) {

	const statics: string[] = []
	const markers: string[] = []

	let start = 0
	let found: RegExpExecArray | null

	while (found = reMarkers.exec(html)) {

		const end = found.index

		markers.push(found[1])
		statics.push(html.slice(start, end))

		start = end + found[0].length
	}

	statics.push(html.slice(start))

	return (slots: Record<string, string>) => {

		let output = ''

		for (let index = 0; index < markers.length; index++) output += statics[index] + (slots[markers[index]] ?? '')

		output += statics[statics.length - 1]

		return output
	}
}

async function html() {
	try { return await fs.readFile('./index.html', 'utf-8') }
	catch { return defaultHtml }
}

export async function dev() {

	const app = polka()

	const vite = await createServer({
		server: { middlewareMode: true },
		appType: 'custom',
	})

	app.use(vite.middlewares)

	let raw = await html()
	raw = await vite.transformIndexHtml('/', raw)
	const template = compile(raw)

	const { create } = await vite.ssrLoadModule('ajo-kit/server')
	let inner = await create(template)

	app.use((req: any, res: any) => inner.handler(req, res))

	const reHandler = /(handler|wares)\.[jt]sx?$/
	vite.watcher.on('change', async (file) => {
		if (!reHandler.test(file)) return
		try {
			const { create } = await vite.ssrLoadModule('ajo-kit/server')
			inner = await create(template)
			console.log('\x1b[32m✓\x1b[0m Server handlers reloaded')
		} catch (error) {
			console.error('\x1b[31m✗\x1b[0m Failed to reload handlers:')
			console.error(error)
		}
	})

	return app
}

export async function start() {

	const app = polka()

	const entry = pathToFileURL(join(process.cwd(), 'dist/server/server.js')).href
	const { create } = await import(entry)

	const inner = await create(compile(await fs.readFile(join(process.cwd(), 'dist/client/index.html'), 'utf-8')))

	app.use(sirv(join(process.cwd(), 'dist/client'), { extensions: [] }))
	app.use((req: any, res: any) => inner.handler(req, res))

	return app
}

export async function build() {

	await viteBuild({ build: { outDir: 'dist/client' } })

	const entry = fileURLToPath(import.meta.resolve('ajo-kit/server'))

	await viteBuild({ build: { outDir: 'dist/server', ssr: entry } })
}

export const listen = (app: any, port = 5173): Promise<number> => new Promise((resolve, reject) => {
	createHttpServer(app.handler)
		.listen(port, () => {
			console.log(`Server started at http://localhost:${port}`)
			resolve(port)
		})
		.once('error', (error: NodeJS.ErrnoException) => error.code === 'EADDRINUSE' ? resolve(listen(app, port + 1)) : reject(error))
})
