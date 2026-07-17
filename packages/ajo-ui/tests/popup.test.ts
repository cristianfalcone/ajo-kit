// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render as toString } from 'ajo/html'
import { beforeEach, expect, test, vi } from 'vitest'

const floating = vi.hoisted(() => ({
	autoUpdate: vi.fn(),
	computePosition: vi.fn(),
}))

vi.mock('@floating-ui/dom', async importActual => ({
	...await importActual<typeof import('@floating-ui/dom')>(),
	autoUpdate: floating.autoUpdate,
	computePosition: floating.computePosition,
}))

import { PopoverContent } from '../src/popover'
import { popup } from '../src/popup'
import { TooltipContent } from '../src/tooltip'

const host = () => {
	const controller = new AbortController()
	const error = vi.fn()
	const element = document.createElement('div') as unknown as Host
	Object.assign(element, {
		next: (fn?: () => unknown) => fn?.(),
		signal: controller.signal,
		throw: error,
	})
	document.body.append(element as unknown as HTMLElement)
	return { controller, element, error }
}

beforeEach(() => {
	document.body.replaceChildren()
	floating.autoUpdate.mockReset()
	floating.computePosition.mockReset()
})

test('content families own a stable surface and their intended arrow policy', () => {
	const popover = toString(PopoverContent({ children: 'Popover' }))
	const arrowPopover = toString(PopoverContent({ arrow: true, children: 'Popover' }))
	const tooltip = toString(TooltipContent({ children: 'Tooltip' }))

	expect(popover).toContain('data-slot="popup-surface"')
	expect(popover).not.toContain('data-arrow="true"')
	expect(popover).not.toContain('data-slot="popup-arrow"')
	expect(arrowPopover).toContain('data-arrow="true"')
	expect(arrowPopover).toContain('data-slot="popup-surface"')
	expect(arrowPopover).toContain('data-slot="popup-arrow"')
	expect(tooltip).toContain('data-arrow="true"')
	expect(tooltip).toContain('data-slot="popup-surface"')
	expect(tooltip).toContain('data-slot="popup-arrow"')
	expect(tooltip).toContain('width:14px;height:14px')
	expect(tooltip).toContain('background:transparent')
	expect(tooltip).toContain('opacity:0')
})

test('a protocol-only host does not create DOM parser state from the ambient document', () => {
	const controller = new AbortController()
	const createElement = vi.spyOn(document, 'createElement')
	const protocol = {
		next: vi.fn() as Host['next'],
		signal: controller.signal,
		throw: vi.fn() as Host['throw'],
	} as Host

	popup(protocol, { profile: 'popover', prefix: 'test', initialOpen: false })
	expect(createElement).not.toHaveBeenCalled()
	createElement.mockRestore()
})

test('popup creates style parser state in the host owner document', () => {
	const owner = document.implementation.createHTMLDocument('owner')
	const controller = new AbortController()
	const element = owner.createElement('div') as unknown as Host
	Object.assign(element, {
		next: vi.fn() as Host['next'],
		signal: controller.signal,
		throw: vi.fn() as Host['throw'],
	})
	const ambientCreate = vi.spyOn(document, 'createElement')
	const ownerCreate = vi.spyOn(owner, 'createElement')

	popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	expect(ownerCreate).toHaveBeenCalledWith('span')
	expect(ambientCreate).not.toHaveBeenCalled()
	ambientCreate.mockRestore()
	ownerCreate.mockRestore()
})

test('trigger id adoption is synchronous and reversible before element refs run', () => {
	const { element } = host()
	const view = popup(element, { profile: 'menu', prefix: 'test', initialOpen: false })
	const generated = view.triggerId
	const trigger = document.createElement('button')
	trigger.id = 'custom-trigger'

	expect(view.adoptTriggerId('custom-trigger')).toBe('custom-trigger')
	expect(view.triggerId).toBe('custom-trigger')
	view.setTrigger(trigger)
	expect(view.triggerId).toBe('custom-trigger')
	expect(view.adoptTriggerId()).toBe(generated)
	expect(view.triggerId).toBe(generated)
})

