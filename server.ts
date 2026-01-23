import fs from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import polka from 'polka'
import sirv from 'sirv'
import sade from 'sade'

const reMarkers = /<!--\s*ssr:([A-Za-z0-9_]+)\s*-->/g

function compile(html: string) {

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

async function createDevServer() {

  const app = polka()

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })

  app.use(vite.middlewares)

  const { create } = await vite.ssrLoadModule('./src/server.tsx')

  let raw = await fs.readFile('./index.html', 'utf-8')
  raw = await vite.transformIndexHtml('/', raw)

  app.use(await create(compile(raw)))

  return app
}

async function createProdServer() {

  const app = polka()

  // @ts-ignore
  const { create } = await import('./dist/server/server.js')

  app.use(sirv('./dist/client', { extensions: [] }))
  app.use(await create(compile(await fs.readFile('./dist/client/index.html', 'utf-8'))))

  return app
}

const listen = (handler: any, port: number): Promise<number> => new Promise((resolve, reject) => {
  createHttpServer(handler)
    .listen(port, () => resolve(port))
    .once('error', (error: NodeJS.ErrnoException) => error.code === 'EADDRINUSE' ? resolve(listen(handler, port + 1)) : reject(error))
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
