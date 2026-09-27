/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { frame } from './play'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
} from 'ajo-ui-playa/field'
import { Switch } from 'ajo-ui-playa/switch'

const sizes = ['default', 'sm'] as const

export default {
	title: 'UI/Switch',
	component: Switch,
	args: {
		id: 'airplane-mode',
		name: 'airplane-mode',
		checked: false,
		disabled: false,
		size: 'default',
	},
	argTypes: {
		checked: { control: 'boolean' },
		disabled: { control: 'boolean' },
		size: { control: 'select', options: sizes },
	},
	render: (args, { setArg }) => (
		<Switch {...args} onCheckedChange={next => setArg('checked', next)} />
	),
	parameters: {
		docs: { description: 'Native checkbox switch with Ajo Kit styling and form behavior.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Switch>

export const Basic: Story<typeof Switch> = {
	play: async ({ canvas }) => {
		await frame()
		const root = canvas.querySelector<HTMLElement>('[data-slot="switch"]')
		const input = root?.querySelector<HTMLInputElement>('[data-slot="switch-input"]')
		if (!root || !input) throw new Error('Basic switch or native input was not rendered')
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
			throw new Error('Switch visual did not expose the shared native input hit target')
		}
		input.click()
		await frame()
		if (!input.checked) throw new Error('Switch native input did not toggle from its visual hit area')
	},
}

export const Variants: Story<typeof Switch> = {
	argTypes: {
		checked: { control: false },
		disabled: { control: false },
		size: { control: false },
	},
	render: args => (
		<div class="grid gap-4">
			{[false, true].map(disabled => (
				<div key={`${disabled}`} class="flex items-center gap-4">
					{sizes.flatMap(size => [false, true].map(checked => {
						const id = `switch-${size}-${checked}${disabled ? '-disabled' : ''}`
						return (
							<Switch
								key={id}
								{...args}
								id={id}
								name={id}
								size={size}
								checked={checked}
								disabled={disabled}
								aria-label={`${size} switch, ${checked ? 'on' : 'off'}${disabled ? ', disabled' : ''}`}
							/>
						)
					}))}
				</div>
			))}
		</div>
	),
}

export const WithLabel: Story<typeof Switch> = {
	args: {
		id: 'marketing-emails',
		name: 'marketing-emails',
		label: 'Marketing emails',
	},
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Switch {...args} onCheckedChange={next => setArg('checked', next)} />
			<FieldLabel for={args.id}>{args.label}</FieldLabel>
		</Field>
	),
}

export const WithDescription: Story<typeof Switch> = {
	args: {
		id: 'notifications-switch',
		name: 'notifications',
		checked: true,
		label: 'Notifications',
		description: 'Receive alerts for activity in your workspace.',
	},
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Switch {...args} onCheckedChange={next => setArg('checked', next)} />
			<FieldContent>
				<FieldLabel for={args.id}>{args.label}</FieldLabel>
				<FieldDescription>{args.description}</FieldDescription>
			</FieldContent>
		</Field>
	),
}

export const Disabled: Story<typeof Switch> = {
	args: {
		id: 'disabled-switch',
		name: 'disabled',
		disabled: true,
		label: 'Disabled',
	},
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Switch {...args} onCheckedChange={next => setArg('checked', next)} />
			<FieldLabel for={args.id}>{args.label}</FieldLabel>
		</Field>
	),
}