test('popup reveals and focuses only after a current first position commit', async () => {
	const events: string[] = []
	let nativeOpen = false
	let resolve!: (value: {
		x: number
		y: number
		placement: 'bottom'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}) => void
	floating.computePosition.mockReturnValueOnce(new Promise(done => resolve = done))
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		events.push('observe')
		return () => events.push('stop')
	})

	const { element } = host()
	const trigger = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: (options?: { source?: HTMLElement }) => void
	}
	const matches = content.matches.bind(content)
	content.matches = ((selector: string) => selector === ':popover-open' ? nativeOpen : matches(selector)) as typeof content.matches
	content.showPopover = options => {
		expect(options?.source).toBe(trigger)
		nativeOpen = true
		events.push('show')
	}
	content.hidePopover = () => {
		nativeOpen = false
		events.push('hide')
	}
	document.body.append(trigger, content)
	const view = popup(element, {
		profile: 'popover',
		prefix: 'test',
		initialOpen: false,
		onSync: open => events.push(open ? 'focus' : 'closed'),
	})
	view.setTrigger(trigger)
	view.setContent(content)
	view.sync(undefined, { placement: 'bottom', gap: 4 })
	const event = new Event('click')
	Object.defineProperty(event, 'currentTarget', { value: trigger })
	view.setOpen(true, event)

	await vi.waitFor(() => expect(events).toContain('observe'))
	expect(content.style.visibility).toBe('hidden')
	expect(events).not.toContain('focus')

	resolve({ x: 10, y: 20, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	await vi.waitFor(() => expect(events).toContain('focus'))
	expect(content.style.visibility).toBe('')
	expect(content.dataset.state).toBe('open')

	view.close()
	await vi.waitFor(() => expect(events).toContain('hide'))
	expect(events.indexOf('stop')).toBeLessThan(events.indexOf('hide'))
	expect(content.dataset.state).toBe('closed')
})

test('ordinary open renders do not reopen or recreate the observation scope', async () => {
	let nativeOpen = false
	const cleanup = vi.fn()
	floating.computePosition.mockResolvedValue({
		x: 10,
		y: 20,
		placement: 'bottom',
		strategy: 'fixed',
		middlewareData: {},
	})
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return cleanup
	})

	const { element } = host()
	const trigger = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: () => void
	}
	content.matches = ((selector: string) => selector === ':popover-open' && nativeOpen) as typeof content.matches
	content.showPopover = vi.fn(() => nativeOpen = true)
	content.hidePopover = vi.fn(() => nativeOpen = false)
	document.body.append(trigger, content)

	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	view.setTrigger(trigger)
	view.setContent(content)
	view.sync(undefined, { placement: 'bottom', gap: 4 })
	view.setOpen(true)
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))

	view.sync(undefined, { placement: 'bottom', gap: 4 })
	view.sync(undefined, { placement: 'bottom', gap: 4 })
	await Promise.resolve()
	await Promise.resolve()

	expect(content.showPopover).toHaveBeenCalledTimes(1)
	expect(floating.autoUpdate).toHaveBeenCalledTimes(1)
	expect(cleanup).not.toHaveBeenCalled()
})

test('caller styles survive open rerenders and arrow overflow is reversible', () => {
	const { element } = host()
	const content = document.createElement('div')
	const arrow = document.createElement('span')
	document.body.append(content)
	content.append(arrow)
	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	content.style.cssText = view.contentStyle('color:red;overflow:auto;transform:rotate(3deg)')
	content.style.position = 'fixed'
	content.style.left = '12px'
	content.style.top = '24px'
	content.style.transformOrigin = '0% 0%'
	content.style.maxWidth = '240px'
	content.style.maxHeight = '120px'
	content.style.setProperty('--available-height', '120px')
	content.style.setProperty('--popup-arrow-center', '42px')

	view.setContent(content)
	const arrowAttrs = view.arrowAttrs()
	arrowAttrs.ref(arrow)
	expect(content.style.overflow).toBe('visible')

	content.setAttribute('style', view.contentStyle('color:blue;overflow:auto;transform:scale(0.9)'))
	view.setContent(content)
	expect(content.style.position).toBe('fixed')
	expect(content.style.left).toBe('12px')
	expect(content.style.top).toBe('24px')
	expect(content.style.transformOrigin).toBe('0% 0%')
	expect(content.style.maxWidth).toBe('240px')
	expect(content.style.maxHeight).toBe('120px')
	expect(content.style.getPropertyValue('--available-height')).toBe('120px')
	expect(content.style.getPropertyValue('--popup-arrow-center')).toBe('42px')
	expect(content.style.color).toBe('blue')
	expect(content.style.transform).toBe('scale(0.9)')
	expect(content.style.overflow).toBe('visible')

	arrowAttrs.ref(null)
	expect(content.style.overflow).toBe('auto')
	expect(content.style.position).toBe('fixed')
	expect(content.style.left).toBe('12px')
	expect(content.style.transform).toBe('scale(0.9)')
})

