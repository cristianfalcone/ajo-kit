import type { LayoutArgs } from '@kit'

export default ({ children }: LayoutArgs) => (
	<div class="flex min-h-screen flex-col bg-background text-foreground">
		<header class="border-b">
			<div class="mx-auto flex h-14 max-w-2xl items-center px-6 font-semibold">ajo-kit</div>
		</header>
		{children}
	</div>
)
