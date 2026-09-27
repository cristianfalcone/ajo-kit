import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { State } from '../src/constants'

// The cache is process state: every test gets a fresh module and its own clock.
let cache: typeof import('../src/cache')

beforeEach(async () => {
	vi.useFakeTimers({ now: 0 })
	vi.resetModules()
	cache = await import('../src/cache')
})

afterEach(() => vi.useRealTimers())

describe('ajo-kit route cache', () => {
	const scope = 'user:1'
	const ttl = 5 * 60 * 1000
	const max = 50

	const state = (url: string, topics: string[] = ['topic']): State => ({
		url,
		params: {},
		data: [],
		loading: false,
		topics,
	})

	test('get updates usage and expires stale entries', () => {
		cache.set('/old', state('/old'), { scope })

		vi.setSystemTime(ttl)
		expect(cache.get('/old', { scope })).toBeTruthy()
		vi.setSystemTime(ttl + 1)
		expect(cache.get('/old', { scope })).toBeUndefined()
	})

	test('set prunes least recently used inactive entries', () => {
		for (let i = 0; i < max; i++) {
			vi.setSystemTime(i)
			cache.set('/page-' + i, state('/page-' + i), { scope })
		}

		vi.setSystemTime(max + 1)
		cache.get('/page-0', { scope })
		vi.setSystemTime(max + 2)
		cache.set('/active', state('/active'), { scope, active: '/active' })
		vi.setSystemTime(max + 3)
		cache.set('/extra', state('/extra'), { scope, active: '/active' })

		expect(cache.get('/active', { scope })).toBeTruthy()
		expect(cache.get('/page-0', { scope })).toBeTruthy()
		expect(cache.get('/page-1', { scope })).toBeUndefined()
	})

	test('get returns the stored State object itself', () => {
		const value = state('/same')
		cache.set('/same', value, { scope })

		expect(cache.get('/same', { scope })).toBe(value)
	})

	test('invalidate removes only matching topic entries', () => {
		cache.set('/tokens', state('/tokens', ['tokens:1']), { scope })
		cache.set('/sessions', state('/sessions', ['sessions:1']), { scope })

		cache.invalidate(['tokens:1'])

		expect(cache.get('/tokens', { scope })).toBeUndefined()
		expect(cache.get('/sessions', { scope })).toBeTruthy()

		cache.invalidate()

		expect(cache.get('/sessions', { scope })).toBeUndefined()
	})
})
