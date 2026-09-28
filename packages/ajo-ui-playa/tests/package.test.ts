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

test('the package exports exactly its preset root, public component families and stylesheets', () => {
	expect(metadata.exports).toEqual(Object.fromEntries([
		['.', entry('./src/index.ts')],
		...families.map(family => [`./${family}`, entry(`./src/${family}.tsx`)]),
		['./fonts.css', './src/fonts.css'],
		['./tokens.css', './src/tokens.css'],
	]))
	expect(Object.keys(surface)).toEqual(['playa'])
})

test('families export named components without defaults', async () => {
	for (const family of families) {
		expect(Object.keys(await import(/* @vite-ignore */ `ajo-ui-playa/${family}`)), family).not.toContain('default')
	}
})

test('the manifest keeps build-time peers and runtime ownership explicit', () => {
	// Modules are tree-shakeable; an imported stylesheet is kept.
	expect(metadata.sideEffects).toEqual(['*.css'])
	expect(metadata.dependencies).toEqual({
		'@fontsource-variable/dm-sans': '5.3.0',
		'@fontsource-variable/fraunces': '5.3.0',
		'@fontsource-variable/jetbrains-mono': '5.3.0',
		'@iconify-json/lucide': '1.2.136',
		'ajo-cloves': 'workspace:^',
		'ajo-ui': 'workspace:^',
	})
	expect(metadata.peerDependencies).toEqual({
		ajo: '^0.2.0',
		unocss: '66.10.5',
	})
	// An app that imports only tokens.css installs without UnoCSS.
	expect(metadata.peerDependenciesMeta).toEqual({ unocss: { optional: true } })
})
