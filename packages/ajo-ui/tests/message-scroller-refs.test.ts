// @vitest-environment happy-dom
import { render, type Stateful } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerContext,
	MessageScrollerItem,
	MessageScrollerViewport,
	type MessageScrollerApi,
} from '../src/message-scroller'

afterEach(() => render(null, document.body))

const waitFrames = async (count = 1) => {
	for (let index = 0; index < count; index++) {
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
	}
}

const Probe = ({ receive }: { receive: (api: MessageScrollerApi) => void }) => {
	const api = MessageScrollerContext()
	if (api) receive(api)
	return null
}

test('the MessageScroller root is the only element and context exposes only the public controller', () => {
	let api: MessageScrollerApi | undefined

	render(jsx(MessageScroller, {
		children: jsx(Probe, { receive: (next: MessageScrollerApi) => api = next }),
		class: 'transcript',
		defaultScrollPosition: 'start',
	}), document.body)

	const root = document.body.firstElementChild as HTMLElement
	expect(document.body.children).toHaveLength(1)
	expect(root.dataset.slot).toBe('message-scroller')
	expect(root.className).toBe('transcript')
	expect(root.hasAttribute('defaultScrollPosition')).toBe(false)
	expect(api).toBeDefined()
	expect(Object.keys(api!)).toEqual([
		'scrollToEnd',
		'scrollToMessage',
		'scrollToStart',
		'scrollable',
		'visibility',
	])
	for (const registrar of ['api', 'setButton', 'setContent', 'setItem', 'setViewport']) {
		expect(api).not.toHaveProperty(registrar)
	}
})

// Message ids can be user-derived, so the fixture uses one that would break a selector.
const retargeted = 'new"] message'

const RetargetingScroller: Stateful<{ receive: (api: MessageScrollerApi) => void }> = function* ({ receive }) {
	let swapped = false
	const swap = () => this.next(() => swapped = true)

	while (true) yield jsx(MessageScroller, {
		children: [
			jsx('button', { 'data-retarget': '', 'set:onclick': swap, type: 'button' }),
			jsx(Probe, { receive }),
			jsx(MessageScrollerViewport, {
				children: jsx(MessageScrollerContent, {
					children: jsx(MessageScrollerItem, {
						children: 'Message',
						messageId: swapped ? retargeted : 'old-message',
					}),
				}),
			}),
			jsx(MessageScrollerButton, { direction: swapped ? 'start' : 'end' }),
		],
		defaultScrollPosition: 'start',
	})
}

test('message-scroller parts compose consumer refs through mount and unmount', () => {
	const seen = new Map<string, Array<HTMLElement | null>>()
	const capture = (part: string) => (element: HTMLElement | null) => {
		const values = seen.get(part) ?? []
		values.push(element)
		seen.set(part, values)
	}

	render(jsx(MessageScroller, {
		children: [
			jsx(MessageScrollerViewport, {
				children: jsx(MessageScrollerContent, {
					children: jsx(MessageScrollerItem, {
						children: 'Message',
						messageId: 'message-1',
						ref: capture('item'),
					}),
					ref: capture('content'),
				}),
				ref: capture('viewport'),
			}),
			jsx(MessageScrollerButton, { direction: 'start', ref: capture('start') }),
			jsx(MessageScrollerButton, { direction: 'end', ref: capture('end') }),
		],
		ref: capture('root'),
	}), document.body)

	for (const [part, selector] of [
		['root', '[data-slot="message-scroller"]'],
		['viewport', '[data-slot="message-scroller-viewport"]'],
		['content', '[data-slot="message-scroller-content"]'],
		['item', '[data-slot="message-scroller-item"]'],
		['start', '[data-slot="message-scroller-button"][data-direction="start"]'],
		['end', '[data-slot="message-scroller-button"][data-direction="end"]'],
	] as const) {
		expect(seen.get(part)?.at(-1)).toBe(document.querySelector(selector))
	}

	render(null, document.body)
	for (const part of ['root', 'viewport', 'content', 'item', 'start', 'end']) {
		expect(seen.get(part)?.at(-1)).toBeNull()
	}
})

