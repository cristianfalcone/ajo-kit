/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { frame } from './play'
import { Button } from 'ajo-ui-playa/button'
import { Card, CardContent } from 'ajo-ui-playa/card'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from 'ajo-ui-playa/collapsible'

export default {
	title: 'UI/Collapsible',
	component: Collapsible,
	args: {
		defaultOpen: false,
		disabled: false,
	},
	argTypes: {
		defaultOpen: { control: 'boolean' },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Native details/summary disclosure with Ajo Kit slots, Ajo state, and controlled/uncontrolled usage.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Collapsible>

const root = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLDetailsElement>('details[data-slot="collapsible"]')

const content = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="collapsible-content"]')

const trigger = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]')

const visible = (element: HTMLElement | null) =>
	Boolean(element?.checkVisibility())

// A closed panel collapses to nothing, so the root is exactly the trigger:
// a gap or space-y on the root would leave an empty band below it.
const flush = (canvas: HTMLElement) => {
	const height = root(canvas)!.getBoundingClientRect().height
	const summary = trigger(canvas)!.getBoundingClientRect().height
	if (Math.abs(height - summary) > 0.5) throw new Error(`Closed collapsible is ${height - summary}px taller than its trigger`)
}

const ExternalExample: Stateful = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	while (true) yield (
		<div class="w-[350px] space-y-3">
			<Button variant="outline" set:onclick={() => setOpen(!open)}>
				{open ? 'Hide' : 'Show'} deploy details
			</Button>
			<Collapsible open={open} onOpenChange={setOpen}>
				<CollapsibleTrigger>Details</CollapsibleTrigger>
				<CollapsibleContent class="mt-2 rounded-md edge bg-muted/40 p-3 text-sm">
					shop-web 1.4.2 took 3 minutes to deploy.
				</CollapsibleContent>
			</Collapsible>
		</div>
	)
}

export const Basic: Story<typeof Collapsible> = {
	args: {
		title: 'shop-web runs on 2 hosts',
	},
	render: ({ title, ...args }) => (
		<Collapsible {...args} class="w-[350px]">
			<CollapsibleTrigger class="w-full justify-between px-4">
				<span class="text-sm font-semibold">{title}</span>
				<span class="i-lucide-chevrons-up-down size-4" />
			</CollapsibleTrigger>
			<CollapsibleContent class="mt-2 flex flex-col gap-2">
				<div class="rounded-md edge px-4 py-2 font-mono text-sm">
					host-01
				</div>
				<div class="rounded-md edge px-4 py-2 font-mono text-sm">
					host-02
				</div>
			</CollapsibleContent>
		</Collapsible>
	),
	play: async ({ canvas }) => {
		const details = root(canvas)
		const summary = trigger(canvas)
		const panel = content(canvas)
		if (!details || !summary || !panel) throw new Error('Basic collapsible did not render root, trigger, and content')
		if (details.open || visible(panel)) throw new Error('Closed collapsible content was visible')
		if (summary.getAttribute('aria-expanded') !== 'false') throw new Error('Closed trigger did not expose collapsed state')
		flush(canvas)

		summary.click()
		await frame()

		if (!details.open || !visible(panel)) throw new Error('Collapsible content did not show after click')
		if (details.dataset.state !== 'open' || summary.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Collapsible did not expose open state after click')
		}
	},
}

export const DefaultOpen: Story<typeof Collapsible> = {
	args: {
		defaultOpen: true,
		title: 'Pinned packages',
	},
	render: ({ title, ...args }, { setArg }) => (
		<Collapsible {...args} onOpenChange={(next: boolean) => setArg('defaultOpen', next)} class="w-[350px]">
			<CollapsibleTrigger class="w-full justify-between px-4">
				<span class="text-sm font-semibold">{title}</span>
				<span class="i-lucide-chevrons-up-down size-4" />
			</CollapsibleTrigger>
			<CollapsibleContent class="mt-2 flex flex-col gap-2">
				<div class="rounded-md edge px-4 py-2 font-mono text-sm">
					payments 3.2.1
				</div>
			</CollapsibleContent>
		</Collapsible>
	),
	play: async ({ canvas }) => {
		const details = root(canvas)
		if (!details?.open || !visible(content(canvas))) throw new Error('Default-open collapsible did not render open')
	},
}

