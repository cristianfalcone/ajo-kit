import { render as html } from 'ajo/html'
import type { Component } from 'ajo'
import polka from 'polka'
import type { Request, Response, Middleware, NextHandler } from 'polka'
import { json } from '@polka/parse'
import send from '@polka/send'
import navaid from 'navaid'
import App, { pages, resolve, layouts, notFound, toPattern, toSegments, getFileName, type Page, type State } from './app'
import { AppError, type Remote } from './constants'

// Page matching

function match(url: string): Page {
	let page: Page = notFound
	const router = navaid('/', () => page = notFound)
	for (const config of pages) router.on(config.pattern!, params => page = { ...config, params })
	router.run(url)
	return page
}

// Wares populated by create()

const wares = new Map<string, Middleware[]>()

// Helper to pipeline middleware chain

async function pipeline(chain: Middleware[], req: Request, res: Response): Promise<void> {

	let index = 0

	const next: NextHandler = async (err?: unknown) => {
		if (err) throw err
		if (index < chain.length) await chain[index++](req, res, next)
	}

	await next()
}

// Get wares for a path

function waresFor(segments: string[]): Middleware[] {
	return segments
		.map((_, index) => segments.slice(0, index + 1).join('/'))
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

export async function data(req: Request, res: Response): Promise<Remote> {

	const url = req.originalUrl
	const { segments = [], params = {}, loader } = match(url)

	// Inject params into req
	Object.assign(req, { params })

	// Run wares for this path
	await pipeline(waresFor(segments), req, res)

	const paths = segments
		.map((_, index) => segments.slice(0, index + 1).join('/'))
		.filter(path => layouts.has(path))

	const layout: Remote['layout'] = []
	const parent: Parent = async () => layout.reduce((result, entry) => ({ ...result, ...entry }), {})

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
	await pipeline(waresFor(segments), req, res)

	// Walk up the handler chain to find the action
	const paths = segments
		.map((_, index) => segments.slice(0, index + 1).join('/'))
		.filter(path => handlers.has(path))
		.reverse()

	for (const path of paths) {
		const invoke = handlers.get(path)?.actions[name]
		if (invoke) return invoke(req, res)
	}

	throw new AppError(400, `Action '${name}' not found`)
}

// SSR render

export async function render(req: Request, res: Response) {

	const url = req.originalUrl

	let resolved: { Page: Component; data?: State } | undefined

	for await (const state of resolve(url, layouts, match(url), await data(req, res))) {
		resolved = state
	}

	return {
		head: html(<title>ajo-kit</title>),
		data: `<script>globalThis.__SSR__=${JSON.stringify(resolved!.data)}</script>`,
		root: html(<App page={resolved!.Page} />),
		error: resolved!.data?.page.error,
	}
}

type FileName = 'wares' | 'handler'
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'
type Handler = (req: Request, res: Response, next: NextHandler) => unknown | Promise<unknown>
type Handlers = Partial<Record<HttpMethod, Handler>>

const wrap = (fn: Handler = () => {}): Middleware => async (req, res, next) => {
	const output = await fn(req, res, next)
	if (res.writableEnded) return
	send(res, res.statusCode, output)
}

export async function create() {

	const app = polka({
		onError: (err, _, res) => {
			if (err instanceof AppError) {
				send(res, err.status, err)
			} else {
				console.error(err)
				send(res, 500, { error: 'Internal error' })
			}
		},
		onNoMatch: (_, res) => send(res, 404, { error: 'Not found' })
	})

	app.use(json())

	const files = Object.entries(import.meta.glob('/src/**/{wares,handler}.{j,t}s{,x}') as Record<string, () => Promise<Record<string, unknown>>>)

	for (const [file, load] of files) {

		const exports = await load()
		const segments = toSegments(file)
		const key = segments.join('/')

		switch (getFileName(file) as FileName) {

			case 'wares': {
				wares.set(key, (wares.get(key) ?? []).concat(
					(Array.isArray(exports.default) ? exports.default : [exports.default]) as Middleware[]
				))
				break
			}

			case 'handler': {

				const { default: routes, page, layout, ...actions } = exports

				handlers.set(key, { page, layout, actions } as PageHandler)

				if (routes) for (const method of Object.keys(routes) as HttpMethod[]) {
					app[method](
						toPattern(segments),
						...waresFor(segments),
						wrap((routes as Handlers)[method])
					)
				}
			}
		}
	}

	return app
}
