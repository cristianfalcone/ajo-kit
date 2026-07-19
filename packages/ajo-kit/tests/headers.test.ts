import { afterEach, describe, expect, test } from 'vitest'
import * as headers from '../src/headers'

const app = process.env.APP_URL
const environment = process.env.NODE_ENV

const restore = (key: string, value: string | undefined) => {
	if (value === undefined) delete process.env[key]
	else process.env[key] = value
}

afterEach(() => {
	restore('APP_URL', app)
	restore('NODE_ENV', environment)
})

describe('ajo-kit response headers', () => {
	test('security headers add HSTS only for HTTPS production origins', () => {
		delete process.env.NODE_ENV
		delete process.env.APP_URL

		expect(headers.security()).not.toHaveProperty('Strict-Transport-Security')

		process.env.NODE_ENV = 'production'
		process.env.APP_URL = 'http://app.test'

		expect(headers.security()).not.toHaveProperty('Strict-Transport-Security')

		process.env.APP_URL = 'https://app.test'

		expect(headers.security()).toMatchObject({
			'X-Content-Type-Options': 'nosniff',
			'Referrer-Policy': 'strict-origin-when-cross-origin',
			'Content-Security-Policy': "frame-ancestors 'none'",
			'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
		})
	})

	test('set preserves existing headers when writing missing values only', () => {
		const store = new Map<string, string | number | readonly string[]>()
		const res = {
			setHeader(key: string, value: string | number | readonly string[]) {
				store.set(key.toLowerCase(), value)
			},
			hasHeader(key: string) {
				return store.has(key.toLowerCase())
			},
		}

		res.setHeader('Cache-Control', 'max-age=60')
		headers.set(res, {
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
		}, true)

		expect(store.get('cache-control')).toBe('max-age=60')
		expect(store.get('x-content-type-options')).toBe('nosniff')
	})
})
