/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerVariants,
	type PopupPlacement,
} from 'ajo-ui-playa/navigation-menu'
import Button from 'ajo-ui-playa/button'

const components = [
	{
		title: 'Alert Dialog',
		href: '/docs/components/alert-dialog',
		description: 'A modal dialog that interrupts users with important content and expects a response.',
	},
	{
		title: 'Hover Card',
		href: '/docs/components/hover-card',
		description: 'Preview content available behind a link without leaving the current page.',
	},
	{
		title: 'Progress',
		href: '/docs/components/progress',
		description: 'Display completion progress for a task with a compact indicator.',
	},
	{
		title: 'Tabs',
		href: '/docs/components/tabs',
		description: 'Layer related sections of content and show one panel at a time.',
	},
]

const ListItem = ({
	children,
	href,
	key,
	title,
}: {
	children: string
	href: string
	key?: string
	title: string
}) => (
	<li key={key}>
		<NavigationMenuLink href={href}>
			<div class="text-sm font-medium leading-none">{title}</div>
			<p class="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
		</NavigationMenuLink>
	</li>
)

const RichMenu = ({ closeDelay, gap, openDelay, placement, value }: {
	closeDelay?: number
	gap?: number
	openDelay?: number
	placement?: PopupPlacement
	value?: string
}) => (
	<NavigationMenu closeDelay={closeDelay} gap={gap} openDelay={openDelay} placement={placement} value={value}>
		<NavigationMenuList class="flex-wrap">
			<NavigationMenuItem value="home">
				<NavigationMenuTrigger>Home</NavigationMenuTrigger>
				<NavigationMenuContent>
					<ul class="grid gap-2 md:w-[420px] lg:grid-cols-[0.8fr_1fr]">
						<li class="row-span-3">
							<NavigationMenuLink
								href="/"
								class="flex h-full min-h-36 w-full flex-col justify-end rounded-md bg-linear-to-b from-muted/60 to-muted p-5 no-underline"
							>
								<div class="mb-2 text-lg font-medium">Ajo Kit</div>
								<p class="text-sm leading-tight text-muted-foreground">
									Native Ajo components with Ajo Kit composition.
								</p>
							</NavigationMenuLink>
						</li>
						<ListItem href="/docs" title="Introduction">
							Reusable components built with Ajo, UnoCSS, and browser APIs.
						</ListItem>
						<ListItem href="/docs/installation" title="Installation">
							How to install dependencies and structure an Ajo app.
						</ListItem>
						<ListItem href="/docs/components/typography" title="Typography">
							Styles for headings, paragraphs, lists, and inline text.
						</ListItem>
					</ul>
				</NavigationMenuContent>
			</NavigationMenuItem>
			<NavigationMenuItem value="components">
				<NavigationMenuTrigger>Components</NavigationMenuTrigger>
				<NavigationMenuContent>
					<ul class="grid gap-2 sm:w-[420px] md:w-[560px] md:grid-cols-2">
						{components.map(component => (
							<ListItem key={component.href} href={component.href} title={component.title}>
								{component.description}
							</ListItem>
						))}
					</ul>
				</NavigationMenuContent>
			</NavigationMenuItem>
			<NavigationMenuItem value="docs">
				<NavigationMenuLink href="/docs" active class={navigationMenuTriggerVariants()}>
					Docs
				</NavigationMenuLink>
			</NavigationMenuItem>
			<NavigationMenuItem value="status">
				<NavigationMenuTrigger>Status</NavigationMenuTrigger>
				<NavigationMenuContent>
					<ul class="grid w-[220px] gap-2">
						<li>
							<NavigationMenuLink href="/roadmap" class="flex-row items-center gap-2">
								<span class="i-lucide-circle-help" />
								Backlog
							</NavigationMenuLink>
							<NavigationMenuLink href="/todo" class="flex-row items-center gap-2">
								<span class="i-lucide-circle" />
								To Do
							</NavigationMenuLink>
							<NavigationMenuLink href="/done" class="flex-row items-center gap-2">
								<span class="i-lucide-circle-check" />
								Done
							</NavigationMenuLink>
						</li>
					</ul>
				</NavigationMenuContent>
			</NavigationMenuItem>
		</NavigationMenuList>
	</NavigationMenu>
)

