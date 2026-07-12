/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { Avatar, AvatarFallback } from '/src/ui/avatar'
import { Bubble, BubbleContent } from '/src/ui/bubble'
import Button from '/src/ui/button'
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageHeader,
} from '/src/ui/message'
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerContext,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
	type MessageScrollerApi,
} from '/src/ui/message-scroller'

type TranscriptArgs = {
	anchorEvery?: number
	count?: number
	offset?: number
}

const notes = [
	'I checked the failing job and the error is in the install step.',
	'Can you compare the lockfile with the previous commit?',
	'Yes. The workspace package is resolving to the local path correctly.',
	'Then the next suspect is the Vite plugin guard.',
	'I will add a targeted smoke test before changing it.',
	'Good. Keep the patch narrow and preserve the current API.',
	'The repro is stable now.',
	'Ship the smallest fix and rerun the story smoke.',
]

const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const waitFrames = async (count = 3) => {
	for (let index = 0; index < count; index++) await waitFrame()
}

const waitUntil = async (check: () => boolean, timeout = 1200) => {
	const start = performance.now()
	while (performance.now() - start < timeout) {
		if (check()) return
		await waitFrame()
	}
	throw new Error('Timed out waiting for message scroller state')
}

const viewport = (canvas: HTMLElement) => {
	const element = canvas.querySelector<HTMLElement>('[data-slot="message-scroller-viewport"]')
	if (!element) throw new Error('MessageScrollerViewport was not rendered')
	return element
}

const ITEM_SELECTOR = '[data-slot="message-scroller-item"]'
const STATE_ATTRIBUTES = ['data-overflow-y']
const ensure = (condition: boolean, message: string) => {
	if (!condition) throw new Error(message)
}

const replace = (target: object, name: PropertyKey, value: unknown) => {
	const descriptor = Object.getOwnPropertyDescriptor(target, name)
	Object.defineProperty(target, name, { configurable: true, value, writable: true })
	return () => {
		if (descriptor) Object.defineProperty(target, name, descriptor)
		else Reflect.deleteProperty(target, name)
	}
}

