/** @jsxImportSource ajo */
import type { Meta, Story, StoryContext } from './app'
import { Checkbox } from 'ajo-ui-playa/checkbox'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from 'ajo-ui-playa/field'

const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

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

const bind = (setArg: StoryContext['setArg']) => (checked: boolean) => setArg('checked', checked)

const assertLiveState = (input: HTMLInputElement, root: HTMLElement, state: string) => {
	if (root.dataset.state !== state || input.hasAttribute('data-state') || input.hasAttribute('aria-checked')) {
		throw new Error(`Checkbox live state did not sync as ${state} on the host only`)
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
		<Checkbox {...args} onCheckedChange={bind(setArg)} />
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
		assertLiveState(input, root, 'checked')
	},
}

export const WithLabel: Story<typeof Checkbox> = {
	args: { id: 'terms-label', label: 'Accept terms and conditions' },
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Checkbox {...args} onCheckedChange={bind(setArg)} />
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
			<Checkbox {...args} onCheckedChange={bind(setArg)} />
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
			<Checkbox {...args} onCheckedChange={bind(setArg)} />
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
			<Checkbox {...args} aria-invalid="true" onCheckedChange={bind(setArg)} />
			<FieldContent>
				<FieldLabel for={args.id}>{args.label}</FieldLabel>
				<FieldError>{args.error}</FieldError>
			</FieldContent>
		</Field>
	),
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
			<Checkbox {...args} aria-invalid="true" onCheckedChange={bind(setArg)} />
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
			<Checkbox
				{...args}
				set:indeterminate={Boolean(indeterminate)}
				onCheckedChange={checked => {
					setArg('indeterminate', false)
					setArg('checked', checked)
				}}
			/>
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
		assertLiveState(input, root, 'checked')

		input.click()
		await frame()
		if (input.checked) throw new Error('Uncontrolled Checkbox did not uncheck natively')
		assertLiveState(input, root, 'unchecked')
	},
}
