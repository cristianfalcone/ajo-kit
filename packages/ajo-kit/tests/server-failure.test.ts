import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { Failure, Missing, links } from '../src/constants'
import type { Parent, Request } from '../src/constants'
import { handler } from '../src/node'

vi.mock('virtual:ajo/routes', () => ({ routes: {} }))
vi.mock('virtual:ajo/handlers', () => ({ handlers: {}, wares: {} }))

let server: Server
let origin: string

beforeAll(async () => {
	vi.stubEnv('NODE_ENV', 'production')
	const { create } = await import('../src/server')
	const app = await create(({ head, root, data }) => `<html><head>${head}</head><body>${data}${root}</body></html>`, {
		routes: {
			'/src/layout.tsx': async () => ({ default: () => null }),
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
				expect(html).toContain(message)
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

// A parent can be read after its loader has already failed.
test('parent() preserves an ancestor rejection for a later descendant', async () => {
	const [ancestor, descendant] = links(2)
	const failure = new Missing()
	ancestor.deferred.reject(failure)
	await new Promise<void>(resolve => setImmediate(resolve))
	await expect(descendant.parent()).rejects.toBe(failure)
})
