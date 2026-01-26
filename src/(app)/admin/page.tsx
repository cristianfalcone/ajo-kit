import type { PageArgs } from '/src/constants'

type Data = {
	stats: {
		users: number
		sessions: number
		tokens: number
	}
}

const stats = [
	{ key: 'users', label: 'Users', icon: 'i-lucide-users', href: '/admin/users' },
	{ key: 'sessions', label: 'Active Sessions', icon: 'i-lucide-monitor', href: '/admin/sessions' },
	{ key: 'tokens', label: 'API Tokens', icon: 'i-lucide-key', href: '/admin/tokens' },
] as const

export default function Overview({ data }: PageArgs<Data>) {
	return (
		<div class="space-y-6">
			<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Overview</h2>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{stats.map(({ key, label, icon, href }) => (
					<a
						key={key}
						href={href}
						class="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
					>
						<div class="flex items-center gap-4">
							<div class="p-3 bg-indigo-50 dark:bg-indigo-500/15 rounded-lg">
								<span class={`${icon} w-6 h-6 text-indigo-600 dark:text-indigo-400`} />
							</div>
							<div>
								<p class="text-2xl font-bold text-slate-900 dark:text-white">
									{data?.stats[key] ?? 0}
								</p>
								<p class="text-sm text-slate-500 dark:text-slate-400">{label}</p>
							</div>
						</div>
					</a>
				))}
			</div>
		</div>
	)
}