export default {
	title: 'UI/Navigation Menu',
	component: NavigationMenu,
	parameters: {
		docs: { description: 'Composable site navigation using native nav semantics, Popover API panels with hover intent, and Ajo Kit slots.' },
	},
} satisfies Meta<typeof NavigationMenu>

const trigger = (canvas: HTMLElement, label: string) =>
	Array.from(canvas.querySelectorAll<HTMLButtonElement>('[data-slot="navigation-menu-trigger"]'))
		.find(button => button.textContent?.includes(label))

const openContent = (canvas: HTMLElement) =>
	Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="navigation-menu-content"]'))
		.find(content => content.matches(':popover-open'))

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const until = async (check: () => boolean, label: string, timeout = 3000) => {
	const start = Date.now()
	while (!check()) {
		if (Date.now() - start > timeout) throw new Error(`Timed out waiting for: ${label}`)
		await sleep(16)
	}
}

const enter = (element: HTMLElement) => element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
const leave = (element: HTMLElement) => element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))

const key = (element: HTMLElement, name: string) => {
	const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: name })
	element.dispatchEvent(event)
	return event
}

const assertPanelBelowTrigger = async (canvas: HTMLElement, label: string) => {
	const button = trigger(canvas, label)
	if (!button) throw new Error(`${label} trigger was not rendered`)

	button.click()
	await until(() => Boolean(openContent(canvas)?.id === button.getAttribute('aria-controls')), `${label} content open`)

	const content = openContent(canvas)
	if (!content) throw new Error(`${label} content did not open`)

	const triggerRect = button.getBoundingClientRect()
	const contentRect = content.getBoundingClientRect()
	const gap = contentRect.top - triggerRect.bottom

	if (gap < 4 || gap > 20) {
		throw new Error(`${label} content was not positioned below its trigger: gap ${Math.round(gap)}px`)
	}
}

export const Default: Story<typeof NavigationMenu> = {
	render: () => (
		<div class="min-h-[420px]">
			<RichMenu />
		</div>
	),
	play: async ({ canvas }) => {
		const components = trigger(canvas, 'Components')
		if (!components) throw new Error('Components trigger was not rendered')
		if (components.hasAttribute('aria-haspopup')) throw new Error('Trigger should not announce aria-haspopup for a panel of links')
		components.click()
		await until(() => Boolean(openContent(canvas)), 'Components content open')

		const content = openContent(canvas)
		if (!content) throw new Error('Navigation menu content did not open')
		if (components.getAttribute('data-state') !== 'open') throw new Error('Trigger did not expose open state')
		if (content.getAttribute('popover') !== 'manual') throw new Error('Navigation menu content must use the shared manual-popover lifecycle')
		if (content.hasAttribute('data-side-offset')) throw new Error('Navigation menu content retained a legacy placement-input dataset')
		if (!content.textContent?.includes('Alert Dialog')) throw new Error('Opened content did not render list items')
		await assertPanelBelowTrigger(canvas, 'Home')
		await assertPanelBelowTrigger(canvas, 'Components')
		await assertPanelBelowTrigger(canvas, 'Status')
		if (!canvas.querySelector('[data-slot="navigation-menu-link"][aria-current="page"]')) {
			throw new Error('Active navigation link did not expose aria-current')
		}
	},
}

