// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { move } from 'ajo-cloves'

type View = ReturnType<typeof move>
type Options = Parameters<typeof move>[1]

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const missing = () => new Error('missing value')

const needView = (value: View | undefined): View => {
	if (value == null) throw missing()
	return value
}

const needHost = (value: Host | null): Host => {
	if (value == null) throw missing()
	return value
}

const needDiv = (value: HTMLDivElement | null): HTMLDivElement => {
	if (value == null) throw missing()
	return value
}

const needSpan = (value: HTMLSpanElement | null): HTMLSpanElement => {
	if (value == null) throw missing()
	return value
}

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

const key = (value: string) => new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: value,
})

const stubCapture = (element: Element) => {
	const set = vi.fn()
	const release = vi.fn()

	Object.defineProperty(element, 'setPointerCapture', { configurable: true, value: set })
	Object.defineProperty(element, 'releasePointerCapture', { configurable: true, value: release })

	return { release, set }
}

const start = (
	ctx: ReturnType<typeof mount>,
	init: PointerEventInit = {},
	target: Element = ctx.child,
) => {
	const event = pointer('pointerdown', init)

	target.dispatchEvent(event)
	return event
}

const mount = (opts: Options) => {
	let view: View | undefined
	let host: Host | null = null
	let root: HTMLDivElement | null = null
	let child: HTMLSpanElement | null = null
	let created = 0
	const starts: boolean[] = []

	function* Gen(this: Host) {
		created++
		view = move(this, opts)

		yield jsx('div', {
			ref: (element: unknown) => root = element as HTMLDivElement | null,
			'set:onpointerdown': (event: PointerEvent) => starts.push(needView(view).start(event)),
			children: jsx('span', { ref: (element: unknown) => child = element as HTMLSpanElement | null }),
		})
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	return {
		starts,
		get child() {
			return needSpan(child)
		},
		get created() {
			return created
		},
		get host() {
			return needHost(host)
		},
		get root() {
			return needDiv(root)
		},
		get view() {
			return needView(view)
		},
	}
}

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	vi.restoreAllMocks()
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	const ctx = mount({ onMove: () => {} })

	expect(Object.keys(ctx.view)).toEqual(['start', 'active'])
	expect(ctx.view.active).toBe(false)
})

test('start rejects non-left button, non-primary pointers, and double-start', () => {
	const onStart = vi.fn()
	const ctx = mount({ onStart, onMove: () => {} })
	const capture = stubCapture(ctx.root)

	start(ctx, { button: 1 })
	start(ctx, { isPrimary: false })
	start(ctx, { pointerId: 7 })
	start(ctx, { pointerId: 8 })

	expect(ctx.starts).toEqual([false, false, true, false])
	expect(ctx.view.active).toBe(true)
	expect(capture.set).toHaveBeenCalledTimes(1)
	expect(capture.set).toHaveBeenCalledWith(7)
	expect(onStart).toHaveBeenCalledTimes(1)
})

test('onStart receives zero-delta data and the original event', () => {
	const starts: unknown[] = []
	const events: PointerEvent[] = []
	const ctx = mount({
		onStart: (data, event) => {
			starts.push({ ...data })
			events.push(event)
		},
		onMove: () => {},
	})

	stubCapture(ctx.root)
	const event = start(ctx, { clientX: 10, clientY: 20, pointerId: 3 })

	expect(starts).toEqual([{ x: 10, y: 20, dx: 0, dy: 0, canceled: false }])
	expect(events).toEqual([event])
	expect(ctx.view.active).toBe(true)
})

test('pointermove reports deltas accumulated from the start point', () => {
	const moves: unknown[] = []
	const ctx = mount({
		onMove: data => moves.push({ ...data }),
	})

	stubCapture(ctx.root)
	start(ctx, { clientX: 10, clientY: 20, pointerId: 4 })
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 12, clientY: 25, pointerId: 99 }))
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 12, clientY: 25, pointerId: 4 }))
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 9, clientY: 15, pointerId: 4 }))

	expect(moves).toEqual([
		{ x: 12, y: 25, dx: 2, dy: 5, canceled: false },
		{ x: 9, y: 15, dx: -1, dy: -5, canceled: false },
	])
})

