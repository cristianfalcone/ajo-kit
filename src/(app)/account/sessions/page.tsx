import type { Stateful } from 'ajo'
import { type PageArgs, formatDate } from '@kit'
import { action } from '@kit/client'

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
type RevokeAllResult = { revoked: number }

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

const Sessions: Stateful<PageArgs<Data>> = function* (args) {

	const revokeForm = action<RevokeResult>('revoke')
	const revokeAllForm = action<RevokeAllResult>('revokeAll')

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
						<form set:onsubmit={revokeAllForm.submit}>
							<button
								type="submit"
								disabled={revokeAllForm.loading}
								class="text-sm text-red-600 hover:text-red-500 dark:text-red-400"
							>
								{revokeAllForm.loading ? 'Revoking...' : 'Revoke All Other Sessions'}
							</button>
						</form>
					</div>
				)}

				<div class="space-y-4">
					{sessions.map(session => {
						const device = parse(session.agent)
						return (
							<div key={session.id} class="glass rounded-lg p-4 flex items-center justify-between">
								<div class="flex items-center gap-4">
									<div class="i-lucide-monitor w-8 h-8 text-slate-400" />
									<div>
										<div class="font-medium text-slate-900 dark:text-white">
											{device.browser} on {device.os}
											{session.current && (
												<span class="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded">
													Current
												</span>
											)}
										</div>
										<div class="text-sm text-slate-500 dark:text-slate-400">
											{session.ip ?? 'Unknown IP'} · Last active {formatDate(session.last ?? session.created, dateTime)}
										</div>
									</div>
								</div>

								{!session.current && (
									<form set:onsubmit={revokeForm.submit}>
										<input type="hidden" name="id" value={session.id} />
										<button
											type="submit"
											title="Revoke this session"
											disabled={revokeForm.loading}
											class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
										>
											<span class="i-lucide-x w-4 h-4 block" />
										</button>
									</form>
								)}
							</div>
						)
					})}
				</div>
			</div>
		)
	}
}

export default Sessions
