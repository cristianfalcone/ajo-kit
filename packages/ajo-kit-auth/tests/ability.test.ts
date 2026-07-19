import { describe, expect, test } from 'vitest'
import { all, can, compact, intersect, merge } from '../src/ability.client'

describe('ajo-kit-auth ability', () => {
	test('checks exact, resource wildcard and full wildcard grants', () => {
		expect(can(['read'], 'read')).toBe(true)
		expect(can(['read'], 'tokens:create')).toBe(false)
		expect(can(['tokens:*'], 'tokens:delete')).toBe(true)
		expect(can(['*'], 'anything')).toBe(true)
		expect(can(['read'], 'write')).toBe(false)
	})

	test('subset checks require every requested ability to be granted', () => {
		expect(all(['tokens:create'], ['tokens:create'])).toBe(true)
		expect(all(['tokens:create'], ['*'])).toBe(false)
		expect(all(['tokens:*'], ['tokens:read', 'tokens:delete'])).toBe(true)
		expect(all(['*'], ['tokens:create', 'admin:write'])).toBe(true)
		expect(all(['tokens:create'], ['tokens:read'])).toBe(false)
	})

	test('sets compact, merge and intersect wildcard grants', () => {
		expect(compact(['tokens:read', 'tokens:*', 'tokens:delete'])).toEqual(['tokens:*'])
		expect(compact(['tokens:read', '*'])).toEqual(['*'])
		expect(merge(['tokens:read'], ['tokens:read', 'sessions:*'])).toEqual(['tokens:read', 'sessions:*'])
		expect(intersect(['*'], ['tokens:read', 'sessions:*'])).toEqual(['tokens:read', 'sessions:*'])
		expect(intersect(['tokens:*'], ['tokens:read', 'admin:read'])).toEqual(['tokens:read'])
		expect(intersect(['tokens:*', 'profile:read'], ['tokens:read', 'profile:*'])).toEqual(['tokens:read', 'profile:read'])
		expect(intersect(['tokens:*'], ['sessions:*'])).toEqual([])
	})
})
