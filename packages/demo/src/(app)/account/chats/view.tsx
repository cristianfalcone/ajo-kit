import type { Stateless } from 'ajo'
import { locale } from '@kit'
import clsx from 'clsx'
import { Chip } from 'ajo-ui-playa/chip'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from 'ajo-ui-playa/empty'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from 'ajo-ui-playa/item'

export type ChatItem = {
	id: number
	name: string | null
	others: string | null
	last: string | null
	lastAt?: string | null
	created?: string | null
	unread: number | null
}

type AvatarArgs = {
	name: string
	class?: string
}

type ChatListArgs = {
	active?: number | null
	chats: ChatItem[]
	query?: string
}

const tones = [
	'bg-primary/15 text-primary',
	'bg-info/15 text-info',
	'bg-success/15 text-success',
	'bg-warning/15 text-warning',
	'bg-danger/15 text-danger',
]

const hash = (value: string) => {
	let total = 0
	for (let index = 0; index < value.length; index++) total += value.charCodeAt(index)
	return total
}

const parseDate = (value: string) => {
	const normalized = value.includes('T') ? value : value.replace(' ', 'T')
	const utc = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`
	const date = new Date(utc)

	return Number.isNaN(date.getTime()) ? null : date
}

const formatTime = (value?: string | null) => {

	if (!value) return ''

	const date = parseDate(value)

	if (!date) return ''

	const now = new Date()
	const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
	const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
	const days = Math.round((nowDay - dateDay) / 86_400_000)

	if (days === 0) return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)
	if (days === 1) return 'Yesterday'
	if (days < 7) return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)

	return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)
}

export const chatTitle = (chat: Pick<ChatItem, 'name' | 'others'>) =>
	chat.name || chat.others || 'Empty chat'

export const initials = (name: string) => {
	const parts = name.trim().split(/\s+/).filter(Boolean)
	const source = parts.length > 1 ? [parts[0], parts.at(-1)!] : [parts[0] ?? '?']

	return source.map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

export const ChatAvatar: Stateless<AvatarArgs> = ({ name, class: classes }) => (
	<span
		class={clsx(
			'flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
			tones[hash(name) % tones.length],
			classes
		)}
	>
		{initials(name)}
	</span>
)

export const ChatList: Stateless<ChatListArgs> = ({ active, chats, query = '' }) => {
	const needle = query.trim().toLowerCase()
	const visible = needle
		? chats.filter(chat => `${chatTitle(chat)} ${chat.last ?? ''}`.toLowerCase().includes(needle))
		: chats

	return (
		<div class="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
			{visible.map(chat => {
				const title = chatTitle(chat)
				const current = active === chat.id
				const unread = Number(chat.unread ?? 0)
				const time = formatTime(chat.lastAt ?? chat.created)

				return (
					<Item
						key={chat.id}
						as="a"
						href={`/account/chats/${chat.id}`}
						aria-current={current ? 'page' : undefined}
						data-active={current ? 'true' : undefined}
						size="sm"
						class="data-[active=true]:bg-primary/10 data-[active=true]:shadow-xs data-[active=true]:inset-ring data-[active=true]:inset-ring-primary/25 data-[active=true]:hover:bg-primary/10"
					>
						<ItemMedia>
							<ChatAvatar name={title} />
						</ItemMedia>
						<ItemContent class="min-w-0">
							<ItemTitle class="max-w-full">
								<span class="min-w-0 truncate font-semibold">
									{title}
								</span>
							</ItemTitle>
							<ItemDescription class="truncate">
								{chat.last || 'No messages yet'}
							</ItemDescription>
						</ItemContent>
						<ItemContent class="min-w-12 items-end">
							{time && (
								<time class="text-xs text-muted-foreground">
									{time}
								</time>
							)}
							{unread > 0 && (
								<Chip variant="default" class="h-5 min-w-5 px-1.5 font-semibold tabular-nums">
									{unread}
								</Chip>
							)}
						</ItemContent>
					</Item>
				)
			})}
			{visible.length === 0 && (
				<Empty class="py-12">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<span class="i-lucide-search-x size-6" />
						</EmptyMedia>
						<EmptyDescription>No conversations found</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</div>
	)
}