test('one stable ref owns the current internal arrow probe', () => {
	const { element } = host()
	const content = document.createElement('div')
	const first = document.createElement('span')
	const second = document.createElement('span')
	content.append(first, second)
	document.body.append(content)
	const view = popup(element, { profile: 'tooltip', prefix: 'test', initialOpen: false })
	content.style.cssText = view.contentStyle('overflow:auto')
	view.setContent(content)
	const attrs = view.arrowAttrs()

	expect(view.arrowAttrs().ref).toBe(attrs.ref)
	attrs.ref(first)
	expect(content.style.overflow).toBe('visible')
	first.style.left = '8px'
	expect(view.arrowAttrs().style).toContain('left:8px')

	attrs.ref(second)
	expect(first.hidden).toBe(false)
	expect(second.hidden).toBe(false)
	expect(content.style.overflow).toBe('visible')

	attrs.ref(null)
	expect(content.style.overflow).toBe('auto')
})

test('abort before the scheduled opening prevents native and geometry work', async () => {
	let nativeOpen = false
	const { controller, element } = host()
	const trigger = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: () => void
	}
	content.matches = ((selector: string) => selector === ':popover-open' && nativeOpen) as typeof content.matches
	content.showPopover = vi.fn(() => nativeOpen = true)
	content.hidePopover = vi.fn(() => nativeOpen = false)
	document.body.append(trigger, content)

	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	view.setTrigger(trigger)
	view.setContent(content)
	view.setOpen(true)
	controller.abort()
	await Promise.resolve()
	await Promise.resolve()

	expect(view.open).toBe(false)
	expect(content.showPopover).not.toHaveBeenCalled()
	expect(floating.autoUpdate).not.toHaveBeenCalled()
	expect(content.dataset.state).toBe('closed')
})

test('native open failure is observable instead of leaving silent open state', async () => {
	const { element, error } = host()
	const trigger = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & { showPopover: () => void }
	const matches = content.matches.bind(content)
	content.matches = ((selector: string) => selector === ':popover-open' ? false : matches(selector)) as typeof content.matches
	content.showPopover = vi.fn()
	document.body.append(trigger, content)

	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	view.setTrigger(trigger)
	view.setContent(content)
	view.sync(undefined)
	view.setOpen(true)

	await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1))
	expect(error.mock.calls[0]?.[0]).toBeInstanceOf(Error)
	expect(floating.autoUpdate).not.toHaveBeenCalled()
	expect(view.open).toBe(false)
	expect(content.dataset.state).toBe('closed')
	expect(content.style.visibility).toBe('')
})

test('scheduled popup failures leave the Promise chain handled before Host.throw runs', async () => {
	const queued: Array<() => void> = []
	const queue = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(callback => queued.push(callback))
	const { element } = host()
	element.throw = ((error: unknown) => { throw error }) as Host['throw']
	const trigger = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & { showPopover: () => void }
	content.matches = ((selector: string) => selector === ':popover-open' ? false : false) as typeof content.matches
	content.showPopover = vi.fn()
	document.body.append(trigger, content)
	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	view.setTrigger(trigger)
	view.setContent(content)

	try {
		view.setOpen(true)
		expect(queued).toHaveLength(1)
		queued.shift()?.()
		for (let turn = 0; turn < 6; turn++) await Promise.resolve()

		expect(queued).toHaveLength(1)
		expect(() => queued[0]?.()).toThrow('Failed to open the native popover')
		expect(view.open).toBe(false)
	} finally {
		queue.mockRestore()
	}
})

