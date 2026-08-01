import { createRequire } from 'node:module'
import { expect, test } from 'vitest'
import metadata from '../package.json'

const families = [
	'accordion',
	'avatar',
	'calendar',
	'carousel',
	'chart',
	'checkbox',
	'checkbox-group',
	'collapsible',
	'command',
	'context-menu',
	'data-table',
	'dialog',
	'direction',
	'drawer',
	'field',
	'input-date',
	'input-group',
	'input-otp',
	'menu',
	'menubar',
	'message-scroller',
	'navigation-menu',
	'popover',
	'progress',
	'radio-group',
	'resizable',
	'select',
	'sidebar',
	'slider',
	'switch',
	'tabs',
	'toast',
	'toggle',
	'toggle-group',
	'toolbar',
	'tooltip',
	'virtual-list',
] as const

const entry = (source: string) => ({ default: source, types: source })
const require = createRequire(import.meta.url)

test('the package exports only its public component families', async () => {
	const expected = Object.fromEntries([
		['.', entry('./src/index.ts')],
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

test.each([
	'ajo-ui/data-table-contract',
	'ajo-ui/data-table-model',
	'ajo-ui/virtual',
])('%s remains package-internal', specifier => {
	let failure: unknown
	try {
		require.resolve(specifier)
	} catch (error) {
		failure = error
	}
	expect(failure).toMatchObject({ code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' })
})

test('the root exports direct contexts without hook-shaped accessors', async () => {
	const surface = await import('ajo-ui')
	expect(Object.keys(surface).filter(name => /^use[A-Z]/.test(name))).toEqual([])
	expect(surface).toHaveProperty('VirtualList')
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
