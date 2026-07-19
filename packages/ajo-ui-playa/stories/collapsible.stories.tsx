/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import Button from 'ajo-ui-playa/button'
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

const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const root = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLDetailsElement>('details[data-slot="collapsible"]')

const content = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="collapsible-content"]')

const trigger = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]')

const visible = (element: HTMLElement | null) =>
	Boolean(element?.checkVisibility())

const ControlledExample: Stateful = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	while (true) yield (
		<div class="w-[350px] space-y-3">
			<Collapsible open={open} onOpenChange={setOpen} class="space-y-2">
				<CollapsibleTrigger class="w-full justify-between">
					<span class="text-sm font-medium">Advanced settings</span>
					<span class="i-lucide-chevrons-up-down size-4" />
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div class="rounded-md edge bg-muted/40 p-3 text-sm">
						Controlled content is open.
					</div>
				</CollapsibleContent>
			</Collapsible>
			<p data-collapsible-value="true" class="text-sm text-muted-foreground">Open: {open ? 'yes' : 'no'}</p>
		</div>
	)
}

const ExternalExample: Stateful = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	while (true) yield (
		<div class="w-[350px] space-y-3">
			<Button variant="outline" set:onclick={() => setOpen(!open)}>
				{open ? 'Hide' : 'Show'} details
			</Button>
			<Collapsible open={open} onOpenChange={setOpen}>
				<CollapsibleTrigger>Details</CollapsibleTrigger>
				<CollapsibleContent class="rounded-md edge bg-muted/40 p-3 text-sm">
					External buttons can control the root through the `open` arg.
				</CollapsibleContent>
			</Collapsible>
		</div>
	)
}

export const Basic: Story<typeof Collapsible> = {
	args: {
		title: '@peduarte starred 3 repositories',
	},
	render: ({ title, ...args }) => (
		<Collapsible {...args} class="flex w-[350px] flex-col gap-2">
			<CollapsibleTrigger class="w-full justify-between px-4">
				<span class="text-sm font-semibold">{title}</span>
				<span class="i-lucide-chevrons-up-down size-4" />
			</CollapsibleTrigger>
			<CollapsibleContent class="flex flex-col gap-2">
				<div class="rounded-md edge px-4 py-2 font-mono text-sm">
					@radix-ui/colors
				</div>
				<div class="rounded-md edge px-4 py-2 font-mono text-sm">
					@stitches/react
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

		summary.click()
		await waitFrame()

		if (!details.open || !visible(panel)) throw new Error('Collapsible content did not show after click')
		if (details.dataset.state !== 'open' || summary.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Collapsible did not expose open state after click')
		}
	},
}

export const DefaultOpen: Story<typeof Collapsible> = {
	args: {
		defaultOpen: true,
		title: 'Visible by default',
	},
	render: ({ title, ...args }, { setArg }) => (
		<Collapsible {...args} onOpenChange={(next: boolean) => setArg('defaultOpen', next)} class="flex w-[350px] flex-col gap-2">
			<CollapsibleTrigger class="w-full justify-between px-4">
				<span class="text-sm font-semibold">{title}</span>
				<span class="i-lucide-chevrons-up-down size-4" />
			</CollapsibleTrigger>
			<CollapsibleContent class="flex flex-col gap-2">
				<div class="rounded-md edge px-4 py-2 font-mono text-sm">
					@radix-ui/primitives
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
		title: 'Product details',
		description: 'Show extra metadata.',
	},
	render: ({ description, title, ...args }, { setArg }) => (
		<Card class="w-[380px]">
			<CardContent>
				<Collapsible {...args} onOpenChange={(next: boolean) => setArg('defaultOpen', next)} class="space-y-3">
					<CollapsibleTrigger class="w-full justify-between text-left [&[data-state=open]_[data-collapsible-chevron]]:rotate-180">
						<span>
							<span class="block text-sm font-medium">{title}</span>
							<span class="block text-sm font-normal text-muted-foreground">{description}</span>
						</span>
						<span data-collapsible-chevron class="i-lucide-chevron-down size-4 transition-transform" />
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div class="grid gap-2 rounded-md edge bg-muted/40 p-3 text-sm">
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Status</span>
								<span>Shipped</span>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Order</span>
								<span>#4189</span>
							</div>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</CardContent>
		</Card>
	),
}

