/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Link from '/src/ui/link'

export default {
	title: 'UI/Link',
	component: Link,
	args: {
		href: '/account/profile',
		weight: 'medium',
		children: 'Edit profile',
	},
	argTypes: {
		children: { control: 'text', label: 'Text' },
		href: { control: 'text' },
		weight: { control: 'radio', options: ['normal', 'medium'] },
	},
	parameters: {
		docs: { description: 'Inline text link styling.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Link>

export const Medium: Story<typeof Link> = {}

export const Normal: Story<typeof Link> = {
	args: {
		weight: 'normal',
		children: 'View sessions',
	},
}

export const LongInline: Story<typeof Link> = {
	render: args => (
		<p class="max-w-lg text-sm text-slate-600 dark:text-slate-300">
			Need to change credentials? <Link {...args}>Open account security settings</Link> and review active sessions.
		</p>
	),
}