test('a current first-position cancellation closes the native surface instead of stranding it hidden', async () => {
	let nativeOpen = false
	let resolve!: (value: {
		x: number
		y: number
		placement: 'bottom'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}) => void
	floating.computePosition.mockReturnValueOnce(new Promise(done => resolve = done))
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element } = host()
	const trigger = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: () => void
	}
	const matches = content.matches.bind(content)
	content.matches = ((selector: string) => selector === ':popover-open' ? nativeOpen : matches(selector)) as typeof content.matches
	content.showPopover = () => nativeOpen = true
	content.hidePopover = () => nativeOpen = false
	document.body.append(trigger, content)

	const changes = vi.fn()
	const view = popup(element, {
		profile: 'popover',
		prefix: 'test',
		initialOpen: false,
		onOpenChange: changes,
	})
	view.setTrigger(trigger)
	view.setContent(content)
	view.sync(undefined)
	view.setOpen(true)
	await vi.waitFor(() => expect(nativeOpen).toBe(true))
	trigger.remove()
	resolve({ x: 10, y: 20, placement: 'bottom', strategy: 'fixed', middlewareData: {} })

	await vi.waitFor(() => expect(nativeOpen).toBe(false))
	expect(view.open).toBe(false)
	expect(changes.mock.calls.map(call => call[0])).toEqual([true, false])
	expect(content.dataset.state).toBe('closed')
	expect(content.style.visibility).toBe('')
})

test('the hide policy remains hidden when the first geometry commit reports a clipped reference', async () => {
	let nativeOpen = false
	floating.computePosition
		.mockResolvedValueOnce({
			x: 10,
			y: 20,
			placement: 'top',
			strategy: 'fixed',
			middlewareData: { hide: { referenceHidden: true } },
		})
		.mockResolvedValue({
			x: 10,
			y: 20,
			placement: 'top',
			strategy: 'fixed',
			middlewareData: { hide: { referenceHidden: false } },
		})
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element } = host()
	const trigger = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: () => void
	}
	const matches = content.matches.bind(content)
	content.matches = ((selector: string) => selector === ':popover-open' ? nativeOpen : matches(selector)) as typeof content.matches
	content.showPopover = () => nativeOpen = true
	content.hidePopover = () => nativeOpen = false
	document.body.append(trigger, content)

	const view = popup(element, {
		profile: 'tooltip',
		prefix: 'test',
		initialOpen: false,
		referenceHidden: 'hide',
	})
	view.setTrigger(trigger)
	content.style.cssText = view.contentStyle('visibility:visible!important;pointer-events:auto!important')
	view.setContent(content)
	view.sync(undefined)
	view.setOpen(true)

	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))
	expect(content.style.visibility).toBe('hidden')
	expect(content.style.pointerEvents).toBe('none')

	await view.update()
	await vi.waitFor(() => expect(content.hasAttribute('data-reference-hidden')).toBe(false))
	expect(content.style.visibility).toBe('visible')
	expect(content.style.pointerEvents).toBe('auto')
	expect(content.style.getPropertyPriority('visibility')).toBe('important')
	expect(content.style.getPropertyPriority('pointer-events')).toBe('important')

	view.close()
	expect(content.style.visibility).toBe('visible')
	expect(content.style.pointerEvents).toBe('auto')
})

