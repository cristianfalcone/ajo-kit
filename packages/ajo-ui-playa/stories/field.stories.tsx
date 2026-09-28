/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { assertRowAligned } from './play'
import { Button } from 'ajo-ui-playa/button'
import { Checkbox } from 'ajo-ui-playa/checkbox'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldRow,
	FieldSeparator,
	FieldSet,
	FieldTitle,
} from 'ajo-ui-playa/field'
import { Input as TextInput } from 'ajo-ui-playa/input'
import { Switch } from 'ajo-ui-playa/switch'
import { Textarea } from 'ajo-ui-playa/textarea'

export default {
	title: 'UI/Field',
	component: Field,
	args: {
		orientation: 'vertical',
		invalid: false,
	},
	argTypes: {
		orientation: { control: 'select', options: ['vertical', 'horizontal', 'responsive'] },
		invalid: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Accessible form field composition for labels, controls, descriptions, errors, and groups.' },
	},
} satisfies Meta<typeof Field>

export const Input: Story<typeof Field> = {
	render: args => (
		<Field {...args} class="max-w-sm">
			<FieldLabel for="field-username">Username</FieldLabel>
			<TextInput id="field-username" placeholder="evilrabbit" autoComplete="off" aria-invalid={args.invalid ? 'true' : undefined} />
			<FieldDescription>Choose a unique username for your account.</FieldDescription>
		</Field>
	),
}

export const TextareaField: Story<typeof Field> = {
	name: 'Textarea',
	render: args => (
		<Field {...args} class="max-w-md">
			<FieldLabel for="field-feedback">Feedback</FieldLabel>
			<Textarea id="field-feedback" placeholder="Tell us what worked well." aria-invalid={args.invalid ? 'true' : undefined} />
			<FieldDescription>Share your thoughts about our service.</FieldDescription>
		</Field>
	),
}

export const Invalid: Story<typeof Field> = {
	args: { invalid: true },
	argTypes: { orientation: { control: false } },
	render: args => (
		<Field {...args} class="max-w-sm">
			<FieldLabel for="field-email">Email</FieldLabel>
			<TextInput id="field-email" placeholder="bad-email" aria-invalid="true" />
			<FieldError>Enter a valid email address.</FieldError>
		</Field>
	),
}

export const MultipleErrors: Story<typeof Field> = {
	render: () => (
		<Field invalid class="max-w-sm">
			<FieldLabel for="field-password">Password</FieldLabel>
			<TextInput id="field-password" type="password" aria-invalid="true" />
			<FieldError
				errors={[
					{ message: 'Use at least 8 characters.' },
					{ message: 'Include a number.' },
					{ message: 'Use at least 8 characters.' },
				]}
			/>
		</Field>
	),
}

export const Horizontal: Story<typeof Field> = {
	render: () => (
		<Field orientation="horizontal" class="max-w-md">
			<input id="field-newsletter" type="checkbox" class="size-4 rounded-xs edge-input bg-transparent" />
			<FieldContent>
				<FieldLabel for="field-newsletter">Subscribe to updates</FieldLabel>
				<FieldDescription>Receive product and security notices.</FieldDescription>
			</FieldContent>
		</Field>
	),
}

export const Responsive: Story<typeof Field> = {
	render: () => (
		<Field orientation="responsive" class="max-w-xl">
			<FieldLabel for="field-display-name">Display name</FieldLabel>
			<TextInput id="field-display-name" placeholder="Cristian" />
			<FieldDescription>This name appears in shared workspaces.</FieldDescription>
		</Field>
	),
}