export const GeometryOverride: Story<typeof NavigationMenu> = {
	render: () => (
		<div class="flex min-h-[420px] min-w-[900px] items-center justify-start pl-24">
			<RichMenu gap={14} placement="right-start" />
		</div>
	),
	play: async ({ canvas }) => {
		const button = trigger(canvas, 'Components')
		if (!button) throw new Error('Components trigger was not rendered')
		button.click()
		await until(() => Boolean(openContent(canvas)), 'geometry override open')
		const panel = openContent(canvas)
		if (!panel) throw new Error('Geometry override panel did not open')
		if (panel.dataset.placement !== 'right-start') throw new Error(`Expected right-start, got ${panel.dataset.placement}`)
		const triggerRect = button.getBoundingClientRect()
		const gap = Number.parseFloat(panel.style.left) - triggerRect.right
		if (Math.abs(gap - 14) >= 2) throw new Error(`Expected a 14px root gap, got ${gap}`)
		const referenceWidth = Number.parseFloat(panel.style.getPropertyValue('--reference-width'))
		if (Math.abs(referenceWidth - triggerRect.width) >= 1) throw new Error('Navigation panel did not publish its trigger reference width')
	},
}

export const ScrollAndHiddenReference: Story<typeof NavigationMenu> = {
	render: () => (
		<div class="h-[240px] w-[480px] overflow-auto rounded-md edge" data-navigation-scroll>
			<div class="h-[720px] pt-[120px]">
				<NavigationMenu gap={8} placement="bottom-start">
					<NavigationMenuList>
						<NavigationMenuItem value="scroll">
							<NavigationMenuTrigger>Scroll target</NavigationMenuTrigger>
							<NavigationMenuContent>
								<NavigationMenuLink href="/scroll">Observed link</NavigationMenuLink>
							</NavigationMenuContent>
						</NavigationMenuItem>
					</NavigationMenuList>
				</NavigationMenu>
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const scroller = canvas.querySelector<HTMLElement>('[data-navigation-scroll]')
		const button = trigger(canvas, 'Scroll target')
		if (!scroller || !button) throw new Error('Scroll geometry fixture was not rendered')
		scroller.scrollTop = 40
		await sleep(32)
		button.click()
		await until(() => Boolean(openContent(canvas)), 'scroll panel open')
		const panel = openContent(canvas)
		if (!panel) throw new Error('Scroll panel did not open')
		const beforeTrigger = button.getBoundingClientRect().top
		const beforePanel = panel.getBoundingClientRect().top
		scroller.scrollTop += 24
		await until(
			() => Math.abs(panel.getBoundingClientRect().top - (beforePanel - 24)) < 3,
			'panel followed ancestor scroll',
		)
		if (Math.abs(button.getBoundingClientRect().top - (beforeTrigger - 24)) >= 2) {
			throw new Error('Scroll fixture did not move the reference by the expected amount')
		}
		scroller.scrollTop = 600
		await until(() => !openContent(canvas), 'hidden reference closed panel')
		if (button.getAttribute('data-state') !== 'closed') throw new Error('Hidden-reference close did not converge trigger state')
	},
}

export const ClickToggle: Story<typeof NavigationMenu> = {
	render: () => (
		<div class="min-h-[420px]">
			<RichMenu />
		</div>
	),
	play: async ({ canvas }) => {
		const components = trigger(canvas, 'Components')
		if (!components) throw new Error('Components trigger was not rendered')

		components.click()
		await until(() => Boolean(openContent(canvas)), 'panel open from click')

		// A second click/tap on the trigger closes a click-opened panel (the
		// hover hold applies only to hover-initiated opens).
		components.click()
		await until(() => !openContent(canvas), 'second click closed the click-opened panel')
		if (components.getAttribute('data-state') !== 'closed') {
			throw new Error('Trigger did not report closed state after the toggling click')
		}

		// And the toggle keeps working: a third click reopens.
		components.click()
		await until(() => Boolean(openContent(canvas)), 'third click reopened the panel')
	},
}

