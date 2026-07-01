/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Feedback from '/src/ui/feedback'

export default {
	title: 'UI/Feedback',
	component: Feedback,
	args: {
		tone: 'danger',
		children: 'Email is required.',
	},
	argTypes: {
		tone: { control: 'select', options: ['danger', 'success'] },
		children: { control: 'text', label: 'Text' },
	},
	parameters: {
		docs: { description: 'Compact inline form feedback.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Feedback>

export const Danger: Story<typeof Feedback> = {}

export const Success: Story<typeof Feedback> = {
	args: {
		tone: 'success',
		children: 'Verification email sent.',
	},
}

export const LongText: Story<typeof Feedback> = {
	args: {
		children: 'Password must be at least eight characters and include a mix of letters, numbers, and symbols.',
	},
}
