/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Panel from '/src/ui/panel'

export default {
	title: 'UI/Panel',
	component: Panel,
	args: {
		variant: 'glass',
		padding: 'md',
		radius: 'lg',
		clip: false,
	},
	argTypes: {
		variant: { control: 'radio', options: ['glass', 'solid'] },
		padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
		radius: { control: 'radio', options: ['lg', 'xl'] },
		clip: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Shared surface for app cards, forms, and framed content.' },
	},
} satisfies Meta<typeof Panel>

const Content = () => (
	<div>
		<p class="text-sm font-semibold text-slate-900 dark:text-white">Account summary</p>
		<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Reusable surface for dense application content.</p>
	</div>
)

export const Glass: Story<typeof Panel> = {
	render: args => <Panel {...args}><Content /></Panel>,
}

export const Solid: Story<typeof Panel> = {
	args: { variant: 'solid' },
	render: args => <Panel {...args}><Content /></Panel>,
}

export const PaddingVariants: Story<typeof Panel> = {
	render: args => (
		<div class="grid gap-4 md:grid-cols-2">
			<Panel {...args} padding="sm"><Content /></Panel>
			<Panel {...args} padding="md"><Content /></Panel>
			<Panel {...args} padding="lg"><Content /></Panel>
			<Panel {...args} padding="none"><div class="p-4"><Content /></div></Panel>
		</div>
	),
}

export const Anchor: Story<typeof Panel> = {
	render: args => (
		<Panel {...args} as="a" href="/dashboard" class="block">
			<Content />
		</Panel>
	),
}

export const Section: Story<typeof Panel> = {
	render: args => (
		<Panel {...args} as="section">
			<Content />
		</Panel>
	),
}

export const Clipped: Story<typeof Panel> = {
	args: { clip: true, padding: 'none' },
	render: args => (
		<Panel {...args}>
			<div class="bg-accent/15 px-4 py-2 text-sm font-medium text-primary dark:text-accent">Header band</div>
			<div class="p-4"><Content /></div>
		</Panel>
	),
}
