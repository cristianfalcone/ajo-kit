/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Input from '/src/ui/input'

export default {
	title: 'UI/Input',
	component: Input,
	args: {
		type: 'text',
		height: 'md',
		tone: 'default',
		width: 'full',
		label: 'Name',
		placeholder: 'Cristian Falcone',
		hint: '',
		disabled: false,
	},
	argTypes: {
		type: { control: 'select', options: ['text', 'email', 'password'] },
		height: { control: 'radio', options: ['md', 'lg'] },
		tone: { control: 'select', options: ['default', 'danger', 'muted'] },
		width: { control: 'select', options: ['full', 'sm', 'xs'] },
		label: { control: 'text' },
		placeholder: { control: 'text' },
		hint: { control: 'text' },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Labeled text-like input with shared field styling.' },
	},
} satisfies Meta<typeof Input>

export const Labeled: Story<typeof Input> = {}

export const PlaceholderOnly: Story<typeof Input> = {
	args: {
		label: '',
		placeholder: 'Search users',
	},
}

export const Email: Story<typeof Input> = {
	args: {
		type: 'email',
		label: 'Email',
		placeholder: 'you@example.com',
	},
}

export const Password: Story<typeof Input> = {
	args: {
		type: 'password',
		label: 'Password',
		placeholder: 'Enter password',
	},
}

export const Danger: Story<typeof Input> = {
	args: {
		tone: 'danger',
		label: 'Email',
		placeholder: 'bad-email',
		hint: 'Enter a valid email address.',
	},
}

export const Muted: Story<typeof Input> = {
	args: {
		tone: 'muted',
		label: 'Search',
		placeholder: 'Filter sessions',
	},
}

export const Widths: Story<typeof Input> = {
	render: args => (
		<div class="space-y-4">
			<Input {...args} width="full" label="Full width" placeholder="Full" />
			<Input {...args} width="sm" label="Small width" placeholder="Small" />
			<Input {...args} width="xs" label="Extra small width" placeholder="Extra small" />
		</div>
	),
}

export const Disabled: Story<typeof Input> = {
	args: {
		disabled: true,
		label: 'Account ID',
		placeholder: 'user_123',
		hint: 'This value is managed by the system.',
	},
}
