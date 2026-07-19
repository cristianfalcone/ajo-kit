/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from 'ajo-ui-playa/accordion'
import { Card, CardContent } from 'ajo-ui-playa/card'

export default {
	title: 'UI/Accordion',
	component: Accordion,
	args: {
		type: 'single',
		collapsible: true,
		defaultValue: 'shipping',
		disabled: false,
	},
	argTypes: {
		type: { control: 'radio', options: ['single', 'multiple'] },
		collapsible: { control: 'boolean' },
		defaultValue: { control: 'select', options: ['', 'shipping', 'returns', 'support'] },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Disclosure group with Ajo Kit slots, Ajo state, and native details/summary semantics.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Accordion>

const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const item = (canvas: HTMLElement, value: string) =>
	canvas.querySelector<HTMLDetailsElement>(`details[data-slot="accordion-item"][data-value="${value}"]`)

const trigger = (canvas: HTMLElement, text: string) =>
	Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]'))
		.find(element => element.textContent?.includes(text))

const FaqItems = () => (
	<>
		<AccordionItem value="shipping">
			<AccordionTrigger>Shipping</AccordionTrigger>
			<AccordionContent>
				Orders usually ship within two business days.
			</AccordionContent>
		</AccordionItem>
		<AccordionItem value="returns">
			<AccordionTrigger>Returns</AccordionTrigger>
			<AccordionContent>
				Return unopened items within 30 days for a refund.
			</AccordionContent>
		</AccordionItem>
		<AccordionItem value="support">
			<AccordionTrigger>Support</AccordionTrigger>
			<AccordionContent>
				Support is available on weekdays from 9:00 to 18:00.
			</AccordionContent>
		</AccordionItem>
	</>
)

const ControlledExample: Stateful = function* () {
	let value = 'details'
	const setValue = (next: string) => this.next(() => value = next)

	while (true) yield (
		<div class="w-96 space-y-3">
			<Accordion type="single" collapsible value={value} onValueChange={setValue}>
				<AccordionItem value="details">
					<AccordionTrigger>Details</AccordionTrigger>
					<AccordionContent>
						Controlled accordions receive value from the parent state.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="billing">
					<AccordionTrigger>Billing</AccordionTrigger>
					<AccordionContent>
						The callback updates Ajo state and rerenders the selected panel.
					</AccordionContent>
				</AccordionItem>
			</Accordion>
			<p data-accordion-value="true" class="text-sm text-muted-foreground">Open: {value || 'none'}</p>
		</div>
	)
}

export const Basic: Story<typeof Accordion> = {
	render: args => (
		<Accordion {...args} class="w-96">
			<FaqItems />
		</Accordion>
	),
	play: async ({ canvas }) => {
		const shipping = item(canvas, 'shipping')
		const returns = item(canvas, 'returns')
		const returnsTrigger = trigger(canvas, 'Returns')
		if (!shipping || !returns || !returnsTrigger) throw new Error('Basic accordion did not render expected items')
		if (!shipping.open || shipping.dataset.state !== 'open') throw new Error('Default accordion item was not open')

		returnsTrigger.click()
		await waitFrame()

		if (shipping.open || !returns.open) throw new Error('Single accordion did not move the open item after click')
		if (returnsTrigger.getAttribute('aria-expanded') !== 'true') throw new Error('Accordion trigger did not expose expanded state')
	},
}

export const Multiple: Story<typeof Accordion> = {
	args: {
		type: 'multiple',
		defaultValue: ['shipping'],
	},
	argTypes: {
		defaultValue: { control: 'multi-select', options: ['shipping', 'returns', 'support'] },
	},
	render: args => (
		<Accordion {...args} class="w-96">
			<FaqItems />
		</Accordion>
	),
	play: async ({ canvas }) => {
		const shipping = item(canvas, 'shipping')
		const returns = item(canvas, 'returns')
		const returnsTrigger = trigger(canvas, 'Returns')
		if (!shipping || !returns || !returnsTrigger) throw new Error('Multiple accordion did not render expected items')

		returnsTrigger.click()
		await waitFrame()

		if (!shipping.open || !returns.open) throw new Error('Multiple accordion did not keep both items open')
	},
}

export const NonCollapsible: Story<typeof Accordion> = {
	args: {
		collapsible: false,
	},
	render: args => (
		<Accordion {...args} class="w-96">
			<FaqItems />
		</Accordion>
	),
	play: async ({ canvas }) => {
		const shipping = item(canvas, 'shipping')
		const shippingTrigger = trigger(canvas, 'Shipping')
		if (!shipping || !shippingTrigger) throw new Error('Non-collapsible accordion did not render expected item')
		if (shippingTrigger.getAttribute('aria-disabled') !== 'true') {
			throw new Error('Open non-collapsible trigger did not expose aria-disabled')
		}

		shippingTrigger.click()
		await waitFrame()

		if (!shipping.open) throw new Error('Non-collapsible accordion closed its required open item')
	},
}

export const Disabled: Story<typeof Accordion> = {
	args: {
		defaultValue: '',
	},
	argTypes: {
		defaultValue: { control: 'select', options: ['', 'enabled', 'disabled'] },
	},
	render: (args, { setArg }) => (
		<Accordion {...args} onValueChange={(next: string) => setArg('defaultValue', next)} class="w-96">
			<AccordionItem value="enabled">
				<AccordionTrigger>Enabled</AccordionTrigger>
				<AccordionContent>This item can open.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="disabled" disabled>
				<AccordionTrigger>Disabled</AccordionTrigger>
				<AccordionContent>This item should not open.</AccordionContent>
			</AccordionItem>
		</Accordion>
	),
	play: async ({ canvas }) => {
		const disabled = item(canvas, 'disabled')
		const disabledTrigger = trigger(canvas, 'Disabled')
		if (!disabled || !disabledTrigger) throw new Error('Disabled accordion item was not rendered')

		disabledTrigger.click()
		await waitFrame()

		if (disabled.open) throw new Error('Disabled accordion item opened after click')
		if (disabledTrigger.getAttribute('aria-disabled') !== 'true') throw new Error('Disabled trigger did not expose aria-disabled')
	},
}

export const InCard: Story<typeof Accordion> = {
	render: (args, { setArg }) => (
		<Card class="w-96">
			<CardContent>
				<Accordion {...args} onValueChange={(next: string) => setArg('defaultValue', next)}>
					<FaqItems />
				</Accordion>
			</CardContent>
		</Card>
	),
}

export const Controlled: Story = {
	argTypes: {
		type: { control: false },
		collapsible: { control: false },
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const billing = trigger(canvas, 'Billing')
		if (!billing) throw new Error('Controlled accordion trigger was not rendered')

		billing.click()
		await waitFrame()

		if (!canvas.textContent?.includes('Open: billing')) {
			throw new Error('Controlled accordion did not update parent state after click')
		}
	},
}

export const Keyboard: Story<typeof Accordion> = {
	render: (args, { setArg }) => (
		<Accordion {...args} onValueChange={(next: string) => setArg('defaultValue', next)} class="w-96">
			<FaqItems />
		</Accordion>
	),
	play: async ({ canvas }) => {
		const shipping = trigger(canvas, 'Shipping')
		const returns = trigger(canvas, 'Returns')
		const support = trigger(canvas, 'Support')
		if (!shipping || !returns || !support) throw new Error('Keyboard accordion triggers were not rendered')

		shipping.focus()
		shipping.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		await waitFrame()

		if (document.activeElement !== returns) throw new Error('Accordion ArrowDown did not move focus to next trigger')

		returns.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
		await waitFrame()

		if (document.activeElement !== support) throw new Error('Accordion End did not move focus to last trigger')
	},
}
