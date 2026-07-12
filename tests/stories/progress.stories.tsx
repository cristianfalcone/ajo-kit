/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { Field, FieldLabel } from '/src/ui/field'
import { Progress } from '/src/ui/progress'
import Slider from '/src/ui/slider'

export default {
	title: 'UI/Progress',
	component: Progress,
	parameters: {
		docs: { description: 'Accessible Ajo Kit progress bar with determinate and indeterminate states.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Progress>

const ControlledExample: Stateful = function* () {
	let value = 50
	const setValue = (next: number[]) => this.next(() => value = next[0] ?? 0)

	while (true) yield (
		<div class="flex w-80 flex-col gap-4">
			<Progress value={value} aria-label="Controlled progress" />
			<Slider value={[value]} onValueChange={setValue} min={0} max={100} step={1} aria-label="Progress value" />
		</div>
	)
}

export const Basic: Story<typeof Progress> = {
	args: {
		value: 66,
	},
	argTypes: {
		value: { control: 'range', min: 0, max: 100, step: 1 },
	},
	render: args => (
		<div class="w-80">
			<Progress {...args} aria-label="Upload progress" />
		</div>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="progress"]')
		const indicator = canvas.querySelector<HTMLElement>('[data-slot="progress-indicator"]')
		if (!root || !indicator) throw new Error('Progress root or indicator was not rendered')

		if (root.getAttribute('role') !== 'progressbar' || root.getAttribute('aria-valuenow') !== '66') {
			throw new Error('Progress did not expose determinate progressbar semantics')
		}

		if (!indicator.getAttribute('style')?.includes('translateX(-34')) {
			throw new Error('Progress indicator transform does not match value')
		}
	},
}

export const WithLabel: Story<typeof Progress> = {
	render: () => (
		<Field class="w-80">
			<FieldLabel for="progress-upload">
				<span>Upload progress</span>
				<span class="ml-auto">66%</span>
			</FieldLabel>
			<Progress value={66} id="progress-upload" getValueLabel={value => `${value}% uploaded`} />
		</Field>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('#progress-upload')
		if (!root) throw new Error('Labeled progress was not rendered')

		if (root.getAttribute('aria-valuetext') !== '66% uploaded') {
			throw new Error('Progress did not expose custom value text')
		}
	},
}

export const Indeterminate: Story<typeof Progress> = {
	render: () => (
		<div class="w-80">
			<Progress aria-label="Loading project data" />
		</div>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="progress"]')
		if (!root) throw new Error('Indeterminate progress was not rendered')

		if (root.getAttribute('data-state') !== 'indeterminate' || root.hasAttribute('aria-valuenow')) {
			throw new Error('Indeterminate progress should omit aria-valuenow')
		}
	},
}

export const CustomMax: Story<typeof Progress> = {
	render: () => (
		<div class="grid w-80 gap-2">
			<Progress value={24} max={32} aria-label="Files processed" getValueLabel={(value, max) => `${value} of ${max} files`} />
			<p class="text-sm text-muted-foreground">24 of 32 files</p>
		</div>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="progress"]')
		if (!root) throw new Error('Custom max progress was not rendered')

		if (root.getAttribute('aria-valuemax') !== '32' || root.getAttribute('aria-valuenow') !== '24') {
			throw new Error('Progress did not expose custom max semantics')
		}
	},
}

export const Controlled: Story = {
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const progress = canvas.querySelector<HTMLElement>('[data-slot="progress"]')
		const slider = canvas.querySelector<HTMLInputElement>('[data-slot="slider-input"]')
		if (!progress || !slider) throw new Error('Controlled progress or slider was not rendered')

		slider.value = '75'
		slider.dispatchEvent(new InputEvent('input', { bubbles: true }))
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (progress.getAttribute('aria-valuenow') !== '75') {
			throw new Error('Controlled progress did not update from slider')
		}
	},
}