export const AlwaysMounted: Story<typeof Collapsible> = {
	args: {
		title: 'Native panel',
		content: 'This content stays in the DOM while closed.',
	},
	render: ({ content: text, title, ...args }) => (
		<Collapsible {...args} class="w-[350px] space-y-2">
			<CollapsibleTrigger class="w-full justify-between">
				<span class="text-sm font-semibold">{title}</span>
				<span class="i-lucide-chevrons-up-down size-4" />
			</CollapsibleTrigger>
			<CollapsibleContent class="rounded-md edge bg-muted/40 p-3 text-sm">
				{text}
			</CollapsibleContent>
		</Collapsible>
	),
	play: async ({ canvas }) => {
		const summary = trigger(canvas)
		const panel = content(canvas)
		if (!summary || !panel) throw new Error('Collapsible did not render trigger and content')
		if (visible(panel) || panel.dataset.state !== 'closed') throw new Error('Closed content was not natively hidden while mounted')

		summary.click()
		await waitFrame()

		if (!visible(panel) || panel.getAttribute('data-state') !== 'open') throw new Error('Content did not show after click')
	},
}

export const Disabled: Story<typeof Collapsible> = {
	args: {
		disabled: true,
		title: 'Disabled panel',
	},
	render: ({ title, ...args }, { setArg }) => (
		<Collapsible {...args} onOpenChange={(next: boolean) => setArg('defaultOpen', next)} class="w-[350px] space-y-2">
			<CollapsibleTrigger class="w-full justify-between">
				<span class="text-sm font-semibold">{title}</span>
				<span class="i-lucide-chevrons-up-down size-4" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div class="rounded-md edge bg-muted/40 p-3 text-sm">This should stay closed.</div>
			</CollapsibleContent>
		</Collapsible>
	),
	play: async ({ canvas }) => {
		const summary = trigger(canvas)
		if (!summary) throw new Error('Disabled collapsible trigger was not rendered')
		if (summary.getAttribute('aria-disabled') !== 'true') throw new Error('Disabled collapsible did not expose aria-disabled on its trigger')

		summary.click()
		await waitFrame()

		if (root(canvas)?.open || visible(content(canvas))) throw new Error('Disabled collapsible opened after click')
	},
}

export const Controlled: Story = {
	argTypes: {
		defaultOpen: { control: false },
		disabled: { control: false },
	},
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const summary = trigger(canvas)
		if (!summary) throw new Error('Controlled collapsible trigger was not rendered')
		if (!canvas.textContent?.includes('Open: no')) throw new Error('Controlled collapsible rendered wrong initial state')

		summary.click()
		await waitFrame()

		if (!canvas.textContent?.includes('Open: yes') || !visible(content(canvas))) {
			throw new Error('Controlled collapsible did not update parent state after click')
		}
	},
}

export const ExternalTrigger: Story = {
	argTypes: {
		defaultOpen: { control: false },
		disabled: { control: false },
	},
	render: () => <ExternalExample />,
	play: async ({ canvas }) => {
		const button = canvas.querySelector<HTMLButtonElement>('[data-slot="button"]')
		const panel = content(canvas)
		if (!button || !panel) throw new Error('External trigger story did not render button and content')
		if (visible(panel)) throw new Error('Externally controlled collapsible rendered open')

		button.click()
		await waitFrame()

		if (!visible(panel) || !root(canvas)?.open) throw new Error('External button did not open the collapsible')
	},
}
