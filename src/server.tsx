import { render as html } from 'ajo/html'
import type { Component } from 'ajo'
import polka from 'polka'
import type { Request, Response, Middleware, NextHandler } from 'polka'
import { json } from '@polka/parse'
import send from '@polka/send'
import App, { resolve, layouts, pages, toPattern, toSegments, type Page, type State } from './app'
import { AppError, type Data } from './constants'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'

type Handler = (req: Request, res: Response, next: NextHandler) => unknown | Promise<unknown>

type Parent = () => Promise<Record<string, unknown>>

type PageHandler = {
	page?: (req: Request, parent: Parent) => Promise<Record<string, unknown>>
	layout?: (req: Request, parent: Parent) => Promise<Record<string, unknown>>
	actions: Record<string, (req: Request, res: Response) => Promise<unknown>>
}

type Template = (slots: Record<string, string>) => string

export async function create(template: Template) {

	const data = (page: Page): Middleware => async (req, _, next) => {

		const url = req.originalUrl
		const { segments = [], loader } = page
		const params = req.params
		const paths = ancestors(segments).filter(path => layouts.has(path))
		const layout: Data['layout'] = []
		const parent: Parent = async () => layout.reduce((result, entry) => ({ ...result, ...entry }), {})

		for (const path of paths) {

			const module = await layouts.get(path)?.()
			const remote = await handlers.get(path)?.layout?.(req, parent)
			const local = await module?.handler?.({ url, params, parent })

			layout.push({ ...remote, ...local })
		}

		const module = await loader()
		const remote = await handlers.get(segments.join('/'))?.page?.(req, parent)
		const local = await module.handler?.({ url, params, parent })

		req.data = { page: { ...remote, ...local }, layout }

		next()
	}

	// Handler factory: page GET - returns JSON or HTML

	const render = (page: Page): Handler => async (req, res) => {

		if (req.headers.accept?.includes('application/json')) return req.data

		let resolved: { Page: Component; data?: State } | undefined

		for await (const state of resolve(req.originalUrl, layouts, page, req.data)) {
			resolved = state
		}

		res.setHeader('Content-Type', 'text/html')
		res.statusCode = resolved!.data?.page.error?.status ?? 200
		res.end(template({
			head: html(<title>ajo-kit</title>),
			data: `<script>globalThis.__SSR__=${JSON.stringify(resolved!.data)}</script>`,
			root: html(<App page={resolved!.Page} />),
		}))
	}

	const action = (segments: string[]): Middleware => (req, _, next) => {

		const url = new URL(req.originalUrl, `http://${req.headers.host}`)
		const name = [...url.searchParams.keys()].find(key => key.startsWith('/'))?.slice(1)

		if (!name) throw new AppError(400, 'No action specified')

		const paths = ancestors(segments).filter(path => handlers.has(path)).reverse()

		for (const path of paths) {

			const invoke = handlers.get(path)?.actions[name]

			if (invoke) {
				req.action = { name, invoke }
				return next()
			}
		}

		throw new AppError(400, `Action '${name}' not found`)
	}

	// Handler factory: execute action and respond

	const invoke = (): Handler => async (req, res) => {

		if (!req.action) return

		const result = await req.action.invoke(req, res) as { redirect?: string } | void

		if (req.headers.accept?.includes('application/json')) {
			return result?.redirect ? { redirect: result.redirect } : (result ?? { ok: true })
		}

		res.statusCode = 302
		res.setHeader('Location', result?.redirect ?? req.originalUrl.split('?')[0])
		res.end()
	}

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

	const ancestors = (segments: string[]) => segments.map((_, i) => segments.slice(0, i + 1).join('/'))

	const collect = (segments: string[]): Middleware[] => ancestors(segments).flatMap(path => wares.get(path) ?? [])

	const wrap = (fn: Handler): Middleware => async (req, res, next) => {
		const output = await fn(req, res, next)
		if (res.writableEnded) return
		send(res, res.statusCode, output)
	}

	// Load wares first

	const wareFiles = import.meta.glob('/src/**/wares.{j,t}s{,x}') as Record<string, () => Promise<Record<string, unknown>>>
	const wares = new Map<string, Middleware[]>()

	for (const [file, loader] of Object.entries(wareFiles)) {
		const exports = await loader()
		const key = toSegments(file).join('/')
		const items = Array.isArray(exports.default) ? exports.default : [exports.default]
		wares.set(key, (wares.get(key) ?? []).concat(items as Middleware[]))
	}

	// Then load handlers (wares guaranteed available)

	const handlerFiles = import.meta.glob('/src/**/handler.{j,t}s{,x}') as Record<string, () => Promise<Record<string, unknown>>>
	const handlers = new Map<string, PageHandler>()

	for (const [file, loader] of Object.entries(handlerFiles)) {

		const exports = await loader()
		const segments = toSegments(file)
		const key = segments.join('/')

		const { default: routes, page, layout, ...actions } = exports
		handlers.set(key, { page, layout, actions } as PageHandler)

		if (routes) {
			for (const method of Object.keys(routes) as HttpMethod[]) {
				app[method](toPattern(segments), json(), ...collect(segments), wrap((routes as Record<HttpMethod, Handler>)[method]))
			}
		}
	}

	// Register pages

	for (const page of pages) {

		const { pattern, segments = [] } = page
		const path = `/${pattern || ''}`
		const wares = collect(segments)

		app.get(path, json(), ...wares, data(page), wrap(render(page)))
		app.post(path, action(segments), json(), ...wares, wrap(invoke()))
	}

	return app
}
