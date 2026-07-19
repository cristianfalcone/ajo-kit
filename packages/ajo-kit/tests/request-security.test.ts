import { afterEach, describe, expect, test, vi } from 'vitest'
import { ip, origin } from '../src/constants'

const app = process.env.APP_URL
const environment = process.env.NODE_ENV
const proxy = process.env.TRUST_PROXY

const restore = (key: string, value: string | undefined) => {
	if (value === undefined) delete process.env[key]
	else process.env[key] = value
}

afterEach(() => {
	restore('APP_URL', app)
	restore('NODE_ENV', environment)
	restore('TRUST_PROXY', proxy)
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
})
