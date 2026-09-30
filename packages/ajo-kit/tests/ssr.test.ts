// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { Stateful } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import type { Action, ActionContext, LayoutArgs, PageArgs } from '../src/utils'
import { attach, type Reply, type Request } from '../src/http'

// Server-render a route through the real handler, then boot the real client
// entry over that DOM. Route modules wait on `gate`, so a test can hold the
// client between its first paint and the arrival of the route chunks.

let gate: Promise<unknown> = Promise.resolve()
let client: typeof import('../src/client') | undefined
let rename: Action<unknown> | undefined
const titles = new Map<string, string>()
const sources: { url: string; open: boolean; closed: boolean; drop: () => void; connect: () => void }[] = []

const later = (module: object) => async () => {
	await gate
	return module as never
}

const Root = ({ error, children }: LayoutArgs) =>
	jsx('main', { children: [error && jsx('output', { children: error.message }), children] })

const Notes = ({ params, children }: LayoutArgs) =>
	jsx('section', { children: [jsx('nav', { children: `active ${params.id ?? 'none'}` }), children] })

const Note: Stateful<PageArgs<{ title: string }>> = function* () {
	// The server renders without the client entry; the booted page gets a live action.
	rename = client?.action('rename')
	for (const { params, data } of this) yield jsx('article', { children: `note ${params.id}: ${data?.title}` })
}

const Fresh = ({ params }: PageArgs) => jsx('article', { children: `new ${JSON.stringify(params)}` })

const registries = {
	// Glob order: `[id]` sorts before `new`, so specificity has to come from the router.
	routes: {
		'/src/layout.tsx': later({ default: Root }),
		'/src/notes/layout.tsx': later({ default: Notes }),
		'/src/notes/[id]/page.tsx': later({ default: Note }),
		'/src/notes/new/page.tsx': later({ default: Fresh }),
	},
	handlers: {
		'/src/notes/[id]/handler.ts': async () => {
			const { Missing } = await import('../src/utils')
			const { send } = await import('../src/server')
			return {
				page: async (req: Request) => {
					if (req.params.id === 'missing') throw new Missing()
					req.track?.('notes')
					return { title: titles.get(req.params.id) ?? req.params.id }
				},
				head: async (req: Request) => ({
					title: `Note ${req.params.id}`,
					meta: [{ name: 'description', content: `About ${req.params.id}` }],
				}),
				actions: {
					rename: async (req: Request, _: Reply, { emit }: ActionContext) => {
						titles.set(req.params.id, req.body.title)
						emit('notes')
						return { ok: true }
					},
				},
				default: { get: (req: Request, res: Reply) => send(res, 200, `id ${req.params.id}`) },
			}
		},
		'/src/notes/new/handler.ts': async () => {
			const { send } = await import('../src/server')
			return {
				page: async (req: Request) => ({ kind: 'new', params: { ...req.params } }),
				default: { get: (req: Request, res: Reply) => send(res, 200, `new ${JSON.stringify(req.params)}`) },
			}
		},
	},
	wares: {},
}

const text = (reply: Reply) => typeof reply.body === 'string' ? reply.body : new TextDecoder().decode(reply.body)

const ready = () => document.documentElement.dataset.ajoReady

// Template head tags on both sides of the route's managed range.
const template = '<meta name="viewport" content="static">'
const late = '<link rel="icon" href="/icon.svg">'

