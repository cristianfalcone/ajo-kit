import clsx from 'clsx'
import type { Children, Stateful } from 'ajo'
import type { LayoutArgs, Context } from '/src/constants'
import { ThemeContext, ThemeMode } from '/src/constants'
import type { Head } from '/src/head'
import Spinner from '/src/ui/spinner'

export const defer = true

export async function head(_context: Context): Promise<Head> {
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

Layout.attrs = { class: 'min-h-screen flex flex-col bg-white text-slate-800 relative dark:bg-[#0a0f1c] dark:text-gray-100 transition-colors duration-300' }

export default Layout

const Wrapper = ({ children }: { children: Children }) => (
	<>
		<div class="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_30%,rgba(99,102,241,.15),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(236,72,153,.12),transparent_55%)]" />
		<div class="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)]; [background-size:40px_40px]" />
		<div class="flex-1 flex flex-col">
			{children}
		</div>
	</>
)

export const AppError = ({ error }: { error: Error }) => {

	const isNotFound = 'status' in error && error.status === 404

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
								{error.message}
							</h3>
							<div class={clsx(['mt-2 text-sm', isNotFound ? 'text-yellow-700' : 'text-red-700'])}>
								{isNotFound ? (
									<p>The requested resource could not be found.</p>
								) : (
									<pre>
										{import.meta.env.DEV ? error.stack ?? error.message : 'Application Error'}
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
