/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Alert from '/src/ui/alert'
import Button from '/src/ui/button'

export default {
	title: 'UI/Alert',
	component: Alert,
	args: {
		tone: 'success',
		icon: 'i-lucide-check-circle',
	},
	argTypes: {
		tone: { control: 'select', options: ['success', 'danger'] },
		icon: { control: 'text' },
	},
	parameters: {
		docs: { description: 'Boxed status message with optional icon and actions.' },
	},
} satisfies Meta<typeof Alert>

export const Success: Story<typeof Alert> = {
	render: args => (
		<Alert {...args}>
			<p class="font-medium">Profile updated successfully.</p>
			<p class="text-sm opacity-80">Your public information is now current.</p>
		</Alert>
	),
}

export const Danger: Story<typeof Alert> = {
	args: {
		tone: 'danger',
		icon: 'i-lucide-alert-triangle',
	},
	render: args => (
		<Alert {...args}>
			<p class="font-medium">Unable to save changes.</p>
			<p class="text-sm opacity-80">Check the highlighted fields and try again.</p>
		</Alert>
	),
}

export const WithActions: Story<typeof Alert> = {
	args: {
		icon: 'i-lucide-mail',
	},
	render: args => (
		<Alert
			{...args}
			actions={(
				<>
					<Button tone="neutral" height="md">Dismiss</Button>
					<Button height="md">Review</Button>
				</>
			)}
		>
			<p class="font-medium">Invitation sent.</p>
			<p class="text-sm opacity-80">The recipient can now complete registration.</p>
		</Alert>
	),
}

export const LongContent: Story<typeof Alert> = {
	render: args => (
		<Alert {...args}>
			<p class="font-medium">Several account sessions were refreshed after your password changed.</p>
			<p class="text-sm opacity-80">
				Older sessions and API tokens were revoked automatically so only the current browser remains active.
			</p>
		</Alert>
	),
}
