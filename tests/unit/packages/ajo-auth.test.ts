import { mkdtempSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { read, write, clear as cookie } from '../../../packages/ajo-auth/src/cookie'
import { set as xsrf, verify as valid } from '../../../packages/ajo-auth/src/csrf'
import { check as limit, clear as free, hit, remaining } from '../../../packages/ajo-auth/src/limit'
import { stamp, check as confirm, clear, clearUser } from '../../../packages/ajo-auth/src/confirm'
import { authorize } from '../../../packages/ajo-auth/src/guard'
import { session } from '../../../packages/ajo-auth/src/wares'
import { sign, url, validate } from '../../../packages/ajo-auth/src/verify'
import { all, can, compact, intersect, merge } from '../../../packages/ajo-auth/src/ability'
import { create as token } from '../../../packages/ajo-auth/src/token'
import { create, hash as digest, prune, remove, validate as check } from '../../../packages/ajo-auth/src/session'
import { configure } from '../../../packages/ajo-auth/src/store'
import { close, connect, db } from '../../../packages/ajo-kit/src/database'
import { hash, verify } from '../../../packages/ajo-auth/src/password'

const env = process.env.NODE_ENV
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

		cookie(res as any)

		expect(headers.get('Set-Cookie')).toBe('session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
	})

	test('sets Secure on auth cookies in production', () => {
		const previous = process.env.NODE_ENV
		const key = process.env.APP_SECRET
		process.env.NODE_ENV = 'production'
		process.env.APP_SECRET = 'test-production-secret-0000000000'

		try {
			const session = response()
			write(session.res as any, 'session-token')
			expect(session.headers.get('Set-Cookie')).toBe('session=session-token; HttpOnly; SameSite=Lax; Path=/; Secure; Max-Age=2592000')

			const csrf = response()
			xsrf({ session: { id: 'session-a' } } as any, csrf.res as any)
			expect(csrf.headers.get('Set-Cookie')).toContain('; Secure')
		} finally {
			restore('NODE_ENV', previous)
			restore('APP_SECRET', key)
		}
	})

	test('accepts signed session-bound csrf and same-origin requests only', () => {
		const app = process.env.APP_URL
		const env = process.env.NODE_ENV
		const session = { session: { id: 'session-a' } }
		const other = { session: { id: 'session-b' } }
		const csrf = response()

		delete process.env.APP_URL
		process.env.NODE_ENV = 'development'

		const token = xsrf(session as any, csrf.res as any)

		expect(valid({
			...session,
			headers: {
				cookie: `XSRF-TOKEN=${token}`,
				'x-xsrf-token': token,
			},
		} as any)).toBe(true)

		expect(valid({
			...other,
			headers: {
				cookie: `XSRF-TOKEN=${token}`,
				'x-xsrf-token': token,
			},
		} as any)).toBe(false)

		expect(valid({
			...session,
			headers: {
				cookie: 'XSRF-TOKEN=abc',
				'x-xsrf-token': 'abc',
			},
		} as any)).toBe(false)

		expect(valid({
			headers: {
				host: 'app.test',
				cookie: 'not_XSRF-TOKEN=abc',
				'x-xsrf-token': 'abc',
			},
		} as any)).toBe(false)

		expect(valid({
			headers: {
				host: 'app.test',
				origin: 'http://app.test',
			},
		} as any)).toBe(true)

		expect(valid({
			headers: {
				host: 'app.test',
				referer: 'http://app.test/account/profile',
			},
		} as any)).toBe(true)

		expect(valid({
			headers: {
				host: 'app.test',
				origin: 'https://evil.test',
			},
		} as any)).toBe(false)

		try {
			process.env.APP_URL = 'https://app.test'
			expect(valid({
				headers: {
					host: 'evil.test',
					origin: 'https://app.test',
				},
			} as any)).toBe(true)
			expect(valid({
				headers: {
					host: 'app.test',
					origin: 'https://evil.test',
				},
			} as any)).toBe(false)
		} finally {
			restore('APP_URL', app)
			restore('NODE_ENV', env)
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
			.addColumn('verified', 'text')
			.execute()
		await db<any>().schema
			.createTable('roles')
			.addColumn('id', 'integer', column => column.primaryKey())
			.addColumn('name', 'text')
			.addColumn('abilities', 'text')
			.execute()
		await db<any>().schema
			.createTable('members')
			.addColumn('user', 'integer')
			.addColumn('role', 'integer')
			.execute()
		await db<any>().schema
			.createTable('sessions')
			.addColumn('id', 'text', column => column.primaryKey())
			.addColumn('user', 'integer')
			.addColumn('expiry', 'text')
			.addColumn('ip', 'text')
			.addColumn('agent', 'text')
			.addColumn('last', 'text')
			.addColumn('created', 'text')
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

		const plain = await create(user.id)
		const stored = await db<any>()
			.selectFrom('sessions')
			.select(['id', 'user'])
			.executeTakeFirstOrThrow()

		expect(stored.id).toBe(digest(plain))
		expect(stored.id).not.toBe(plain)

		await expect(check(plain)).resolves.toMatchObject({
			id: stored.id,
			user: user.id,
		})
		await expect(check(stored.id)).resolves.toBeNull()

		await remove(plain)
		await expect(check(plain)).resolves.toBeNull()
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
		const find = async (id: number) => ({
			id,
			name: 'Credential User',
			email: 'credential@example.com',
			verified: null,
			roles: [],
			abilities: [],
		})
		const middleware = session(find)
		const res = { setHeader: vi.fn() }

		const plain = await create(user.id)
		const req = {
			path: '/dashboard',
			headers: { cookie: `session=${plain}` },
		} as any
		let next = false

		await middleware(req, res as any, (() => { next = true }) as any)

		expect(next).toBe(true)
		expect(req.user.id).toBe(user.id)
		expect(req.session.id).toBe(digest(plain))

		const secret = await token(user.id, 'Unit API', ['tokens:read'])
		const id = createHash('sha256').update(secret).digest('hex')
		const api = {
			path: '/api/me',
			headers: {
				authorization: `Bearer ${secret}`,
				cookie: `session=${plain}`,
			},
		} as any
		let done = false

		await middleware(api, res as any, (() => { done = true }) as any)

		expect(done).toBe(true)
		expect(api.user.id).toBe(user.id)
		expect(api.token).toEqual({ id: id, abilities: ['tokens:read'] })
		expect(api.session).toBeUndefined()

		await remove(plain)
		let expired = false

		await middleware(req, res as any, (() => { expired = true }) as any)

		expect(expired).toBe(true)
		expect(req.user).toBeUndefined()
		expect(req.session).toBeUndefined()
		expect(req.token).toBeUndefined()

		await db<any>().deleteFrom('tokens').where('id', '=', id).execute()
		let revoked = false

		await middleware(api, res as any, (() => { revoked = true }) as any)

		expect(revoked).toBe(true)
		expect(api.user).toBeUndefined()
		expect(api.token).toBeUndefined()
		expect(api.session).toBeUndefined()
	})

	test('default auth resolver loads compact role ability bundles', async () => {
		const user = await db<any>()
			.insertInto('users')
			.values({
				name: 'Ability User',
				email: 'ability@example.com',
				password: null,
				verified: null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()
		const roles = await db<any>()
			.insertInto('roles')
			.values([
				{ name: 'user', abilities: JSON.stringify(['tokens:read', 'tokens:*', 'sessions:read']) },
				{ name: 'admin', abilities: 'not-json' },
			])
			.returning(['id', 'name'])
			.execute()

		await db<any>().insertInto('members').values(
			roles.map(role => ({ user: user.id, role: role.id }))
		).execute()

		const middleware = session()
		const res = { setHeader: vi.fn() }
		const plain = await create(user.id)
		const req = {
			path: '/dashboard',
			headers: { cookie: `session=${plain}` },
		} as any
		let next = false

		await middleware(req, res as any, (() => { next = true }) as any)

		expect(next).toBe(true)
		expect(req.user).toMatchObject({
			id: user.id,
			name: 'Ability User',
			email: 'ability@example.com',
			roles: ['user', 'admin'],
			abilities: ['tokens:*', 'sessions:read'],
		})
	})

	test('auth middleware rejects idle sessions and clears their cookie', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:31:00Z'))

		try {
			const user = await db<any>()
				.insertInto('users')
				.values({
					name: 'Idle User',
					email: 'idle@example.com',
					password: null,
				})
				.returning('id')
				.executeTakeFirstOrThrow()
			const plain = 'idle-session'
			const id = digest(plain)
			const find = async () => ({
				id: user.id,
				name: 'Idle User',
				email: 'idle@example.com',
				verified: null,
				roles: [],
				abilities: [],
			})
			const middleware = session(find)
			const res = { setHeader: vi.fn() }
			const req = {
				path: '/dashboard',
				headers: { cookie: `session=${plain}` },
			} as any
			let next = false

			await db<any>().insertInto('sessions').values({
				id,
				user: user.id,
				expiry: '2026-06-20T00:00:00.000Z',
				ip: null,
				agent: null,
				last: '2026-06-19T00:00:00.000Z',
				created: '2026-06-19T00:00:00.000Z',
			}).execute()

			await middleware(req, res as any, (() => { next = true }) as any)

			const stored = await db<any>()
				.selectFrom('sessions')
				.select('id')
				.where('id', '=', id)
				.executeTakeFirst()

			expect(next).toBe(true)
			expect(req.user).toBeUndefined()
			expect(req.session).toBeUndefined()
			expect(stored).toBeUndefined()
			expect(res.setHeader).toHaveBeenCalledWith(
				'Set-Cookie',
				'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
			)
		} finally {
			vi.useRealTimers()
		}
	})

	test('session validation touches stale activity at a throttled pace', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))

		try {
			const user = await db<any>()
				.insertInto('users')
				.values({
					name: 'Active User',
					email: 'active@example.com',
					password: null,
				})
				.returning('id')
				.executeTakeFirstOrThrow()
			const plain = await create(user.id)
			const id = digest(plain)
			const last = async () => db<any>()
				.selectFrom('sessions')
				.select('last')
				.where('id', '=', id)
				.executeTakeFirstOrThrow()

			await db<any>()
				.updateTable('sessions')
				.set({
					last: '2026-06-18T23:54:00.000Z',
					created: '2026-06-18T23:54:00.000Z',
				})
				.where('id', '=', id)
				.execute()

			await check(plain, false)
			expect((await last()).last).toBe('2026-06-18T23:54:00.000Z')

			await expect(check(plain)).resolves.toMatchObject({
				id,
				user: user.id,
				last: '2026-06-19T00:00:00.000Z',
			})
			expect((await last()).last).toBe('2026-06-19T00:00:00.000Z')

			vi.setSystemTime(new Date('2026-06-19T00:04:59Z'))
			await check(plain)
			expect((await last()).last).toBe('2026-06-19T00:00:00.000Z')

			vi.setSystemTime(new Date('2026-06-19T00:05:01Z'))
			await check(plain)
			expect((await last()).last).toBe('2026-06-19T00:05:01.000Z')
		} finally {
			vi.useRealTimers()
		}
	})

	test('session pruning removes absolute and idle expired rows', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:40:00Z'))

		try {
			const user = await db<any>()
				.insertInto('users')
				.values({
					name: 'Prune User',
					email: 'prune@example.com',
					password: null,
				})
				.returning('id')
				.executeTakeFirstOrThrow()

			await db<any>().insertInto('sessions').values([
				{
					id: 'active',
					user: user.id,
					expiry: '2026-06-20T00:00:00.000Z',
					ip: null,
					agent: null,
					last: '2026-06-19T00:30:00.000Z',
					created: '2026-06-19T00:00:00.000Z',
				},
				{
					id: 'idle',
					user: user.id,
					expiry: '2026-06-20T00:00:00.000Z',
					ip: null,
					agent: null,
					last: '2026-06-19T00:09:00.000Z',
					created: '2026-06-19T00:00:00.000Z',
				},
				{
					id: 'legacy',
					user: user.id,
					expiry: '2026-06-20T00:00:00.000Z',
					ip: null,
					agent: null,
					last: null,
					created: '2026-06-19T00:09:00.000Z',
				},
				{
					id: 'absolute',
					user: user.id,
					expiry: '2026-06-19T00:39:00.000Z',
					ip: null,
					agent: null,
					last: '2026-06-19T00:30:00.000Z',
					created: '2026-06-19T00:00:00.000Z',
				},
			]).execute()

			await prune()

			const rows = await db<any>()
				.selectFrom('sessions')
				.select('id')
				.orderBy('id')
				.execute()

			expect(rows).toEqual([{ id: 'active' }])
		} finally {
			vi.useRealTimers()
		}
	})
})

