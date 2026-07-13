import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { VirtualList } from '../src/virtual-list'

test('SSR renders the deterministic prerender window as one native list', () => {
	const html = ssr(jsx(VirtualList, {
		'aria-label': 'People',
		getItemKey: (item: { id: string }) => item.id,
		id: 'people',
		items: [
			{ id: 'ada', name: 'Ada' },
			{ id: 'grace', name: 'Grace' },
			{ id: 'linus', name: 'Linus' },
		],
		estimateSize: 40,
		prerender: 2,
		renderItem: (item: { name: string }) => item.name,
	}))

	expect(html).toMatch(/^<ul\b/)
	expect(html).toContain('aria-label="People"')
	expect(html).toContain('data-slot="virtual-list"')
	expect(html).toContain('id="people"')
	expect(html).toContain('tabindex="0"')
	expect(html.match(/data-slot="virtual-list-item"/g)).toHaveLength(2)
	expect(html).toContain('aria-posinset="1"')
	expect(html).toContain('aria-posinset="2"')
	expect(html).toContain('aria-setsize="3"')
	expect(html).toContain('>Ada</li>')
	expect(html).toContain('>Grace</li>')
	expect(html).not.toContain('Linus')
	expect(html).toContain('data-slot="virtual-list-sizer"')
})

test('a snapshot rejects duplicate item keys before rendering', () => {
	expect(() => ssr(jsx(VirtualList, {
		getItemKey: (item: { id: string }) => item.id,
		items: [
			{ id: 'same', name: 'First' },
			{ id: 'same', name: 'Second' },
		],
		estimateSize: 40,
		renderItem: (item: { name: string }) => item.name,
	}))).toThrowError(new TypeError('VirtualList duplicate key "same" 0/1'))
})

test('a snapshot rejects non-finite numeric item keys', () => {
	expect(() => ssr(jsx(VirtualList, {
		getItemKey: () => Number.NaN,
		items: ['invalid'],
		estimateSize: 40,
		renderItem: (item: string) => item,
	}))).toThrowError(new TypeError('VirtualList invalid key at 0'))
})

test('a snapshot rejects a non-positive size estimate', () => {
	expect(() => ssr(jsx(VirtualList, {
		getItemKey: (item: string) => item,
		items: ['invalid'],
		estimateSize: 0,
		renderItem: (item: string) => item,
	}))).toThrowError(new RangeError('VirtualList invalid estimate at 0'))
})

test.each([
	['overscan', -1],
	['prerender', 1.5],
] as const)('rejects invalid %s', (option, value) => {
	expect(() => ssr(jsx(VirtualList, {
		getItemKey: (item: string) => item,
		items: ['item'],
		estimateSize: 40,
		[option]: value,
		renderItem: (item: string) => item,
	}))).toThrowError(new RangeError(`VirtualList invalid ${option}`))
})
