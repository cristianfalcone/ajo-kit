import type { Stateful } from 'ajo'
import { type Props, date } from '@kit'
import { action } from '@kit/client'
import { Button, Pager, Panel, Table, type Column } from '/src/ui'

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

type Info = Parameters<typeof Pager>[0]['page']
type Data = { sessions: Session[]; page: Info }
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

const Sessions: Stateful<Props<Data>> = function* (args) {

	const revokeForm = action<FormResult>('revoke')
	const revokeUserForm = action<FormResult>('revokeUser')

	for (args of this) {

		const sessions = args.data?.sessions ?? []
		const columns = [
			{
				header: 'User',
				cell: (session) => (
					<>
						<div class="font-medium text-slate-900 dark:text-white">{session.name}</div>
						<div class="text-slate-500 dark:text-slate-400 text-xs">{session.email}</div>
					</>
				),
			},
			{
				header: 'Device',
				tone: 'body',
				cell: (session) => parseAgent(session.agent),
			},
			{
				header: 'IP',
				tone: 'code',
				cell: (session) => session.ip ?? '-',
			},
			{
				header: 'Last Active',
				tone: 'muted',
				cell: (session) => session.last ? date(session.last, dateTime) : date(session.created, dateTime),
			},
			{
				header: 'Actions',
				align: 'right',
				cell: (session) => (
					<div class="flex items-center justify-end gap-1">
						<form set:onsubmit={revokeForm.submit}>
							<input type="hidden" name="id" value={session.id} />
							<Button
								type="submit"
								title="Revoke this session"
								disabled={revokeForm.loading}
								icon="i-lucide-x"
								tone="danger"
							/>
						</form>
						<form set:onsubmit={revokeUserForm.submit}>
							<input type="hidden" name="user" value={session.user} />
							<Button
								type="submit"
								title="Logout user from all sessions"
								disabled={revokeUserForm.loading}
								icon="i-lucide-log-out"
								tone="warning"
							/>
						</form>
					</div>
				),
			},
		] satisfies Column<Session>[]

		yield (
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Sessions</h2>
					<span class="text-sm text-slate-500 dark:text-slate-400">{sessions.length} shown</span>
				</div>

				<Panel padding="none" clip>
					<Table rows={sessions} columns={columns} getKey={session => session.id} />
					{args.data?.page && <Pager page={args.data.page} count={sessions.length} label="sessions" />}
				</Panel>
			</div>
		)
	}
}

export default Sessions