describe('ajo-auth in-memory gates', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
	})

	afterEach(() => {
		free('login:test')
		clearUser(123)
		vi.useRealTimers()
	})

	test('rate limit check/hit/remaining/reset follows the configured window', () => {
		expect(limit('login:test', 2)).toBe(true)
		expect(remaining('login:test', 2)).toBe(2)

		hit('login:test', 1000)
		expect(remaining('login:test', 2)).toBe(1)
		expect(limit('login:test', 2)).toBe(true)

		hit('login:test', 1000)
		expect(remaining('login:test', 2)).toBe(0)
		expect(limit('login:test', 2)).toBe(false)

		vi.advanceTimersByTime(1001)
		expect(limit('login:test', 2)).toBe(true)
		expect(remaining('login:test', 2)).toBe(2)
	})

	test('password confirmation expires and can be cleared', () => {
		const session = { user: { id: 123 }, session: { id: 'session-a' } } as any
		const other = { user: { id: 123 }, session: { id: 'session-b' } } as any
		const token = { user: { id: 123 }, token: { id: 'token-a', abilities: ['*'] } } as any
		const mixed = { user: { id: 123 }, session: { id: 'session-a' }, token: { id: 'token-a', abilities: ['*'] } } as any

		expect(confirm(session, 1000)).toBe(false)

		stamp(session)
		expect(confirm(session, 1000)).toBe(true)
		expect(confirm(other, 1000)).toBe(false)
		expect(confirm(token, 1000)).toBe(false)

		vi.advanceTimersByTime(1001)
		expect(confirm(session, 1000)).toBe(false)

		stamp(token)
		expect(confirm(token, 1000)).toBe(true)
		expect(confirm(mixed, 1000)).toBe(true)
		clear(token)
		expect(confirm(token, 1000)).toBe(false)

		stamp(session)
		stamp({ user: { id: 456 }, session: { id: 'session-c' } } as any)
		clearUser(123)
		expect(confirm(session, 1000)).toBe(false)
		expect(confirm({ user: { id: 456 }, session: { id: 'session-c' } } as any, 1000)).toBe(true)
	})

	test('authorization requires account abilities for cookie requests', () => {
		const allowed = { user: { id: 123, abilities: ['tokens:*'] } } as any
		const denied = { user: { id: 123, abilities: ['tokens:read'] } } as any
		const empty = { user: { id: 123 } } as any

		expect(() => authorize(allowed, 'tokens:create')).not.toThrow()
		expect(() => authorize(denied, 'tokens:create')).toThrow('Missing ability: tokens:create')
		expect(() => authorize(empty, 'tokens:create')).toThrow('Missing ability: tokens:create')
	})

	test('authorization intersects account and bearer token abilities', () => {
		const allowed = {
			user: { id: 123, abilities: ['tokens:*', 'profile:read'] },
			token: { id: 'token-a', abilities: ['tokens:create'] },
		} as any
		const userDenied = {
			user: { id: 123, abilities: ['tokens:read'] },
			token: { id: 'token-a', abilities: ['tokens:create'] },
		} as any
		const tokenDenied = {
			user: { id: 123, abilities: ['tokens:*'] },
			token: { id: 'token-a', abilities: ['tokens:read'] },
		} as any

		expect(() => authorize(allowed, 'tokens:create')).not.toThrow()
		expect(() => authorize(userDenied, 'tokens:create')).toThrow('Missing ability: tokens:create')
		expect(() => authorize(tokenDenied, 'tokens:create')).toThrow('Missing ability: tokens:create')
		expect(() => authorize({} as any, 'tokens:create')).toThrow()
	})
})

