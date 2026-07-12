/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Button from '/src/ui/button'
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from '/src/ui/alert'

export default {
	title: 'UI/Alert',
	component: Alert,
	args: {
		variant: 'default',
	},
	argTypes: {
		variant: { control: 'select', options: ['default', 'danger', 'success', 'warning', 'info'] },
	},
	parameters: {
		docs: { description: 'Callout for important user attention with title, description, icon, and action slots.' },
	},
} satisfies Meta<typeof Alert>

export const Default: Story<typeof Alert> = {
	render: args => (
		<Alert {...args}>
			<span data-slot="alert-icon" class="i-lucide-check-circle" />
			<AlertTitle>Account updated successfully</AlertTitle>
			<AlertDescription>
				Your profile information has been saved. Changes will be reflected immediately.
			</AlertDescription>
		</Alert>
	),
}

export const Danger: Story<typeof Alert> = {
	args: {
		variant: 'danger',
	},
	render: args => (
		<Alert {...args}>
			<span data-slot="alert-icon" class="i-lucide-alert-circle" />
			<AlertTitle>Payment failed</AlertTitle>
			<AlertDescription>
				Your payment could not be processed. Please check your payment method and try again.
			</AlertDescription>
		</Alert>
	),
}

export const Success: Story<typeof Alert> = {
	args: {
		variant: 'success',
	},
	render: args => (
		<Alert {...args}>
			<span data-slot="alert-icon" class="i-lucide-circle-check" />
			<AlertTitle>Backup completed</AlertTitle>
			<AlertDescription>
				Your data was backed up successfully. No further action is required.
			</AlertDescription>
		</Alert>
	),
}

export const Warning: Story<typeof Alert> = {
	args: {
		variant: 'warning',
	},
	render: args => (
		<Alert {...args}>
			<span data-slot="alert-icon" class="i-lucide-alert-triangle" />
			<AlertTitle>Storage almost full</AlertTitle>
			<AlertDescription>
				You are using 90% of your storage. Remove unused files to avoid interruptions.
			</AlertDescription>
		</Alert>
	),
}

export const Info: Story<typeof Alert> = {
	args: {
		variant: 'info',
	},
	render: args => (
		<Alert {...args}>
			<span data-slot="alert-icon" class="i-lucide-circle-help" />
			<AlertTitle>Scheduled maintenance</AlertTitle>
			<AlertDescription>
				The service will be briefly unavailable on Sunday at 02:00 UTC.
			</AlertDescription>
		</Alert>
	),
}

export const Action: Story<typeof Alert> = {
	render: args => (
		<Alert {...args}>
			<span data-slot="alert-icon" class="i-lucide-mail" />
			<AlertTitle>Dark mode is now available</AlertTitle>
			<AlertDescription>
				Enable it under your profile settings to get started.
			</AlertDescription>
			<AlertAction>
				<Button variant="outline" size="sm">Enable</Button>
			</AlertAction>
		</Alert>
	),
}

export const LongContent: Story<typeof Alert> = {
	render: args => (
		<Alert {...args}>
			<span data-slot="alert-icon" class="i-lucide-shield-check" />
			<AlertTitle>Several account sessions were refreshed</AlertTitle>
			<AlertDescription>
				<p>
					Older sessions and API tokens were revoked automatically after your password changed.
				</p>
				<p>
					Only the current browser remains active, and any new API tokens must be created again.
				</p>
			</AlertDescription>
		</Alert>
	),
}
