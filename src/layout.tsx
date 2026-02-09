import clsx from 'clsx'
import type { Children, Stateful } from 'ajo'
import type { LayoutArgs } from '/src/constants'
import { ThemeContext, type ThemeMode } from '/src/constants'
import type { Head } from '/src/head'
import Spinner from '/src/ui/spinner'

export const defer = true

export async function head(): Promise<Head> {
	return {
		title: 'ajo-kit',
		description: 'A minimalist full-stack metaframework powered by ajo',
		meta: [
			{ property: 'og:site_name', content: 'ajo-kit' },
			{ property: 'og:type', content: 'website' },
		],
		link: [
			{ rel: 'icon', href: '/favicon.ico' },
		],
	}
}

const Layout: Stateful<LayoutArgs> = function* (args) {

	let mode: ThemeMode = globalThis.localStorage?.getItem('theme.v1') as ThemeMode ?? 'system'
	let previous: Children = args.children

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

		if (args.loading) {
			yield (
				<>
					<Spinner loading={true} />
					<Wrapper>{previous}</Wrapper>
				</>
			)
		} else if (args.error) {
			yield (
				<Wrapper>
					<AppError error={args.error} />
				</Wrapper>
			)
		} else {
			previous = args.children
			yield <Wrapper>{args.children}</Wrapper>
		}

	} catch (error: unknown) {

		yield (
			<Wrapper>
				<AppError error={error instanceof Error ? error : new Error('An unknown error occurred')} />
			</Wrapper>
		)
	}
}

Layout.attrs = { class: 'min-h-screen flex flex-col bg-white text-slate-800 relative dark:bg-[#0e1a2e] dark:text-gray-100 transition-colors duration-300' }

export default Layout

const Wrapper = ({ children }: { children: Children }) => (
	<>
		<div class="flex-1 flex flex-col">
			{children}
		</div>
	</>
)

export const AppError = ({ error }: { error: Error }) => {

	const isNotFound = 'status' in error && error.status === 404

	return (
		<div class="flex-1 flex items-center justify-center px-4 py-16">
			<div class="text-center max-w-md">
				<div class={clsx('inline-flex items-center justify-center size-16 rounded-2xl mb-6 ring-1', isNotFound
					? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
					: 'bg-red-500/10 text-red-400 ring-red-500/20'
				)}>
					<div class={clsx('size-8', isNotFound ? 'i-lucide-search-x' : 'i-lucide-alert-triangle')} />
				</div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
					{isNotFound ? 'Page not found' : error.message}
				</h1>
				<p class="text-slate-500 dark:text-gray-400 mb-8">
					{isNotFound
						? 'The page you are looking for doesn\u2019t exist or has been moved.'
						: (import.meta.env.DEV ? '' : 'Something went wrong. Please try again later.')}
				</p>
				{import.meta.env.DEV && !isNotFound && (
					<div class="text-left rounded-xl bg-white/5 ring-1 ring-white/10 mb-8 overflow-hidden">
						<div class="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
							<div class="i-lucide-code size-3.5 text-red-400/60" />
							<span class="text-xs font-medium text-gray-400">Stack trace</span>
						</div>
						<pre class="text-xs text-red-400/80 p-4 overflow-auto max-h-48 leading-relaxed">
							{error.stack ?? error.message}
						</pre>
					</div>
				)}
				<a href="/" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-white/20 transition">
					<div class="i-lucide-home size-4" />
					Back to home
				</a>
			</div>
		</div>
	)
}
