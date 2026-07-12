// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { anchor } from 'ajo-cloves'

type Side = 'top' | 'right' | 'bottom' | 'left'
type Align = 'start' | 'center' | 'end'
type Constrain = 'height' | 'width' | 'both' | 'none'
type Box = { left: number, top: number, width: number, height: number }
type View = ReturnType<typeof anchor>

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 })
	Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 })
	Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined })
	document.body.textContent = ''
}

const missing = () => new Error('missing value')

const needView = (value: View | undefined): View => {
	if (value == null) throw new Error('missing value')
	return value
}

const needHost = (value: Host | null): Host => {
	if (value == null) throw missing()
	return value
}

const needButton = (value: HTMLButtonElement | null): HTMLButtonElement => {
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

const viewport = (width: number, height: number) => {
	Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
	Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

const stubRect = (element: HTMLElement, box: Box) => {
	const fn = vi.fn(() => rect(box))
	Object.defineProperty(element, 'getBoundingClientRect', { configurable: true, value: fn })
	return fn
}

const stubSize = (element: HTMLElement, width: number, height: number) => {
	Object.defineProperty(element, 'offsetWidth', { configurable: true, value: width })
	Object.defineProperty(element, 'offsetHeight', { configurable: true, value: height })
}

const mount = (opts: {
	side?: () => Side
	align?: () => Align
	sideOffset?: () => number
	alignOffset?: () => number
	padding?: () => number
	constrain?: () => Constrain
} = {}) => {
	let view: ReturnType<typeof anchor> | undefined
	let host: Host | null = null
	let trigger: HTMLButtonElement | null = null
	let target: HTMLDivElement | null = null

	function* Gen(this: Host) {
		view = anchor(this, {
			anchor: () => trigger,
			target: () => target,
			...opts,
		})

		yield [
			jsx('button', { key: 'trigger', ref: (element: unknown) => trigger = element as HTMLButtonElement | null }),
			jsx('div', { key: 'target', ref: (element: unknown) => target = element as HTMLDivElement | null }),
		]
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	return {
		get view() {
			return needView(view)
		},
		get host() {
			return needHost(host)
		},
		get trigger() {
			return needButton(trigger)
		},
		get target() {
			return needDiv(target)
		},
	}
}

const mountArrow = (opts: {
	side?: () => Side
	align?: () => Align
	sideOffset?: () => number
	alignOffset?: () => number
	padding?: () => number
} = {}) => {
	let view: View | undefined
	let host: Host | null = null
	let trigger: HTMLButtonElement | null = null
	let target: HTMLDivElement | null = null
	let arrow: HTMLSpanElement | null = null

	function* Gen(this: Host) {
		view = anchor(this, {
			anchor: () => trigger,
			target: () => target,
			arrow: () => arrow,
			...opts,
		})

		yield [
			jsx('button', { key: 'trigger', ref: (element: unknown) => trigger = element as HTMLButtonElement | null }),
			jsx('div', {
				key: 'target',
				ref: (element: unknown) => target = element as HTMLDivElement | null,
				children: jsx('span', { ref: (element: unknown) => arrow = element as HTMLSpanElement | null }),
			}),
		]
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	return {
		get view() {
			return needView(view)
		},
		get host() {
			return needHost(host)
		},
		get trigger() {
			return needButton(trigger)
		},
		get target() {
			return needDiv(target)
		},
		get arrow() {
			return needSpan(arrow)
		},
	}
}

type RafStub = {
	flush(): void
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

	expect(Object.keys(ctx.view)).toEqual(['place', 'watch', 'unwatch', 'side', 'align'])
})

test('places bottom center by default and commits all geometry synchronously', () => {
	const ctx = mount()

	stubRect(ctx.trigger, { left: 100, top: 50, width: 60, height: 40 })
	stubSize(ctx.target, 80, 30)

	ctx.view.place()

	expect(ctx.target.style.position).toBe('fixed')
	expect(ctx.target.style.left).toBe('90px')
	expect(ctx.target.style.top).toBe('94px')
	expect(ctx.target.style.getPropertyValue('--anchor-width')).toBe('60px')
	expect(ctx.target.style.getPropertyValue('--anchor-height')).toBe('40px')
	expect(ctx.target.style.getPropertyValue('--available-width')).toBe('484px')
	expect(ctx.target.style.getPropertyValue('--available-height')).toBe('298px')
	expect(ctx.target.dataset.side).toBe('bottom')
	expect(ctx.target.dataset.align).toBe('center')
	expect(ctx.target.style.transformOrigin).toBe('center top')
	expect(ctx.view.side).toBe('bottom')
	expect(ctx.view.align).toBe('center')
})

test('uses the exact coordinate formula for every side and align', () => {
	viewport(800, 600)

	let side: Side = 'bottom'
	let align: Align = 'center'
	const ctx = mount({
		side: () => side,
		align: () => align,
		sideOffset: () => 10,
		padding: () => 0,
	})
	const cases: [Side, Align, number, number, string][] = [
		['top', 'start', 200, 100, 'left bottom'],
		['top', 'center', 210, 100, 'center bottom'],
		['top', 'end', 220, 100, 'right bottom'],
		['bottom', 'start', 200, 220, 'left top'],
		['bottom', 'center', 210, 220, 'center top'],
		['bottom', 'end', 220, 220, 'right top'],
		['left', 'start', 110, 150, 'right top'],
		['left', 'center', 110, 160, 'right center'],
		['left', 'end', 110, 170, 'right bottom'],
		['right', 'start', 310, 150, 'left top'],
		['right', 'center', 310, 160, 'left center'],
		['right', 'end', 310, 170, 'left bottom'],
	]

	stubRect(ctx.trigger, { left: 200, top: 150, width: 100, height: 60 })
	stubSize(ctx.target, 80, 40)

	for (const [nextSide, nextAlign, x, y, transformOrigin] of cases) {
		side = nextSide
		align = nextAlign
		ctx.view.place()

		expect(ctx.target.style.left).toBe(`${x}px`)
		expect(ctx.target.style.top).toBe(`${y}px`)
		expect(ctx.target.dataset.side).toBe(nextSide)
		expect(ctx.target.dataset.align).toBe(nextAlign)
		expect(ctx.target.style.transformOrigin).toBe(transformOrigin)
	}
})

test('applies sideOffset on the main axis and alignOffset on the cross axis', () => {
	let side: Side = 'right'
	let align: Align = 'end'
	const ctx = mount({
		side: () => side,
		align: () => align,
		sideOffset: () => 12,
		alignOffset: () => -5,
		padding: () => 0,
	})

	stubRect(ctx.trigger, { left: 100, top: 100, width: 50, height: 40 })
	stubSize(ctx.target, 30, 20)

	ctx.view.place()

	expect(ctx.target.style.left).toBe('162px')
	expect(ctx.target.style.top).toBe('115px')

	side = 'bottom'
	align = 'start'
	ctx.view.place()

	expect(ctx.target.style.left).toBe('95px')
	expect(ctx.target.style.top).toBe('152px')
})

test('flips symmetrically when the preferred side lacks space and the opposite has more', () => {
	let side: Side = 'bottom'
	const ctx = mount({
		side: () => side,
		sideOffset: () => 4,
		padding: () => 8,
	})

	viewport(300, 200)
	stubRect(ctx.trigger, { left: 100, top: 170, width: 40, height: 20 })
	stubSize(ctx.target, 80, 50)

	ctx.view.place()

	expect(ctx.target.dataset.side).toBe('top')
	expect(ctx.view.side).toBe('top')
	expect(ctx.target.style.top).toBe('116px')

	side = 'left'
	stubRect(ctx.trigger, { left: 2, top: 80, width: 20, height: 20 })
	stubSize(ctx.target, 50, 20)

	ctx.view.place()

	expect(ctx.target.dataset.side).toBe('right')
	expect(ctx.view.side).toBe('right')
	expect(ctx.target.style.left).toBe('26px')
})

test('does not flip when neither side fits and the preferred side has more space', () => {
	const ctx = mount({
		side: () => 'bottom',
		sideOffset: () => 4,
		padding: () => 8,
	})

	viewport(300, 200)
	stubRect(ctx.trigger, { left: 100, top: 70, width: 40, height: 40 })
	stubSize(ctx.target, 80, 180)

	ctx.view.place()

	expect(ctx.target.dataset.side).toBe('bottom')
	expect(ctx.view.side).toBe('bottom')
	expect(ctx.target.style.top).toBe('12px')
})

test('shifts both axes inside the padded viewport using target size subtraction', () => {
	const ctx = mount({
		side: () => 'bottom',
		align: () => 'center',
		sideOffset: () => 4,
		padding: () => 10,
	})

	viewport(200, 120)
	stubRect(ctx.trigger, { left: 190, top: 40, width: 20, height: 40 })
	stubSize(ctx.target, 80, 50)

	ctx.view.place()

	expect(ctx.target.dataset.side).toBe('bottom')
	expect(ctx.target.style.left).toBe('110px')
	expect(ctx.target.style.top).toBe('60px')
})

test('writes available and anchor vars, flooring unavailable space at zero', () => {
	const ctx = mount({
		side: () => 'bottom',
		sideOffset: () => 4,
		padding: () => 8,
	})

	viewport(100, 30)
	stubRect(ctx.trigger, { left: 40, top: 5, width: 20, height: 20 })
	stubSize(ctx.target, 50, 50)

	ctx.view.place()

	expect(ctx.target.style.getPropertyValue('--anchor-width')).toBe('20px')
	expect(ctx.target.style.getPropertyValue('--anchor-height')).toBe('20px')
	expect(ctx.target.style.getPropertyValue('--available-width')).toBe('84px')
	expect(ctx.target.style.getPropertyValue('--available-height')).toBe('0px')
})

test('constrain height writes maxHeight while none leaves existing size limits untouched', () => {
	let constrain: Constrain = 'height'
	const ctx = mount({
		constrain: () => constrain,
	})

	stubRect(ctx.trigger, { left: 100, top: 50, width: 60, height: 40 })
	stubSize(ctx.target, 80, 30)

	ctx.view.place()

	expect(ctx.target.style.maxHeight).toBe('298px')

	constrain = 'none'
	ctx.target.style.maxHeight = '123px'
	ctx.view.place()

	expect(ctx.target.style.maxHeight).toBe('123px')
})

test('place with missing anchor or target is a safe no-op', () => {
	let target: HTMLDivElement | null = null
	let view: ReturnType<typeof anchor> | undefined

	function* Gen(this: Host) {
		view = anchor(this, {
			anchor: () => null,
			target: () => target,
		})

		yield jsx('div', { ref: (element: unknown) => target = element as HTMLDivElement | null })
	}

	render(jsx(Gen, {}), document.body)

	expect(() => needView(view).place()).not.toThrow()
	expect(needDiv(target).style.left).toBe('')
	expect(needView(view).side).toBe('bottom')
})

test('watch is idempotent and unwatch stops shared updates', () => {
	const raf = installRaf()
	const add = vi.spyOn(window, 'addEventListener')
	const ctx = mount()

	try {
		const measure = stubRect(ctx.trigger, { left: 100, top: 50, width: 60, height: 40 })
		stubSize(ctx.target, 80, 30)

		ctx.view.watch()
		ctx.view.watch()

		expect(add.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1)

		window.dispatchEvent(new Event('resize'))
		raf.flush()

		expect(measure).toHaveBeenCalledTimes(1)
		expect(ctx.target.dataset.side).toBe('bottom')

		ctx.view.unwatch()
		window.dispatchEvent(new Event('resize'))
		raf.flush()

		expect(measure).toHaveBeenCalledTimes(1)
	} finally {
		raf.restore()
	}
})

test('watch observes current elements and disconnects the ResizeObserver on unwatch', () => {
	const raf = installRaf()
	const instances: {
		callback: ResizeObserverCallback
		disconnect: ReturnType<typeof vi.fn>
		observe: ReturnType<typeof vi.fn>
	}[] = []
	const Original = globalThis.ResizeObserver
	const ctx = mount()

	class StubResizeObserver {
		callback: ResizeObserverCallback
		disconnect = vi.fn()
		observe = vi.fn()

		constructor(callback: ResizeObserverCallback) {
			this.callback = callback
			instances.push(this)
		}
	}

	Object.defineProperty(globalThis, 'ResizeObserver', {
		configurable: true,
		value: StubResizeObserver,
	})

	try {
		const measure = stubRect(ctx.trigger, { left: 100, top: 50, width: 60, height: 40 })
		stubSize(ctx.target, 80, 30)

		ctx.view.watch()

		expect(instances).toHaveLength(1)
		expect(instances[0].observe).toHaveBeenCalledWith(ctx.trigger)
		expect(instances[0].observe).toHaveBeenCalledWith(ctx.target)

		instances[0].callback([], instances[0] as unknown as ResizeObserver)
		raf.flush()

		expect(measure).toHaveBeenCalledTimes(1)

		ctx.view.unwatch()

		expect(instances[0].disconnect).toHaveBeenCalledTimes(1)
	} finally {
		Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: Original })
		raf.restore()
	}
})

test('watch re-observes the live pair when the target retargets during place', () => {
	const raf = installRaf()
	const instances: {
		callback: ResizeObserverCallback
		disconnect: ReturnType<typeof vi.fn>
		observe: ReturnType<typeof vi.fn>
	}[] = []
	const Original = globalThis.ResizeObserver

	class StubResizeObserver {
		callback: ResizeObserverCallback
		disconnect = vi.fn()
		observe = vi.fn()

		constructor(callback: ResizeObserverCallback) {
			this.callback = callback
			instances.push(this)
		}
	}

	Object.defineProperty(globalThis, 'ResizeObserver', {
		configurable: true,
		value: StubResizeObserver,
	})

	try {
		let view: ReturnType<typeof anchor> | undefined
		let trigger: HTMLButtonElement | null = null
		let active: HTMLDivElement | null = null

		function* Gen(this: Host) {
			view = anchor(this, {
				anchor: () => trigger,
				target: () => active,
			})

			yield [
				jsx('button', { key: 'trigger', ref: (element: unknown) => trigger = element as HTMLButtonElement | null }),
			]
		}

		render(jsx(Gen, {}), document.body)

		const first = document.createElement('div')
		const second = document.createElement('div')
		document.body.append(first, second)
		stubSize(first, 80, 30)
		stubSize(second, 80, 30)
		stubRect(needButton(trigger), { left: 100, top: 50, width: 60, height: 40 })

		active = first
		needView(view).watch()

		expect(instances).toHaveLength(1)
		expect(instances[0].observe).toHaveBeenCalledWith(first)

		active = second
		needView(view).place()

		expect(instances[0].disconnect).toHaveBeenCalledTimes(1)
		expect(instances[0].observe).toHaveBeenCalledWith(second)

		needView(view).unwatch()

		expect(instances[0].disconnect).toHaveBeenCalledTimes(2)
	} finally {
		Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: Original })
		raf.restore()
	}
})

