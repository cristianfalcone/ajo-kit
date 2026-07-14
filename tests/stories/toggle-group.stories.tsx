/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story, StoryContext } from './app'
import {
	Field,
	FieldDescription,
	FieldLabel,
} from '/src/ui/field'
import { ToggleGroup, ToggleGroupItem } from '/src/ui/toggle-group'

const bind = (setArg: StoryContext['setArg']) => (next: string | string[]) => setArg('defaultValue', next)

export default {
	title: 'UI/Toggle Group',
	component: ToggleGroup,
	args: {
		type: 'multiple',
		defaultValue: ['bold'],
		disabled: false,
		orientation: 'horizontal',
		spacing: 2,
		size: 'default',
		variant: 'outline',
	},
	argTypes: {
		type: { control: 'radio', options: ['single', 'multiple'] },
		defaultValue: { control: 'multi-select', options: ['bold', 'italic', 'underline'] },
		disabled: { control: 'boolean' },
		orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
		spacing: { control: 'number', min: 0, step: 1 },
		size: { control: 'select', options: ['default', 'sm', 'lg'] },
		variant: { control: 'select', options: ['default', 'outline'] },
	},
	parameters: {
		docs: { description: 'Single or multiple native toggle button groups with Ajo context and Ajo Kit styling.' },
		layout: 'centered',
	},
} satisfies Meta<typeof ToggleGroup>

const FormattingItems = () => (
	<>
		<ToggleGroupItem value="bold" aria-label="Toggle bold">
			<span class="i-lucide-bold size-4" />
		</ToggleGroupItem>
		<ToggleGroupItem value="italic" aria-label="Toggle italic">
			<span class="i-lucide-italic size-4" />
		</ToggleGroupItem>
		<ToggleGroupItem value="underline" aria-label="Toggle underline">
			<span class="i-lucide-underline size-4" />
		</ToggleGroupItem>
	</>
)

const ControlledSingleExample: Stateful = function* () {
	let value = 'center'
	const setValue = (next: string) => this.next(() => value = next)

	while (true) yield (
		<Field>
			<FieldLabel>Text alignment</FieldLabel>
			<ToggleGroup type="single" value={value} onValueChange={setValue} aria-label="Text alignment">
				<ToggleGroupItem id="align-left" value="left" aria-label="Align left">
					<span class="i-lucide-align-left size-4" />
				</ToggleGroupItem>
				<ToggleGroupItem id="align-center" value="center" aria-label="Align center">
					<span class="i-lucide-align-center size-4" />
				</ToggleGroupItem>
				<ToggleGroupItem id="align-right" value="right" aria-label="Align right">
					<span class="i-lucide-align-right size-4" />
				</ToggleGroupItem>
			</ToggleGroup>
			<FieldDescription>Selected: {value || 'none'}</FieldDescription>
		</Field>
	)
}

const ControlledMultipleExample: Stateful = function* () {
	let value = ['bold']
	const setValue = (next: string[]) => this.next(() => value = next)

	while (true) yield (
		<Field>
			<FieldLabel>Formatting</FieldLabel>
			<ToggleGroup type="multiple" value={value} onValueChange={setValue} variant="outline">
				<FormattingItems />
			</ToggleGroup>
			<FieldDescription>Selected: {value.length ? value.join(', ') : 'none'}</FieldDescription>
		</Field>
	)
}

export const Basic: Story<typeof ToggleGroup> = {
	render: args => (
		<ToggleGroup {...args} aria-label="Text formatting">
			<FormattingItems />
		</ToggleGroup>
	),
	play: async ({ canvas }) => {
		const italic = canvas.querySelector<HTMLButtonElement>('button[aria-label="Toggle italic"]')
		if (!italic) throw new Error('Basic toggle group item was not rendered')
		if (italic.getAttribute('aria-pressed') !== 'false') {
			throw new Error('Basic uncontrolled group rendered the wrong initial pressed state')
		}

		italic.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (italic.getAttribute('aria-pressed') !== 'true') {
			throw new Error('Basic uncontrolled group did not keep the clicked item pressed')
		}
	},
}

export const Single: Story<typeof ToggleGroup> = {
	args: {
		type: 'single',
		defaultValue: 'italic',
		variant: 'default',
	},
	argTypes: {
		defaultValue: { control: 'select', options: ['bold', 'italic', 'underline'] },
	},
	render: (args, { setArg }) => (
		<ToggleGroup {...args} aria-label="Text style" onValueChange={bind(setArg)}>
			<FormattingItems />
		</ToggleGroup>
	),
}

