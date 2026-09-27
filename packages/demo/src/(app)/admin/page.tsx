import type { PageArgs } from 'ajo-kit'
import { Stat } from '/src/view'

type Data = {
	stats: {
		users: number
		sessions: number
		tokens: number
	}
}

export default function Overview({ data }: PageArgs<Data>) {
	return (
		<div class="space-y-4">
			<h2 class="text-lg font-semibold text-foreground">Overview</h2>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Stat icon="i-lucide-users" label="Users" value={data?.stats.users ?? 0} href="/admin/users" />
				<Stat icon="i-lucide-monitor" label="Active Sessions" value={data?.stats.sessions ?? 0} href="/admin/sessions" />
				<Stat icon="i-lucide-key" label="API Tokens" value={data?.stats.tokens ?? 0} href="/admin/tokens" />
			</div>
		</div>
	)
}
