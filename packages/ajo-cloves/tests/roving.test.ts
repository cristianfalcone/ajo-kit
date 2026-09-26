// @vitest-environment happy-dom
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { roving } from 'ajo-cloves'
import { key, mount, must, serve } from './harness'

type Options = Parameters<typeof roving>[1]

const buttons = (...ids: string[]) => ids.map(id => jsx('button', { id, key: id }))

const item = (id: string) => must(document.getElementById(id))

/** Mounts roving over the `ids` buttons. */
const setup = (ids: string[], opts: Omit<Options, 'items'> & { items?: Options['items'] }) =>
	mount(host => roving(host, { items: () => ids.map(item), ...opts }), () => buttons(...ids)).view

test('reacts to orientation, direction, cross-axis keys, and Home/End', () => {
	let orientation: 'horizontal' | 'vertical' = 'vertical'
	let dir: 'ltr' | 'rtl' = 'ltr'
	const moved: string[] = []
	const view = setup(['a', 'b', 'c'], {
		orientation: () => orientation,
		dir: () => dir,
		onMove: target => {
			moved.push(target.id)
			target.focus()
		},
	})

	item('b').focus()
	expect(view.handle(key('ArrowUp'))).toBe(true)
	expect(document.activeElement).toBe(item('a'))
	expect(view.handle(key('ArrowDown'))).toBe(true)
	expect(document.activeElement).toBe(item('b'))

	orientation = 'horizontal'
	expect(view.handle(key('ArrowRight'))).toBe(true)
	expect(document.activeElement).toBe(item('c'))
	expect(view.handle(key('ArrowLeft'))).toBe(true)
	expect(document.activeElement).toBe(item('b'))

	dir = 'rtl'
	expect(view.handle(key('ArrowRight'))).toBe(true)
	expect(document.activeElement).toBe(item('a'))
	expect(view.handle(key('ArrowLeft'))).toBe(true)
	expect(document.activeElement).toBe(item('b'))

	dir = 'ltr'
	expect(view.handle(key('ArrowDown'))).toBe(false)
	orientation = 'vertical'
	expect(view.handle(key('ArrowLeft'))).toBe(false)
	expect(document.activeElement).toBe(item('b'))
	expect(view.handle(key('Home'))).toBe(true)
	expect(document.activeElement).toBe(item('a'))
	expect(view.handle(key('End'))).toBe(true)
	expect(document.activeElement).toBe(item('c'))
	expect(moved).toEqual(['a', 'b', 'c', 'b', 'a', 'b', 'a', 'c'])
})

test('wraps by default and still consumes the key without moving when loop is disabled at an edge', () => {
	let loop = true
	const view = setup(['a', 'b'], {
		loop: () => loop,
		onMove: target => target.focus(),
	})

	item('b').focus()
	const wrapped = key('ArrowDown')
	expect(view.handle(wrapped)).toBe(true)
	expect(wrapped.defaultPrevented).toBe(true)
	expect(document.activeElement).toBe(item('a'))

	loop = false
	item('b').focus()
	const clamped = key('ArrowDown')
	expect(view.handle(clamped)).toBe(true)
	expect(clamped.defaultPrevented).toBe(true)
	expect(document.activeElement).toBe(item('b'))
})

test('supports current override for virtual movement without focusing the target', () => {
	let current = 'a'
	const view = setup(['a', 'b', 'c'], {
		current: () => item(current),
		onMove: target => current = target.id,
	})
	item('c').focus()

	const event = key('ArrowDown')
	expect(view.handle(event)).toBe(true)
	expect(event.defaultPrevented).toBe(true)
	expect(current).toBe('b')
	expect(document.activeElement).toBe(item('c'))
})

test('without a current item in the list, arrows start at the edge and items are read once per key', () => {
	const moved: string[] = []
	const items = vi.fn(() => ['a', 'b', 'c'].map(item))
	const { view } = mount(host => roving(host, {
		items,
		loop: () => false,
		current: () => null,
		onMove: target => moved.push(target.id),
	}), () => [jsx('input', { key: 'input' }), ...buttons('a', 'b', 'c')])

	must(document.querySelector('input')).focus()

	expect(view.handle(key('ArrowDown'))).toBe(true)
	expect(view.handle(key('ArrowUp'))).toBe(true)
	expect(moved).toEqual(['a', 'c'])
	expect(items).toHaveBeenCalledTimes(2)
})

test('unknown keys and empty item lists return false without touching item source or preventDefault', () => {
	const items = vi.fn(() => [] as HTMLElement[])
	const view = setup([], { items, onMove: () => {} })

	const unknown = key('Tab')
	expect(view.handle(unknown)).toBe(false)
	expect(unknown.defaultPrevented).toBe(false)
	expect(items).not.toHaveBeenCalled()

	const empty = key('ArrowDown')
	expect(view.handle(empty)).toBe(false)
	expect(empty.defaultPrevented).toBe(false)
	expect(items).toHaveBeenCalledTimes(1)
})

test('SSR inert view returns false without touching document', () => {
	expect(serve(host => roving(host, {
		items: () => {
			throw new Error('items should not run on the server')
		},
		onMove: () => {},
	}), view => view.handle(key('ArrowDown')) ? 'moved' : 'server')).toBe('<div>server</div>')
})
