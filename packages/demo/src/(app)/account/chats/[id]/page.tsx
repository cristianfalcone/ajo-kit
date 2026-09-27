import type { Children, Stateful, Stateless } from 'ajo'
import { locale, type PageArgs } from 'ajo-kit'
import { action } from 'ajo-kit/client'
import { timer, visibility } from 'ajo-cloves'
import clsx from 'clsx'
import { Bubble, BubbleContent } from 'ajo-ui-playa/bubble'
import { buttonVariants } from 'ajo-ui-playa/button'
import { Input } from 'ajo-ui-playa/input'
import { Message as MessageRow, MessageContent, MessageFooter, MessageGroup, MessageHeader } from 'ajo-ui-playa/message'
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerContext,
	MessageScrollerItem,
	MessageScrollerViewport,
} from 'ajo-ui-playa/message-scroller'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ajo-ui-playa/tooltip'
import { ago } from '/src/view'
import { ChatAvatar } from '../view'

type Message = {
	id: number
	text: string
	created: string
	user: number
	userName: string
}

type Data = {
	chat: { id: number; name: string | null }
	participants: { id: number; name: string }[]
	messages: Message[]
	hasMore: boolean
	me: number
	unreadCount: number
	oldestUnreadId: number | null
}

type Page = {
	messages: Message[]
	hasMore: boolean
}

/** The loader's page size, and the messages kept in the DOM: at least three pages. */
const PAGE = 10
const WINDOW = 30
const HOLD = 1800
const FADE = 4200
const DAY = 86_400_000

const day = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
const clock = new Intl.DateTimeFormat(locale, { timeStyle: 'short' })
const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

const dayLabel = (date: Date, now: Date) => {
	const days = Math.round((midnight(date) - midnight(now)) / DAY)
	return Math.abs(days) <= 1 ? relative.format(days, 'day') : day.format(date)
}

/** Sends a message, hands it to the room and follows the transcript to its end. */
const Composer: Stateful<{ sent: (message: Message) => void }> = function* (args) {

	const send = action<{ ok: true; message: Message }>('send')

	let text = ''

	for (args of this) {

		const scroller = MessageScrollerContext()!

		const submit = async (event: SubmitEvent) => {

			event.preventDefault()

			const form = event.currentTarget as HTMLFormElement
			const value = text.trim()

			if (!value || send.loading) return

			this.next(() => text = '')
			form.reset()

			const result = await send.invoke({ text: value })

			if (!result) return

			args.sent(result.message)
			scroller.scrollToEnd()
		}

		yield (
			<form set:onsubmit={submit} class="flex gap-2 border-t p-4">
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
		)
	}
}

/** The unread pill: loads the first unread message into the window, then scrolls to it. */
const UnreadJump: Stateless<{ count: number; reveal: () => Promise<number> }> = ({ count, reveal }) => {

	const scroller = MessageScrollerContext()!

	return (
		<button
			type="button"
			set:onclick={() => reveal().then(id => scroller.scrollToMessage(String(id)))}
			class="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90"
		>
			{count} new message{count !== 1 ? 's' : ''}
		</button>
	)
}

