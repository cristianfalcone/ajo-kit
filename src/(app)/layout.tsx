import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { User, LayoutArgs, Action } from '@kit'
import { ThemeContext, UnreadContext } from '/src/contexts'
import { action } from '@kit/client'
import Button, { buttonVariants } from 'ajo-ui-playa/button'
import { Chip } from 'ajo-ui-playa/chip'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ajo-ui-playa/tooltip'
import { can } from '/src/abilities'

type LinkOptions = { exact?: boolean, include?: string[] }

const links: [string, string, string, LinkOptions?][] = [
	['/dashboard', 'Dashboard', 'i-lucide-layout-dashboard', { exact: true }],
]

const isActive = (path: string, url: string, options?: LinkOptions): boolean => {
	if (options?.exact ? url === path : url.startsWith(path)) return true
	if (options?.include?.some(path => url.startsWith(path))) return true
	return false
}

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
							{links.map(([path, label, icon, options]) => {
								const active = isActive(path, url, options)
								return (
									<a key={path} href={path as string} class={linkClass(active)} aria-current={active ? 'page' : undefined}>
										<span class={clsx(icon, 'size-4')} />
										{label}
									</a>
								)
							})}

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
							<form set:onsubmit={signout.submit} class="inline">
								<Tooltip delayDuration={500}>
									<TooltipTrigger
										type="submit"
										aria-label="Logout"
										disabled={signout.loading}
										data-variant="ghost"
										class={buttonVariants({ variant: 'ghost', size: 'icon' })}
									>
										<span class="i-lucide-log-out size-4" />
									</TooltipTrigger>
									<TooltipContent>Logout</TooltipContent>
								</Tooltip>
							</form>
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
