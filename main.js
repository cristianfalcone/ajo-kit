import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import polka from 'polka'
import sirv from 'sirv'

const port = process.env.PORT ?? 3000
const isProd = process.env.NODE_ENV === 'production'
const app = polka()

let index, vite

if (isProd) {
	index = readFileSync(resolve('./dist/client/index.html'), 'utf-8')
	app.use(sirv('./dist/client', { extensions: [] }))
} else {
	vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
	app.use(vite.middlewares)
}

app.use(async (req, res, next) => {
	try {
		const ctx = { req, res, next, meta: [], main: '' }
		let html, render

		if (isProd) {
			html = index
			render = (await import('./dist/server/server.js')).default
		} else {
			html = readFileSync(resolve('index.html'), 'utf-8')
			html = await vite.transformIndexHtml(req.path, html)
			render = (await vite.ssrLoadModule('/server.jsx')).default
		}

		await render(ctx)

		html = html
			.replace('<body>', '<body ssr>')
			.replace('<!--ssr-meta-->', ctx.meta.map(m => `<meta name="${m.name}" content="${m.content}">`).join(''))
			.replace('<!--ssr-main-->', ctx.main)

		res.writeHead(200, { 'Content-Type': 'text/html' })
		res.end(html)
	} catch (e) {
		isProd || vite.ssrFixStacktrace(e)
		console.log(e.stack)
		res.writeHead(500)
		res.end("Internal Server Error")
	}
})

app.listen(port, () => { console.log(`http://localhost:${port}`) })
