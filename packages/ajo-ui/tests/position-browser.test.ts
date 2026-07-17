// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { beforeEach, expect, test, vi } from 'vitest'

const floating = vi.hoisted(() => ({
	active: 0,
	autoUpdate: vi.fn(),
	computePosition: vi.fn(),
}))

vi.mock('@floating-ui/dom', async importActual => ({
	...await importActual<typeof import('@floating-ui/dom')>(),
	autoUpdate: floating.autoUpdate,
	computePosition: floating.computePosition,
}))

import { pointReference, position, type PositionReference } from '../src/position'

const host = () => {
	const controller = new AbortController()
	const error = vi.fn()
	const element = document.createElement('div') as unknown as HTMLElement & {
		next: Host['next']
		signal: AbortSignal
		throw: Host['throw']
	}
	element.next = vi.fn() as Host['next']
	element.signal = controller.signal
	element.throw = error as Host['throw']
	return { controller, element: element as Host, error }
}

beforeEach(() => {
	document.body.replaceChildren()
	floating.active = 0
	floating.autoUpdate.mockReset().mockImplementation((_reference, _floating, update) => {
		floating.active++
		update()
		return () => floating.active--
	})
	floating.computePosition.mockReset().mockResolvedValue({
		x: 12,
		y: 24,
		placement: 'bottom-start',
		strategy: 'fixed',
		middlewareData: {},
	})
})

test('a protocol-only host stays inert even when an ambient DOM exists', async () => {
	const controller = new AbortController()
	const elements = vi.fn()
	const protocol = {
		next: vi.fn() as Host['next'],
		signal: controller.signal,
		throw: vi.fn() as Host['throw'],
	} as Host
	const view = position(protocol, { profile: 'popover', elements })

	expect(await view.start()).toBe(false)
	expect(await view.update()).toBe(false)
	expect(elements).not.toHaveBeenCalled()
	view.stop()
})

test('positioning reads DPR and direction from the host owner realm', async () => {
	const frame = document.createElement('iframe')
	document.body.append(frame)
	const owner = frame.contentDocument!
	const ownerView = frame.contentWindow!
	Object.defineProperty(ownerView, 'devicePixelRatio', { configurable: true, value: 2 })
	const controller = new AbortController()
	const element = owner.createElement('div') as unknown as HTMLElement & {
		next: Host['next']
		signal: AbortSignal
		throw: Host['throw']
	}
	element.next = vi.fn() as Host['next']
	element.signal = controller.signal
	element.throw = vi.fn() as Host['throw']
	const reference = owner.createElement('button')
	const target = owner.createElement('div')
	target.style.direction = 'rtl'
	owner.body.append(element, reference, target)
	floating.computePosition.mockResolvedValueOnce({
		x: 0.25,
		y: 0.25,
		placement: 'bottom-start',
		strategy: 'fixed',
		middlewareData: {},
	})
	const view = position(element as Host, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	expect(await view.start()).toBe(true)
	expect(target.style.left).toBe('0.5px')
	expect(target.style.top).toBe('0.5px')
	expect(target.style.transformOrigin).toBe('100% 0%')
	view.stop()
})

test('position owns one observable scope and commits current popup layout', async () => {
	const firstReference = document.createElement('button')
	const secondReference = document.createElement('button')
	const target = document.createElement('div')
	target.style.transform = 'rotate(3deg)'
	document.body.append(firstReference, secondReference, target)
	let reference = firstReference
	const { element } = host()
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
		placement: () => 'bottom-start',
	})

	expect(await view.start()).toBe(true)
	expect(floating.active).toBe(1)
	expect(target.style.position).toBe('fixed')
	expect(target.style.left).toBe('12px')
	expect(target.style.top).toBe('24px')
	expect(target.style.transform).toBe('rotate(3deg)')
	expect(target.dataset.placement).toBe('bottom-start')
	expect(target.dataset.side).toBe('bottom')
	expect(target.dataset.align).toBe('start')
	expect(target.style.transformOrigin).toBe('0% 0%')

	reference = secondReference
	expect(await view.start()).toBe(true)
	expect(floating.active).toBe(1)

	view.stop()
	expect(floating.active).toBe(0)
})

