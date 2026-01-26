import type { Stateful } from 'ajo'
import { type PageArgs, navigate } from '/src/constants'
import { action, invalidate } from '/src/app'

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

type Data = { sessions: Session[] }
type RevokeResult = { revoked: boolean | number }

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString(undefined, {
		month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
	})
}

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
	const revokeForm = action<RevokeResult>('revoke')
	const revokeUserForm = action<RevokeResult>('revokeUser')

	while (true) {
		if (revokeForm.data?.revoked || revokeUserForm.data?.revoked) {
			invalidate('sessions')
			navigate('/admin/sessions')
			return
		}

		const sessions = args.data?.sessions ?? []

		yield (
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Sessions</h2>
					<span class="text-sm text-slate-500 dark:text-slate-400">{sessions.length} active</span>
				</div>

				<div class="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
					<table class="w-full text-sm">
						<thead class="bg-slate-50 dark:bg-slate-700/50">
							<tr>
								<th class="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">User</th>
								<th class="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Device</th>
								<th class="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">IP</th>
								<th class="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Last Active</th>
								<th class="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200 dark:divide-slate-700">
							{sessions.map(session => (
								<tr key={session.id} class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
									<td class="px-4 py-3">
										<div class="font-medium text-slate-900 dark:text-white">{session.name}</div>
										<div class="text-slate-500 dark:text-slate-400 text-xs">{session.email}</div>
									</td>
									<td class="px-4 py-3 text-slate-600 dark:text-slate-300">
										{parseAgent(session.agent)}
									</td>
									<td class="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
										{session.ip ?? '-'}
									</td>
									<td class="px-4 py-3 text-slate-500 dark:text-slate-400">
										{session.last ? formatDate(session.last) : formatDate(session.created)}
									</td>
									<td class="px-4 py-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<form set:onsubmit={revokeForm.handle}>
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
											<form set:onsubmit={revokeUserForm.handle}>
												<input type="hidden" name="user" value={session.user} />
												<button
													type="submit"
													title="Logout user from all sessions"
													disabled={revokeUserForm.loading}
													class="p-1.5 rounded hover:bg-orange-50 dark:hover:bg-orange-500/10 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors disabled:opacity-50"
												>
													<span class="i-lucide-log-out w-4 h-4 block" />
												</button>
											</form>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		)
	}
}

export default Sessions
