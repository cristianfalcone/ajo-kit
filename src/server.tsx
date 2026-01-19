import { render as r } from 'ajo/html'
import polka from 'polka'
import type { Request, Response, Middleware, NextHandler } from 'polka'
import { json } from '@polka/parse'
import send from '@polka/send'
import navaid from 'navaid'
import App, { routes, resolve, layouts, notFound, type Route } from './app'

export async function render(url: string) {

  let match: Route

  const router = navaid('/', () => match = notFound)

  for (const route of routes) {
    router.on(route.pattern, params => match = { ...route, params })
  }

  router.run(url)

  const { data, Page } = await resolve(url, layouts, match!)

  return {
    head: r(<title>ajo-kit</title>),
    data: `<script>window.__SSR__=${JSON.stringify(data)}</script>`,
    root: r(<App page={Page} />),
    error: match!.error,
  }
}

type Type = 'wares' | 'handler'
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'
type Handler = (req: Request, res: Response, next: NextHandler) => unknown | Promise<unknown>
type Handlers = Partial<Record<HttpMethod, Handler>>

const wrap = (fn: NonNullable<Handlers[keyof Handlers]>): Middleware => async (req, res, next) => {
  const out = await fn(req, res, next)
  if (res.writableEnded) return
  send(res, res.statusCode, out)
}

export async function create() {

  const app = polka({
    onError: (err, _, res) => send(
      res,
      res.statusCode && res.statusCode >= 400 ? res.statusCode : 500,
      typeof err === 'string' ? err : (err?.message ?? 'Internal Server Error')
    ),
    onNoMatch: (_, res) => send(res, 404, 'Not Found')
  })

  app.use(json())

  const wares = new Map<string, Middleware[]>()
  const handlers: Array<{ segments: string[]; handler: Handlers }> = []

  const entries = import.meta.glob('/src/**/{wares,handler}.{j,t}s{,x}') as Record<string, () => Promise<{ default: unknown }>>

  for (const [path, loader] of Object.entries(entries)) {

    const handler = (await loader()).default

    if (!handler) continue

    const segments = path.slice(4).split('/')

    switch (segments.pop()?.split('.')[0] as Type) {
      case 'wares': {
        const key = segments.join('/')
        const fns = ((Array.isArray(handler) ? handler : [handler]).filter(fn => typeof fn === 'function')) as Middleware[]
        wares.set(key, (wares.get(key) ?? []).concat(fns))
        break
      }
      case 'handler': {
        handlers.push({ segments, handler })
        break
      }
    }
  }

  for (const { segments, handler } of handlers) {

    const pattern = segments
      .filter(s => !/^\(.*\)$/.test(s)) // filter out route groups
      .map(s => s.replace(/^\[(.+?)\]$/, (_, p) => p === '...' ? '*' : ':' + p))
      .join('/')

    const list = segments
      .map((_, i) => segments.slice(0, i + 1).join('/'))
      .flatMap(path => wares.get(path) ?? [])

    for (const method of Object.keys(handler) as HttpMethod[]) {

      const fn = handler[method]

      if (typeof app[method] === 'function' && typeof fn === 'function') {
        app[method](pattern, ...list, wrap(fn))
      }
    }
  }

  return app
}
