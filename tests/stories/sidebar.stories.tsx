/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Args, Meta, Story } from './app'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarInput,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	sidebarMenuActionVariants,
	sidebarMenuButtonVariants,
} from '/src/ui/sidebar'
import Button from '/src/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '/src/ui/collapsible'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSeparator,
	MenuTrigger,
} from '/src/ui/menu'

// Stories must render deterministically at any harness viewport: desktop
// demos pin a never-matching mobileQuery, the Mobile story pins an
// always-matching one. Without pinning, a narrow viewport silently turns
// every desktop story into a closed (invisible) drawer.
const DESKTOP = '(max-width: 0px)'

const initialProjects = [
	{ href: '/dashboard', label: 'Dashboard', icon: 'i-lucide-layout-dashboard' },
	{ href: '/account/chats', label: 'Chats', icon: 'i-lucide-message-circle', badge: 7 },
	{ href: '/account/tokens', label: 'Tokens', icon: 'i-lucide-key' },
]

type DemoArgs = {
	active?: string
	collapsible?: 'icon' | 'none' | 'offcanvas'
	side?: 'left' | 'right'
	variant?: 'floating' | 'inset' | 'sidebar'
	/** Renders the loading group with skeleton rows. */
	loading?: boolean
}

// Fully interactive demo: search filters the menu, the group action adds a
// project, items set the active state, Settings is a working Collapsible,
// the item action and the footer user menu are interactive.
const DemoSidebar: Stateful<DemoArgs> = function* () {
	let projects = [...initialProjects]
	let active = '/account/chats'
	let filter = ''
	let added = 0

	const select = (href: string) => (event: Event) => {
		event.preventDefault()
		this.next(() => active = href)
	}

	const addProject = () => this.next(() => {
		added++
		projects = [...projects, { href: `/project-${added}`, label: `Project ${added}`, icon: 'i-lucide-folder' }]
	})

	const search = (event: Event) =>
		this.next(() => filter = (event.target as HTMLInputElement).value.trim().toLowerCase())

	for (const { collapsible = 'icon', loading = false, side = 'left', variant = 'sidebar' } of this) {
		const visible = projects.filter(project => !filter || project.label.toLowerCase().includes(filter))

		yield (
			<Sidebar collapsible={collapsible} side={side} variant={variant}>
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg">
								<span class="i-lucide-shield-check" />
								<span>Ajo Kit</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
					<SidebarInput placeholder="Search..." set:oninput={search} />
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Platform</SidebarGroupLabel>
						<SidebarGroupAction aria-label="Add project" set:onclick={addProject}>
							<span class="i-lucide-plus" />
						</SidebarGroupAction>
						<SidebarGroupContent>
							<SidebarMenu>
								{visible.map(project => (
									<SidebarMenuItem key={project.href}>
										<SidebarMenuButton as="a" href={project.href} isActive={project.href === active} tooltip={project.label} set:onclick={select(project.href)}>
											<span class={project.icon} />
											<span>{project.label}</span>
										</SidebarMenuButton>
										{project.badge ? <SidebarMenuBadge>{project.badge}</SidebarMenuBadge> : null}
										{/* !contents: the menu root box (relative inline-block)
										    must not become the action's positioned ancestor nor add
										    a line box to the item; the content anchors fixed. */}
										<Menu class="!contents">
											<MenuTrigger
												class={sidebarMenuActionVariants({ showOnHover: true })}
												data-sidebar="menu-action"
												aria-label={`More for ${project.label}`}
											>
												<span class="i-lucide-more-vertical" />
											</MenuTrigger>
											<MenuContent side="right" align="start">
												<MenuItem>
													<span class="i-lucide-pencil" />
													Rename
												</MenuItem>
												<MenuItem variant="danger">
													<span class="i-lucide-trash-2" />
													Delete
												</MenuItem>
											</MenuContent>
										</Menu>
									</SidebarMenuItem>
								))}
								<SidebarMenuItem>
									<Collapsible defaultOpen class="group/settings">
										<CollapsibleTrigger class={sidebarMenuButtonVariants()} data-sidebar="menu-button">
											<span class="i-lucide-settings" />
											<span>Settings</span>
											<span class="i-lucide-chevron-right ml-auto transition-transform group-data-[state=open]/settings:rotate-90" />
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												<SidebarMenuSubItem>
													<SidebarMenuSubButton href="/account/profile" isActive={active === '/account/profile'} set:onclick={select('/account/profile')}>
														<span>Profile</span>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
												<SidebarMenuSubItem>
													<SidebarMenuSubButton href="/account/sessions" isActive={active === '/account/sessions'} size="sm" set:onclick={select('/account/sessions')}>
														<span>Sessions</span>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											</SidebarMenuSub>
										</CollapsibleContent>
									</Collapsible>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					{loading ? (
						<>
							<SidebarSeparator />
							<SidebarGroup>
								<SidebarGroupLabel>Loading</SidebarGroupLabel>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuSkeleton showIcon />
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuSkeleton showIcon width="50%" />
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroup>
						</>
					) : null}
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<Menu class="!contents">
								<MenuTrigger class={sidebarMenuButtonVariants({ size: 'lg' })} data-sidebar="menu-button" data-size="lg">
									<span class="i-lucide-circle-user" />
									<span>cristian@example.com</span>
									<span class="i-lucide-chevrons-up-down ml-auto" />
								</MenuTrigger>
								<MenuContent side="top" align="start">
									<MenuLabel>cristian@example.com</MenuLabel>
									<MenuSeparator />
									<MenuItem>
										<span class="i-lucide-user" />
										Profile
									</MenuItem>
									<MenuItem>
										<span class="i-lucide-settings" />
										Settings
									</MenuItem>
									<MenuSeparator />
									<MenuItem variant="danger">
										<span class="i-lucide-log-out" />
										Sign out
									</MenuItem>
								</MenuContent>
							</Menu>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
		)
	}
}

