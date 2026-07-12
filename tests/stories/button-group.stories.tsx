/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Button from '/src/ui/button'
import {
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
} from '/src/ui/button-group'
import Input from '/src/ui/input'

export default {
	title: 'UI/Button Group',
	component: ButtonGroup,
	args: {
		orientation: 'horizontal',
	},
	argTypes: {
		orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
	},
	parameters: {
		docs: { description: 'Grouped controls with horizontal/vertical orientation, separators, and text segments.' },
		layout: 'centered',
	},
} satisfies Meta<typeof ButtonGroup>

export const Basic: Story = {
	render: args => (
		<ButtonGroup {...args} aria-label="Message actions">
			<Button variant="outline">Archive</Button>
			<Button variant="outline">Report</Button>
			<Button variant="outline">Snooze</Button>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="button-group"]')
		const buttons = canvas.querySelectorAll('[data-slot="button"]')
		if (!group || buttons.length !== 3) throw new Error('Button group was not rendered')

		if (group.getAttribute('role') !== 'group' || group.getAttribute('data-orientation') !== 'horizontal') {
			throw new Error('Button group should expose group role and horizontal orientation')
		}
	},
}

export const Vertical: Story = {
	argTypes: { orientation: { control: false } },
	render: () => (
		<ButtonGroup orientation="vertical" aria-label="Zoom controls">
			<Button variant="outline" size="icon" aria-label="Zoom in">
				<span aria-hidden="true" class="i-lucide-plus size-4" />
			</Button>
			<Button variant="outline" size="icon" aria-label="Zoom out">
				<span aria-hidden="true" class="i-lucide-minus size-4" />
			</Button>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="button-group"]')
		if (!group || group.getAttribute('data-orientation') !== 'vertical') {
			throw new Error('Vertical button group was not rendered')
		}
	},
}

export const WithSeparator: Story = {
	argTypes: { orientation: { control: false } },
	render: () => (
		<ButtonGroup>
			<Button variant="secondary" size="sm">Copy</Button>
			<ButtonGroupSeparator />
			<Button variant="secondary" size="sm">Paste</Button>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const separator = canvas.querySelector<HTMLElement>('[data-slot="button-group-separator"]')
		if (!separator || separator.getAttribute('aria-hidden') !== 'true' || separator.getAttribute('data-orientation') !== 'vertical') {
			throw new Error('Button group separator was not rendered')
		}
	},
}

export const WithInput: Story = {
	argTypes: { orientation: { control: false } },
	render: () => (
		<ButtonGroup>
			<ButtonGroupText as="label" for="button-group-search">
				<span aria-hidden="true" class="i-lucide-search size-4" />
				Search
			</ButtonGroupText>
			<Input id="button-group-search" placeholder="Search..." />
			<Button variant="outline">Submit</Button>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const label = canvas.querySelector<HTMLLabelElement>('label[data-slot="button-group-text"]')
		const input = canvas.querySelector<HTMLInputElement>('#button-group-search')
		if (!label || !input || label.htmlFor !== 'button-group-search') {
			throw new Error('Button group text label or input was not rendered')
		}
	},
}

export const Nested: Story = {
	argTypes: { orientation: { control: false } },
	render: () => (
		<ButtonGroup aria-label="Toolbar">
			<ButtonGroup>
				<Button variant="outline" size="icon" aria-label="Back">
					<span aria-hidden="true" class="i-lucide-arrow-left size-4" />
				</Button>
			</ButtonGroup>
			<ButtonGroup>
				<Button variant="outline">Archive</Button>
				<Button variant="outline">Report</Button>
			</ButtonGroup>
			<ButtonGroup>
				<Button variant="outline">Snooze</Button>
				<Button variant="outline" size="icon" aria-label="More">
					<span aria-hidden="true" class="i-lucide-more-horizontal size-4" />
				</Button>
			</ButtonGroup>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const groups = canvas.querySelectorAll('[data-slot="button-group"]')
		if (groups.length !== 4) {
			throw new Error('Nested button groups were not rendered')
		}
	},
}