const start = async (path: string) => {

	vi.resetModules()

	const server = await import('../src/server')
	const http = await import('../src/http')
	const { navigate } = await import('../src/utils')
	const app = await server.create(`<head>${template}<!-- ssr:head -->${late}</head><body><div id="root"><!-- ssr:root --></div><!-- ssr:data --></body>`, registries)

	const call = (target: string, init: RequestInit = {}) => {
		const url = new URL(target, location.href)
		const body = new TextEncoder().encode(typeof init.body === 'string' ? init.body : '')
		return app(http.request({
			method: init.method ?? 'GET',
			target: url.pathname + url.search,
			headers: { ...Object.fromEntries(new Headers(init.headers)), 'content-length': String(body.byteLength) },
			read: http.reader((async function* () { yield body })()),
		}))
	}

	// fetch and EventSource reach the same handler the page was rendered by.
	vi.stubGlobal('fetch', async (target: string, init?: RequestInit) => {
		const reply = await call(String(target), init)
		const empty = reply.statusCode === 204 || reply.statusCode === 304
		return new Response(empty ? null : text(reply), { status: reply.statusCode })
	})

	vi.stubGlobal('EventSource', class {
		onopen?: () => void
		onmessage?: (event: { data: string }) => void
		onerror?: () => void
		open = false
		closed = false
		private end?: () => void
		constructor(readonly url: string) {
			sources.push(this)
			this.connect()
		}
		// Like a browser after a dropped connection, a reconnect sends a fresh request on the same source.
		connect() {
			void call(this.url, { headers: { accept: 'text/event-stream' } }).then(reply => {
				if (!reply.stream) return
				http.attach(reply, {
					send: chunk => {
						const data = /^data: (.*)$/m.exec(chunk)?.[1]
						if (data) this.onmessage?.({ data })
					},
					close: () => {},
					closed: new Promise<void>(resolve => this.end = resolve),
				})
				this.open = true
				this.onopen?.()
			})
		}
		drop() {
			this.end?.()
			this.open = false
			this.onerror?.()
		}
		addEventListener() {}
		close() {
			this.closed = true
			this.end?.()
		}
	})

	history.replaceState(null, '', path)
	const page = await call(path, { headers: { accept: 'text/html' } })
	document.documentElement.innerHTML = text(page)

	return { server, call, navigate, root: document.getElementById('root')! }
}

afterEach(async () => {
	;(await import('../src/server')).closeLive()
	// Removing the root unmounts App, which closes its stream and router.
	document.body.innerHTML = ''
	delete document.documentElement.dataset.ajoReady
	await new Promise(resolve => setTimeout(resolve))
	gate = Promise.resolve()
	client = undefined
	rename = undefined
	titles.clear()
	sources.length = 0
	vi.unstubAllGlobals()
})

describe('ajo-kit SSR payload', () => {
	const state = () => JSON.parse(document.getElementById('__SSR__')!.textContent!)

	test('SSR state containing </script> and U+2028 embeds as inert JSON', async () => {
		const title = '</script><script>globalThis.__xss=1</script>\u2028\u2029<!--'
		titles.set('7', title)
		const { call } = await start('/notes/7')
		const html = text(await call('/notes/7', { headers: { accept: 'text/html' } }))
		const script = /<script type="application\/json" id="__SSR__">(.*?)<\/script>/s.exec(html)![1]

		expect(script).not.toContain('<')
		expect(script).not.toContain('\u2028')
		expect(script).not.toContain('\u2029')
		expect(JSON.parse(script).data.at(-1)).toEqual({ title })
		expect(state().data.at(-1)).toEqual({ title })
		expect((globalThis as { __xss?: number }).__xss).toBeUndefined()
	})

	test('SSR, route JSON and a live update deliver the same payload for the same loader', async () => {
		const { server, call } = await start('/notes/7')
		const pick = ({ data, head, hash, topics, versions, scope }: Record<string, unknown>) => ({ data, head, hash, topics, versions, scope })
		const json = async () => JSON.parse(text(await call('/notes/7', { headers: { accept: 'application/json' } })))

		expect(pick(await json())).toEqual(pick(state()))
		expect(state().head).toEqual({ title: 'Note 7', meta: [{ name: 'description', content: 'About 7' }] })

		const messages: string[] = []
		attach(await call('/notes/7', { headers: { accept: 'text/event-stream' } }), {
			send: chunk => messages.push(chunk),
			close: () => {},
			closed: new Promise<void>(() => {}),
		})

		titles.set('7', 'Seven')
		server.emit('notes')
		await vi.waitFor(() => expect(messages).toHaveLength(1))

		const live = JSON.parse(/^data: (.*)$/m.exec(messages[0])![1])

		expect(live.data.at(-1)).toEqual({ title: 'Seven' })
		expect(pick(live)).toEqual(pick(await json()))
	})
})

