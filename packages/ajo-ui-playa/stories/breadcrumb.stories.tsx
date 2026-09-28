/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { frame } from './play'
import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from 'ajo-ui-playa/breadcrumb'
import {
	Menu as MenuRoot,
	MenuContent,
	MenuItem,
	MenuTrigger,
} from 'ajo-ui-playa/menu'

export default {
	title: 'UI/Breadcrumb',
	component: Breadcrumb,
	parameters: {
		docs: { description: 'Hierarchical path navigation with semantic nav, ordered list, current page, separators, and collapsed ranges.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Breadcrumb>

const nav = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="breadcrumb"]')

const list = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLOListElement>('[data-slot="breadcrumb-list"]')

const page = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="breadcrumb-page"]')

const assertBasicSemantics = (canvas: HTMLElement) => {
	const root = nav(canvas)
	const ol = list(canvas)
	const current = page(canvas)

	if (!root) throw new Error('Breadcrumb nav was not rendered')
	if (root.tagName !== 'NAV' || root.getAttribute('aria-label') !== 'breadcrumb') {
		throw new Error('Breadcrumb did not render the expected navigation landmark')
	}
	if (!ol || ol.tagName !== 'OL') throw new Error('BreadcrumbList did not render an ordered list')
	if (!current || current.getAttribute('aria-current') !== 'page') {
		throw new Error('BreadcrumbPage did not mark the current page')
	}
}

const assertVerticalAlignment = (canvas: HTMLElement) => {
	const visualItems = Array.from(canvas.querySelectorAll<HTMLElement>(
		'[data-slot="breadcrumb-link"], [data-slot="breadcrumb-page"], [data-slot="breadcrumb-separator"] > :last-child',
	))

	if (visualItems.length < 3) throw new Error('Breadcrumb did not render enough visible items to check alignment')

	const centers = visualItems.map(item => {
		const rect = item.getBoundingClientRect()
		return rect.top + rect.height / 2
	})
	const spread = Math.max(...centers) - Math.min(...centers)

	if (spread > 2) throw new Error(`Breadcrumb items are vertically misaligned by ${spread.toFixed(2)}px`)
}

export const Basic: Story<typeof Breadcrumb> = {
	render: () => (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="/">Home</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink href="/components">Components</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbPage>Breadcrumb</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	),
	play: async ({ canvas }) => {
		assertBasicSemantics(canvas)
		assertVerticalAlignment(canvas)

		const separators = canvas.querySelectorAll('[data-slot="breadcrumb-separator"]')
		if (separators.length !== 2) throw new Error('Basic breadcrumb rendered the wrong separator count')
		if (!canvas.querySelector('[data-slot="breadcrumb-separator"] .i-lucide-chevron-right')) {
			throw new Error('Default breadcrumb separator icon was not rendered')
		}
		for (const separator of separators) {
			if (separator.getAttribute('aria-hidden') !== 'true' || separator.getAttribute('role') !== 'presentation') {
				throw new Error('BreadcrumbSeparator should be decorative')
			}
		}
	},
}

export const CustomSeparator: Story<typeof Breadcrumb> = {
	render: () => (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="/">Home</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator>
					<span aria-hidden="true" class="text-muted-foreground">/</span>
				</BreadcrumbSeparator>
				<BreadcrumbItem>
					<BreadcrumbLink href="/components">Components</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator>
					<span aria-hidden="true" class="text-muted-foreground">/</span>
				</BreadcrumbSeparator>
				<BreadcrumbItem>
					<BreadcrumbPage>Breadcrumb</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	),
	play: async ({ canvas }) => {
		assertBasicSemantics(canvas)
		if (!canvas.querySelector('[data-slot="breadcrumb-separator"] span')) {
			throw new Error('Custom separator was not rendered')
		}
	},
}

export const Collapsed: Story<typeof Breadcrumb> = {
	render: () => (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="/">Home</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbEllipsis />
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink href="/components">Components</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbPage>Breadcrumb</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	),
	play: async ({ canvas }) => {
		assertBasicSemantics(canvas)

		const ellipsis = canvas.querySelector<HTMLElement>('[data-slot="breadcrumb-ellipsis"]')
		if (!ellipsis || ellipsis.getAttribute('aria-hidden') !== 'true') {
			throw new Error('BreadcrumbEllipsis did not render as a decorative collapsed marker')
		}
	},
}

export const Menu: Story<typeof Breadcrumb> = {
	render: () => (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="/">Home</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator>
					<span aria-hidden="true" class="text-muted-foreground">/</span>
				</BreadcrumbSeparator>
				<BreadcrumbItem>
					<MenuRoot placement="bottom-start">
						<MenuTrigger class="inline-flex rounded-xs px-1 align-middle text-muted-foreground playa-focus hover:text-foreground">
							<BreadcrumbEllipsis />
							<span class="sr-only">Toggle menu</span>
						</MenuTrigger>
						<MenuContent>
							<MenuItem>Documentation</MenuItem>
							<MenuItem>Themes</MenuItem>
							<MenuItem>GitHub</MenuItem>
						</MenuContent>
					</MenuRoot>
				</BreadcrumbItem>
				<BreadcrumbSeparator>
					<span aria-hidden="true" class="text-muted-foreground">/</span>
				</BreadcrumbSeparator>
				<BreadcrumbItem>
					<BreadcrumbPage>Breadcrumb</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	),
	play: async ({ canvas }) => {
		assertBasicSemantics(canvas)

		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="menu-trigger"]')
		if (!trigger) throw new Error('Breadcrumb menu trigger was not rendered')
		trigger.click()
		await frame()

		const content = document.querySelector<HTMLElement>('[data-slot="menu-content"]')
		if (!content?.matches(':popover-open')) throw new Error('Breadcrumb menu did not open')
		content.hidePopover()
	},
}