export const Hover: Story<typeof NavigationMenu> = {
	render: () => (
		<div class="min-h-[420px]">
			<RichMenu openDelay={100} closeDelay={150} />
		</div>
	),
	play: async ({ canvas }) => {
		const components = trigger(canvas, 'Components')
		const home = trigger(canvas, 'Home')
		if (!components || !home) throw new Error('Navigation menu triggers were not rendered')

		// Open needs hover intent: nothing right after enter, panel after the delay.
		enter(components)
		await sleep(30)
		if (openContent(canvas)) throw new Error('Panel opened before the hover open delay elapsed')
		await until(() => Boolean(openContent(canvas)), 'panel open after hover delay')

		// Leave closes, after the close delay.
		leave(components)
		await sleep(40)
		if (!openContent(canvas)) throw new Error('Panel closed before the hover close delay elapsed')
		await until(() => !openContent(canvas), 'panel closed after pointer leave')

		// Click on a hover-opened trigger holds instead of toggling closed.
		enter(components)
		await until(() => Boolean(openContent(canvas)), 'panel reopened by hover')
		components.click()
		await sleep(120)
		if (!openContent(canvas)) throw new Error('Click on a hover-opened trigger toggled the panel closed')
		if (components.getAttribute('data-state') !== 'open') throw new Error('Trigger lost open state after click')

		// Hover follow: while open, entering another trigger moves the panel without the open delay.
		leave(components)
		enter(home)
		await until(() => openContent(canvas)?.id === home.getAttribute('aria-controls'), 'panel followed hover to Home')
		if (components.getAttribute('data-state') === 'open') throw new Error('Previous panel stayed open after hover follow')

		leave(home)
		await until(() => !openContent(canvas), 'panel closed after leaving the followed trigger')
	},
}

export const Keyboard: Story<typeof NavigationMenu> = {
	render: () => (
		<div class="min-h-[420px] space-y-4">
			<RichMenu />
			<Button id="outside-navigation-button" variant="outline">Outside</Button>
		</div>
	),
	play: async ({ canvas }) => {
		const components = trigger(canvas, 'Components')
		const status = trigger(canvas, 'Status')
		const outside = canvas.querySelector<HTMLButtonElement>('#outside-navigation-button')
		if (!components || !status || !outside) throw new Error('Keyboard story elements were not rendered')

		// Escape is gated on open: while closed it must pass through untouched.
		components.focus()
		if (key(components, 'Escape').defaultPrevented) throw new Error('Escape was consumed while the menu was closed')

		// ArrowDown opens the panel and moves focus onto its first link.
		key(components, 'ArrowDown')
		await until(() => Boolean(openContent(canvas)), 'panel open from ArrowDown')
		const content = openContent(canvas)
		if (!content) throw new Error('Panel did not open from ArrowDown')
		await until(() => content.contains(document.activeElement), 'focus moved into the panel')

		// Every panel link is tabbable and walking them keeps the panel open.
		const links = Array.from(content.querySelectorAll<HTMLElement>('[data-slot="navigation-menu-link"]'))
		if (links.length < 2) throw new Error('Panel links were not rendered')
		for (const link of links) {
			if (link.tabIndex < 0) throw new Error('Panel link is not tabbable')
			link.focus()
			await sleep(16)
			if (!content.matches(':popover-open')) throw new Error('Panel closed while walking its links')
		}

		// Tab no longer closes on keydown (the old keyboard trap); only focus
		// actually leaving closes.
		const last = links[links.length - 1]
		if (key(last, 'Tab').defaultPrevented) throw new Error('Tab was consumed inside the panel')
		if (!content.matches(':popover-open')) throw new Error('Tab keydown alone closed the panel')

		// Focus landing on another trigger follows: previous closes, next opens.
		status.focus()
		await until(() => openContent(canvas)?.id === status.getAttribute('aria-controls'), 'panel followed focus to Status')
		if (content.matches(':popover-open')) throw new Error('Previous panel stayed open after focus follow')

		// Focus leaving the nav and its panels closes everything.
		outside.focus()
		await until(() => !openContent(canvas), 'panel closed when focus left the nav')

		// Escape acts when open: consumed, closes, and returns focus to the trigger.
		components.click()
		await until(() => Boolean(openContent(canvas)), 'panel reopened for the Escape check')
		if (!key(components, 'Escape').defaultPrevented) throw new Error('Escape was not consumed while open')
		await until(() => !openContent(canvas), 'panel closed from Escape')
	},
}