export const Fieldset: Story<typeof Field> = {
	render: () => (
		<FieldSet class="w-full max-w-lg">
			<FieldLegend>Profile</FieldLegend>
			<FieldDescription>This appears on invoices and emails.</FieldDescription>
			<FieldGroup>
				<Field>
					<FieldLabel for="profile-name">Full name</FieldLabel>
					<TextInput id="profile-name" autoComplete="off" placeholder="Ada Lovelace" />
				</Field>
				<Field>
					<FieldLabel for="profile-username">Username</FieldLabel>
					<TextInput id="profile-username" autoComplete="off" placeholder="ada" />
				</Field>
				<Field orientation="horizontal">
					<Checkbox id="profile-newsletter" name="profile-newsletter" />
					<FieldLabel for="profile-newsletter">Subscribe to the newsletter</FieldLabel>
				</Field>
			</FieldGroup>
		</FieldSet>
	),
	// A horizontal field outside a FieldRow is as tall as its content, so a
	// list of choices keeps its options closer to each other than to the question.
	play: ({ canvas }) => {
		const field = canvas.querySelector<HTMLElement>('[data-slot="field"][data-orientation="horizontal"]')
		if (!field) throw new Error('The horizontal field did not render')
		const content = Math.max(...[...field.children].map(child => child.getBoundingClientRect().height))
		const height = field.getBoundingClientRect().height
		if (Math.abs(height - content) > 0.5) throw new Error(`The horizontal field is ${height} px tall around ${content} px of content`)
	},
}

// Fields side by side share their rows: the control without help keeps the
// top of the one with it, a switch beside an input shares its centre, and
// both keep them when the group stacks them.
export const RowWithHelp: Story<typeof Field> = {
	name: 'Row with help',
	render: () => (
		<FieldGroup class="w-full max-w-2xl">
			<FieldRow>
				<Field name="row-help-name">
					<FieldLabel>App name</FieldLabel>
					<TextInput placeholder="shop-api" />
				</Field>
				<Field name="row-help-domain">
					<FieldLabel>Domain</FieldLabel>
					<TextInput placeholder="shop.example.com" />
					<FieldDescription>Point its DNS here before the first deploy.</FieldDescription>
				</Field>
			</FieldRow>
			<FieldRow>
				<Field name="row-help-memory">
					<FieldLabel>Memory limit</FieldLabel>
					<TextInput placeholder="512 MB" />
					<FieldDescription>The app restarts when it goes over.</FieldDescription>
				</Field>
				<Field orientation="horizontal" name="row-help-boot">
					<Switch id="row-help-boot" defaultChecked />
					<FieldLabel for="row-help-boot">Start on boot</FieldLabel>
				</Field>
			</FieldRow>
		</FieldGroup>
	),
	play: ({ canvas }) => assertRowAligned(canvas),
}

// The error takes the help's line and only the boundary and the message turn
// to the danger hue; the label and the value keep their colours.
export const RowWithError: Story<typeof Field> = {
	name: 'Row with error',
	render: () => (
		<FieldGroup class="w-full max-w-2xl">
			<FieldRow>
				<Field invalid name="row-error-name">
					<FieldLabel>App name</FieldLabel>
					<TextInput value="Shop API" />
					<FieldError>Use lowercase letters, numbers and dashes.</FieldError>
				</Field>
				<Field invalid name="row-error-domain">
					<FieldLabel>Domain</FieldLabel>
					<TextInput name="domain" value="shop.example.com" />
					<FieldDescription>Point its DNS here before the first deploy.</FieldDescription>
					<FieldError>Another app already uses this domain.</FieldError>
				</Field>
			</FieldRow>
		</FieldGroup>
	),
	play: ({ canvas }) => {
		assertRowAligned(canvas)
		const domain = canvas.querySelector<HTMLElement>('[data-slot="field"]:has(input[name="domain"])')
		const [label, input, help, error] = ['field-label', 'input', 'field-description', 'field-error']
			.map(slot => domain?.querySelector<HTMLElement>(`[data-slot="${slot}"]`))
		if (!label || !input || !help || !error) throw new Error('The invalid domain field did not render its parts')
		if (help.getBoundingClientRect().top !== error.getBoundingClientRect().top) throw new Error('The error does not take the help text line')
		if (getComputedStyle(help).visibility !== 'hidden') throw new Error('The help still shows beside the error')
		if (!input.getAttribute('aria-describedby')?.split(' ').includes(help.id)) throw new Error('The hidden help left aria-describedby')
		const colour = (element: HTMLElement) => getComputedStyle(element).color
		if (colour(error) === colour(label) || colour(input) !== colour(label)) throw new Error('Only the message may take the danger hue')
	},
}

