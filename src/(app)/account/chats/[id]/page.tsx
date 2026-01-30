import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import { action, subscribe } from '/src/client'

type Message = {
	id: number
	text: string
	created: string
	userId: number
	userName: string
}

type Chat = { id: number; name: string | null }
type Participant = { id: number; name: string }

type Data = {
	chat: Chat
	participants: Participant[]
	messages: Message[]
	me: number
}

const ChatRoom: Stateful<PageArgs<Data>> = function* (args) {

	const form = action<{ ok: true }>('send')

	let messages = args.data?.messages ?? []
	let text = ''

	const box = { el: null as HTMLElement | null }

	const scroll = () => requestAnimationFrame(() => box.el?.scrollTo({ top: box.el.scrollHeight, behavior: 'smooth' }))

	if (!import.meta.env.SSR) queueMicrotask(scroll)

	// Subscribe to real-time updates
	subscribe<{ messages: Message[] }>('messages', ({ data, error }) => {
		if (error) return
		messages = data!.messages
		scroll()
	})

	const submit = (e: SubmitEvent) => {
		form.handle(e)
		this.next(() => { text = '' })
	}

	while (true) {

		const { data, loading } = args
		const title = data?.chat?.name || data?.participants?.filter(p => p.id !== data?.me).map(p => p.name).join(', ') || 'Chat'

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
				<div class="flex-1 min-h-0 rounded-xl glass overflow-hidden">
					<div ref={el => box.el = el} class="h-full overflow-y-auto p-4 space-y-3">
						{loading ? (
							<p class="text-slate-500 dark:text-gray-400">Loading messages...</p>
						) : messages.length === 0 ? (
							<p class="text-center text-slate-500 dark:text-gray-400 py-8">
								No messages yet. Start the conversation!
							</p>
						) : (
							messages.map(msg => (
								<div
									key={msg.id}
									class={`flex flex-col ${msg.userId === data?.me ? 'items-end' : 'items-start'}`}
								>
									{msg.userId !== data?.me && (
										<span class="text-xs text-slate-500 dark:text-gray-400 mb-1">
											{msg.userName}
										</span>
									)}
									<div
										class={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.userId === data?.me
											? 'bg-primary text-white dark:bg-accent dark:text-primary rounded-br-md'
											: 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white rounded-bl-md'
											}`}
									>
										{msg.text}
									</div>
									<span class="text-xs text-slate-400 dark:text-gray-500 mt-1">
										{new Date(msg.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
									</span>
								</div>
							))
						)}
					</div>
				</div>

				{/* Input */}
				<form set:onsubmit={submit} class="mt-4 flex gap-2">
					<input
						type="text"
						name="text"
						value={text}
						set:oninput={e => this.next(() => text = (e.target as HTMLInputElement).value)}
						placeholder="Type a message..."
						class="flex-1 input rounded-xl bg-slate-100 dark:bg-white/10"
						autocomplete="off"
					/>
					<button
						type="submit"
						disabled={!text.trim() || form.loading}
						class="btn px-6 py-3 rounded-xl disabled:cursor-not-allowed"
					>
						{form.loading ? '...' : 'Send'}
					</button>
				</form>
			</section>
		)
	}
}

export default ChatRoom
