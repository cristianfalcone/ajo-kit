import type { Stateful } from 'ajo'
import { type Props, date } from '@kit'
import { action } from '@kit/client'
import { Badge, Button, Panel } from '/src/ui'

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

function parse(agent: string | null) {

	if (!agent) return { browser: 'Unknown', os: 'Unknown' }

	const browser = agent.includes('Chrome') ? 'Chrome' :
		agent.includes('Firefox') ? 'Firefox' :
		agent.includes('Safari') ? 'Safari' :
		agent.includes('Edge') ? 'Edge' : 'Unknown'

	const os = agent.includes('Windows') ? 'Windows' :
		agent.includes('Mac') ? 'macOS' :
		agent.includes('Linux') ? 'Linux' :
		agent.includes('Android') ? 'Android' :
		agent.includes('iOS') ? 'iOS' : 'Unknown'

	return { browser, os }
}

const dateTime = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const

const Sessions: Stateful<Props<Data>> = function* (args) {

	const revokeForm = action<RevokeResult>('revoke')
	const purge = action<Purge>('purge')

	for (args of this) {
		const sessions = args.data?.sessions ?? []

		yield (
			<div class="space-y-8">
				<div>
					<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
						Browser Sessions
					</h1>
					<p class="text-sm text-slate-600 dark:text-slate-400">
						Manage and revoke your active sessions across devices.
					</p>
				</div>

				{sessions.length > 1 && (
					<div class="flex justify-end">
						<form set:onsubmit={purge.submit}>
							<button
								type="submit"
								disabled={purge.loading}
								class="text-sm text-red-600 hover:text-red-500 dark:text-red-400"
							>
								{purge.loading ? 'Revoking...' : 'Revoke All Other Sessions'}
							</button>
						</form>
					</div>
				)}

				<div class="space-y-4">
					{sessions.map(session => {
						const device = parse(session.agent)
						return (
							<Panel key={session.id} padding="sm" class="flex items-center justify-between">
								<div class="flex items-center gap-4">
									<div class="i-lucide-monitor w-8 h-8 text-slate-400" />
									<div>
										<div class="font-medium text-slate-900 dark:text-white">
											{device.browser} on {device.os}
											{session.current && (
												<Badge tone="success" class="ml-2">
													Current
												</Badge>
											)}
										</div>
										<div class="text-sm text-slate-500 dark:text-slate-400">
											{session.ip ?? 'Unknown IP'} · Last active {date(session.last ?? session.created, dateTime)}
										</div>
									</div>
								</div>

								{!session.current && (
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
								)}
							</Panel>
						)
					})}
				</div>
			</div>
		)
	}
}

export default Sessions
