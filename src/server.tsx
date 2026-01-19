import { render as r } from 'ajo/html'
import type { Component } from 'ajo'
import polka from 'polka'
import type { Request, Response, Middleware, NextHandler } from 'polka'
import { json } from '@polka/parse'
import send from '@polka/send'
import navaid from 'navaid'
import App, { routes, resolve, layouts, notFound, toPattern, toSegments, getType, type Route, type Data } from './app'
import { RouteError, type LoaderArgs, type Action, type Server } from './constants'

// Route matching

function match(url: string): Route {
	let route: Route = notFound
	const router = navaid('/', () => route = notFound)
	for (const item of routes) router.on(item.pattern!, params => route = { ...item, params })
	router.run(url)
	return route
}

// Page handlers

type PageHandler = {
	page?: (args: LoaderArgs) => Promise<Record<string, unknown>>
	layout?: (args: LoaderArgs) => Promise<Record<string, unknown>>
	actions: Record<string, (args: Action) => Promise<unknown>>
}

const handlers = new Map<string, PageHandler>()

// Server data loading

export async function data(url: string): Promise<Server> {

	const route = match(url)
	const { segments = [], params = {} } = route

	const paths = segments
		.map((_, index) => segments.slice(0, index + 1).join('/'))
		.filter(path => layouts.has(path))

	const layout: Server['layout'] = []
	const parent = async () => layout.reduce((merged, item) => ({ ...merged, ...item }), {})

	for (const path of paths) {
		const handler = handlers.get(path)
		const module = await layouts.get(path)!()
		const remote = await handler?.layout?.({ params, url, parent }) ?? {}
		const local = await module.load?.({ params, url, parent }) ?? {}
		layout.push({ ...remote, ...local })
	}

	const handler = handlers.get(segments.join('/'))
	const module = await route.loader()
	const remote = await handler?.page?.({ params, url, parent }) ?? {}
	const local = await module.load?.({ params, url, parent }) ?? {}

	return { page: { ...remote, ...local }, layout }
}

// Action execution

export async function action(url: string, name: string, body: Record<string, unknown>) {

	const route = match(url)
	const handler = handlers.get(route.segments?.join('/') ?? '')
	const invoke = handler?.actions[name]

	if (!invoke) throw new RouteError(400, `Action '${name}' not found`)

	return invoke({ params: route.params ?? {}, body })
}

// SSR render

export async function render(url: string) {

	const route = match(url)
	const remote = await data(url)

	let result: { Page: Component; data?: Data } | undefined

	for await (const state of resolve(url, layouts, route, remote)) {
		result = state
	}

	return {
		head: r(<title>ajo-kit</title>),
		data: `<script>window.__SSR__=${JSON.stringify(result!.data)}</script>`,
		root: r(<App page={result!.Page} />),
		error: result!.data?.page.error,
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
  const api: Array<{ segments: string[]; handler: Handlers }> = []

  // Paths with pages or layouts

  const pages = new Set(Object.keys(import.meta.glob('/src/**/page.{j,t}s{,x}')).map(path => toSegments(path).join('/')))
  const local = new Set(Object.keys(import.meta.glob('/src/**/layout.{j,t}s{,x}')).map(path => toSegments(path).join('/')))

  const entries = import.meta.glob('/src/**/{wares,handler}.{j,t}s{,x}') as Record<string, () => Promise<Record<string, unknown>>>

  for (const [path, loader] of Object.entries(entries)) {

    const module = await loader()
    const segments = toSegments(path)
    const key = segments.join('/')

    switch (getType(path) as Type) {

      case 'wares': {
        const fns = ((Array.isArray(module.default) ? module.default : [module.default]).filter(fn => typeof fn === 'function')) as Middleware[]
        wares.set(key, (wares.get(key) ?? []).concat(fns))
        break
      }

      case 'handler': {

        // Page handler: page(), layout(), named actions

        if (pages.has(key) || local.has(key)) {
          const { page, layout, default: _, ...rest } = module
          handlers.set(key, {
            page: typeof page === 'function' ? page as PageHandler['page'] : undefined,
            layout: typeof layout === 'function' ? layout as PageHandler['layout'] : undefined,
            actions: Object.fromEntries(Object.entries(rest).filter(([, fn]) => typeof fn === 'function')) as PageHandler['actions']
          })
        }

        // API handler: HTTP methods from default export

        if (module.default) {
          api.push({ segments, handler: module.default as Handlers })
        }

        break
      }
    }
  }

  for (const { segments, handler } of api) {

    const pattern = toPattern(segments)

    const list = segments
      .map((_, index) => segments.slice(0, index + 1).join('/'))
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
