import { afterEach, describe, expect, test, vi } from 'vitest'
import { set, verify } from '../src/csrf'

const { credential } = vi.hoisted(() => ({
	credential: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',
}))

vi.mock('ajo-kit/platform', async importOriginal => ({
	...await importOriginal<typeof import('ajo-kit/platform')>(),
	randomBase64Url: () => credential,
}))

const app = process.env.APP_URL
const environment = process.env.NODE_ENV
const secret = process.env.APP_SECRET

const response = () => {
	const headers = new Map<string, string>()
	return {
		headers,
		res: {
			setHeader(name: string, value: string) {
				headers.set(name, value)
			},
		},
	}
}

const restore = (key: string, value: string | undefined) => {
	if (value === undefined) delete process.env[key]
	else process.env[key] = value
}

afterEach(() => {
	restore('APP_URL', app)
	restore('APP_SECRET', secret)
	restore('NODE_ENV', environment)
})

describe('ajo-kit-auth csrf', () => {
	test('sets Secure on csrf cookies in production', () => {
		process.env.NODE_ENV = 'production'
		process.env.APP_SECRET = 'test-production-secret-0000000000'
		const { headers, res } = response()

		set({ session: { id: 'session-a' } } as any, res as any)

		expect(headers.get('Set-Cookie')).toContain('; Secure')
	})

	test('accepts signed session-bound csrf and same-origin requests only', () => {
		const session = { session: { id: 'session-a' } }
		const other = { session: { id: 'session-b' } }
		const csrf = response()

		delete process.env.APP_URL
		process.env.NODE_ENV = 'development'
		process.env.APP_SECRET = 'slice-nine-vector-secret'

		const token = set(session as any, csrf.res as any)
		expect(token).toBe(
			credential + '.369875d77d4457a88c955f8cfea9cc41c240c48faf5d07455df9364e200af3ae'
		)

		expect(verify({
			...session,
			headers: {
				cookie: 'XSRF-TOKEN=' + token,
				'x-xsrf-token': token,
			},
		} as any)).toBe(true)

		expect(verify({
			...other,
			headers: {
				cookie: 'XSRF-TOKEN=' + token,
				'x-xsrf-token': token,
			},
		} as any)).toBe(false)

		expect(verify({
			...session,
			headers: {
				cookie: 'XSRF-TOKEN=abc',
				'x-xsrf-token': 'abc',
			},
		} as any)).toBe(false)

		expect(verify({
			headers: {
				host: 'app.test',
				cookie: 'not_XSRF-TOKEN=abc',
				'x-xsrf-token': 'abc',
			},
		} as any)).toBe(false)

		expect(verify({
			headers: {
				host: 'app.test',
				origin: 'http://app.test',
			},
		} as any)).toBe(true)

		expect(verify({
			headers: {
				host: 'app.test',
				referer: 'http://app.test/account/profile',
			},
		} as any)).toBe(true)

		expect(verify({
			headers: {
				host: 'app.test',
				origin: 'https://evil.test',
			},
		} as any)).toBe(false)

		process.env.APP_URL = 'https://app.test'
		expect(verify({
			headers: {
				host: 'evil.test',
				origin: 'https://app.test',
			},
		} as any)).toBe(true)
		expect(verify({
			headers: {
				host: 'app.test',
				origin: 'https://evil.test',
			},
		} as any)).toBe(false)
	})
})
