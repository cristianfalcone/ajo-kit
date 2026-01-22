import { render as r } from 'ajo/html'
import type { Component } from 'ajo'
import polka from 'polka'
import type { Request, Response, Middleware, NextHandler } from 'polka'
import { json } from '@polka/parse'
import send from '@polka/send'
import navaid from 'navaid'
import App, { routes, resolve, layouts, notFound, toPattern, toSegments, getFileName, type Route, type Data } from './app'
import { RouteError, type Server } from './constants'

// Route matching

function match(url: string): Route {
	let route: Route = notFound
	const router = navaid('/', () => route = notFound)
	for (const item of routes) router.on(item.pattern!, params => route = { ...item, params })
	router.run(url)
	return route
}

// Wares populated by create()

const wares = new Map<string, Middleware[]>()

// Helper to run middleware chain

async function run(list: Middleware[], req: Request, res: Response): Promise<void> {

	let i = 0

	const next: NextHandler = async (err?: unknown) => {
		if (err) throw err
		if (i < list.length) await list[i++](req, res, next)
	}

	await next()
}

// Get wares for a path

function waresFor(segments: string[]): Middleware[] {
	return segments
		.map((_, i) => segments.slice(0, i + 1).join('/'))
		.flatMap(path => wares.get(path) ?? [])
}

// Page handlers

type Parent = () => Promise<Record<string, unknown>>

type PageHandler = {
	page?: (req: Request, parent: Parent) => Promise<Record<string, unknown>>
	layout?: (req: Request, parent: Parent) => Promise<Record<string, unknown>>
	actions: Record<string, (req: Request, res: Response) => Promise<unknown>>
}

const handlers = new Map<string, PageHandler>()

// Server data loading

export async function data(req: Request, res: Response): Promise<Server> {

	const url = req.originalUrl
	const { segments = [], params = {}, loader } = match(url)

	// Inject params into req
	Object.assign(req, { params })

	// Run wares for this path
	await run(waresFor(segments), req, res)

	const paths = segments
		.map((_, index) => segments.slice(0, index + 1).join('/'))
		.filter(path => layouts.has(path))

	const layout: Server['layout'] = []
	const parent: Parent = async () => layout.reduce((merged, item) => ({ ...merged, ...item }), {})

	for (const path of paths) {
		const module = await layouts.get(path)?.()
		const remote = await handlers.get(path)?.layout?.(req, parent)
		const local = await module?.handler?.({ params, url, parent })
		layout.push({ ...remote, ...local })
	}

	const module = await loader()
	const remote = await handlers.get(segments.join('/'))?.page?.(req, parent)
	const local = await module.handler?.({ params, url, parent })

	return { page: { ...remote, ...local }, layout }
}

// Action execution

export async function action(req: Request, res: Response, name: string) {

	const { segments = [], params = {} } = match(req.originalUrl)

	// Inject params into req
	Object.assign(req, { params })

	// Run wares for this path
	await run(waresFor(segments), req, res)

	// Walk up the handler chain to find the action
	const paths = segments
		.map((_, i) => segments.slice(0, i + 1).join('/'))
		.filter(path => handlers.has(path))
		.reverse()

	for (const path of paths) {
		const invoke = handlers.get(path)?.actions[name]
		if (invoke) return invoke(req, res)
	}

	throw new RouteError(400, `Action '${name}' not found`)
}

// SSR render

export async function render(req: Request, res: Response) {

	const url = req.originalUrl

	let result: { Page: Component; data?: Data } | undefined

	for await (const state of resolve(url, layouts, match(url), await data(req, res))) {
		result = state
	}

	return {
		head: r(<title>ajo-kit</title>),
		data: `<script>globalThis.__SSR__=${JSON.stringify(result!.data)}</script>`,
		root: r(<App page={result!.Page} />),
		error: result!.data?.page.error,
	}
}

type FileName = 'wares' | 'handler'
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'
type Handler = (req: Request, res: Response, next: NextHandler) => unknown | Promise<unknown>
type Handlers = Partial<Record<HttpMethod, Handler>>

const wrap = (fn: Handler = () => {}): Middleware => async (req, res, next) => {
	const out = await fn(req, res, next)
	if (res.writableEnded) return
	send(res, res.statusCode, out)
}

export async function create() {

	const app = polka({
		onError: (err, _, res) => {
			if (err instanceof RouteError) {
				send(res, err.status, err)
			} else {
				console.error(err)
				send(res, 500, { error: 'Internal error' })
			}
		},
		onNoMatch: (_, res) => send(res, 404, { error: 'Not found' })
	})

	app.use(json())

	const entries = Object.entries(import.meta.glob('/src/**/{wares,handler}.{j,t}s{,x}') as Record<string, () => Promise<Record<string, unknown>>>)

	for (const [path, loader] of entries) {

		const module = await loader()
		const segments = toSegments(path)
		const key = segments.join('/')

		switch (getFileName(path) as FileName) {

			case 'wares': {
				wares.set(key, (wares.get(key) ?? []).concat(
					(Array.isArray(module.default) ? module.default : [module.default]) as Middleware[]
				))
				break
			}

			case 'handler': {

				const { default: api, page, layout, ...actions } = module

				handlers.set(key, { page, layout, actions } as PageHandler)

				if (api) for (const method of Object.keys(api) as HttpMethod[]) {
					app[method](
						toPattern(segments),
						...waresFor(segments),
						wrap((api as Handlers)[method])
					)
				}
			}
		}
	}

	return app
}
