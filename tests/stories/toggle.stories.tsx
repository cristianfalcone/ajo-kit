/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story, StoryContext } from './app'
import {
	Field,
	FieldDescription,
	FieldLabel,
} from '/src/ui/field'
import Toggle from '/src/ui/toggle'

const bind = (setArg: StoryContext['setArg']) => (next: boolean) => setArg('defaultPressed', next)

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
		variant: { control: 'select', options: ['default', 'outline'] },
	},
	parameters: {
		docs: { description: 'Two-state native button using aria-pressed and Ajo Kit styling.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Toggle>

const ControlledExample: Stateful = function* () {
	let pressed = false
	const setPressed = (next: boolean) => this.next(() => pressed = next)

	while (true) yield (
		<Field class="w-72">
			<FieldLabel>Bookmark</FieldLabel>
			<div>
				<Toggle id="controlled-toggle" pressed={pressed} onPressedChange={setPressed} aria-label="Toggle bookmark">
					<span class="i-lucide-bookmark size-4" />
					Bookmark
				</Toggle>
			</div>
			<FieldDescription>{pressed ? 'Saved to bookmarks.' : 'Not bookmarked.'}</FieldDescription>
		</Field>
	)
}

export const Basic: Story<typeof Toggle> = {
	render: (args, { setArg }) => (
		<Toggle {...args} aria-label="Toggle bookmark" onPressedChange={bind(setArg)}>
			<span class="i-lucide-bookmark size-4" />
		</Toggle>
	),
}

export const Pressed: Story<typeof Toggle> = {
	args: { defaultPressed: true },
	render: (args, { setArg }) => (
		<Toggle {...args} aria-label="Toggle bookmark" onPressedChange={bind(setArg)}>
			<span class="i-lucide-bookmark size-4" />
		</Toggle>
	),
}

export const Outline: Story<typeof Toggle> = {
	args: { variant: 'outline' },
	render: args => (
		<div class="flex items-center gap-2">
			<Toggle {...args} aria-label="Toggle italic">
				<span class="i-lucide-italic size-4" />
			</Toggle>
			<Toggle {...args} defaultPressed aria-label="Toggle bold">
				<span class="i-lucide-bold size-4" />
			</Toggle>
		</div>
	),
}

export const WithText: Story<typeof Toggle> = {
	args: { label: 'Italic' },
	render: ({ label, ...args }, { setArg }) => (
		<Toggle {...args} aria-label="Toggle italic" onPressedChange={bind(setArg)}>
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
		<Toggle {...args} aria-label="Toggle disabled" onPressedChange={bind(setArg)}>
			<span class="i-lucide-italic size-4" />
			Disabled
		</Toggle>
	),
}

export const Controlled: Story = {
	argTypes: {
		defaultPressed: { control: false },
		disabled: { control: false },
		size: { control: false },
		variant: { control: false },
	},
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const button = canvas.querySelector<HTMLButtonElement>('#controlled-toggle')
		if (!button) throw new Error('Controlled toggle button was not rendered')
		if (button.getAttribute('aria-pressed') !== 'false') {
			throw new Error('Controlled toggle did not render its initial unpressed state')
		}

		button.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (button.getAttribute('aria-pressed') !== 'true') {
			throw new Error('Controlled toggle did not update aria-pressed after click')
		}
		if (!canvas.textContent?.includes('Saved to bookmarks.')) {
			throw new Error('Controlled toggle did not update its description after click')
		}
	},
}