test('menubar profile keeps its shared gap and private cross-axis correction', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	const { element } = host()
	const view = position(element, {
		profile: 'menubar',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	expect(await view.start()).toBe(true)
	const options = floating.computePosition.mock.calls[0]?.[2] as {
		middleware?: Array<{ name: string, options?: { crossAxis?: number, mainAxis?: number } }>
		placement?: string
	}
	const offset = options.middleware?.find(item => item.name === 'offset')

	expect(options.placement).toBe('bottom-start')
	expect(offset?.options).toEqual({ crossAxis: -4, mainAxis: 8 })
	view.stop()
})

test('automatic placement and preferred placement select mutually exclusive collision middleware', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	const { element } = host()
	let placement: 'auto' | 'bottom-start' = 'bottom-start'
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
		placement: () => placement,
	})

	expect(await view.start()).toBe(true)
	const preferred = floating.computePosition.mock.calls[0]?.[2] as { middleware?: Array<{ name: string }> }
	const preferredNames = preferred.middleware?.map(item => item.name) ?? []
	expect(preferredNames).toContain('flip')
	expect(preferredNames).not.toContain('autoPlacement')
	expect(preferredNames.indexOf('inline')).toBeLessThan(preferredNames.indexOf('offset'))

	placement = 'auto'
	expect(await view.start()).toBe(true)
	const automatic = floating.computePosition.mock.calls[1]?.[2] as { middleware?: Array<{ name: string }> }
	expect(automatic.middleware?.map(item => item.name)).toContain('autoPlacement')
	expect(automatic.middleware?.map(item => item.name)).not.toContain('flip')
	view.stop()
})

test('reference clipping can differ from collision and size boundaries', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	const collisionBoundary = document.createElement('section')
	const referenceBoundary = document.createElement('aside')
	document.body.append(collisionBoundary, referenceBoundary, reference, target)
	const { element } = host()
	const view = position(element, {
		profile: 'submenu',
		boundary: () => collisionBoundary,
		elements: () => ({ arrow: null, floating: target, reference }),
		referenceBoundary: () => referenceBoundary,
	})

	expect(await view.start()).toBe(true)
	const options = floating.computePosition.mock.calls[0]?.[2] as {
		middleware?: Array<{ name: string, options?: { boundary?: Element, strategy?: string } }>
	}
	const middleware = options.middleware ?? []
	const flip = middleware.find(item => item.name === 'flip')
	const size = middleware.find(item => item.name === 'size')
	const hides = middleware.filter(item => item.name === 'hide')

	expect(flip?.options?.boundary).toBe(collisionBoundary)
	expect(size?.options?.boundary).toBe(collisionBoundary)
	expect(hides).toHaveLength(2)
	expect(hides[0]?.options?.boundary).toBe(referenceBoundary)
	expect(hides[0]?.options?.strategy).not.toBe('escaped')
	expect(hides[1]?.options?.boundary).toBe(collisionBoundary)
	expect(hides[1]?.options?.strategy).toBe('escaped')
	view.stop()
})