export const Responsive: Story<typeof Breadcrumb> = {
	render: () => (
		<div class="w-[360px]">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem class="hidden sm:inline">
						<BreadcrumbLink href="/">Workspace</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator class="hidden sm:inline" />
					<BreadcrumbItem>
						<BreadcrumbLink href="/account">Account</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Security settings and active sessions</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	),
	play: async ({ canvas }) => {
		assertBasicSemantics(canvas)
		// A wrapped title keeps its padding on every line, so its next line
		// starts where the trail's first text does.
		const rtl = getComputedStyle(canvas.querySelector('[data-slot="breadcrumb-list"]')!).direction === 'rtl'
		const starts = (node: Node) => {
			const range = document.createRange()
			range.selectNodeContents(node)
			return Array.from(range.getClientRects(), rect => rtl ? rect.right : rect.left)
		}
		const link = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="breadcrumb-link"]')).find(node => node.getClientRects().length)!
		const lines = starts(canvas.querySelector('[data-slot="breadcrumb-page"]')!)
		if (lines.length < 2) throw new Error('The page title did not wrap, so the check proves nothing')
		if (Math.abs(lines.at(-1)! - starts(link)[0]) > 1) throw new Error('The wrapped page title does not line up with the trail')
	},
}

// Each separator shares a line with the item it leads to, so a wrapped trail
// never ends a line on a separator.
const assertNoDanglingSeparator = (canvas: HTMLElement) => {
	const separators = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="breadcrumb-separator"]'))
	const tops = new Set(Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="breadcrumb-item"]'), item => Math.round(item.getBoundingClientRect().top)))
	if (tops.size < 2) throw new Error('The breadcrumb did not wrap, so the check proves nothing')
	for (const separator of separators) {
		const mark = separator.querySelector<HTMLElement>(':scope > :last-child')!.getBoundingClientRect()
		const next = separator.nextElementSibling!.getBoundingClientRect()
		if (Math.abs((mark.top + mark.bottom) / 2 - (next.top + next.bottom) / 2) > 2) {
			throw new Error(`A separator ends a line apart from "${separator.nextElementSibling!.textContent}"`)
		}
	}
}

export const Wrapping: Story<typeof Breadcrumb> = {
	render: () => (
		<div class="w-56">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/">host-01</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/apps">Apps</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/apps/shop-api">shop-api</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/apps/shop-api/domains">Domains</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>shop.example.com</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	),
	play: async ({ canvas }) => {
		assertBasicSemantics(canvas)
		assertNoDanglingSeparator(canvas)
	},
}
