import type { Stateless, VNode } from 'ajo'
import { expect, test } from 'vitest'
import { ScrollArea } from 'ajo-ui-playa/scroll-area'
import { VirtualList } from 'ajo-ui-playa/virtual-list'

const tokens = (value: string | undefined) => value?.split(/\s+/) ?? []
type StyledNode = VNode & { class?: string, children?: StyledNode, style?: string }

const renderFrame = (node: StyledNode) => (node.nodeName as Stateless)(node) as StyledNode

test('VirtualList composes the shared clip frame around one vertical viewport', () => {
	const composition = VirtualList({
		'aria-label': 'Releases',
		class: 'consumer-list',
		estimateSize: 40,
		getItemKey: (item: string) => item,
		items: ['one'],
		renderItem: (item: string) => item,
		style: 'height:20rem',
	}) as StyledNode
	const frame = renderFrame(composition)
	const viewport = composition.children
	if (!viewport) throw new Error('VirtualList viewport was not composed')

	for (const expected of [
		'relative',
		'min-h-0',
		'min-w-0',
		'rounded-[inherit]',
		'has-[>:focus-visible]:ring-3',
		'has-[>:focus-visible]:ring-ring/50',
		'consumer-list',
	]) expect(tokens(frame.class)).toContain(expected)
	expect(frame.style).toBe('height:20rem;overflow:hidden')

	for (const expected of [
		'overflow-y-auto',
		'overflow-x-hidden',
		'overscroll-contain',
		'scrollbar-soft',
		'scrollbar-framed',
		'relative',
		'h-full',
		'w-full',
		'rounded-[inherit]',
		'[scrollbar-gutter:stable]',
	]) expect(tokens(viewport.class)).toContain(expected)
	expect(tokens(viewport.class)).not.toContain('overflow-auto')
	expect(tokens(viewport.class)).not.toContain('consumer-list')
	expect(viewport['aria-label']).toBe('Releases')
})

test('ScrollArea uses the same frame and keeps native attrs on its viewport', () => {
	const composition = ScrollArea({
		'aria-label': 'Tags',
		children: null,
		class: 'consumer-area',
		style: 'height:20rem',
	}) as StyledNode
	const frame = renderFrame(composition)
	const viewport = composition.children
	if (!viewport) throw new Error('ScrollArea viewport was not composed')

	for (const expected of [
		'rounded-[inherit]',
		'has-[>:focus-visible]:ring-3',
		'has-[>:focus-visible]:ring-ring/50',
		'consumer-area',
	]) expect(tokens(frame.class)).toContain(expected)
	expect(frame.style).toBe('height:20rem;overflow:hidden')

	for (const expected of [
		'overflow-auto',
		'overscroll-contain',
		'scrollbar-soft',
		'scrollbar-framed',
		'relative',
		'h-full',
		'w-full',
		'rounded-[inherit]',
		'[scrollbar-gutter:stable]',
	]) expect(tokens(viewport.class)).toContain(expected)
	expect(tokens(viewport.class)).not.toContain('consumer-area')
	expect(viewport['aria-label']).toBe('Tags')
	expect(viewport.tabindex).toBe(0)
})
