/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from '../app'
import { press, until } from '../play'
import { SidebarContext } from 'ajo-ui/sidebar'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from 'ajo-ui-playa/breadcrumb'
import { Button } from 'ajo-ui-playa/button'
import { Chip } from 'ajo-ui-playa/chip'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'ajo-ui-playa/command'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from 'ajo-ui-playa/item'
import { Kbd } from 'ajo-ui-playa/kbd'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ajo-ui-playa/menu'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	sidebarMenuButtonVariants,
} from 'ajo-ui-playa/sidebar'
import { Page, t } from './page'

const sections = (): [string, [string, string, string][]][] => [
	[t('Host', 'المضيف'), [
		['overview', t('Overview', 'نظرة عامة'), 'i-lucide-activity'],
		['apps', t('Apps', 'التطبيقات'), 'i-lucide-box'],
		['domains', t('Domains', 'النطاقات'), 'i-lucide-globe'],
		['people', t('People', 'الأشخاص'), 'i-lucide-users'],
	]],
	[t('Account', 'الحساب'), [
		['tokens', t('Access tokens', 'رموز الوصول'), 'i-lucide-key-round'],
		['settings', t('Settings', 'الإعدادات'), 'i-lucide-settings'],
	]],
]

const apps = (): [string, string, boolean][] => [
	['shop-api', t('shop.example.com, deployed 4 minutes ago', 'shop.example.com، نُشر منذ 4 دقائق'), true],
	['shop-web', t('www.shop.example.com, deployed 1 hour ago', 'www.shop.example.com، نُشر منذ ساعة'), true],
	['mailer', t('No domain, stopped 2 hours ago', 'بلا نطاق، توقف منذ ساعتين'), false],
	['docs', t('docs.example.com, deployed 5 hours ago', 'docs.example.com، نُشر منذ 5 ساعات'), true],
	['billing', t('billing.example.com, deployed 6 hours ago', 'billing.example.com، نُشر منذ 6 ساعات'), true],
	['search', t('search.example.com, deployed 2 days ago', 'search.example.com، نُشر منذ يومين'), true],
]

// The story writes its own theme toggle: Playa ships none, apps own the choice.
const toggleTheme = () => {
	const root = document.documentElement
	const dark = root.classList.contains('dark') || (!root.classList.contains('light') && matchMedia('(prefers-color-scheme: dark)').matches)
	root.classList.toggle('dark', !dark)
	root.classList.toggle('light', dark)
}

/** Command search, opened from its button or with Ctrl K (Cmd K on a Mac) anywhere on the page. */
const Search: Stateful = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	document.addEventListener('keydown', event => {
		if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
		event.preventDefault()
		setOpen(true)
	}, { signal: this.signal })

	while (true) yield (
		<>
			<Button variant="outline" class="justify-start gap-2 text-muted-foreground sm:w-56" aria-keyshortcuts="Control+K Meta+K" data-screen-layer="command" set:onclick={() => setOpen(true)}>
				<span aria-hidden="true" class="i-lucide-search" />
				<span class="max-sm:sr-only">{t('Search', 'بحث')}</span>
				<Kbd class="ms-auto max-sm:hidden">Ctrl K</Kbd>
			</Button>
			<CommandDialog open={open} onOpenChange={setOpen} title={t('Search', 'بحث')} description={t('Go to a page or run an action', 'انتقل إلى صفحة أو نفّذ إجراءً')}>
				{/* CommandDialog opens on its close button (p5-kit-13); a search opens on its input. */}
				<CommandInput autofocus placeholder={t('Search pages and actions', 'ابحث في الصفحات والإجراءات')} />
				<CommandList>
					<CommandEmpty>{t('Nothing matches. Try an app or a page name.', 'لا شيء يطابق. جرّب اسم تطبيق أو صفحة.')}</CommandEmpty>
					<CommandGroup heading={t('Go to', 'انتقل إلى')}>
						{sections().flatMap(([, items]) => items).map(([id, label]) => <CommandItem key={id} value={id} onSelect={() => setOpen(false)}>{label}</CommandItem>)}
					</CommandGroup>
					<CommandGroup heading={t('Actions', 'الإجراءات')}>
						<CommandItem value="deploy" onSelect={() => setOpen(false)}>{t('Deploy an app', 'انشر تطبيقًا')}</CommandItem>
						<CommandItem value="domain" onSelect={() => setOpen(false)}>{t('Add domain', 'إضافة نطاق')}</CommandItem>
						<CommandItem value="invite" onSelect={() => setOpen(false)}>{t('Invite someone', 'ادعُ شخصًا')}</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	)
}

