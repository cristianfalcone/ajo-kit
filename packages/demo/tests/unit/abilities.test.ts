import { expect, test } from 'vitest'
import { bundles, delegate, grantable, normalize, unknown } from '../../src/abilities'

test('grantable preserves only abilities the account can delegate', () => {
	expect(grantable(['*'])).toEqual(['*'])
	expect(grantable([...bundles.user, 'sessions:read'])).toEqual(bundles.user)
	expect(grantable(['tokens:*', 'admin:read'])).toEqual(['tokens:*', 'admin:read'])
	expect(grantable(undefined)).toEqual([])
})

test('delegate maps full requests to the account grantable set', () => {
	expect(delegate(['*'], ['*'])).toEqual(['*'])
	expect(delegate(['*'], ['tokens:read', 'profile:read'])).toEqual(['tokens:read', 'profile:read'])
	expect(delegate(['tokens:*'], ['tokens:read', 'tokens:create'])).toEqual(['tokens:*'])
})

test('normalize defaults to full access and compacts overlapping grants', () => {
	expect(normalize([])).toEqual(['*'])
	expect(normalize(['tokens:read', '*'])).toEqual(['*'])
	expect(normalize(['tokens:read', 'tokens:*', 'tokens:delete'])).toEqual(['tokens:*'])
	expect(normalize(['tokens:read', 'tokens:read', 'profile:read'])).toEqual(['tokens:read', 'profile:read'])
})

test('unknown accepts full and resource wildcards only for known groups', () => {
	expect(unknown(['*', 'tokens:*', 'admin:*'])).toEqual([])
	expect(unknown(['tokens:publish', 'unknown:*', 'tokens:*:extra'])).toEqual(['tokens:publish', 'unknown:*', 'tokens:*:extra'])
})
