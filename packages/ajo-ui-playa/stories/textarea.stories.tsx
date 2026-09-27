/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { frame, assertFieldControl } from './play'
import { Button } from 'ajo-ui-playa/button'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from 'ajo-ui-playa/field'
import { Textarea } from 'ajo-ui-playa/textarea'

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
		await frame(2)

		assertFieldControl(canvas, 'auto', 'textarea')
		assertFieldControl(canvas, 'manual', 'textarea', 'manual-textarea-control')
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