// SidebarTrigger does not report whether the sidebar is open (p5-kit-18), so the shell
// reads the provider's state: the desktop sidebar, or the drawer on a phone. Playa does
// not export SidebarContext, so this is the one import from ajo-ui on a Playa screen.
const Toggle = () => {
	const sidebar = SidebarContext()
	return <SidebarTrigger aria-expanded={sidebar && String(sidebar.isMobile ? sidebar.openMobile : sidebar.open)} />
}

const Shell = () => (
	<SidebarProvider>
		<Sidebar>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg">
							<span aria-hidden="true" class="i-lucide-server" />
							<span class="flex flex-col">
								<bdi class="font-medium">host-01</bdi>
								<span class="text-xs text-muted-foreground">{t('5 apps running', '5 تطبيقات تعمل')}</span>
							</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{sections().map(([label, items]) => (
					<SidebarGroup key={label}>
						<SidebarGroupLabel>{label}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{items.map(([id, title, icon]) => (
									<SidebarMenuItem key={id}>
										<SidebarMenuButton as="a" href={`#${id}`} isActive={id === 'apps'} aria-current={id === 'apps' ? 'page' : undefined}>
											<span aria-hidden="true" class={icon} />
											<span>{title}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						{/* The user menu borrows the sidebar button's look and slot, and `!contents` keeps
						    the Menu root out of the item's layout, until the sidebar composes a menu (p5-kit-18). */}
						<Menu class="!contents" placement="top-start">
							<MenuTrigger class={sidebarMenuButtonVariants({ size: 'lg' })} data-size="lg" data-slot="sidebar-menu-button" data-screen-layer="user-menu">
								<span aria-hidden="true" class="i-lucide-circle-user" />
								<span class="flex min-w-0 flex-col">
									<span class="truncate font-medium">{t('Ada Lovelace', 'آدا لوفليس')}</span>
									<bdi class="truncate text-xs text-muted-foreground">ada@example.com</bdi>
								</span>
								<span aria-hidden="true" class="i-lucide-chevrons-up-down ms-auto" />
							</MenuTrigger>
							<MenuContent>
								<MenuLabel><bdi>ada@example.com</bdi></MenuLabel>
								<MenuSeparator />
								<MenuItem>{t('Profile', 'الملف الشخصي')}</MenuItem>
								<MenuItem>{t('Access tokens', 'رموز الوصول')}</MenuItem>
								<MenuSeparator />
								<MenuItem>{t('Sign out', 'تسجيل الخروج')}</MenuItem>
							</MenuContent>
						</Menu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
		<SidebarInset>
			<header class="sticky top-0 z-10 flex items-center gap-2 border-b glass-chrome px-4 py-3 sm:px-8">
				<Toggle />
				<Breadcrumb class="min-w-0">
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="#overview"><bdi>host-01</bdi></BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{t('Apps', 'التطبيقات')}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<div class="ms-auto flex items-center gap-2">
					<Search />
					<Button variant="ghost" size="icon" aria-label={t('Switch theme', 'تبديل السمة')} set:onclick={toggleTheme}>
						<span aria-hidden="true" class="i-lucide-sun-moon" />
					</Button>
				</div>
			</header>
			<Page as="div" title={t('Apps', 'التطبيقات')} lead={t('Everything deployed to host-01.', 'كل ما نُشر على host-01.')} action={<Button>{t('Deploy an app', 'انشر تطبيقًا')}</Button>}>
				<ItemGroup>
					{apps().map(([name, detail, running]) => (
						<Item key={name} variant="outline" as="a" href={`#${name}`}>
							<ItemMedia variant="icon"><span aria-hidden="true" class="i-lucide-box" /></ItemMedia>
							<ItemContent>
								<ItemTitle><bdi>{name}</bdi></ItemTitle>
								<ItemDescription>{detail}</ItemDescription>
							</ItemContent>
							<ItemActions>
								{running ? <Chip variant="success">{t('Running', 'يعمل')}</Chip> : <Chip variant="secondary">{t('Stopped', 'متوقف')}</Chip>}
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			</Page>
		</SidebarInset>
	</SidebarProvider>
)

export default {
	title: 'Screens/Navigation',
	parameters: {
		docs: { description: 'The app shell: sidebar with a current item, a frosted top bar with breadcrumb, command search, user menu and a theme toggle the story writes; a drawer on a phone.' },
		layers: {
			command: '[data-screen-layer="command"]',
			'user-menu': { trigger: '[data-screen-layer="user-menu"]', widths: [1280] },
			sidebar: { trigger: '[data-slot="sidebar-trigger"]', widths: [390] },
		},
		layout: 'fullscreen',
	},
	render: () => <Shell />,
} satisfies Meta

const selected = (dialog: HTMLElement) => dialog.querySelector('[data-slot="command-item"][aria-selected="true"]')

export const Default: Story = {
	parameters: {
		known: [
			{ check: 'axe', slice: 'p5-kit-16', variants: ['light-1280', 'dark-1280', 'rtl-light-1280', 'light-390', 'dark-390'], targets: ['aria-required-children'] },
			{ check: 'focus', slice: 'p5-kit-16', variants: ['light-1280', 'rtl-light-1280', 'light-390'], targets: ['a[data-slot=item]'] },
			{ check: 'focus', slice: 'p5-kit-18', variants: ['light-1280', 'rtl-light-1280'], targets: ['a[data-slot=sidebar-menu-button]', 'button[data-slot=sidebar-menu-button]'] },
			{ check: 'forced-colors', slice: 'p5-kit-16', variants: ['light-1280'], targets: ['a[data-slot=item]'] },
			{ check: 'forced-colors', slice: 'p5-kit-18', variants: ['light-1280'], targets: ['a[data-slot=sidebar-menu-button]', 'button[data-slot=sidebar-menu-button]'] },
			{ check: 'motion', slice: 'p5-kit-15', variants: ['light-1280 command'], targets: ['dialog[data-slot=command-dialog]'] },
		],
	},
	// The shell by keyboard: Ctrl K opens the command search, the arrows move through it and
	// Enter runs an item; the user menu opens with Enter, takes the arrows and closes with Escape.
	play: async ({ canvas }) => {
		const search = canvas.querySelector<HTMLElement>('[data-screen-layer="command"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('dialog[data-slot="command-dialog"]')
		if (!search || !dialog) throw new Error('The shell has no command search')
		search.focus()
		press(search, 'k', { ctrlKey: true })
		await until(() => dialog.open && dialog.contains(document.activeElement), 'Ctrl K did not open the command search with focus in it')
		const input = document.activeElement as HTMLElement
		const first = selected(dialog)
		press(input, 'ArrowDown')
		await until(() => !!selected(dialog) && selected(dialog) !== first, 'ArrowDown did not move through the command search')
		press(input, 'Enter')
		await until(() => !dialog.open, 'Enter on an item did not run it and close the command search')
		await until(() => document.activeElement === search, 'Closing the command search did not return focus to its button')
		search.blur()

		// The user menu sits in the sidebar, which a phone keeps in a closed drawer.
		const user = canvas.querySelector<HTMLElement>('[data-screen-layer="user-menu"]')
		if (!user?.checkVisibility()) return
		user.focus()
		press(user, 'Enter')
		await until(() => !!document.activeElement?.matches('[data-slot="menu-item"]'), 'Enter on the user menu did not focus its first item')
		const item = document.activeElement as HTMLElement
		press(item, 'ArrowDown')
		await until(() => document.activeElement !== item, 'ArrowDown did not move through the user menu')
		press(document.activeElement as HTMLElement, 'Escape')
		await until(() => user.getAttribute('aria-expanded') !== 'true', 'Escape did not close the user menu')
		if (document.activeElement !== user) throw new Error('Closing the user menu did not return focus to it')
		user.blur()
	},
}