describe('ajo-auth tokens and signatures', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
	})

	afterEach(() => {
		restore('NODE_ENV', env)
		restore('APP_SECRET', secret)
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	test('ability checks support exact, resource wildcard and full wildcard grants', () => {
		expect(can(['read'], 'read')).toBe(true)
		expect(can(['read'], 'tokens:create')).toBe(false)
		expect(can(['tokens:*'], 'tokens:delete')).toBe(true)
		expect(can(['*'], 'anything')).toBe(true)
		expect(can(['read'], 'write')).toBe(false)
	})

	test('ability subset checks require every requested ability to be granted', () => {
		expect(all(['tokens:create'], ['tokens:create'])).toBe(true)
		expect(all(['tokens:create'], ['*'])).toBe(false)
		expect(all(['tokens:*'], ['tokens:read', 'tokens:delete'])).toBe(true)
		expect(all(['*'], ['tokens:create', 'admin:write'])).toBe(true)
		expect(all(['tokens:create'], ['tokens:read'])).toBe(false)
	})

	test('ability sets compact, merge and intersect wildcard grants', () => {
		expect(compact(['tokens:read', 'tokens:*', 'tokens:delete'])).toEqual(['tokens:*'])
		expect(compact(['tokens:read', '*'])).toEqual(['*'])
		expect(merge(['tokens:read'], ['tokens:read', 'sessions:*'])).toEqual(['tokens:read', 'sessions:*'])
		expect(intersect(['*'], ['tokens:read', 'sessions:*'])).toEqual(['tokens:read', 'sessions:*'])
		expect(intersect(['tokens:*'], ['tokens:read', 'admin:read'])).toEqual(['tokens:read'])
		expect(intersect(['tokens:*', 'profile:read'], ['tokens:read', 'profile:*'])).toEqual(['tokens:read', 'profile:read'])
		expect(intersect(['tokens:*'], ['sessions:*'])).toEqual([])
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

	test('email verification fails closed without a production secret', () => {
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

	test('argon2id hashes verify correct passwords and reject wrong passwords', async () => {
		const hashed = await hash('correct horse battery staple')

		expect(hashed).not.toContain('correct horse battery staple')
		expect(await verify('correct horse battery staple', hashed)).toBe(true)
		expect(await verify('wrong password', hashed)).toBe(false)
	})
})
