// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { roving } from 'ajo-cloves'

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const must = (value: Host | null): Host => {
	if (value == null) throw new Error('missing value')
	return value
}

const key = (value: string) => new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: value,
})

const button = (value: HTMLButtonElement | null): HTMLButtonElement => {
	if (value == null) throw new Error('missing value')
	return value
}

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	let view: ReturnType<typeof roving> | undefined

	function* Gen(this: Host) {
		view = roving(this, {
			items: () => [],
			onMove: () => {},
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(view!)).toEqual(['handle', 'move'])
})

test('reacts to orientation, direction, both-axis mode, and Home/End', () => {
	let view: ReturnType<typeof roving> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null
	let c: HTMLButtonElement | null = null
	let orientation: 'horizontal' | 'vertical' | 'both' = 'vertical'
	let dir: 'ltr' | 'rtl' = 'ltr'
	const moved: string[] = []

	function* Gen(this: Host) {
		view = roving(this, {
			items: () => [button(a), button(b), button(c)],
			orientation: () => orientation,
			dir: () => dir,
			onMove: target => {
				moved.push(target.id)
				target.focus()
			},
		})

		yield [
			jsx('button', { id: 'a', key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { id: 'b', key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
			jsx('button', { id: 'c', key: 'c', ref: (element: unknown) => c = element as HTMLButtonElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	button(b).focus()
	expect(view!.handle(key('ArrowUp'))).toBe(true)
	expect(document.activeElement).toBe(button(a))
	expect(view!.handle(key('ArrowDown'))).toBe(true)
	expect(document.activeElement).toBe(button(b))

	orientation = 'horizontal'
	expect(view!.handle(key('ArrowRight'))).toBe(true)
	expect(document.activeElement).toBe(button(c))
	expect(view!.handle(key('ArrowLeft'))).toBe(true)
	expect(document.activeElement).toBe(button(b))

	dir = 'rtl'
	expect(view!.handle(key('ArrowRight'))).toBe(true)
	expect(document.activeElement).toBe(button(a))
	expect(view!.handle(key('ArrowLeft'))).toBe(true)
	expect(document.activeElement).toBe(button(b))

	orientation = 'both'
	dir = 'ltr'
	expect(view!.handle(key('ArrowDown'))).toBe(true)
	expect(document.activeElement).toBe(button(c))
	expect(view!.handle(key('ArrowLeft'))).toBe(true)
	expect(document.activeElement).toBe(button(b))
	expect(view!.handle(key('Home'))).toBe(true)
	expect(document.activeElement).toBe(button(a))
	expect(view!.handle(key('End'))).toBe(true)
	expect(document.activeElement).toBe(button(c))
	expect(moved).toEqual(['a', 'b', 'c', 'b', 'a', 'b', 'c', 'b', 'a', 'c'])
})

test('wraps by default and still consumes the key without moving when loop is disabled at an edge', () => {
	let view: ReturnType<typeof roving> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null
	let loop = true

	function* Gen(this: Host) {
		view = roving(this, {
			items: () => [button(a), button(b)],
			loop: () => loop,
			onMove: target => target.focus(),
		})

		yield [
			jsx('button', { id: 'a', key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { id: 'b', key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	button(b).focus()
	const wrapped = key('ArrowDown')
	expect(view!.handle(wrapped)).toBe(true)
	expect(wrapped.defaultPrevented).toBe(true)
	expect(document.activeElement).toBe(button(a))

	loop = false
	button(b).focus()
	const clamped = key('ArrowDown')
	expect(view!.handle(clamped)).toBe(true)
	expect(clamped.defaultPrevented).toBe(true)
	expect(document.activeElement).toBe(button(b))
})

test('supports current override for virtual movement without focusing the target', () => {
	let view: ReturnType<typeof roving> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null
	let c: HTMLButtonElement | null = null
	let current = 'a'

	function* Gen(this: Host) {
		view = roving(this, {
			items: () => [button(a), button(b), button(c)],
			current: () => {
				const lookup: Record<string, HTMLButtonElement> = { a: button(a), b: button(b), c: button(c) }
				return lookup[current]
			},
			onMove: target => current = target.id,
		})

		yield [
			jsx('button', { id: 'a', key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { id: 'b', key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
			jsx('button', { id: 'c', key: 'c', ref: (element: unknown) => c = element as HTMLButtonElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)
	button(c).focus()

	const event = key('ArrowDown')
	expect(view!.handle(event)).toBe(true)
	expect(event.defaultPrevented).toBe(true)
	expect(current).toBe('b')
	expect(document.activeElement).toBe(button(c))
})

test('unknown keys and empty item lists return false without touching item source or preventDefault', () => {
	let view: ReturnType<typeof roving> | undefined
	const items = vi.fn(() => [] as HTMLElement[])

	function* Gen(this: Host) {
		view = roving(this, {
			items,
			onMove: () => {},
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	const unknown = key('Tab')
	expect(view!.handle(unknown)).toBe(false)
	expect(unknown.defaultPrevented).toBe(false)
	expect(items).not.toHaveBeenCalled()

	const empty = key('ArrowDown')
	expect(view!.handle(empty)).toBe(false)
	expect(empty.defaultPrevented).toBe(false)
	expect(items).toHaveBeenCalledTimes(1)
})

test('invalidate updates DOM text through host.next from onMove', () => {
	let view: ReturnType<typeof roving> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null
	let list: HTMLButtonElement[] = []
	let label = 'a'

	function* Gen(this: Host) {
		view = roving(this, {
			items: () => list.length ? list : [button(a), button(b)],
			onMove: target => this.next(() => label = target.id),
		})

		while (true) yield [
			jsx('button', { id: 'a', key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { id: 'b', key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
			jsx('span', { key: 'label', children: label }),
		]
	}

	render(jsx(Gen, {}), document.body)

	button(a).focus()
	view!.handle(key('ArrowDown'))

	expect(document.body.textContent).toBe('b')
})

test('teardown makes old moves unable to render after unmount', () => {
	let view: ReturnType<typeof roving> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null
	let list: HTMLButtonElement[] = []
	let label = 'a'

	function* Gen(this: Host) {
		view = roving(this, {
			items: () => list.length ? list : [button(a), button(b)],
			onMove: target => this.next(() => label = target.id),
		})

		while (true) yield [
			jsx('button', { id: 'a', key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { id: 'b', key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
			jsx('span', { key: 'label', children: label }),
		]
	}

	render(jsx(Gen, {}), document.body)
	button(a).focus()
	list = [button(a), button(b)]
	const old = view!
	render(null, document.body)

	old.move(1, key('ArrowDown'))

	expect(document.body.textContent).toBe('')
})

test('reset recreates a fresh working view', () => {
	let host: Host | null = null
	let view: ReturnType<typeof roving> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null
	let label = 'a'
	let created = 0

	function* Gen(this: Host) {
		created++
		view = roving(this, {
			items: () => [button(a), button(b)],
			onMove: target => this.next(() => label = target.id),
		})

		while (true) yield [
			jsx('button', { id: 'a', key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { id: 'b', key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
			jsx('span', { key: 'label', children: label }),
		]
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)
	must(host).return()
	label = 'a'
	must(host).next()

	button(a).focus()
	view!.handle(key('ArrowDown'))

	expect(created).toBe(2)
	expect(document.body.textContent).toBe('b')
})

test('SSR inert view returns false without touching document', () => {
	function* Gen(this: Host) {
		const view = roving(this, {
			items: () => {
				throw new Error('items should not run on the server')
			},
			onMove: () => {},
		})

		const moved = view.handle(key('ArrowDown')) || view.move(1, key('ArrowDown'))
		yield jsx('span', { children: moved ? 'moved' : 'server' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
})
