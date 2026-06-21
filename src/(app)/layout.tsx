import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { User, Frame, Action } from '@kit'
import { ThemeContext, UnreadContext } from '/src/contexts'
import { action } from '@kit/client'
import { can } from '/src/abilities'
import { Button, CountBadge } from '/src/ui'

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

const AppLayout: Stateful<Frame<LayoutData>> = function* (args) {

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
		'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
		active
			? 'bg-[#e5edf1] text-slate-900 dark:bg-white/10 dark:text-white'
			: 'text-slate-600 hover:text-slate-900 hover:bg-[#e5edf1]/70 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10'
	])

	return (
		<nav class="sticky top-0 z-40">
			<div class="backdrop-blur-md bg-[#f8fbf9]/82 supports-[backdrop-filter]:bg-[#f8fbf9]/70 shadow-[0_1px_2px_rgb(15_23_42_/_0.05)] inset-shadow-[0_-1px_0_rgb(15_23_42_/_0.08)] dark:supports-[backdrop-filter]:bg-black/40 dark:bg-black/70 dark:shadow-[0_2px_4px_-2px_rgba(0,0,0,0.4)] dark:inset-shadow-[0_-1px_0_rgb(255_255_255_/_0.08)] transition-colors">
				<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div class="flex h-14 items-center">
						{/* Nav links */}
						<div class="flex items-center gap-1">
							{links.map(([path, label, icon, options]) => {
								const active = isActive(path, url, options)
								return (
									<a key={path} href={path as string} class={linkClass(active)} aria-current={active ? 'page' : undefined}>
										<span class={clsx(icon, 'w-4 h-4')} />
										{label}
									</a>
								)
							})}

							{can(user.abilities, 'admin:read') && (
								<a href="/admin" class={linkClass(url.startsWith('/admin'))}>
									<span class="i-lucide-shield w-4 h-4" />
									Admin
								</a>
							)}
						</div>

						{/* Right side */}
						<div class="ml-auto flex items-center gap-1">
							<ThemeToggle />
							<div class="w-px h-5 bg-slate-300/60 dark:bg-white/10 mx-1" />
							<a href="/account/profile" class={linkClass(url.startsWith('/account'))}>
								<span class="i-lucide-settings w-4 h-4" />
								{user.name || user.email}
								{unread > 0 && (
									<CountBadge count={unread} />
								)}
							</a>
							<form set:onsubmit={signout.submit} class="inline">
								<Button
									type="submit"
									disabled={signout.loading}
									title="Logout"
									icon="i-lucide-log-out"
								/>
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
			icon={icon}
			set:onclick={cycle}
		/>
	)
}
