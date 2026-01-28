import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import { action } from '/src/client'

type Chat = {
	id: number
	name: string | null
	others: string | null
	last: string | null
}

type User = { id: number; name: string }

type Data = {
	chats: Chat[]
	users: User[]
}

const Chats: Stateful<PageArgs<Data>> = function* (args) {

	const form = action<void>('start')

	let selected: number[] = []
	let groupName = ''

	const toggle = (id: number) => {
		this.next(() => {
			selected = selected.includes(id)
				? selected.filter(x => x !== id)
				: [...selected, id]
		})
	}

	while (true) {
		const { data, loading } = args

		yield (
			<section class="py-8 max-w-2xl mx-auto">
				<div class="flex items-center justify-between mb-6">
					<h1 class="text-2xl font-bold text-slate-900 dark:text-white">
						Chats
					</h1>
				</div>

				{loading ? (
					<p class="text-slate-600 dark:text-gray-300">Loading...</p>
				) : (
					<div class="space-y-6">

						{/* New chat form */}
						<form set:onsubmit={form.handle} class="rounded-xl ring-1 ring-slate-200/70 dark:ring-white/10 bg-white/60 dark:bg-white/5 backdrop-blur p-4">
							<p class="text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
								Start a conversation
							</p>

							<div class="flex flex-wrap gap-2 mb-3">
								{data?.users?.map(user => (
									<button
										key={user.id}
										type="button"
										set:onclick={() => toggle(user.id)}
										class={`px-3 py-1.5 text-sm rounded-full transition ${selected.includes(user.id)
											? 'bg-blue-500 text-white'
											: 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/20'
											}`}
									>
										{user.name}
									</button>
								))}
								{!data?.users?.length && (
									<p class="text-sm text-slate-500 dark:text-gray-400">No other users yet</p>
								)}
							</div>

							{selected.length > 1 && (
								<input
									type="text"
									name="name"
									placeholder="Group name (optional)"
									value={groupName}
									set:oninput={(e: Event) => this.next(() => { groupName = (e.target as HTMLInputElement).value })}
									class="w-full px-3 py-2 mb-3 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-400"
								/>
							)}

							<input type="hidden" name="users" value={JSON.stringify(selected)} />

							<button
								type="submit"
								disabled={!selected.length || form.loading}
								class="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{form.loading ? 'Starting...' : selected.length > 1 ? 'Create Group' : 'Start Chat'}
							</button>

							{form.error && (
								<p class="mt-2 text-sm text-red-500">{form.error.message}</p>
							)}
						</form>

						{/* Chats list */}
						<div class="space-y-2">
							{data?.chats?.map(chat => (
								<a
									key={chat.id}
									href={`/chats/${chat.id}`}
									class="block rounded-xl ring-1 ring-slate-200/70 dark:ring-white/10 bg-white/60 dark:bg-white/5 backdrop-blur p-4 hover:bg-white/80 dark:hover:bg-white/10 transition"
								>
									<div class="font-medium text-slate-900 dark:text-white">
										{chat.name || chat.others || 'Empty chat'}
									</div>
									{chat.last && (
										<p class="text-sm text-slate-500 dark:text-gray-400 truncate mt-1">
											{chat.last}
										</p>
									)}
								</a>
							))}
							{!data?.chats?.length && (
								<p class="text-center text-slate-500 dark:text-gray-400 py-8">
									No conversations yet
								</p>
							)}
						</div>
					</div>
				)}
			</section>
		)
	}
}

export default Chats
