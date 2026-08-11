import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import type { Handler, Middleware, Reply, Request } from '../src/http'
import { attach, request } from '../src/http'

vi.mock('virtual:ajo/routes', () => ({ routes: {} }))
vi.mock('virtual:ajo/handlers', () => ({ handlers: {}, wares: {} }))

const identity: Middleware = (req, _res, next) => {
	const session = req.headers['x-test-session']
	if (typeof session === 'string') req.session = { id: session }
	next()
}

let app: Handler
let closeLive: () => void

beforeAll(async () => {
	const server = await import('../src/server')
	closeLive = server.closeLive
	app = await server.create(() => '', {
		routes: {
			'/src/live/page.tsx': async () => ({ default: () => null }),
			'/src/plain/page.tsx': async () => ({ default: () => null }),
		},
		handlers: {
			'/src/live/handler.ts': async () => ({
				page: async (req: Request) => {
					req.track?.('live')
					return { ok: true }
				},
			}),
			'/src/plain/handler.ts': async () => ({
				page: async () => ({ ok: true }),
			}),
		},
		wares: {
			'/src/wares.ts': async () => ({ default: identity }),
		},
	})
})

afterEach(() => closeLive())

const open = (path: string, session?: string, remoteAddress = '203.0.113.10') => app(request({
	method: 'GET',
	target: path,
	headers: {
		accept: 'text/event-stream',
		...(session && { 'x-test-session': session }),
	},
	remoteAddress,
	read: async () => new Uint8Array(),
}))

const close = async (replies: Reply[]) => {
	const closed = replies.map(reply => reply.stream!.closed)
	replies.forEach(reply => reply.stream!.close())
	await Promise.all(closed)
}

const disconnect = async (replies: Reply[]) => {
	const failures: Array<() => void> = []

	for (const reply of replies) {
		const closed = new Promise<void>((_, reject) => failures.push(() => reject(new Error('disconnected'))))
		attach(reply, { send: () => {}, close: () => {}, closed })
	}

	const closed = replies.map(reply => reply.stream!.closed)
	failures.forEach(fail => fail())
	await Promise.all(closed)
}

describe('ajo-kit live stream admission', () => {
	test('refuses an anonymous topicless SSE upgrade', async () => {
		const reply = await open('/plain')

		expect(reply.statusCode).toBe(204)
		expect(reply.getHeader('cache-control')).toBe('no-store')
		expect(reply.stream).toBeUndefined()
	})

	test('streams an authenticated route that tracks a topic', async () => {
		const reply = await open('/live', 'session-a')

		expect(reply.statusCode).toBe(200)
		expect(reply.getHeader('content-type')).toBe('text/event-stream')
		expect(reply.stream).toBeDefined()

		await close([reply])
	})

	test('caps one principal at eight streams and releases every abnormal disconnect', async () => {
		const admitted = await Promise.all(Array.from({ length: 8 }, () => open('/live', 'session-a')))
		const refused = await open('/live', 'session-a')

		expect(admitted.every(reply => reply.statusCode === 200 && reply.stream)).toBe(true)
		expect(refused.statusCode).toBe(429)
		expect(refused.getHeader('retry-after')).toBe('30')
		expect(refused.stream).toBeUndefined()

		await disconnect(admitted)

		const restored = await Promise.all(Array.from({ length: 8 }, () => open('/live', 'session-a')))
		expect(restored.every(reply => reply.statusCode === 200 && reply.stream)).toBe(true)
		expect((await open('/live', 'session-a')).statusCode).toBe(429)

		await close(restored)
	})

	test('caps the process at 128 streams and returns every slot after closure', async () => {
		const fill = () => Promise.all(Array.from(
			{ length: 128 },
			(_, index) => open('/live', `session-${index}`),
		))

		const admitted = await fill()
		const refused = await open('/live', 'overflow')

		expect(admitted.every(reply => reply.statusCode === 200 && reply.stream)).toBe(true)
		expect(refused.statusCode).toBe(503)
		expect(refused.getHeader('retry-after')).toBe('30')
		expect(refused.stream).toBeUndefined()

		await close(admitted)

		const restored = await fill()
		expect(restored.every(reply => reply.statusCode === 200 && reply.stream)).toBe(true)
		expect((await open('/live', 'overflow')).statusCode).toBe(503)

		await close(restored)
	})
})
