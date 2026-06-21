import clsx from 'clsx'
import type { Children, Stateful } from 'ajo'
import type { Frame } from '@kit'
import { ThemeContext, type ThemeMode } from '/src/contexts'
import { Button, Spinner } from '/src/ui'

export const pending = true

const Layout: Stateful<Frame> = function* (args) {

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

	globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener(
		'change',
		() => {
			if (mode === 'system') apply('system')
		},
		{ signal: this.signal }
	)

	for (args of this) try {

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
					<Failure error={args.error} />
				</Wrapper>
			)
		} else {
			previous = args.children
			yield <Wrapper>{args.children}</Wrapper>
		}

	} catch (error: unknown) {

		yield (
			<Wrapper>
				<Failure error={error instanceof Error ? error : new Error('An unknown error occurred')} />
			</Wrapper>
		)
	}
}

Layout.attrs = { class: 'min-h-screen flex flex-col bg-[#edf4f3] text-slate-800 relative dark:bg-[#0e1a2e] dark:text-gray-100 transition-colors duration-300' }

export default Layout

const Wrapper = ({ children }: { children: Children }) => (
	<>
		<div key="content" class="flex-1 flex flex-col">
			{children}
		</div>
	</>
)

export const Failure = ({ error }: { error: Error }) => {

	const isNotFound = 'status' in error && error.status === 404

	return (
		<div class="flex-1 flex items-center justify-center px-4 py-16">
			<div class="text-center max-w-md">
				<div class={clsx('inline-flex items-center justify-center size-16 rounded-2xl mb-6 shadow-xs inset-ring dark:shadow-none', isNotFound
					? 'bg-amber-500/10 text-amber-400 shadow-amber-900/5 inset-ring-amber-500/20'
					: 'bg-red-500/10 text-red-400 shadow-red-900/5 inset-ring-red-500/20'
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
					<div class="text-left rounded-xl bg-[#f8fbf9]/75 shadow-xs shadow-slate-900/7 inset-ring inset-ring-slate-900/10 dark:bg-white/5 dark:shadow-none dark:inset-ring-white/10 mb-8 overflow-hidden">
						<div class="flex items-center gap-2 px-4 py-2.5 shadow-[inset_0_-1px_0_rgb(15_23_42_/_0.08)] dark:shadow-[inset_0_-1px_0_rgb(255_255_255_/_0.08)]">
							<div class="i-lucide-code size-3.5 text-red-400/60" />
							<span class="text-xs font-medium text-gray-400">Stack trace</span>
						</div>
						<pre class="text-xs text-red-400/80 p-4 overflow-auto max-h-48 leading-relaxed">
							{error.stack ?? error.message}
						</pre>
					</div>
				)}
				<Button to="/" icon="i-lucide-home" tone="neutral">
					Back to home
				</Button>
			</div>
		</div>
	)
}
