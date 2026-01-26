import { render as html } from 'ajo/html'
import type { Component } from 'ajo'
import polka from 'polka'
import type { Request, Response, Middleware } from 'polka'
import { json } from '@polka/parse'
import send from '@polka/send'
import App, { resolve, layouts, pages, error, toPattern, toSegments } from '/src/app'
import { AppError, links, ancestors, normalize } from '/src/constants'
import type { State, Data, Entry, Page, Context, Parent } from '/src/constants'
import { embed, pack } from '/src/serial'
import { merge, render as renderHead, type Head } from '/src/head'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'

type PageHandler = {
	page?: (req: Request, parent: Parent) => Promise<Entry>
	layout?: (req: Request, parent: Parent) => Promise<Entry>
	head?: (req: Request, parent: Parent) => Promise<Head>
	actions: Record<string, (req: Request, res: Response) => Promise<unknown>>
}

type Template = (slots: Record<string, string>) => string

export async function create(template: Template) {

	const data = (page: Page): Middleware => async (req, _, next) => {

		const url = req.originalUrl
		const { segments, loader } = page
		const params = req.params

		const paths = ancestors(segments).filter(path => layouts.has(path))
		const chain = links(paths.length + 1)

		const layoutTasks = paths.map(async (path, depth) => {

			const { parent, deferred } = chain[depth]

			try {
				const module = await layouts.get(path)?.()
				const handler = handlers.get(path)

				const [server, client] = await Promise.all([
					handler?.layout?.(req, parent),
					module?.handler?.({ url, params }, parent)
				])

				const entry = { ...server, ...client }
				deferred.resolve(entry)

				return { entry, module, handler }

			} catch (error) {
				deferred.reject(normalize(error))
				throw error
			}
		})

		const pageTask = (async () => {

			const depth = paths.length
			const { parent, deferred } = chain[depth]

			try {
				const module = await loader()
				const handler = handlers.get(segments.join('/'))

				const [server, client] = await Promise.all([
					handler?.page?.(req, parent),
					module?.handler?.({ url, params }, parent)
				])

				const entry = { ...server, ...client }
				deferred.resolve(entry)

				return { entry, module, handler }

			} catch (error) {
				deferred.reject(normalize(error))
				throw error
			}
		})()

		const [layoutResults, pageResult] = await Promise.all([
			Promise.all(layoutTasks),
			pageTask
		])

		const entries: Data = [...layoutResults.map(r => r.entry), pageResult.entry]

		const heads = await Promise.all([
			...layoutResults.map(async ({ module, handler, entry }) => {

				const context: Context = { url, params }
				const parent = async () => entry

				const [serverHead, clientHead] = await Promise.all([
					handler?.head?.(req, parent),
					module?.head?.(context, parent)
				])

				return merge(serverHead, clientHead)
			}),
			(async () => {

				const { module, handler, entry } = pageResult
				const context: Context = { url, params }
				const parent = async () => entry

				const [serverHead, clientHead] = await Promise.all([
					handler?.head?.(req, parent),
					module?.head?.(context, parent)
				])

				return merge(serverHead, clientHead)
			})()
		])

		req.data = entries
		req.head = merge(...heads)

		next()
	}

	// Core render logic - used by pages and error handlers

	const render = async (req: Request, res: Response, page: Page, error?: AppError) => {

		if (req.headers.accept?.includes('application/json')) {
			return send(res, error?.status ?? 200, pack(error ? { error } : { data: req.data, head: req.head }))
		}

		let resolved: { Page: Component; data?: State }

		for await (const state of resolve(req.originalUrl, layouts, page, req.data, error)) {
			resolved = state
		}

		send(
			res,
			resolved!.data?.error?.status ?? 200,
			template({
				head: renderHead(req.head),
				data: `<script>globalThis.__SSR__=${embed({ ...resolved!.data, head: req.head })}</script>`,
				root: html(<App page={resolved!.Page} />),
			}),
			{ 'Content-Type': 'text/html' }
		)
	}

	const action = (segments: string[]): Middleware => (req, _, next) => {

		const url = new URL(req.originalUrl, `http://${req.headers.host}`)
		const name = [...url.searchParams.keys()].find(key => key.startsWith('/'))?.slice(1)

		if (!name) throw new AppError(400, 'No action specified')

		for (const path of ancestors(segments).filter(path => handlers.has(path)).reverse()) {

			const invoke = handlers.get(path)?.actions[name]

			if (invoke) {
				req.action = { name, invoke }
				return next()
			}
		}

		throw new AppError(400, `Action '${name}' not found`)
	}

	// Handler factory: execute action and respond

	const invoke = (): Middleware => async (req, res) => {

		if (!req.action) return

		const result = await req.action.invoke(req, res) as { redirect?: string } | void

		if (req.headers.accept?.includes('application/json')) {
			const payload = result?.redirect ? { redirect: result.redirect } : (result ?? { ok: true })
			send(res, 200, pack(payload))
			return
		}

		res.statusCode = 302
		res.setHeader('Location', result?.redirect ?? req.originalUrl.split('?')[0])
		res.end()
	}

	const app = polka({
		onError: (err, req, res) => {
			if (!(err instanceof AppError)) console.error(err)
			render(req, res, error(), normalize(err))
		},
		onNoMatch: (req, res) => render(req, res, error(), new AppError(404, 'Not found'))
	})

	const collect = (segments: string[]): Middleware[] => ancestors(segments).flatMap(path => wares.get(path) ?? [])

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

		const { default: routes, page, layout, head, ...actions } = exports
		handlers.set(key, { page, layout, head, actions } as PageHandler)

		if (routes) {
			for (const method of Object.keys(routes) as HttpMethod[]) {
				app[method](toPattern(segments), json(), ...collect(segments), (routes as Record<HttpMethod, Middleware>)[method])
			}
		}
	}

	// Register pages

	for (const page of pages) {

		const { pattern, segments } = page
		const path = `/${pattern || ''}`
		const wares = collect(segments)

		app.get(path, json(), ...wares, data(page), (req, res) => render(req, res, page))
		app.post(path, action(segments), json(), ...wares, invoke())
	}

	return app
}