const traceSync = async (canvas: HTMLElement, api: MessageScrollerApi) => {
	const view = viewport(canvas)
	const content = canvas.querySelector<HTMLElement>('[data-slot="message-scroller-content"]')
	if (!content) throw new Error('MessageScroller contract fixture was not rendered')

	view.scrollTop = Math.max(1, Math.floor((view.scrollHeight - view.clientHeight) / 2))
	view.dispatchEvent(new Event('scroll'))
	await waitFrames(5)
	ensure(view.getAttribute('data-overflow-y') === 'both', 'A middle scroll position must expose both overflow edges')

	const items = Array.from(content.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
	const query = content.querySelectorAll.bind(content)
	const viewRect = view.getBoundingClientRect.bind(view)
	const itemRects = new Map(items.map(element => [element, element.getBoundingClientRect.bind(element)]))
	const viewSetAttribute = view.setAttribute.bind(view)
	let discoveries = 0
	let viewportReads = 0
	const itemReads = new Map(items.map(element => [element, 0]))
	const mutations: MutationRecord[] = []
	const sequence: string[] = []
	const observer = new MutationObserver(records => mutations.push(...records))

	const restorers = [replace(content, 'querySelectorAll', ((selector: string) => {
		if (selector === ITEM_SELECTOR) discoveries++
		return query(selector)
	}) as typeof content.querySelectorAll), replace(view, 'getBoundingClientRect', () => {
		viewportReads++
		sequence.push('viewport-read')
		return viewRect()
	})]
	for (const element of items) {
		const rect = itemRects.get(element)!
		restorers.push(replace(element, 'getBoundingClientRect', () => {
			itemReads.set(element, itemReads.get(element)! + 1)
			sequence.push('item-read')
			return rect()
		}))
	}
	restorers.push(replace(view, 'setAttribute', ((name: string, value: string) => {
		if (STATE_ATTRIBUTES.includes(name)) sequence.push('write')
		viewSetAttribute(name, value)
	}) as typeof view.setAttribute))
	observer.observe(view, { attributeFilter: STATE_ATTRIBUTES, attributes: true, attributeOldValue: true })

	let stableDiscoveries = 0
	let stableViewportReads = 0
	let stableItemReads: number[] = []
	let stableMutations = 0
	let changedDiscoveries = 0
	let changedViewportReads = 0
	let changedItemReads: number[] = []
	let changedSequence: string[] = []
	try {
		view.dispatchEvent(new Event('scroll'))
		await waitFrame()
		await Promise.resolve()
		mutations.push(...observer.takeRecords())
		stableDiscoveries = discoveries
		stableViewportReads = viewportReads
		stableItemReads = [...itemReads.values()]
		stableMutations = mutations.length

		discoveries = 0
		viewportReads = 0
		for (const element of items) itemReads.set(element, 0)
		mutations.length = 0
		sequence.length = 0
		view.scrollTop = 0
		view.dispatchEvent(new Event('scroll'))
		await waitFrame()
		changedDiscoveries = discoveries
		changedViewportReads = viewportReads
		changedItemReads = [...itemReads.values()]
		changedSequence = [...sequence]
	} finally {
		observer.disconnect()
		for (const restore of restorers.reverse()) restore()
	}

	const viewportRect = view.getBoundingClientRect()
	const expectedVisible: string[] = []
	let expectedAnchor: string | undefined
	for (const element of items) {
		const rect = element.getBoundingClientRect()
		const id = element.dataset.messageId
		if (id && rect.bottom > viewportRect.top && rect.top < viewportRect.bottom) expectedVisible.push(id)
		if (id && element.dataset.scrollAnchor === 'true' && rect.top <= viewportRect.top + view.clientHeight * 0.65) expectedAnchor = id
	}

	ensure(JSON.stringify(api.visibility.visibleMessageIds) === JSON.stringify(expectedVisible), 'Visibility ids must follow intersecting DOM order')
	ensure(api.visibility.currentAnchorId === expectedAnchor, 'Current anchor must be the last eligible DOM anchor')
	ensure(stableDiscoveries === 1, `A sync must discover message items once, got ${stableDiscoveries}`)
	ensure(stableViewportReads === 1, `A sync must read the viewport rect once, got ${stableViewportReads}`)
	ensure(stableItemReads.every(reads => reads === 1), 'A sync must read each message rect once')
	ensure(stableMutations === 0, `An unchanged sync must not restamp scroll state, got ${stableMutations} mutations`)
	ensure(changedDiscoveries === 1, `An edge-changing sync must discover items once, got ${changedDiscoveries}`)
	ensure(changedViewportReads === 1, `An edge-changing sync must read the viewport once, got ${changedViewportReads}`)
	ensure(changedItemReads.every(reads => reads === 1), 'An edge-changing sync must read each message rect once')
	const firstWrite = changedSequence.indexOf('write')
	const beforeWrite = changedSequence.slice(0, firstWrite)
	ensure(firstWrite >= 0, 'Changing scroll edges must stamp new public state')
	ensure(beforeWrite.filter(event => event === 'viewport-read').length === 1, 'The viewport rect must be read before the first state write')
	ensure(beforeWrite.filter(event => event === 'item-read').length === items.length, 'Every item rect must be read before the first state write')
	ensure(changedSequence.slice(firstWrite).every(event => event === 'write'), 'No layout reads may follow the first state write')
}

const item = (canvas: HTMLElement, id: string) => {
	const element = canvas.querySelector<HTMLElement>(`[data-message-id="${id}"]`)
	if (!element) throw new Error(`Message item ${id} was not rendered`)
	return element
}

const AvatarInitial = ({ children }: { children: string }) => (
	<Avatar>
		<AvatarFallback>{children}</AvatarFallback>
	</Avatar>
)

const Transcript = ({ anchorEvery = 0, count = 18, offset = 0 }: TranscriptArgs) => (
	<MessageScrollerContent>
		{Array.from({ length: count }, (_, index) => {
			const position = index + offset
			const mine = position % 3 === 1
			const id = `message-${position + 1}`
			return (
				<MessageScrollerItem
					key={id}
					messageId={id}
					scrollAnchor={anchorEvery > 0 && position % anchorEvery === 0}
				>
					<Message align={mine ? 'end' : 'start'}>
						{mine ? null : (
							<MessageAvatar>
								<AvatarInitial>{position % 2 === 0 ? 'AI' : 'CN'}</AvatarInitial>
							</MessageAvatar>
						)}
						<MessageContent>
							<MessageHeader>{mine ? 'You' : position % 2 === 0 ? 'Ajo' : 'Cristian'}</MessageHeader>
							<Bubble variant={mine ? 'default' : 'muted'}>
								<BubbleContent>{notes[position % notes.length]}</BubbleContent>
							</Bubble>
							<MessageFooter>{new Intl.DateTimeFormat('en', { minute: '2-digit', second: '2-digit' }).format(new Date(0, 0, 0, 0, position + 1))}</MessageFooter>
						</MessageContent>
					</Message>
				</MessageScrollerItem>
			)
		})}
	</MessageScrollerContent>
)

const Shell = ({ children }: { children: unknown }) => (
	<MessageScroller class="h-[28rem] w-[36rem] rounded-lg glass edge shadow-xs">
		<MessageScrollerViewport class="p-4">
			{children}
		</MessageScrollerViewport>
		<MessageScrollerButton direction="start" />
		<MessageScrollerButton direction="end" />
	</MessageScroller>
)

const JumpControls = () => {
	const scroller = MessageScrollerContext()
	if (!scroller) return null

	return (
		<div class="absolute end-3 top-3 z-20 flex gap-2">
			<Button
				type="button"
				size="sm"
				variant="secondary"
				set:onclick={() => scroller.scrollToMessage('message-9', { behavior: 'auto', peek: 12 })}
			>
				Jump to #9
			</Button>
			<Button
				type="button"
				size="sm"
				variant="outline"
				set:onclick={() => scroller.scrollToEnd({ behavior: 'auto' })}
			>
				End
			</Button>
		</div>
	)
}

const StreamingTranscript: Stateful = function* () {
	let count = 10
	const append = () => this.next(() => count++)

	while (true) {
		yield (
			<MessageScrollerProvider defaultScrollPosition="end" autoScroll>
				<div class="relative">
					<div class="absolute end-3 top-3 z-20">
						<Button type="button" size="sm" set:onclick={append}>Append</Button>
					</div>
					<Shell>
						<Transcript count={count} />
					</Shell>
				</div>
			</MessageScrollerProvider>
		)
	}
}

const OverflowTransitionTranscript: Stateful = function* () {
	let expanded = false

	while (true) yield (
		<>
			<button
				aria-label="Toggle transcript overflow"
				class="sr-only"
				data-message-overflow-toggle
				set:onclick={() => this.next(() => expanded = !expanded)}
				type="button"
			>
				Toggle transcript overflow
			</button>
			<Transcript count={expanded ? 18 : 1} />
		</>
	)
}

export default {
	title: 'UI/Message Scroller',
	component: MessageScroller,
	parameters: {
		docs: { description: 'Managed chat transcript viewport with start/end jumps, message anchors, auto-follow, and live-region semantics.' },
		layout: 'centered',
	},
} satisfies Meta<typeof MessageScroller>

export const Basic: Story<typeof MessageScroller> = {
	render: () => (
		<MessageScrollerProvider defaultScrollPosition="end">
			<Shell>
				<Transcript />
			</Shell>
		</MessageScrollerProvider>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="message-scroller"]')
		const view = viewport(canvas)
		const content = canvas.querySelector<HTMLElement>('[data-slot="message-scroller-content"]')

		await waitFrames()

		if (!root) throw new Error('MessageScroller root was not rendered')
		if (view.role !== 'region' || view.getAttribute('aria-label') !== 'Messages') {
			throw new Error('MessageScroller viewport needs region semantics')
		}
		if (content?.role !== 'log' || content.getAttribute('aria-live') !== 'polite') {
			throw new Error('MessageScroller content needs live-region log semantics')
		}
		if (view.scrollHeight <= view.clientHeight) {
			throw new Error('MessageScroller story did not create vertical overflow')
		}
		if (view.scrollTop <= 0) {
			throw new Error('MessageScroller did not default to the end')
		}
		if (!['start', 'both'].includes(view.getAttribute('data-overflow-y') ?? '')) {
			throw new Error('MessageScroller did not expose start overflow at the end')
		}
		if (root.hasAttribute('data-overflow-y')) {
			throw new Error('MessageScroller overflow state must belong to the viewport only')
		}
		if (getComputedStyle(view).maskImage === 'none') {
			throw new Error('Overflowing MessageScroller did not render its data-driven fade')
		}
	},
}

