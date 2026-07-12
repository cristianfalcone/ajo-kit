/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story, StoryContext } from './app'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from '/src/ui/field'
import { RadioGroup, RadioGroupItem } from '/src/ui/radio-group'

const bind = (setArg: StoryContext['setArg']) => (next: string) => setArg('defaultValue', next)
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

export default {
	title: 'UI/Radio Group',
	component: RadioGroup,
	args: {
		name: 'density',
		defaultValue: 'comfortable',
		disabled: false,
		orientation: 'vertical',
	},
	argTypes: {
		defaultValue: { control: 'select', options: ['default', 'comfortable', 'compact'] },
		disabled: { control: 'boolean' },
		orientation: { control: 'radio', options: ['vertical', 'horizontal'] },
	},
	parameters: {
		docs: { description: 'Native radio group composition matching the Ajo Kit Radio Group API.' },
	},
} satisfies Meta<typeof RadioGroup>

const DensityOptions = () => (
	<>
		<Field orientation="horizontal">
			<RadioGroupItem id="density-default" value="default" />
			<FieldLabel for="density-default">Default</FieldLabel>
		</Field>
		<Field orientation="horizontal">
			<RadioGroupItem id="density-comfortable" value="comfortable" />
			<FieldLabel for="density-comfortable">Comfortable</FieldLabel>
		</Field>
		<Field orientation="horizontal">
			<RadioGroupItem id="density-compact" value="compact" />
			<FieldLabel for="density-compact">Compact</FieldLabel>
		</Field>
	</>
)

const ControlledExample: Stateful = function* () {
	let value = 'default'
	const setValue = (next: string) => this.next(() => value = next)

	while (true) yield (
		<FieldSet class="w-full max-w-sm">
			<FieldLegend>Density</FieldLegend>
			<RadioGroup name="controlled-density" value={value} onValueChange={setValue}>
				<DensityOptions />
			</RadioGroup>
			<FieldDescription>Selected: {value}</FieldDescription>
		</FieldSet>
	)
}

export const Basic: Story<typeof RadioGroup> = {
	render: args => (
		<RadioGroup {...args}>
			<DensityOptions />
		</RadioGroup>
	),
	play: async ({ canvas }) => {
		await frame()
		const group = canvas.querySelector<HTMLElement>('[data-slot="radio-group"]')
		const layout = group ? getComputedStyle(group) : null
		if (!group || group.dataset.orientation !== 'vertical' || layout?.display !== 'grid' || layout.gap !== '12px') {
			throw new Error('Vertical RadioGroup did not apply the shared orientation recipe')
		}
		const root = canvas.querySelector<HTMLElement>('[data-slot="radio-group-item"]')
		const input = root?.querySelector<HTMLInputElement>('[data-slot="radio-group-input"]')
		const previous = canvas.querySelector<HTMLInputElement>('#density-comfortable')
		const previousRoot = previous?.closest<HTMLElement>('[data-slot="radio-group-item"]')
		if (!root || !input || !previous || !previousRoot) throw new Error('Basic radio items or native inputs were not rendered')
		const rect = root.getBoundingClientRect()
		const inputRect = input.getBoundingClientRect()
		const inputStyle = getComputedStyle(input)
		if (
			inputStyle.position !== 'absolute'
			|| inputStyle.opacity !== '0'
			|| Math.abs(inputRect.width - rect.width) > 1
			|| Math.abs(inputRect.height - rect.height) > 1
			|| document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) !== input
		) {
			throw new Error('Radio visual did not expose the shared native input hit target')
		}
		input.click()
		await frame()
		if (!input.checked) throw new Error('Radio native input did not select from its visual hit area')
		if (root.dataset.state !== 'checked' || input.dataset.state !== 'checked' || input.getAttribute('aria-checked') !== 'true') {
			throw new Error('Selected radio state did not sync onto its input and visual root')
		}
		if (previous.checked || previousRoot.dataset.state !== 'unchecked' || previous.dataset.state !== 'unchecked' || previous.getAttribute('aria-checked') !== 'false') {
			throw new Error('Radio group sweep did not sync the silently unchecked sibling')
		}
	},
}

