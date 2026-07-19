import type { Stateful } from 'ajo'
import type { LayoutArgs } from '@kit'
import { action } from '@kit/client'
import Button from 'ajo-ui-playa/button'
import { Card } from 'ajo-ui-playa/card'
import { FieldError } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'
import { ChatList, type ChatItem } from './view'

type User = { id: number; name: string }

type Data = {
	chats: ChatItem[]
	users: User[]
}

const ChatsLayout: Stateful<LayoutArgs<Data>> = function* (args) {

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
			<section class="flex min-h-0 flex-1 flex-col gap-4">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div class="space-y-2">
						<h1 class="text-2xl font-semibold tracking-tight">
							Chats
						</h1>
						<p class="text-sm text-muted-foreground">
							{chats.length} conversation{chats.length !== 1 ? 's' : ''}
						</p>
					</div>
					<Button
						type="button"
						size="lg"
						set:onclick={() => this.next(() => creating = !creating)}
					>
						<span class={`${creating ? 'i-lucide-x' : 'i-lucide-plus'} size-4`} />
						{creating ? 'Close' : 'New chat'}
					</Button>
				</div>

				<Card class="min-h-0 flex-1 py-0">
					<div class="grid min-h-0 flex-1 lg:grid-cols-[25rem_minmax(0,1fr)]">
						<aside class="min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r">
							<div class="space-y-4 p-4">
								<div class="relative">
									<span class="i-lucide-search pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										value={query}
										set:oninput={event => this.next(() => query = (event.target as HTMLInputElement).value)}
										placeholder="Search conversations"
										aria-label="Search conversations"
										autocomplete="off"
										class="pl-10"
									/>
								</div>

								{creating && (
									<form
										set:onsubmit={form.submit}
										class="rounded-xl glass edge p-4 shadow-xs"
									>
										<input type="hidden" name="users" value={JSON.stringify(selected)} />

										<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
											Start a conversation
										</p>

										<div class="mt-3 flex flex-wrap gap-2">
											{users.map(user => {
												const active = selected.includes(user.id)

												return (
													<Button
														key={user.id}
														type="button"
														variant={active ? 'default' : 'outline'}
														// size:none — the pill owns its geometry so rounded-full
														// actually renders (the sm recipe's rounded-md beat it).
														size="none"
														aria-pressed={active ? 'true' : 'false'}
														class="h-8 rounded-full px-3 text-xs"
														set:onclick={() => toggleUser(user.id)}
													>
														{user.name}
													</Button>
												)
											})}
										</div>

										{selectedCount > 1 && (
											<div class="mt-3">
												<Input
													name="name"
													value={groupName}
													set:oninput={event => this.next(() => groupName = (event.target as HTMLInputElement).value)}
													placeholder="Group name (optional)"
													aria-label="Group name"
													autocomplete="off"
												/>
											</div>
										)}

										<div class="mt-3 flex items-center gap-3">
											<Button
												type="submit"
												disabled={!selectedCount || form.loading}
												class="w-full"
											>
												{selectedCount > 1 ? 'Create Group' : 'Start chat'}
											</Button>
										</div>

										{form.error && (
											<FieldError class="mt-3">
												{form.error.message}
											</FieldError>
										)}
									</form>
								)}
							</div>

							<ChatList active={Number.isInteger(active) ? active : null} chats={chats} query={query} />
						</aside>

						{children}
					</div>
				</Card>
			</section>
		)
	}
}

ChatsLayout.attrs = { class: 'flex h-[calc(100vh-7.5rem)] min-h-[34rem] flex-col' }

export default ChatsLayout
