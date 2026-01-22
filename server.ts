import fs from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { json } from '@polka/parse'
import send from '@polka/send'
import polka, { type Request, type Response } from 'polka'
import sirv from 'sirv'
import sade from 'sade'

const reMarkers = /<!--\s*ssr:([A-Za-z0-9_]+)\s*-->/g

function compile(html: string) {

  const statics: string[] = []
  const markers: string[] = []

  let start = 0
  let match: RegExpExecArray | null

  while (match = reMarkers.exec(html)) {

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

type Module = {
  data: (req: Request, res: Response) => Promise<unknown>
  action: (req: Request, res: Response, name: string) => Promise<{ redirect?: string } | void>
}

function routes(app: ReturnType<typeof polka>, module: Module) {

  app.use(json())

  // JSON data for client navigation

  app.get('*', async (req, res, next) => {

    if (!req.headers.accept?.includes('application/json')) return next()

    try {
      send(res, 200, await module.data(req, res))
    } catch (error: unknown) {
      const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500
      const message = error instanceof Error ? error.message : 'Error'
      send(res, status, { error: message })
    }
  })

  // Form actions

  app.post('*', async (req, res, next) => {

    const url = new URL(req.originalUrl, `http://${req.headers.host}`)
    const name = [...url.searchParams.keys()].find(key => key.startsWith('/'))?.slice(1)

    if (!name) return next()

    const isJson = req.headers.accept?.includes('application/json')

    try {

      const result = await module.action(req, res, name)

      if (isJson) {
        send(res, 200, result?.redirect ? { redirect: result.redirect } : (result ?? { ok: true }))
      } else {
        res.statusCode = 302
        res.setHeader('Location', result?.redirect ?? url.pathname)
        res.end()
      }

    } catch (error: unknown) {

      const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500
      const message = error instanceof Error ? error.message : 'Action failed'

      if (isJson) {
        send(res, status, { error: message })
      } else {
        res.statusCode = 302
        res.setHeader('Location', url.pathname)
        res.end()
      }
    }
  })
}

async function createDevServer() {

  const app = polka()

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })

  app.use(vite.middlewares)

  const { create, render, data, action } = await vite.ssrLoadModule('./src/server.tsx')

  app.use('/api', await create())

  routes(app, { data, action })

  // SSR

  app.use('*', async (req, res) => {

    try {

      let raw = await fs.readFile('./index.html', 'utf-8')

      raw = await vite.transformIndexHtml(req.originalUrl, raw)

      const template = compile(raw)

      const result = await render(req, res)

      res.statusCode = result.error?.status ?? 200
      res.setHeader('Content-Type', 'text/html').end(template(result))

    } catch (error: unknown) {

      const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500

      res.statusCode = status

      if (error instanceof Error) {
        vite.ssrFixStacktrace(error)
        if (status >= 500) console.log(error.stack ?? error)
        res.end(error.stack ?? error)
      } else {
        console.log(error)
        res.end('Server error')
      }
    }
  })

  return app
}

async function createProdServer() {

  const app = polka()

  const template = compile(await fs.readFile('./dist/client/index.html', 'utf-8'))

  // @ts-ignore
  const { create, render, data, action } = await import('./dist/server/server.js')

  app.use('/api', await create())

  app.use(sirv('./dist/client', { extensions: [] }))

  routes(app, { data, action })

  // SSR

  app.use('*', async (req, res) => {

    try {

      const result = await render(req, res)

      res.statusCode = result.error?.status ?? 200
      res.setHeader('Content-Type', 'text/html').end(template(result))

    } catch (error: unknown) {

      const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500

      res.statusCode = status

      if (error instanceof Error) {
        if (status >= 500) console.log(error.stack ?? error)
        res.end(error.stack ?? error)
      } else {
        console.log(error)
        res.end('Server error')
      }
    }
  })

  return app
}

const listen = (handler: any, port: number): Promise<number> => new Promise((resolve, reject) => {
  createHttpServer(handler)
    .listen(port, () => resolve(port))
    .once('error', (e: NodeJS.ErrnoException) => e.code === 'EADDRINUSE' ? resolve(listen(handler, port + 1)) : reject(e))
})

type ServerOptions = {
  port: number
}

sade('ajo-kit')
  .version('1.0.0')
  .option('--port, -p', 'Port to start the server on', 5173)
  .command('dev')
  .describe('Start the development server')
  .action(async (opts: ServerOptions) => {
    const app = await createDevServer()
    const port = await listen(app.handler, opts.port)
    console.log(`Dev server started at http://localhost:${port}`)
  })
  .command('prod')
  .describe('Start the production server')
  .action(async (opts: ServerOptions) => {
    const app = await createProdServer()
    const port = await listen(app.handler, opts.port)
    console.log(`Production server started at http://localhost:${port}`)
  })
  .parse(process.argv)
