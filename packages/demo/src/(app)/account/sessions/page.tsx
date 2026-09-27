import type { Stateful } from 'ajo'
import { type PageArgs, date } from 'ajo-kit'
import { action } from 'ajo-kit/client'
import { Chip } from 'ajo-ui-playa/chip'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from 'ajo-ui-playa/item'
import { agent, IconAction } from '/src/view'

type Session = {
	id: string
	ip: string | null
	agent: string | null
	last: string | null
	created: string
	current: boolean
}

type Data = { sessions: Session[] }
type RevokeResult = { revoked: boolean }
type Purge = { revoked: number }

const dateTime = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const

const Sessions: Stateful<PageArgs<Data>> = function* (args) {

	const revokeForm = action<RevokeResult>('revoke')
	const purge = action<Purge>('purge')

	for (args of this) {
		const sessions = args.data?.sessions ?? []

		yield (
			<div class="space-y-8">
				<div class="space-y-2">
					<h1 class="text-2xl font-semibold tracking-tight">
						Browser Sessions
					</h1>
					<p class="text-sm text-muted-foreground">
						Manage and revoke your active sessions across devices.
					</p>
				</div>

				<div class="space-y-4">
					{sessions.length > 1 && (
						<div class="flex justify-end">
							<form set:onsubmit={purge.submit}>
								<button
									type="submit"
									disabled={purge.loading}
									class="text-sm text-danger hover:underline"
								>
									{purge.loading ? 'Revoking...' : 'Revoke All Other Sessions'}
								</button>
							</form>
						</div>
					)}

					<ItemGroup class="gap-4">
						{sessions.map(session => (
							<Item key={session.id} variant="outline">
								<ItemMedia>
									<div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 inset-ring inset-ring-primary/25">
										<span class="i-lucide-monitor size-5 text-gold-text" />
									</div>
								</ItemMedia>
								<ItemContent class="min-w-0">
									<ItemTitle>
										{agent(session.agent)}
										{session.current && (
											<Chip variant="success">
												Current
											</Chip>
										)}
									</ItemTitle>
									<ItemDescription class="truncate">
										{session.ip ?? 'Unknown IP'} · Last active {date(session.last ?? session.created, dateTime)}
									</ItemDescription>
								</ItemContent>

								{!session.current && (
									<ItemActions>
										<IconAction action={revokeForm} name="id" value={session.id} label="Revoke this session" icon="i-lucide-x" />
									</ItemActions>
								)}
							</Item>
						))}
					</ItemGroup>
				</div>
			</div>
		)
	}
}

export default Sessions