test('outside dismissal follows native open order even when first commits resolve out of order', async () => {
	type Result = {
		x: number
		y: number
		placement: 'bottom'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}
	let resolveFirst!: (value: Result) => void
	let resolveSecond!: (value: Result) => void
	floating.computePosition
		.mockReturnValueOnce(new Promise(done => resolveFirst = done))
		.mockReturnValueOnce(new Promise(done => resolveSecond = done))
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})

	const create = () => {
		let nativeOpen = false
		const { element } = host()
		const trigger = document.createElement('button')
		const content = document.createElement('div') as HTMLDivElement & {
			hidePopover: () => void
			showPopover: () => void
		}
		const matches = content.matches.bind(content)
		content.matches = ((selector: string) => selector === ':popover-open' ? nativeOpen : matches(selector)) as typeof content.matches
		content.showPopover = () => nativeOpen = true
		content.hidePopover = () => nativeOpen = false
		document.body.append(trigger, content)
		const view = popup(element, {
			profile: 'popover',
			prefix: 'test',
			initialOpen: false,
			dismiss: { outside: true },
		})
		view.setTrigger(trigger)
		view.setContent(content)
		view.sync(undefined)
		return { content, trigger, view }
	}

	const first = create()
	const second = create()
	first.view.setOpen(true)
	await vi.waitFor(() => expect(floating.computePosition).toHaveBeenCalledTimes(1))
	second.view.setOpen(true)
	await vi.waitFor(() => expect(floating.computePosition).toHaveBeenCalledTimes(2))
	resolveSecond({ x: 2, y: 2, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	await vi.waitFor(() => expect(second.content.dataset.state).toBe('open'))
	resolveFirst({ x: 1, y: 1, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	await vi.waitFor(() => expect(first.content.dataset.state).toBe('open'))

	const outside = document.createElement('button')
	document.body.append(outside)
	outside.dispatchEvent(new Event('pointerdown', { bubbles: true }))

	expect(first.view.open).toBe(true)
	expect(second.view.open).toBe(false)
})

test('retargeting an open popup keeps semantic open state while fresh geometry is pending', async () => {
	let nativeOpen = false
	let resolveRetarget!: (value: {
		x: number
		y: number
		placement: 'bottom'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}) => void
	floating.computePosition
		.mockResolvedValueOnce({ x: 10, y: 20, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
		.mockReturnValueOnce(new Promise(done => resolveRetarget = done))
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element } = host()
	const firstReference = document.createElement('button')
	const secondReference = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: () => void
	}
	const matches = content.matches.bind(content)
	content.matches = ((selector: string) => selector === ':popover-open' ? nativeOpen : matches(selector)) as typeof content.matches
	content.showPopover = vi.fn(() => nativeOpen = true)
	content.hidePopover = vi.fn(() => nativeOpen = false)
	document.body.append(firstReference, secondReference, content)

	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	view.setReference(firstReference)
	view.setContent(content)
	view.sync(undefined)
	view.setOpen(true)
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))

	view.setReference(secondReference)
	await vi.waitFor(() => expect(floating.computePosition).toHaveBeenCalledTimes(2))
	expect(content.dataset.state).toBe('open')
	expect(content.style.visibility).toBe('hidden')
	resolveRetarget({ x: 30, y: 40, placement: 'bottom', strategy: 'fixed', middlewareData: {} })

	await vi.waitFor(() => expect(content.style.visibility).toBe(''))
	expect(content.dataset.state).toBe('open')
	expect(content.showPopover).toHaveBeenCalledTimes(1)
})

