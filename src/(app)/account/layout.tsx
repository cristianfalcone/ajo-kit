import type { Stateful } from 'ajo'
import type { LayoutArgs } from '@kit'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from 'ajo-ui-playa/sidebar'
import { UnreadContext } from '/src/contexts'

const links: [string, string, string][] = [
	['/account/profile', 'Profile', 'i-lucide-user'],
	['/account/chats', 'Chats', 'i-lucide-message-circle'],
	['/account/sessions', 'Sessions', 'i-lucide-monitor'],
	['/account/tokens', 'API Tokens', 'i-lucide-key'],
	['/account/delete', 'Delete Account', 'i-lucide-trash-2'],
]

const active = (url: string, href: string) =>
	url === href || url.startsWith(`${href}/`)

const AccountLayout: Stateful<LayoutArgs> = function* (args) {

	for (args of this) {

		const url = globalThis.location?.pathname ?? '/'
		const unread = UnreadContext()

		yield (
			// Static collapsible="none" sidebar: mod+b would toggle invisible state, so disable the shortcut.
			<SidebarProvider shortcut={false} class="min-h-0 flex-col gap-8 py-8 lg:flex-row">
				<Sidebar collapsible="none" variant="floating" class="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)] lg:w-56 lg:self-start">
					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupLabel>Account</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{links.map(([href, label, icon]) => {
										const current = active(url, href)
										const danger = href.includes('delete')
										const badge = href === '/account/chats' ? unread : undefined

										return (
											<SidebarMenuItem key={href}>
												<SidebarMenuButton
													as="a"
													href={href}
													isActive={current}
													class={danger && !current ? 'text-danger hover:bg-danger/10 hover:text-danger' : undefined}
												>
													<span class={`${icon} size-4 shrink-0`} />
													<span>{label}</span>
												</SidebarMenuButton>
												{badge !== undefined && badge > 0 ? (
													<SidebarMenuBadge class="bg-danger text-danger-foreground">
														{badge}
													</SidebarMenuBadge>
												) : null}
											</SidebarMenuItem>
										)
									})}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>
				</Sidebar>
				<div class="flex-1 min-w-0">
					{args.children}
				</div>
			</SidebarProvider>
		)
	}
}

export default AccountLayout
