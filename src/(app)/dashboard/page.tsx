import type { Stateful } from 'ajo'
import { type PageArgs, formatDate } from '@kit'

type Session = {
	id: string
	ip: string | null
	agent: string | null
	last: string
	created: string
	current: boolean
}

type Data = {
	user: {
		id: number
		name: string
		email: string
		verified: string | null
		created: string
		roles: string[]
	}
	stats: {
		sessions: number
		tokens: number
		chats: number
		unread: number
	}
	recentSessions: Session[]
}

function timeAgo(iso: string) {

	const diff = Date.now() - new Date(iso).getTime()
	const mins = Math.floor(diff / 60000)

	if (mins < 1) return 'Just now'
	if (mins < 60) return `${mins}m ago`

	const hours = Math.floor(mins / 60)

	if (hours < 24) return `${hours}h ago`

	const days = Math.floor(hours / 24)

	return `${days}d ago`
}

const Dashboard: Stateful<PageArgs<Data>> = function* (args) {

	for (args of this) {
		const data = args.data
		if (!data) {
			yield (
				<div class="py-8">
					<p class="text-slate-500 dark:text-slate-400">Loading...</p>
				</div>
			)
			continue
		}

		const { user, stats, recentSessions } = data
		const isAdmin = user.roles.includes('admin')

		yield (
			<div class="py-8 space-y-8">
				{/* Welcome + Account Info */}
				<div class="glass rounded-xl p-6">
					<div class="flex flex-col sm:flex-row sm:items-center gap-4">
						<div class="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 dark:bg-accent/15">
							<span class="i-lucide-user w-7 h-7 text-primary dark:text-accent" />
						</div>
						<div class="flex-1 min-w-0">
							<h1 class="text-xl font-bold text-slate-900 dark:text-white">
								Welcome back, {user.name || 'User'}
							</h1>
							<p class="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
							<div class="flex flex-wrap items-center gap-2 mt-2">
								{user.roles.map(role => (
									<span key={role} class={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
										role === 'admin'
											? 'bg-primary text-white dark:bg-accent dark:text-primary'
											: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
									}`}>
										{role}
									</span>
								))}
								{user.verified ? (
									<span class="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
										<span class="i-lucide-check-circle w-3.5 h-3.5" />
										Verified
									</span>
								) : (
									<span class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
										<span class="i-lucide-alert-circle w-3.5 h-3.5" />
										Unverified
									</span>
								)}
								<span class="text-xs text-slate-400 dark:text-slate-500">
									Member since {formatDate(user.created)}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Quick Stats */}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard icon="i-lucide-monitor" label="Active Sessions" value={stats.sessions} />
					<StatCard icon="i-lucide-key" label="API Tokens" value={stats.tokens} />
					<StatCard icon="i-lucide-message-circle" label="Chats" value={stats.chats} />
					<StatCard icon="i-lucide-mail" label="Unread Messages" value={stats.unread} accent={stats.unread > 0} />
				</div>

				{/* Recent Sessions */}
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Recent Sessions</h2>
						<a href="/account/sessions" class="text-sm text-accent hover:underline">View all</a>
					</div>
					<div class="glass ring-0 rounded-lg overflow-hidden">
						<table class="w-full text-sm">
							<thead>
								<tr>
									<th>Device</th>
									<th>IP</th>
									<th>Last Active</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-200 dark:divide-slate-700">
								{recentSessions.map(s => (
									<tr key={s.id}>
										<td class="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
											{parseAgent(s.agent)}
										</td>
										<td class="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
											{s.ip ?? '—'}
										</td>
										<td class="px-4 py-3 text-slate-500 dark:text-slate-400">
											{timeAgo(s.last)}
										</td>
										<td class="px-4 py-3">
											{s.current ? (
												<span class="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
													<span class="w-1.5 h-1.5 rounded-full bg-green-500" />
													Current
												</span>
											) : (
												<span class="text-xs text-slate-400 dark:text-slate-500">{s.id}</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Quick Actions */}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<ActionCard href="/account/tokens" icon="i-lucide-key" label="Manage Tokens" description="Create and revoke API tokens" />
					<ActionCard href="/account/chats" icon="i-lucide-message-circle" label="Open Chats" description="View your conversations" />
					<ActionCard href="/account/profile" icon="i-lucide-user-cog" label="Edit Profile" description="Update your account details" />
					{isAdmin && (
						<ActionCard href="/admin" icon="i-lucide-shield" label="Admin Panel" description="Manage users and roles" />
					)}
				</div>
			</div>
		)
	}
}

export default Dashboard

const StatCard = ({ icon, label, value, accent }: { icon: string; label: string; value: number; accent?: boolean }) => (
	<div class="glass rounded-lg p-5 flex items-center gap-4">
		<div class={`flex items-center justify-center w-10 h-10 rounded-lg ${accent ? 'bg-red-500/10 dark:bg-red-400/15' : 'bg-accent/10 dark:bg-accent/15'}`}>
			<span class={`${icon} w-5 h-5 ${accent ? 'text-red-500 dark:text-red-400' : 'text-accent'}`} />
		</div>
		<div>
			<p class={`text-2xl font-bold ${accent ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{value}</p>
			<p class="text-xs text-slate-500 dark:text-slate-400">{label}</p>
		</div>
	</div>
)

const ActionCard = ({ href, icon, label, description }: { href: string; icon: string; label: string; description: string }) => (
	<a href={href} class="glass rounded-lg p-4 hover:shadow-md transition group">
		<div class="flex items-center gap-3 mb-2">
			<span class={`${icon} w-5 h-5 text-accent`} />
			<span class="font-medium text-slate-900 dark:text-white group-hover:text-accent transition-colors">{label}</span>
		</div>
		<p class="text-xs text-slate-500 dark:text-slate-400">{description}</p>
	</a>
)

function parseAgent(agent: string | null): string {
	if (!agent) return 'Unknown device'
	const browser = agent.match(/(Chrome|Firefox|Safari|Edge|Opera)[/\s](\d+)/)?.[0]
		?? agent.match(/(Mobile|Tablet)/)?.[0]
		?? 'Browser'
	const os = agent.match(/(Windows|Mac OS X|Linux|Android|iOS|iPhone)[^;)]*/)?.[0] ?? ''
	return [browser, os].filter(Boolean).join(' on ')
}
