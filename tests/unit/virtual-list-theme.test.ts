import type { VNode } from 'ajo'
import { expect, test } from 'vitest'
import { ScrollArea } from '../../src/ui/scroll-area'
import { VirtualList } from '../../src/ui/virtual-list'

const tokens = (value: string | undefined) => value?.split(/\s+/) ?? []

test('VirtualList owns one vertical viewport with the complete ScrollArea root recipe', () => {
	const list = VirtualList({
		class: 'consumer-list',
		estimateSize: 40,
		getItemKey: (item: string) => item,
		items: ['one'],
		renderItem: (item: string) => item,
	}) as VNode & { class?: string }
	const classes = tokens(list.class)

	for (const expected of [
		'overflow-y-auto',
		'overflow-x-hidden',
		'overscroll-contain',
		'scrollbar-soft',
		'relative',
		'rounded-[inherit]',
		'[scrollbar-gutter:stable]',
		'focus-visible:ring-3',
		'focus-visible:ring-ring/50',
		'consumer-list',
	]) expect(classes).toContain(expected)
	expect(classes).not.toContain('overflow-auto')
})

test('the shared recipe preserves the existing ScrollArea defaults', () => {
	const area = ScrollArea({ children: null, class: 'consumer-area' }) as VNode & { class?: string }
	const classes = tokens(area.class)

	for (const expected of [
		'overflow-auto',
		'overscroll-contain',
		'scrollbar-soft',
		'relative',
		'rounded-[inherit]',
		'[scrollbar-gutter:stable]',
		'focus-visible:ring-3',
		'focus-visible:ring-ring/50',
		'consumer-area',
	]) expect(classes).toContain(expected)
})
