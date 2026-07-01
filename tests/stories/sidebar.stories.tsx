/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Sidebar, { type SidebarItem } from '/src/ui/sidebar'

const items: SidebarItem[] = [
	{ href: '/dashboard', label: 'Dashboard', icon: 'i-lucide-layout-dashboard', exact: true },
	{ href: '/account/profile', label: 'Profile', icon: 'i-lucide-user' },
	{ href: '/account/chats', label: 'Chats', icon: 'i-lucide-message-circle', badge: 7 },
	{ href: '/account/tokens', label: 'Tokens', icon: 'i-lucide-key' },
	{ href: '/account/delete', label: 'Delete', icon: 'i-lucide-trash-2', tone: 'danger' },
]

export default {
	title: 'UI/Sidebar',
	component: Sidebar,
	args: {
		items,
		url: '/account/chats',
		width: 'md',
	},
	argTypes: {
		url: { control: 'text' },
		width: { control: 'radio', options: ['sm', 'md'] },
	},
	parameters: {
		docs: { description: 'Nested section navigation with active and badge states.' },
	},
} satisfies Meta<typeof Sidebar>

export const Default: Story<typeof Sidebar> = {}

export const Compact: Story<typeof Sidebar> = {
	args: { width: 'sm' },
}

export const ExactActive: Story<typeof Sidebar> = {
	args: { url: '/dashboard' },
}

export const NestedActive: Story<typeof Sidebar> = {
	args: { url: '/account/chats/123' },
}

export const DangerIdle: Story<typeof Sidebar> = {
	args: { url: '/account/profile' },
}

export const HorizontalOverflow: Story<typeof Sidebar> = {
	render: () => (
		<div class="max-w-sm">
			<Sidebar items={items} url="/account/chats" width="md" />
		</div>
	),
}
