import { describe, expect, test } from 'vitest'
import { authorize } from '../src/guard'

describe('ajo-kit-auth guard', () => {
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