export default {
	title: 'UI/Sidebar',
	component: Sidebar,
	parameters: {
		docs: { description: 'Composable Ajo Kit sidebar family with provider state, trigger, rail, groups, menu buttons, badges, submenus, input, and inset content.' },
		layout: 'fullscreen',
	},
} satisfies Meta<typeof Sidebar>

const root = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="sidebar-wrapper"]')

const panel = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="sidebar"]')

const tick = () => new Promise(resolve => setTimeout(resolve))
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))
const modB = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))

const expectDesktopWidth = (sidebar: HTMLElement, expected: number) => {
	const width = sidebar.getBoundingClientRect().width
	if (Math.abs(width - expected) > 1) {
		throw new Error(`Sidebar should be ${expected}px wide in the desktop presentation, got ${Math.round(width)}px`)
	}
}

export const Default: Story<typeof Sidebar> = {
	args: {
		side: 'left',
		variant: 'sidebar',
		collapsible: 'icon',
	},
	argTypes: {
		side: { control: 'radio', options: ['left', 'right'] },
		variant: { control: 'select', options: ['sidebar', 'floating', 'inset'] },
		collapsible: { control: 'select', options: ['icon', 'offcanvas', 'none'] },
	},
	render: args => (
		<SidebarProvider mobileQuery={DESKTOP} class="min-h-[560px]">
			<DemoSidebar side={args.side} variant={args.variant} collapsible={args.collapsible} loading />
			<SidebarInset class="p-6">
				<div class="flex items-center gap-2">
					<SidebarTrigger />
				<h2 class="text-lg font-semibold">Dashboard</h2>
			</div>
				<div class="mt-6 rounded-md glass edge shadow-xs p-6">
					<p class="text-sm text-muted-foreground">Main content stays in the inset.</p>
				</div>
			</SidebarInset>
		</SidebarProvider>
	),
	play: async ({ canvas }) => {
		const wrapper = root(canvas)
		const sidebar = panel(canvas)
		if (!wrapper || !sidebar) throw new Error('Sidebar provider or panel was not rendered')
		if (wrapper.getAttribute('data-mobile') !== 'false') throw new Error('Provider did not stamp the desktop presentation')
		if (sidebar.getAttribute('data-state') !== 'expanded') throw new Error('Sidebar should default to expanded')
		expectDesktopWidth(sidebar, 256)
		if (!canvas.querySelector('[data-slot="sidebar-menu-badge"]')) throw new Error('Sidebar badge was not rendered')
		if (!canvas.querySelector('[aria-current="page"]')) throw new Error('Active sidebar item should expose aria-current')

		const separator = canvas.querySelector<HTMLElement>('[data-sidebar="separator"]')
		if (!separator) throw new Error('SidebarSeparator was not rendered')
		if (separator.getBoundingClientRect().height < 1) throw new Error('SidebarSeparator is invisible (computed height below 1px)')

		// The loading rows read as skeletons: pulse animation on the row.
		const skeleton = canvas.querySelector<HTMLElement>('[data-sidebar="menu-skeleton"]')
		if (!skeleton) throw new Error('Sidebar skeleton was not rendered')
		if (getComputedStyle(skeleton).animationName === 'none') {
			throw new Error('Sidebar skeleton should pulse while loading')
		}

		// pr-8 must apply to a menu button whose item hosts a SidebarMenuAction
		// (regression: the single-bracket group-has-[data-sidebar=menu-action]
		// arbitrary variant generated an invalid :has() selector, dropping the
		// rule and letting the action button overlap the label).
		const action = canvas.querySelector<HTMLElement>('[data-sidebar="menu-action"]')
		const crowded = action?.closest('li')?.querySelector<HTMLElement>('[data-sidebar="menu-button"]')
		if (!action || !crowded) throw new Error('Sidebar menu action example was not rendered')
		if (getComputedStyle(crowded).paddingRight !== '32px') {
			throw new Error('SidebarMenuButton did not reserve pr-8 space for its SidebarMenuAction')
		}

		// Selecting an item moves aria-current without navigating.
		const dashboard = Array.from(canvas.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]'))
			.find(node => node.textContent?.includes('Dashboard'))
		if (!dashboard) throw new Error('Dashboard item was not rendered')
		dashboard.click()
		await tick()
		if (dashboard.getAttribute('aria-current') !== 'page') throw new Error('Clicking a sidebar item did not activate it')

		// The search input filters the menu.
		const input = canvas.querySelector<HTMLInputElement>('[data-sidebar="input"]')
		if (!input) throw new Error('Sidebar search input was not rendered')
		input.value = 'tok'
		input.dispatchEvent(new Event('input', { bubbles: true }))
		await tick()
		const labels = Array.from(canvas.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]')).map(node => node.textContent ?? '')
		if (!labels.some(label => label.includes('Tokens')) || labels.some(label => label.includes('Dashboard'))) {
			throw new Error('Sidebar search did not filter the menu items')
		}
		input.value = ''
		input.dispatchEvent(new Event('input', { bubbles: true }))
		await tick()

		// The group action appends a project.
		const before = canvas.querySelectorAll('[data-sidebar="menu-button"]').length
		canvas.querySelector<HTMLButtonElement>('[data-sidebar="group-action"]')?.click()
		await tick()
		if (canvas.querySelectorAll('[data-sidebar="menu-button"]').length !== before + 1) {
			throw new Error('SidebarGroupAction did not add a project')
		}

		// The Settings collapsible opens and closes its submenu.
		const settings = Array.from(canvas.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]'))
			.find(node => node.textContent?.includes('Settings'))
		const sub = canvas.querySelector<HTMLElement>('[data-sidebar="menu-sub"]')
		if (!settings || !sub) throw new Error('Settings collapsible was not rendered')
		if (sub.getBoundingClientRect().height < 1) throw new Error('Settings submenu should start open')
		settings.click()
		// The details content transitions closed; poll until it settles.
		{
			const deadline = performance.now() + 1000
			while (sub.checkVisibility()) {
				if (performance.now() > deadline) throw new Error('Settings collapsible did not close its submenu')
				await frame()
			}
		}
		settings.click()
		await frame()
		if (!sub.checkVisibility()) throw new Error('Settings collapsible did not reopen its submenu')

		// The item action opens its menu.
		const more = canvas.querySelector<HTMLButtonElement>('[data-sidebar="menu-action"]')
		if (!more) throw new Error('Sidebar menu action was not rendered')
		more.click()
		await frame()
		const menu = document.querySelector<HTMLElement>('[data-slot="menu-content"]:popover-open')
		if (!menu || !menu.textContent?.includes('Rename')) throw new Error('Menu action did not open')
		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
		await frame()
		if (menu.matches(':popover-open')) throw new Error('Escape did not close the action menu')

		// The footer user menu opens.
		const user = Array.from(canvas.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]'))
			.find(node => node.textContent?.includes('cristian@example.com'))
		if (!user) throw new Error('Sidebar user menu button was not rendered')
		user.click()
		await frame()
		const userMenu = document.querySelector<HTMLElement>('[data-slot="menu-content"]:popover-open')
		if (!userMenu || !userMenu.textContent?.includes('Sign out')) throw new Error('User menu did not open')
		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
		await frame()
		if (userMenu.matches(':popover-open')) throw new Error('Escape did not close the user menu')

		// Trigger and shortcut still toggle the sidebar.
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]')
		if (!trigger) throw new Error('SidebarTrigger was not rendered')
		const clearCookie = () => document.cookie = 'sidebar_state=; path=/; max-age=0'
		clearCookie()
		try {
			trigger.click()
			await tick()
			if (sidebar.getAttribute('data-state') !== 'collapsed') throw new Error('SidebarTrigger did not collapse the sidebar')
			if (!document.cookie.split('; ').includes('sidebar_state=false')) throw new Error('Sidebar did not persist its collapsed state')
			expectDesktopWidth(sidebar, 48)

			modB()
			await tick()
			if (sidebar.getAttribute('data-state') !== 'expanded') throw new Error('mod+b shortcut did not expand the sidebar')
			if (!document.cookie.split('; ').includes('sidebar_state=true')) throw new Error('Sidebar did not persist its expanded state')
		} finally {
			clearCookie()
		}
	},
}

