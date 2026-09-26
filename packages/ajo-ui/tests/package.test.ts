import { readdirSync } from 'node:fs'
import { expect, test } from 'vitest'
import metadata from '../package.json'

// Every .tsx module in src is a public family except these private parts.
const parts = new Set(['chart-tooltip', 'popup-surface'])
const families = readdirSync(new URL('../src', import.meta.url))
	.filter(file => file.endsWith('.tsx'))
	.map(file => file.slice(0, -'.tsx'.length))
	.filter(family => !parts.has(family))

const entry = (source: string) => ({ default: source, types: source })

test('the package exports its component families by subpath and no root', async () => {
	const expected = Object.fromEntries([
		['./utils', entry('./src/utils.ts')],
		...families.map(family => [`./${family}`, entry(`./src/${family}.tsx`)]),
	])
	expect(metadata.exports).toEqual(expected)

	const inputDate = await import('ajo-ui/input-date')
	expect(inputDate).toHaveProperty('InputDate')
	expect(inputDate).toHaveProperty('InputDateTimeField')
	const menu = await import('ajo-ui/menu')
	expect(menu).toHaveProperty('Menu')
	expect(menu).toHaveProperty('MenuSubContent')
	const virtualList = await import('ajo-ui/virtual-list')
	expect(virtualList).toHaveProperty('VirtualList')
})

test('ajo-ui/utils exports only the adapter helpers', async () => {
	expect(Object.keys(await import('ajo-ui/utils')).sort()).toEqual(['bool', 'stlx', 'withSlot'])
})

test('families export named components without defaults or hook-shaped accessors', async () => {
	for (const family of families) {
		const names = Object.keys(await import(/* @vite-ignore */ `ajo-ui/${family}`))
		expect(names.filter(name => name === 'default' || /^use[A-Z]/.test(name)), family).toEqual([])
	}
})

test('the manifest declares only direct runtime ownership and the Ajo host contract', () => {
	expect(metadata.sideEffects).toBe(false)
	expect(metadata.dependencies).toEqual({
		'@floating-ui/dom': '1.8.0',
		'@tanstack/virtual-core': '3.17.4',
		'ajo-cloves': 'workspace:^',
	})
	expect(metadata.peerDependencies).toEqual({ ajo: '^0.1.35' })
})
