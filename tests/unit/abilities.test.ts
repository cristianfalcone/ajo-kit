import { expect, test } from 'vitest'
import { bundles, groups, normalize, unknown } from '../../src/abilities'

test('ability groups expose resource wildcards', () => {
	expect(groups.map(group => group.wildcard)).toEqual([
		'tokens:*',
		'sessions:*',
		'profile:*',
		'chats:*',
		'admin:*',
	])
})

test('standard role bundles expose full admin and app user abilities', () => {
	expect(bundles.admin).toEqual(['*'])
	expect(bundles.user).toContain('profile:delete')
	expect(bundles.user).not.toContain('admin:read')
})

test('normalize defaults to full access and compacts overlapping grants', () => {
	expect(normalize([])).toEqual(['*'])
	expect(normalize(['tokens:read', '*'])).toEqual(['*'])
	expect(normalize(['tokens:read', 'tokens:*', 'tokens:delete'])).toEqual(['tokens:*'])
	expect(normalize(['tokens:read', 'tokens:read', 'sessions:read'])).toEqual(['tokens:read', 'sessions:read'])
})

test('unknown accepts full and resource wildcards only for known groups', () => {
	expect(unknown(['*', 'tokens:*', 'admin:*'])).toEqual([])
	expect(unknown(['tokens:publish', 'unknown:*'])).toEqual(['tokens:publish', 'unknown:*'])
})
