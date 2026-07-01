/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Badge, { CountBadge } from '/src/ui/badge'

export default {
	title: 'UI/Badge',
	component: Badge,
	args: {
		tone: 'neutral',
		children: 'Member',
	},
	argTypes: {
		tone: { control: 'select', options: ['neutral', 'primary', 'success', 'warning', 'danger'] },
		children: { control: 'text', label: 'Text' },
	},
	parameters: {
		docs: { description: 'Compact status, role, and count labels.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Badge>

export const Neutral: Story<typeof Badge> = {}

export const Primary: Story<typeof Badge> = {
	args: { tone: 'primary', children: 'Admin' },
}

export const Success: Story<typeof Badge> = {
	args: { tone: 'success', children: 'Verified' },
}

export const Warning: Story<typeof Badge> = {
	args: { tone: 'warning', children: 'Pending' },
}

export const Danger: Story<typeof Badge> = {
	args: { tone: 'danger', children: 'Revoked' },
}

export const Counts: Story<typeof Badge> = {
	render: () => (
		<div class="flex items-center gap-3">
			<CountBadge count={3} />
			<CountBadge count={42} />
			<CountBadge count={999} />
		</div>
	),
}
