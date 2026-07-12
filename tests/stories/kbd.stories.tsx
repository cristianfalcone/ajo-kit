/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Button from '/src/ui/button'
import { Kbd, KbdGroup } from '/src/ui/kbd'

export default {
	title: 'UI/Kbd',
	component: Kbd,
	args: {
		children: 'Ctrl',
	},
	argTypes: {
		children: { control: 'text', label: 'Key' },
	},
	parameters: {
		docs: { description: 'Semantic keyboard input markers using native kbd elements.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Kbd>

export const Basic: Story = {
	play: async ({ canvas }) => {
		const key = canvas.querySelector<HTMLElement>('[data-slot="kbd"]')
		if (!key || key.tagName !== 'KBD' || key.textContent !== 'Ctrl') {
			throw new Error('Kbd key was not rendered as a native kbd element')
		}
	},
}

export const Group: Story = {
	args: { first: 'Ctrl', second: 'K' },
	argTypes: {
		children: { control: false },
	},
	render: args => (
		<KbdGroup>
			<Kbd>{args.first}</Kbd>
			<span>+</span>
			<Kbd>{args.second}</Kbd>
		</KbdGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="kbd-group"]')
		const keys = canvas.querySelectorAll('[data-slot="kbd"]')
		if (!group || group.tagName !== 'KBD' || keys.length !== 2) {
			throw new Error('Kbd group was not rendered with nested keys')
		}
	},
}

export const InButton: Story = {
	args: { label: 'Accept', children: 'Enter' },
	render: args => (
		<Button variant="outline">
			{args.label}
			<Kbd>{args.children}</Kbd>
		</Button>
	),
	play: async ({ canvas }) => {
		const button = canvas.querySelector<HTMLButtonElement>('[data-slot="button"]')
		const key = canvas.querySelector<HTMLElement>('[data-slot="kbd"]')
		if (!button || !key || !button.contains(key)) {
			throw new Error('Kbd was not rendered inside a button')
		}
	},
}