export const Connected: Story<typeof ToggleGroup> = {
	args: { spacing: 0, variant: 'outline' },
	render: (args, { setArg }) => (
		<ToggleGroup {...args} aria-label="Connected formatting" onValueChange={bind(setArg)}>
			<FormattingItems />
		</ToggleGroup>
	),
}

export const Sizes: Story<typeof ToggleGroup> = {
	args: { variant: 'default' },
	argTypes: {
		type: { control: false },
		defaultValue: { control: false },
		size: { control: false },
	},
	render: args => (
		<div class="grid gap-4">
			<ToggleGroup {...args} type="single" size="sm" defaultValue="top" aria-label="Small position">
				<ToggleGroupItem value="top">Top</ToggleGroupItem>
				<ToggleGroupItem value="bottom">Bottom</ToggleGroupItem>
			</ToggleGroup>
			<ToggleGroup {...args} type="single" size="lg" defaultValue="left" aria-label="Large position">
				<ToggleGroupItem value="left">Left</ToggleGroupItem>
				<ToggleGroupItem value="right">Right</ToggleGroupItem>
			</ToggleGroup>
		</div>
	),
}

export const Spacing: Story<typeof ToggleGroup> = {
	args: {
		defaultValue: [],
		spacing: 4,
		size: 'sm',
	},
	argTypes: {
		defaultValue: { control: 'multi-select', options: ['star', 'heart', 'bookmark'] },
	},
	render: (args, { setArg }) => (
		<ToggleGroup {...args} aria-label="Favorite actions" onValueChange={bind(setArg)}>
			<ToggleGroupItem value="star" aria-label="Toggle star" class="data-[state=on]:bg-transparent data-[state=on]:text-warning">
				<span class="i-lucide-star size-4" />
				Star
			</ToggleGroupItem>
			<ToggleGroupItem value="heart" aria-label="Toggle heart" class="data-[state=on]:bg-transparent data-[state=on]:text-danger">
				<span class="i-lucide-heart size-4" />
				Heart
			</ToggleGroupItem>
			<ToggleGroupItem value="bookmark" aria-label="Toggle bookmark" class="data-[state=on]:bg-transparent data-[state=on]:text-info">
				<span class="i-lucide-bookmark size-4" />
				Bookmark
			</ToggleGroupItem>
		</ToggleGroup>
	),
}

export const Vertical: Story<typeof ToggleGroup> = {
	args: { orientation: 'vertical' },
	render: (args, { setArg }) => (
		<ToggleGroup {...args} aria-label="Vertical formatting" onValueChange={bind(setArg)}>
			<FormattingItems />
		</ToggleGroup>
	),
}

export const Disabled: Story<typeof ToggleGroup> = {
	args: { disabled: true, variant: 'default' },
	render: (args, { setArg }) => (
		<ToggleGroup {...args} aria-label="Disabled formatting" onValueChange={bind(setArg)}>
			<FormattingItems />
		</ToggleGroup>
	),
}

export const ControlledSingle: Story = {
	argTypes: {
		type: { control: false },
		defaultValue: { control: false },
		disabled: { control: false },
		orientation: { control: false },
		spacing: { control: false },
		size: { control: false },
		variant: { control: false },
	},
	render: () => <ControlledSingleExample />,
	play: async ({ canvas }) => {
		const left = canvas.querySelector<HTMLButtonElement>('#align-left')
		const center = canvas.querySelector<HTMLButtonElement>('#align-center')
		const right = canvas.querySelector<HTMLButtonElement>('#align-right')
		if (!left || !center || !right) throw new Error('Controlled single toggle group items were not rendered')
		if (center.getAttribute('aria-pressed') !== 'true') {
			throw new Error('Controlled single group did not render initial value')
		}

		center.focus()
		center.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (document.activeElement !== right) {
			throw new Error('Toggle group ArrowRight did not move focus to the next item')
		}

		left.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (left.getAttribute('aria-pressed') !== 'true' || !canvas.textContent?.includes('Selected: left')) {
			throw new Error('Controlled single group did not update after click')
		}
	},
}

export const ControlledMultiple: Story = {
	argTypes: {
		type: { control: false },
		defaultValue: { control: false },
		disabled: { control: false },
		orientation: { control: false },
		spacing: { control: false },
		size: { control: false },
		variant: { control: false },
	},
	render: () => <ControlledMultipleExample />,
	play: async ({ canvas }) => {
		const italic = canvas.querySelector<HTMLButtonElement>('button[aria-label="Toggle italic"]')
		if (!italic) throw new Error('Controlled multiple toggle item was not rendered')

		italic.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (italic.getAttribute('aria-pressed') !== 'true' || !canvas.textContent?.includes('Selected: bold, italic')) {
			throw new Error('Controlled multiple group did not append the clicked item')
		}
	},
}