test('context retarget refreshes native source while same-reference updates keep one scope', async () => {
	let nativeOpen = false
	let source = document.createElement('button')
	const firstSource = source
	const secondSource = document.createElement('button')
	const firstReference = {
		contextElement: firstSource,
		getBoundingClientRect: () => new DOMRect(10, 20, 0, 0),
	}
	let point = { x: 30, y: 40 }
	const secondReference = {
		contextElement: secondSource,
		getBoundingClientRect: () => new DOMRect(point.x, point.y, 0, 0),
	}
	const cleanup = vi.fn()
	floating.computePosition.mockResolvedValue({
		x: 10,
		y: 20,
		placement: 'bottom-start',
		strategy: 'fixed',
		middlewareData: {},
	})
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return cleanup
	})
	const { element } = host()
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: (options?: { source?: HTMLElement }) => void
	}
	const sources: Array<HTMLElement | undefined> = []
	const changes = vi.fn()
	const positioned = vi.fn()
	content.matches = ((selector: string) => selector === ':popover-open' && nativeOpen) as typeof content.matches
	content.showPopover = options => {
		sources.push(options?.source)
		nativeOpen = true
	}
	content.hidePopover = vi.fn(() => nativeOpen = false)
	document.body.append(firstSource, secondSource, content)

	const view = popup(element, {
		profile: 'context',
		prefix: 'test',
		initialOpen: false,
		onOpenChange: changes,
		onPosition: positioned,
		reopenOnReferenceChange: true,
		source: () => source,
	})
	view.setReference(firstReference)
	view.setContent(content)
	view.setOpen(true)
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))

	source = secondSource
	view.setReference(secondReference)
	await vi.waitFor(() => expect(sources).toHaveLength(2))
	expect(sources).toEqual([firstSource, secondSource])
	expect(content.hidePopover).toHaveBeenCalledTimes(1)
	expect(changes.mock.calls.map(call => call[0])).toEqual([true])
	expect(floating.autoUpdate).toHaveBeenCalledTimes(2)
	expect(cleanup).toHaveBeenCalledTimes(1)

	const calculations = floating.computePosition.mock.calls.length
	point = { x: 50, y: 60 }
	view.update()
	view.update()
	await vi.waitFor(() => expect(floating.computePosition.mock.calls.length).toBeGreaterThan(calculations))
	expect(floating.autoUpdate).toHaveBeenCalledTimes(2)
	expect(content.hidePopover).toHaveBeenCalledTimes(1)
	expect(sources).toHaveLength(2)
	expect(positioned).toHaveBeenCalled()
})

test('event source identity expires on close before a later programmatic opening', async () => {
	let nativeOpen = false
	const sources: Array<HTMLElement | undefined> = []
	floating.computePosition.mockResolvedValue({
		x: 10,
		y: 20,
		placement: 'bottom',
		strategy: 'fixed',
		middlewareData: {},
	})
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element } = host()
	const firstTrigger = document.createElement('button')
	const secondTrigger = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: (options?: { source?: HTMLElement }) => void
	}
	const matches = content.matches.bind(content)
	content.matches = ((selector: string) => selector === ':popover-open' ? nativeOpen : matches(selector)) as typeof content.matches
	content.showPopover = options => {
		sources.push(options?.source)
		nativeOpen = true
	}
	content.hidePopover = () => nativeOpen = false
	document.body.append(firstTrigger, secondTrigger, content)

	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	view.setTrigger(firstTrigger)
	view.setContent(content)
	view.sync(undefined)
	const event = new Event('click')
	Object.defineProperty(event, 'currentTarget', { value: firstTrigger })
	view.setOpen(true, event)
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))
	view.close()
	view.setTrigger(secondTrigger)
	view.setOpen(true)
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))

	expect(sources).toEqual([firstTrigger, secondTrigger])
})

test('native source stays the registered trigger across direct and delegated invocations', async () => {
	let nativeOpen = false
	const sources: Array<HTMLElement | undefined> = []
	floating.computePosition.mockResolvedValue({
		x: 10,
		y: 20,
		placement: 'bottom',
		strategy: 'fixed',
		middlewareData: {},
	})
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element } = host()
	const firstTrigger = document.createElement('button')
	const secondTrigger = document.createElement('button')
	const icon = document.createElement('span')
	secondTrigger.append(icon)
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: (options?: { source?: HTMLElement }) => void
	}
	const matches = content.matches.bind(content)
	content.matches = ((selector: string) => selector === ':popover-open' ? nativeOpen : matches(selector)) as typeof content.matches
	content.showPopover = options => {
		sources.push(options?.source)
		nativeOpen = true
	}
	content.hidePopover = () => nativeOpen = false
	;(element as unknown as HTMLElement).append(firstTrigger, secondTrigger)
	document.body.append(content)

	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	view.setTrigger(firstTrigger)
	view.setContent(content)
	view.sync(undefined)
	firstTrigger.addEventListener('click', event => view.setOpen(true, event), { once: true })
	firstTrigger.click()
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))

	view.close()
	view.setTrigger(secondTrigger)
	;(element as unknown as HTMLElement).addEventListener('click', event => view.setOpen(true, event), { once: true })
	icon.click()
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))

	expect(sources).toEqual([firstTrigger, secondTrigger])
})

