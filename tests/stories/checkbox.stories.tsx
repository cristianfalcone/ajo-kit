/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Checkbox from '/src/ui/checkbox'

export default {
	title: 'UI/Checkbox',
	component: Checkbox,
	args: {
		name: 'ability',
		label: 'tokens:read',
		checked: false,
		disabled: false,
	},
	argTypes: {
		label: { control: 'text' },
		checked: { control: 'boolean' },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Stateful checkbox used for permission and settings toggles.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Checkbox>

export const Unchecked: Story<typeof Checkbox> = {}

export const Checked: Story<typeof Checkbox> = {
	args: { checked: true },
}

export const DisabledUnchecked: Story<typeof Checkbox> = {
	args: { disabled: true },
}

export const DisabledChecked: Story<typeof Checkbox> = {
	args: { checked: true, disabled: true },
}

export const WithNote: Story<typeof Checkbox> = {
	args: {
		label: 'admin:read',
		note: 'Allows viewing admin lists.',
		noteClass: 'block',
	},
}

export const Interactive: Story<typeof Checkbox> = {
	args: {
		checked: undefined,
		label: 'Toggle me',
	},
}
