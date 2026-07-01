/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Spinner from '/src/ui/spinner'

export default {
	title: 'UI/Spinner',
	component: Spinner,
	args: {
		loading: true,
		duration: 300,
		delay: 0,
		label: 'Loading',
		overlay: true,
	},
	argTypes: {
		loading: { control: 'boolean' },
		duration: { control: 'number', min: 0, step: 50 },
		delay: { control: 'number', min: 0, step: 50 },
		label: { control: 'text' },
		overlay: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Route loading overlay with animated visual indicator.' },
		layout: 'fullscreen',
	},
} satisfies Meta<typeof Spinner>

export const Overlay: Story<typeof Spinner> = {}

export const NoOverlay: Story<typeof Spinner> = {
	args: { overlay: false },
}

export const CustomLabel: Story<typeof Spinner> = {
	args: { label: 'Syncing sessions' },
}

export const NotLoading: Story<typeof Spinner> = {
	args: { loading: false },
}
