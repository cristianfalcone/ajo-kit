/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { Button, buttonVariants } from 'ajo-ui-playa/button'

const variants = ['default', 'danger', 'danger-ghost', 'outline', 'secondary', 'ghost', 'muted-ghost', 'link'] as const

export default {
	title: 'UI/Button',
	component: Button,
	args: {
		variant: 'default',
		size: 'default',
		children: 'Button',
		disabled: false,
	},
	argTypes: {
		children: { control: 'text', label: 'Text' },
		variant: { control: 'select', options: variants },
		size: { control: 'select', options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Interactive action surface matching the Ajo Kit Button API.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Button>

export const Default: Story<typeof Button> = {}

export const Variants: Story<typeof Button> = {
	argTypes: {
		children: { control: false },
		variant: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			{variants.map(variant => <Button key={variant} {...args} variant={variant}>{variant}</Button>)}
		</div>
	),
}

export const Sizes: Story<typeof Button> = {
	argTypes: {
		children: { control: false },
		size: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			<Button {...args} size="xs">Extra small</Button>
			<Button {...args} size="sm">Small</Button>
			<Button {...args} size="default">Default</Button>
			<Button {...args} size="lg">Large</Button>
		</div>
	),
}

export const WithIcon: Story<typeof Button> = {
	argTypes: {
		children: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			<Button {...args}>
				<span class="i-lucide-plus" />
				Create
			</Button>
			<Button {...args} variant="outline">
				Download
				<span class="i-lucide-chevron-right" />
			</Button>
		</div>
	),
}

export const IconOnly: Story<typeof Button> = {
	argTypes: {
		children: { control: false },
		size: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			<Button {...args} size="icon" aria-label="Add">
				<span class="i-lucide-plus" />
			</Button>
			<Button {...args} size="icon-sm" aria-label="Delete">
				<span class="i-lucide-trash-2" />
			</Button>
			<Button {...args} size="icon-lg" aria-label="Remove">
				<span class="i-lucide-x" />
			</Button>
		</div>
	),
}

export const Anchor: Story<typeof Button> = {
	args: {
		as: 'a',
		href: '/dashboard',
		variant: 'outline',
		children: 'Go to dashboard',
	},
}

export const DisabledAnchor: Story<typeof Button> = {
	args: {
		as: 'a',
		href: '/dashboard',
		variant: 'outline',
		disabled: true,
		children: 'Unavailable',
	},
}

export const VariantsHelper: Story = {
	render: () => (
		<a href="/dashboard" class={buttonVariants({ variant: 'link' })}>
			Link styled with buttonVariants
		</a>
	),
}
