import { expect, test } from 'vitest'
import * as surface from 'ajo-ui-playa'
import metadata from '../package.json'

const entry = (source: string) => ({ default: source, types: source })
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

test('families export named components without defaults', async () => {
	for (const family of families) {
		expect(Object.keys(await import(/* @vite-ignore */ `ajo-ui-playa/${family}`)), family).not.toContain('default')
	}
})

test('the manifest keeps build-time peers and runtime ownership explicit', () => {
	expect(metadata.sideEffects).toBe(false)
	expect(metadata.dependencies).toEqual({
		'@iconify-json/lucide': '1.2.136',
		'ajo-ui': 'workspace:^',
	})
	expect(metadata.peerDependencies).toEqual({
		ajo: '^0.1.35',
		unocss: '66.10.5',
	})
})
