import type { Stateful } from 'ajo'
import type { LayoutArgs } from 'ajo-kit'
import { SideNav } from '/src/view'

const links = [
	{ href: '/admin', label: 'Overview', icon: 'i-lucide-layout-dashboard' },
	{ href: '/admin/users', label: 'Users', icon: 'i-lucide-users' },
	{ href: '/admin/registration', label: 'Registration', icon: 'i-lucide-user-plus' },
	{ href: '/admin/sessions', label: 'Sessions', icon: 'i-lucide-monitor' },
	{ href: '/admin/tokens', label: 'Tokens', icon: 'i-lucide-key' },
]

const AdminLayout: Stateful<LayoutArgs> = function* (args) {

	for (args of this) yield <SideNav label="Admin" links={links}>{args.children}</SideNav>
}

export default AdminLayout
