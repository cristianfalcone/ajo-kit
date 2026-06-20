import type { Stateful } from 'ajo'
import type { Frame } from '@kit'
import { UnreadContext } from '/src/contexts'
import { Sidebar } from '/src/ui'

const links: [string, string, string][] = [
	['/account/profile', 'Profile', 'i-lucide-user'],
	['/account/chats', 'Chats', 'i-lucide-message-circle'],
	['/account/sessions', 'Sessions', 'i-lucide-monitor'],
	['/account/tokens', 'API Tokens', 'i-lucide-key'],
	['/account/delete', 'Delete Account', 'i-lucide-trash-2'],
]

const AccountLayout: Stateful<Frame> = function* (args) {

	for (args of this) {

		const url = globalThis.location?.pathname ?? '/'
		const unread = UnreadContext()

		yield (
			<div class="flex flex-col lg:flex-row gap-8 py-8">
				<Sidebar
					url={url}
					items={links.map(([href, label, icon]) => ({
						href,
						label,
						icon,
						tone: href.includes('delete') ? 'danger' : undefined,
						badge: href === '/account/chats' ? unread : undefined,
					}))}
				/>
				<div class="flex-1 min-w-0">
					{args.children}
				</div>
			</div>
		)
	}
}

export default AccountLayout