test('a new tuple starts its own calculation while the previous tuple is pending', async () => {
	const firstReference = document.createElement('button')
	const secondReference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(firstReference, secondReference, target)
	const { element } = host()
	let reference = firstReference
	let resolveFirst!: (value: {
		x: number
		y: number
		placement: 'bottom'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}) => void
	floating.computePosition
		.mockReturnValueOnce(new Promise(done => resolveFirst = done))
		.mockResolvedValueOnce({ x: 44, y: 55, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	const first = view.start()
	reference = secondReference
	const second = view.start()
	resolveFirst({ x: 1, y: 2, placement: 'bottom', strategy: 'fixed', middlewareData: {} })

	expect(await first).toBe(false)
	expect(await second).toBe(true)
	expect(floating.computePosition).toHaveBeenCalledTimes(2)
	expect(target.style.left).toBe('44px')
	expect(target.style.top).toBe('55px')
	expect(floating.active).toBe(1)
	view.stop()
})

test('a stopped position never commits an in-flight result', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	const { element } = host()
	let resolve!: (value: {
		x: number
		y: number
		placement: 'top'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}) => void
	floating.computePosition.mockReturnValueOnce(new Promise(done => resolve = done))
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	const started = view.start()
	view.stop()
	resolve({ x: 80, y: 40, placement: 'top', strategy: 'fixed', middlewareData: {} })

	expect(await started).toBe(false)
	expect(target.style.left).toBe('')
	expect(target.style.top).toBe('')
	expect(floating.active).toBe(0)
})

test('repeated updates coalesce into one trailing calculation', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	const { element } = host()
	let resolve!: (value: {
		x: number
		y: number
		placement: 'bottom'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}) => void
	floating.computePosition
		.mockReturnValueOnce(new Promise(done => resolve = done))
		.mockResolvedValue({ x: 30, y: 20, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	const started = view.start()
	const updates = Array.from({ length: 100 }, () => view.update())
	resolve({ x: 10, y: 10, placement: 'bottom', strategy: 'fixed', middlewareData: {} })

	expect(await started).toBe(true)
	expect(await Promise.all(updates)).toEqual(Array(100).fill(true))
	expect(floating.computePosition).toHaveBeenCalledTimes(2)
	expect(target.style.left).toBe('30px')
	view.stop()
})

test('a requested trailing update prevents the in-flight calculation from committing', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	const { element } = host()
	let resolveInFlight!: (value: {
		x: number
		y: number
		placement: 'bottom'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}) => void
	let resolveTrailing!: typeof resolveInFlight
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	expect(await view.start()).toBe(true)
	floating.computePosition
		.mockReturnValueOnce(new Promise(done => resolveInFlight = done))
		.mockReturnValueOnce(new Promise(done => resolveTrailing = done))
	const update = view.update()
	const coalesced = view.update()
	resolveInFlight({ x: 90, y: 80, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	for (let turn = 0; turn < 4; turn++) await Promise.resolve()

	expect(floating.computePosition).toHaveBeenCalledTimes(3)
	expect(target.style.left).toBe('12px')
	expect(target.style.top).toBe('24px')

	resolveTrailing({ x: 30, y: 20, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	expect(await Promise.all([update, coalesced])).toEqual([true, true])
	expect(target.style.left).toBe('30px')
	expect(target.style.top).toBe('20px')
	view.stop()
})

test('a stale start rejection does not stop the newer observation scope', async () => {
	const firstReference = document.createElement('button')
	const secondReference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(firstReference, secondReference, target)
	const { element } = host()
	let reference = firstReference
	let rejectFirst!: (error: unknown) => void
	let resolveSecond!: (value: {
		x: number
		y: number
		placement: 'bottom'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}) => void
	const failure = new Error('stale calculation failed')
	floating.computePosition
		.mockReturnValueOnce(new Promise((_resolve, reject) => rejectFirst = reject))
		.mockReturnValueOnce(new Promise(resolve => resolveSecond = resolve))
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	const first = view.start()
	reference = secondReference
	const second = view.start()
	rejectFirst(failure)
	expect(await first).toBe(false)
	expect(floating.active).toBe(1)

	resolveSecond({ x: 44, y: 55, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	expect(await second).toBe(true)
	expect(target.style.left).toBe('44px')
	expect(target.style.top).toBe('55px')
	expect(floating.active).toBe(1)
	view.stop()
})

test('a failed size calculation restores the last committed size outputs', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	const { element } = host()
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	expect(await view.start()).toBe(true)
	target.style.boxSizing = 'border-box'
	target.style.maxWidth = '200px'
	target.style.maxHeight = '100px'
	target.style.setProperty('--available-height', '100px')
	floating.computePosition.mockImplementationOnce(async (_reference, floatingElement, options) => {
		const entries = options?.middleware as Array<{ name?: string }> | undefined
		const middleware = entries?.find(item => item.name === 'size') as {
			options: { apply: (state: Record<string, unknown>) => void }
		}
		middleware.options.apply({
			availableHeight: 10,
			availableWidth: 20,
			elements: { floating: floatingElement, reference },
			rects: { reference: { height: 30, width: 40 } },
		})
		throw new Error('later middleware failed')
	})

	await expect(view.update()).rejects.toThrow('later middleware failed')
	expect(target.style.boxSizing).toBe('border-box')
	expect(target.style.maxWidth).toBe('200px')
	expect(target.style.maxHeight).toBe('100px')
	expect(target.style.getPropertyValue('--available-height')).toBe('100px')
	expect(target.style.getPropertyValue('--available-width')).toBe('')
	expect(target.style.getPropertyValue('--reference-height')).toBe('')
	expect(target.style.getPropertyValue('--reference-width')).toBe('')
	view.stop()
})

test('size profiles constrain oversized width and clamp negative availability', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	const { element } = host()
	floating.computePosition.mockImplementationOnce(async (_reference, floatingElement, options) => {
		const entries = options?.middleware as Array<{ name?: string }> | undefined
		const middleware = entries?.find(item => item.name === 'size') as {
			options: { apply: (state: Record<string, unknown>) => void }
		}
		middleware.options.apply({
			availableHeight: 80,
			availableWidth: -20,
			elements: { floating: floatingElement, reference },
			rects: { reference: { height: 30, width: 40 } },
		})
		return { x: 12, y: 24, placement: 'bottom', strategy: 'fixed', middlewareData: {} }
	})
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	expect(await view.start()).toBe(true)
	expect(target.style.boxSizing).toBe('border-box')
	expect(target.style.maxWidth).toBe('0px')
	expect(target.style.maxHeight).toBe('80px')
	expect(target.style.getPropertyValue('--available-width')).toBe('0px')
	expect(target.style.getPropertyValue('--available-height')).toBe('80px')
	expect(target.style.getPropertyValue('--reference-width')).toBe('40px')
	expect(target.style.getPropertyValue('--reference-height')).toBe('30px')
	view.stop()
})

test('tooltip size policy constrains width without owning caller height', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	target.style.maxHeight = '72px'
	document.body.append(reference, target)
	const { element } = host()
	floating.computePosition.mockImplementationOnce(async (_reference, floatingElement, options) => {
		const entries = options?.middleware as Array<{ name?: string }> | undefined
		const middleware = entries?.find(item => item.name === 'size') as {
			options: { apply: (state: Record<string, unknown>) => void }
		}
		middleware.options.apply({
			availableHeight: 40,
			availableWidth: 120,
			elements: { floating: floatingElement, reference },
			rects: { reference: { height: 20, width: 30 } },
		})
		return { x: 12, y: 24, placement: 'top', strategy: 'fixed', middlewareData: {} }
	})
	const view = position(element, {
		profile: 'tooltip',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	expect(await view.start()).toBe(true)
	expect(target.style.maxWidth).toBe('120px')
	expect(target.style.maxHeight).toBe('72px')
	view.stop()
})

test('arrow and clipping outputs preserve zero coordinates and clear stale state', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	const arrow = document.createElement('span')
	Object.defineProperties(arrow, {
		offsetHeight: { value: 8 },
		offsetWidth: { value: 8 },
	})
	target.append(arrow)
	document.body.append(reference, target)
	const { element } = host()
	const hidden: boolean[] = []
	floating.computePosition.mockResolvedValueOnce({
		x: 12,
		y: 24,
		placement: 'bottom',
		strategy: 'fixed',
		middlewareData: {
			arrow: { centerOffset: 3, x: 0 },
			hide: { escaped: true, referenceHidden: true },
		},
	})
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow, floating: target, reference }),
		referenceHidden: value => hidden.push(value),
	})

	expect(await view.start()).toBe(true)
	expect(arrow.style.left).toBe('0px')
	expect(arrow.style.top).toBe('-4px')
	expect(arrow.dataset.arrowUncentered).toBe('true')
	expect(target.style.getPropertyValue('--popup-arrow-center')).toBe('4px')
	expect(target.dataset.referenceHidden).toBe('true')
	expect(target.dataset.escaped).toBe('true')
	expect(hidden).toEqual([true])

	floating.computePosition.mockResolvedValueOnce({
		x: 12,
		y: 24,
		placement: 'bottom',
		strategy: 'fixed',
		middlewareData: { arrow: { centerOffset: 0, x: 4 }, hide: {} },
	})
	expect(await view.update()).toBe(true)
	expect(arrow.style.left).toBe('4px')
	expect(arrow.dataset.arrowUncentered).toBeUndefined()
	expect(target.style.getPropertyValue('--popup-arrow-center')).toBe('8px')
	expect(target.dataset.referenceHidden).toBeUndefined()
	expect(target.dataset.escaped).toBeUndefined()
	expect(hidden).toEqual([true, false])
	view.stop()
})

test('chart uses the transform writer only while active', async () => {
	const root = document.createElement('div')
	const target = document.createElement('div')
	root.append(target)
	document.body.append(root)
	const reference = {
		contextElement: root,
		getBoundingClientRect: () => new DOMRect(40, 20, 0, 0),
	}
	const { element } = host()
	floating.computePosition.mockResolvedValueOnce({
		x: 20.5,
		y: 30.5,
		placement: 'right',
		strategy: 'absolute',
		middlewareData: {},
	})
	const view = position(element, {
		profile: 'chart',
		boundary: () => root,
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	expect(await view.start()).toBe(true)
	expect(target.style.position).toBe('absolute')
	expect(target.style.left).toBe('0px')
	expect(target.style.top).toBe('0px')
	expect(target.style.transform).toBe('translate(21px, 31px)')
	expect(target.style.willChange).toBe('transform')
	expect(target.style.transformOrigin).toBe('')
	expect(target.dataset.positioned).toBe('true')
	const options = floating.computePosition.mock.calls[0]?.[2] as {
		middleware?: Array<{ name: string, options?: { boundary?: Element, crossAxis?: number, mainAxis?: number } }>
		placement?: string
		strategy?: string
	}
	const names = options.middleware?.map(item => item.name) ?? []
	expect(options.placement).toBe('right')
	expect(options.strategy).toBe('absolute')
	expect(names).toEqual(['offset', 'flip', 'shift'])
	expect(options.middleware?.[0]?.options).toEqual({ crossAxis: 0, mainAxis: 12 })
	expect(options.middleware?.[1]?.options?.boundary).toBe(root)
	expect(options.middleware?.[2]?.options?.boundary).toBe(root)
	expect(floating.autoUpdate.mock.calls[0]).toHaveLength(3)

	view.stop()
	expect(target.style.transform).toBe('')
	expect(target.style.willChange).toBe('')
	expect(target.dataset.positioned).toBeUndefined()
})

test('point reference keeps stable identity while reading the current zero-area point', () => {
	let contextElement: Element = document.createElement('div')
	const point = { x: 14, y: 22 }
	const reference = pointReference(() => contextElement, () => point)

	expect((reference as { contextElement?: Element }).contextElement).toBe(contextElement)
	expect(reference.getBoundingClientRect()).toEqual({
		x: 14,
		y: 22,
		top: 22,
		right: 14,
		bottom: 22,
		left: 14,
		width: 0,
		height: 0,
	})
	point.x = 40
	point.y = 52
	const nextContext = document.createElement('svg')
	contextElement = nextContext
	expect((reference as { contextElement?: Element }).contextElement).toBe(nextContext)
	expect(reference.getBoundingClientRect()).toMatchObject({ x: 40, y: 52, top: 52, right: 40 })
})

test('an inline profile preserves a Range-style multi-rect virtual reference', async () => {
	const contextElement = document.createElement('span')
	const target = document.createElement('div')
	document.body.append(contextElement, target)
	const first = new DOMRect(10, 20, 50, 18)
	const second = new DOMRect(10, 38, 30, 18)
	const reference: PositionReference = {
		contextElement,
		getBoundingClientRect: () => new DOMRect(10, 20, 50, 36),
		getClientRects: () => [first, second] as unknown as DOMRectList,
	}
	const { element } = host()
	const view = position(element, {
		profile: 'tooltip',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	expect(await view.start()).toBe(true)
	expect(floating.autoUpdate.mock.calls[0]?.[0]).toBe(reference)
	expect(floating.computePosition.mock.calls[0]?.[0]).toBe(reference)
	const options = floating.computePosition.mock.calls[0]?.[2] as { middleware?: Array<{ name: string }> }
	expect(options.middleware?.slice(0, 2).map(item => item.name)).toEqual(['inline', 'offset'])

	view.stop()
	contextElement.remove()
	expect(await view.start()).toBe(false)
})

test('replacing the floating element clears every Adapter-owned output from the old element', async () => {
	const reference = document.createElement('button')
	const first = document.createElement('div')
	const second = document.createElement('div')
	first.style.transform = 'scale(0.9)'
	document.body.append(reference, first, second)
	const { element } = host()
	let target = first
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	expect(await view.start()).toBe(true)
	first.style.boxSizing = 'border-box'
	first.style.maxWidth = '200px'
	first.style.maxHeight = '100px'
	first.style.setProperty('--reference-width', '20px')
	first.style.setProperty('--reference-height', '10px')
	first.style.setProperty('--available-width', '200px')
	first.style.setProperty('--available-height', '100px')
	first.dataset.referenceHidden = 'true'
	first.dataset.escaped = 'true'
	target = second

	expect(await view.start()).toBe(true)
	expect(first.style.position).toBe('')
	expect(first.style.left).toBe('')
	expect(first.style.top).toBe('')
	expect(first.style.transform).toBe('scale(0.9)')
	expect(first.style.transformOrigin).toBe('')
	expect(first.style.boxSizing).toBe('')
	expect(first.style.maxWidth).toBe('')
	expect(first.style.maxHeight).toBe('')
	expect(first.style.getPropertyValue('--reference-width')).toBe('')
	expect(first.style.getPropertyValue('--reference-height')).toBe('')
	expect(first.style.getPropertyValue('--available-width')).toBe('')
	expect(first.style.getPropertyValue('--available-height')).toBe('')
	expect(first.dataset.placement).toBeUndefined()
	expect(first.dataset.side).toBeUndefined()
	expect(first.dataset.align).toBeUndefined()
	expect(first.dataset.referenceHidden).toBeUndefined()
	expect(first.dataset.escaped).toBeUndefined()
	view.stop()
})

test('abort and repeated start-stop cycles leave no observation scope', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	const { controller, element } = host()
	const view = position(element, {
		profile: 'tooltip',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	for (let cycle = 0; cycle < 100; cycle++) {
		expect(await view.start()).toBe(true)
		expect(floating.active).toBe(1)
		view.stop()
		expect(floating.active).toBe(0)
	}

	expect(await view.start()).toBe(true)
	controller.abort()
	expect(floating.active).toBe(0)
})

test('start stays inert after its host has already aborted', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	const { controller, element } = host()
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	controller.abort()
	expect(await view.start()).toBe(false)
	expect(floating.autoUpdate).not.toHaveBeenCalled()
	expect(floating.active).toBe(0)
})

test('a throwing observer disposer is surfaced once after the scope becomes inert', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	const cleanup = vi.fn(() => {
		floating.active--
		throw new Error('dispose failed')
	})
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		floating.active++
		update()
		return cleanup
	})
	const { element, error } = host()
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	expect(await view.start()).toBe(true)
	view.stop()
	expect(floating.active).toBe(0)
	expect(cleanup).toHaveBeenCalledTimes(1)
	expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'dispose failed' }))

	view.stop()
	expect(cleanup).toHaveBeenCalledTimes(1)
})

test('observer update errors leave the Promise chain handled before Host.throw runs', async () => {
	const reference = document.createElement('button')
	const target = document.createElement('div')
	document.body.append(reference, target)
	let observedUpdate: (() => void) | undefined
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		floating.active++
		observedUpdate = update
		update()
		return () => floating.active--
	})
	const queued: Array<() => void> = []
	const queue = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(callback => queued.push(callback))
	const { element } = host()
	const failure = new Error('observer update failed')
	element.throw = ((error: unknown) => { throw error }) as Host['throw']
	const view = position(element, {
		profile: 'popover',
		elements: () => ({ arrow: null, floating: target, reference }),
	})

	try {
		expect(await view.start()).toBe(true)
		floating.computePosition.mockRejectedValueOnce(failure)
		observedUpdate?.()
		for (let turn = 0; turn < 4; turn++) await Promise.resolve()

		expect(queued).toHaveLength(1)
		expect(() => queued[0]?.()).toThrow(failure)
	} finally {
		view.stop()
		queue.mockRestore()
	}
})
