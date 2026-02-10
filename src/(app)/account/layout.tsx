import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { LayoutArgs } from '@kit'
import { UnreadContext } from '/src/contexts'

const links: [string, string, string][] = [
	['/account/profile', 'Profile', 'i-lucide-user'],
	['/account/chats', 'Chats', 'i-lucide-message-circle'],
	['/account/sessions', 'Sessions', 'i-lucide-monitor'],
	['/account/tokens', 'API Tokens', 'i-lucide-key'],
	['/account/delete', 'Delete Account', 'i-lucide-trash-2'],
]

const AccountLayout: Stateful<LayoutArgs> = function* (args) {

	while (true) {
		const url = globalThis.location?.pathname ?? '/'
		const unread = UnreadContext()

		yield (
			<div class="flex flex-col lg:flex-row gap-8 py-8">
				<aside class="lg:w-56 shrink-0">
					<nav class="flex lg:flex-col gap-1">
						{links.map(([path, label, icon]) => {
							const active = url === path || url.startsWith(path + '/')
							return (
								<a
									key={path}
									href={path}
									class={clsx([
										'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
										active
											? 'bg-accent/10 text-primary dark:bg-accent/15 dark:text-accent'
											: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5',
										path.includes('delete') && !active && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
									])}
								>
									<span class={clsx(icon, 'w-5 h-5')} />
									{label}
									{path === '/account/chats' && unread > 0 && (
										<span class="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
											{unread}
										</span>
									)}
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

export default AccountLayout
