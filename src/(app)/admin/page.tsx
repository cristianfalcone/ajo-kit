import type { PageArgs } from '@kit'
import { Card, CardContent } from '/src/ui'

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
		<div class="space-y-4">
			<h2 class="text-lg font-semibold text-foreground">Overview</h2>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{stats.map(({ key, label, icon, href }) => (
					<Card
						key={key}
						as="a"
						href={href}
						size="sm"
						class="transition-colors hover:bg-accent hover:text-accent-foreground"
					>
						<CardContent class="flex items-center gap-4">
							<div class="flex size-12 shrink-0 items-center justify-center rounded-lg inset-ring bg-primary/10 inset-ring-primary/25">
								<span class={`${icon} size-6 text-primary`} />
							</div>
							<div class="min-w-0">
								<p class="text-2xl font-semibold leading-tight tabular-nums text-card-foreground">{data?.stats[key] ?? 0}</p>
								<p class="truncate text-sm text-muted-foreground">{label}</p>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}