export const Sections: Story<typeof Field> = {
	render: () => (
		<FieldGroup class="w-full max-w-lg">
			<Field>
				<FieldTitle>Billing address</FieldTitle>
				<FieldDescription>The billing address associated with your payment method.</FieldDescription>
			</Field>
			<FieldSeparator>Shipping</FieldSeparator>
			<Field orientation="horizontal">
				<Checkbox id="same-address" name="same-address" />
				<FieldLabel for="same-address">Same as billing address</FieldLabel>
			</Field>
			<div class="flex gap-2">
				<Button type="button">Submit</Button>
				<Button type="button" variant="secondary">Cancel</Button>
			</div>
		</FieldGroup>
	),
}

export const AutoWiring: Story<typeof Field> = {
	render: () => (
		<div class="flex w-full max-w-sm flex-col gap-6">
			<Field name="field-auto-wire" invalid>
				<FieldLabel>Auto label</FieldLabel>
				<input class="h-9 rounded-md edge-input px-3 text-sm" data-story-control="auto" />
				<FieldDescription>Automatically receives the field description id.</FieldDescription>
				<FieldError>Automatically receives the field error id.</FieldError>
			</Field>
			<Field name="field-manual-wire">
				<FieldLabel id="manual-label" for="manual-control">Manual label</FieldLabel>
				<input id="manual-control" class="h-9 rounded-md edge-input px-3 text-sm" data-story-control="manual" />
				<FieldDescription id="manual-description">Manual description id.</FieldDescription>
				<FieldError id="manual-error">Manual error id.</FieldError>
			</Field>
		</div>
	),
	play: ({ canvas }) => {
		const auto = canvas.querySelector<HTMLElement>('[data-slot="field"][data-invalid="true"]')
		const autoLabel = auto?.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
		const autoDescription = auto?.querySelector<HTMLElement>('[data-slot="field-description"]')
		const autoError = auto?.querySelector<HTMLElement>('[data-slot="field-error"]')
		const manual = canvas.querySelector<HTMLElement>('[data-slot="field"]:not([data-invalid])')
		const manualLabel = manual?.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
		const manualDescription = manual?.querySelector<HTMLElement>('[data-slot="field-description"]')
		const manualError = manual?.querySelector<HTMLElement>('[data-slot="field-error"]')

		if (!autoLabel || !autoDescription || !autoError) throw new Error('Auto-wired field parts were not rendered')
		if (!manualLabel || !manualDescription || !manualError) throw new Error('Manual field parts were not rendered')

		const control = autoLabel.getAttribute('for')
		if (!control || !control.startsWith('field-auto-wire-')) throw new Error('FieldLabel did not receive an automatic for attribute')
		if (autoLabel.id !== `${control}-label`) throw new Error('FieldLabel did not receive the matching automatic id')
		if (autoDescription.id !== `${control}-description`) throw new Error('FieldDescription did not receive the matching automatic id')
		if (autoError.id !== `${control}-error`) throw new Error('FieldError did not receive the matching automatic id')

		if (manualLabel.id !== 'manual-label' || manualLabel.getAttribute('for') !== 'manual-control') {
			throw new Error('Manual FieldLabel id/for overrides did not win')
		}
		if (manualDescription.id !== 'manual-description' || manualError.id !== 'manual-error') {
			throw new Error('Manual FieldDescription or FieldError id overrides did not win')
		}
	},
}
