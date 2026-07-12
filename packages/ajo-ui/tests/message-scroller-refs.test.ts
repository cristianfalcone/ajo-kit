// @vitest-environment happy-dom
import { render, type Stateful } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
	type MessageScrollerApi,
} from '../src/message-scroller'

afterEach(() => render(null, document.body))

const waitFrames = async (count = 1) => {
	for (let index = 0; index < count; index++) {
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
	}
}

test('setApi exposes only the public message-scroller controller', () => {
	let api: MessageScrollerApi | undefined

	render(jsx(MessageScrollerProvider, {
		children: null,
		setApi: (next: MessageScrollerApi) => api = next,
	}), document.body)

	expect(api).toBeDefined()
	expect(Object.keys(api!)).toEqual([
		'scrollToEnd',
		'scrollToMessage',
		'scrollToStart',
		'scrollable',
		'visibility',
	])
	for (const registrar of ['setButton', 'setContent', 'setItem', 'setRoot', 'setViewport']) {
		expect(api).not.toHaveProperty(registrar)
	}
})

const RetargetingScroller: Stateful<{ setApi: (api: MessageScrollerApi) => void }> = function* ({ setApi }) {
	let swapped = false
	const swap = () => this.next(() => swapped = true)

	while (true) yield jsx(MessageScrollerProvider, {
		children: [
			jsx('button', { 'data-retarget': '', 'set:onclick': swap, type: 'button' }),
			jsx(MessageScroller, {
				children: [
					jsx(MessageScrollerViewport, {
						children: jsx(MessageScrollerContent, {
							children: jsx(MessageScrollerItem, {
								children: 'Message',
								messageId: swapped ? 'new-message' : 'old-message',
							}),
						}),
					}),
					jsx(MessageScrollerButton, { direction: swapped ? 'start' : 'end' }),
				],
			}),
		],
		defaultScrollPosition: 'start',
		setApi,
	})
}

test('message-scroller parts compose consumer refs through mount and unmount', () => {
	const seen = new Map<string, Array<HTMLElement | null>>()
	const capture = (part: string) => (element: HTMLElement | null) => {
		const values = seen.get(part) ?? []
		values.push(element)
		seen.set(part, values)
	}

	render(jsx(MessageScrollerProvider, {
		children: jsx(MessageScroller, {
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
		}),
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
	render(jsx(RetargetingScroller, { setApi: (next: MessageScrollerApi) => api = next }), document.body)

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
	expect(item.dataset.messageId).toBe('new-message')
	expect(button.dataset.direction).toBe('start')

	viewport.scrollTop = 0
	viewport.dispatchEvent(new Event('scroll'))
	await waitFrames(2)
	expect(button.dataset.active).toBe('false')

	scrollCalls.length = 0
	expect(api.scrollToMessage('old-message', { behavior: 'auto' })).toBe(false)
	expect(scrollCalls).toHaveLength(0)
	expect(api.scrollToMessage('new-message', { behavior: 'auto' })).toBe(true)
	expect(scrollCalls).toHaveLength(1)
})
