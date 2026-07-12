// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { follow } from 'ajo-cloves'

type Align = 'start' | 'center' | 'end'
type Box = { left: number, top: number, width: number, height: number }
type View = ReturnType<typeof follow>

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

const rect = ({ left, top, width, height }: Box): DOMRect => ({
	bottom: top + height,
	height,
	left,
	right: left + width,
	top,
	width,
	x: left,
	y: top,
	toJSON: () => ({}),
})

const stubContainer = (
	element: HTMLElement,
	box: Box,
	client: { width?: number, height?: number, left?: number, top?: number } = {},
) => {
	Object.defineProperty(element, 'getBoundingClientRect', { configurable: true, value: vi.fn(() => rect(box)) })
	Object.defineProperty(element, 'clientWidth', { configurable: true, value: client.width ?? box.width })
	Object.defineProperty(element, 'clientHeight', { configurable: true, value: client.height ?? box.height })
	Object.defineProperty(element, 'clientLeft', { configurable: true, value: client.left ?? 0 })
	Object.defineProperty(element, 'clientTop', { configurable: true, value: client.top ?? 0 })
}

const stubTarget = (element: HTMLElement, width: number, height: number) => {
	Object.defineProperty(element, 'offsetWidth', { configurable: true, value: width })
	Object.defineProperty(element, 'offsetHeight', { configurable: true, value: height })
}

const translate = (element: HTMLElement) => {
	const match = /^translate3d\((-?\d+(?:\.\d+)?)px, (-?\d+(?:\.\d+)?)px, 0\)$/.exec(element.style.transform)
	if (!match) throw new Error(`bad transform: ${element.style.transform}`)

	return { x: Number(match[1]), y: Number(match[2]) }
}

const mount = (opts: {
	offset?: () => number
	smooth?: () => number
	align?: () => Align
} = {}) => {
	let view: ReturnType<typeof follow> | undefined
	let host: Host | null = null
	let container: HTMLDivElement | null = null
	let target: HTMLDivElement | null = null

	function* Gen(this: Host) {
		view = follow(this, {
			target: () => target,
			container: () => container,
			...opts,
		})

		yield jsx('div', {
			ref: (element: unknown) => container = element as HTMLDivElement | null,
			children: jsx('div', { ref: (element: unknown) => target = element as HTMLDivElement | null }),
		})
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	return {
		get view() {
			return needView(view)
		},
		get host() {
			return needHost(host)
		},
		get container() {
			return needDiv(container)
		},
		get target() {
			return needDiv(target)
		},
	}
}

type RafStub = {
	flush(): number
	pending(): number
	restore(): void
}

const installRaf = (): RafStub => {
	const callbacks = new Map<number, FrameRequestCallback>()
	const originalRaf = globalThis.requestAnimationFrame
	const originalCancel = globalThis.cancelAnimationFrame
	let next = 1

	Object.defineProperty(globalThis, 'requestAnimationFrame', {
		configurable: true,
		value: (callback: FrameRequestCallback) => {
			const id = next++
			callbacks.set(id, callback)
			return id
		},
	})

	Object.defineProperty(globalThis, 'cancelAnimationFrame', {
		configurable: true,
		value: (id: number) => callbacks.delete(id),
	})

	return {
		flush() {
			const pending = [...callbacks]
			callbacks.clear()
			for (const [id, callback] of pending) callback(id)
			return pending.length
		},
		pending() {
			return callbacks.size
		},
		restore() {
			Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: originalRaf })
			Object.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: originalCancel })
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
	const ctx = mount()

	expect(Object.keys(ctx.view)).toEqual(['move', 'snap', 'stop'])
})

test('snap writes the exact transform with default offset and center align', () => {
	const ctx = mount()

	stubContainer(ctx.container, { left: 10, top: 20, width: 300, height: 200 })
	stubTarget(ctx.target, 80, 30)

	ctx.view.snap(60, 100)

	expect(ctx.target.style.transform).toBe('translate3d(62px, 65px, 0)')
	expect(ctx.target.style.willChange).toBe('')
	expect(ctx.target.style.left).toBe('')
	expect(ctx.target.style.top).toBe('')
	expect(ctx.target.style.position).toBe('')
})

