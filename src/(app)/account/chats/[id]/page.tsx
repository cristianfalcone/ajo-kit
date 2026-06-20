import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'
import clsx from 'clsx'
import { Button, Input, Panel } from '/src/ui'

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

const ChatRoom: Stateful<Props<Data>> = function* (args) {

	const send = action<{ ok: true }>('send')
	const load = action<LoadPage>('load')
	const markAsSeen = action<{ ok: true }>('markAsSeen')
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
	let unreadVisibilityRaf: number | null = null
	let unreadHighlightIds = new Set<number>()
	let unreadHighlightedOnceIds = new Set<number>()

	const unreadHighlightTimers = new Map<number, ReturnType<typeof setTimeout>>()
	const pendingRestoreRef: { current: RestoreSnapshot | null } = { current: null }

	const clearUnreadJumpTimeout = () => {
		if (unreadJumpTimeout === null) return
		clearTimeout(unreadJumpTimeout)
		unreadJumpTimeout = null
	}

	const clearUnreadVisibilityCheck = () => {
		if (unreadVisibilityRaf === null) return
		cancelAnimationFrame(unreadVisibilityRaf)
		unreadVisibilityRaf = null
	}

	const scheduleUnreadVisibilityCheck = () => {

		if (import.meta.env.SSR) return
		if (unreadVisibilityRaf !== null) return

		unreadVisibilityRaf = requestAnimationFrame(() => {
			unreadVisibilityRaf = null
			this.next()
		})
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

		void load.invoke({ direction, cursor }).then(result => {

			if (!result) return

			const chunk = result.messages ?? []
			const anchor = box.querySelector<HTMLElement>(`[data-message-id='${cursor}']`)
			const anchorTop = anchor?.getBoundingClientRect().top ?? null
			const scrollTop = box.scrollTop
			const scrollHeight = box.scrollHeight

			this.next(() => {

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

	const onScroll = () => {

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
	}

	const onSend = (event: SubmitEvent) => {

		send.submit(event)

		this.next(() => {
			text = ''
			shouldJumpToBottom = true
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
		clearUnreadHighlightTimers()
	})

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
			requestAnimationFrame(() => maybeLoad('older'))
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

				requestAnimationFrame(() => maybeLoad('older', { force: true }))

			} else if (!load.loading && needsNewer && canLoadNewer) {

				requestAnimationFrame(() => maybeLoad('newer', { force: true }))

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

			const unreadIds = unreadIdsFromAnchor(timeline, meId, unreadAnchorId)

			oldestUnreadVisible = isMessageVisible(unreadAnchorId)

			if (oldestUnreadVisible || unreadIds.some(id => isMessageVisible(id))) {
				const idsToHighlight = unreadIds.filter(id => !unreadHighlightedOnceIds.has(id))
				startUnreadHighlight(idsToHighlight)
			}
		}

		if ((oldestUnreadVisible || atConversationBottom) && unreadCount > 0) {
			unreadPillHidden = true
			forceMarkAsSeen = true
		}

		const expectedPath = data?.chat?.id ? `/account/chats/${data.chat.id}` : null
		const onActiveChatRoute = typeof location !== 'undefined' && expectedPath !== null && location.pathname === expectedPath

		if (data?.chat?.id && onActiveChatRoute && typeof document !== 'undefined' && document.visibilityState === 'visible') {

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

		const timelineNodes = timeline.flatMap((msg, index) => {

			const messageDate = parseMessageDate(msg.created)
			const marker = dayStamp(messageDate)
			const needsSeparator = marker !== previousDayMarker

			previousDayMarker = marker

			const nodes = []

			if (needsSeparator) {
				nodes.push(
					<div key={`day-${marker}`} class="my-2 flex justify-center">
						<time
							dateTime={messageDate.toISOString()}
							class="px-3 py-1 rounded-full text-[11px] font-medium bg-[#dfe9ed]/80 dark:bg-white/10 text-slate-600 dark:text-gray-300 backdrop-blur"
						>
							{formatDaySeparator(messageDate, now)}
						</time>
					</div>
				)
			}

			nodes.push(
				<div
					key={msg.id}
					data-message-id={msg.id}
					class={clsx(
						'w-full px-2 py-1 rounded-xl flex flex-col transition-colors ease-out',
						msg.user === data?.me ? 'items-end' : 'items-start',
						msg.user !== data?.me && unreadHighlightIds.has(msg.id) && 'bg-amber-100/70 dark:bg-amber-300/12',
						index === timeline.length - 1 ? 'last-message' : '',
					)}
					style={msg.user !== data?.me ? { transitionDuration: `${UNREAD_HIGHLIGHT_FADE_MS}ms` } : undefined}
				>
					{msg.user !== data?.me && (
						<span class="text-xs text-slate-500 dark:text-gray-400 mb-1">
							{msg.userName}
						</span>
					)}
					<div
						class={
							clsx(
								'max-w-[80%] px-4 py-2 rounded-2xl',
								msg.user === data?.me
									? 'bg-primary text-white dark:bg-accent dark:text-primary rounded-br-md'
									: 'bg-[#dfe9ed]/90 text-slate-900 shadow-xs shadow-slate-900/8 inset-ring inset-ring-slate-900/8 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/8 rounded-bl-md'
							)
						}
					>
						{msg.text}
					</div>
					<time
						dateTime={messageDate.toISOString()}
						title={timeFormatter.format(messageDate)}
						class="text-xs text-slate-400 dark:text-gray-500 mt-1"
					>
						{formatMessageTime(messageDate, now)}
					</time>
				</div>
			)

			return nodes
		})

		const title =
			data?.chat?.name ||
			data?.participants?.filter(p => p.id !== data?.me).map(p => p.name).join(', ') ||
			'Chat'

		yield (
			<section class="py-8 max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col">

				{/* Header */}
				<div class="flex items-center gap-4 mb-4">
					<a href="/account/chats" class="text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-accent/70">
						<div class="i-lucide-chevron-left w-5 h-5" />
					</a>
					<div>
						<h1 class="text-xl font-bold text-slate-900 dark:text-white">
							{loading ? 'Loading...' : title}
						</h1>
						{!loading && data?.participants && (
							<p class="text-sm text-slate-500 dark:text-gray-400">
								{data.participants.length} participant{data.participants.length !== 1 ? 's' : ''}
							</p>
						)}
					</div>
				</div>

				{/* Messages */}
				<Panel radius="xl" padding="none" class="flex-1 min-h-0 overflow-hidden relative">
					<div
						class="h-full overflow-y-auto p-4 space-y-3"
						ref={el => boxRef.current = el}
						set:onscroll={onScroll}
					>
						{loading ? (
							<p class="text-slate-500 dark:text-gray-400">
								Loading messages...
							</p>
						) : (
							<>
								{canLoadOlder && (
									<div class="text-center py-2 text-xs text-slate-500 dark:text-gray-400">
										{load.loading ? 'Loading messages...' : 'Scroll up to load older messages'}
									</div>
								)}
								{load.error && (
									<p class="text-center text-xs text-red-500 py-2">
										{load.error.message}
									</p>
								)}
								{!canLoadOlder && timeline.length > 0 && (
									<p class="text-center text-slate-400 dark:text-gray-500 py-2 text-sm">
										Beginning of conversation
									</p>
								)}
								{timeline.length === 0 ? (
									<p class="text-center text-slate-500 dark:text-gray-400 py-8">
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
							class="absolute left-1/2 -translate-x-1/2 bottom-4 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold shadow-lg hover:opacity-90 transition"
						>
							{unreadCount} new message{unreadCount !== 1 ? 's' : ''}
						</button>
					)}
				</Panel>

				{/* Input */}
				<form set:onsubmit={onSend} class="mt-4 flex gap-2">
					<Input
						name="text"
						value={text}
						set:oninput={event => this.next(() => text = (event.target as HTMLInputElement).value)}
						placeholder="Type a message..."
						autocomplete="off"
						tone="muted"
						wrapper="flex-1"
					/>
					<Button
						type="submit"
						disabled={!text.trim() || send.loading}
					>
						{send.loading ? '...' : 'Send'}
					</Button>
				</form>
			</section>
		)
	}
}

export default ChatRoom
