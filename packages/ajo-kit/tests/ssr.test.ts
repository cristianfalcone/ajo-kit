// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { Stateful } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import * as ssr from '../src/ssr'
import type { Action, ActionContext, LayoutArgs, PageArgs, Request } from '../src/constants'
import type { Reply } from '../src/http'

describe('ajo-kit SSR payload', () => {
	test('ssr.serialize is safe inside script tags and round-trips values', () => {
		const value = {
			text: '</script><script>globalThis.__xss=1</script>',
			html: '<img src=x onerror=alert(1)>',
			ampersand: '&',
			line: '\u2028',
			paragraph: '\u2029',
			date: new Date('2026-06-19T00:00:00.000Z'),
			map: new Map([['key', 'value']]),
			set: new Set(['a', 'b']),
			big: 10n,
			missing: undefined,
		}

		const serialized = ssr.serialize(value)

		expect(serialized).not.toContain('</script>')
		expect(serialized).not.toContain('<img')
		expect(serialized).not.toContain('\u2028')
		expect(serialized).not.toContain('\u2029')

		const parsed = ssr.parse<typeof value>(serialized)

		expect(parsed.text).toBe(value.text)
		expect(parsed.html).toBe(value.html)
		expect(parsed.ampersand).toBe('&')
		expect(parsed.date).toEqual(value.date)
		expect(parsed.map.get('key')).toBe('value')
		expect(parsed.set.has('a')).toBe(true)
		expect(parsed.big).toBe(10n)
		expect('missing' in parsed).toBe(true)
		expect(parsed.missing).toBeUndefined()
	})

	test('ssr.script emits a data script, not executable boot code', () => {
		const script = ssr.script({ url: '/dashboard' })

		expect(script).toContain('type="application/json"')
		expect(script).toContain('id="__SSR__"')
		expect(script).not.toContain('globalThis.__SSR__')
	})
})

// Server-render a route through the real handler, then boot the real client
// entry over that DOM. Route modules wait on `gate`, so a test can hold the
// client between its first paint and the arrival of the route chunks.

let gate: Promise<unknown> = Promise.resolve()
let client: typeof import('../src/client') | undefined
let rename: Action<unknown> | undefined
const titles = new Map<string, string>()
const sources: { open: boolean }[] = []

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
			const { Missing } = await import('../src/constants')
			const { send } = await import('../src/http')
			return {
				page: async (req: Request) => {
					if (req.params.id === 'missing') throw new Missing()
					req.track?.('notes')
					return { title: titles.get(req.params.id) ?? req.params.id }
				},
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
			const { send } = await import('../src/http')
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

const start = async (path: string) => {

	vi.resetModules()

	const server = await import('../src/server')
	const http = await import('../src/http')
	const { navigate } = await import('../src/constants')
	const app = await server.create(({ root, data }) => `<div id="root">${root}</div>${data}`, registries)

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
		private end?: () => void
		constructor(target: string) {
			sources.push(this)
			void call(target, { headers: { accept: 'text/event-stream' } }).then(reply => {
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
		addEventListener() {}
		close() { this.end?.() }
	})

	history.replaceState(null, '', path)
	const page = await call(path, { headers: { accept: 'text/html' } })
	document.body.innerHTML = text(page)

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