test('move approaches the goal monotonically and finishes with an exact goal write', () => {
	const raf = installRaf()
	const ctx = mount({ offset: () => 10, smooth: () => 0.5 })

	try {
		stubContainer(ctx.container, { left: 0, top: 0, width: 500, height: 300 })
		stubTarget(ctx.target, 50, 20)

		ctx.view.move(100, 100)

		expect(ctx.target.style.transform).toBe('')
		expect(ctx.target.style.willChange).toBe('transform')

		const points: { x: number, y: number }[] = []
		for (let i = 0; i < 8; i++) {
			expect(raf.flush()).toBe(1)
			points.push(translate(ctx.target))
		}

		for (let i = 1; i < points.length; i++) {
			expect(points[i].x).toBeGreaterThanOrEqual(points[i - 1].x)
			expect(points[i].y).toBeGreaterThanOrEqual(points[i - 1].y)
			expect(points[i].x).toBeLessThanOrEqual(110)
			expect(points[i].y).toBeLessThanOrEqual(90)
		}

		expect(points[points.length - 1]).toEqual({ x: 110, y: 90 })
		expect(raf.pending()).toBe(0)
		expect(ctx.target.style.willChange).toBe('')
	} finally {
		raf.restore()
	}
})

test('edge flips horizontally near the right bound', () => {
	const ctx = mount()

	stubContainer(ctx.container, { left: 0, top: 0, width: 200, height: 100 })
	stubTarget(ctx.target, 60, 20)

	ctx.view.snap(190, 50)

	expect(ctx.target.style.transform).toBe('translate3d(118px, 40px, 0)')
})

test('left overflow after a horizontal flip clamps to zero', () => {
	const ctx = mount({ offset: () => 40 })

	stubContainer(ctx.container, { left: 0, top: 0, width: 100, height: 80 })
	stubTarget(ctx.target, 80, 20)

	ctx.view.snap(30, 40)

	expect(ctx.target.style.transform).toBe('translate3d(0px, 30px, 0)')
})

test('vertical positioning clamps to the top and bottom bounds', () => {
	const ctx = mount()

	stubContainer(ctx.container, { left: 0, top: 0, width: 200, height: 100 })
	stubTarget(ctx.target, 20, 30)

	ctx.view.snap(40, 5)
	expect(ctx.target.style.transform).toBe('translate3d(52px, 0px, 0)')

	ctx.view.snap(40, 95)
	expect(ctx.target.style.transform).toBe('translate3d(52px, 70px, 0)')
})

test('align start and end use the offset on the vertical axis', () => {
	let align: Align = 'start'
	const ctx = mount({ align: () => align, offset: () => 8 })

	stubContainer(ctx.container, { left: 0, top: 0, width: 200, height: 100 })
	stubTarget(ctx.target, 10, 20)

	ctx.view.snap(20, 40)
	expect(ctx.target.style.transform).toBe('translate3d(28px, 48px, 0)')

	align = 'end'
	ctx.view.snap(20, 40)
	expect(ctx.target.style.transform).toBe('translate3d(28px, 12px, 0)')
})

test('bordered containers convert client coordinates to the padding-box origin', () => {
	const ctx = mount()

	stubContainer(ctx.container, { left: 100, top: 200, width: 308, height: 212 }, { width: 300, height: 200, left: 4, top: 6 })
	stubTarget(ctx.target, 20, 10)

	ctx.view.snap(150, 260)

	expect(ctx.target.style.transform).toBe('translate3d(58px, 49px, 0)')
})

test('smooth one writes the goal through a single frame', () => {
	const raf = installRaf()
	const ctx = mount({ offset: () => 10, smooth: () => 1 })

	try {
		stubContainer(ctx.container, { left: 0, top: 0, width: 200, height: 100 })
		stubTarget(ctx.target, 20, 10)

		ctx.view.move(50, 50)

		expect(ctx.target.style.transform).toBe('')
		expect(raf.pending()).toBe(1)

		expect(raf.flush()).toBe(1)
		expect(ctx.target.style.transform).toBe('translate3d(60px, 45px, 0)')
		expect(raf.pending()).toBe(0)
		expect(ctx.target.style.willChange).toBe('')
	} finally {
		raf.restore()
	}
})

