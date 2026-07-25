import { afterEach, expect, test } from 'vitest'
import { clear, drop, get, set } from '../src/cache'
import type { State } from '../src/constants'

afterEach(clear)

test('cache isolates and drops scopes while refusing unscoped entries', () => {
	const first: State = {
		url: '/account',
		params: {},
		data: [{ owner: 1 }],
		loading: false,
	}
	const second: State = {
		url: '/account',
		params: {},
		data: [{ owner: 2 }],
		loading: false,
	}

	set('/account', first, { scope: 'user:1' })

	expect(get('/account', { scope: 'user:1' })).toBe(first)
	expect(get('/account', { scope: 'user:2' })).toBeUndefined()

	set('/unscoped', first)
	set('/empty', first, { scope: '' })

	expect(get('/unscoped')).toBeUndefined()
	expect(get('/unscoped', { scope: 'user:1' })).toBeUndefined()
	expect(get('/empty', { scope: '' })).toBeUndefined()

	set('/account', second, { scope: 'user:2' })

	drop('user:1')

	expect(get('/account', { scope: 'user:1' })).toBeUndefined()
	expect(get('/account', { scope: 'user:2' })).toBe(second)
})
