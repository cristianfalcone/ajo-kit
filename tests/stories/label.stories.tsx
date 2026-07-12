/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Checkbox from '/src/ui/checkbox'
import Input from '/src/ui/input'
import Label from '/src/ui/label'

export default {
	title: 'UI/Label',
	component: Label,
	args: {
		text: 'Your email address',
		disabled: false,
	},
	argTypes: {
		text: { control: 'text' },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Accessible label associated with controls.' },
	},
} satisfies Meta<typeof Label>

export const InputLabel: Story<typeof Label> = {
	render: args => (
		<div class="grid w-full max-w-sm gap-2">
			<Label for="label-email">{args.text}</Label>
			<Input id="label-email" placeholder="you@example.com" disabled={Boolean(args.disabled)} />
		</div>
	),
}

export const CheckboxLabel: Story<typeof Label> = {
	args: { text: 'Accept terms and conditions' },
	render: args => (
		<div class="flex items-center gap-3">
			<Checkbox id="terms" name="terms" disabled={Boolean(args.disabled)} />
			<Label for="terms">{args.text}</Label>
		</div>
	),
}

export const Disabled: Story<typeof Label> = {
	args: { text: 'Disabled field', disabled: true },
	render: args => (
		<div class="group grid w-full max-w-sm gap-2" data-disabled={args.disabled ? 'true' : undefined}>
			<Label for="disabled-label">{args.text}</Label>
			<Input id="disabled-label" disabled={Boolean(args.disabled)} placeholder="Cannot edit" />
		</div>
	),
}
