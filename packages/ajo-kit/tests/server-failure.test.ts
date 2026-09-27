import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { jsx } from 'ajo/jsx-runtime'
import { Failure, Missing } from '../src/utils'
import type { LayoutArgs, Parent } from '../src/utils'
import type { Request } from '../src/http'
import { handler } from '../src/node'

vi.mock('virtual:ajo/routes', () => ({ routes: {} }))
vi.mock('virtual:ajo/handlers', () => ({ handlers: {}, wares: {} }))

let server: Server
let origin: string

beforeAll(async () => {
	vi.stubEnv('NODE_ENV', 'production')
	const { create } = await import('../src/server')
	const app = await create('<html><head><!-- ssr:head --></head><body><!-- ssr:data --><!-- ssr:root --></body></html>', {
		routes: {
			'/src/layout.tsx': async () => ({
				default: ({ error, children }: Partial<LayoutArgs>) => error ? jsx('output', { children: error.message }) : children,
			}),
			'/src/[stage]/page.tsx': async () => ({ default: () => null }),
		},
		handlers: {
			'/src/handler.ts': async () => ({
				layout: async (req: Request) => {
					if (req.params.stage === 'layout') throw new Missing()
					return { inherited: true }
				},
			}),
			'/src/[stage]/handler.ts': async () => ({
				page: async (req: Request, parent: Parent) => {
					if (req.params.stage === 'page') throw new Missing()
					if (req.params.stage === 'error') throw new Failure(500, 'Private failure')
					return await parent()
				},
				head: async (req: Request) => {
					if (req.params.stage === 'head') throw new Missing()
					return { title: 'Ready' }
				},
			}),
		},
		wares: {},
	})
	server = createServer(handler(app)).listen(0, '127.0.0.1')
	await once(server, 'listening')
	const address = server.address()
	if (!address || typeof address === 'string') throw new Error('Expected a TCP port')
	origin = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
	vi.unstubAllEnvs()
	if (!server) return
	server.closeAllConnections()
	await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
})

describe('ajo-kit loader failure over HTTP', () => {
	for (const accept of ['application/json', 'text/html']) {
		test.each(['page', 'layout', 'head', 'error'])(`handles %s failure as ${accept} and continues serving requests`, async stage => {
			const failed = await fetch(`${origin}/${stage}`, { headers: { accept } })
			expect(failed.status).toBe(stage === 'error' ? 500 : 404)
			const message = stage === 'error' ? 'Internal Server Error' : 'Page not found'
			if (accept === 'application/json') {
				expect(await failed.json()).toEqual({ error: { status: failed.status, message } })
			} else {
				const html = await failed.text()
				expect(html).toContain(`<output>${message}</output>`)
				expect(html).not.toContain('Private failure')
			}

			const healthy = await fetch(`${origin}/ready`, { headers: { accept } })
			expect(healthy.status).toBe(200)
			if (accept === 'application/json') {
				expect(await healthy.json()).toMatchObject({ head: { title: 'Ready' }, data: [{ inherited: true }, { inherited: true }] })
			} else expect(await healthy.text()).toContain('<title>Ready</title>')
		})
	}
})

// A fresh module graph per handler: route registration is module state.
const serve = async (registries: Parameters<typeof import('../src/server')['create']>[1]) => {
	vi.resetModules()
	const { create } = await import('../src/server')
	const http = await import('../src/http')
	const app = await create('<head><!-- ssr:head --></head><!-- ssr:data --><!-- ssr:missing --><main><!-- ssr:root --></main>', registries)
	return async (target: string) => {
		const reply = await app(http.request({ method: 'GET', target, headers: { accept: 'text/html' }, read: async () => new Uint8Array() }))
		return { status: reply.statusCode, html: String(reply.body) }
	}
}

describe('ajo-kit route assembly', () => {
	test('a directory with a layout, a page and a head handler calls head once', async () => {
		let calls = 0
		const get = await serve({
			routes: {
				'/src/docs/layout.tsx': async () => ({ default: ({ children }: Partial<LayoutArgs>) => children }),
				'/src/docs/page.tsx': async () => ({ default: () => null }),
			},
			handlers: {
				'/src/docs/handler.ts': async () => ({
					layout: async () => ({}),
					page: async () => ({ note: '$&' }),
					head: async () => {
						calls++
						return { title: 'Docs' }
					},
				}),
			},
			wares: {},
		})

		const { status, html } = await get('/docs')

		expect(status).toBe(200)
		expect(calls).toBe(1)
		// Slots fill by split and join: a `$&` in the data stays literal and unknown slots drop.
		expect(html.startsWith('<head><!--ajo:head--><title>Docs</title><!--/ajo:head--></head><script type="application/json" id="__SSR__">')).toBe(true)
		expect(html).toContain('"note":"$&"')
		expect(html).not.toContain('ssr:')
	})

	// A parent can be read after its loader has already failed.
	test('parent() preserves an ancestor rejection for a later descendant', async () => {
		let failure: unknown
		let seen: unknown
		const get = await serve({
			routes: {
				'/src/layout.tsx': async () => ({ default: ({ children }: Partial<LayoutArgs>) => children }),
				'/src/deep/layout.tsx': async () => ({ default: ({ children }: Partial<LayoutArgs>) => children }),
				'/src/deep/page.tsx': async () => ({ default: () => null }),
			},
			handlers: {
				'/src/handler.ts': async () => {
					// The fresh graph's own class, so normalize() passes it through untouched.
					const { Missing } = await import('../src/utils')
					failure = new Missing()
					return { layout: async () => { throw failure } }
				},
				'/src/deep/handler.ts': async () => ({
					layout: async (_: Request, parent: Parent) => {
						await new Promise(resolve => setTimeout(resolve, 10))
						await parent().catch(error => { seen = error })
						return {}
					},
				}),
			},
			wares: {},
		})

		expect((await get('/deep')).status).toBe(404)
		await vi.waitFor(() => expect(seen).toBe(failure))
	})
})
