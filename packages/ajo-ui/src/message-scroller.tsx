import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { browser, callHandler, callRef, frame, overflow, resize, scrolling, timer } from 'ajo-cloves'
import { context } from 'ajo/context'

/** Initial edge or anchor used when the message scroller first mounts. */
export type MessageScrollerDefaultPosition =
	| 'end'
	| 'last-anchor'
	| 'start'

/** Direction accepted by message-scroller controls and edge state. */
export type MessageScrollerDirection =
	| 'end'
	| 'start'

/** Whether more content can be reached at either scroll edge. */
export type MessageScrollerScrollable = {
	end: boolean
	start: boolean
}

/** Visible message ids and the current reading anchor. */
export type MessageScrollerVisibility = {
	currentAnchorId?: string
	visibleMessageIds: string[]
}

/** Options for an imperative message-scroller jump. */
export type MessageScrollerScrollOptions = {
	/** Browser scroll behavior for this jump. */
	behavior?: ScrollBehavior
	/** Extra pixels kept before the target item when aligning to the start. */
	peek?: number
	/** Vertical alignment inside the viewport. */
	position?: 'center' | 'end' | 'start'
}

/** Imperative scrolling commands and observed viewport state. */
export type MessageScrollerApi = {
	scrollToEnd: (options?: Pick<MessageScrollerScrollOptions, 'behavior'>) => boolean
	scrollToMessage: (messageId: string, options?: MessageScrollerScrollOptions) => boolean
	scrollToStart: (options?: Pick<MessageScrollerScrollOptions, 'behavior'>) => boolean
	scrollable: MessageScrollerScrollable
	visibility: MessageScrollerVisibility
}

/** Props for the state provider shared by message-scroller parts. */
export type MessageScrollerProviderArgs = WithChildren<{
	/** Follow new content while the reader is already at the end. */
	autoScroll?: boolean
	/** Initial scroll target once the viewport and items are mounted. */
	defaultScrollPosition?: MessageScrollerDefaultPosition
	/** Preserve the visible row when older messages are prepended. */
	preserveScrollOnPrepend?: boolean
	/** Pixels to keep visible above a target item. */
	scrollPreviousItemPeek?: number
	/** Receives the imperative scroller controller. */
	setApi?: (api: MessageScrollerApi) => void
}>

/** Props for the message-scroller root element. */
export type MessageScrollerArgs = WithChildren<IntrinsicElements['div']>

/** Props for the scrollable message viewport. */
export type MessageScrollerViewportArgs = WithChildren<IntrinsicElements['div']>

/** Props for the element containing registered message items. */
export type MessageScrollerContentArgs = WithChildren<IntrinsicElements['div']>

/** Props for a tracked message item. */
export type MessageScrollerItemArgs = WithChildren<IntrinsicElements['div'] & {
	/** Stable id used by `scrollToMessage` and visibility tracking. */
	messageId?: string
	/** Marks this item as an anchor for `defaultScrollPosition="last-anchor"`. */
	scrollAnchor?: boolean
}>

/** Props for a control that scrolls toward one viewport edge. */
export type MessageScrollerButtonArgs = WithChildren<IntrinsicElements['button'] & {
	/** Scroll direction controlled by this button. */
	direction?: MessageScrollerDirection
}>

type InternalMessageScrollerApi = MessageScrollerApi & {
	setButton: (direction: MessageScrollerDirection, element: HTMLButtonElement | null) => void
	setContent: (element: HTMLElement | null) => void
	setItem: (messageId: string | undefined, element: HTMLElement | null) => void
	setRoot: (element: HTMLElement | null) => void
	setViewport: (element: HTMLElement | null) => void
}

type PendingScroll = {
	id: string
	options?: MessageScrollerScrollOptions
}

type PreserveAnchor = {
	id: string
	top: number
}

type ItemReading = MessageScrollerVisibility & {
	preserveAnchor: PreserveAnchor | null
}

const MessageScrollerContext = context<InternalMessageScrollerApi | null>(null)

const edge = 2

const useInternalMessageScroller = () => {
	const api = MessageScrollerContext()
	if (!api) throw new Error('MessageScroller components must be used within a <MessageScrollerProvider />')
	return api
}

