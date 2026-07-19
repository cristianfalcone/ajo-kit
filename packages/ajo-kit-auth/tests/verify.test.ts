import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sign, url, validate } from '../src/verify'

const environment = process.env.NODE_ENV
const secret = process.env.APP_SECRET

const restore = (key: string, value: string | undefined) => {
	if (value === undefined) delete process.env[key]
	else process.env[key] = value
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
})

afterEach(() => {
	restore('NODE_ENV', environment)
	restore('APP_SECRET', secret)
	vi.restoreAllMocks()
	vi.useRealTimers()
})

describe('ajo-kit-auth email verification', () => {
	test('signatures validate, reject tampering and expire', () => {
		const signature = sign(42)
		const [, expiry, value] = Buffer.from(signature, 'base64url').toString().split(':')
		const tampered = Buffer.from('43:' + expiry + ':' + value).toString('base64url')

		expect(validate(signature)).toBe(42)
		expect(validate(tampered)).toBeNull()
		expect(url(42, 'https://app.test')).toBe('https://app.test/verify/' + signature)

		vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1)
		expect(validate(signature)).toBeNull()
	})

	test('fails closed without a production secret', () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})

		process.env.NODE_ENV = 'production'
		delete process.env.APP_SECRET

		expect(() => sign(42)).toThrow('APP_SECRET must be set to a strong production secret')
		expect(() => validate('anything')).toThrow('APP_SECRET must be set to a strong production secret')

		process.env.APP_SECRET = 'change-in-production'
		expect(() => sign(42)).toThrow('APP_SECRET must be set to a strong production secret')

		process.env.APP_SECRET = 'your-secret-key'
		expect(() => sign(42)).toThrow('APP_SECRET must be set to a strong production secret')

		process.env.APP_SECRET = 'test-production-secret-0000000000'
		const signature = sign(42)

		expect(validate(signature)).toBe(42)
		expect(log).toHaveBeenCalledWith('[security] APP_SECRET must be set to a strong production secret')
	})
})