export const ShortcutDisabled: Story<typeof Sidebar> = {
	render: () => (
		<SidebarProvider shortcut={false} mobileQuery={DESKTOP} class="min-h-[480px]">
			<DemoSidebar />
			<SidebarInset class="p-6">
				<p class="text-sm text-muted-foreground">The mod+b shortcut is disabled for this provider.</p>
			</SidebarInset>
		</SidebarProvider>
	),
	play: async ({ canvas }) => {
		const sidebar = panel(canvas)
		if (!sidebar || sidebar.getAttribute('data-state') !== 'expanded') throw new Error('Sidebar should start expanded')
		expectDesktopWidth(sidebar, 256)

		modB()
		await tick()
		if (sidebar.getAttribute('data-state') !== 'expanded') throw new Error('shortcut={false} did not disable the mod+b hotkey')
	},
}

export const Floating: Story<typeof Sidebar> = {
	render: () => (
		<SidebarProvider mobileQuery={DESKTOP} class="min-h-[520px] gap-4 p-4">
			<DemoSidebar variant="floating" />
			<SidebarInset class="rounded-xl edge p-6">
				<div class="flex items-center gap-2">
					<SidebarTrigger />
					<h2 class="text-lg font-semibold">Floating variant</h2>
				</div>
			</SidebarInset>
		</SidebarProvider>
	),
	play: async ({ canvas }) => {
		const sidebar = panel(canvas)
		if (!sidebar?.getAttribute('data-variant')?.includes('floating')) {
			throw new Error('Floating sidebar variant was not applied')
		}
		expectDesktopWidth(sidebar, 256)

		// The floating panel and the inset must share the row without
		// overflowing the provider (regression: an unconstrained w-full aside
		// pushed the inset off canvas).
		const wrapper = root(canvas)
		const inset = canvas.querySelector<HTMLElement>('[data-slot="sidebar-inset"]')
		if (!wrapper || !inset) throw new Error('Floating layout was not rendered')
		if (wrapper.scrollWidth > wrapper.clientWidth + 1) throw new Error('Floating layout overflows its provider')
		if (inset.getBoundingClientRect().width < 100) throw new Error('Floating inset was squeezed out of the layout')
	},
}

