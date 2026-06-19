import { mkdtempSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { read, write, clear as clearCookie } from '../../../packages/ajo-auth/src/cookie'
import { set as setCsrf, verify as verifyCsrf } from '../../../packages/ajo-auth/src/csrf'
import { check as checkLimit, clear as clearLimit, hit, remaining } from '../../../packages/ajo-auth/src/limit'
import { stamp, check as checkConfirm, clear as clearConfirm, clearUser as clearConfirmUser } from '../../../packages/ajo-auth/src/confirm'
import { session as authSession } from '../../../packages/ajo-auth/src/wares'
import { sign, url, validate } from '../../../packages/ajo-auth/src/verify'
import { can, canAll, create as createToken } from '../../../packages/ajo-auth/src/token'
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

const restoreEnv = (key: string, value: string | undefined) => {
	if (value === undefined) delete process.env[key]
	else process.env[key] = value
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

	test('sets Secure on auth cookies in production', () => {
		const previous = process.env.NODE_ENV
		process.env.NODE_ENV = 'production'

		try {
			const session = response()
			write(session.res as any, 'session-token')
			expect(session.headers.get('Set-Cookie')).toBe('session=session-token; HttpOnly; SameSite=Lax; Path=/; Secure; Max-Age=2592000')

			const csrf = response()
			setCsrf(csrf.res as any)
			expect(csrf.headers.get('Set-Cookie')).toContain('; Secure')
		} finally {
			restoreEnv('NODE_ENV', previous)
		}
	})

	test('accepts double-submit csrf and same-origin requests only', () => {
		const previousAppUrl = process.env.APP_URL
		const previousNodeEnv = process.env.NODE_ENV

		delete process.env.APP_URL
		process.env.NODE_ENV = 'development'

		expect(verifyCsrf({
			headers: {
				cookie: 'XSRF-TOKEN=abc',
				'x-xsrf-token': 'abc',
			},
		} as any)).toBe(true)

		expect(verifyCsrf({
			headers: {
				host: 'app.test',
				cookie: 'not_XSRF-TOKEN=abc',
				'x-xsrf-token': 'abc',
			},
		} as any)).toBe(false)

		expect(verifyCsrf({
			headers: {
				host: 'app.test',
				origin: 'http://app.test',
			},
		} as any)).toBe(true)

		expect(verifyCsrf({
			headers: {
				host: 'app.test',
				referer: 'http://app.test/account/profile',
			},
		} as any)).toBe(true)

		expect(verifyCsrf({
			headers: {
				host: 'app.test',
				origin: 'https://evil.test',
			},
		} as any)).toBe(false)

		try {
			process.env.APP_URL = 'https://app.test'
			expect(verifyCsrf({
				headers: {
					host: 'evil.test',
					origin: 'https://app.test',
				},
			} as any)).toBe(true)
			expect(verifyCsrf({
				headers: {
					host: 'app.test',
					origin: 'https://evil.test',
				},
			} as any)).toBe(false)
		} finally {
			restoreEnv('APP_URL', previousAppUrl)
			restoreEnv('NODE_ENV', previousNodeEnv)
		}
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
		await db<any>().schema
			.createTable('tokens')
			.addColumn('id', 'text', column => column.primaryKey())
			.addColumn('user', 'integer')
			.addColumn('name', 'text')
			.addColumn('abilities', 'text')
			.addColumn('last', 'text')
			.addColumn('expiry', 'text')
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

	test('auth middleware exposes validated credential ids', async () => {
		const user = await db<any>()
			.insertInto('users')
			.values({
				name: 'Credential User',
				email: 'credential@example.com',
				password: null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()
		const find = async (id: number) => ({ id, name: 'Credential User', email: 'credential@example.com', verified: null, roles: [] })
		const middleware = authSession(find)
		const res = { setHeader: vi.fn() }

		const plainSession = await createSession(user.id)
		const sessionReq = {
			path: '/dashboard',
			headers: { cookie: `session=${plainSession}` },
		} as any
		let sessionNext = false

		await middleware(sessionReq, res as any, (() => { sessionNext = true }) as any)

		expect(sessionNext).toBe(true)
		expect(sessionReq.user.id).toBe(user.id)
		expect(sessionReq.session.id).toBe(hashSession(plainSession))

		const plainToken = await createToken(user.id, 'Unit API', ['tokens:read'])
		const tokenId = createHash('sha256').update(plainToken).digest('hex')
		const apiReq = {
			path: '/api/me',
			headers: {
				authorization: `Bearer ${plainToken}`,
				cookie: `session=${plainSession}`,
			},
		} as any
		let apiNext = false

		await middleware(apiReq, res as any, (() => { apiNext = true }) as any)

		expect(apiNext).toBe(true)
		expect(apiReq.user.id).toBe(user.id)
		expect(apiReq.token).toEqual({ id: tokenId, abilities: ['tokens:read'] })
		expect(apiReq.session).toBeUndefined()

		await removeSession(plainSession)
		let staleSessionNext = false

		await middleware(sessionReq, res as any, (() => { staleSessionNext = true }) as any)

		expect(staleSessionNext).toBe(true)
		expect(sessionReq.user).toBeUndefined()
		expect(sessionReq.session).toBeUndefined()
		expect(sessionReq.token).toBeUndefined()

		await db<any>().deleteFrom('tokens').where('id', '=', tokenId).execute()
		let staleTokenNext = false

		await middleware(apiReq, res as any, (() => { staleTokenNext = true }) as any)

		expect(staleTokenNext).toBe(true)
		expect(apiReq.user).toBeUndefined()
		expect(apiReq.token).toBeUndefined()
		expect(apiReq.session).toBeUndefined()
	})
})

describe('ajo-auth in-memory gates', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
	})

	afterEach(() => {
		clearLimit('login:test')
		clearConfirmUser(123)
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
		const session = { user: { id: 123 }, session: { id: 'session-a' } } as any
		const otherSession = { user: { id: 123 }, session: { id: 'session-b' } } as any
		const token = { user: { id: 123 }, token: { id: 'token-a', abilities: ['*'] } } as any
		const mixed = { user: { id: 123 }, session: { id: 'session-a' }, token: { id: 'token-a', abilities: ['*'] } } as any

		expect(checkConfirm(session, 1000)).toBe(false)

		stamp(session)
		expect(checkConfirm(session, 1000)).toBe(true)
		expect(checkConfirm(otherSession, 1000)).toBe(false)
		expect(checkConfirm(token, 1000)).toBe(false)

		vi.advanceTimersByTime(1001)
		expect(checkConfirm(session, 1000)).toBe(false)

		stamp(token)
		expect(checkConfirm(token, 1000)).toBe(true)
		expect(checkConfirm(mixed, 1000)).toBe(true)
		clearConfirm(token)
		expect(checkConfirm(token, 1000)).toBe(false)

		stamp(session)
		stamp({ user: { id: 456 }, session: { id: 'session-c' } } as any)
		clearConfirmUser(123)
		expect(checkConfirm(session, 1000)).toBe(false)
		expect(checkConfirm({ user: { id: 456 }, session: { id: 'session-c' } } as any, 1000)).toBe(true)
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
