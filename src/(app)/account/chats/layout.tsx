import type { Stateful } from 'ajo'
import type { Frame } from '@kit'
import { action } from '@kit/client'
import { Button, Feedback, Input, Panel } from '/src/ui'
import { ChatList, type ChatItem } from './view'

type User = { id: number; name: string }

type Data = {
	chats: ChatItem[]
	users: User[]
}

const ChatsLayout: Stateful<Frame<Data>> = function* (args) {

	const form = action<void>('start')

	let creating = false
	let query = ''
	let selected: number[] = []
	let groupName = ''

	const toggleUser = (id: number) => {
		this.next(() => {
			selected = selected.includes(id)
				? selected.filter(value => value !== id)
				: [...selected, id]
		})
	}

	for (args of this) {
		const { children, data, params } = args
		const chats = data?.chats ?? []
		const users = data?.users ?? []
		const selectedCount = selected.length
		const active = Number(params.id)

		yield (
			<section class="flex min-h-0 flex-1 flex-col gap-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 class="text-3xl font-bold text-slate-900 dark:text-white">
							Chats
						</h1>
						<p class="mt-1 text-slate-500 dark:text-slate-400">
							{chats.length} conversation{chats.length !== 1 ? 's' : ''}
						</p>
					</div>
					<Button
						type="button"
						height="lg"
						icon={creating ? 'i-lucide-x' : 'i-lucide-plus'}
						set:onclick={() => this.next(() => creating = !creating)}
					>
						{creating ? 'Close' : 'New chat'}
					</Button>
				</div>

				<Panel
					radius="xl"
					padding="none"
					clip
					class="grid min-h-0 flex-1 lg:grid-cols-[25rem_minmax(0,1fr)]"
				>
					<aside class="min-h-0 flex flex-col shadow-[inset_0_-1px_0_rgb(15_23_42_/_0.1)] lg:shadow-[inset_-1px_0_0_rgb(15_23_42_/_0.1)] dark:shadow-[inset_0_-1px_0_rgb(255_255_255_/_0.08)] lg:dark:shadow-[inset_-1px_0_0_rgb(255_255_255_/_0.08)]">
						<div class="space-y-3 p-4">
							<div class="relative">
								<span class="i-lucide-search pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
								<Input
									value={query}
									set:oninput={event => this.next(() => query = (event.target as HTMLInputElement).value)}
									placeholder="Search conversations"
									autocomplete="off"
									tone="default"
									class="pl-10"
								/>
							</div>

							{creating && (
								<form
									set:onsubmit={form.submit}
									class="rounded-xl bg-[#eef5f4]/65 p-4 shadow-xs shadow-slate-900/6 inset-ring inset-ring-slate-900/10 dark:bg-white/5 dark:shadow-none dark:inset-ring-white/10"
								>
									<input type="hidden" name="users" value={JSON.stringify(selected)} />

									<p class="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
										Start a conversation
									</p>

									<div class="mt-3 flex flex-wrap gap-2">
										{users.map(user => {
											const active = selected.includes(user.id)

											return (
												<Button
													key={user.id}
													type="button"
													tone={active ? 'primary' : 'neutral'}
													height="md"
													class="h-8 rounded-full px-3 text-xs"
													set:onclick={() => toggleUser(user.id)}
												>
													{user.name}
												</Button>
											)
										})}
									</div>

									{selectedCount > 1 && (
										<Input
											name="name"
											value={groupName}
											set:oninput={event => this.next(() => groupName = (event.target as HTMLInputElement).value)}
											placeholder="Group name (optional)"
											autocomplete="off"
											wrapper="mt-3"
										/>
									)}

									<div class="mt-3 flex items-center gap-3">
										<Button
											type="submit"
											disabled={!selectedCount || form.loading}
											wide
										>
											{selectedCount > 1 ? 'Create Group' : 'Start chat'}
										</Button>
									</div>

									{form.error && (
										<Feedback class="mt-3">
											{form.error.message}
										</Feedback>
									)}
								</form>
							)}
						</div>

						<ChatList active={Number.isInteger(active) ? active : null} chats={chats} query={query} />
					</aside>

					{children}
				</Panel>
			</section>
		)
	}
}

ChatsLayout.attrs = { class: 'flex h-[calc(100vh-7.5rem)] min-h-[34rem] flex-col' }

export default ChatsLayout
