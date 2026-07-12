/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '/src/ui/field'
import Input from '/src/ui/input'

const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const tokens = (value: string | null) => new Set((value ?? '').split(/\s+/).filter(Boolean))

const assertFieldControl = (canvas: HTMLElement, name: string, expectedId?: string) => {
	const field = canvas.querySelector<HTMLElement>(`[data-story-field="${name}"]`)
	const label = field?.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
	const description = field?.querySelector<HTMLElement>('[data-slot="field-description"]')
	const error = field?.querySelector<HTMLElement>('[data-slot="field-error"]')
	const control = field?.querySelector<HTMLInputElement>('[data-slot="input"]')
	if (!field || !label || !description || !error || !control) throw new Error(`Input field wiring story did not render ${name}`)

	const labelFor = label.getAttribute('for')
	if (!labelFor || control.id !== labelFor) throw new Error(`Input ${name} id did not match its label for attribute`)
	if (expectedId && control.id !== expectedId) throw new Error(`Input ${name} did not keep its manual id`)

	const describedby = tokens(control.getAttribute('aria-describedby'))
	if (!describedby.has(description.id) || !describedby.has(error.id)) {
		throw new Error(`Input ${name} aria-describedby did not include description and error ids`)
	}
	if (control.getAttribute('aria-invalid') !== 'true') throw new Error(`Input ${name} did not receive aria-invalid`)
	if (control.getAttribute('aria-errormessage') !== error.id) throw new Error(`Input ${name} did not receive aria-errormessage`)
}

export default {
	title: 'UI/Input',
	component: Input,
	args: {
		type: 'text',
		placeholder: 'Email',
		disabled: false,
	},
	argTypes: {
		type: { control: 'select', options: ['text', 'email', 'password', 'file'] },
		placeholder: { control: 'text' },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Text-like form control with Ajo Kit styling. Labels and descriptions are composed outside.' },
	},
} satisfies Meta<typeof Input>

export const Basic: Story<typeof Input> = {}

export const WithLabel: Story<typeof Input> = {
	args: {
		id: 'email',
		type: 'email',
		placeholder: 'you@example.com',
		label: 'Email',
	},
	render: ({ label, ...args }) => (
		<Field disabled={Boolean(args.disabled)} class="max-w-sm">
			<FieldLabel for={args.id}>{label}</FieldLabel>
			<Input {...args} />
		</Field>
	),
}

export const Password: Story<typeof Input> = {
	args: {
		id: 'password',
		type: 'password',
		placeholder: 'Enter password',
		label: 'Password',
	},
	render: ({ label, ...args }) => (
		<Field disabled={Boolean(args.disabled)} class="max-w-sm">
			<FieldLabel for={args.id}>{label}</FieldLabel>
			<Input {...args} />
		</Field>
	),
}

export const Invalid: Story<typeof Input> = {
	args: {
		id: 'invalid-email',
		type: 'email',
		placeholder: 'bad-email',
		label: 'Email',
		error: 'Enter a valid email address.',
	},
	render: ({ error, label, ...args }) => (
		<Field invalid class="max-w-sm">
			<FieldLabel for={args.id}>{label}</FieldLabel>
			<Input {...args} aria-invalid="true" />
			<FieldError>{error}</FieldError>
		</Field>
	),
}

export const FieldWiring: Story<typeof Input> = {
	argTypes: {
		disabled: { control: false },
		placeholder: { control: false },
		type: { control: false },
	},
	render: () => (
		<div class="grid w-full max-w-sm gap-6">
			<Field name="input-auto-wire" invalid data-story-field="auto">
				<FieldLabel>Email</FieldLabel>
				<Input placeholder="bad-email" />
				<FieldDescription>Use the email address for this account.</FieldDescription>
				<FieldError>Enter a valid email address.</FieldError>
			</Field>
			<Field name="input-manual-wire" invalid data-story-field="manual">
				<FieldLabel for="manual-input-control">Manual email</FieldLabel>
				<Input id="manual-input-control" placeholder="manual@example.com" />
				<FieldDescription>Manual input keeps its caller id.</FieldDescription>
				<FieldError>Enter a valid manual email address.</FieldError>
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		await frame()
		await frame()

		assertFieldControl(canvas, 'auto')
		assertFieldControl(canvas, 'manual', 'manual-input-control')
	},
}

export const Disabled: Story<typeof Input> = {
	args: {
		id: 'disabled-email',
		placeholder: 'user@example.com',
		disabled: true,
		label: 'Account email',
		description: 'This value is managed by the system.',
	},
	render: ({ description, label, ...args }) => (
		<Field disabled={Boolean(args.disabled)} class="max-w-sm">
			<FieldLabel for={args.id}>{label}</FieldLabel>
			<Input {...args} />
			<FieldDescription>{description}</FieldDescription>
		</Field>
	),
}

export const File: Story<typeof Input> = {
	args: {
		id: 'picture',
		type: 'file',
		label: 'Picture',
	},
	render: ({ label, ...args }) => (
		<Field disabled={Boolean(args.disabled)} class="max-w-sm">
			<FieldLabel for={args.id}>{label}</FieldLabel>
			<Input {...args} />
		</Field>
	),
}
