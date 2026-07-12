/** @jsxImportSource ajo */
import type { Meta, Story, StoryContext } from './app'
import Checkbox from '/src/ui/checkbox'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '/src/ui/field'

const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const tokens = (value: string | null) => new Set((value ?? '').split(/\s+/).filter(Boolean))

const assertFieldControl = (canvas: HTMLElement, name: string, expectedId?: string) => {
	const field = canvas.querySelector<HTMLElement>(`[data-story-field="${name}"]`)
	const label = field?.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
	const description = field?.querySelector<HTMLElement>('[data-slot="field-description"]')
	const error = field?.querySelector<HTMLElement>('[data-slot="field-error"]')
	const control = field?.querySelector<HTMLInputElement>('[data-slot="checkbox-input"]')
	if (!field || !label || !description || !error || !control) throw new Error(`Checkbox field wiring story did not render ${name}`)

	const labelFor = label.getAttribute('for')
	if (!labelFor || control.id !== labelFor) throw new Error(`Checkbox ${name} id did not match its label for attribute`)
	if (expectedId && control.id !== expectedId) throw new Error(`Checkbox ${name} did not keep its manual id`)

	const describedby = tokens(control.getAttribute('aria-describedby'))
	if (!describedby.has(description.id) || !describedby.has(error.id)) {
		throw new Error(`Checkbox ${name} aria-describedby did not include description and error ids`)
	}
	if (control.getAttribute('aria-invalid') !== 'true') throw new Error(`Checkbox ${name} did not receive aria-invalid`)
	if (control.getAttribute('aria-errormessage') !== error.id) throw new Error(`Checkbox ${name} did not receive aria-errormessage`)
}

const token = (name: string) => {
	const element = document.createElement('span')
	element.style.backgroundColor = `var(${name})`
	document.body.append(element)
	const value = getComputedStyle(element).backgroundColor
	element.remove()
	return value
}

const channels = (value: string) => {
	const numbers = value.match(/-?\d*\.?\d+/g)?.map(Number) ?? []
	const values = value.startsWith('color(')
		? numbers.slice(0, 3).map(item => item * 255)
		: numbers.slice(0, 3)
	return values.map(item => Math.round(item))
}

const sameColor = (first: string, second: string) => {
	const a = channels(first)
	const b = channels(second)
	return a.length === 3 && b.length === 3 && a.every((value, index) => Math.abs(value - b[index]) <= 1)
}

const bind = (setArg: StoryContext['setArg']) => (event: Event) =>
	setArg('checked', (event.currentTarget as HTMLInputElement).checked)

const assertLiveState = (input: HTMLInputElement, root: HTMLElement, state: string, aria: string) => {
	if (root.dataset.state !== state || input.dataset.state !== state || input.getAttribute('aria-checked') !== aria) {
		throw new Error(`Checkbox live state did not sync as ${state}/${aria}`)
	}
}

export default {
	title: 'UI/Checkbox',
	component: Checkbox,
	args: {
		id: 'terms',
		name: 'terms',
		checked: false,
		disabled: false,
	},
	argTypes: {
		checked: { control: 'boolean' },
		disabled: { control: 'boolean' },
	},
	render: (args, { setArg }) => (
		<Checkbox {...args} set:onchange={bind(setArg)} />
	),
	parameters: {
		docs: { description: 'Native checkbox control styled like Ajo Kit while preserving form behavior.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Checkbox>

export const Basic: Story<typeof Checkbox> = {
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="checkbox"]')
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="checkbox-input"]')
		if (!root || !input) throw new Error('Checkbox root or input was not rendered')

		const rect = root.getBoundingClientRect()
		const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
		if (target !== input) throw new Error('Checkbox tickmark does not hit the native input')

		input.click()
		await frame()
		if (!input.checked) throw new Error('Checkbox did not toggle when clicked directly')
		assertLiveState(input, root, 'checked', 'true')
	},
}

export const WithLabel: Story<typeof Checkbox> = {
	args: { id: 'terms-label', label: 'Accept terms and conditions' },
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Checkbox {...args} set:onchange={bind(setArg)} />
			<FieldLabel for={args.id}>{args.label}</FieldLabel>
		</Field>
	),
}

export const Checked: Story<typeof Checkbox> = {
	args: { checked: true },
}

export const Disabled: Story<typeof Checkbox> = {
	args: { id: 'terms-disabled', disabled: true, label: 'Accept terms and conditions' },
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Checkbox {...args} set:onchange={bind(setArg)} />
			<FieldLabel for={args.id}>{args.label}</FieldLabel>
		</Field>
	),
}

export const DisabledChecked: Story<typeof Checkbox> = {
	args: { checked: true, disabled: true },
}