export const Fits: Story<typeof MessageScroller> = {
	render: () => (
		<MessageScrollerProvider autoScroll={false} defaultScrollPosition="start">
			<Shell>
				<OverflowTransitionTranscript />
			</Shell>
		</MessageScrollerProvider>
	),
	play: async ({ canvas }) => {
		const view = viewport(canvas)
		const toggle = canvas.querySelector<HTMLButtonElement>('[data-message-overflow-toggle]')
		if (!toggle) throw new Error('MessageScroller overflow-transition control was not rendered')
		await waitFrames(5)

		if (view.scrollHeight > view.clientHeight) {
			throw new Error('MessageScroller fitting fixture unexpectedly overflowed')
		}
		if (view.hasAttribute('data-overflow-y') || getComputedStyle(view).maskImage !== 'none') {
			throw new Error('A fitting MessageScroller must not expose an overflow fade')
		}

		toggle.click()
		await waitUntil(() => view.scrollHeight > view.clientHeight)
		await waitFrames(5)
		if (!['end', 'both'].includes(view.getAttribute('data-overflow-y') ?? '')) {
			throw new Error('Content growth did not expose MessageScroller end overflow')
		}
		if (getComputedStyle(view).maskImage === 'none') {
			throw new Error('Content growth did not render the data-driven fade')
		}

		toggle.click()
		await waitUntil(() => view.scrollHeight <= view.clientHeight)
		await waitFrames(5)
		if (view.hasAttribute('data-overflow-y') || getComputedStyle(view).maskImage !== 'none') {
			throw new Error('Content shrink did not clear MessageScroller overflow state')
		}
	},
}