/** One room: a bounded window over its messages, paged, followed and marked as seen from what is visible. */
const Room: Stateful<{ data: Data }> = function* ({ data }) {

	const load = action<Page>('load')
	const markAsSeen = action<{ ok: true }>('markAsSeen')
	const tab = visibility(this)
	const fade = timer(this)
	const path = `/account/chats/${data.chat.id}`
	// While the router loads another route this room stays rendered, and actions post to the current URL.
	const here = () => globalThis.location?.pathname === path

	let timeline = data.messages
	let older = data.hasMore
	let newer = false
	let visible: string[] = []
	// Pages in flight until one is in the window: the action is idle again one render before that,
	// and a page that another one aborted settles while the newer one is still loading.
	let paging = 0
	let marked = ''
	let lit = new Set<number>()
	// The unread message the room opens at, and the one a jump heads for until it is in view.
	const opening = data.unreadCount > 0 ? data.oldestUnreadId : null
	let glow = opening

	const seen = (id: number) => visible.includes(String(id))

	// Keeps the window bounded, trimming the edge opposite to the one that grew. The trim never
	// reaches a message in view and leaves a page past it, so the new far edge is out of view and
	// a window that fits on screen grows instead of paging back and forth.
	const retain = (messages: Message[], edge: 'older' | 'newer') => {
		const shown = messages.map(message => seen(message.id))
		timeline = messages
		if (edge === 'older') {
			const keep = Math.max(WINDOW, shown.lastIndexOf(true) + 1 + PAGE)
			if (messages.length <= keep) return
			timeline = messages.slice(0, keep)
			newer = true
		} else {
			const from = shown.indexOf(true)
			const keep = Math.max(WINDOW, from < 0 ? 0 : messages.length - from + PAGE)
			if (messages.length <= keep) return
			timeline = messages.slice(-keep)
			older = true
		}
	}

	// Merges by id: a message that arrives after a newer one still takes its place.
	const append = (messages: Message[]) => {
		const shown = new Set(timeline.map(message => message.id))
		const first = timeline[0]?.id ?? 0
		const fresh = messages.filter(message => message.id > first && !shown.has(message.id))
		if (fresh.length) retain([...timeline, ...fresh].sort((a, b) => a.id - b.id), 'newer')
	}

	// Loads one page past an edge; resolves false when nothing arrived.
	const page = async (direction: 'older' | 'newer') => {
		const cursor = direction === 'older' ? timeline[0].id : timeline.at(-1)!.id
		paging++
		const result = await load.invoke({ direction, cursor })
		paging--
		if (!result) return false
		return this.next(() => {
			if (direction === 'older') {
				older = result.hasMore
				retain([...result.messages, ...timeline], 'older')
			} else {
				newer = result.hasMore
				append(result.messages)
			}
			return result.messages.length > 0
		}) ?? false
	}

	const reach = async (id: number) => {
		while (older && timeline[0].id > id && await page('older'));
		while (newer && timeline.at(-1)!.id < id && await page('newer'));
	}

	const reveal = async () => {
		const id = data.oldestUnreadId!
		this.next(() => glow = id)
		await reach(id)
		return id
	}

	const sent = (message: Message) => this.next(() => {
		if (newer) {
			timeline = data.messages
			older = data.hasMore
			newer = false
		}
		append([message])
	})

	// The scroller opens at the unread message, so it mounts once the window holds it.
	let ready = opening === null || !timeline.length || opening >= timeline[0].id

	if (!ready && !import.meta.env.SSR) reach(opening!).then(() => this.next(() => ready = true))

	for ({ data } of this) {

		if (!ready) {
			yield <p class="p-4 text-sm text-muted-foreground">Loading messages...</p>
			continue
		}

		if (!newer) append(data.messages)

		// An edge message in view pulls the next page past it.
		if (timeline.length && !paging && !load.error && here()) {
			if (older && seen(timeline[0].id)) void page('older')
			else if (newer && seen(timeline.at(-1)!.id)) void page('newer')
		}

		// Once the unread message is in view, the unread run from it lights up and fades.
		if (glow !== null && seen(glow)) {
			const from = glow
			lit = new Set(timeline.filter(message => message.user !== data.me && message.id >= from).map(message => message.id))
			glow = null
			fade.start(HOLD, () => this.next(() => lit = new Set()))
		}

		const unread = data.unreadCount > 0 ? data.oldestUnreadId : null
		const reading = unread !== null && visible.some(id => Number(id) >= unread)

		if (reading && tab.visible && here() && !markAsSeen.loading) {
			const key = `${unread}:${data.unreadCount}`
			if (key !== marked) {
				marked = key
				void markAsSeen.invoke()
			}
		}

		const now = new Date()
		const days = timeline.map(message => midnight(new Date(message.created)))
		const nodes: Children[] = []
		let run: Children[] = []
		// A run is keyed by its first message: sender and day repeat across runs.
		let key = ''

		const flush = () => {
			if (run.length) nodes.push(<MessageGroup key={key}>{run}</MessageGroup>)
			run = []
		}

		timeline.forEach((message, index) => {

			const date = new Date(message.created)
			const mine = message.user === data.me
			const first = index === 0 || days[index - 1] !== days[index]
			const starts = first || timeline[index - 1].user !== message.user
			const next = timeline[index + 1]
			const ends = !next || days[index + 1] !== days[index] || next.user !== message.user

			if (starts) {
				flush()
				key = `run-${message.id}`
			}

			if (first) {
				nodes.push(
					<div key={`day-${days[index]}`} class="my-2 flex justify-center">
						<time dateTime={message.created} class="glass edge rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
							{dayLabel(date, now)}
						</time>
					</div>
				)
			}

			run.push(
				<MessageScrollerItem
					key={message.id}
					messageId={String(message.id)}
					scrollAnchor={message.id === opening}
					class={clsx('rounded-xl px-2 py-1 transition-colors ease-out', lit.has(message.id) && 'bg-warning/15')}
					// The window is small and pages land above the reader: real heights, not
					// content-visibility placeholders, keep the anchored row where it is.
					style={`content-visibility:visible${mine ? '' : `;transition-duration:${FADE}ms`}`}
				>
					<MessageRow align={mine ? 'end' : 'start'}>
						<MessageContent>
							{!mine && starts ? <MessageHeader>{message.userName}</MessageHeader> : null}
							<Bubble variant={mine ? 'default' : 'secondary'}>
								<BubbleContent>{message.text}</BubbleContent>
							</Bubble>
							{ends ? (
								<MessageFooter>
									<time dateTime={message.created} title={clock.format(date)}>
										{days[index] === midnight(now) ? ago(message.created) : clock.format(date)}
									</time>
								</MessageFooter>
							) : null}
						</MessageContent>
					</MessageRow>
				</MessageScrollerItem>
			)
		})

		flush()

		yield (
			<MessageScroller
				autoScroll={!newer}
				defaultScrollPosition="last-anchor"
				scrollPreviousItemPeek={16}
				onVisibilityChange={({ visibleMessageIds }) => this.next(() => visible = visibleMessageIds)}
			>
				<div class="relative min-h-0 flex-1">
					<MessageScrollerViewport class="p-4" set:onscroll={load.error ? () => load.reset() : undefined}>
						<MessageScrollerContent class="gap-3">
							{older ? (
								<p class="py-2 text-center text-xs text-muted-foreground">
									{load.loading ? 'Loading messages...' : 'Scroll up to load older messages'}
								</p>
							) : timeline.length > 0 && (
								<p class="py-2 text-center text-sm text-muted-foreground">
									Beginning of conversation
								</p>
							)}
							{load.error && (
								<p class="py-2 text-center text-xs text-danger">
									{load.error.message}
								</p>
							)}
							{timeline.length ? nodes : (
								<p class="py-12 text-center text-sm text-muted-foreground">
									No messages yet. Start the conversation!
								</p>
							)}
						</MessageScrollerContent>
					</MessageScrollerViewport>
					<MessageScrollerButton />
					{unread !== null && !reading && glow === null && (
						<UnreadJump count={data.unreadCount} reveal={reveal} />
					)}
				</div>
				<Composer sent={sent} />
			</MessageScroller>
		)
	}
}

Room.attrs = { class: 'flex min-h-0 flex-1 flex-col' }

const ChatRoom: Stateful<PageArgs<Data>> = function* (args) {

	for (args of this) {

		const { data } = args

		if (!data) {
			yield null
			continue
		}

		const title = data.chat.name || data.participants.filter(p => p.id !== data.me).map(p => p.name).join(', ') || 'Chat'

		yield (
			<>
				<header class="flex items-center gap-4 border-b px-4 py-3">
					<ChatAvatar name={title} />
					<div class="min-w-0">
						<h2 class="truncate text-lg font-semibold text-foreground">
							{title}
						</h2>
						<p class="text-xs text-muted-foreground">
							{data.participants.length} participant{data.participants.length !== 1 ? 's' : ''}
						</p>
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
				</header>
				<Room key={data.chat.id} data={data} />
			</>
		)
	}
}

ChatRoom.attrs = { class: 'flex h-full min-h-0 min-w-0 flex-col' }

export default ChatRoom
