/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import Chip, { chipVariants } from '/src/ui/chip'

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

export default {
	title: 'UI/Chip',
	component: Chip,
	args: {
		variant: 'default',
		children: 'Chip',
	},
	argTypes: {
		variant: { control: 'select', options: ['default', 'secondary', 'danger', 'success', 'warning', 'info', 'outline', 'ghost', 'link'] },
		children: { control: 'text', label: 'Text' },
	},
	parameters: {
		docs: { description: 'Compact inline token matching the Ajo Kit Chip API.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Chip>

export const Default: Story<typeof Chip> = {}

export const Secondary: Story<typeof Chip> = {
	args: { variant: 'secondary', children: 'Secondary' },
}

export const Danger: Story<typeof Chip> = {
	args: { variant: 'danger', children: 'Danger' },
}

export const Outline: Story<typeof Chip> = {
	args: { variant: 'outline', children: 'Outline' },
}

export const Ghost: Story<typeof Chip> = {
	args: { variant: 'ghost', children: 'Ghost' },
}

export const Success: Story<typeof Chip> = {
	args: { variant: 'success', children: 'Success' },
}

export const Warning: Story<typeof Chip> = {
	args: { variant: 'warning', children: 'Warning' },
}

export const Info: Story<typeof Chip> = {
	args: { variant: 'info', children: 'Info' },
}

export const Link: Story<typeof Chip> = {
	args: { variant: 'link', children: 'Link' },
}

export const Variants: Story<typeof Chip> = {
	argTypes: {
		children: { control: false },
		variant: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			<Chip {...args} variant="default">Default</Chip>
			<Chip {...args} variant="secondary">Secondary</Chip>
			<Chip {...args} variant="danger">Danger</Chip>
			<Chip {...args} variant="success">Success</Chip>
			<Chip {...args} variant="warning">Warning</Chip>
			<Chip {...args} variant="info">Info</Chip>
			<Chip {...args} variant="outline">Outline</Chip>
			<Chip {...args} variant="ghost">Ghost</Chip>
		</div>
	),
}

export const WithIcon: Story<typeof Chip> = {
	args: { variant: 'secondary' },
	argTypes: {
		children: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			<Chip {...args}>
				<span class="i-lucide-check-circle" data-icon="inline-start" />
				Verified
			</Chip>
			<Chip {...args} variant="outline">
				Bookmark
				<span class="i-lucide-bookmark" data-icon="inline-end" />
			</Chip>
		</div>
	),
}

export const Counts: Story<typeof Chip> = {
	args: { variant: 'danger' },
	argTypes: {
		children: { control: false },
	},
	render: args => (
		<div class="flex items-center gap-3">
			<Chip {...args} class="min-w-5 h-5 px-1.5 text-[10px] font-bold">3</Chip>
			<Chip {...args} class="min-w-5 h-5 px-1.5 text-[10px] font-bold">42</Chip>
			<Chip {...args} class="min-w-5 h-5 px-1.5 text-[10px] font-bold">999</Chip>
		</div>
	),
}

const RemovableExample: Stateful = function* () {
	let tags = ['Ajo', 'UnoCSS', 'Vite']
	const remove = (tag: string) => this.next(() => tags = tags.filter(item => item !== tag))

	while (true) yield (
		<div class="flex flex-wrap items-center gap-2">
			{tags.map(tag => (
				<Chip key={tag} variant="secondary" onRemove={() => remove(tag)}>{tag}</Chip>
			))}
		</div>
	)
}

export const Removable: Story<typeof Chip> = {
	argTypes: {
		children: { control: false },
		variant: { control: false },
	},
	render: () => <RemovableExample />,
	play: async ({ canvas }) => {
		const chips = () => canvas.querySelectorAll('[data-slot="chip"]').length
		const before = chips()

		const remove = canvas.querySelector<HTMLButtonElement>('[data-slot="chip-remove"]')
		if (!remove) throw new Error('Chip remove button was not rendered')

		remove.click()
		await frame()

		if (chips() !== before - 1) throw new Error('Chip was not removed')
	},
}

export const Anchor: Story<typeof Chip> = {
	args: {
		as: 'a',
		href: '/dashboard',
		variant: 'outline',
		children: 'Open link',
	},
}

export const VariantsHelper: Story = {
	render: () => (
		<a href="/dashboard" class={chipVariants({ variant: 'outline' })}>
			Link styled with chipVariants
		</a>
	),
}