test('pointerup ends with canceled false and releases capture', () => {
	const ends: unknown[] = []
	const events: Event[] = []
	const ctx = mount({
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

	expect(ctx.view.active).toBe(false)
	expect(ends).toEqual([{ x: 13, y: 14, dx: 8, dy: 7, canceled: false }])
	expect(events).toEqual([up])
	expect(capture.release).toHaveBeenCalledTimes(1)
	expect(capture.release).toHaveBeenCalledWith(6)
})

test('pointercancel ends with canceled true', () => {
	const ends: unknown[] = []
	const ctx = mount({
		onMove: () => {},
		onEnd: data => ends.push({ ...data }),
	})
	const capture = stubCapture(ctx.root)

	start(ctx, { clientX: 1, clientY: 2, pointerId: 9 })
	ctx.root.dispatchEvent(pointer('pointercancel', { clientX: 6, clientY: 10, pointerId: 9 }))

	expect(ctx.view.active).toBe(false)
	expect(ends).toEqual([{ x: 6, y: 10, dx: 5, dy: 8, canceled: true }])
	expect(capture.release).toHaveBeenCalledWith(9)
})

test('lostpointercapture ends canceled and later pointerup cannot double-fire', () => {
	const ends: unknown[] = []
	const ctx = mount({
		onMove: () => {},
		onEnd: data => ends.push({ ...data }),
	})
	const capture = stubCapture(ctx.root)

	start(ctx, { clientX: 10, clientY: 10, pointerId: 11 })
	ctx.root.dispatchEvent(pointer('lostpointercapture', { clientX: 20, clientY: 15, pointerId: 11 }))
	ctx.root.dispatchEvent(pointer('pointerup', { clientX: 20, clientY: 15, pointerId: 11 }))

	expect(ctx.view.active).toBe(false)
	expect(ends).toEqual([{ x: 20, y: 15, dx: 10, dy: 5, canceled: true }])
	expect(capture.release).not.toHaveBeenCalled()
})

test('lostpointercapture after pointerup cannot double-fire onEnd', () => {
	const onEnd = vi.fn()
	const ctx = mount({ onMove: () => {}, onEnd })
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
	const ctx = mount({
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

	expect(ctx.view.active).toBe(false)
	expect(ends).toEqual([{ x: 4, y: 8, dx: 3, dy: 6, canceled: true }])
	expect(events).toEqual([event])
	expect(event.defaultPrevented).toBe(false)
	expect(capture.release).toHaveBeenCalledWith(13)
})

test('session listeners are removed after end', () => {
	const onMove = vi.fn()
	const ctx = mount({ onMove })

	stubCapture(ctx.root)
	start(ctx, { pointerId: 14 })
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 1, clientY: 1, pointerId: 14 }))
	ctx.root.dispatchEvent(pointer('pointerup', { pointerId: 14 }))
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: 2, pointerId: 14 }))

	expect(onMove).toHaveBeenCalledTimes(1)
})

test('capture element is the currentTarget instead of the original target', () => {
	const ctx = mount({ onMove: () => {} })
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
	const ctx = mount({ onMove, onEnd })
	const root = ctx.root
	const capture = stubCapture(root)

	start(ctx, { pointerId: 16 })
	render(null, document.body)
	root.dispatchEvent(pointer('pointermove', { clientX: 1, clientY: 1, pointerId: 16 }))
	root.dispatchEvent(pointer('pointerup', { pointerId: 16 }))

	expect(ctx.view.active).toBe(false)
	expect(onMove).not.toHaveBeenCalled()
	expect(onEnd).not.toHaveBeenCalled()
	expect(capture.release).toHaveBeenCalledWith(16)
})

test('reset re-arms a fresh session', () => {
	const onMove = vi.fn()
	const ctx = mount({ onMove })

	stubCapture(ctx.root)
	start(ctx, { pointerId: 17 })
	needHost(ctx.host).return()
	needHost(ctx.host).next()

	const capture = stubCapture(ctx.root)
	start(ctx, { pointerId: 18 })
	ctx.root.dispatchEvent(pointer('pointermove', { clientX: 3, clientY: 4, pointerId: 18 }))

	expect(ctx.created).toBe(2)
	expect(ctx.starts).toEqual([true, true])
	expect(ctx.view.active).toBe(true)
	expect(onMove).toHaveBeenCalledTimes(1)
	expect(capture.set).toHaveBeenCalledWith(18)
})

test('SSR inert view stays inactive and never calls callbacks', () => {
	function* Gen(this: Host) {
		const view = move(this, {
			onStart: () => {
				throw new Error('onStart should not run on the server')
			},
			onMove: () => {
				throw new Error('onMove should not run on the server')
			},
			onEnd: () => {
				throw new Error('onEnd should not run on the server')
			},
		})
		const started = view.start(pointer('pointerdown'))

		yield jsx('span', { children: `${view.active}/${started}` })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>false/false</span></div>')
})

test('data object identity is stable within a session', () => {
	const refs: unknown[] = []
	const ctx = mount({
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
