import { expect, test } from 'vitest'
import { strings } from '../src/utils'

test('strings copies only arrays while coercing each present value', () => {
	expect(strings(undefined)).toEqual([])
	expect(strings(null)).toEqual([])
	expect(strings('one')).toEqual([])

	const input = [1, null, undefined, 'x', 'x']
	const result = strings(input)
	expect(result).toEqual(['1', 'null', 'undefined', 'x', 'x'])
	expect(result).not.toBe(input)
})