export const FloatingButtons: Story<typeof MessageScroller> = {
	render: () => (
		<MessageScrollerProvider defaultScrollPosition="start">
			<Shell>
				<Transcript />
			</Shell>
		</MessageScrollerProvider>
	),
	play: async ({ canvas }) => {
		const view = viewport(canvas)
		const end = canvas.querySelector<HTMLButtonElement>('[data-slot="message-scroller-button"][data-direction="end"]')
		const start = canvas.querySelector<HTMLButtonElement>('[data-slot="message-scroller-button"][data-direction="start"]')
		if (!end || !start) throw new Error('MessageScroller buttons were not rendered')

		await waitFrames()
		if (end.dataset.active !== 'true') throw new Error('End button should be active at the start')

		const beforeEndClick = view.scrollTop
		end.click()
		await waitUntil(() => view.scrollTop > beforeEndClick)

		view.scrollTop = view.scrollHeight
		view.dispatchEvent(new Event('scroll', { bubbles: true }))
		await waitUntil(() => start.dataset.active === 'true')
		if (start.dataset.active !== 'true') throw new Error('Start button should be active at the end')

		const beforeStartClick = view.scrollTop
		start.click()
		await waitUntil(() => view.scrollTop < beforeStartClick)
	},
}

export const JumpToMessage: Story<typeof MessageScroller> = {
	render: () => (
		<MessageScrollerProvider defaultScrollPosition="start" scrollPreviousItemPeek={12}>
			<div class="relative">
				<JumpControls />
				<Shell>
					<Transcript />
				</Shell>
			</div>
		</MessageScrollerProvider>
	),
	play: async ({ canvas }) => {
		const view = viewport(canvas)
		const button = canvas.querySelector<HTMLButtonElement>('button')
		if (!button) throw new Error('Jump button was not rendered')

		await waitFrames()
		button.click()
		await waitUntil(() => {
			const top = item(canvas, 'message-9').getBoundingClientRect().top - view.getBoundingClientRect().top
			return top >= 8 && top <= 32
		})
	},
}

