import { expect, test } from 'vitest'
import metadata from '../package.json'

test('the wildcard serves component subpaths without a redundant input-date entry', async () => {
	expect(metadata.exports).not.toHaveProperty('./input-date')
	expect(metadata.exports['./*']).toEqual({
		default: './src/*.tsx',
		types: './src/*.tsx',
	})
	const inputDate = await import('ajo-ui/input-date')
	expect(inputDate).toHaveProperty('InputDate')
	expect(inputDate).toHaveProperty('InputDateTimeField')
})

test('the package exposes the documented package-local unit command', () => {
	expect(metadata.scripts?.test).toBe('pnpm -w exec vitest run packages/ajo-ui/tests')
})

test('the package targets the released Ajo host contract', () => {
	expect(metadata.peerDependencies.ajo).toBe('>=0.1.35')
	expect(metadata.devDependencies.ajo).toBe('0.1.35')
})
