import { afterEach, describe, expect, test } from 'vitest'
import { clear, get, invalidate, max, set, ttl } from '../src/cache'
import type { State } from '../src/constants'

afterEach(clear)

describe('ajo-kit route cache', () => {
	const state = (url: string, topics: string[] = ['topic']): State => ({
		url,
		params: {},
		data: [],
		loading: false,
		topics,
	})

	test('get updates usage and expires stale entries', () => {
		set('/old', state('/old'), { now: 0 })

		expect(get('/old', ttl)).toBeTruthy()
		expect(get('/old', ttl + 1)).toBeUndefined()
	})

	test('set prunes least recently used inactive entries', () => {
		for (let i = 0; i < max; i++) set('/page-' + i, state('/page-' + i), { now: i })

		get('/page-0', max + 1)
		set('/active', state('/active'), { active: '/active', now: max + 2 })
		set('/extra', state('/extra'), { active: '/active', now: max + 3 })

		expect(get('/active', max + 3)).toBeTruthy()
		expect(get('/page-0', max + 3)).toBeTruthy()
		expect(get('/page-1', max + 3)).toBeUndefined()
	})

	test('invalidate removes only matching topic entries', () => {
		set('/tokens', state('/tokens', ['tokens:1']))
		set('/sessions', state('/sessions', ['sessions:1']))

		invalidate(['tokens:1'])

		expect(get('/tokens')).toBeUndefined()
		expect(get('/sessions')).toBeTruthy()
	})
})
