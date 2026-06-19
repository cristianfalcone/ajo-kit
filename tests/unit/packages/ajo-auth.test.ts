import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { read, write, clear as clearCookie } from '../../../packages/ajo-auth/src/cookie'
import { verify as verifyCsrf } from '../../../packages/ajo-auth/src/csrf'
import { check as checkLimit, clear as clearLimit, hit, remaining } from '../../../packages/ajo-auth/src/limit'
import { stamp, check as checkConfirm, clear as clearConfirm } from '../../../packages/ajo-auth/src/confirm'
import { sign, url, validate } from '../../../packages/ajo-auth/src/verify'
import { can } from '../../../packages/ajo-auth/src/token'
import { hash, verify } from '../../../packages/ajo-auth/src/password'

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

describe('ajo-auth cookies and csrf', () => {
	test('writes, reads and clears the session cookie with safe defaults', () => {
		const { headers, res } = response()

		write(res as any, 'session-token', true)

		expect(headers.get('Set-Cookie')).toBe('session=session-token; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000')
		expect(read({ headers: { cookie: 'theme=dark; session=session-token' } } as any)).toBe('session-token')

		clearCookie(res as any)

		expect(headers.get('Set-Cookie')).toBe('session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
	})

	test('accepts double-submit csrf and same-origin requests only', () => {
		expect(verifyCsrf({
			headers: {
				cookie: 'XSRF-TOKEN=abc',
				'x-xsrf-token': 'abc',
			},
		} as any)).toBe(true)

		expect(verifyCsrf({
			headers: {
				host: 'app.test',
				origin: 'https://app.test',
			},
		} as any)).toBe(true)

		expect(verifyCsrf({
			headers: {
				host: 'app.test',
				referer: 'https://app.test/account/profile',
			},
		} as any)).toBe(true)

		expect(verifyCsrf({
			headers: {
				host: 'app.test',
				origin: 'https://evil.test',
			},
		} as any)).toBe(false)
	})
})

describe('ajo-auth in-memory gates', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
	})

	afterEach(() => {
		clearLimit('login:test')
		clearConfirm(123)
		vi.useRealTimers()
	})

	test('rate limit check/hit/remaining/reset follows the configured window', () => {
		expect(checkLimit('login:test', 2)).toBe(true)
		expect(remaining('login:test', 2)).toBe(2)

		hit('login:test', 1000)
		expect(remaining('login:test', 2)).toBe(1)
		expect(checkLimit('login:test', 2)).toBe(true)

		hit('login:test', 1000)
		expect(remaining('login:test', 2)).toBe(0)
		expect(checkLimit('login:test', 2)).toBe(false)

		vi.advanceTimersByTime(1001)
		expect(checkLimit('login:test', 2)).toBe(true)
		expect(remaining('login:test', 2)).toBe(2)
	})

	test('password confirmation expires and can be cleared', () => {
		expect(checkConfirm(123, 1000)).toBe(false)

		stamp(123)
		expect(checkConfirm(123, 1000)).toBe(true)

		vi.advanceTimersByTime(1001)
		expect(checkConfirm(123, 1000)).toBe(false)

		stamp(123)
		clearConfirm(123)
		expect(checkConfirm(123, 1000)).toBe(false)
	})
})

describe('ajo-auth tokens and signatures', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
	})

	afterEach(() => vi.useRealTimers())

	test('ability checks support exact, resource wildcard and full wildcard grants', () => {
		expect(can(['read'], 'read')).toBe(true)
		expect(can(['tokens:*'], 'tokens:delete')).toBe(true)
		expect(can(['*'], 'anything')).toBe(true)
		expect(can(['read'], 'write')).toBe(false)
	})

	test('email verification signatures validate, reject tampering and expire', () => {
		const signature = sign(42)
		const [, expiry, sig] = Buffer.from(signature, 'base64url').toString().split(':')
		const tampered = Buffer.from(`43:${expiry}:${sig}`).toString('base64url')

		expect(validate(signature)).toBe(42)
		expect(validate(tampered)).toBeNull()
		expect(url(42, 'https://app.test')).toBe(`https://app.test/verify/${signature}`)

		vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1)
		expect(validate(signature)).toBeNull()
	})

	test('argon2id hashes verify correct passwords and reject wrong passwords', async () => {
		const hashed = await hash('correct horse battery staple')

		expect(hashed).not.toContain('correct horse battery staple')
		expect(await verify('correct horse battery staple', hashed)).toBe(true)
		expect(await verify('wrong password', hashed)).toBe(false)
	})
})
