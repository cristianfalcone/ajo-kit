/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Spinner from 'ajo-ui-playa/spinner'

export default {
	title: 'UI/Spinner',
	component: Spinner,
	args: {
		label: 'Loading',
	},
	argTypes: {
		label: { control: 'text' },
	},
	parameters: {
		docs: { description: 'Animated spinner indicator.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Spinner>

export const Default: Story<typeof Spinner> = {
	play: async ({ canvas }) => {
		const spinner = canvas.querySelector<HTMLElement>('[data-slot="spinner"]')
		const ring = canvas.querySelector<HTMLElement>('[data-slot="spinner-ring"]')
		if (!spinner || !ring || spinner.getAttribute('role') !== 'status' || spinner.getAttribute('aria-label') !== 'Loading') {
			throw new Error('Spinner did not render an accessible status indicator')
		}
	},
}

export const Sizes: Story<typeof Spinner> = {
	render: () => (
		<div class="flex items-center gap-4">
			<Spinner class="size-4" label="Small spinner" />
			<Spinner class="size-6" label="Medium spinner" />
			<Spinner class="size-8" label="Large spinner" />
		</div>
	),
}

export const Inline: Story<typeof Spinner> = {
	render: () => (
		<div class="inline-flex items-center gap-2 text-sm text-muted-foreground">
			<Spinner class="size-3.5" />
			<span>Syncing sessions</span>
		</div>
	),
}

export const Decorative: Story<typeof Spinner> = {
	render: () => (
		<div role="status" class="inline-flex items-center gap-2 text-sm text-muted-foreground">
			<Spinner aria-hidden="true" role="presentation" />
			<span>Checking workspace</span>
		</div>
	),
	play: async ({ canvas }) => {
		const spinner = canvas.querySelector<HTMLElement>('[data-slot="spinner"]')
		if (!spinner || spinner.getAttribute('aria-hidden') !== 'true' || spinner.getAttribute('aria-label')) {
			throw new Error('Decorative spinner should stay hidden from assistive tech')
		}
	},
}
