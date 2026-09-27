import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { ip, origin, requestOrigin, setOriginReader } from '../src/constants'
import { handler } from '../src/node'

vi.mock('virtual:ajo/routes', () => ({ routes: {} }))
vi.mock('virtual:ajo/handlers', () => ({ handlers: {}, wares: {} }))

const app = process.env.APP_URL
const environment = process.env.NODE_ENV
const proxy = process.env.TRUST_PROXY
const origins = process.env.AJO_ORIGINS_FILE

const restore = (key: string, value: string | undefined) => {
	if (value === undefined) delete process.env[key]
	else process.env[key] = value
}

afterEach(() => {
	restore('APP_URL', app)
	restore('NODE_ENV', environment)
	restore('TRUST_PROXY', proxy)
	restore('AJO_ORIGINS_FILE', origins)
	setOriginReader(undefined)
	vi.restoreAllMocks()
})

describe('ajo-kit request security helpers', () => {
	test('uses forwarded client IPs only when proxy trust is explicit', () => {
		const req = {
			headers: { 'x-forwarded-for': '203.0.113.8, 10.0.0.1' },
			socket: { remoteAddress: '10.0.0.5' },
		} as any

		delete process.env.TRUST_PROXY
		expect(ip(req)).toBe('10.0.0.5')

		process.env.TRUST_PROXY = '1'
		expect(ip(req)).toBe('10.0.0.1')
		expect(ip({
			headers: { 'x-forwarded-for': '::ffff:127.0.0.1, bad' },
			socket: { remoteAddress: '10.0.0.5' },
		} as any)).toBe('10.0.0.5')
	})

	test('trusts only the last forwarded hop of a repeated header', () => {
		process.env.TRUST_PROXY = '1'
		expect(ip({
			headers: { 'x-forwarded-for': ['203.0.113.8', '198.51.100.7, 10.0.0.1'] },
			socket: { remoteAddress: '10.0.0.5' },
		} as any)).toBe('10.0.0.1')

		delete process.env.APP_URL
		process.env.NODE_ENV = 'development'
		const scheme = (value: string | string[]) =>
			origin({ headers: { host: 'local.test', 'x-forwarded-proto': value } } as any)
		expect(scheme('http, https')).toBe('https://local.test')
		expect(scheme(['http', 'https'])).toBe('https://local.test')
		expect(scheme('https, http')).toBe('http://local.test')
	})

	test('uses APP_URL as the trusted origin and requires it in production', () => {
		const req = {
			headers: {
				host: 'evil.test',
				'x-forwarded-proto': 'https',
			},
		} as any

		process.env.APP_URL = 'https://app.test/base'
		expect(origin(req)).toBe('https://app.test')

		delete process.env.APP_URL
		process.env.NODE_ENV = 'production'
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() => origin(req)).toThrow('APP_URL is required in production')
		expect(log).toHaveBeenCalledWith('[security] APP_URL is required in production')
		expect(origin({ headers: { host: 'localhost:5173' } } as any)).toBe('http://localhost:5173')
		expect(origin({ headers: { host: '127.0.0.1:5173' } } as any)).toBe('http://127.0.0.1:5173')

		log.mockClear()
		process.env.APP_URL = 'ftp://app.test'
		expect(() => origin(req)).toThrow('Invalid APP_URL')
		expect(log).toHaveBeenCalledWith('[security] Invalid APP_URL')

		process.env.NODE_ENV = 'development'
		process.env.TRUST_PROXY = '1'
		delete process.env.APP_URL
		expect(origin({ headers: { host: 'local.test', 'x-forwarded-proto': 'https' } } as any)).toBe('https://local.test')
	})

	test('binds each admitted request to its direct Host and closed origin manifest', () => {
		process.env.NODE_ENV = 'production'
		process.env.APP_URL = 'https://blog.panel.ajo.dev'
		process.env.AJO_ORIGINS_FILE = '/ajo/origin/origins.json'
		setOriginReader(() => JSON.stringify({
			schema: 'ajo.origins/v1',
			origins: ['https://blog.panel.ajo.dev', 'https://blog.example'],
		}))

		expect(requestOrigin({ headers: { host: 'blog.panel.ajo.dev' } } as any)).toBe('https://blog.panel.ajo.dev')
		expect(requestOrigin({ headers: { host: 'blog.example' } } as any)).toBe('https://blog.example')
		expect(() => requestOrigin({ headers: { host: 'evil.blog.example' } } as any)).toThrow('Misdirected Request')
		expect(() => requestOrigin({ headers: { host: ['blog.example', 'evil.test'] } } as any)).toThrow('Invalid Host header')
		expect(() => requestOrigin({ headers: { host: 'blog.example,evil.test' } } as any)).toThrow('Invalid Host header')
		expect(() => requestOrigin({ headers: { host: 'blog.example', 'x-forwarded-host': 'evil.test' } } as any)).not.toThrow()
	})

	test('returns the normalized manifest origin read from the fixed path', () => {
		process.env.NODE_ENV = 'production'
		process.env.APP_URL = 'https://blog.panel.ajo.dev'
		process.env.AJO_ORIGINS_FILE = '/tmp/origins.json'
		const reader = vi.fn(() => JSON.stringify({ schema: 'ajo.origins/v1', origins: ['HTTPS://Blog.Example:443'] }))
		setOriginReader(reader)

		expect(requestOrigin({ headers: { host: 'blog.example' } } as any)).toBe('https://blog.example')
		expect(reader).toHaveBeenCalledWith('/ajo/origin/origins.json', { maxBytes: 4096 })
		expect(() => requestOrigin({ headers: { host: 'blog.panel.ajo.dev' } } as any)).toThrow('Misdirected Request')
	})

	test('fails closed for a missing reader or a malformed manifest, never falling back to APP_URL', () => {
		process.env.NODE_ENV = 'production'
		process.env.APP_URL = 'https://blog.panel.ajo.dev'
		process.env.AJO_ORIGINS_FILE = '/ajo/origin/origins.json'
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})
		const admit = () => requestOrigin({ headers: { host: 'blog.panel.ajo.dev' } } as any)

		expect(admit).toThrow('Invalid origin manifest')
		setOriginReader(() => { throw new RangeError('too large') })
		expect(admit).toThrow('Invalid origin manifest')
		for (const value of [
			'',
			'null',
			'{}',
			JSON.stringify({ schema: 'ajo.origins/v2', origins: ['https://blog.panel.ajo.dev'] }),
			JSON.stringify({ schema: 'ajo.origins/v1', origins: 'https://blog.panel.ajo.dev' }),
			JSON.stringify({ schema: 'ajo.origins/v1', origins: ['https://blog.panel.ajo.dev', 1] }),
			JSON.stringify({ schema: 'ajo.origins/v1', origins: ['https://blog.panel.ajo.dev', 'not a url'] }),
		]) {
			setOriginReader(() => value)
			expect(admit).toThrow('Invalid origin manifest')
		}
		expect(log).toHaveBeenCalledWith('[security] Invalid origin manifest')
	})

	test('without the host manifest only the configured canonical Host is admitted', () => {
		process.env.APP_URL = 'https://app.test'
		delete process.env.AJO_ORIGINS_FILE
		expect(requestOrigin({ headers: { host: 'app.test' } } as any)).toBe('https://app.test')
		expect(() => requestOrigin({ headers: { host: 'alias.test' } } as any)).toThrow('Misdirected Request')
		delete process.env.APP_URL
		process.env.NODE_ENV = 'development'
		expect(requestOrigin({ headers: { host: 'localhost:5173' } } as any)).toBe('http://localhost:5173')
	})

})

