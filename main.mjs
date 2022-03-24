import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createServer } from 'vite'
import polka from 'polka'
import sirv from 'sirv'

const isProd = process.env.NODE_ENV === 'production'
const app = polka()

let vite, t

if (isProd) {
  t = readFileSync(resolve('./dist/client/index.html'), 'utf-8')
  app.use(sirv('./dist/client', { extensions: [] }))
} else {
  vite = await createServer({ server: { middlewareMode: 'ssr' } })
  app.use(vite.middlewares)
}

app.use(async (req, res) => {
  try {
    const path = req.path

    let template, render

    if (isProd) {
      template = t
      render = (await import('./dist/server/server.js')).default.default
    } else {
      template = readFileSync(resolve('index.html'), 'utf-8')
      template = await vite.transformIndexHtml(path, template)
      render = (await vite.ssrLoadModule('/server.jsx')).default
    }

    const html = template.replace('<body>', `<body ssr>\n  ${await render(path)}`)

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  } catch (e) {
    isProd || vite.ssrFixStacktrace(e)
    console.log(e.stack)
    res.writeHead(500)
    res.end(e.stack)
  }
})

app.listen(3000)