export const LastAnchor: Story<typeof MessageScroller> = {
	render: () => (
		<MessageScrollerProvider defaultScrollPosition="last-anchor" scrollPreviousItemPeek={16}>
			<Shell>
				<Transcript anchorEvery={5} count={21} />
			</Shell>
		</MessageScrollerProvider>
	),
	play: async ({ canvas }) => {
		const view = viewport(canvas)
		await waitFrames()

		const target = item(canvas, 'message-21')
		const top = target.getBoundingClientRect().top - view.getBoundingClientRect().top
		if (top < 0 || top > view.clientHeight) {
			throw new Error('Last anchor was not brought into view')
		}
	},
}

export const StreamingFollow: Story<typeof MessageScroller> = {
	render: () => <StreamingTranscript />,
	play: async ({ canvas }) => {
		const view = viewport(canvas)
		const button = canvas.querySelector<HTMLButtonElement>('button')
		if (!button) throw new Error('Append button was not rendered')

		await waitFrames()
		const before = view.scrollTop
		button.click()
		await waitUntil(() => view.scrollTop > before)
	},
}

export const StartPosition: Story<typeof MessageScroller> = {
	render: () => (
		<MessageScrollerProvider defaultScrollPosition="start">
			<Shell>
				<Transcript count={14} />
			</Shell>
		</MessageScrollerProvider>
	),
	play: async ({ canvas }) => {
		const view = viewport(canvas)
		await waitFrames()
		if (view.scrollTop > 4) throw new Error('MessageScroller did not honor start position')
		if (!['end', 'both'].includes(view.getAttribute('data-overflow-y') ?? '')) {
			throw new Error('MessageScroller did not expose end scrollability')
		}
	},
}

const contractApis = new Map<string, MessageScrollerApi>()

const ContractCase = ({ id, preserve }: { id: string; preserve: boolean }) => (
	<div data-story-scope={id}>
		<MessageScrollerProvider
			defaultScrollPosition="start"
			preserveScrollOnPrepend={preserve}
			setApi={api => contractApis.set(id, api)}
		>
			<Shell>
				<Transcript anchorEvery={3} count={14} offset={preserve ? 0 : 20} />
			</Shell>
		</MessageScrollerProvider>
	</div>
)

const PrependCase: Stateful<{ enable?: boolean; id: string; preserve: boolean }> = function* ({ enable, id, preserve }) {
	let count = 20
	let offset = 10
	let preserving = preserve
	const prepend = () => this.next(() => {
		if (enable) preserving = true
		count += 3
		offset -= 3
	})

	while (true) {
		yield (
		<div data-story-scope={id}>
			<Button data-story-action="prepend" size="sm" type="button" set:onclick={prepend}>Prepend</Button>
			<MessageScrollerProvider autoScroll={false} defaultScrollPosition="start" preserveScrollOnPrepend={preserving}>
				<MessageScroller class="mt-2 h-[28rem] w-[36rem] rounded-lg glass edge shadow-xs">
					<MessageScrollerViewport class="p-4" style="overflow-anchor:none">
						<Transcript count={count} offset={offset} />
					</MessageScrollerViewport>
				</MessageScroller>
			</MessageScrollerProvider>
		</div>
	)
	}
}

export const HotPathContract: Story<typeof MessageScroller> = {
	parameters: {
		docs: { description: 'One scroll frame performs one geometry pass and does not rewrite unchanged state attributes.' },
	},
	render: () => {
		contractApis.clear()
		return (
			<div class="grid gap-4 lg:grid-cols-2">
				<ContractCase id="hot-preserve" preserve />
				<ContractCase id="hot-no-preserve" preserve={false} />
			</div>
		)
	},
	play: async ({ canvas }) => {
		await waitFrames()
		try {
			for (const id of ['hot-preserve', 'hot-no-preserve']) {
				const scope = canvas.querySelector<HTMLElement>(`[data-story-scope="${id}"]`)
				const api = contractApis.get(id)
				if (!scope || !api) throw new Error(`Missing ${id} contract fixture`)
				await traceSync(scope, api)
			}
		} finally {
			contractApis.clear()
		}
	},
}