describe('ajo-kit client boot over SSR', () => {
	test('adopts the SSR route while its modules load, with params, then navigates, acts and updates live', async () => {
		const { server, navigate, root } = await start('/notes/7')
		const html = root.innerHTML
		const article = root.querySelector('article')!
		const nav = root.querySelector('nav')!

		expect(article.textContent).toBe('note 7: 7')
		expect(nav.textContent).toBe('active 7')

		let open!: () => void
		gate = new Promise<void>(resolve => open = resolve)
		client = await import('../src/client')
		await new Promise(resolve => setTimeout(resolve, 20))

		expect(article.isConnected).toBe(true)
		expect(root.innerHTML).toBe(html)
		expect(ready()).toBeUndefined()

		open()
		await vi.waitFor(() => expect(ready()).toBe('true'))

		expect(article.isConnected).toBe(true)
		expect(nav.isConnected).toBe(true)
		expect(root.innerHTML).toBe(html)

		// The booted route connects its live stream without a second navigation.
		await vi.waitFor(() => expect(sources.map(source => source.open)).toEqual([true]))
		titles.set('7', 'Seven')
		server.emit('notes')
		await vi.waitFor(() => expect(article.textContent).toBe('note 7: Seven'))

		expect(await rename!.invoke({ title: 'Renamed' })).toEqual({ ok: true, topics: ['notes'], versions: expect.any(Object) })
		await vi.waitFor(() => expect(article.textContent).toBe('note 7: Renamed'))

		navigate('/notes/a%20b')
		await vi.waitFor(() => expect(root.querySelector('article')!.textContent).toBe('note a b: a b'))
		expect(root.querySelector('nav')!.textContent).toBe('active a b')
	})

	test('an SSR error page hydrates to the tree the server rendered', async () => {
		const { root } = await start('/notes/missing')
		const html = root.innerHTML
		const output = root.querySelector('output')!

		expect(output.textContent).toBe('Page not found')

		client = await import('../src/client')
		await vi.waitFor(() => expect(ready()).toBe('true'))

		expect(output.isConnected).toBe(true)
		expect(root.innerHTML).toBe(html)
	})

	test('a failed route import leaves the SSR DOM in place and the app not ready', async () => {
		const { root } = await start('/notes/7')
		const html = root.innerHTML
		const article = root.querySelector('article')!
		const failure = new Error('Route chunk failed')
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

		gate = Promise.reject(failure)
		gate.catch(() => {})
		client = await import('../src/client')

		await vi.waitFor(() => expect(logged).toHaveBeenCalledWith(failure))
		expect(article.isConnected).toBe(true)
		expect(root.innerHTML).toBe(html)
		expect(ready()).toBeUndefined()
	})

	test('a static sibling wins over a param route in SSR, route JSON, API and client navigation', async () => {
		const { call, navigate, root } = await start('/notes/new')

		expect(root.querySelector('article')!.textContent).toBe('new {}')
		expect(root.querySelector('nav')!.textContent).toBe('active none')

		const json = JSON.parse(text(await call('/notes/new', { headers: { accept: 'application/json' } })))
		expect(json.data.at(-1)).toEqual({ kind: 'new', params: {} })
		expect(text(await call('/api/notes/new'))).toBe('new {}')
		expect(text(await call('/api/notes/7'))).toBe('id 7')

		client = await import('../src/client')
		await vi.waitFor(() => expect(ready()).toBe('true'))

		navigate('/notes/7')
		await vi.waitFor(() => expect(root.querySelector('article')!.textContent).toBe('note 7: 7'))

		navigate('/notes/new')
		await vi.waitFor(() => expect(root.querySelector('article')!.textContent).toBe('new {}'))
	})
})

