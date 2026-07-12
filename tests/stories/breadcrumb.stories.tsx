/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '/src/ui/breadcrumb'
import {
	Menu as MenuRoot,
	MenuContent,
	MenuItem,
	MenuTrigger,
} from '/src/ui/menu'

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
		'[data-slot="breadcrumb-link"], [data-slot="breadcrumb-page"], [data-slot="breadcrumb-separator"] > :not(.sr-only)',
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
					<MenuRoot>
						<MenuTrigger class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
							<BreadcrumbEllipsis class="size-4" />
							<span class="sr-only">Toggle menu</span>
						</MenuTrigger>
						<MenuContent align="start">
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
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

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
					<BreadcrumbItem class="hidden sm:inline-flex">
						<BreadcrumbLink href="/">Workspace</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator class="hidden sm:block" />
					<BreadcrumbItem>
						<BreadcrumbLink href="/account">Account</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage class="line-clamp-1">Security settings and active sessions</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	),
	play: async ({ canvas }) => assertBasicSemantics(canvas),
}
