import { createRequire } from 'node:module'
import { expect, test } from 'vitest'
import * as surface from 'ajo-ui-playa'
import metadata from '../package.json'

const entry = (source: string) => ({ default: source, types: source })
const require = createRequire(import.meta.url)
const families = [
	'accordion',
	'alert',
	'alert-dialog',
	'aspect-ratio',
	'attachment',
	'avatar',
	'breadcrumb',
	'bubble',
	'button',
	'button-group',
	'calendar',
	'card',
	'carousel',
	'chart',
	'checkbox',
	'checkbox-group',
	'chip',
	'collapsible',
	'command',
	'context-menu',
	'data-table',
	'dialog',
	'direction',
	'drawer',
	'empty',
	'field',
	'input',
	'input-date',
	'input-group',
	'input-otp',
	'item',
	'kbd',
	'label',
	'marker',
	'menu',
	'menubar',
	'message',
	'message-scroller',
	'navigation-menu',
	'pagination',
	'popover',
	'progress',
	'radio-group',
	'resizable',
	'scroll-area',
	'select',
	'separator',
	'sidebar',
	'skeleton',
	'slider',
	'spinner',
	'switch',
	'table',
	'tabs',
	'textarea',
	'toast',
	'toggle',
	'toggle-group',
	'toolbar',
	'tooltip',
	'typography',
	'virtual-list',
] as const

test('the package exports exactly its preset root and public component families', () => {
	expect(metadata.exports).toEqual(Object.fromEntries([
		['.', entry('./src/index.ts')],
		...families.map(family => [`./${family}`, entry(`./src/${family}.tsx`)]),
	]))
	expect(Object.keys(surface)).toEqual(['playa'])
})

test('Menu does not republish the removed anchor seam', async () => {
	const menu = await import('ajo-ui-playa/menu')
	expect(menu).not.toHaveProperty('MenuAnchor')
})

test('popup families do not republish separate arrow geometry', async () => {
	const [popover, tooltip] = await Promise.all([
		import('ajo-ui-playa/popover'),
		import('ajo-ui-playa/tooltip'),
	])

	expect(popover).not.toHaveProperty('PopoverArrow')
	expect(tooltip).not.toHaveProperty('TooltipArrow')
})

test.each([
	'ajo-ui-playa/styles',
	'ajo-ui-playa/modal',
	'ajo-ui-playa/internal',
])('%s remains package-internal', specifier => {
	let failure: unknown
	try {
		require.resolve(specifier)
	} catch (error) {
		failure = error
	}
	expect(failure).toMatchObject({ code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' })
})

test('the manifest keeps build-time and runtime ownership explicit', () => {
	expect(metadata).toMatchObject({
		name: 'ajo-ui-playa',
		sideEffects: false,
		files: ['src', 'README.md'],
		scripts: {
			test: 'pnpm -w exec vitest run packages/ajo-ui-playa/tests',
		},
		dependencies: {
			'@iconify-json/lucide': '1.2.113',
			'ajo-ui': 'workspace:*',
			clsx: '2.1.1',
		},
		peerDependencies: {
			ajo: '>=0.1.35',
			unocss: '66.7.2',
		},
		devDependencies: {
			ajo: '0.1.35',
			unocss: '66.7.2',
		},
	})
})
