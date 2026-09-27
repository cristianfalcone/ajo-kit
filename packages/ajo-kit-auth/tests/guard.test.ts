import { describe, expect, test, vi } from 'vitest'
import { authorize, protect } from '../src/guard'

const response = () => ({ writeHead: vi.fn(), end: vi.fn() })

describe('ajo-kit-auth guard', () => {
	test('protect admits users, answers 401 to API guests and redirects page guests', () => {
		const next = vi.fn()
		const user = { user: { id: 1 }, path: '/api/tokens', headers: {} } as any

		protect()(user, response() as any, next)
		expect(next).toHaveBeenCalledOnce()

		const api = { path: '/api/tokens', headers: {} } as any
		expect(() => protect()(api, response() as any, next)).toThrow(expect.objectContaining({ status: 401 }))

		const page = { path: '/dashboard', headers: {} } as any
		const res = response()
		protect('/signin')(page, res as any, next)
		expect(res.writeHead).toHaveBeenCalledWith(302, { Location: '/signin' })
		expect(next).toHaveBeenCalledOnce()
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
			token: { id: 'token-a', abilities: ['tokens:create'], subject: null },
		} as any
		const userDenied = {
			user: { id: 123, abilities: ['tokens:read'] },
			token: { id: 'token-a', abilities: ['tokens:create'], subject: null },
		} as any
		const tokenDenied = {
			user: { id: 123, abilities: ['tokens:*'] },
			token: { id: 'token-a', abilities: ['tokens:read'], subject: null },
		} as any

		expect(() => authorize(allowed, 'tokens:create')).not.toThrow()
		expect(() => authorize(userDenied, 'tokens:create')).toThrow('Missing ability: tokens:create')
		expect(() => authorize(tokenDenied, 'tokens:create')).toThrow('Missing ability: tokens:create')
		expect(() => authorize({} as any, 'tokens:create')).toThrow()
	})

	test('subject tokens cannot authorize global abilities even for owners', () => {
		const scoped = {
			user: { id: 123, abilities: ['*'] },
			token: { id: 'token-a', abilities: ['*'], subject: 'app:blog' },
		} as any

		expect(() => authorize(scoped, 'apps:deploy'))
			.toThrow('Scoped token requires subject authorization')
		expect(() => authorize(scoped, 'ops:*'))
			.toThrow('Scoped token requires subject authorization')
		expect(() => authorize(scoped)).not.toThrow()
		expect(() => authorize({} as any)).toThrow('Authentication required')
	})
})
