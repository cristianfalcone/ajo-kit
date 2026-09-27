/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { Button } from 'ajo-ui-playa/button'
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from 'ajo-ui-playa/alert'

const examples = {
	default: ['i-lucide-check-circle', 'Account updated successfully', 'Your profile information has been saved. Changes will be reflected immediately.'],
	danger: ['i-lucide-alert-circle', 'Payment failed', 'Your payment could not be processed. Please check your payment method and try again.'],
	success: ['i-lucide-circle-check', 'Backup completed', 'Your data was backed up successfully. No further action is required.'],
	warning: ['i-lucide-alert-triangle', 'Storage almost full', 'You are using 90% of your storage. Remove unused files to avoid interruptions.'],
	info: ['i-lucide-circle-help', 'Scheduled maintenance', 'The service will be briefly unavailable on Sunday at 02:00 UTC.'],
} as const
const variants = Object.keys(examples) as Array<keyof typeof examples>

export default {
	title: 'UI/Alert',
	component: Alert,
	args: {
		variant: 'default',
	},
	argTypes: {
		variant: { control: 'select', options: variants },
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

export const Variants: Story<typeof Alert> = {
	render: () => (
		<div class="grid w-full max-w-xl gap-4">
			{variants.map(variant => {
				const [icon, title, description] = examples[variant]
				return (
					<Alert key={variant} variant={variant}>
						<span data-slot="alert-icon" class={icon} />
						<AlertTitle>{title}</AlertTitle>
						<AlertDescription>{description}</AlertDescription>
					</Alert>
				)
			})}
		</div>
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
