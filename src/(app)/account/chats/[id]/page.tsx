import type { Children, Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import { frame, visibility } from 'ajo-cloves'
import clsx from 'clsx'
import { Bubble, BubbleContent } from 'ajo-ui-playa/bubble'
import { buttonVariants } from 'ajo-ui-playa/button'
import { Input } from 'ajo-ui-playa/input'
import { Message as MessageRow, MessageContent, MessageFooter, MessageGroup, MessageHeader } from 'ajo-ui-playa/message'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ajo-ui-playa/tooltip'
import { ChatAvatar } from '../view'

type Message = {
	id: number
	text: string
	created: string
	user: number
	userName: string
}

type Chat = {
	id: number
	name: string | null
}

type Participant = {
	id: number
	name: string
}

type Data = {
	chat: Chat
	participants: Participant[]
	messages: Message[]
	hasMore: boolean
	me: number
	unreadCount: number
	oldestUnreadId: number | null
}

type LoadPage = {
	messages: Message[]
	hasMore: boolean
}

type SendResult = {
	ok: true
	message: Message
}

type LoadDirection = 'older' | 'newer'

type RestoreSnapshot = {
	id: number
	anchorTop: number | null
	scrollTop: number
	scrollHeight: number
}

const TOP_LOAD_THRESHOLD = 180
const BOTTOM_LOAD_THRESHOLD = 180
const BOTTOM_STICK_THRESHOLD = 100
const BOTTOM_READ_THRESHOLD = 12
const WINDOW_PAGES = 3
const UNREAD_HIGHLIGHT_HOLD_MS = 1800
const UNREAD_HIGHLIGHT_FADE_MS = 4200
const DAY_IN_MS = 86_400_000

const ChatRoom: Stateful<PageArgs<Data>> = function* (args) {

	const send = action<SendResult>('send')
	const load = action<LoadPage>('load')
	const markAsSeen = action<{ ok: true }>('markAsSeen')
	const vis = visibility(this)
	const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US'
	const dayFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
	const timeFormatter = new Intl.DateTimeFormat(locale, { timeStyle: 'short' })
	const relativeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'long' })

	let text = ''

	const boxRef: { current: HTMLDivElement | null } = { current: null }

	let timeline: Message[] = []
	let pageSize = 0
	let canLoadOlder = false
	let canLoadNewer = false
	let activeChatId: number | null = null
	let lastMessageId: number | undefined
	let marked = ''
	let wasAtBottom = true
	let shouldJumpToBottom = false
	let forceMarkAsSeen = false
	let markOnFirstOpen = false
	let unreadPillHidden = false
	let lastUnreadCount = 0
	let jumpToUnreadId: number | null = null
	let markAfterUnreadJump = false
	let unreadJumpInProgress = false
	let unreadJumpTimeout: ReturnType<typeof setTimeout> | null = null
	let unreadHighlightIds = new Set<number>()
	let unreadHighlightedOnceIds = new Set<number>()

	const unreadHighlightTimers = new Map<number, ReturnType<typeof setTimeout>>()
	const pendingRestoreRef: { current: RestoreSnapshot | null } = { current: null }

	const clearUnreadJumpTimeout = () => {
		if (unreadJumpTimeout === null) return
		clearTimeout(unreadJumpTimeout)
		unreadJumpTimeout = null
	}

	const unreadVisibilityCheck = frame(() => this.next())

	const clearUnreadVisibilityCheck = () => unreadVisibilityCheck.cancel()

	const scheduleUnreadVisibilityCheck = () => {

		if (import.meta.env.SSR) return
		unreadVisibilityCheck()
	}

	const clearUnreadHighlightTimers = () => {
		for (const timeout of unreadHighlightTimers.values()) clearTimeout(timeout)
		unreadHighlightTimers.clear()
	}

	const startUnreadHighlight = (ids: number[]) => {

		if (ids.length === 0) return

		const next = new Set(unreadHighlightIds)

		for (const id of ids) {

			if (unreadHighlightedOnceIds.has(id)) continue

			unreadHighlightedOnceIds.add(id)

			next.add(id)

			const existing = unreadHighlightTimers.get(id)

			if (existing) clearTimeout(existing)

			const timeout = setTimeout(() => {

				this.next(() => {

					if (!unreadHighlightIds.has(id)) {
						unreadHighlightTimers.delete(id)
						return
					}

					const reduced = new Set(unreadHighlightIds)

					reduced.delete(id)

					unreadHighlightIds = reduced

					unreadHighlightTimers.delete(id)
				})

			}, UNREAD_HIGHLIGHT_HOLD_MS)

			unreadHighlightTimers.set(id, timeout)
		}

		unreadHighlightIds = next
	}

	const finishUnreadJump = (markSeen = false) => {

		clearUnreadJumpTimeout()

		unreadJumpInProgress = false
		jumpToUnreadId = null

		if (markAfterUnreadJump) {
			markAfterUnreadJump = false
			if (markSeen) forceMarkAsSeen = true
		}
	}

	const resolveUnreadAnchorId = (
		items: Message[],
		meId: number | undefined,
		unreadCount: number,
		fallbackId: number | null,
		hasNewerPages: boolean
	) => {

		if (unreadCount <= 0) return null

		// Source of truth: backend oldest unread id.
		// Derive only as a last-resort fallback when that id is unavailable in the latest loaded window.
		if (fallbackId !== null) {
			const fallbackLoaded = items.some(message => message.id === fallbackId)
			if (fallbackLoaded || hasNewerPages) return fallbackId
		}

		if (typeof meId !== 'number') return fallbackId

		const incomingIds = items.filter(message => message.user !== meId).map(message => message.id)

		if (incomingIds.length < unreadCount) return fallbackId

		const candidate = incomingIds[incomingIds.length - unreadCount]

		return candidate ?? fallbackId
	}

	const parseMessageDate = (value: string) => {

		const normalized = (value.includes('T') ? value : value.replace(' ', 'T')).trim()
		const hasExplicitOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
		const isoUtc = hasExplicitOffset ? normalized : `${normalized}Z`
		const date = new Date(isoUtc)

		return Number.isNaN(date.getTime()) ? new Date() : date
	}

	const dayStamp = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

	const formatDaySeparator = (date: Date, now: Date) => {

		const deltaDays = Math.round((dayStamp(date) - dayStamp(now)) / DAY_IN_MS)

		if (deltaDays === 0 || deltaDays === -1 || deltaDays === 1) return relativeFormatter.format(deltaDays, 'day')

		return dayFormatter.format(date)
	}

	const formatMessageTime = (date: Date, now: Date) => {

		const dateDay = dayStamp(date)
		const nowDay = dayStamp(now)

		if (dateDay === nowDay) {

			const deltaSeconds = Math.round((date.getTime() - now.getTime()) / 1000)
			const absSeconds = Math.abs(deltaSeconds)

			if (absSeconds < 45) return relativeFormatter.format(0, 'second')
			if (absSeconds < 90) return relativeFormatter.format(deltaSeconds < 0 ? -1 : 1, 'minute')
			if (absSeconds < 3600) return relativeFormatter.format(Math.round(deltaSeconds / 60), 'minute')

			return relativeFormatter.format(Math.round(deltaSeconds / 3600), 'hour')
		}

		return timeFormatter.format(date)
	}

	const trimWindow = (items: Message[], edge: 'older' | 'newer') => {

		const windowSize = Math.max(pageSize * WINDOW_PAGES, 1)

		if (items.length <= windowSize) return { messages: items, droppedOlder: false, droppedNewer: false }

		const overflow = items.length - windowSize

		if (edge === 'older') {
			return {
				messages: items.slice(0, windowSize),
				droppedOlder: false,
				droppedNewer: overflow > 0
			}
		}

		return {
			messages: items.slice(overflow),
			droppedOlder: overflow > 0,
			droppedNewer: false
		}
	}

	const growPageSize = (...sizes: number[]) => {
		for (const size of sizes) if (size > pageSize) pageSize = size
		if (pageSize < 1) pageSize = 1
	}

	const bottomOffset = (element: HTMLDivElement) => element.scrollHeight - element.scrollTop - element.clientHeight

	const unreadIdsFromAnchor = (items: Message[], meId: number | undefined, anchorId: number | null) => {

		if (anchorId === null || typeof meId !== 'number') return []

		return items
			.filter(message => message.user !== meId && message.id >= anchorId)
			.map(message => message.id)
	}

	const resetWindowForChat = (
		incoming: Message[],
		hasMore: boolean,
		incomingNewest: number | undefined,
		unreadCount: number,
		shouldJumpToUnreadOnOpen: boolean,
		initialUnreadAnchorId: number | null
	) => {

		pageSize = Math.max(incoming.length, 1)
		timeline = incoming
		canLoadOlder = hasMore
		canLoadNewer = false
		lastMessageId = incomingNewest
		wasAtBottom = !shouldJumpToUnreadOnOpen
		forceMarkAsSeen = false
		markOnFirstOpen = unreadCount > 0 && !shouldJumpToUnreadOnOpen
		unreadPillHidden = shouldJumpToUnreadOnOpen
		lastUnreadCount = unreadCount

		finishUnreadJump()
		clearUnreadVisibilityCheck()
		clearUnreadHighlightTimers()

		unreadHighlightIds = new Set()
		unreadHighlightedOnceIds = new Set()
		jumpToUnreadId = shouldJumpToUnreadOnOpen ? initialUnreadAnchorId : null
		markAfterUnreadJump = shouldJumpToUnreadOnOpen

		pendingRestoreRef.current = null

		if (import.meta.env.SSR) return

		queueMicrotask(() => {
			if (shouldJumpToUnreadOnOpen) this.next()
			else scrollToBottom()
		})
	}

	const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
		const box = boxRef.current
		if (!box) return
		box.scrollTo({ top: box.scrollHeight, behavior })
	}

	const maybeLoad = (direction: LoadDirection, options?: { force?: boolean }) => {

		const box = boxRef.current

		if (!box || args.loading || load.loading) return
		if (unreadJumpInProgress && !options?.force) return

		const wantsOlder = direction === 'older'
		const enabled = wantsOlder ? canLoadOlder : canLoadNewer

		if (!enabled && !options?.force) return

		const cursor = wantsOlder ? timeline[0]?.id : timeline.at(-1)?.id

		if (!cursor) return

		const chat = activeChatId

		void load.invoke({ direction, cursor }).then(result => {

			if (chat !== activeChatId) return
			if (!result) return

			const chunk = result.messages ?? []
			const anchor = box.querySelector<HTMLElement>(`[data-message-id='${cursor}']`)
			const anchorTop = anchor?.getBoundingClientRect().top ?? null
			const scrollTop = box.scrollTop
			const scrollHeight = box.scrollHeight

			this.next(() => {

				if (chat !== activeChatId) return

				if (chunk.length === 0) {
					if (wantsOlder) canLoadOlder = false
					else canLoadNewer = false
					return
				}

				growPageSize(chunk.length)

				const known = new Set(timeline.map(message => message.id))
				const unique = chunk.filter(message => !known.has(message.id))

				if (unique.length > 0) {

					const next = wantsOlder ? [...unique, ...timeline] : [...timeline, ...unique]
					const windowed = trimWindow(next, wantsOlder ? 'older' : 'newer')

					timeline = windowed.messages

					if (windowed.droppedOlder) canLoadOlder = true
					if (windowed.droppedNewer) canLoadNewer = true

					pendingRestoreRef.current = { id: cursor, anchorTop, scrollTop, scrollHeight }
				}

				if (wantsOlder) canLoadOlder = result.hasMore
				else canLoadNewer = result.hasMore
			})
		})
	}

	const fillViewportLoadOlder = frame(() => maybeLoad('older'))
	const jumpLoadOlder = frame(() => maybeLoad('older', { force: true }))
	const jumpLoadNewer = frame(() => maybeLoad('newer', { force: true }))

	const scrollCheck = frame(() => {

		const box = boxRef.current

		if (!box) return

		const offsetFromBottom = bottomOffset(box)
		const atBottom = offsetFromBottom <= BOTTOM_STICK_THRESHOLD

		if (atBottom !== wasAtBottom) this.next(() => wasAtBottom = atBottom)
		else wasAtBottom = atBottom

		if (unreadJumpInProgress) return

		if (box.scrollTop <= TOP_LOAD_THRESHOLD) maybeLoad('older')
		if (offsetFromBottom <= BOTTOM_LOAD_THRESHOLD) maybeLoad('newer')
		if (lastUnreadCount > 0) scheduleUnreadVisibilityCheck()
	})

	const onScroll = () => {
		if (import.meta.env.SSR) return
		scrollCheck()
	}

	const onSend = (event: SubmitEvent) => {

		event.preventDefault()

		const form = event.currentTarget as HTMLFormElement
		const value = text.trim()

		if (!value || send.loading) return

		const chat = activeChatId

		this.next(() => {
			text = ''
			shouldJumpToBottom = true
		})
		form.reset()

		void send.invoke({ text: value }).then(result => {

			if (chat !== activeChatId) return
			if (!result?.message) return

			this.next(() => {

				if (chat !== activeChatId) return

				if (!timeline.some(message => message.id === result.message.id)) {
					growPageSize(1)

					const windowed = trimWindow([...timeline, result.message], 'newer')

					timeline = windowed.messages
					canLoadNewer = false

					if (windowed.droppedOlder) canLoadOlder = true
				}

				shouldJumpToBottom = true
			})
		})
	}

	const scrollToMessage = (messageId: number, behavior: ScrollBehavior = 'smooth') => {

		const box = boxRef.current

		if (!box) return false

		const target = box.querySelector<HTMLElement>(`[data-message-id='${messageId}']`)

		if (!target) return false

		const boxRect = box.getBoundingClientRect()
		const targetRect = target.getBoundingClientRect()
		const top = targetRect.top - boxRect.top + box.scrollTop - 16

		box.scrollTo({ top: Math.max(top, 0), behavior })

		return true
	}

	const isMessageVisible = (messageId: number) => {

		const box = boxRef.current

		if (!box) return false

		const target = box.querySelector<HTMLElement>(`[data-message-id='${messageId}']`)

		if (!target) return false

		const boxRect = box.getBoundingClientRect()
		const targetRect = target.getBoundingClientRect()
		const topEdge = boxRect.top + 4
		const bottomEdge = boxRect.bottom - 4

		return targetRect.bottom >= topEdge && targetRect.top <= bottomEdge
	}

	this.signal.addEventListener('abort', () => {
		clearUnreadJumpTimeout()
		clearUnreadVisibilityCheck()
		scrollCheck.cancel()
		fillViewportLoadOlder.cancel()
		jumpLoadOlder.cancel()
		jumpLoadNewer.cancel()
		clearUnreadHighlightTimers()
	}, { once: true })

	for (args of this) {

		const { data, loading } = args
		const incoming = data?.messages ?? []
		const incomingNewest = incoming.at(-1)?.id
		const unreadCount = data?.unreadCount ?? 0
		const oldestUnreadId = data?.oldestUnreadId ?? null
		const meId = data?.me
		const chat = data?.chat?.id ?? null
		const initialUnreadAnchorId = resolveUnreadAnchorId(incoming, meId, unreadCount, oldestUnreadId, false)
		const shouldJumpToUnreadOnOpen = unreadCount > 0 && initialUnreadAnchorId !== null

		if (chat !== activeChatId) {

			activeChatId = chat
			send.reset()
			load.reset()
			markAsSeen.reset()

			resetWindowForChat(
				incoming,
				Boolean(data?.hasMore),
				incomingNewest,
				unreadCount,
				shouldJumpToUnreadOnOpen,
				initialUnreadAnchorId
			)

		} else if (data && !loading) {

			growPageSize(incoming.length)

			if (shouldJumpToBottom && incoming.length > 0) {
				// After sending, force the latest server window so we can always scroll to the newest message.
				timeline = incoming
				canLoadOlder = Boolean(data.hasMore)
				canLoadNewer = false
			} else if (!timeline.length) {
				timeline = incoming
			}

			const timelineNewest = timeline.at(-1)?.id ?? 0

			if (incomingNewest && incomingNewest > timelineNewest) {

				if (wasAtBottom && !canLoadNewer && !load.loading) {

					const known = new Set(timeline.map(message => message.id))
					const append = incoming.filter(message => message.id > timelineNewest && !known.has(message.id))

					if (append.length > 0) {

						const next = [...timeline, ...append]
						const windowed = trimWindow(next, 'newer')

						timeline = windowed.messages

						if (windowed.droppedOlder) canLoadOlder = true
					}

				} else {
					canLoadNewer = true
				}
			}
		}

		const newest = timeline.at(-1)?.id

		if (newest !== lastMessageId) {

			const hadPrevious = lastMessageId !== undefined

			lastMessageId = newest

			if (!import.meta.env.SSR && hadPrevious && (wasAtBottom || shouldJumpToBottom)) {

				const shouldForceBottom = shouldJumpToBottom

				shouldJumpToBottom = false

				queueMicrotask(() => {
					scrollToBottom('auto')
					if (shouldForceBottom) queueMicrotask(() => scrollToBottom('auto'))
				})
			}
		}

		const pendingRestore = pendingRestoreRef.current

		if (pendingRestore && !import.meta.env.SSR) {

			const snapshot = pendingRestore

			pendingRestoreRef.current = null

			// During jump-to-unread we own the scroll position; skip anchor restore corrections.
			if (jumpToUnreadId !== null) continue

			// Keep the current viewport anchored when older messages are prepended.
			queueMicrotask(() => {

				const box = boxRef.current

				if (!box) return

				const anchor = box.querySelector<HTMLElement>(`[data-message-id='${snapshot.id}']`)

				if (anchor && snapshot.anchorTop !== null) {

					const delta = anchor.getBoundingClientRect().top - snapshot.anchorTop

					box.scrollTop += delta

					return
				}

				const delta = box.scrollHeight - snapshot.scrollHeight

				box.scrollTop = snapshot.scrollTop + delta
			})
		}

		const liveBox = boxRef.current

		if (!import.meta.env.SSR && liveBox && canLoadOlder && !load.loading && liveBox.scrollHeight <= liveBox.clientHeight + 24) {
			fillViewportLoadOlder()
		}

		if (!import.meta.env.SSR && jumpToUnreadId) {

			const targetId = jumpToUnreadId
			const firstLoadedId = timeline[0]?.id ?? null
			const lastLoadedId = timeline.at(-1)?.id ?? null
			const needsOlder = firstLoadedId !== null && targetId < firstLoadedId
			const needsNewer = lastLoadedId !== null && targetId > lastLoadedId

			const target = boxRef.current?.querySelector<HTMLElement>(`[data-message-id='${targetId}']`)

			if (target) {

				pendingRestoreRef.current = null

				if (!unreadJumpInProgress) {

					unreadJumpInProgress = true

					scrollToMessage(targetId, 'smooth')
					clearUnreadJumpTimeout()

					unreadJumpTimeout = setTimeout(() => {

						this.next(() => {

							if (jumpToUnreadId !== targetId) return

							scrollToMessage(targetId, 'auto')

							const idsToHighlight = unreadIdsFromAnchor(timeline, data?.me, targetId).filter(id => !unreadHighlightedOnceIds.has(id))

							startUnreadHighlight(idsToHighlight)
							finishUnreadJump(true)
						})
					}, 420)
				}
			} else if (!load.loading && needsOlder && canLoadOlder) {

				jumpLoadOlder()

			} else if (!load.loading && needsNewer && canLoadNewer) {

				jumpLoadNewer()

			} else if (!load.loading && needsOlder && !canLoadOlder) {

				queueMicrotask(() => {
					const box = boxRef.current
					if (!box) return
					box.scrollTo({ top: 0, behavior: 'smooth' })
				})

				finishUnreadJump(true)

			} else if (!load.loading && needsNewer && !canLoadNewer) {

				// Fallback: no further pages available but unread anchor not found ahead.
				queueMicrotask(() => scrollToBottom('smooth'))

				finishUnreadJump(true)
			}
		}

		if (markOnFirstOpen) {
			if (unreadCount > 0) forceMarkAsSeen = true
			markOnFirstOpen = false
		}

		const unreadAnchorId = resolveUnreadAnchorId(timeline, meId, unreadCount, oldestUnreadId, canLoadNewer)

		if (unreadCount > lastUnreadCount) unreadPillHidden = false
		if (unreadCount === 0) unreadPillHidden = false

		lastUnreadCount = unreadCount

		const scrollBox = boxRef.current

		const atConversationBottom =
			!import.meta.env.SSR &&
			scrollBox !== null &&
			!canLoadNewer &&
			bottomOffset(scrollBox) <= BOTTOM_READ_THRESHOLD

		let oldestUnreadVisible = false

		if (unreadAnchorId !== null && !import.meta.env.SSR) {

			oldestUnreadVisible = isMessageVisible(unreadAnchorId)
		}

		if ((oldestUnreadVisible || atConversationBottom) && unreadCount > 0) {
			unreadPillHidden = true
			forceMarkAsSeen = true
		}

		const expectedPath = data?.chat?.id ? `/account/chats/${data.chat.id}` : null
		const onActiveChatRoute = typeof location !== 'undefined' && expectedPath !== null && location.pathname === expectedPath

		if (data?.chat?.id && onActiveChatRoute && vis.visible) {

			const current = `${data.chat.id}:${newest ?? 0}:${unreadCount}`

			if (forceMarkAsSeen && current !== marked && !markAsSeen.loading) {
				marked = current
				forceMarkAsSeen = false
				void markAsSeen.invoke()
			}
		}

		const showUnreadPill = unreadCount > 0 && !unreadPillHidden && !oldestUnreadVisible && !atConversationBottom

		const onJumpToUnread = () => {

			if (!unreadAnchorId) return

			this.next(() => {

				finishUnreadJump()

				unreadPillHidden = true
				canLoadNewer = true
				jumpToUnreadId = unreadAnchorId
				markAfterUnreadJump = true
			})
		}

		const now = new Date()

		let previousDayMarker: number | null = null

		const timelineNodes: Children[] = []
		let run: Children[] = []
		let runSender = ''
		// Keyed by the run's first message id: sender+day repeats across runs
		// in an alternating conversation and duplicate sibling keys corrupt
		// keyed reconciliation.
		let runKey = ''

		const flushRun = () => {
			if (!run.length) return
			timelineNodes.push(<MessageGroup key={runKey}>{run}</MessageGroup>)
			run = []
		}

		timeline.forEach((msg, index) => {

			const messageDate = parseMessageDate(msg.created)
			const marker = dayStamp(messageDate)
			const needsSeparator = marker !== previousDayMarker

			previousDayMarker = marker

			if (needsSeparator) {
				flushRun()
				timelineNodes.push(
					<div key={`day-${marker}`} class="my-2 flex justify-center">
						<time
							dateTime={messageDate.toISOString()}
							class="glass edge rounded-full px-3 py-1 text-xs font-medium text-muted-foreground"
						>
							{formatDaySeparator(messageDate, now)}
						</time>
					</div>
				)
			}

			const mine = msg.user === data?.me
			const senderKey = `${msg.user}-${marker}`

			if (runSender !== senderKey || needsSeparator) {
				flushRun()
				runSender = senderKey
				runKey = `run-${msg.id}`
			}

			const next = timeline[index + 1]
			const lastOfRun = !next || next.user !== msg.user || dayStamp(parseMessageDate(next.created)) !== marker

			run.push(
				<MessageRow
					key={msg.id}
					align={mine ? 'end' : 'start'}
					data-message-id={msg.id}
					class={clsx(
						'rounded-xl px-2 py-1 transition-colors ease-out',
						!mine && unreadHighlightIds.has(msg.id) && 'bg-warning/15',
						index === timeline.length - 1 && 'last-message',
					)}
					style={!mine ? `transition-duration:${UNREAD_HIGHLIGHT_FADE_MS}ms` : undefined}
				>
					<MessageContent>
						{!mine && run.length === 0 ? <MessageHeader>{msg.userName}</MessageHeader> : null}
						<Bubble variant={mine ? 'default' : 'secondary'}>
							<BubbleContent>{msg.text}</BubbleContent>
						</Bubble>
						{lastOfRun ? (
							<MessageFooter>
								<time dateTime={messageDate.toISOString()} title={timeFormatter.format(messageDate)}>
									{formatMessageTime(messageDate, now)}
								</time>
							</MessageFooter>
						) : null}
					</MessageContent>
				</MessageRow>
			)
		})

		flushRun()

		const title =
			data?.chat?.name ||
			data?.participants?.filter(p => p.id !== data?.me).map(p => p.name).join(', ') ||
			'Chat'

		yield (
			<>
				<header class="flex items-center gap-4 border-b px-4 py-3">
					{loading ? (
						<p class="text-sm text-muted-foreground">
							Loading conversation...
						</p>
					) : (
						<>
							<ChatAvatar name={title} />
							<div class="min-w-0">
								<h2 class="truncate text-lg font-semibold text-foreground">
									{title}
								</h2>
								{data?.participants && (
									<p class="text-xs text-muted-foreground">
										{data.participants.length} participant{data.participants.length !== 1 ? 's' : ''}
									</p>
								)}
							</div>
							<Tooltip delayDuration={500} class="ml-auto">
								<TooltipTrigger
									type="button"
									aria-label="Chat options"
									data-variant="ghost"
									class={buttonVariants({ variant: 'ghost', size: 'icon' })}
								>
									<span class="i-lucide-more-vertical size-4" />
								</TooltipTrigger>
								<TooltipContent>Chat options</TooltipContent>
							</Tooltip>
						</>
					)}
				</header>

				<div class="relative min-h-0 flex-1">
					<div
						class="h-full space-y-3 overflow-y-auto scrollbar-soft scrollbar-gutter-stable p-4"
						ref={el => boxRef.current = el}
						set:onscroll={onScroll}
					>
						{loading ? (
							<p class="text-sm text-muted-foreground">
								Loading messages...
							</p>
						) : (
							<>
								{canLoadOlder && (
									<div class="text-center py-2 text-xs text-muted-foreground">
										{load.loading ? 'Loading messages...' : 'Scroll up to load older messages'}
									</div>
								)}
								{load.error && (
									<p class="text-center text-xs text-danger py-2">
										{load.error.message}
									</p>
								)}
								{!canLoadOlder && timeline.length > 0 && (
									<p class="text-center text-muted-foreground py-2 text-sm">
										Beginning of conversation
									</p>
								)}
								{timeline.length === 0 ? (
									<p class="py-12 text-center text-sm text-muted-foreground">
										No messages yet. Start the conversation!
									</p>
								) : (
									timelineNodes
								)}
							</>
						)}
					</div>
					{showUnreadPill && (
						<button
							type="button"
							set:onclick={onJumpToUnread}
							class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90"
						>
							{unreadCount} new message{unreadCount !== 1 ? 's' : ''}
						</button>
					)}
				</div>

				<form set:onsubmit={onSend} class="flex gap-2 border-t p-4">
					<div class="flex-1">
						<Input
							name="text"
							value={text}
							set:oninput={event => this.next(() => text = (event.target as HTMLInputElement).value)}
							placeholder="Type a message..."
							aria-label="Message"
							autocomplete="off"
						/>
					</div>
					<Tooltip delayDuration={500}>
						<TooltipTrigger
							type="submit"
							aria-label="Send"
							disabled={!text.trim() || send.loading}
							data-variant="default"
							class={buttonVariants({ size: 'icon' })}
						>
							<span class="i-lucide-send-horizontal size-4" />
						</TooltipTrigger>
						<TooltipContent>Send</TooltipContent>
					</Tooltip>
				</form>
			</>
		)
	}
}

ChatRoom.attrs = { class: 'flex h-full min-h-0 min-w-0 flex-col' }

export default ChatRoom
