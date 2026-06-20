import { beforeEach, expect, test } from 'vitest'
import {
	bump,
	fresh,
	topics,
	parse,
	reset,
	hash,
	snapshot,
} from '../../packages/ajo-kit/src/freshness'

beforeEach(() => reset())

test('hash is stable for identical payloads', () => {
	expect(hash('{"data":[1],"head":{}}')).toBe(hash('{"data":[1],"head":{}}'))
	expect(hash('{"data":[1],"head":{}}')).not.toBe(hash('{"data":[2],"head":{}}'))
})

test('topic versions start at zero and bump only emitted topics', () => {
	expect(snapshot(['admin:users', 'user:1'])).toEqual({
		'admin:users': 0,
		'user:1': 0,
	})

	bump(['admin:users', 'admin:users'])

	expect(snapshot(['admin:users', 'user:1'])).toEqual({
		'admin:users': 1,
		'user:1': 0,
	})
})

test('freshness compares client versions with current topic versions', () => {
	const state = snapshot(['admin:users'])

	expect(fresh(state)).toBe(true)

	bump('admin:users')

	expect(fresh(state)).toBe(false)
	expect(fresh(snapshot(['admin:users']))).toBe(true)
})

test('parse rejects invalid header values', () => {
	expect(parse(undefined)).toBeNull()
	expect(parse(['{}'])).toBeNull()
	expect(parse('not json')).toBeNull()
	expect(parse('[]')).toBeNull()
	expect(parse('{"topic":"1"}')).toBeNull()
	expect(parse('{"topic":1}')).toEqual({ topic: 1 })
})

test('topics deduplicates and sorts topics', () => {
	expect(topics(['user:1', 'admin:users', 'user:1'])).toEqual(['admin:users', 'user:1'])
})