export const DirectLinks: Story<typeof NavigationMenu> = {
	render: () => (
		<NavigationMenu aria-label="Main">
			<NavigationMenuList>
				<NavigationMenuItem>
					<NavigationMenuLink href="/" class={navigationMenuTriggerVariants()}>Home</NavigationMenuLink>
				</NavigationMenuItem>
				<NavigationMenuItem>
					<NavigationMenuLink href="/docs" active class={navigationMenuTriggerVariants()}>Docs</NavigationMenuLink>
				</NavigationMenuItem>
				<NavigationMenuItem>
					<NavigationMenuLink href="/blog" class={navigationMenuTriggerVariants()}>Blog</NavigationMenuLink>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	),
	play: async ({ canvas }) => {
		if (!canvas.querySelector('[data-slot="navigation-menu"]')) throw new Error('Navigation menu root was not rendered')
		if (!canvas.querySelector('[data-active="true"]')) throw new Error('Active direct link was not rendered')
	},
}

const ControlledMenu: Stateful = function* () {
	let value = 'components'

	while (true) {
		yield (
			<div class="space-y-4">
				<div class="flex gap-2">
					<Button size="sm" variant="outline" set:onclick={() => this.next(() => value = 'home')}>Home</Button>
					<Button size="sm" variant="outline" set:onclick={() => this.next(() => value = '')}>Close</Button>
				</div>
				<NavigationMenu value={value} onValueChange={next => this.next(() => value = next)}>
					<NavigationMenuList>
						<NavigationMenuItem value="home">
							<NavigationMenuTrigger>Home</NavigationMenuTrigger>
							<NavigationMenuContent>
								<div class="w-[260px] p-2">
									<NavigationMenuLink href="/">Welcome</NavigationMenuLink>
								</div>
							</NavigationMenuContent>
						</NavigationMenuItem>
						<NavigationMenuItem value="components">
							<NavigationMenuTrigger>Components</NavigationMenuTrigger>
							<NavigationMenuContent>
								<div class="w-[260px] p-2">
									<NavigationMenuLink href="/components">All components</NavigationMenuLink>
								</div>
							</NavigationMenuContent>
						</NavigationMenuItem>
					</NavigationMenuList>
				</NavigationMenu>
			</div>
		)
	}
}

export const Controlled: Story<typeof NavigationMenu> = {
	render: () => <ControlledMenu />,
	play: async ({ canvas }) => {
		await until(() => Boolean(openContent(canvas)?.textContent?.includes('All components')), 'controlled value opened matching content')

		const close = Array.from(canvas.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Close')
		close?.click()
		await until(() => !openContent(canvas), 'controlled close button closed content')
	},
}

export const RejectedControlledClose: Story<typeof NavigationMenu> = {
	render: () => (
		<div class="min-h-[420px]">
			<RichMenu value="components" />
		</div>
	),
	play: async ({ canvas }) => {
		await until(() => Boolean(openContent(canvas)?.textContent?.includes('Alert Dialog')), 'pinned controlled panel open')
		const panel = openContent(canvas)
		const link = panel?.querySelector<HTMLElement>('[data-slot="navigation-menu-link"]')
		if (!panel || !link) throw new Error('Pinned NavigationMenu panel or link was not rendered')
		link.focus()
		key(link, 'Escape')
		await sleep(32)
		if (!panel.matches(':popover-open')) throw new Error('Rejected controlled close hid the NavigationMenu panel')
		if (document.activeElement !== link) throw new Error('Rejected controlled close moved focus out of the still-open NavigationMenu panel')
	},
}
