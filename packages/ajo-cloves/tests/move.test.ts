// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { move } from 'ajo-cloves'
import { key, mount, must, serve } from './harness'

type Options = Parameters<typeof move>[1]

const pointer = (type: string, init: PointerEventInit = {}) => new PointerEvent(type, {
	bubbles: true,
	cancelable: true,
	button: 0,
	buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
	clientX: 0,
	clientY: 0,
	isPrimary: true,
	pointerId: 1,
	...init,
})

const stubCapture = (element: Element) => {
	const set = vi.fn()
	const release = vi.fn()

	Object.defineProperty(element, 'setPointerCapture', { configurable: true, value: set })
	Object.defineProperty(element, 'releasePointerCapture', { configurable: true, value: release })

	return { release, set }
}

const start = (
	ctx: ReturnType<typeof drag>,
	init: PointerEventInit = {},
	target: Element = ctx.child,
) => {
	const event = pointer('pointerdown', init)

	target.dispatchEvent(event)
	return event
}

/** Mounts a root that starts a drag from its own pointerdown, around one child span. */
const drag = (opts: Options) => {
	const starts: boolean[] = []

	mount(host => move(host, opts), view => jsx('div', {
		id: 'root',
		'set:onpointerdown': (event: PointerEvent) => starts.push(view.start(event)),
		children: jsx('span', { id: 'child' }),
	}))

	return {
		starts,
		child: must(document.getElementById('child')),
		root: must(document.getElementById('root')),
	}
}

test('start rejects non-left button, non-primary pointers, and double-start', () => {
	const onStart = vi.fn()
	const ctx = drag({ onStart, onMove: () => {} })
	const capture = stubCapture(ctx.root)

	start(ctx, { button: 1 })
	start(ctx, { isPrimary: false })
	start(ctx, { pointerId: 7 })
	start(ctx, { pointerId: 8 })

	expect(ctx.starts).toEqual([false, false, true, false])
	expect(capture.set).toHaveBeenCalledTimes(1)
	expect(capture.set).toHaveBeenCalledWith(7)
	expect(onStart).toHaveBeenCalledTimes(1)
})

test('onStart receives zero-delta data and the original event', () => {
	const starts: unknown[] = []
	const events: PointerEvent[] = []
	const ctx = drag({
		onStart: (data, event) => {
			starts.push({ ...data })
			events.push(event)
		},
		onMove: () => {},
	})

	stubCapture(ctx.root)
	const event = start(ctx, { clientX: 10, clientY: 20, pointerId: 3 })

	expect(starts).toEqual([{ dx: 0, dy: 0, canceled: false }])
	expect(events).toEqual([event])
})

test('pointermove reports deltas accumulated from the start point', () => {
	const moves: unknown[] = []
	const ctx = drag({
		onMove: data => moves.push({ ...data }),
	})

	stubCapture(ctx.root)
	start(ctx, { clientX: 10, clientY: 20, pointerId: 4 })
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 12, clientY: 25, pointerId: 99 }))
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 12, clientY: 25, pointerId: 4 }))
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 9, clientY: 15, pointerId: 4 }))

	expect(moves).toEqual([
		{ dx: 2, dy: 5, canceled: false },
		{ dx: -1, dy: -5, canceled: false },
	])
})

test('pointerup ends with canceled false and releases capture', () => {
	const ends: unknown[] = []
	const events: Event[] = []
	const ctx = drag({
		onMove: () => {},
		onEnd: (data, event) => {
			ends.push({ ...data })
			events.push(event)
		},
	})
	const capture = stubCapture(ctx.root)

	start(ctx, { clientX: 5, clientY: 7, pointerId: 6 })
	const up = pointer('pointerup', { clientX: 13, clientY: 14, pointerId: 6 })
	ctx.root.dispatchEvent(up)

	expect(ends).toEqual([{ dx: 8, dy: 7, canceled: false }])
	expect(events).toEqual([up])
	expect(capture.release).toHaveBeenCalledTimes(1)
	expect(capture.release).toHaveBeenCalledWith(6)
})

test('pointercancel ends with canceled true', () => {
	const ends: unknown[] = []
	const ctx = drag({
		onMove: () => {},
		onEnd: data => ends.push({ ...data }),
	})
	const capture = stubCapture(ctx.root)

	start(ctx, { clientX: 1, clientY: 2, pointerId: 9 })
	ctx.root.dispatchEvent(pointer('pointercancel', { clientX: 6, clientY: 10, pointerId: 9 }))

	expect(ends).toEqual([{ dx: 5, dy: 8, canceled: true }])
	expect(capture.release).toHaveBeenCalledWith(9)
})

