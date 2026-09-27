import { beforeEach, expect, test, vi } from 'vitest'

// Topic versions are process state: every test gets a fresh module.
let freshness: typeof import('../src/freshness')

beforeEach(async () => {
	vi.resetModules()
	freshness = await import('../src/freshness')
})

test('hash is stable for identical payloads', () => {
	expect(freshness.hash('{"data":[1],"head":{}}')).toBe(freshness.hash('{"data":[1],"head":{}}'))
	expect(freshness.hash('{"data":[1],"head":{}}')).not.toBe(freshness.hash('{"data":[2],"head":{}}'))
})

test('topic versions start at zero and bump only emitted topics', () => {
	expect(freshness.snapshot(['admin:users', 'user:1'])).toEqual({
		'admin:users': 0,
		'user:1': 0,
	})

	freshness.bump(['admin:users', 'admin:users'])

	expect(freshness.snapshot(['admin:users', 'user:1'])).toEqual({
		'admin:users': 1,
		'user:1': 0,
	})
})

test('freshness compares client versions with current topic versions', () => {
	const state = freshness.snapshot(['admin:users'])

	expect(freshness.fresh(state)).toBe(true)

	freshness.bump('admin:users')

	expect(freshness.fresh(state)).toBe(false)
	expect(freshness.fresh(freshness.snapshot(['admin:users']))).toBe(true)
})

test('parse rejects invalid header values', () => {
	expect(freshness.parse(undefined)).toBeNull()
	expect(freshness.parse(['{}'])).toBeNull()
	expect(freshness.parse('not json')).toBeNull()
	expect(freshness.parse('[]')).toBeNull()
	expect(freshness.parse('{"topic":"1"}')).toBeNull()
	expect(freshness.parse('{"topic":1}')).toEqual({ topic: 1 })
})

test('topics deduplicates and sorts topics', () => {
	expect(freshness.topics(['user:1', 'admin:users', 'user:1'])).toEqual(['admin:users', 'user:1'])
})
