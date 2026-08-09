import { describe, expect, test } from 'vitest'
import { attach, reader, Reply, Router, request, send, type Headers, type Middleware } from '../src/http'

const stream = (...chunks: string[]) => ({
	async *[Symbol.asyncIterator]() {
		for (const chunk of chunks) yield new TextEncoder().encode(chunk)
	}
})

const req = (target: string, method = 'GET', headers: Headers = {}, chunks: string[] = []) =>
	request({ method, target, headers, read: reader(stream(...chunks)) })

const text = (reply: Reply) => typeof reply.body === 'string' ? reply.body : new TextDecoder().decode(reply.body)

describe('ajo-kit HTTP kernel', () => {
	test('routes literal, parameter, and wildcard paths and handles a miss', async () => {
		const app = new Router()
		app.get('/literal', (_, reply) => reply.end('literal'))
		app.get('/users/:id', (request, reply) => reply.end(request.params.id))
		app.get('/files/*', (request, reply) => reply.end(request.params['*']))

		expect(text(await app.handler(req('/literal')))).toBe('literal')
		expect(text(await app.handler(req('/users/a%20b')))).toBe('a b')
		expect(text(await app.handler(req('/files/a/b.txt')))).toBe('a/b.txt')

		const missing = await app.handler(req('/missing'))
		expect(missing.statusCode).toBe(404)
		expect(text(missing)).toBe('Not found')
	})

	test('normalizes targets, repeated query values, and header names', () => {
		const value = req('/search?q=one&q=two', 'post', { Accept: 'application/json' })

		expect(value).toMatchObject({
			method: 'POST',
			target: '/search?q=one&q=two',
			originalUrl: '/search?q=one&q=two',
			path: '/search',
			query: { q: ['one', 'two'] },
			headers: { accept: 'application/json' },
		})
	})

	test('runs middleware in order and sends next(error) through the 500 path', async () => {
		const order: string[] = []
		const around: Middleware = async (_, __, next) => {
			order.push('before')
			await next()
			order.push('after')
		}
		const app = new Router({
			error: (_, __, reply) => {
				order.push('error')
				reply.writeHead(500).end('masked')
			}
		})

		app.use(around)
		app.get('/ok', (_, reply) => { order.push('route'); reply.end('ok') })
		app.get('/fail', (_, __, next) => { order.push('fail'); next(new Error('boom')) })

		expect(text(await app.handler(req('/ok')))).toBe('ok')
		expect(order).toEqual(['before', 'route', 'after'])

		order.length = 0
		const failed = await app.handler(req('/fail'))
		expect(failed.statusCode).toBe(500)
		expect(text(failed)).toBe('masked')
		expect(order).toEqual(['before', 'fail', 'error', 'after'])
	})

	test('rejects a body over the selected read limit with 413 semantics', async () => {
		const app = new Router()
		app.post('/body', async (request, reply) => reply.end(await request.read(5)))

		const response = await app.handler(req('/body', 'POST', {}, ['123', '456']))
		expect(response.statusCode).toBe(413)
		expect(text(response)).toBe('Content Too Large')
	})

	test('keeps repeated response headers and suppresses HEAD and 204 bodies', () => {
		const reply = new Reply()
		reply.setHeader('Set-Cookie', ['one=1', 'two=2'])
		expect(reply.getHeader('set-cookie')).toEqual(['one=1', 'two=2'])

		const head = new Reply('HEAD')
		send(head, 200, 'hello')
		expect(head.body).toBeUndefined()
		expect(head.getHeader('content-length')).toBe(5)

		const empty = new Reply()
		empty.setHeader('Content-Type', 'text/plain').setHeader('Content-Length', 6).writeHead(204).end('hidden')
		expect(empty.body).toBeUndefined()
		expect(empty.hasHeader('content-type')).toBe(false)
		expect(empty.hasHeader('content-length')).toBe(false)
	})

	test('buffers SSE sends until attached and closes explicitly', async () => {
		const reply = new Reply()
		const events = reply.sse()
		const messages: string[] = []
		let closes = 0

		events.send('queued')
		attach(reply, {
			send: message => messages.push(message),
			close: () => { closes++ },
			closed: new Promise<void>(() => {}),
		})
		events.send('live')
		events.close()
		await events.closed

		expect(messages).toEqual(['queued', 'live'])
		expect(closes).toBe(1)
		expect(reply.writableEnded).toBe(true)
	})

	test('attaches SSE through a reply from another module graph', () => {
		const reply = new Reply()
		const messages: string[] = []
		let closes = 0

		const events = reply.sse()
		events.send('queued')
		// Models the structurally compatible Reply received from Vite's module graph.
		attach({ stream: reply.stream } as Reply, {
			send: message => messages.push(message),
			close: () => { closes++ },
			closed: new Promise<void>(() => {}),
		})
		events.close()

		expect(messages).toEqual(['queued'])
		expect(closes).toBe(1)
	})
})
