import type { Stateless } from 'ajo'
import clsx from 'clsx'
import { CountBadge } from '/src/ui/badge'

export type SidebarItem = {
	href: string
	label: string
	icon: string
	badge?: number
	exact?: boolean
	tone?: 'danger'
}

type SidebarProps = {
	items: SidebarItem[]
	url: string
	width?: 'md' | 'sm'
}

const widthClass = {
	sm: 'lg:w-48',
	md: 'lg:w-56',
}

const isActive = (item: SidebarItem, url: string) =>
	item.exact ? url === item.href : url === item.href || url.startsWith(`${item.href}/`)

/** Sidebar navigation used by nested app sections. */
const Sidebar: Stateless<SidebarProps> = ({ items, url, width = 'md' }) => (
	<aside class={clsx(widthClass[width], 'shrink-0')}>
		<nav class="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
			{items.map(item => {
				const active = isActive(item, url)
				return (
					<a
						key={item.href}
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class={clsx([
							'flex shrink-0 items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
							active
								? 'bg-accent/10 text-primary dark:bg-accent/15 dark:text-accent'
								: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5',
							item.tone === 'danger' && !active && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
						])}
					>
						<span class={clsx(item.icon, 'w-5 h-5')} />
						{item.label}
						{item.badge !== undefined && item.badge > 0 && <CountBadge count={item.badge} class="ml-auto" />}
					</a>
				)
			})}
		</nav>
	</aside>
)

export default Sidebar