test('item ids and button directions retarget without stale registrations', async () => {
	let api: MessageScrollerApi | undefined
	render(jsx(RetargetingScroller, { receive: (next: MessageScrollerApi) => api = next }), document.body)

	const viewport = document.querySelector<HTMLElement>('[data-slot="message-scroller-viewport"]')
	const item = document.querySelector<HTMLElement>('[data-slot="message-scroller-item"]')
	const button = document.querySelector<HTMLButtonElement>('[data-slot="message-scroller-button"]')
	const toggle = document.querySelector<HTMLButtonElement>('[data-retarget]')
	if (!viewport || !item || !button || !toggle || !api) throw new Error('Retarget fixture did not render')

	Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 100 })
	Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 300 })
	const scrollCalls: number[] = []
	Object.defineProperty(viewport, 'scrollTo', {
		configurable: true,
		value: ({ top = 0 }: ScrollToOptions) => {
			scrollCalls.push(top)
			viewport.scrollTop = top
		},
	})

	await waitFrames(4)
	viewport.scrollTop = 0
	viewport.dispatchEvent(new Event('scroll'))
	await waitFrames(2)
	expect(button.dataset.active).toBe('true')

	toggle.click()
	await waitFrames(2)
	expect(document.querySelector('[data-slot="message-scroller-item"]')).toBe(item)
	expect(document.querySelector('[data-slot="message-scroller-button"]')).toBe(button)
	expect(item.dataset.messageId).toBe(retargeted)
	expect(button.dataset.direction).toBe('start')

	viewport.scrollTop = 0
	viewport.dispatchEvent(new Event('scroll'))
	await waitFrames(2)
	expect(button.dataset.active).toBe('false')

	scrollCalls.length = 0
	expect(api.scrollToMessage('old-message', { behavior: 'auto' })).toBe(false)
	expect(scrollCalls).toHaveLength(0)
	expect(api.scrollToMessage(retargeted, { behavior: 'auto' })).toBe(true)
	expect(scrollCalls).toHaveLength(1)
})

test('one edge reading drives the controller, the edge buttons and data-overflow-y', async () => {
	let api: MessageScrollerApi | undefined
	render(jsx(MessageScroller, {
		children: [
			jsx(Probe, { receive: (next: MessageScrollerApi) => api = next }),
			jsx(MessageScrollerViewport, {
				children: jsx(MessageScrollerContent, {
					children: jsx(MessageScrollerItem, { children: 'Message', messageId: 'message-1' }),
				}),
			}),
			jsx(MessageScrollerButton, { direction: 'start' }),
			jsx(MessageScrollerButton, { direction: 'end' }),
		],
		defaultScrollPosition: 'start',
	}), document.body)

	const root = document.querySelector<HTMLElement>('[data-slot="message-scroller"]')
	const viewport = document.querySelector<HTMLElement>('[data-slot="message-scroller-viewport"]')
	const start = document.querySelector<HTMLElement>('[data-direction="start"]')
	const end = document.querySelector<HTMLElement>('[data-direction="end"]')
	if (!root || !viewport || !start || !end || !api) throw new Error('Edge fixture did not render')

	let height = 100
	Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 100 })
	Object.defineProperty(viewport, 'scrollHeight', { configurable: true, get: () => height })
	Object.defineProperty(viewport, 'scrollTo', {
		configurable: true,
		value: ({ top = 0 }: ScrollToOptions) => viewport.scrollTop = top,
	})
	await waitFrames(4)

	const scrollTo = async (top: number) => {
		viewport.scrollTop = top
		viewport.dispatchEvent(new Event('scroll'))
		await waitFrames(2)
	}

	await scrollTo(0)
	expect(viewport.hasAttribute('data-overflow-y')).toBe(false)

	height = 300
	// 2px from either edge still reads as that edge, for the buttons and the mask alike.
	for (const [top, overflow, canStart, canEnd] of [
		[0, 'end', false, true],
		[2, 'end', false, true],
		[100, 'both', true, true],
		[198, 'start', true, false],
		[200, 'start', true, false],
	] as const) {
		await scrollTo(top)
		expect(viewport.getAttribute('data-overflow-y')).toBe(overflow)
		expect(api.scrollable).toEqual({ end: canEnd, start: canStart })
		expect(start.dataset.active).toBe(String(canStart))
		expect(end.dataset.active).toBe(String(canEnd))
	}
	expect(root.hasAttribute('data-overflow-y')).toBe(false)
})