/** Return the current message scroller controller from Ajo context. */
const useMessageScroller = (): MessageScrollerApi => useInternalMessageScroller()

/** Return the latest known start/end scrollability state. */
const useMessageScrollerScrollable = () => useInternalMessageScroller().scrollable

/** Return the latest known visible message ids and current anchor id. */
const useMessageScrollerVisibility = () => useInternalMessageScroller().visibility

const getItems = (content: HTMLElement | null) =>
	content
		? Array.from(content.querySelectorAll<HTMLElement>('[data-slot="message-scroller-item"]'))
		: []

const rectTop = (viewport: HTMLElement, element: HTMLElement) =>
	element.getBoundingClientRect().top - viewport.getBoundingClientRect().top

const stamp = (element: HTMLElement, name: string, value: string) => {
	if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

/** Unstyled provider for imperative scroll behavior and visibility state. */
const MessageScrollerProvider: Stateful<MessageScrollerProviderArgs> = function* ({
	autoScroll = true,
	defaultScrollPosition = 'end',
	preserveScrollOnPrepend = true,
	scrollPreviousItemPeek = 0,
}) {
	let root: HTMLElement | null = null
	let viewport: HTMLElement | null = null
	let content: HTMLElement | null = null
	let mutation: MutationObserver | undefined
	let initialized = false
	let didInitialScroll = false
	let following = defaultScrollPosition !== 'start'
	let currentAutoScroll = autoScroll
	let currentDefaultPosition = defaultScrollPosition
	let currentPreserve = preserveScrollOnPrepend
	let currentPeek = scrollPreviousItemPeek
	let currentSetApi: MessageScrollerProviderArgs['setApi']
	let pending: PendingScroll | null = null
	let preserveAnchor: PreserveAnchor | null = null
	let settles = 0
	const items = new Map<string, HTMLElement>()
	const buttons: Record<MessageScrollerDirection, HTMLButtonElement | null> = {
		end: null,
		start: null,
	}
	const scrollable: MessageScrollerScrollable = { end: false, start: false }
	const visibility: MessageScrollerVisibility = { visibleMessageIds: [] }
	const autoscroll = timer(this)

	const setAutoscrolling = (active: boolean) => {
		if (!viewport || !root) return

		root.toggleAttribute('data-autoscrolling', active)
		viewport.toggleAttribute('data-autoscrolling', active)

		if (!active) {
			autoscroll.stop()
			return
		}

		// Fallback for browsers without `scrollend`; long smooth scrolls must
		// stay flagged so user-scroll detection does not hijack `following`.
		autoscroll.start(1200, () => {
			root?.toggleAttribute('data-autoscrolling', false)
			viewport?.toggleAttribute('data-autoscrolling', false)
		})
	}

	const atStart = () => !viewport || viewport.scrollTop <= edge

	const atEnd = () => !viewport ||
		viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= edge

	const buttonActive = (direction: MessageScrollerDirection) =>
		direction === 'start' ? scrollable.start : scrollable.end

	const updateButton = (direction: MessageScrollerDirection) => {
		const button = buttons[direction]
		if (!button) return

		const active = buttonActive(direction)
		const tabIndex = active ? 0 : -1
		stamp(button, 'data-active', String(active))
		if (button.tabIndex !== tabIndex) button.tabIndex = tabIndex
		if (button.hasAttribute('inert') === active) button.toggleAttribute('inert', !active)
	}

	const readEdges = () => {
		const canStart = !atStart()
		const canEnd = !atEnd()
		return { canEnd, canStart }
	}

	const commitEdges = ({ canEnd, canStart }: ReturnType<typeof readEdges>) => {
		scrollable.start = canStart
		scrollable.end = canEnd

		updateButton('start')
		updateButton('end')
	}

	const updateData = () => commitEdges(readEdges())

	const findItem = (messageId: string) => {
		const registered = items.get(messageId)
		if (registered) return registered

		return getItems(content).find(item => item.dataset.messageId === messageId)
	}

	const readItems = (): ItemReading => {
		if (!viewport || !content) {
			return {
				currentAnchorId: undefined,
				preserveAnchor: null,
				visibleMessageIds: [],
			}
		}

		const viewportRect = viewport.getBoundingClientRect()
		const visible: string[] = []
		let anchor: string | undefined
		let preserved: PreserveAnchor | null = null

		for (const item of getItems(content)) {
			const rect = item.getBoundingClientRect()
			const id = item.dataset.messageId
			const intersects = rect.bottom > viewportRect.top && rect.top < viewportRect.bottom

			if (intersects && id) visible.push(id)
			if (currentPreserve && !preserveAnchor && !preserved && intersects && id) {
				preserved = { id, top: rect.top - viewportRect.top }
			}
			if (
				id &&
				item.dataset.scrollAnchor === 'true' &&
				rect.top <= viewportRect.top + viewport.clientHeight * 0.65
			) anchor = id
		}

		return {
			currentAnchorId: anchor,
			preserveAnchor: preserved,
			visibleMessageIds: visible,
		}
	}

	const commitItems = (reading: ReturnType<typeof readItems>) => {
		visibility.currentAnchorId = reading.currentAnchorId
		visibility.visibleMessageIds = reading.visibleMessageIds
		if (!currentPreserve) preserveAnchor = null
		else {
			// Keep one row stable across the mutation/resize settle burst; a scroll
			// clears it before the next geometry read chooses a new row.
			preserveAnchor ??= reading.preserveAnchor
		}
	}

	const sync = () => {
		const edges = readEdges()
		const itemState = readItems()
		commitItems(itemState)
		commitEdges(edges)
	}

	const schedule = frame(sync)

	const handleViewportScroll = (element: HTMLElement) => {
		if (!element.hasAttribute('data-autoscrolling')) following = atEnd()
		preserveAnchor = null
		sync()
	}

	const handleViewportEnd = (element: HTMLElement) => {
		// `content-visibility:auto` items grow scrollHeight as they render,
		// so a jump to the end can land short: settle until it sticks.
		if (following && !atEnd() && settles < 10) {
			settles += 1
			setAutoscrolling(true)
			element.scrollTo({ behavior: 'auto', top: element.scrollHeight })
		} else {
			setAutoscrolling(false)
		}
		schedule()
	}

	const viewportScroll = scrolling(this, {
		target: () => viewport,
		onScroll: handleViewportScroll,
		onEnd: handleViewportEnd,
	})

	const viewportSize = resize(this, {
		target: () => viewport,
		onResize: sync,
	})
	const edges = overflow(this, { target: () => viewport })

	const scrollTopFor = (
		element: HTMLElement,
		options: MessageScrollerScrollOptions = {},
	) => {
		if (!viewport) return 0

		const peek = options.peek ?? currentPeek
		const top = rectTop(viewport, element) + viewport.scrollTop

		if (options.position === 'center') {
			return top - (viewport.clientHeight - element.offsetHeight) / 2
		}

		if (options.position === 'end') {
			return top - viewport.clientHeight + element.offsetHeight + peek
		}

		return top - peek
	}

	const scrollToTop = (top: number, behavior: ScrollBehavior = 'smooth') => {
		if (!viewport) return false

		preserveAnchor = null
		settles = 0
		setAutoscrolling(true)
		viewport.scrollTo({ behavior, top: Math.max(0, top) })
		schedule()
		return true
	}

	const scrollToStart = (options: Pick<MessageScrollerScrollOptions, 'behavior'> = {}) => {
		following = false
		return scrollToTop(0, options.behavior)
	}

	const scrollToEnd = (options: Pick<MessageScrollerScrollOptions, 'behavior'> = {}) => {
		if (!viewport) return false

		following = true
		return scrollToTop(viewport.scrollHeight, options.behavior)
	}

	const scrollToMessage = (messageId: string, options: MessageScrollerScrollOptions = {}) => {
		const item = findItem(messageId)

		if (!item) {
			if (!initialized) {
				pending = { id: messageId, options }
				return true
			}

			return false
		}

		following = false
		return scrollToTop(scrollTopFor(item, options), options.behavior)
	}

	const flushPending = () => {
		if (!pending) return

		const target = pending
		pending = null
		if (!scrollToMessage(target.id, { behavior: 'auto', ...target.options })) pending = target
	}

	const restoreAnchor = () => {
		if (!viewport || !preserveAnchor || following || !currentPreserve) return

		const item = findItem(preserveAnchor.id)
		if (!item) {
			preserveAnchor = null
			return
		}

		const nextTop = rectTop(viewport, item)
		viewport.scrollTop += nextTop - preserveAnchor.top
	}

	const handleContentChange = () => {
		queueMicrotask(() => {
			restoreAnchor()
			if (currentAutoScroll && following) scrollToEnd({ behavior: 'auto' })
			flushPending()
			edges.sync()
			schedule()
		})
	}

	const contentSize = resize(this, {
		target: () => content,
		onResize: handleContentChange,
	})

	const applyInitialScroll = () => {
		if (didInitialScroll || !viewport) return

		didInitialScroll = true
		initialized = true

		if (pending) {
			flushPending()
		} else if (currentDefaultPosition === 'start') {
			scrollToStart({ behavior: 'auto' })
		} else if (currentDefaultPosition === 'last-anchor') {
			const anchor = getItems(content)
				.filter(item => item.dataset.scrollAnchor === 'true' && item.dataset.messageId)
				.at(-1)
			if (anchor?.dataset.messageId) {
				scrollToMessage(anchor.dataset.messageId, { behavior: 'auto', peek: currentPeek })
			} else {
				scrollToEnd({ behavior: 'auto' })
			}
		} else {
			scrollToEnd({ behavior: 'auto' })
		}

		sync()
	}

	const scheduleInitial = frame(applyInitialScroll)

	const scheduleInitialScroll = () => {
		if (!browser() || didInitialScroll) return

		scheduleInitial()
	}

	const setRoot = (element: HTMLElement | null) => {
		root = element
		updateData()
	}

	const setViewport = (element: HTMLElement | null) => {
		if (viewport === element) return

		viewport = element
		viewportScroll.sync()
		viewportSize.sync()
		edges.sync()

		if (!element) {
			updateData()
			return
		}

		updateData()
		scheduleInitialScroll()
	}

	const setContent = (element: HTMLElement | null) => {
		if (content === element) return

		mutation?.disconnect()
		content = element
		contentSize.sync()
		edges.sync()

		if (!element) {
			updateData()
			return
		}

		if (typeof MutationObserver !== 'undefined') {
			mutation = new MutationObserver(handleContentChange)
			mutation.observe(element, { childList: true, subtree: true })
		}

		updateData()
		scheduleInitialScroll()
	}

	const setItem = (
		messageId: string | undefined,
		element: HTMLElement | null,
	) => {
		if (element) {
			for (const [registeredId, registered] of items) {
				if (registered === element && registeredId !== messageId) items.delete(registeredId)
			}
			if (messageId) {
				items.set(messageId, element)
				flushPending()
			}
		} else if (messageId) {
			items.delete(messageId)
		}

		schedule()
	}

	const setButton = (direction: MessageScrollerDirection, element: HTMLButtonElement | null) => {
		if (element) {
			for (const registeredDirection of ['start', 'end'] as const) {
				if (registeredDirection !== direction && buttons[registeredDirection] === element) {
					buttons[registeredDirection] = null
				}
			}
		}
		buttons[direction] = element
		updateButton('start')
		updateButton('end')
	}

	const api: InternalMessageScrollerApi = {
		scrollToEnd,
		scrollToMessage,
		scrollToStart,
		scrollable,
		setButton,
		setContent,
		setItem,
		setRoot,
		setViewport,
		visibility,
	}

	this.signal.addEventListener('abort', () => {
		schedule.cancel()
		scheduleInitial.cancel()
		mutation?.disconnect()
	})

	for (const {
		autoScroll = true,
		children,
		defaultScrollPosition = 'end',
		preserveScrollOnPrepend = true,
		scrollPreviousItemPeek = 0,
		setApi,
	} of this) {
		const wasPreserving = currentPreserve
		currentAutoScroll = autoScroll
		currentDefaultPosition = defaultScrollPosition
		currentPreserve = preserveScrollOnPrepend
		if (!currentPreserve) preserveAnchor = null
		else if (!wasPreserving && !following) preserveAnchor = readItems().preserveAnchor
		currentPeek = scrollPreviousItemPeek
		if (setApi && setApi !== currentSetApi) {
			currentSetApi = setApi
			setApi(api)
		}

		viewportScroll.sync()
		viewportSize.sync()
		edges.sync()
		contentSize.sync()

		MessageScrollerContext(api)
		queueMicrotask(scheduleInitialScroll)

		yield <>{children}</>
	}
}

MessageScrollerProvider.attrs = {
	'data-slot': 'message-scroller-provider',
}

/** Unstyled root container for a scroll-managed message transcript. */
const MessageScroller: Stateless<MessageScrollerArgs> = ({ children, ref, ...attrs }) => {
	const scroller = useInternalMessageScroller()

	return (
		<div
			{...attrs}
			data-slot="message-scroller"
			ref={element => {
				scroller.setRoot(element)
				callRef(ref, element)
			}}
		>
			{children}
		</div>
	)
}

/** Unstyled keyboard-focusable transcript viewport. */
const MessageScrollerViewport: Stateless<MessageScrollerViewportArgs> = ({
	children,
	role = 'region',
	tabIndex = 0,
	'aria-label': label = 'Messages',
	ref,
	...attrs
}) => {
	const scroller = useInternalMessageScroller()

	return (
		<div
			{...attrs}
			aria-label={label}
			data-slot="message-scroller-viewport"
			ref={element => {
				scroller.setViewport(element)
				callRef(ref, element)
			}}
			role={role}
			tabIndex={tabIndex}
		>
			{children}
		</div>
	)
}

/** Unstyled live-region content list for rendered messages. */
const MessageScrollerContent: Stateless<MessageScrollerContentArgs> = ({
	children,
	role = 'log',
	'aria-live': live = 'polite',
	'aria-relevant': relevant = 'additions',
	ref,
	...attrs
}) => {
	const scroller = useInternalMessageScroller()

	return (
		<div
			{...attrs}
			aria-live={live}
			aria-relevant={relevant}
			data-slot="message-scroller-content"
			ref={element => {
				scroller.setContent(element)
				callRef(ref, element)
			}}
			role={role}
		>
			{children}
		</div>
	)
}

/** Unstyled scroll-trackable transcript item. */
const MessageScrollerItem: Stateless<MessageScrollerItemArgs> = ({
	children,
	messageId,
	ref,
	scrollAnchor = false,
	...attrs
}) => {
	const scroller = useInternalMessageScroller()

	return (
		<div
			{...attrs}
			data-message-id={messageId}
			data-scroll-anchor={String(scrollAnchor)}
			data-slot="message-scroller-item"
			ref={element => {
				scroller.setItem(messageId, element)
				callRef(ref, element)
			}}
		>
			{children}
		</div>
	)
}

/** Unstyled floating button that jumps to the start or end of the transcript. */
const MessageScrollerButton: Stateless<MessageScrollerButtonArgs> = ({
	'aria-label': label,
	children,
	direction = 'end',
	disabled,
	ref,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const scroller = useInternalMessageScroller()
	const buttonActive = (next: MessageScrollerDirection) =>
		next === 'start' ? scroller.scrollable.start : scroller.scrollable.end
	const active = buttonActive(direction)
	const title = label ?? (direction === 'end' ? 'Scroll to end' : 'Scroll to start')

	const click = (event: MouseEvent) => {
		callHandler(onClick, event)
		if (event.defaultPrevented || disabled || !buttonActive(direction)) return
		if (direction === 'start') scroller.scrollToStart()
		else scroller.scrollToEnd()
	}

	return (
		<button
			{...attrs}
			aria-label={title}
			data-active={active ? 'true' : 'false'}
			data-direction={direction}
			data-slot="message-scroller-button"
			disabled={disabled}
			ref={element => {
				scroller.setButton(direction, element)
				callRef(ref, element)
			}}
			set:onclick={click}
			tabIndex={active ? attrs.tabIndex : -1}
			type={type}
		>
			{children}
		</button>
	)
}

export {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
	useMessageScroller,
	useMessageScrollerScrollable,
	useMessageScrollerVisibility,
}
