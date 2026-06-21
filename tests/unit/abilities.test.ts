import { expect, test } from 'vitest'
import { abilities, bundles, can, delegate, grantable, groups, normalize, unknown } from '../../src/abilities'

test('ability groups expose resource wildcards', () => {
	expect(groups.map(group => group.wildcard)).toEqual([
		'tokens:*',
		'sessions:*',
		'profile:*',
		'chats:*',
		'admin:*',
	])
})

test('flat ability list is derived from grouped resources', () => {
	expect(abilities).toEqual(groups.flatMap(group => group.abilities))
	expect(new Set(abilities).size).toBe(abilities.length)
	expect(groups.every(group =>
		group.abilities.every(ability => ability.startsWith(group.wildcard.slice(0, -1)))
	)).toBe(true)
})

test('standard role bundles expose full admin and app user abilities', () => {
	expect(bundles.admin).toEqual(['*'])
	expect(bundles.user).toContain('profile:delete')
	expect(bundles.user).not.toContain('admin:read')
})

test('can matches exact, resource wildcard and full wildcard grants', () => {
	expect(can(['tokens:read'], 'tokens:read')).toBe(true)
	expect(can(['tokens:*'], 'tokens:delete')).toBe(true)
	expect(can(['*'], 'admin:write')).toBe(true)
	expect(can(['tokens:read'], 'tokens:create')).toBe(false)
	expect(can(['tokens:*:extra'], 'tokens:create')).toBe(false)
	expect(can(undefined, 'tokens:read')).toBe(false)
})

test('grantable preserves only abilities the account can delegate', () => {
	expect(grantable(['*'])).toEqual(['*'])
	expect(grantable(bundles.user)).toEqual([
		'tokens:read',
		'tokens:create',
		'tokens:delete',
		'sessions:read',
		'sessions:delete',
		'profile:read',
		'profile:update',
		'profile:delete',
		'chats:read',
		'chats:create',
		'chats:send',
	])
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
	expect(normalize(['tokens:read', 'tokens:read', 'sessions:read'])).toEqual(['tokens:read', 'sessions:read'])
})

test('unknown accepts full and resource wildcards only for known groups', () => {
	expect(unknown(['*', 'tokens:*', 'admin:*'])).toEqual([])
	expect(unknown(['tokens:publish', 'unknown:*', 'tokens:*:extra'])).toEqual(['tokens:publish', 'unknown:*', 'tokens:*:extra'])
})