export const WithDescription: Story<typeof Checkbox> = {
	args: {
		id: 'notifications',
		name: 'notifications',
		label: 'Enable notifications',
		description: 'You can enable or disable notifications at any time.',
	},
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Checkbox {...args} set:onchange={bind(setArg)} />
			<FieldContent>
				<FieldLabel for={args.id}>{args.label}</FieldLabel>
				<FieldDescription>{args.description}</FieldDescription>
			</FieldContent>
		</Field>
	),
}

export const Invalid: Story<typeof Checkbox> = {
	args: {
		id: 'invalid-checkbox',
		name: 'invalid',
		label: 'Accept terms and conditions',
		error: 'You must accept the terms before continuing.',
	},
	render: (args, { setArg }) => (
		<Field orientation="horizontal" invalid>
			<Checkbox {...args} aria-invalid="true" set:onchange={bind(setArg)} />
			<FieldContent>
				<FieldLabel for={args.id}>{args.label}</FieldLabel>
				<FieldError>{args.error}</FieldError>
			</FieldContent>
		</Field>
	),
}

export const FieldWiring: Story<typeof Checkbox> = {
	render: () => (
		<div class="grid w-full max-w-md gap-6">
			<Field orientation="horizontal" name="checkbox-auto-wire" invalid data-story-field="auto">
				<Checkbox name="auto-checkbox" />
				<FieldContent>
					<FieldLabel>Accept terms</FieldLabel>
					<FieldDescription>Required before continuing.</FieldDescription>
					<FieldError>You must accept the terms before continuing.</FieldError>
				</FieldContent>
			</Field>
			<Field orientation="horizontal" name="checkbox-manual-wire" invalid data-story-field="manual">
				<Checkbox id="manual-checkbox-control" name="manual-checkbox" />
				<FieldContent>
					<FieldLabel for="manual-checkbox-control">Manual terms</FieldLabel>
					<FieldDescription>Manual checkbox keeps its caller id.</FieldDescription>
					<FieldError>You must accept the manual terms.</FieldError>
				</FieldContent>
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		await frame()
		await frame()

		assertFieldControl(canvas, 'auto')
		assertFieldControl(canvas, 'manual', 'manual-checkbox-control')
	},
}

export const InvalidChecked: Story<typeof Checkbox> = {
	args: {
		id: 'invalid-checked-checkbox',
		name: 'invalid',
		checked: true,
		label: 'Accept terms and conditions',
		error: 'You must accept the terms before continuing.',
	},
	render: (args, { setArg }) => (
		<Field orientation="horizontal" invalid>
			<Checkbox {...args} aria-invalid="true" set:onchange={bind(setArg)} />
			<FieldContent>
				<FieldLabel for={args.id}>{args.label}</FieldLabel>
				<FieldError>{args.error}</FieldError>
			</FieldContent>
		</Field>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="checkbox"]')
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="checkbox-input"]')
		if (!root || !input) throw new Error('Invalid checked checkbox was not rendered')
		if (!input.checked) throw new Error('Invalid checked checkbox did not render checked')

		const style = getComputedStyle(root)
		if (!sameColor(style.backgroundColor, token('--danger'))) {
			throw new Error('Invalid checked checkbox did not use danger background')
		}

		if (!sameColor(style.color, token('--danger-foreground'))) {
			throw new Error('Invalid checked checkbox did not use danger foreground')
		}
	},
}

export const Indeterminate: Story<typeof Checkbox> = {
	args: {
		id: 'partial-selection',
		name: 'selection',
		indeterminate: true,
		label: 'Some rows selected',
	},
	render: ({ indeterminate, ...args }, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Checkbox {...args} set:indeterminate={Boolean(indeterminate)} set:onchange={bind(setArg)} />
			<FieldLabel for={args.id}>{args.label}</FieldLabel>
		</Field>
	),
}

export const Uncontrolled: Story<typeof Checkbox> = {
	args: { id: 'uncontrolled-checkbox', name: 'uncontrolled', label: 'Toggle me' },
	argTypes: {
		checked: { control: false },
	},
	render: ({ checked: _checked, ...args }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Checkbox {...args} />
			<FieldLabel for={args.id}>{args.label}</FieldLabel>
		</Field>
	),
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('#uncontrolled-checkbox')
		const root = input?.closest<HTMLElement>('[data-slot="checkbox"]')
		if (!input || !root) throw new Error('Uncontrolled Checkbox did not render')

		input.click()
		await frame()
		if (!input.checked) throw new Error('Uncontrolled Checkbox did not check natively')
		assertLiveState(input, root, 'checked', 'true')

		input.click()
		await frame()
		if (input.checked) throw new Error('Uncontrolled Checkbox did not uncheck natively')
		assertLiveState(input, root, 'unchecked', 'false')
	},
}
