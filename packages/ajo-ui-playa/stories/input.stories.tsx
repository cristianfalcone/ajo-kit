/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { assertFieldControl, frame, until } from './play'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from 'ajo-ui-playa/field'
import { Input, InputFile } from 'ajo-ui-playa/input'

export default {
	title: 'UI/Input',
	component: Input,
	args: {
		type: 'text',
		placeholder: 'Email',
		disabled: false,
	},
	argTypes: {
		type: { control: 'select', options: ['text', 'email', 'password'] },
		placeholder: { control: 'text' },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Text-like form control with Ajo Kit styling. Labels and descriptions are composed outside.' },
	},
} satisfies Meta<typeof Input>

export const Basic: Story<typeof Input> = {}

// Each size is the height of the Button of the same size, so a row of
// controls lines up.
export const Sizes: Story<typeof Input> = {
	render: args => (
		<div class="grid w-full max-w-sm gap-4">
			{(['sm', 'default', 'lg'] as const).map(size => (
				<Input key={size} {...args} size={size} aria-label={`Domain, ${size}`} placeholder="shop.example.com" />
			))}
		</div>
	),
	play: async ({ canvas }) => {
		await frame()
		const heights = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="input"]'), input => input.getBoundingClientRect().height)
		if (heights.join() !== '32,36,40') throw new Error(`Input sizes must be 32, 36 and 40 px, got ${heights.join(', ')}`)
	},
}

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
		placeholder: 'you@example.com',
		value: 'ada@example',
		label: 'Email',
		error: 'Enter an email address like ada@example.com.',
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
		await frame(2)

		assertFieldControl(canvas, 'auto', 'input')
		assertFieldControl(canvas, 'manual', 'input', 'manual-input-control')
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

// The field speaks the page's language, never the browser's: the button and
// the placeholder come from the caller, and a chosen file shows its name.
export const File: Story<typeof InputFile> = {
	args: {
		id: 'picture',
		label: 'Profile picture',
		button: 'Choose picture',
		placeholder: 'No picture chosen',
	},
	render: ({ button, label, ...args }) => (
		<form class="max-w-sm">
			<Field disabled={Boolean(args.disabled)}>
				<FieldLabel for={args.id}>{label}</FieldLabel>
				<InputFile {...args} accept="image/*">{button}</InputFile>
			</Field>
		</form>
	),
	play: async ({ canvas }) => {
		const field = canvas.querySelector<HTMLElement>('[data-slot="input-file"]')
		const control = canvas.querySelector<HTMLInputElement>('input[type="file"]')
		const value = () => canvas.querySelector('[data-slot="input-file-value"]')?.textContent
		if (!field || !control || control.id !== 'picture') throw new Error('InputFile did not render its labelled file input')
		if (field.querySelector('[data-slot="input-file-button"]')?.textContent !== 'Choose picture' || value() !== 'No picture chosen') {
			throw new Error('InputFile must show the caller\'s button label and placeholder')
		}
		const files = new DataTransfer()
		files.items.add(new window.File(['avatar'], 'avatar.png', { type: 'image/png' }))
		control.files = files.files
		control.dispatchEvent(new Event('change', { bubbles: true }))
		await until(() => value() === 'avatar.png', 'InputFile did not show the chosen file name')
		control.form?.reset()
		await until(() => value() === 'No picture chosen', 'InputFile did not return to its placeholder on reset')
	},
}
