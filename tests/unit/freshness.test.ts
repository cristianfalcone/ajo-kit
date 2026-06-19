import { beforeEach, expect, test } from 'vitest'
import {
	bumpTopics,
	isFresh,
	normalizeTopics,
	parseVersions,
	resetTopicVersions,
	routeHash,
	versionsFor,
} from '../../packages/ajo-kit/src/freshness'

beforeEach(() => resetTopicVersions())

test('routeHash is stable for identical payloads', () => {
	expect(routeHash('{"data":[1],"head":{}}')).toBe(routeHash('{"data":[1],"head":{}}'))
	expect(routeHash('{"data":[1],"head":{}}')).not.toBe(routeHash('{"data":[2],"head":{}}'))
})

test('topic versions start at zero and bump only emitted topics', () => {
	expect(versionsFor(['admin:users', 'user:1'])).toEqual({
		'admin:users': 0,
		'user:1': 0,
	})

	bumpTopics(['admin:users', 'admin:users'])

	expect(versionsFor(['admin:users', 'user:1'])).toEqual({
		'admin:users': 1,
		'user:1': 0,
	})
})

test('freshness compares client versions with current topic versions', () => {
	const fresh = versionsFor(['admin:users'])

	expect(isFresh(fresh)).toBe(true)

	bumpTopics('admin:users')

	expect(isFresh(fresh)).toBe(false)
	expect(isFresh(versionsFor(['admin:users']))).toBe(true)
})

test('parseVersions rejects invalid header values', () => {
	expect(parseVersions(undefined)).toBeNull()
	expect(parseVersions(['{}'])).toBeNull()
	expect(parseVersions('not json')).toBeNull()
	expect(parseVersions('[]')).toBeNull()
	expect(parseVersions('{"topic":"1"}')).toBeNull()
	expect(parseVersions('{"topic":1}')).toEqual({ topic: 1 })
})

test('normalizeTopics deduplicates and sorts topics', () => {
	expect(normalizeTopics(['user:1', 'admin:users', 'user:1'])).toEqual(['admin:users', 'user:1'])
})
