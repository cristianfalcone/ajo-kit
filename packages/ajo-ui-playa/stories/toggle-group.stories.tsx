/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { frame } from './play'
import { ToggleGroup, ToggleGroupItem } from 'ajo-ui-playa/toggle-group'

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

export const Basic: Story<typeof ToggleGroup> = {
	render: args => (
		<ToggleGroup {...args} aria-label="Text formatting">
			<FormattingItems />
		</ToggleGroup>
	),
	play: async ({ canvas }) => {
		const italic = canvas.querySelector<HTMLButtonElement>('button[aria-label="Toggle italic"]')
		if (!italic) throw new Error('Basic toggle group item was not rendered')
		// The toggle size owns the item geometry: an icon item is square at the control height.
		for (const item of canvas.querySelectorAll<HTMLElement>('[data-slot="toggle-group-item"]')) {
			if (item.offsetWidth !== item.offsetHeight) throw new Error(`An icon item is ${item.offsetWidth} by ${item.offsetHeight}, not square`)
		}
		if (italic.getAttribute('aria-pressed') !== 'false') {
			throw new Error('Basic uncontrolled group rendered the wrong initial pressed state')
		}

		italic.click()
		await frame()

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
		<ToggleGroup {...args} aria-label="Text style" onValueChange={next => setArg('defaultValue', next)}>
			<FormattingItems />
		</ToggleGroup>
	),
}

export const Connected: Story<typeof ToggleGroup> = {
	args: { spacing: 0, variant: 'outline' },
	render: (args, { setArg }) => (
		<ToggleGroup {...args} aria-label="Connected formatting" onValueChange={next => setArg('defaultValue', next)}>
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
			<ToggleGroup {...args} type="single" size="default" defaultValue="center" aria-label="Default alignment">
				<ToggleGroupItem value="start">Start</ToggleGroupItem>
				<ToggleGroupItem value="center">Center</ToggleGroupItem>
				<ToggleGroupItem value="end">End</ToggleGroupItem>
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
		<ToggleGroup {...args} aria-label="Favorite actions" onValueChange={next => setArg('defaultValue', next)}>
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
		<ToggleGroup {...args} aria-label="Vertical formatting" onValueChange={next => setArg('defaultValue', next)}>
			<FormattingItems />
		</ToggleGroup>
	),
}

export const Disabled: Story<typeof ToggleGroup> = {
	args: { disabled: true, variant: 'default' },
	render: (args, { setArg }) => (
		<ToggleGroup {...args} aria-label="Disabled formatting" onValueChange={next => setArg('defaultValue', next)}>
			<FormattingItems />
		</ToggleGroup>
	),
}
