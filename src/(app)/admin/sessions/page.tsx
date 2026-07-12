import type { Stateful } from 'ajo'
import { type PageArgs, date } from '@kit'
import { action } from '@kit/client'
import { buttonVariants, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip, TooltipContent, TooltipTrigger } from '/src/ui'
import PageControls, { type PageInfo } from '../pagination'

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

type Data = { sessions: Session[]; page: PageInfo }
type FormResult = { revoked: boolean | number }

const dateTime = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const

function parseAgent(agent: string | null) {

	if (!agent) return 'Unknown'

	const browser = agent.includes('Chrome') ? 'Chrome' :
		agent.includes('Firefox') ? 'Firefox' :
		agent.includes('Safari') ? 'Safari' :
		agent.includes('Edge') ? 'Edge' : 'Unknown'

	const os = agent.includes('Windows') ? 'Windows' :
		agent.includes('Mac') ? 'macOS' :
		agent.includes('Linux') ? 'Linux' : ''

	return `${browser}${os ? ` / ${os}` : ''}`
}

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
										{parseAgent(session.agent)}
									</TableCell>
									<TableCell class="font-mono text-xs text-muted-foreground">
										{session.ip ?? '-'}
									</TableCell>
									<TableCell class="text-muted-foreground">
										{session.last ? date(session.last, dateTime) : date(session.created, dateTime)}
									</TableCell>
									<TableCell class="text-right">
										<div class="flex items-center justify-end gap-2">
											<form set:onsubmit={revokeForm.submit}>
												<input type="hidden" name="id" value={session.id} />
												<Tooltip delayDuration={500}>
													<TooltipTrigger
														type="submit"
														aria-label="Revoke this session"
														disabled={revokeForm.loading}
												class={buttonVariants({ variant: 'danger-ghost', size: 'icon-sm' })}
													>
														<span class="i-lucide-x size-4" />
													</TooltipTrigger>
													<TooltipContent>Revoke this session</TooltipContent>
												</Tooltip>
											</form>
											<form set:onsubmit={revokeUserForm.submit}>
												<input type="hidden" name="user" value={session.user} />
												<Tooltip delayDuration={500}>
													<TooltipTrigger
														type="submit"
														aria-label="Logout user from all sessions"
														disabled={revokeUserForm.loading}
														data-variant="ghost"
														class={buttonVariants({ variant: 'ghost', size: 'icon-sm', class: 'text-muted-foreground data-[variant=ghost]:hover:text-foreground' })}
													>
														<span class="i-lucide-log-out size-4" />
													</TooltipTrigger>
													<TooltipContent>Logout user from all sessions</TooltipContent>
												</Tooltip>
											</form>
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