describe('ajo-kit client navigation', () => {
	test('navigation replaces the route head tags and leaves the template head alone', async () => {
		const { navigate, root } = await start('/notes/7')
		const [viewport, icon] = [document.head.firstElementChild!, document.head.lastElementChild!]

		expect(document.title).toBe('Note 7')
		expect(document.head.innerHTML).toBe(`${template}<!--ajo:head--><title>Note 7</title><meta name="description" content="About 7"><!--/ajo:head-->${late}`)

		client = await import('../src/client')
		await vi.waitFor(() => expect(ready()).toBe('true'))

		navigate('/notes/new')
		await vi.waitFor(() => expect(root.querySelector('article')!.textContent).toBe('new {}'))
		expect(document.head.innerHTML).toBe(`${template}<!--ajo:head--><!--/ajo:head-->${late}`)

		navigate('/notes/8')
		await vi.waitFor(() => expect(document.title).toBe('Note 8'))
		expect(document.head.innerHTML).toBe(`${template}<!--ajo:head--><title>Note 8</title><meta name="description" content="About 8"><!--/ajo:head-->${late}`)
		expect(document.head.firstElementChild).toBe(viewport)
		expect(document.head.lastElementChild).toBe(icon)
	})

	test('the live stream opens only on routes that track topics', async () => {
		const { navigate, root } = await start('/notes/new')

		client = await import('../src/client')
		await vi.waitFor(() => expect(ready()).toBe('true'))
		await new Promise(resolve => setTimeout(resolve, 20))
		expect(sources).toEqual([])

		navigate('/notes/7')
		await vi.waitFor(() => expect(sources.map(({ url, open }) => ({ url, open }))).toEqual([{ url: '/notes/7', open: true }]))

		navigate('/notes/new')
		await vi.waitFor(() => expect(root.querySelector('article')!.textContent).toBe('new {}'))
		await vi.waitFor(() => expect(sources[0].closed).toBe(true))
		expect(sources).toHaveLength(1)
	})

	test('an unknown same-origin link loads from the server on every click', async () => {
		const { root } = await start('/notes/7')
		const article = root.querySelector('article')!
		const reload = vi.spyOn(location, 'reload').mockImplementation(() => {})

		client = await import('../src/client')
		await vi.waitFor(() => expect(ready()).toBe('true'))

		const link = document.createElement('a')
		link.href = '/api/notes/7'
		document.body.append(link)
		link.click()

		expect(location.pathname).toBe('/api/notes/7')
		expect(reload).toHaveBeenCalledOnce()

		// A download leaves the document in place, so a second click, or a
		// sibling at the same path, still goes to the server.
		link.click()
		expect(reload).toHaveBeenCalledTimes(2)
		link.href = '/api/notes/7?format=json'
		link.click()
		expect(reload).toHaveBeenCalledTimes(3)

		await new Promise(resolve => setTimeout(resolve, 20))
		expect(article.isConnected).toBe(true)
		expect(root.querySelector('output')).toBeNull()
	})

	test('back leaves the scroll position the browser restored', async () => {
		const { navigate, root } = await start('/notes/7')

		client = await import('../src/client')
		await vi.waitFor(() => expect(ready()).toBe('true'))

		navigate('/notes/8')
		await vi.waitFor(() => expect(root.querySelector('article')!.textContent).toBe('note 8: 8'))
		await new Promise(resolve => setTimeout(resolve, 50))

		// The browser restores the previous entry's position as it traverses.
		addEventListener('popstate', () => scrollTo(0, 400), { once: true })
		history.back()

		await vi.waitFor(() => expect(root.querySelector('article')!.textContent).toBe('note 7: 7'))
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(scrollY).toBe(400)
	})

	test('an emit before the stream first opens shows once it opens', async () => {
		const { server, root } = await start('/notes/7')
		const article = root.querySelector('article')!

		// Another tab changes the route after this page's data was rendered and
		// before its stream subscribed, so no subscriber heard the emit.
		titles.set('7', 'Earlier')
		server.emit('notes')

		client = await import('../src/client')
		await vi.waitFor(() => expect(sources.map(source => source.open)).toEqual([true]))
		await vi.waitFor(() => expect(article.textContent).toBe('note 7: Earlier'))
	})

	test('an emit while the stream was down shows after it reconnects', async () => {
		const { server, root } = await start('/notes/7')
		const article = root.querySelector('article')!

		client = await import('../src/client')
		await vi.waitFor(() => expect(sources.map(source => source.open)).toEqual([true]))

		sources[0].drop()
		titles.set('7', 'Offline')
		server.emit('notes')
		await new Promise(resolve => setTimeout(resolve, 20))
		expect(article.textContent).toBe('note 7: 7')

		sources[0].connect()
		await vi.waitFor(() => expect(article.textContent).toBe('note 7: Offline'))
	})
})

describe('ajo-kit client at an unknown path', () => {
	test('a fragment on the SSR 404 page stays on the client', async () => {
		const { root } = await start('/nope')
		const reload = vi.spyOn(location, 'reload').mockImplementation(() => {})

		expect(root.querySelector('output')!.textContent).toBe('Not found')

		client = await import('../src/client')
		await vi.waitFor(() => expect(ready()).toBe('true'))

		// A fragment link or back between fragments fires popstate at the same path.
		history.pushState(null, '', '#main')
		dispatchEvent(new PopStateEvent('popstate'))

		await new Promise(resolve => setTimeout(resolve, 20))
		expect(reload).not.toHaveBeenCalled()
		await vi.waitFor(() => expect(root.querySelector('output')?.textContent).toBe('Not found'))
	})

	test('a client booted without SSR state renders the error page instead of reloading', async () => {
		const { root } = await start('/nope')
		const reload = vi.spyOn(location, 'reload').mockImplementation(() => {})

		document.getElementById('__SSR__')!.remove()
		client = await import('../src/client')
		await vi.waitFor(() => expect(ready()).toBe('true'))

		await new Promise(resolve => setTimeout(resolve, 20))
		expect(reload).not.toHaveBeenCalled()
		await vi.waitFor(() => expect(root.querySelector('output')?.textContent).toBe('Not found'))
	})
})
