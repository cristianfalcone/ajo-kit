import type { Stateful } from 'ajo'
import { type PageArgs, date } from 'ajo-kit'
import { action } from 'ajo-kit/client'
import { Card } from 'ajo-ui-playa/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ajo-ui-playa/table'
import { agent, IconAction } from '/src/view'
import type { Info } from '/src/data/pagination'
import PageControls from '../pagination'

type Session = {
	id: string
	user: number
	ip: string | null
	agent: string | null
	last: string | null
	created: string
	expiry: string
	name: string
	email: string
}

type Data = { sessions: Session[]; page: Info }
type FormResult = { revoked: boolean | number }

const dateTime = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const

const Sessions: Stateful<PageArgs<Data>> = function* (args) {

	const revokeForm = action<FormResult>('revoke')
	const revokeUserForm = action<FormResult>('revokeUser')

	for (args of this) {

		const sessions = args.data?.sessions ?? []

		yield (
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-foreground">Sessions</h2>
					<span class="text-sm text-muted-foreground tabular-nums">{sessions.length} shown</span>
				</div>

				<Card class="overflow-hidden py-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Device</TableHead>
								<TableHead>IP</TableHead>
								<TableHead>Last Active</TableHead>
								<TableHead class="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sessions.map(session => (
								<TableRow key={session.id}>
									<TableCell>
										<div class="font-medium">{session.name}</div>
										<div class="text-muted-foreground text-xs">{session.email}</div>
									</TableCell>
									<TableCell class="text-muted-foreground">
										{agent(session.agent)}
									</TableCell>
									<TableCell class="font-mono text-xs text-muted-foreground">
										{session.ip ?? '-'}
									</TableCell>
									<TableCell class="text-muted-foreground">
										{session.last ? date(session.last, dateTime) : date(session.created, dateTime)}
									</TableCell>
									<TableCell class="text-right">
										<div class="flex items-center justify-end gap-2">
											<IconAction action={revokeForm} name="id" value={session.id} label="Revoke this session" icon="i-lucide-x" />
											<IconAction
												action={revokeUserForm}
												name="user"
												value={session.user}
												label="Logout user from all sessions"
												icon="i-lucide-log-out"
												variant="ghost"
												class="text-muted-foreground data-[variant=ghost]:hover:text-foreground"
											/>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{args.data?.page && <PageControls page={args.data.page} count={sessions.length} label="sessions" />}
				</Card>
			</div>
		)
	}
}

export default Sessions