export const RightSide: Story<typeof Sidebar> = {
	render: () => (
		<SidebarProvider mobileQuery={DESKTOP} class="min-h-[480px]">
			<SidebarInset class="p-6">
				<div class="flex items-center gap-2">
					<SidebarTrigger />
					<h2 class="text-lg font-semibold">Right side content</h2>
				</div>
			</SidebarInset>
			<DemoSidebar side="right" />
		</SidebarProvider>
	),
	play: async ({ canvas }) => {
		const sidebar = panel(canvas)
		if (sidebar?.getAttribute('data-side') !== 'right') throw new Error('Right sidebar side was not applied')
		expectDesktopWidth(sidebar!, 256)

		const inset = canvas.querySelector<HTMLElement>('[data-slot="sidebar-inset"]')
		if (!inset) throw new Error('Right side inset was not rendered')
		if (sidebar!.getBoundingClientRect().left <= inset.getBoundingClientRect().left) {
			throw new Error('Right sidebar should render after the inset content')
		}
	},
}

export const StaticNavigation: Story<typeof Sidebar> = {
	render: () => (
		<SidebarProvider class="min-h-0 max-w-3xl flex-col gap-8 p-6 lg:flex-row">
			<Sidebar collapsible="none" class="lg:w-56">
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Account</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{initialProjects.map(project => (
									<SidebarMenuItem key={project.href}>
										<SidebarMenuButton as="a" href={project.href} isActive={project.href === '/account/chats'} set:onclick={(event: Event) => event.preventDefault()}>
											<span class={project.icon} />
											<span>{project.label}</span>
										</SidebarMenuButton>
										{project.badge ? <SidebarMenuBadge>{project.badge}</SidebarMenuBadge> : null}
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
			<div class="min-w-0 flex-1 rounded-md edge p-4">
				Static nested navigation layout
			</div>
		</SidebarProvider>
	),
	play: async ({ canvas }) => {
		const sidebar = panel(canvas)
		if (!sidebar || sidebar.getAttribute('data-collapsible')) {
			throw new Error('Static sidebar should not expose a collapsed state')
		}
	},
}

const ControlledExample: Stateful = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	while (true) yield (
		<SidebarProvider open={open} onOpenChange={setOpen} mobileQuery={DESKTOP} class="min-h-[480px]">
			<DemoSidebar />
			<SidebarInset class="p-6">
				<div class="flex items-center gap-2">
					<SidebarTrigger />
					<Button variant="outline" set:onclick={() => setOpen(!open)}>
						{open ? 'Collapse sidebar' : 'Expand sidebar'}
					</Button>
				</div>
				<p class="mt-4 text-sm text-muted-foreground" data-controlled-state="true">Sidebar is {open ? 'expanded' : 'collapsed'}.</p>
			</SidebarInset>
		</SidebarProvider>
	)
}

export const Controlled: Story<typeof Sidebar> = {
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const sidebar = panel(canvas)
		if (sidebar?.getAttribute('data-state') !== 'collapsed') throw new Error('Controlled sidebar did not honor open=false')
		expectDesktopWidth(sidebar!, 48)

		// The external button drives the controlled state both ways.
		const external = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Expand sidebar'))
		if (!external) throw new Error('Controlled external button was not rendered')
		external.click()
		await tick()
		if (sidebar!.getAttribute('data-state') !== 'expanded') throw new Error('External button did not expand the controlled sidebar')
		expectDesktopWidth(sidebar!, 256)
		if (!canvas.textContent?.includes('Sidebar is expanded.')) throw new Error('Controlled state text did not update')

		// The provider's own trigger notifies the owner too.
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]')
		if (!trigger) throw new Error('SidebarTrigger was not rendered')
		trigger.click()
		await tick()
		if (sidebar!.getAttribute('data-state') !== 'collapsed') throw new Error('SidebarTrigger did not flow through the controlled owner')
		if (!canvas.textContent?.includes('Sidebar is collapsed.')) throw new Error('Controlled state text did not follow the trigger')

		// Icon mode keeps only the leading icon visible, including on
		// composed triggers with three spans (icon, label, chevron).
		const settings = Array.from(canvas.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]'))
			.find(node => node.textContent?.includes('Settings'))
		const label = settings?.querySelectorAll('span')[1]
		if (!settings || !label) throw new Error('Settings trigger was not rendered')
		if (getComputedStyle(label).display !== 'none') {
			throw new Error('Collapsed icon sidebar should hide every non-icon span')
		}
	},
}

