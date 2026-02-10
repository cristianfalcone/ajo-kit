import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { LayoutArgs } from '@kit'

const links: [string, string, string][] = [
	['/admin', 'Overview', 'i-lucide-layout-dashboard'],
	['/admin/users', 'Users', 'i-lucide-users'],
	['/admin/sessions', 'Sessions', 'i-lucide-monitor'],
	['/admin/tokens', 'Tokens', 'i-lucide-key'],
]

const AdminLayout: Stateful<LayoutArgs> = function* (args) {

	while (true) {
		const url = globalThis.location?.pathname ?? '/'

		yield (
			<div class="py-8">
				<div class="flex items-center gap-3 mb-8">
					<span class="i-lucide-shield-check w-6 h-6 text-primary dark:text-accent" />
					<h1 class="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
				</div>

				<div class="flex flex-col lg:flex-row gap-8">
					<aside class="lg:w-48 shrink-0">
						<nav class="flex lg:flex-col gap-1">
							{links.map(([path, label, icon]) => {
								const active = path === '/admin' ? url === path : url.startsWith(path)
								return (
									<a
										key={path}
										href={path}
										class={clsx([
											'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
											active
												? 'bg-accent/10 text-primary dark:bg-accent/15 dark:text-accent'
												: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
										])}
									>
										<span class={clsx(icon, 'w-5 h-5')} />
										{label}
									</a>
								)
							})}
						</nav>
					</aside>
					<div class="flex-1 min-w-0">
						{args.children}
					</div>
				</div>
			</div>
		)
	}
}

export default AdminLayout
