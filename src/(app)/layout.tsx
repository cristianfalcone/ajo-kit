import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { User, LayoutArgs, ActionState } from '@kit'
import { ThemeContext, UnreadContext } from '/src/contexts'
import { action } from '@kit/client'

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

const Nav = ({ user, unread, signout }: { user: User, unread: number, signout: ActionState<void> }) => {

	const url = globalThis.location?.pathname ?? '/'

	const linkClass = (active: boolean) => clsx([
		'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
		active
			? 'bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white'
			: 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10'
	])

	return (
		<nav class="sticky top-0 z-40">
			<div class="backdrop-blur border-b shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08)] bg-white/80 supports-[backdrop-filter]:bg-white/60 border-slate-200 dark:supports-[backdrop-filter]:bg-black/40 dark:bg-black/70 dark:border-white/10 dark:shadow-[0_2px_4px_-2px_rgba(0,0,0,0.4)] transition-colors">
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

							{user.roles?.includes('admin') && (
								<a href="/admin" class={linkClass(url.startsWith('/admin'))}>
									<span class="i-lucide-shield w-4 h-4" />
									Admin
								</a>
							)}
						</div>

						{/* Right side */}
						<div class="ml-auto flex items-center gap-1">
							<ThemeToggle />
							<div class="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1" />
							<a href="/account/profile" class={linkClass(url.startsWith('/account'))}>
								<span class="i-lucide-settings w-4 h-4" />
								{user.name || user.email}
								{unread > 0 && (
									<span class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
										{unread}
									</span>
								)}
							</a>
							<form set:onsubmit={signout.submit} class="inline">
								<button
									type="submit"
									disabled={signout.loading}
									title="Logout"
									class={clsx([
										'flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors',
										signout.loading && 'opacity-50'
									])}
								>
									<span class="i-lucide-log-out w-4 h-4" />
								</button>
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

	return (
		<button
			aria-label="Change theme"
			class="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
			set:onclick={cycle}
		>
			{mode === 'system' && <span class="i-lucide-monitor w-4 h-4" />}
			{mode === 'light' && <span class="i-lucide-sun w-4 h-4" />}
			{mode === 'dark' && <span class="i-lucide-moon w-4 h-4" />}
		</button>
	)
}
