/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Button from '/src/ui/button'

export default {
	title: 'UI/Button',
	component: Button,
	args: {
		height: 'md',
		tone: 'primary',
		children: 'Save',
		wide: false,
		disabled: false,
	},
	argTypes: {
		children: { control: 'text', label: 'Text' },
		height: { control: 'radio', options: ['md', 'lg'] },
		tone: { control: 'select', options: ['primary', 'neutral', 'danger', 'warning'] },
		wide: { control: 'boolean' },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Shared button surface for form actions, links, and icon controls.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Button>

export const Primary: Story<typeof Button> = {}

export const Neutral: Story<typeof Button> = {
	args: { tone: 'neutral', children: 'Cancel' },
}

export const Danger: Story<typeof Button> = {
	args: { tone: 'danger', children: 'Delete' },
}

export const Warning: Story<typeof Button> = {
	args: { tone: 'warning', children: 'Disable' },
}

export const Large: Story<typeof Button> = {
	args: { height: 'lg', children: 'Create Account' },
}

export const Wide: Story<typeof Button> = {
	args: { wide: true, children: 'Continue' },
	parameters: { layout: 'padded' },
}

export const WithIcon: Story<typeof Button> = {
	args: { icon: 'i-lucide-plus', children: 'Create' },
	argTypes: {
		icon: { control: 'text' },
	},
}

export const IconOnly: Story<typeof Button> = {
	args: {
		children: undefined,
		icon: 'i-lucide-trash-2',
		title: 'Delete',
		tone: 'danger',
	},
	argTypes: {
		icon: { control: 'text' },
		title: { control: 'text' },
	},
}

export const LinkMode: Story<typeof Button> = {
	args: { to: '/dashboard', tone: 'neutral', children: 'Go to dashboard' },
}

export const DisabledLink: Story<typeof Button> = {
	args: { to: '/dashboard', tone: 'neutral', disabled: true, children: 'Unavailable' },
}