test('stop cancels a pending frame and clears willChange without clearing the transform', () => {
	const raf = installRaf()
	const ctx = mount({ smooth: () => 0.5 })

	try {
		stubContainer(ctx.container, { left: 0, top: 0, width: 200, height: 100 })
		stubTarget(ctx.target, 20, 10)

		ctx.view.move(50, 50)
		raf.flush()

		const transform = ctx.target.style.transform

		expect(raf.pending()).toBe(1)
		expect(ctx.target.style.willChange).toBe('transform')
		expect(transform).toBe('translate3d(31px, 22.5px, 0)')

		ctx.view.stop()

		expect(raf.pending()).toBe(0)
		expect(ctx.target.style.willChange).toBe('')
		expect(ctx.target.style.transform).toBe(transform)
		expect(raf.flush()).toBe(0)
		expect(ctx.target.style.transform).toBe(transform)
	} finally {
		raf.restore()
	}
})

test('unmount stops the loop before later frames can write', () => {
	const raf = installRaf()
	const ctx = mount({ smooth: () => 0.5 })

	try {
		stubContainer(ctx.container, { left: 0, top: 0, width: 200, height: 100 })
		stubTarget(ctx.target, 20, 20)

		ctx.view.move(100, 50)
		raf.flush()

		const target = ctx.target
		const transform = target.style.transform

		expect(transform).toBe('translate3d(56px, 20px, 0)')
		expect(raf.pending()).toBe(1)

		render(null, document.body)
		expect(raf.pending()).toBe(0)

		raf.flush()

		expect(target.style.transform).toBe(transform)
		expect(target.style.willChange).toBe('')
	} finally {
		raf.restore()
	}
})

test('reset creates a fresh working view and leaves the old view inert', () => {
	let view: ReturnType<typeof follow> | undefined
	let host: Host | null = null
	let container: HTMLDivElement | null = null
	let target: HTMLDivElement | null = null
	let created = 0

	function* Gen(this: Host) {
		created++
		view = follow(this, {
			target: () => target,
			container: () => container,
		})

		yield jsx('div', {
			ref: (element: unknown) => container = element as HTMLDivElement | null,
			children: jsx('div', { ref: (element: unknown) => target = element as HTMLDivElement | null }),
		})
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	stubContainer(needDiv(container), { left: 0, top: 0, width: 200, height: 100 })
	stubTarget(needDiv(target), 20, 10)
	needView(view).snap(10, 20)

	expect(needDiv(target).style.transform).toBe('translate3d(22px, 15px, 0)')

	const first = needView(view)
	const previous = needDiv(target).style.transform
	needHost(host).return()
	needHost(host).next()

	stubContainer(needDiv(container), { left: 0, top: 0, width: 200, height: 100 })
	stubTarget(needDiv(target), 20, 10)

	first.snap(100, 80)

	expect(created).toBe(2)
	expect(needDiv(target).style.transform).toBe(previous)

	needView(view).snap(20, 30)

	expect(needDiv(target).style.transform).toBe('translate3d(32px, 25px, 0)')
})

test('missing target or container makes move and snap safe no-ops', () => {
	let view: ReturnType<typeof follow> | undefined

	function* Gen(this: Host) {
		view = follow(this, {
			target: () => null,
			container: () => null,
		})

		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(() => needView(view).move(1, 2)).not.toThrow()
	expect(() => needView(view).snap(1, 2)).not.toThrow()
	expect(() => needView(view).stop()).not.toThrow()
})

test('SSR inert view has stable no-op methods without reading DOM options', () => {
	function* Gen(this: Host) {
		const view = follow(this, {
			target: () => {
				throw new Error('target should not run on the server')
			},
			container: () => {
				throw new Error('container should not run on the server')
			},
		})

		view.move(1, 2)
		view.snap(3, 4)
		view.stop()

		yield jsx('span', { children: 'server' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
})
