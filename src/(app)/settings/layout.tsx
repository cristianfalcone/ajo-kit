import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { LayoutArgs } from '/src/constants'

const links: [string, string, string][] = [
	['/settings/profile', 'Profile', 'i-lucide-user'],
	['/settings/sessions', 'Sessions', 'i-lucide-monitor'],
	['/settings/tokens', 'API Tokens', 'i-lucide-key'],
	['/settings/delete', 'Delete Account', 'i-lucide-trash-2'],
]

const SettingsLayout: Stateful<LayoutArgs> = function* (args) {

	while (true) {
		const url = globalThis.location?.pathname ?? '/'

		yield (
			<div class="flex flex-col lg:flex-row gap-8 py-8">
				<aside class="lg:w-56 shrink-0">
					<nav class="flex lg:flex-col gap-1">
						{links.map(([path, label, icon]) => {
							const active = url === path
							return (
								<a
									key={path}
									href={path}
									class={clsx([
										'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
										active
											? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
											: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5',
										path.includes('delete') && !active && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
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
		)
	}
}

export default SettingsLayout
