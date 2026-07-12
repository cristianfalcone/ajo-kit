import clsx from 'clsx'
import type { Children, Stateful } from 'ajo'
import type { LayoutArgs } from '@kit'
import { scheme, storage } from 'ajo-cloves'
import { ThemeContext, type ThemeMode } from '/src/contexts'
import { Button, Spinner, Toaster } from '/src/ui'

export const pending = true

const Layout: Stateful<LayoutArgs> = function* (args) {

	let previous: Children = args.children
	const color = scheme(this)
	const saved = storage(this, { key: () => 'theme.v1', fallback: 'system' })
	const current = () => saved.value as ThemeMode

	const apply = (mode: ThemeMode) => {

		const root = globalThis.document?.documentElement

		if (!root) return

		root.classList.toggle('dark', mode === 'dark' || (mode === 'system' && color.dark))
	}

	const set = (next: ThemeMode) => {
		saved.set(next)
		apply(next)
	}

	const cycle = () => {
		const mode = current()
		set(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system')
	}

	for (args of this) try {

		const mode = current()

		apply(mode)
		ThemeContext({ mode, set, cycle })

		if (args.loading) {
			yield (
				<>
					<RouteLoading />
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

Layout.attrs = { class: 'min-h-screen flex flex-col bg-background bg-gradient-to-b from-background to-muted text-foreground relative transition-colors duration-300' }

export default Layout

const Wrapper = ({ children }: { children: Children }) => (
	<div key="content" class="flex-1 flex flex-col">
		{children}
		<Toaster />
	</div>
)

const RouteLoading = ({ label = 'Loading' }: { label?: string }) => (
	<div
		aria-busy="true"
		aria-label={label}
		aria-live="polite"
		class="fixed inset-0 z-50 flex items-center justify-center keyframes-fade-in"
		data-slot="route-loading"
		role="status"
		style="opacity:0;animation:fade-in 300ms ease-out 400ms forwards"
	>
		<div class="absolute inset-0 bg-black/40 backdrop-blur-xs" data-slot="route-loading-overlay" />
		<div class="relative flex flex-col items-center gap-3 rounded-xl glass edge px-5 py-4 shadow-xs" data-slot="route-loading-card">
			<Spinner aria-hidden="true" class="size-10" role="presentation" />
			<p aria-hidden="true" class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
		</div>
	</div>
)

export const Failure = ({ error }: { error: Error }) => {

	const isNotFound = 'status' in error && error.status === 404

	return (
		<div class="flex-1 flex items-center justify-center px-4 py-16">
			<div class="text-center max-w-md">
				<div class={clsx('inline-flex items-center justify-center size-16 rounded-2xl mb-6 shadow-xs inset-ring', isNotFound
					? 'bg-warning/10 text-warning inset-ring-warning/25'
					: 'bg-danger/10 text-danger inset-ring-danger/25'
				)}>
					<div class={clsx('size-8', isNotFound ? 'i-lucide-search-x' : 'i-lucide-alert-triangle')} />
				</div>
				<h1 class="text-2xl font-bold text-foreground mb-2">
					{isNotFound ? 'Page not found' : error.message}
				</h1>
				<p class="text-muted-foreground mb-8">
					{isNotFound
						? 'The page you are looking for doesn\u2019t exist or has been moved.'
						: (import.meta.env.DEV ? '' : 'Something went wrong. Please try again later.')}
				</p>
				{import.meta.env.DEV && !isNotFound && (
					<div class="text-left rounded-xl glass edge mb-8 overflow-hidden">
						<div class="flex items-center gap-2 px-4 py-2.5 border-b">
							<div class="i-lucide-code size-3.5 text-danger/60" />
							<span class="text-xs font-medium text-muted-foreground">Stack trace</span>
						</div>
						<pre class="text-xs text-danger/80 p-4 overflow-auto max-h-48 leading-relaxed">
							{error.stack ?? error.message}
						</pre>
					</div>
				)}
				<Button as="a" href="/" variant="outline">
					<span class="i-lucide-home size-4" />
					Back to home
				</Button>
			</div>
		</div>
	)
}