export const AutoscrollFallback: Story<typeof MessageScroller> = {
	parameters: {
		docs: { description: 'Imperative scrolling clears its transient state after the timeout fallback when scrollend is unavailable.' },
	},
	render: () => {
		contractApis.clear()
		return (
			<div data-story-scope="autoscroll-fallback">
				<MessageScrollerProvider
					defaultScrollPosition="start"
					setApi={api => contractApis.set('autoscroll-fallback', api)}
				>
					<Shell>
						<Transcript count={14} />
					</Shell>
				</MessageScrollerProvider>
			</div>
		)
	},
	play: async ({ canvas }) => {
		await waitFrames()
		const scope = canvas.querySelector<HTMLElement>('[data-story-scope="autoscroll-fallback"]')
		const root = scope?.querySelector<HTMLElement>('[data-slot="message-scroller"]')
		const view = scope ? viewport(scope) : null
		const api = contractApis.get('autoscroll-fallback')
		if (!root || !view || !api) throw new Error('Autoscroll fallback fixture was not rendered')

		const restore = replace(view, 'scrollTo', (() => {}) as typeof view.scrollTo)
		try {
			ensure(api.scrollToEnd({ behavior: 'auto' }), 'Imperative end scroll was not accepted')
			ensure(root.hasAttribute('data-autoscrolling'), 'Root did not enter transient autoscroll state')
			ensure(view.hasAttribute('data-autoscrolling'), 'Viewport did not enter transient autoscroll state')

			await waitUntil(() =>
				!root.hasAttribute('data-autoscrolling') && !view.hasAttribute('data-autoscrolling'), 3000)
		} finally {
			restore()
			contractApis.clear()
		}
	},
}

export const PreserveOnPrepend: Story<typeof MessageScroller> = {
	parameters: {
		docs: { description: 'Prepending keeps the first visible item fixed when preservation is enabled initially or in the same update.' },
	},
	render: () => (
		<div class="grid gap-4 lg:grid-cols-3">
			<PrependCase id="prepend-preserve" preserve />
			<PrependCase id="prepend-plain" preserve={false} />
			<PrependCase enable id="prepend-enable" preserve={false} />
		</div>
	),
	play: async ({ canvas }) => {
		await waitFrames(5)
		for (const [id, preserve] of [['prepend-preserve', true], ['prepend-plain', false], ['prepend-enable', true]] as const) {
			const scope = canvas.querySelector<HTMLElement>(`[data-story-scope="${id}"]`)
			if (!scope) throw new Error(`Missing ${id} prepend fixture`)
			const view = viewport(scope)
			const button = scope.querySelector<HTMLButtonElement>('[data-story-action="prepend"]')
			if (!button) throw new Error(`Missing ${id} prepend button`)

			const maxScroll = view.scrollHeight - view.clientHeight
			ensure(maxScroll > 20, 'Prepend fixture must overflow beyond both edge thresholds')
			view.scrollTop = Math.min(maxScroll - 10, Math.max(10, Math.floor(maxScroll / 3)))
			view.dispatchEvent(new Event('scroll'))
			await waitFrames(5)
			view.dispatchEvent(new Event('scroll'))
			await waitFrame()
			const viewRect = view.getBoundingClientRect()
			const target = Array.from(scope.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).find(element => {
				const rect = element.getBoundingClientRect()
				return Boolean(element.dataset.messageId) && rect.bottom > viewRect.top && rect.top < viewRect.bottom
			})
			if (!target) throw new Error(`Missing ${id} visible prepend anchor`)
			const beforeTop = target.getBoundingClientRect().top - viewRect.top
			const beforeScroll = view.scrollTop

			button.click()
			await waitUntil(() => Boolean(scope.querySelector('[data-message-id="message-8"]')))
			await waitFrames(5)
			const afterTop = target.getBoundingClientRect().top - view.getBoundingClientRect().top
			if (preserve) {
				ensure(Math.abs(afterTop - beforeTop) <= 2, `Prepend shifted ${target.dataset.messageId} by ${afterTop - beforeTop}px (top ${beforeTop}→${afterTop}, scroll ${beforeScroll}→${view.scrollTop})`)
				ensure(view.scrollTop > beforeScroll, 'Preserved prepend must compensate scrollTop')
			} else {
				ensure(Math.abs(view.scrollTop - beforeScroll) <= 2, 'Non-preserved prepend must not compensate scrollTop')
				ensure(afterTop > beforeTop + 2, 'Non-preserved prepend must allow older content to shift the visible item')
			}
		}
	},
}
