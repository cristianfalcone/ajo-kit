import type { Props } from '@kit'
import { Stat } from '/src/ui'

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

export default function Overview({ data }: Props<Data>) {
	return (
		<div class="space-y-6">
			<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Overview</h2>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{stats.map(({ key, label, icon, href }) => (
					<Stat
						key={key}
						href={href}
						icon={icon}
						label={label}
						value={data?.stats[key] ?? 0}
					/>
				))}
			</div>
		</div>
	)
}
