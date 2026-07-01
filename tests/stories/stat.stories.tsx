/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Stat from '/src/ui/stat'

export default {
	title: 'UI/Stat',
	component: Stat,
	args: {
		icon: 'i-lucide-users',
		label: 'Users',
		value: 128,
		tone: 'accent',
	},
	argTypes: {
		icon: { control: 'text' },
		label: { control: 'text' },
		value: { control: 'text' },
		tone: { control: 'radio', options: ['accent', 'danger'] },
	},
	parameters: {
		docs: { description: 'Metric card with a leading icon.' },
	},
} satisfies Meta<typeof Stat>

export const Accent: Story<typeof Stat> = {}

export const Danger: Story<typeof Stat> = {
	args: {
		icon: 'i-lucide-alert-circle',
		label: 'Revoked tokens',
		value: 6,
		tone: 'danger',
	},
}

export const LinkCard: Story<typeof Stat> = {
	args: {
		href: '/admin/users',
		label: 'Admin users',
		value: 32,
	},
}

export const LongLabel: Story<typeof Stat> = {
	args: {
		label: 'Sessions requiring confirmation',
		value: '1,204',
	},
}
