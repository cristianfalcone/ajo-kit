/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { frame } from './play'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from 'ajo-ui-playa/field'
import { Slider } from 'ajo-ui-playa/slider'

export default {
	title: 'UI/Slider',
	component: Slider,
	args: {
		defaultValue: [33],
		min: 0,
		max: 100,
		step: 1,
		disabled: false,
		orientation: 'horizontal',
		inverted: false,
	},
	argTypes: {
		defaultValue: { control: 'object' },
		min: { control: 'number' },
		max: { control: 'number' },
		step: { control: 'number' },
		disabled: { control: 'boolean' },
		orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
		inverted: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Native range slider with Ajo Kit styling, Ajo state, and single or multiple thumbs.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Slider>

export const Basic: Story<typeof Slider> = {
	render: (args, { setArg }) => (
		<Slider {...args} class="w-64" name="volume" aria-label="Volume" onValueCommit={next => setArg('defaultValue', next)} />
	),
}

export const WithLabel: Story<typeof Slider> = {
	args: {
		defaultValue: [40],
		label: 'Volume',
		description: 'Adjust notification volume.',
	},
	render: ({ description, label, ...args }, { setArg }) => (
		<Field class="w-80">
			<FieldLabel for="volume-slider">{label}</FieldLabel>
			<Slider {...args} id="volume-slider" name="volume" onValueCommit={next => setArg('defaultValue', next)} />
			<FieldDescription>{description}</FieldDescription>
		</Field>
	),
}

export const Range: Story<typeof Slider> = {
	args: { defaultValue: [20, 80] },
	render: (args, { setArg }) => (
		<Slider {...args} name="price" aria-label="Price range" class="w-72" onValueCommit={next => setArg('defaultValue', next)} />
	),
}

export const MultipleThumbs: Story<typeof Slider> = {
	args: {
		defaultValue: [20, 50, 80],
		minStepsBetweenThumbs: 5,
	},
	render: (args, { setArg }) => (
		<Slider {...args} name="distribution" aria-label="Distribution" class="w-72" onValueCommit={next => setArg('defaultValue', next)} />
	),
}

export const Vertical: Story<typeof Slider> = {
	args: {
		defaultValue: [65],
		orientation: 'vertical',
		label: 'Brightness',
		description: 'Vertical orientation.',
	},
	render: ({ description, label, ...args }, { setArg }) => (
		<div class="flex h-52 items-center gap-4">
			<Slider {...args} name="brightness" aria-label="Brightness" onValueCommit={next => setArg('defaultValue', next)} />
			<FieldContent>
				<FieldLabel>{label}</FieldLabel>
				<FieldDescription>{description}</FieldDescription>
			</FieldContent>
		</div>
	),
}

export const Invalid: Story<typeof Slider> = {
	args: {
		defaultValue: [40],
		label: 'Volume',
		description: 'Set a volume before continuing.',
		error: 'Choose a volume.',
	},
	render: ({ description, error, label, ...args }, { setArg }) => (
		<Field invalid class="w-80">
			<FieldLabel>{label}</FieldLabel>
			<Slider {...args} name="volume" onValueCommit={next => setArg('defaultValue', next)} />
			<FieldDescription>{description}</FieldDescription>
			<FieldError>{error}</FieldError>
		</Field>
	),
	play: async ({ canvas }) => {
		await frame(2)

		const label = canvas.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="slider-input"]')
		const description = canvas.querySelector<HTMLElement>('[data-slot="field-description"]')
		const error = canvas.querySelector<HTMLElement>('[data-slot="field-error"]')
		if (!label || !input || !description || !error) throw new Error('Invalid slider field parts were not rendered')

		const describedby = input.getAttribute('aria-describedby')?.split(/\s+/) ?? []
		if (input.id !== label.getAttribute('for')) throw new Error('Slider input id did not match the FieldLabel for attribute')
		if (!describedby.includes(description.id) || !describedby.includes(error.id)) {
			throw new Error('Slider input aria-describedby did not include description and error ids')
		}
	},
}

export const Disabled: Story<typeof Slider> = {
	args: { defaultValue: [60], disabled: true },
	render: (args, { setArg }) => (
		<Slider {...args} class="w-64" aria-label="Disabled slider" onValueCommit={next => setArg('defaultValue', next)} />
	),
}