export const WithFieldset: Story<typeof RadioGroup> = {
	args: {
		name: 'panel-density',
		legend: 'Panel density',
		description: 'Choose how much space the interface should use.',
	},
	render: ({ description, legend, ...args }, { setArg }) => (
		<FieldSet class="w-full max-w-sm">
			<FieldLegend>{legend}</FieldLegend>
			<FieldDescription>{description}</FieldDescription>
			<RadioGroup {...args} onValueChange={bind(setArg)}>
				<DensityOptions />
			</RadioGroup>
		</FieldSet>
	),
}

export const Horizontal: Story<typeof RadioGroup> = {
	args: {
		name: 'size',
		defaultValue: 'md',
		orientation: 'horizontal',
	},
	argTypes: {
		defaultValue: { control: 'select', options: ['sm', 'md', 'lg'] },
	},
	render: (args, { setArg }) => (
		<RadioGroup {...args} onValueChange={bind(setArg)}>
			<div class="flex items-center gap-2">
				<RadioGroupItem id="size-sm" value="sm" />
				<FieldLabel for="size-sm">Small</FieldLabel>
			</div>
			<div class="flex items-center gap-2">
				<RadioGroupItem id="size-md" value="md" />
				<FieldLabel for="size-md">Medium</FieldLabel>
			</div>
			<div class="flex items-center gap-2">
				<RadioGroupItem id="size-lg" value="lg" />
				<FieldLabel for="size-lg">Large</FieldLabel>
			</div>
		</RadioGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="radio-group"]')
		const layout = group ? getComputedStyle(group) : null
		if (!group || group.dataset.orientation !== 'horizontal' || layout?.display !== 'flex' || layout.flexWrap !== 'wrap' || layout.gap !== '12px') {
			throw new Error('Horizontal RadioGroup did not apply the shared orientation recipe')
		}
	},
}

export const Disabled: Story<typeof RadioGroup> = {
	args: {
		name: 'disabled-density',
		defaultValue: 'compact',
		disabled: true,
	},
	render: (args, { setArg }) => (
		<RadioGroup {...args} onValueChange={bind(setArg)}>
			<DensityOptions />
		</RadioGroup>
	),
}

export const Invalid: Story<typeof RadioGroup> = {
	args: {
		name: 'invalid-density',
		label: 'Panel density',
		description: 'Select a density before continuing.',
		error: 'Choose one option.',
	},
	argTypes: {
		defaultValue: { control: false },
	},
	render: ({ defaultValue: _defaultValue, description, error, label, ...args }) => (
		<Field invalid>
			<FieldContent>
				<FieldLabel>{label}</FieldLabel>
				<FieldDescription>{description}</FieldDescription>
			</FieldContent>
			<RadioGroup {...args} required>
				<Field orientation="horizontal">
					<RadioGroupItem id="invalid-default" value="default" aria-invalid="true" />
					<FieldLabel for="invalid-default">Default</FieldLabel>
				</Field>
				<Field orientation="horizontal">
					<RadioGroupItem id="invalid-comfortable" value="comfortable" aria-invalid="true" />
					<FieldLabel for="invalid-comfortable">Comfortable</FieldLabel>
				</Field>
			</RadioGroup>
			<FieldError>{error}</FieldError>
		</Field>
	),
	play: async ({ canvas }) => {
		await frame()

		const label = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="field-label"]'))
			.find(item => item.textContent?.trim() === 'Panel density')
		const group = canvas.querySelector<HTMLFieldSetElement>('[data-slot="radio-group"]')
		const description = canvas.querySelector<HTMLElement>('[data-slot="field-description"]')
		const error = canvas.querySelector<HTMLElement>('[data-slot="field-error"]')
		if (!label || !group || !description || !error) throw new Error('Invalid radio group field parts were not rendered')

		const describedby = group.getAttribute('aria-describedby')?.split(/\s+/) ?? []
		if (group.getAttribute('aria-labelledby') !== label.id) throw new Error('RadioGroup fieldset was not labelled by the FieldLabel id')
		if (!describedby.includes(description.id) || !describedby.includes(error.id)) {
			throw new Error('RadioGroup fieldset aria-describedby did not include description and error ids')
		}
	},
}

export const Controlled: Story = {
	argTypes: {
		name: { control: false },
		defaultValue: { control: false },
		disabled: { control: false },
		orientation: { control: false },
	},
	render: () => <ControlledExample />,
}