const MobileExample: Stateful<Args> = function* () {
	let notified = 'none'
	const observe = (open: boolean, event?: Event) => this.next(() => notified = `${open} (${event?.type ?? 'no event'})`)

	for (const { mobileQuery } of this) yield (
		<SidebarProvider mobileQuery={mobileQuery} onOpenChange={observe} class="min-h-[480px]">
			<DemoSidebar />
			<SidebarInset class="p-6">
				<div class="flex items-center gap-2">
					<SidebarTrigger />
				<h2 class="text-lg font-semibold">Mobile presentation</h2>
			</div>
			<p class="mt-4 text-sm text-muted-foreground">The sidebar opens as a modal drawer: press the trigger.</p>
			<p class="mt-2 text-sm text-muted-foreground">Notified: {notified}</p>
			</SidebarInset>
		</SidebarProvider>
	)
}

export const Mobile: Story<typeof Sidebar> = {
	args: {
		mobileQuery: '(min-width: 0px)',
	},
	argTypes: {
		mobileQuery: { control: 'text', description: 'Forced to always match so the drawer presentation renders at any viewport.' },
	},
	render: args => <MobileExample mobileQuery={args.mobileQuery} />,
	play: async ({ canvas }) => {
		const drawer = canvas.querySelector<HTMLDialogElement>('dialog[data-slot="sidebar"]')
		if (!drawer) throw new Error('Mobile sidebar did not render as a drawer dialog')
		if (drawer.open) throw new Error('Mobile drawer should start closed')
		if (
			drawer.getAttribute('data-mobile') !== 'true' ||
			drawer.getAttribute('data-side') !== 'left' ||
			drawer.getAttribute('data-variant') !== 'sidebar'
		) {
			throw new Error('Mobile drawer did not keep the sidebar data-attribute surface')
		}
		if (drawer.getAttribute('aria-label') !== 'Sidebar') throw new Error('Mobile drawer has no accessible name')
		if (root(canvas)?.getAttribute('data-mobile') !== 'true') throw new Error('Provider did not stamp the mobile presentation')

		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]')
		if (!trigger) throw new Error('SidebarTrigger was not rendered')
		trigger.click()
		await frame()

		if (!drawer.open) throw new Error('SidebarTrigger did not open the mobile drawer')
		if (!drawer.matches(':modal')) throw new Error('Mobile drawer did not open in the modal top layer')

		const backdrop = getComputedStyle(drawer, '::backdrop').backgroundColor
		if (!backdrop || backdrop === 'transparent' || backdrop === 'rgba(0, 0, 0, 0)') {
			throw new Error('Mobile drawer backdrop is not visible')
		}
		if (!canvas.textContent?.includes('Notified: true (click)')) {
			throw new Error('openMobile change did not flow through onOpenChange with the event')
		}

		// The rail must not render inside the drawer presentation.
		const rail = drawer.querySelector<HTMLElement>('[data-slot="sidebar-rail"]')
		if (rail && rail.checkVisibility()) throw new Error('Sidebar rail should stay hidden inside the mobile drawer')

		// Controls inside the drawer stay functional: the user menu opens
		// above the modal.
		const user = Array.from(drawer.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]'))
			.find(node => node.textContent?.includes('cristian@example.com'))
		if (!user) throw new Error('Drawer user menu button was not rendered')
		user.click()
		await frame()
		const userMenu = document.querySelector<HTMLElement>('[data-slot="menu-content"]:popover-open')
		if (!userMenu || !userMenu.textContent?.includes('Sign out')) throw new Error('Drawer user menu did not open')
		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
		await frame()
		if (userMenu.matches(':popover-open')) throw new Error('Escape did not close the drawer user menu')

		// The platform maps Escape to a cancelable `cancel` event on modal dialogs;
		// synthetic keydowns cannot trigger it, so dispatch the event itself.
		drawer.dispatchEvent(new Event('cancel', { cancelable: true }))
		await frame()

		if (drawer.open) throw new Error('Escape (cancel) did not close the mobile drawer')
		if (!canvas.textContent?.includes('Notified: false (cancel)')) {
			throw new Error('Mobile drawer dismissal did not flow through onOpenChange with the event')
		}
	},
}