test('lostpointercapture ends canceled and later pointerup cannot double-fire', () => {
	const ends: unknown[] = []
	const ctx = drag({
		onMove: () => {},
		onEnd: data => ends.push({ ...data }),
	})
	const capture = stubCapture(ctx.root)

	start(ctx, { clientX: 10, clientY: 10, pointerId: 11 })
	ctx.root.dispatchEvent(pointer('lostpointercapture', { clientX: 20, clientY: 15, pointerId: 11 }))
	ctx.root.dispatchEvent(pointer('pointerup', { clientX: 20, clientY: 15, pointerId: 11 }))

	expect(ends).toEqual([{ dx: 10, dy: 5, canceled: true }])
	expect(capture.release).not.toHaveBeenCalled()
})

test('lostpointercapture after pointerup cannot double-fire onEnd', () => {
	const onEnd = vi.fn()
	const ctx = drag({ onMove: () => {}, onEnd })
	const capture = stubCapture(ctx.root)

	start(ctx, { pointerId: 12 })
	ctx.root.dispatchEvent(pointer('pointerup', { pointerId: 12 }))
	ctx.root.dispatchEvent(pointer('lostpointercapture', { pointerId: 12 }))

	expect(onEnd).toHaveBeenCalledTimes(1)
	expect(capture.release).toHaveBeenCalledTimes(1)
})

test('Escape ends canceled with the KeyboardEvent and does not prevent default', () => {
	const ends: unknown[] = []
	const events: Event[] = []
	const ctx = drag({
		onMove: () => {},
		onEnd: (data, event) => {
			ends.push({ ...data })
			events.push(event)
		},
	})
	const capture = stubCapture(ctx.root)

	start(ctx, { clientX: 1, clientY: 2, pointerId: 13 })
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 4, clientY: 8, pointerId: 13 }))
	const event = key('Escape')
	document.dispatchEvent(event)

	expect(ends).toEqual([{ dx: 3, dy: 6, canceled: true }])
	expect(events).toEqual([event])
	expect(event.defaultPrevented).toBe(false)
	expect(capture.release).toHaveBeenCalledWith(13)
})

test('session listeners are removed after end', () => {
	const onMove = vi.fn()
	const ctx = drag({ onMove })

	stubCapture(ctx.root)
	start(ctx, { pointerId: 14 })
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 1, clientY: 1, pointerId: 14 }))
	ctx.root.dispatchEvent(pointer('pointerup', { pointerId: 14 }))
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: 2, pointerId: 14 }))

	expect(onMove).toHaveBeenCalledTimes(1)
})

test('capture element is the currentTarget instead of the original target', () => {
	const ctx = drag({ onMove: () => {} })
	const root = stubCapture(ctx.root)
	const child = stubCapture(ctx.child)

	start(ctx, { pointerId: 15 }, ctx.child)

	expect(ctx.starts).toEqual([true])
	expect(root.set).toHaveBeenCalledWith(15)
	expect(child.set).not.toHaveBeenCalled()
})

test('unmount during a session aborts silently and releases capture', () => {
	const onMove = vi.fn()
	const onEnd = vi.fn()
	const ctx = drag({ onMove, onEnd })
	const root = ctx.root
	const capture = stubCapture(root)

	start(ctx, { pointerId: 16 })
	render(null, document.body)
	root.dispatchEvent(pointer('pointermove', { clientX: 1, clientY: 1, pointerId: 16 }))
	root.dispatchEvent(pointer('pointerup', { pointerId: 16 }))

	expect(onMove).not.toHaveBeenCalled()
	expect(onEnd).not.toHaveBeenCalled()
	expect(capture.release).toHaveBeenCalledWith(16)
})

test('SSR inert view never starts or calls callbacks', () => {
	const fail = () => {
		throw new Error('callbacks should not run on the server')
	}

	expect(serve(
		host => move(host, { onStart: fail, onMove: fail, onEnd: fail }),
		view => String(view.start(pointer('pointerdown'))),
	)).toBe('<div>false</div>')
})

test('data object identity is stable within a session', () => {
	const refs: unknown[] = []
	const ctx = drag({
		onStart: data => refs.push(data),
		onMove: data => refs.push(data),
		onEnd: data => refs.push(data),
	})

	stubCapture(ctx.root)
	start(ctx, { pointerId: 19 })
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 1, clientY: 2, pointerId: 19 }))
	ctx.root.dispatchEvent(pointer('pointerup', { clientX: 3, clientY: 4, pointerId: 19 }))

	expect(refs).toHaveLength(3)
	expect(refs[1]).toBe(refs[0])
	expect(refs[2]).toBe(refs[0])
})
