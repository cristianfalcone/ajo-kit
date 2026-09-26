// @vitest-environment happy-dom
import type { Host } from 'ajo'
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

import { popup } from '../src/popup'

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

test('a protocol-only host never creates elements in the ambient document', () => {
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

test('trigger ids are adopted only at render, never from a registered element', () => {
	const { element } = host()
	const view = popup(element, { profile: 'menu', prefix: 'test', initialOpen: false })
	const generated = view.triggerId
	const trigger = document.createElement('button')
	trigger.id = 'custom-trigger'

	view.setTrigger(trigger)
	expect(view.triggerId).toBe(generated)
	expect(view.adoptTriggerId('custom-trigger')).toBe('custom-trigger')
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

const nativeContent = () => {
	let nativeOpen = false
	const content = document.createElement('div') as HTMLDivElement & {
		hidePopover: () => void
		showPopover: () => void
	}
	const matches = content.matches.bind(content)
	content.matches = ((selector: string) => selector === ':popover-open' ? nativeOpen : matches(selector)) as typeof content.matches
	content.showPopover = () => nativeOpen = true
	content.hidePopover = () => nativeOpen = false
	return content
}

test('content style is the caller style alone and a new caller style gets popup state back', async () => {
	floating.computePosition.mockResolvedValue({ x: 10, y: 20, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element } = host()
	const trigger = document.createElement('button')
	const content = nativeContent()
	const arrow = document.createElement('span')
	content.append(arrow)
	document.body.append(trigger, content)
	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	// Stand in for Ajo: it writes the attribute only when the rendered string changes.
	let rendered = ''
	const render = (style: string) => {
		const next = view.contentStyle(style)
		if (next !== rendered) content.setAttribute('style', rendered = next)
		return next
	}

	render('color:red;overflow:auto')
	view.setTrigger(trigger)
	view.setContent(content)
	view.arrowAttrs().ref(arrow)
	view.setOpen(true)
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))
	expect(content.style.left).toBe('10px')
	expect(content.style.overflow).toBe('visible')

	expect(render('color:red;overflow:auto')).toBe('inset:auto;margin:0;color:red;overflow:auto')
	expect(content.style.left).toBe('10px')

	floating.computePosition.mockResolvedValue({ x: 30, y: 40, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	render('color:blue;overflow:auto')
	expect(content.style.left).toBe('')
	await vi.waitFor(() => expect(content.style.left).toBe('30px'))
	expect(content.style.top).toBe('40px')
	expect(content.style.color).toBe('blue')
	expect(content.style.overflow).toBe('visible')
	expect(content.style.visibility).toBe('')

	view.arrowAttrs().ref(null)
	expect(content.style.overflow).toBe('auto')
	await vi.waitFor(() => expect(content.style.left).toBe('30px'))
	expect(content.style.color).toBe('blue')
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

	attrs.ref(second)
	expect(content.style.overflow).toBe('visible')

	attrs.ref(null)
	expect(content.style.overflow).toBe('auto')
})

test('an update while the first position is pending still reveals the popup', async () => {
	let resolve!: (value: {
		x: number
		y: number
		placement: 'bottom'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}) => void
	floating.computePosition
		.mockReturnValueOnce(new Promise(done => resolve = done))
		.mockResolvedValue({ x: 30, y: 40, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element } = host()
	const trigger = document.createElement('button')
	const content = nativeContent()
	document.body.append(trigger, content)
	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false })
	view.setTrigger(trigger)
	view.setContent(content)
	view.sync(undefined, { placement: 'bottom' })
	view.setOpen(true)
	await vi.waitFor(() => expect(floating.computePosition).toHaveBeenCalledTimes(1))

	view.sync(undefined, { placement: 'top' })
	resolve({ x: 10, y: 20, placement: 'bottom', strategy: 'fixed', middlewareData: {} })

	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))
	expect(view.open).toBe(true)
	expect(content.style.visibility).toBe('')
	expect(content.style.left).toBe('30px')
	expect(floating.computePosition).toHaveBeenCalledTimes(2)
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

test('without the Popover API an opening closes instead of staying open and hidden', async () => {
	floating.computePosition.mockResolvedValue({ x: 10, y: 20, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const { element, error } = host()
	const trigger = document.createElement('button')
	const content = document.createElement('div')
	document.body.append(trigger, content)
	const changes = vi.fn()

	const view = popup(element, { profile: 'popover', prefix: 'test', initialOpen: false, onOpenChange: changes })
	view.setTrigger(trigger)
	view.setContent(content)
	view.setOpen(true)

	await vi.waitFor(() => expect(view.open).toBe(false))
	expect(changes.mock.calls.map(call => call[0])).toEqual([true, false])
	expect(content.dataset.state).toBe('closed')
	expect(content.style.visibility).toBe('')
	expect(error).not.toHaveBeenCalled()
})

test('a throwing native open closes the popup and reaches Host.throw after the Promise chain settles', async () => {
	const queued: Array<() => void> = []
	const queue = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(callback => queued.push(callback))
	const { element } = host()
	element.throw = ((error: unknown) => { throw error }) as Host['throw']
	const trigger = document.createElement('button')
	const content = document.createElement('div') as HTMLDivElement & { showPopover: () => void }
	content.showPopover = () => { throw new Error('native open failed') }
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
		expect(() => queued[0]?.()).toThrow('native open failed')
		expect(view.open).toBe(false)
		expect(content.dataset.state).toBe('closed')
		expect(content.style.visibility).toBe('')
		expect(floating.autoUpdate).not.toHaveBeenCalled()
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
	content.setAttribute('style', view.contentStyle('color:red'))
	view.setContent(content)
	view.sync(undefined)
	view.setOpen(true)

	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))
	expect(content.style.visibility).toBe('hidden')
	expect(content.style.pointerEvents).toBe('none')

	// A new caller style replaces the attribute; the hidden reference keeps it concealed.
	content.setAttribute('style', view.contentStyle('color:blue'))
	await Promise.resolve()
	expect(content.style.color).toBe('blue')
	expect(content.style.visibility).toBe('hidden')
	expect(content.style.pointerEvents).toBe('none')

	await view.update()
	await vi.waitFor(() => expect(content.hasAttribute('data-reference-hidden')).toBe(false))
	expect(content.style.visibility).toBe('')
	expect(content.style.pointerEvents).toBe('')
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

test('a throwing native close reaches the caller after state and styles are cleaned', async () => {
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
	expect(() => view.close()).toThrow('native close failed')

	expect(view.open).toBe(false)
	expect(content.dataset.state).toBe('closed')
	expect(content.style.visibility).toBe('')
	expect(content.style.pointerEvents).toBe('')
	expect(error).not.toHaveBeenCalled()
})
