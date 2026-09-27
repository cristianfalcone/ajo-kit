import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { csrf } from '../src/wares'
import { setOriginReader } from '../../ajo-kit/src/utils'

const app = process.env.APP_URL
const environment = process.env.NODE_ENV
const secret = process.env.APP_SECRET
const origins = process.env.AJO_ORIGINS_FILE

const restore = (key: string, value: string | undefined) => {
	if (value === undefined) delete process.env[key]
	else process.env[key] = value
}

afterEach(() => {
	restore('APP_URL', app)
	restore('NODE_ENV', environment)
	restore('APP_SECRET', secret)
	restore('AJO_ORIGINS_FILE', origins)
	setOriginReader(undefined)
})

/** Runs the middleware on a cookie-authenticated request; true when it reaches next(). */
const passes = (headers: Record<string, string>, extra: Record<string, unknown> = {}) => {
	const next = vi.fn()
	const req = { method: 'POST', path: '/account', user: { id: 1 }, session: { id: 'a' }, headers, ...extra }
	try {
		csrf(req as any, {} as any, next)
	} catch (error) {
		if ((error as Error).message !== 'Invalid CSRF token') throw error
		return false
	}
	return next.mock.calls.length === 1
}

describe('ajo-kit-auth csrf', () => {
	test('accepts only an exact same-origin Origin, or Referer when Origin is absent', () => {
		delete process.env.APP_URL
		process.env.NODE_ENV = 'development'

		expect(passes({ host: 'app.test', origin: 'http://app.test' })).toBe(true)
		expect(passes({ host: 'app.test', referer: 'http://app.test/account/profile' })).toBe(true)

		expect(passes({ host: 'app.test' })).toBe(false)
		expect(passes({ host: 'app.test', origin: 'https://evil.test' })).toBe(false)
		expect(passes({ host: 'app.test', origin: 'null' })).toBe(false)
		expect(passes({ host: 'app.test', origin: 'http://app.test.evil.test' })).toBe(false)
		expect(passes({ host: 'app.test', referer: 'https://evil.test/http://app.test' })).toBe(false)
	})

	test('a present Origin decides alone, so a same-origin Referer cannot rescue it', () => {
		delete process.env.APP_URL
		process.env.NODE_ENV = 'development'

		expect(passes({ host: 'app.test', origin: 'https://evil.test', referer: 'http://app.test/account' })).toBe(false)
		expect(passes({ host: 'app.test', origin: 'null', referer: 'http://app.test/account' })).toBe(false)
	})

	test('a session-signed double-submit token is no proof', () => {
		delete process.env.APP_URL
		process.env.NODE_ENV = 'development'
		process.env.APP_SECRET = 'csrf-test-secret'
		const signed = 'plain.' + createHmac('sha256', 'csrf-test-secret').update('a:plain').digest('hex')

		expect(passes({ host: 'app.test', cookie: 'XSRF-TOKEN=' + signed, 'x-xsrf-token': signed })).toBe(false)
	})

	test('skips bearer tokens, safe methods and unauthenticated API requests only', () => {
		const hostile = { host: 'app.test', origin: 'https://evil.test' }

		expect(passes(hostile, { token: { id: 't', abilities: [], subject: null } })).toBe(true)
		for (const method of ['GET', 'HEAD', 'OPTIONS']) expect(passes(hostile, { method })).toBe(true)
		expect(passes(hostile, { path: '/api/tokens', user: undefined, session: undefined })).toBe(true)

		expect(passes(hostile, { path: '/api/tokens' })).toBe(false)
		expect(passes(hostile, { method: 'DELETE' })).toBe(false)
	})

	test('compares against the admitted request origin', () => {
		process.env.APP_URL = 'https://app.test'

		expect(passes({ host: 'app.test', origin: 'https://app.test' })).toBe(true)
		expect(passes({ host: 'app.test', origin: 'http://app.test' })).toBe(false)
		expect(() => passes({ host: 'evil.test', origin: 'https://app.test' })).toThrow('Misdirected Request')
	})

	test('checks Origin against the admitted request Host for every alias', () => {
		process.env.NODE_ENV = 'production'
		process.env.APP_URL = 'https://app.test'
		process.env.AJO_ORIGINS_FILE = '/ajo/origin/origins.json'
		setOriginReader(() => JSON.stringify({
			schema: 'ajo.origins/v1',
			origins: ['https://app.test', 'https://alias.test'],
		}))

		expect(passes({ host: 'alias.test', origin: 'https://alias.test' })).toBe(true)
		expect(passes({ host: 'alias.test', origin: 'https://app.test' })).toBe(false)
		expect(passes({ host: 'app.test', origin: 'https://alias.test' })).toBe(false)
	})
})
