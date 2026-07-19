/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Button from 'ajo-ui-playa/button'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from 'ajo-ui-playa/field'
import Textarea from 'ajo-ui-playa/textarea'

const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const tokens = (value: string | null) => new Set((value ?? '').split(/\s+/).filter(Boolean))

const assertFieldControl = (canvas: HTMLElement, name: string, expectedId?: string) => {
	const field = canvas.querySelector<HTMLElement>(`[data-story-field="${name}"]`)
	const label = field?.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
	const description = field?.querySelector<HTMLElement>('[data-slot="field-description"]')
	const error = field?.querySelector<HTMLElement>('[data-slot="field-error"]')
	const control = field?.querySelector<HTMLTextAreaElement>('[data-slot="textarea"]')
	if (!field || !label || !description || !error || !control) throw new Error(`Textarea field wiring story did not render ${name}`)

	const labelFor = label.getAttribute('for')
	if (!labelFor || control.id !== labelFor) throw new Error(`Textarea ${name} id did not match its label for attribute`)
	if (expectedId && control.id !== expectedId) throw new Error(`Textarea ${name} did not keep its manual id`)

	const describedby = tokens(control.getAttribute('aria-describedby'))
	if (!describedby.has(description.id) || !describedby.has(error.id)) {
		throw new Error(`Textarea ${name} aria-describedby did not include description and error ids`)
	}
	if (control.getAttribute('aria-invalid') !== 'true') throw new Error(`Textarea ${name} did not receive aria-invalid`)
	if (control.getAttribute('aria-errormessage') !== error.id) throw new Error(`Textarea ${name} did not receive aria-errormessage`)
}

export default {
	title: 'UI/Textarea',
	component: Textarea,
	args: {
		placeholder: 'Type your message here.',
		disabled: false,
		rows: 4,
	},
	argTypes: {
		placeholder: { control: 'text' },
		disabled: { control: 'boolean' },
		rows: { control: 'number', min: 2, max: 10, step: 1 },
	},
	parameters: {
		docs: { description: 'Multi-line form control matching the Ajo Kit Textarea API.' },
	},
} satisfies Meta<typeof Textarea>

export const Basic: Story<typeof Textarea> = {}

export const WithField: Story<typeof Textarea> = {
	args: {
		id: 'message',
		placeholder: 'Share the details that matter.',
		label: 'Message',
		description: 'Enter your message below.',
	},
	render: ({ description, label, ...args }) => (
		<Field disabled={Boolean(args.disabled)} class="max-w-md">
			<FieldLabel for={args.id}>{label}</FieldLabel>
			<Textarea {...args} />
			<FieldDescription>{description}</FieldDescription>
		</Field>
	),
}

export const Disabled: Story<typeof Textarea> = {
	args: {
		id: 'disabled-message',
		disabled: true,
		placeholder: 'Comments are closed.',
		label: 'Message',
	},
	render: ({ label, ...args }) => (
		<Field disabled={Boolean(args.disabled)} class="max-w-md">
			<FieldLabel for={args.id}>{label}</FieldLabel>
			<Textarea {...args} />
		</Field>
	),
}

export const Invalid: Story<typeof Textarea> = {
	args: {
		id: 'invalid-message',
		placeholder: 'Too short.',
		label: 'Message',
		error: 'Please enter a valid message.',
	},
	render: ({ error, label, ...args }) => (
		<Field invalid class="max-w-md">
			<FieldLabel for={args.id}>{label}</FieldLabel>
			<Textarea {...args} aria-invalid="true" />
			<FieldError>{error}</FieldError>
		</Field>
	),
}

export const FieldWiring: Story<typeof Textarea> = {
	argTypes: {
		disabled: { control: false },
		placeholder: { control: false },
		rows: { control: false },
	},
	render: () => (
		<div class="grid w-full max-w-md gap-6">
			<Field name="textarea-auto-wire" invalid data-story-field="auto">
				<FieldLabel>Message</FieldLabel>
				<Textarea placeholder="Too short." />
				<FieldDescription>Share the details that matter.</FieldDescription>
				<FieldError>Please enter a valid message.</FieldError>
			</Field>
			<Field name="textarea-manual-wire" invalid data-story-field="manual">
				<FieldLabel for="manual-textarea-control">Manual message</FieldLabel>
				<Textarea id="manual-textarea-control" placeholder="Manual details." />
				<FieldDescription>Manual textarea keeps its caller id.</FieldDescription>
				<FieldError>Please enter a valid manual message.</FieldError>
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		await frame()
		await frame()

		assertFieldControl(canvas, 'auto')
		assertFieldControl(canvas, 'manual', 'manual-textarea-control')
	},
}

export const WithButton: Story<typeof Textarea> = {
	args: {
		id: 'send-message',
		placeholder: 'Send message',
		button: 'Send message',
	},
	render: ({ button, ...args }) => (
		<div class="grid w-full max-w-md gap-2">
			<Textarea {...args} />
			<Button type="button" class="justify-self-start" disabled={Boolean(args.disabled)}>{button}</Button>
		</div>
	),
}
