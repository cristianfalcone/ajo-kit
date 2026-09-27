import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { User, LayoutArgs, Action } from 'ajo-kit'
import { ThemeContext, UnreadContext } from '/src/contexts'
import { action } from 'ajo-kit/client'
import { Button } from 'ajo-ui-playa/button'
import { Chip } from 'ajo-ui-playa/chip'
import { can } from '/src/abilities'
import { IconAction } from '/src/view'

type LayoutData = { user: User; unread: number }

const AppLayout: Stateful<LayoutArgs<LayoutData>> = function* (args) {

	const signout = action<void>('signout')

	for (args of this) {

		const user = args.data?.user
		const unread = args.data?.unread ?? 0

		UnreadContext(unread)

		yield (
			<>
				{user && <Nav user={user} unread={unread} signout={signout} />}
				<main class="site-container flex-1 flex flex-col">
					{args.children}
				</main>
			</>
		)
	}
}

AppLayout.attrs = { class: 'flex-1 flex flex-col' }

export default AppLayout

const Nav = ({ user, unread, signout }: { user: User, unread: number, signout: Action<void> }) => {

	const url = globalThis.location?.pathname ?? '/'

	const linkClass = (active: boolean) => clsx([
		'flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
		active
			? 'bg-accent text-accent-foreground'
			: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
	])

	return (
		<nav class="sticky top-0 z-40">
			<div class="glass border-b shadow-xs transition-colors">
				<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div class="flex h-14 items-center">
						{/* Nav links */}
						<div class="flex items-center gap-2">
							<a href="/dashboard" class={linkClass(url === '/dashboard')} aria-current={url === '/dashboard' ? 'page' : undefined}>
								<span class="i-lucide-layout-dashboard size-4" />
								Dashboard
							</a>

							{can(user.abilities, 'admin:read') && (
								<a href="/admin" class={linkClass(url.startsWith('/admin'))}>
									<span class="i-lucide-shield size-4" />
									Admin
								</a>
							)}
						</div>

						{/* Right side */}
						<div class="ml-auto flex items-center gap-2">
							<ThemeToggle />
							<div class="h-5 w-px bg-border" />
							<a href="/account/profile" class={linkClass(url.startsWith('/account'))}>
								<span class="i-lucide-settings size-4" />
								{user.name || user.email}
								{unread > 0 && (
									<Chip variant="danger" class="h-5 min-w-5 px-1.5 font-semibold tabular-nums">
										{unread}
									</Chip>
								)}
							</a>
							<IconAction action={signout} label="Logout" icon="i-lucide-log-out" variant="ghost" size="icon" />
						</div>
					</div>
				</div>
			</div>
		</nav>
	)
}

const ThemeToggle = () => {

	const { mode, cycle } = ThemeContext()
	const icon = mode === 'system'
		? 'i-lucide-monitor'
		: mode === 'light'
			? 'i-lucide-sun'
			: 'i-lucide-moon'

	return (
		<Button
			aria-label="Change theme"
			variant="ghost"
			size="icon"
			set:onclick={cycle}
		>
			<span class={`${icon} size-4`} />
		</Button>
	)
}