describe('ajo-kit action lookup', () => {
	let server: Server
	let base: string
	const cookie = 'session=cookie-secret-value'

	beforeAll(async () => {
		const { create } = await import('../src/server')
		const app = await create(({ data, root }) => `${data}${root}`, {
			routes: {
				'/src/page.tsx': async () => ({ default: () => null }),
				'/src/child/page.tsx': async () => ({ default: () => null }),
			},
			handlers: {
				'/src/handler.ts': async () => ({ actions: { parent: async () => ({ ran: 'parent' }) } }),
				'/src/child/handler.ts': async () => ({ actions: { own: async () => ({ ran: 'own' }) } }),
			},
			wares: {},
		})
		server = createServer(handler(app)).listen(0, '127.0.0.1')
		await once(server, 'listening')
		const address = server.address()
		if (!address || typeof address === 'string') throw new Error('Expected a TCP port')
		base = `http://127.0.0.1:${address.port}`
	})

	afterAll(async () => {
		if (!server) return
		server.closeAllConnections()
		await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
	})

	const invoke = (name: string) => fetch(`${base}/child?/${name}`, {
		method: 'POST',
		headers: { accept: 'application/json', 'content-type': 'application/json', cookie },
		body: '{}',
	})

	test.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])('rejects the inherited name %s without echoing the request', async name => {
		const response = await invoke(name)
		expect(response.status).toBe(400)
		expect(await response.text()).not.toContain('cookie-secret-value')
	})

	test('runs declared and ancestor actions', async () => {
		for (const name of ['own', 'parent']) {
			const response = await invoke(name)
			expect(response.status).toBe(200)
			expect(await response.json()).toEqual({ ran: name })
		}
	})
})
