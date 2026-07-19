import type { Stateful } from 'ajo'
import type { LayoutArgs } from '@kit'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from 'ajo-ui-playa/sidebar'

const links: [string, string, string][] = [
	['/admin', 'Overview', 'i-lucide-layout-dashboard'],
	['/admin/users', 'Users', 'i-lucide-users'],
	['/admin/registration', 'Registration', 'i-lucide-user-plus'],
	['/admin/sessions', 'Sessions', 'i-lucide-monitor'],
	['/admin/tokens', 'Tokens', 'i-lucide-key'],
]

const active = (url: string, href: string) =>
	href === '/admin' ? url === href : url === href || url.startsWith(`${href}/`)

const AdminLayout: Stateful<LayoutArgs> = function* (args) {

	for (args of this) {

		const url = globalThis.location?.pathname ?? '/'

		yield (
			<div class="py-8">
				{/* Static collapsible="none" sidebar: the mod+b shortcut would toggle invisible state, so disable it. */}
				<SidebarProvider shortcut={false} class="min-h-0 flex-col gap-8 lg:flex-row">
					<Sidebar collapsible="none" variant="floating" class="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)] lg:w-48 lg:self-start">
						<SidebarContent>
							<SidebarGroup>
								<SidebarGroupLabel>Admin</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{links.map(([href, label, icon]) => (
											<SidebarMenuItem key={href}>
												<SidebarMenuButton as="a" href={href} isActive={active(url, href)}>
													<span class={icon} />
													<span>{label}</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						</SidebarContent>
					</Sidebar>
					<div class="flex-1 min-w-0">
						{args.children}
					</div>
				</SidebarProvider>
			</div>
		)
	}
}

export default AdminLayout
