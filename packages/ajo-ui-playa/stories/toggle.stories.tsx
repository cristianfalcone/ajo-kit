/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { Toggle } from 'ajo-ui-playa/toggle'

const variants = ['default', 'outline'] as const

export default {
	title: 'UI/Toggle',
	component: Toggle,
	args: {
		defaultPressed: false,
		disabled: false,
		size: 'default',
		variant: 'default',
	},
	argTypes: {
		defaultPressed: { control: 'boolean' },
		disabled: { control: 'boolean' },
		size: { control: 'select', options: ['default', 'sm', 'lg'] },
		variant: { control: 'select', options: variants },
	},
	parameters: {
		docs: { description: 'Two-state native button using aria-pressed and Ajo Kit styling.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Toggle>

export const Basic: Story<typeof Toggle> = {
	render: (args, { setArg }) => (
		<Toggle {...args} aria-label="Toggle bookmark" onPressedChange={next => setArg('defaultPressed', next)}>
			<span class="i-lucide-bookmark size-4" />
		</Toggle>
	),
}

export const Variants: Story<typeof Toggle> = {
	argTypes: {
		defaultPressed: { control: false },
		variant: { control: false },
	},
	render: args => (
		<div class="flex items-center gap-2">
			{variants.flatMap(variant => [false, true].map(pressed => (
				<Toggle key={`${variant}-${pressed}`} {...args} variant={variant} defaultPressed={pressed} aria-label={`Toggle ${variant}${pressed ? ', pressed' : ''}`}>
					<span class="i-lucide-bold size-4" />
				</Toggle>
			)))}
		</div>
	),
}

export const WithText: Story<typeof Toggle> = {
	args: { label: 'Italic' },
	render: ({ label, ...args }, { setArg }) => (
		<Toggle {...args} aria-label="Toggle italic" onPressedChange={next => setArg('defaultPressed', next)}>
			<span class="i-lucide-italic size-4" />
			{label}
		</Toggle>
	),
}

export const Sizes: Story<typeof Toggle> = {
	argTypes: {
		size: { control: false },
	},
	render: args => (
		<div class="flex items-center gap-2">
			<Toggle {...args} size="sm" aria-label="Toggle small">Small</Toggle>
			<Toggle {...args} size="default" aria-label="Toggle default">Default</Toggle>
			<Toggle {...args} size="lg" aria-label="Toggle large">Large</Toggle>
		</div>
	),
}

export const Disabled: Story<typeof Toggle> = {
	args: { disabled: true },
	render: (args, { setArg }) => (
		<Toggle {...args} aria-label="Toggle disabled" onPressedChange={next => setArg('defaultPressed', next)}>
			<span class="i-lucide-italic size-4" />
			Disabled
		</Toggle>
	),
}
