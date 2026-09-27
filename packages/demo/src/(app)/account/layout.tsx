import type { Stateful } from 'ajo'
import type { LayoutArgs } from 'ajo-kit'
import { UnreadContext } from '/src/contexts'
import { SideNav } from '/src/view'

const AccountLayout: Stateful<LayoutArgs> = function* (args) {

	for (args of this) {

		const links = [
			{ href: '/account/profile', label: 'Profile', icon: 'i-lucide-user' },
			{ href: '/account/chats', label: 'Chats', icon: 'i-lucide-message-circle', badge: UnreadContext() },
			{ href: '/account/sessions', label: 'Sessions', icon: 'i-lucide-monitor' },
			{ href: '/account/tokens', label: 'API Tokens', icon: 'i-lucide-key' },
			{ href: '/account/delete', label: 'Delete Account', icon: 'i-lucide-trash-2', danger: true },
		]

		yield <SideNav label="Account" links={links}>{args.children}</SideNav>
	}
}

export default AccountLayout
