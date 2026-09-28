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
	default: ['i-lucide-circle-check', 'Profile saved', 'The people you invite now see your new name.'],
	danger: ['i-lucide-octagon-x', 'The deploy failed', 'shop-api v143 did not pass its health check, so v142 keeps serving. Open the log to see the failing step.'],
	success: ['i-lucide-circle-check', 'Backup finished', 'Every app, domain and secret on host-01 was saved at 03:00.'],
	warning: ['i-lucide-triangle-alert', 'The disk is 90% full', 'Deploys stop at 95%. Remove old versions or grow the volume.'],
	info: ['i-lucide-info', 'Maintenance on Sunday', 'The host restarts at 02:00 UTC and is back within five minutes.'],
} as const
const variants = Object.keys(examples) as Array<keyof typeof examples>

// A computed colour as 0-255 channels, whether the engine wrote rgb() or color(srgb).
const channels = (value: string) => {
	const numbers = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
	return (value.startsWith('color(') ? numbers.map(number => number * 255) : numbers).map(Math.round).join(',')
}

// Whether a surface casts a shadow: an outer box-shadow that is not transparent.
const casts = (style: CSSStyleDeclaration) => style.boxShadow.split(/,(?![^(]*\))/)
	.some(shadow => !shadow.includes('inset') && !shadow.trim().startsWith('rgba(0, 0, 0, 0)') && shadow.trim() !== 'none')

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
			<span data-slot="alert-icon" class="i-lucide-circle-check" />
			<AlertTitle>Profile saved</AlertTitle>
			<AlertDescription>
				The people you invite now see your new name.
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
	// Every tone sits on enamel with no resting shadow; the tone colours the
	// icon and the title, and the description keeps the text colour.
	play: async ({ canvas }) => {
		const probe = canvas.appendChild(document.createElement('div'))
		probe.style.backgroundColor = 'var(--card)'
		const card = getComputedStyle(probe).backgroundColor
		probe.remove()
		for (const alert of canvas.querySelectorAll<HTMLElement>('[data-slot="alert"]')) {
			const variant = alert.dataset.variant
			const root = getComputedStyle(alert)
			const icon = alert.querySelector<HTMLElement>('[data-slot="alert-icon"]')
			const title = alert.querySelector<HTMLElement>('[data-slot="alert-title"]')
			const description = alert.querySelector<HTMLElement>('[data-slot="alert-description"]')
			if (!icon || !title || !description) throw new Error(`Alert ${variant} parts were not rendered`)
			if (channels(root.backgroundColor) !== channels(card) || casts(root)) {
				throw new Error(`Alert ${variant} is not flat enamel: ${root.backgroundColor} ${root.boxShadow}`)
			}
			const tone = getComputedStyle(title).color
			if (getComputedStyle(description).color !== root.color || getComputedStyle(icon).color !== tone || (variant === 'default') !== (tone === root.color)) {
				throw new Error(`Alert ${variant} does not keep its tone to the icon and title`)
			}
		}
	},
}

export const Action: Story<typeof Alert> = {
	render: args => (
		<Alert {...args}>
			<span data-slot="alert-icon" class="i-lucide-info" />
			<AlertTitle>Backups run every night</AlertTitle>
			<AlertDescription>
				Turn on off-site copies to keep one outside this host.
			</AlertDescription>
			<AlertAction>
				<Button variant="outline" size="sm">Turn on</Button>
			</AlertAction>
		</Alert>
	),
}

export const LongContent: Story<typeof Alert> = {
	render: args => (
		<Alert {...args}>
			<span data-slot="alert-icon" class="i-lucide-shield-check" />
			<AlertTitle>Your other sessions were signed out</AlertTitle>
			<AlertDescription>
				<p>
					Changing your password signed out every other session and revoked your access tokens.
				</p>
				<p>
					Only this browser stays signed in. Create new access tokens for the scripts that deploy as you.
				</p>
			</AlertDescription>
		</Alert>
	),
}
