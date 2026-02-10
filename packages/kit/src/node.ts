import fs from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import polka from 'polka'
import sirv from 'sirv'

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

export async function dev() {

	const app = polka()

	const vite = await createServer({
		server: { middlewareMode: true },
		appType: 'custom',
	})

	app.use(vite.middlewares)

	const { create } = await vite.ssrLoadModule('@kit/server')

	let raw = await fs.readFile('./index.html', 'utf-8')
	raw = await vite.transformIndexHtml('/', raw)

	app.use(await create(compile(raw)))

	return app
}

export async function prod() {

	const app = polka()

	// @ts-ignore
	const { create } = await import('./dist/server/server.js')

	app.use(sirv('./dist/client', { extensions: [] }))
	app.use(await create(compile(await fs.readFile('./dist/client/index.html', 'utf-8'))))

	return app
}

export const listen = (app: any, port = 5173): Promise<number> => new Promise((resolve, reject) => {
	createHttpServer(app.handler)
		.listen(port, () => {
			console.log(`Server started at http://localhost:${port}`)
			resolve(port)
		})
		.once('error', (error: NodeJS.ErrnoException) => error.code === 'EADDRINUSE' ? resolve(listen(app, port + 1)) : reject(error))
})
