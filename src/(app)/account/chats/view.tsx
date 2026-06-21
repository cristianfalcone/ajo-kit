import type { Stateless } from 'ajo'
import clsx from 'clsx'
import { CountBadge } from '/src/ui'

export type ChatItem = {
	id: number
	name: string | null
	others: string | null
	last: string | null
	lastAt?: string | null
	created?: string | null
	unread: number | null
}

type AvatarProps = {
	name: string
	class?: string
}

type ChatListProps = {
	active?: number | null
	chats: ChatItem[]
	query?: string
}

const tones = [
	'bg-emerald-100 text-emerald-700 dark:bg-lime-500/18 dark:text-lime-300',
	'bg-amber-100 text-amber-700 dark:bg-amber-500/18 dark:text-amber-300',
	'bg-sky-100 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
	'bg-violet-100 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300',
	'bg-rose-100 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300',
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

	if (days === 0) return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)
	if (days === 1) return 'Yesterday'
	if (days < 7) return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)

	return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

export const chatTitle = (chat: Pick<ChatItem, 'name' | 'others'>) =>
	chat.name || chat.others || 'Empty chat'

export const initials = (name: string) => {
	const parts = name.trim().split(/\s+/).filter(Boolean)
	const source = parts.length > 1 ? [parts[0], parts.at(-1)!] : [parts[0] ?? '?']

	return source.map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

export const ChatAvatar: Stateless<AvatarProps> = ({ name, class: classes }) => (
	<span
		class={clsx(
			'flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold',
			tones[hash(name) % tones.length],
			classes
		)}
	>
		{initials(name)}
	</span>
)

export const ChatList: Stateless<ChatListProps> = ({ active, chats, query = '' }) => {
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
					<a
						key={chat.id}
						href={`/account/chats/${chat.id}`}
						aria-current={current ? 'page' : undefined}
						class={clsx(
							'group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition',
							current
								? 'bg-accent/10 shadow-xs shadow-accent/10 inset-ring inset-ring-accent/35 dark:bg-accent/10 dark:shadow-none dark:inset-ring-accent/40'
								: 'hover:bg-[#dce8ec]/80 hover:shadow-xs hover:shadow-slate-900/8 hover:inset-ring hover:inset-ring-slate-900/8 dark:hover:bg-white/10 dark:hover:shadow-none dark:hover:inset-ring-white/10'
						)}
					>
						<ChatAvatar name={title} />
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-semibold text-slate-900 dark:text-white">
								{title}
							</span>
							<span class="mt-0.5 block truncate text-sm text-slate-500 dark:text-slate-400">
								{chat.last || 'No messages yet'}
							</span>
						</span>
						<span class="ml-auto flex min-w-12 shrink-0 flex-col items-end gap-2">
							{time && (
								<time class="text-xs text-slate-500 dark:text-slate-400">
									{time}
								</time>
							)}
							{unread > 0 && <CountBadge count={unread} class="bg-accent text-primary dark:text-primary" />}
						</span>
					</a>
				)
			})}
			{visible.length === 0 && (
				<p class="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
					No conversations found
				</p>
			)}
		</div>
	)
}