test('native source identity stays separate from an explicit geometry reference', async () => {
	let nativeOpen = false
	floating.computePosition.mockResolvedValue({
		x: 10,
		y: 20,
		placement: 'bottom',
		strategy: 'fixed',
		middlewareData: {},
	})
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element } = host()
	const trigger = document.createElement('button')
	const reference = document.createElement('div')
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: (options?: { source?: HTMLElement }) => void
	}
	const matches = content.matches.bind(content)
	content.matches = ((selector: string) => selector === ':popover-open' ? nativeOpen : matches(selector)) as typeof content.matches
	content.showPopover = vi.fn(options => {
		expect(options?.source).toBe(trigger)
		nativeOpen = true
	})
	content.hidePopover = () => nativeOpen = false
	document.body.append(trigger, reference, content)

	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	view.setTrigger(trigger)
	view.setReference(reference)
	view.setContent(content)
	view.sync(undefined)
	const event = new Event('click')
	Object.defineProperty(event, 'currentTarget', { value: trigger })
	view.setOpen(true, event)

	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))
	expect(floating.computePosition.mock.calls[0]?.[0]).toBe(reference)
	expect(content.showPopover).toHaveBeenCalledTimes(1)
})

test('replacing a trigger source retargets native state while an explicit reference stays open', async () => {
	let nativeOpen = false
	const sources: Array<HTMLElement | undefined> = []
	floating.computePosition.mockResolvedValue({
		x: 10,
		y: 20,
		placement: 'bottom',
		strategy: 'fixed',
		middlewareData: {},
	})
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element } = host()
	const firstTrigger = document.createElement('button')
	const secondTrigger = document.createElement('button')
	const reference = document.createElement('div')
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: (options?: { source?: HTMLElement }) => void
	}
	content.matches = ((selector: string) => selector === ':popover-open' && nativeOpen) as typeof content.matches
	content.showPopover = options => {
		sources.push(options?.source)
		nativeOpen = true
	}
	content.hidePopover = vi.fn(() => nativeOpen = false)
	document.body.append(firstTrigger, secondTrigger, reference, content)
	const changes = vi.fn()
	const view = popup(element, {
		profile: 'date',
		prefix: 'test',
		initialOpen: false,
		onOpenChange: changes,
		reference: current => current.reference,
		source: current => current.trigger,
	})
	view.setTrigger(firstTrigger)
	view.setReference(reference)
	view.setContent(content)
	view.setOpen(true)
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))

	view.setTrigger(secondTrigger)
	await vi.waitFor(() => expect(sources).toHaveLength(2))

	expect(sources).toEqual([firstTrigger, secondTrigger])
	expect(content.hidePopover).toHaveBeenCalledTimes(1)
	expect(changes.mock.calls.map(call => call[0])).toEqual([true])
	expect(view.open).toBe(true)
})

test('native close errors are surfaced after state and styles are fully cleaned', async () => {
	let nativeOpen = false
	floating.computePosition.mockResolvedValue({
		x: 10,
		y: 20,
		placement: 'bottom',
		strategy: 'fixed',
		middlewareData: {},
	})
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element, error } = host()
	const trigger = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: () => void
	}
	const matches = content.matches.bind(content)
	content.matches = ((selector: string) => selector === ':popover-open' ? nativeOpen : matches(selector)) as typeof content.matches
	content.showPopover = () => nativeOpen = true
	content.hidePopover = () => { throw new Error('native close failed') }
	document.body.append(trigger, content)

	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	view.setTrigger(trigger)
	view.setContent(content)
	view.sync(undefined)
	view.setOpen(true)
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))
	content.style.pointerEvents = 'none'
	view.close()

	expect(view.open).toBe(false)
	expect(content.dataset.state).toBe('closed')
	expect(content.style.visibility).toBe('')
	expect(content.style.pointerEvents).toBe('')
	expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'native close failed' }))
})