test('host abort while watching cleans subscriptions before later source events', () => {
	const raf = installRaf()
	const ctx = mount()

	try {
		const measure = stubRect(ctx.trigger, { left: 100, top: 50, width: 60, height: 40 })
		stubSize(ctx.target, 80, 30)

		ctx.view.watch()
		render(null, document.body)
		window.dispatchEvent(new Event('resize'))
		raf.flush()

		expect(measure).not.toHaveBeenCalled()
	} finally {
		raf.restore()
	}
})

test('reset recreates a fresh working view', () => {
	let view: ReturnType<typeof anchor> | undefined
	let host: Host | null = null
	let trigger: HTMLButtonElement | null = null
	let target: HTMLDivElement | null = null
	let created = 0

	function* Gen(this: Host) {
		created++
		view = anchor(this, {
			anchor: () => trigger,
			target: () => target,
		})

		yield [
			jsx('button', { key: 'trigger', ref: (element: unknown) => trigger = element as HTMLButtonElement | null }),
			jsx('div', { key: 'target', ref: (element: unknown) => target = element as HTMLDivElement | null }),
		]
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	stubRect(needButton(trigger), { left: 100, top: 50, width: 60, height: 40 })
	stubSize(needDiv(target), 80, 30)
	needView(view).place()

	expect(needDiv(target).style.left).toBe('90px')

	needHost(host).return()
	needHost(host).next()

	stubRect(needButton(trigger), { left: 200, top: 100, width: 100, height: 50 })
	stubSize(needDiv(target), 50, 20)
	needView(view).place()

	expect(created).toBe(2)
	expect(needDiv(target).style.left).toBe('225px')
	expect(needDiv(target).style.top).toBe('154px')
})

test('does not read arrow-only target metrics without an arrow', () => {
	const ctx = mount()

	stubRect(ctx.trigger, { left: 100, top: 50, width: 60, height: 40 })
	stubSize(ctx.target, 80, 30)
	Object.defineProperty(ctx.target, 'clientLeft', {
		configurable: true,
		get: () => {
			throw new Error('clientLeft should not be read without an arrow')
		},
	})
	Object.defineProperty(ctx.target, 'clientTop', {
		configurable: true,
		get: () => {
			throw new Error('clientTop should not be read without an arrow')
		},
	})

	expect(() => ctx.view.place()).not.toThrow()
})

test('reads every arrow metric before the first target geometry write', () => {
	viewport(800, 600)

	const ctx = mountArrow({
		side: () => 'bottom',
		align: () => 'center',
		sideOffset: () => 10,
		padding: () => 0,
	})
	const reads: string[] = []
	const lateReads: string[] = []
	const writes: string[] = []
	const metric = (element: HTMLElement, key: 'clientLeft' | 'clientTop' | 'offsetHeight' | 'offsetWidth', value: number) => {
		Object.defineProperty(element, key, {
			configurable: true,
			get: () => {
				reads.push(key)
				if (writes.length) lateReads.push(key)
				return value
			},
		})
	}

	stubRect(ctx.trigger, { left: 200, top: 150, width: 100, height: 60 })
	stubSize(ctx.target, 80, 40)
	metric(ctx.arrow, 'offsetWidth', 10)
	metric(ctx.arrow, 'offsetHeight', 10)
	metric(ctx.target, 'clientLeft', 1)
	metric(ctx.target, 'clientTop', 2)
	for (const property of ['left', 'maxHeight', 'maxWidth', 'position', 'top', 'transformOrigin']) {
		Object.defineProperty(ctx.target.style, property, {
			configurable: true,
			get: () => '',
			set: () => writes.push(property),
		})
	}
	Object.defineProperty(ctx.target.style, 'setProperty', {
		configurable: true,
		value: (property: string) => writes.push(property),
	})

	ctx.view.place()

	expect(reads).toEqual(['offsetWidth', 'offsetHeight', 'clientLeft', 'clientTop'])
	expect(lateReads).toEqual([])
	expect(writes.length).toBeGreaterThan(0)
	expect(ctx.arrow.style.left).toBe('34px')
	expect(ctx.arrow.style.top).toBe('-7px')
})

test('centers the arrow on the anchor center at the near content edge for every side', () => {
	viewport(800, 600)

	let side: Side = 'bottom'
	const ctx = mountArrow({
		side: () => side,
		align: () => 'center',
		sideOffset: () => 10,
		padding: () => 0,
	})
	// Same geometry as the coordinate formula test: content lands at
	// x=210/y=220 (bottom), y=100 (top), x=110/y=160 (left), x=310/y=160
	// (right); anchor center is 250,180; arrow box is 10x10.
	const cases: [Side, number, number][] = [
		['bottom', 35, -5],
		['top', 35, 35],
		['left', 75, 15],
		['right', -5, 15],
	]

	stubRect(ctx.trigger, { left: 200, top: 150, width: 100, height: 60 })
	stubSize(ctx.target, 80, 40)
	stubSize(ctx.arrow, 10, 10)

	for (const [nextSide, left, top] of cases) {
		side = nextSide
		ctx.view.place()

		expect(ctx.arrow.style.left).toBe(`${left}px`)
		expect(ctx.arrow.style.top).toBe(`${top}px`)
		expect(ctx.arrow.hasAttribute('data-uncentered')).toBe(false)
	}
})

test('clamps the arrow to the content bounds and toggles data-uncentered', () => {
	viewport(800, 600)

	let alignOffset = 60
	const ctx = mountArrow({
		side: () => 'bottom',
		align: () => 'start',
		alignOffset: () => alignOffset,
		sideOffset: () => 10,
		padding: () => 0,
	})

	stubRect(ctx.trigger, { left: 200, top: 150, width: 100, height: 60 })
	stubSize(ctx.target, 80, 40)
	stubSize(ctx.arrow, 10, 10)

	// Content at x=260: ideal left is 250-260-5 = -15, clamped to the 8px pad.
	ctx.view.place()

	expect(ctx.arrow.style.left).toBe('8px')
	expect(ctx.arrow.getAttribute('data-uncentered')).toBe('')

	// Content at x=140: ideal left is 105, clamped to 80-10-8 = 62.
	alignOffset = -60
	ctx.view.place()

	expect(ctx.arrow.style.left).toBe('62px')
	expect(ctx.arrow.getAttribute('data-uncentered')).toBe('')

	// Content at x=200: ideal left is 45, inside the bounds again.
	alignOffset = 0
	ctx.view.place()

	expect(ctx.arrow.style.left).toBe('45px')
	expect(ctx.arrow.hasAttribute('data-uncentered')).toBe(false)
})

test('retargets the arrow as it appears, swaps, and disappears', () => {
	viewport(800, 600)

	let view: View | undefined
	let trigger: HTMLButtonElement | null = null
	let target: HTMLDivElement | null = null
	let caret: HTMLSpanElement | null = null

	function* Gen(this: Host) {
		view = anchor(this, {
			anchor: () => trigger,
			target: () => target,
			arrow: () => caret,
			side: () => 'bottom',
			align: () => 'center',
			sideOffset: () => 10,
			padding: () => 0,
		})

		yield [
			jsx('button', { key: 'trigger', ref: (element: unknown) => trigger = element as HTMLButtonElement | null }),
			jsx('div', { key: 'target', ref: (element: unknown) => target = element as HTMLDivElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	stubRect(needButton(trigger), { left: 200, top: 150, width: 100, height: 60 })
	stubSize(needDiv(target), 80, 40)

	// No arrow yet: place is a safe no-op for the caret.
	expect(() => needView(view).place()).not.toThrow()

	const first = document.createElement('span')
	needDiv(target).append(first)
	stubSize(first, 10, 10)
	caret = first
	needView(view).place()

	expect(first.style.left).toBe('35px')
	expect(first.style.top).toBe('-5px')

	const second = document.createElement('span')
	needDiv(target).append(second)
	stubSize(second, 20, 10)
	caret = second
	needView(view).place()

	expect(second.style.left).toBe('30px')
	expect(second.style.top).toBe('-5px')
	expect(first.style.left).toBe('35px')

	caret = null
	first.remove()
	second.remove()

	expect(() => needView(view).place()).not.toThrow()
})

test('SSR inert view has stable no-op methods and option-derived side and align', () => {
	function* Gen(this: Host) {
		const view = anchor(this, {
			anchor: () => {
				throw new Error('anchor should not run on the server')
			},
			target: () => {
				throw new Error('target should not run on the server')
			},
			arrow: () => {
				throw new Error('arrow should not run on the server')
			},
			side: () => 'left',
			align: () => 'end',
		})

		view.place()
		view.watch()
		view.unwatch()

		yield jsx('span', { children: `${view.side}/${view.align}` })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>left/end</span></div>')
})
