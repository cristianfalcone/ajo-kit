import { expect, test } from 'vitest'
import metadata from '../package.json'

test('the wildcard serves component subpaths without redundant entries', async () => {
	expect(metadata.exports).not.toHaveProperty('./input-date')
	expect(metadata.exports['./*']).toEqual({
		default: './src/*.tsx',
		types: './src/*.tsx',
	})
	const inputDate = await import('ajo-ui/input-date')
	expect(inputDate).toHaveProperty('InputDate')
	expect(inputDate).toHaveProperty('InputDateTimeField')
	const menu = await import('ajo-ui/menu')
	expect(menu).toHaveProperty('Menu')
	expect(menu).toHaveProperty('MenuSubContent')
	const virtualList = await import('ajo-ui/virtual-list')
	expect(virtualList).toHaveProperty('VirtualList')
})

test('the root exports direct contexts without hook-shaped accessors', async () => {
	const surface = await import('ajo-ui')
	expect(Object.keys(surface).filter(name => /^use[A-Z]/.test(name))).toEqual([])
	expect(surface).toHaveProperty('VirtualList')
})

test('the package exposes the documented package-local unit command', () => {
	expect(metadata.scripts?.test).toBe('pnpm -w exec vitest run packages/ajo-ui/tests')
})

test('the package targets the released Ajo host contract', () => {
	expect(metadata.sideEffects).toBe(false)
	expect(metadata.peerDependencies.ajo).toBe('>=0.1.35')
	expect(metadata.devDependencies.ajo).toBe('0.1.35')
})
