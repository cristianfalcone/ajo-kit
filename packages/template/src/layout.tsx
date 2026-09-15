import type { LayoutArgs } from 'ajo-kit'

export default ({ children }: LayoutArgs) => (
	<div class="min-h-screen bg-background text-foreground">
		<header class="border-b">
			<nav class="mx-auto flex h-14 max-w-2xl items-center justify-between px-6" aria-label="Main">
				<a class="font-semibold" href="/">Ajo Notes</a>
				<a class="text-sm underline" href="/notes">My notes</a>
			</nav>
		</header>
		<main class="mx-auto max-w-2xl space-y-6 px-6 py-10">{children}</main>
	</div>
)
