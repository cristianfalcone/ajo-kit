import type { Stateful } from 'ajo'
import type { Frame } from '@kit'
import { Sidebar } from '/src/ui'

const links: [string, string, string][] = [
	['/admin', 'Overview', 'i-lucide-layout-dashboard'],
	['/admin/users', 'Users', 'i-lucide-users'],
	['/admin/registration', 'Registration', 'i-lucide-user-plus'],
	['/admin/sessions', 'Sessions', 'i-lucide-monitor'],
	['/admin/tokens', 'Tokens', 'i-lucide-key'],
]

const AdminLayout: Stateful<Frame> = function* (args) {

	for (args of this) {

		const url = globalThis.location?.pathname ?? '/'

		yield (
			<div class="py-8">
				<div class="flex items-center gap-3 mb-8">
					<span class="i-lucide-shield-check w-6 h-6 text-primary dark:text-accent" />
					<h1 class="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
				</div>

				<div class="flex flex-col lg:flex-row gap-8">
					<Sidebar
						url={url}
						width="sm"
						items={links.map(([href, label, icon]) => ({
							href,
							label,
							icon,
							exact: href === '/admin',
						}))}
					/>
					<div class="flex-1 min-w-0">
						{args.children}
					</div>
				</div>
			</div>
		)
	}
}

export default AdminLayout
