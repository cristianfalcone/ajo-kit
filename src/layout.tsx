import clsx from 'clsx'
import type { Children, Stateful } from 'ajo'
import { NotFoundError } from '/src/app'
import { ThemeContext, ThemeMode } from '/src/constants'

const isDev = import.meta.env.DEV

type Args = {
	children: Children,
}

const Layout: Stateful<Args> = function* (args: Args) {

	let mode: ThemeMode = globalThis.localStorage?.getItem('theme.v1') as ThemeMode ?? 'system'

	const apply = (mode: ThemeMode) => {

		const root = globalThis.document?.documentElement

		if (!root) return

		const system = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches

		root.classList.toggle('dark', mode === 'dark' || (mode === 'system' && system))
	}

	const store = (mode: ThemeMode) => { try { globalThis.localStorage?.setItem('theme.v1', mode) } catch { } }

	const set = (next: ThemeMode) => this.next(() => {

		mode = next

		store(mode)

		apply(mode)
	})

	const cycle = () => set(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system')

	apply(mode)

	globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (mode === 'system') apply('system')
	})

	while (true) try {

		ThemeContext({ mode, set, cycle })

		yield <Wrapper>{args.children}</Wrapper>

	} catch (error: unknown) {

		yield (
			<Wrapper>
				<AppError error={error instanceof Error ? error : new Error('An unknown error occurred')} />
			</Wrapper>
		)
	}
}

Layout.attrs = { class: 'min-h-screen flex flex-col bg-white text-slate-800 relative dark:bg-[#0a0f1c] dark:text-gray-100 transition-colors duration-300' }

export default Layout

const Wrapper = (args: Args) => (
	<>
		<div class="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_30%,rgba(99,102,241,.15),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(236,72,153,.12),transparent_55%)]" />
		<div class="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)]; [background-size:40px_40px]" />
		<Nav />
		<main class="flex-1 site-container">
			{args.children}
		</main>
		<Footer />
	</>
)

const AppError = ({ error }: { error: Error }) => {

	const isNotFound = error instanceof NotFoundError

	return (
		<div class="mx-auto px-4 py-12 sm:px-6 lg:px-8">
			<div class="mx-auto max-w-5xl">
				<div class="rounded-md bg-red-50 p-4 overflow-x-auto">
					<div class="flex">
						<div class={clsx(['flex-shrink-0', isNotFound ? 'text-yellow-400' : 'text-red-400'])}>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
								{isNotFound ? (
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
								) : (
									<path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
								)}
							</svg>
						</div>
						<div class="ml-3">
							<h3 class={clsx(['text-sm font-medium', isNotFound ? 'text-yellow-800' : 'text-red-800'])}>
								{isNotFound ? 'Page Not Found' : 'Something Unexpected Happened'}
							</h3>
							<div class={clsx(['mt-2 text-sm', isNotFound ? 'text-yellow-700' : 'text-red-700'])}>
								{isNotFound ? (
									<>
										<p>Sorry, we couldn't find the page you're looking for.</p>
									</>
								) : (
									<pre>
										{isDev ? error.stack ?? error.message : 'Application Error'}
									</pre>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

const links: [string, string, boolean?][] = [
	['/', 'Home', true],
	['/about', 'About'],
	['/blog', 'Blog'],
	['/products', 'Shop'],
]

const isActive = (path: string, url: string, exact?: boolean): boolean => exact ? url === path : url.startsWith(path)

const Nav = () => {

	const url = location.pathname

	return (
		<nav class="sticky top-0 z-40" memo={url}>
			<div class="backdrop-blur border-b shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08)] bg-white/80 supports-[backdrop-filter]:bg-white/60 border-slate-200 dark:supports-[backdrop-filter]:bg-black/40 dark:bg-black/70 dark:border-white/10 dark:shadow-[0_2px_4px_-2px_rgba(0,0,0,0.4)] transition-colors">
				<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div class="flex h-14 items-center justify-between">
						<a href="/" class="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 rounded-sm">
							<span class="font-semibold tracking-tight text-sm text-slate-900 dark:text-white">ajo<span class="text-indigo-600 dark:text-indigo-400">‑kit</span></span>
						</a>
						<div class="flex items-center gap-1">
							{links.map(([path, label, exact]) => {
								const active = isActive(path, url, exact)
								return (
									<a
										key={path}
										href={path as string}
										class={clsx([
											'px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60',
											active
												? 'bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white'
												: 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10'
										])}
										aria-current={active ? 'page' : undefined}
									>
										{label}
									</a>
								)
							})}
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
			<div class="site-container py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-600 dark:text-gray-400">
				<div class="flex items-center gap-2 font-medium tracking-wide">
					<span class="inline-flex items-center justify-center h-6 w-6 rounded-md bg-indigo-500/10 dark:bg-indigo-500/15 text-pink-500 dark:text-pink-300 text-sm">♥</span>
					<span class="text-slate-700/90 dark:text-gray-300/90">Made with <span class="text-pink-500 dark:text-pink-400">love</span> · <span class="text-indigo-600 dark:text-indigo-300">ajo‑kit</span></span>
				</div>
				<div class="flex items-center gap-4">
					<div class="opacity-60 text-slate-500 dark:text-gray-400">© {year} All rights reserved.</div>
					<button
						id="theme-toggle"
						aria-label="Change theme"
						class="group flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium ring-1 ring-slate-300/70 dark:ring-white/15 bg-white/70 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-200 transition"
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
