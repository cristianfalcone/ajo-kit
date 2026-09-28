import type { Stateless, VNode } from 'ajo'
import { expect, test } from 'vitest'
import { MessageScroller, MessageScrollerViewport } from 'ajo-ui-playa/message-scroller'
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
		'consumer-list',
	]) expect(tokens(frame.class)).toContain(expected)
	// One focus ring: the viewport's, inside the clip; the frame adds no halo.
	expect(tokens(frame.class).filter(token => token.includes('ring'))).toEqual([])
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
		'focus-visible:outline-offset-[calc(-1*var(--focus-width))]',
	]) expect(tokens(viewport.class)).toContain(expected)
	expect(tokens(viewport.class)).not.toContain('outline-none')
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
		'consumer-area',
	]) expect(tokens(frame.class)).toContain(expected)
	expect(tokens(frame.class).filter(token => token.includes('ring'))).toEqual([])
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
		'focus-visible:outline-offset-[calc(-1*var(--focus-width))]',
	]) expect(tokens(viewport.class)).toContain(expected)
	expect(tokens(viewport.class)).not.toContain('consumer-area')
	expect(viewport['aria-label']).toBe('Tags')
	expect(viewport.tabindex).toBe(0)
})

test('MessageScroller rings its viewport on the root, which neither clips nor fades it', () => {
	const root = MessageScroller({ children: null }) as StyledNode
	const viewport = MessageScrollerViewport({ children: null }) as StyledNode
	const focused = 'has-[[data-slot=message-scroller-viewport]:focus-visible]:'

	expect(tokens(root.class)).toContain(`${focused}[outline:var(--focus-width)_solid_var(--ring)]`)
	expect(tokens(root.class)).toContain(`${focused}outline-offset-[calc(-1*var(--focus-width))]`)
	expect(tokens(viewport.class)).toContain('outline-none')
	expect(tokens(`${root.class} ${viewport.class}`).filter(token => /(?:^|:)ring-/.test(token))).toEqual([])
})
