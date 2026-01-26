import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { User, LayoutArgs, ActionState } from '/src/constants'
import { ThemeContext } from '/src/constants'
import { action } from '/src/app'

type LinkOptions = { exact?: boolean, include?: string[] }

const links: [string, string, LinkOptions?][] = [
	['/dashboard', 'Dashboard', { exact: true }],
]

const isActive = (path: string, url: string, options?: LinkOptions): boolean => {
	if (options?.exact ? url === path : url.startsWith(path)) return true
	if (options?.include?.some(path => url.startsWith(path))) return true
	return false
}

const AppLayout: Stateful<LayoutArgs<{ user: User }>> = function* (args) {

	const signout = action<void>('signout')

	while (true) {
		yield (
			<>
				<Nav user={args.data!.user} signout={signout} />
				<main class="site-container flex-1 flex flex-col">
					{args.children}
				</main>
				<Footer />
			</>
		)
	}
}

AppLayout.attrs = { class: 'flex-1 flex flex-col' }

export default AppLayout

const Nav = ({ user, signout }: { user: User, signout: ActionState<void> }) => {

	const url = globalThis.location?.pathname ?? '/'

	const linkClass = (active: boolean) => clsx([
		'px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60',
		active
			? 'bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white'
			: 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10'
	])

	return (
		<nav class="sticky top-0 z-40" memo={[url, user.id, signout.loading].join(':')}>
			<div class="backdrop-blur border-b shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08)] bg-white/80 supports-[backdrop-filter]:bg-white/60 border-slate-200 dark:supports-[backdrop-filter]:bg-black/40 dark:bg-black/70 dark:border-white/10 dark:shadow-[0_2px_4px_-2px_rgba(0,0,0,0.4)] transition-colors">
				<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div class="flex h-14 items-center justify-between">
						<a href="/dashboard" class="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 rounded-sm">
							<span class="font-semibold tracking-tight text-sm text-slate-900 dark:text-white">ajo<span class="text-indigo-600 dark:text-indigo-400">‑kit</span></span>
						</a>
						<div class="flex items-center gap-1">
							{links.map(([path, label, options]) => {
								const active = isActive(path, url, options)
								return (
									<a key={path} href={path as string} class={linkClass(active)} aria-current={active ? 'page' : undefined}>
										{label}
									</a>
								)
							})}

							<span class="mx-2 h-4 w-px bg-slate-300 dark:bg-white/20" />

							<span class="text-xs text-slate-600 dark:text-gray-300 px-2">
								{user.name || user.email}
							</span>
							<form set:onsubmit={signout.handle} class="inline">
								<button
									type="submit"
									disabled={signout.loading}
									class={clsx([linkClass(false), signout.loading && 'opacity-50'])}
								>
									{signout.loading ? 'Signing out...' : 'Logout'}
								</button>
							</form>
						</div>
					</div>
				</div>
			</div>
		</nav>
	)
}

const Footer = () => {

	const year = new Date().getFullYear()

	const { mode, cycle } = ThemeContext()

	return (
		<footer class="relative z-10 mt-12 border-t border-slate-200/70 dark:border-white/10 bg-slate-50/60 backdrop-blur dark:bg-transparent transition-colors">
			<div class="site-container py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-gray-400">
				<div class="flex items-center gap-2 font-medium tracking-wide">
					<span class="inline-flex items-center justify-center h-6 w-6 rounded-md bg-indigo-500/10 dark:bg-indigo-500/15 text-pink-500 dark:text-pink-300 text-sm">♥</span>
					<span class="text-slate-700/90 dark:text-gray-300/90">Made with <span class="text-pink-500 dark:text-pink-400">love</span> · <span class="text-indigo-600 dark:text-indigo-300">ajo‑kit</span></span>
				</div>
				<div class="flex items-center gap-4">
					<div class="opacity-60 text-slate-500 dark:text-gray-400">© {year} All rights reserved.</div>
					<button
						aria-label="Change theme"
						class="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium ring-1 ring-slate-300/70 dark:ring-white/15 bg-white/70 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-200 transition"
						set:onclick={cycle}
					>
						{mode === 'system' && <span class="i-lucide-monitor w-4 h-4" />}
						{mode === 'light' && <span class="i-lucide-sun w-4 h-4" />}
						{mode === 'dark' && <span class="i-lucide-moon w-4 h-4" />}
						<span class="hidden sm:inline select-none">{mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}</span>
					</button>
				</div>
			</div>
		</footer>
	)
}
