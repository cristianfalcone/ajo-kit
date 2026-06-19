import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { read, write, clear as clearCookie } from '../../../packages/ajo-auth/src/cookie'
import { verify as verifyCsrf } from '../../../packages/ajo-auth/src/csrf'
import { check as checkLimit, clear as clearLimit, hit, remaining } from '../../../packages/ajo-auth/src/limit'
import { stamp, check as checkConfirm, clear as clearConfirm } from '../../../packages/ajo-auth/src/confirm'
import { sign, url, validate } from '../../../packages/ajo-auth/src/verify'
import { can, canAll } from '../../../packages/ajo-auth/src/token'
import { create as createSession, hash as hashSession, remove as removeSession, validate as validateSession } from '../../../packages/ajo-auth/src/session'
import { configure } from '../../../packages/ajo-auth/src/store'
import { close, connect, db } from '../../../packages/ajo-kit/src/database'
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
		expect(read({ headers: { cookie: 'not_session=wrong' } } as any)).toBeUndefined()
		expect(read({ headers: { cookie: 'not_session=wrong; session=real-session' } } as any)).toBe('real-session')
		expect(read({ headers: { cookie: 'session_id=wrong; xsession=wrong' } } as any)).toBeUndefined()
		expect(read({ headers: { cookie: 'session=first; session=second' } } as any)).toBeUndefined()

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
				cookie: 'not_XSRF-TOKEN=abc',
				'x-xsrf-token': 'abc',
			},
		} as any)).toBe(false)

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

describe('ajo-auth session storage', () => {
	let dir: string

	beforeEach(async () => {
		dir = mkdtempSync(join(tmpdir(), 'ajo-auth-session-'))
		connect(join(dir, 'test.sqlite'))
		configure(() => db())
		await db<any>().schema
			.createTable('users')
			.addColumn('id', 'integer', column => column.primaryKey())
			.addColumn('name', 'text')
			.addColumn('email', 'text')
			.addColumn('password', 'text')
			.execute()
		await db<any>().schema
			.createTable('sessions')
			.addColumn('id', 'text', column => column.primaryKey())
			.addColumn('user', 'integer')
			.addColumn('expiry', 'text')
			.addColumn('ip', 'text')
			.addColumn('agent', 'text')
			.addColumn('last', 'text')
			.execute()
	})

	afterEach(async () => {
		await close()
		rmSync(dir, { recursive: true, force: true })
	})

	test('stores hashed session ids and validates only plaintext cookie values', async () => {
		const user = await db<any>()
			.insertInto('users')
			.values({
				name: 'Session User',
				email: 'session@example.com',
				password: null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()

		const plain = await createSession(user.id)
		const stored = await db<any>()
			.selectFrom('sessions')
			.select(['id', 'user'])
			.executeTakeFirstOrThrow()

		expect(stored.id).toBe(hashSession(plain))
		expect(stored.id).not.toBe(plain)

		await expect(validateSession(plain)).resolves.toMatchObject({
			id: stored.id,
			user: user.id,
		})
		await expect(validateSession(stored.id)).resolves.toBeNull()

		await removeSession(plain)
		await expect(validateSession(plain)).resolves.toBeNull()
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
		expect(can(['read'], 'tokens:create')).toBe(false)
		expect(can(['tokens:*'], 'tokens:delete')).toBe(true)
		expect(can(['*'], 'anything')).toBe(true)
		expect(can(['read'], 'write')).toBe(false)
	})

	test('ability subset checks require every requested ability to be granted', () => {
		expect(canAll(['tokens:create'], ['tokens:create'])).toBe(true)
		expect(canAll(['tokens:create'], ['*'])).toBe(false)
		expect(canAll(['tokens:*'], ['tokens:read', 'tokens:delete'])).toBe(true)
		expect(canAll(['*'], ['tokens:create', 'admin:write'])).toBe(true)
		expect(canAll(['tokens:create'], ['tokens:read'])).toBe(false)
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