export const InCard: Story<typeof Collapsible> = {
	args: {
		title: 'Deploy details',
		description: 'Commit and host for shop-web 1.4.2.',
	},
	render: ({ description, title, ...args }, { setArg }) => (
		<Card class="w-[380px]">
			<CardContent>
				<Collapsible {...args} onOpenChange={(next: boolean) => setArg('defaultOpen', next)}>
					<CollapsibleTrigger class="w-full justify-between text-start [&[data-state=open]_[data-collapsible-chevron]]:rotate-180">
						<span>
							<span class="block text-sm font-medium">{title}</span>
							<span class="block text-sm font-normal text-muted-foreground">{description}</span>
						</span>
						<span data-collapsible-chevron class="i-lucide-chevron-down size-4 transition-transform" />
					</CollapsibleTrigger>
					<CollapsibleContent class="mt-3">
						<div class="grid gap-2 rounded-md edge bg-muted/40 p-3 text-sm">
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Commit</span>
								<span>a41c9e2</span>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Host</span>
								<span>host-01</span>
							</div>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</CardContent>
		</Card>
	),
	play: async ({ canvas }) => flush(canvas),
}

export const AlwaysMounted: Story<typeof Collapsible> = {
	args: {
		title: 'Build log',
		content: 'The build log stays in the page while closed.',
	},
	render: ({ content: text, title, ...args }) => (
		<Collapsible {...args} class="w-[350px]">
			<CollapsibleTrigger class="w-full justify-between">
				<span class="text-sm font-semibold">{title}</span>
				<span class="i-lucide-chevrons-up-down size-4" />
			</CollapsibleTrigger>
			<CollapsibleContent class="mt-2 rounded-md edge bg-muted/40 p-3 text-sm">
				{text}
			</CollapsibleContent>
		</Collapsible>
	),
	play: async ({ canvas }) => {
		const summary = trigger(canvas)
		const panel = content(canvas)
		if (!summary || !panel) throw new Error('Collapsible did not render trigger and content')
		if (visible(panel) || panel.dataset.state !== 'closed') throw new Error('Closed content was not natively hidden while mounted')
		flush(canvas)

		summary.click()
		await frame()

		if (!visible(panel) || panel.getAttribute('data-state') !== 'open') throw new Error('Content did not show after click')
	},
}

export const Disabled: Story<typeof Collapsible> = {
	args: {
		disabled: true,
		title: 'Billing (owners only)',
	},
	render: ({ title, ...args }, { setArg }) => (
		<Collapsible {...args} onOpenChange={(next: boolean) => setArg('defaultOpen', next)} class="w-[350px]">
			<CollapsibleTrigger class="w-full justify-between">
				<span class="text-sm font-semibold">{title}</span>
				<span class="i-lucide-chevrons-up-down size-4" />
			</CollapsibleTrigger>
			<CollapsibleContent class="mt-2">
				<div class="rounded-md edge bg-muted/40 p-3 text-sm">Invoices and the payment method.</div>
			</CollapsibleContent>
		</Collapsible>
	),
	play: async ({ canvas }) => {
		const summary = trigger(canvas)
		if (!summary) throw new Error('Disabled collapsible trigger was not rendered')
		if (summary.getAttribute('aria-disabled') !== 'true') throw new Error('Disabled collapsible did not expose aria-disabled on its trigger')

		summary.click()
		await frame()

		if (root(canvas)?.open || visible(content(canvas))) throw new Error('Disabled collapsible opened after click')
	},
}

export const ExternalTrigger: Story = {
	render: () => <ExternalExample />,
	play: async ({ canvas }) => {
		const button = canvas.querySelector<HTMLButtonElement>('[data-slot="button"]')
		const panel = content(canvas)
		if (!button || !panel) throw new Error('External trigger story did not render button and content')
		if (visible(panel)) throw new Error('Externally controlled collapsible rendered open')

		button.click()
		await frame()

		if (!visible(panel) || !root(canvas)?.open) throw new Error('External button did not open the collapsible')
	},
}
