import type { Stateful } from 'ajo'
import { type PageArgs, date } from 'ajo-kit'
import { Card, CardContent } from 'ajo-ui-playa/card'
import { Chip } from 'ajo-ui-playa/chip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ajo-ui-playa/table'
import { can } from '/src/abilities'
import { agent, ago, Stat } from '/src/view'

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
		abilities?: string[]
	}
	stats: {
		sessions: number
		tokens: number
		chats: number
		unread: number
	}
	recentSessions: Session[]
}

const Dashboard: Stateful<PageArgs<Data>> = function* (args) {

	for (args of this) {
		const data = args.data
		if (!data) {
			yield (
				<div class="py-8">
					<p class="text-muted-foreground">Loading...</p>
				</div>
			)
			continue
		}

		const { user, stats, recentSessions } = data
		const isAdmin = can(user.abilities, 'admin:read')

		yield (
			<div class="py-8 space-y-8">
				{/* Welcome + Account Info */}
				<Card>
					<CardContent class="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div class="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 inset-ring inset-ring-primary/25">
							<span class="i-lucide-user size-7 text-primary" />
						</div>
						<div class="min-w-0 flex-1 space-y-1">
							<h1 class="text-2xl font-semibold tracking-tight">
								Welcome back, {user.name || 'User'}
							</h1>
							<p class="truncate text-sm text-muted-foreground">{user.email}</p>
							<div class="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
								{user.roles.map(role => (
									<Chip key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
										{role}
									</Chip>
								))}
								{user.verified ? (
									<span class="inline-flex items-center gap-1 text-xs text-success">
										<span class="i-lucide-check-circle size-3.5" />
										Verified
									</span>
								) : (
									<a href="/verify" class="inline-flex items-center gap-1 text-xs text-warning hover:underline hover:underline-offset-2">
										<span class="i-lucide-alert-circle size-3.5" />
										Unverified
									</a>
								)}
								<span class="text-xs text-muted-foreground">
									Member since {date(user.created)}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Quick Stats */}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<Stat icon="i-lucide-monitor" label="Active Sessions" value={stats.sessions} />
					<Stat icon="i-lucide-key" label="API Tokens" value={stats.tokens} />
					<Stat icon="i-lucide-message-circle" label="Chats" value={stats.chats} />
					<Stat icon="i-lucide-mail" label="Unread Messages" value={stats.unread} tone={stats.unread > 0 ? 'danger' : 'accent'} />
				</div>

				{/* Recent Sessions */}
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold text-foreground">Recent Sessions</h2>
						<a href="/account/sessions" class="text-sm text-primary hover:underline">View all</a>
					</div>
					<Card class="overflow-hidden py-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Device</TableHead>
									<TableHead>IP</TableHead>
									<TableHead>Last Active</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recentSessions.map(session => (
									<TableRow key={session.id}>
										<TableCell class="max-w-[200px] truncate">
											{agent(session.agent)}
										</TableCell>
										<TableCell class="font-mono text-xs text-muted-foreground">
											{session.ip ?? '-'}
										</TableCell>
										<TableCell class="text-muted-foreground">
											{ago(session.last)}
										</TableCell>
										<TableCell>
											{session.current ? (
												<Chip variant="success">Current</Chip>
											) : (
												<Chip variant="secondary">Active</Chip>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</Card>
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

const ActionCard = ({ href, icon, label, description }: { href: string; icon: string; label: string; description: string }) => (
	<Card as="a" href={href} size="sm" class="transition-colors hover:bg-accent hover:text-accent-foreground">
		<CardContent class="flex items-center gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 inset-ring inset-ring-primary/25">
				<span class={`${icon} size-5 text-primary`} />
			</span>
			<span class="min-w-0">
				<span class="block text-sm font-medium">{label}</span>
				<span class="block truncate text-xs text-muted-foreground">{description}</span>
			</span>
		</CardContent>
	</Card>
)
