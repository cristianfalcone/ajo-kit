/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { frame } from './play'
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
		defaultValue: 'backups',
		disabled: false,
	},
	argTypes: {
		type: { control: 'radio', options: ['single', 'multiple'] },
		collapsible: { control: 'boolean' },
		defaultValue: { control: 'select', options: ['', 'backups', 'domains', 'secrets'] },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Disclosure group with Ajo Kit slots, Ajo state, and native details/summary semantics.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Accordion>

const item = (canvas: HTMLElement, value: string) =>
	canvas.querySelector<HTMLDetailsElement>(`details[data-slot="accordion-item"][data-value="${value}"]`)

const trigger = (canvas: HTMLElement, text: string) =>
	Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]'))
		.find(element => element.textContent?.includes(text))

const FaqItems = () => (
	<>
		<AccordionItem value="backups">
			<AccordionTrigger>Backups</AccordionTrigger>
			<AccordionContent>
				The host saves every app, domain and secret at 03:00 and keeps the last 14 days.
			</AccordionContent>
		</AccordionItem>
		<AccordionItem value="domains">
			<AccordionTrigger>Domains</AccordionTrigger>
			<AccordionContent>
				Point the domain's DNS at the host, then add it to an app to get its certificate.
			</AccordionContent>
		</AccordionItem>
		<AccordionItem value="secrets">
			<AccordionTrigger>Secrets</AccordionTrigger>
			<AccordionContent>
				An app reads its secrets as environment variables. Changing one restarts the app.
			</AccordionContent>
		</AccordionItem>
	</>
)

export const Basic: Story<typeof Accordion> = {
	render: args => (
		<Accordion {...args} class="w-96">
			<FaqItems />
		</Accordion>
	),
	play: async ({ canvas }) => {
		const backups = item(canvas, 'backups')
		const domains = item(canvas, 'domains')
		const domainsTrigger = trigger(canvas, 'Domains')
		if (!backups || !domains || !domainsTrigger) throw new Error('Basic accordion did not render expected items')
		if (!backups.open || backups.dataset.state !== 'open') throw new Error('Default accordion item was not open')

		domainsTrigger.click()
		await frame()

		if (backups.open || !domains.open) throw new Error('Single accordion did not move the open item after click')
		if (domainsTrigger.getAttribute('aria-expanded') !== 'true') throw new Error('Accordion trigger did not expose expanded state')
	},
}

export const Multiple: Story<typeof Accordion> = {
	args: {
		type: 'multiple',
		defaultValue: ['backups'],
	},
	argTypes: {
		defaultValue: { control: 'multi-select', options: ['backups', 'domains', 'secrets'] },
	},
	render: args => (
		<Accordion {...args} class="w-96">
			<FaqItems />
		</Accordion>
	),
	play: async ({ canvas }) => {
		const backups = item(canvas, 'backups')
		const domains = item(canvas, 'domains')
		const domainsTrigger = trigger(canvas, 'Domains')
		if (!backups || !domains || !domainsTrigger) throw new Error('Multiple accordion did not render expected items')

		domainsTrigger.click()
		await frame()

		if (!backups.open || !domains.open) throw new Error('Multiple accordion did not keep both items open')
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
		const backups = item(canvas, 'backups')
		const backupsTrigger = trigger(canvas, 'Backups')
		if (!backups || !backupsTrigger) throw new Error('Non-collapsible accordion did not render expected item')
		if (backupsTrigger.getAttribute('aria-disabled') !== 'true') {
			throw new Error('Open non-collapsible trigger did not expose aria-disabled')
		}

		backupsTrigger.click()
		await frame()

		if (!backups.open) throw new Error('Non-collapsible accordion closed its required open item')
		// Locked open is not disabled: the open item keeps its full strength.
		if (getComputedStyle(backupsTrigger).opacity !== '1') throw new Error('Open non-collapsible trigger is dimmed as if disabled')
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
		await frame()

		if (disabled.open) throw new Error('Disabled accordion item opened after click')
		if (disabledTrigger.getAttribute('aria-disabled') !== 'true') throw new Error('Disabled trigger did not expose aria-disabled')
		if (getComputedStyle(disabledTrigger).opacity === '1') throw new Error('Disabled trigger is not dimmed')
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

export const Keyboard: Story<typeof Accordion> = {
	render: (args, { setArg }) => (
		<Accordion {...args} onValueChange={(next: string) => setArg('defaultValue', next)} class="w-96">
			<FaqItems />
		</Accordion>
	),
	play: async ({ canvas }) => {
		const backups = trigger(canvas, 'Backups')
		const domains = trigger(canvas, 'Domains')
		const secrets = trigger(canvas, 'Secrets')
		if (!backups || !domains || !secrets) throw new Error('Keyboard accordion triggers were not rendered')

		backups.focus()
		backups.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		await frame()

		if (document.activeElement !== domains) throw new Error('Accordion ArrowDown did not move focus to next trigger')

		domains.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
		await frame()

		if (document.activeElement !== secrets) throw new Error('Accordion End did not move focus to last trigger')
	},
}
