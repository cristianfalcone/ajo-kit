import fs from 'node:fs/promises'
import sade from 'sade'
import polka from 'polka'
import sirv from 'sirv'
import { createServer } from 'vite'

const re = /<!--\s*ssr:([A-Za-z0-9_]+)\s*-->/g

function compile(html: string) {

  const statics: string[] = []
  const markers: string[] = []

  let start = 0
  let match: RegExpExecArray | null

  while (match = re.exec(html)) {

    const end = match.index

    markers.push(match[1])
    statics.push(html.slice(start, end))

    start = end + match[0].length
  }

  statics.push(html.slice(start))

  return (contents: Record<string, string>) => {

    let out = ''

    for (let i = 0; i < markers.length; i++) out += statics[i] + (contents[markers[i]] ?? '')

    out += statics[statics.length - 1]

    return out
  }
}

async function createDevServer() {

  const app = polka()

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })

  app.use(vite.middlewares)

  app.use('*', async (req, res) => {

    try {

      const { originalUrl: url } = req

      let raw = await fs.readFile('./index.html', 'utf-8')

      raw = await vite.transformIndexHtml(url, raw)

      const template = compile(raw)

      const { render } = await vite.ssrLoadModule('./src/server.tsx')

      const html = template(render(url))

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html').end(html)

    } catch (e) {

      res.statusCode = 500

      if (e instanceof Error) {
        vite.ssrFixStacktrace(e)
        console.log(e.stack ?? e)
        res.end(e.stack ?? e)
      } else {
        console.log(e)
        res.end('Server error')
      }
    }
  })

  return app
}

async function createProdServer() {

  const app = polka()

  const template = compile(await fs.readFile('./dist/client/index.html', 'utf-8'))

  const { render } = await import('./dist/server/server.js')

  app.use(sirv('./dist/client', { extensions: [] }))

  app.use('*', async (req, res) => {

    try {

      const { originalUrl: url } = req

      const html = template(render(url))

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html').end(html)

    } catch (e) {

      res.statusCode = 500

      if (e instanceof Error) {
        console.log(e.stack ?? e)
        res.end(e.stack ?? e)
      } else {
        console.log(e)
        res.end('Server error')
      }
    }
  })

  return app
}

type ServerOptions = {
  port: number
}

sade('ajo-kit')
  .version('1.0.0')
  .option('--port, -p', 'Port to start the server on', 5173)
  .command('dev')
  .describe('Start the development server')
  .action(async (opts: ServerOptions) => {
    const server = await createDevServer()
    server.listen(opts.port, () => console.log(`Dev server started at port ${opts.port}`))
  })
  .command('prod')
  .describe('Start the production server')
  .action(async (opts: ServerOptions) => {
    const server = await createProdServer()
    server.listen(opts.port, () => console.log(`Production server started at port ${opts.port}`))
  })
  .parse(process.argv)
