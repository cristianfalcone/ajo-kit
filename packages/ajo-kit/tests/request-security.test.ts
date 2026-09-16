import { afterEach, describe, expect, test, vi } from 'vitest'
import { ip, origin, requestOrigin, setOriginReader } from '../src/constants'

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
		expect(ip(req)).toBe('203.0.113.8')
		expect(ip({
			headers: { 'x-forwarded-for': 'bad, ::ffff:127.0.0.1' },
			socket: { remoteAddress: '10.0.0.5' },
		} as any)).toBe('10.0.0.5')
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

	test('requires APP_URL to be the exact canonical HTTPS origin in managed mode', () => {
		process.env.NODE_ENV = 'production'
		process.env.AJO_ORIGINS_FILE = '/ajo/origin/origins.json'
		for (const configured of [
			'https://blog.panel.ajo.dev/',
			'https://blog.panel.ajo.dev/path',
			'https://blog.panel.ajo.dev?query=1',
			'https://blog.panel.ajo.dev#fragment',
			'https://user@blog.panel.ajo.dev',
			'https://blog.panel.ajo.dev:443',
			'http://blog.panel.ajo.dev',
		]) {
			process.env.APP_URL = configured
			const canonical = new URL(configured).origin
			setOriginReader(() => JSON.stringify({
				schema: 'ajo.origins/v1',
				origins: [canonical],
			}))
			expect(() => requestOrigin({ headers: { host: 'blog.panel.ajo.dev' } } as any))
				.toThrow('Invalid APP_URL')
		}
	})

	test('fails closed for missing, malformed or unbound host manifests', () => {
		process.env.NODE_ENV = 'production'
		process.env.APP_URL = 'https://blog.panel.ajo.dev'
		process.env.AJO_ORIGINS_FILE = '/ajo/origin/origins.json'
		const values = [
			'',
			'{}',
			JSON.stringify({ schema: 'ajo.origins/v1', origins: ['https://blog.example'] }),
			JSON.stringify({ schema: 'ajo.origins/v1', origins: ['https://blog.panel.ajo.dev'], extra: true }),
			JSON.stringify({ schema: 'ajo.origins/v1', origins: ['http://blog.panel.ajo.dev'] }),
			JSON.stringify({ schema: 'ajo.origins/v1', origins: ['https://blog.panel.ajo.dev/path'] }),
			'{"schema":"ajo.origins/v1","schema":"ajo.origins/v1","origins":["https://blog.panel.ajo.dev"]}',
			'{"\\u0073chema":"ajo.origins/v1","schema":"ajo.origins/v1","origins":["https://blog.panel.ajo.dev"]}',
		]
		for (const value of values) {
			setOriginReader(() => value)
			expect(() => requestOrigin({ headers: { host: 'blog.panel.ajo.dev' } } as any)).toThrow('Invalid origin manifest')
		}
		process.env.AJO_ORIGINS_FILE = '/tmp/origins.json'
		expect(() => requestOrigin({ headers: { host: 'blog.panel.ajo.dev' } } as any)).toThrow('Invalid AJO_ORIGINS_FILE')
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
