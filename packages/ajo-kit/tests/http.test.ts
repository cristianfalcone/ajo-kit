import { describe, expect, test } from 'vitest'
import { attach, reader, Reply, Router, request, type Headers, type Middleware } from '../src/http'
import { send } from '../src/server'

const stream = (...chunks: string[]) => ({
	async *[Symbol.asyncIterator]() {
		for (const chunk of chunks) yield new TextEncoder().encode(chunk)
	}
})

const req = (target: string, method = 'GET', headers: Headers = {}, chunks: string[] = []) =>
	request({ method, target, headers, read: reader(stream(...chunks)) })

const text = (reply: Reply) => typeof reply.body === 'string' ? reply.body : new TextDecoder().decode(reply.body)

// The Router has no default answers: the server supplies both.
const router = () => new Router({
	error: (error, _, reply) => reply.writeHead((error as { status?: number }).status ?? 500).end('failed'),
	missing: (_, reply) => reply.writeHead(404).end('missing'),
})

describe('ajo-kit HTTP kernel', () => {
	test('routes literal, parameter, and wildcard paths and handles a miss', async () => {
		const app = router()
		app.get('/literal', (_, reply) => reply.end('literal'))
		app.get('/users/:id', (request, reply) => reply.end(request.params.id))
		app.get('/files/*', (request, reply) => reply.end(request.params['*']))

		expect(text(await app.handler(req('/literal')))).toBe('literal')
		expect(text(await app.handler(req('/users/a%20b')))).toBe('a b')
		expect(text(await app.handler(req('/files/a/b.txt')))).toBe('a/b.txt')

		const missing = await app.handler(req('/missing'))
		expect(missing.statusCode).toBe(404)
		expect(text(missing)).toBe('missing')
	})

	test('dispatches only the first matching route and keeps its params alone', async () => {
		const app = router()
		const seen: string[] = []
		app.get('/notes/new', (request, _, next) => { seen.push(`new ${JSON.stringify(request.params)}`); next() })
		app.get('/notes/:id', (request, reply) => { seen.push(`id ${request.params.id}`); reply.end() })

		await app.handler(req('/notes/new'))

		expect(seen).toEqual(['new {}'])
	})

	test('normalizes targets, repeated query values, and header names', () => {
		const value = req('/search?q=one&q=two', 'post', { Accept: 'application/json' })

		expect(value).toMatchObject({
			method: 'POST',
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
			},
			missing: (_, reply) => reply.writeHead(404).end(),
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
		const app = router()
		app.post('/body', async (request, reply) => reply.end(await request.read(5)))

		const response = await app.handler(req('/body', 'POST', {}, ['123', '456']))
		expect(response.statusCode).toBe(413)
	})

	test('keeps repeated response headers and leaves the length to the host', () => {
		const reply = new Reply()
		reply.setHeader('Set-Cookie', ['one=1', 'two=2'])
		expect(reply.getHeader('set-cookie')).toEqual(['one=1', 'two=2'])

		send(reply, 200, 'héllo')
		expect(reply.body).toBe('héllo')
		expect(reply.getHeader('content-type')).toBe('text/plain')
		expect(reply.hasHeader('content-length')).toBe(false)
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
