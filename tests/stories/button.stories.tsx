/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Button, { buttonVariants } from '/src/ui/button'

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
		variant: { control: 'select', options: ['default', 'danger', 'danger-ghost', 'outline', 'secondary', 'ghost', 'muted-ghost', 'link'] },
		size: { control: 'select', options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Interactive action surface matching the Ajo Kit Button API.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Button>

export const Default: Story<typeof Button> = {}

export const Secondary: Story<typeof Button> = {
	args: { variant: 'secondary', children: 'Secondary' },
}

export const Danger: Story<typeof Button> = {
	args: { variant: 'danger', children: 'Delete' },
}

export const DangerGhost: Story<typeof Button> = {
	args: { variant: 'danger-ghost', children: 'Delete' },
	play: async ({ canvas }) => {
		const button = canvas.querySelector<HTMLButtonElement>('[data-variant="danger-ghost"]')
		if (!button || !button.classList.contains('text-danger') || button.classList.contains('text-foreground')) {
			throw new Error('Danger ghost button lost single-owner destructive color')
		}
		if (!button.classList.contains('focus-visible:ring-danger/40') || button.classList.contains('focus-visible:ring-ring/50')) {
			throw new Error('Danger ghost button lost single-owner destructive focus ring')
		}
		if (getComputedStyle(button).boxShadow !== 'none') {
			throw new Error('Danger ghost button unexpectedly inherited an elevated shadow')
		}
	},
}

export const MutedGhost: Story<typeof Button> = {
	args: { variant: 'muted-ghost', children: 'Quiet action' },
	play: async ({ canvas }) => {
		const button = canvas.querySelector<HTMLButtonElement>('[data-variant="muted-ghost"]')
		if (!button || !button.classList.contains('text-muted-foreground') || button.classList.contains('text-foreground')) {
			throw new Error('Muted ghost button lost single-owner muted color')
		}
	},
}

export const Outline: Story<typeof Button> = {
	args: { variant: 'outline', children: 'Cancel' },
}

export const Ghost: Story<typeof Button> = {
	args: { variant: 'ghost', children: 'Ghost' },
}

export const Link: Story<typeof Button> = {
	args: { variant: 'link', children: 'Open link' },
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
