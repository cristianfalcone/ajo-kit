import { expect, test } from 'vitest'
import { defaultResultsLabel, resolveFilter } from '../src/utils'

test.each([
	[0, '0 results'],
	[1, '1 result'],
	[2, '2 results'],
] as const)('defaultResultsLabel formats %i results', (count, label) => {
	expect(defaultResultsLabel(count)).toBe(label)
})

test('resolveFilter distinguishes fallback, custom, and pass-all modes', () => {
	const fallback = (value: string) => value === 'fallback'
	const custom = (value: string) => value === 'custom'

	const builtIn = resolveFilter(undefined, fallback)
	expect(builtIn('fallback')).toBe(true)
	expect(builtIn('custom')).toBe(false)

	const customized = resolveFilter(custom, fallback)
	expect(customized('custom')).toBe(true)
	expect(customized('fallback')).toBe(false)

	const passAll = resolveFilter(null, fallback)
	expect(passAll('anything')).toBe(true)
	expect(passAll('fallback')).toBe(true)
})
