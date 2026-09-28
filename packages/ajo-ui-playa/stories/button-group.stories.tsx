/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { Button } from 'ajo-ui-playa/button'
import {
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
} from 'ajo-ui-playa/button-group'
import { Input } from 'ajo-ui-playa/input'

export default {
	title: 'UI/Button Group',
	component: ButtonGroup,
	args: {
		orientation: 'horizontal',
		size: 'default',
	},
	argTypes: {
		orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
		size: { control: 'select', options: ['sm', 'default', 'lg'] },
	},
	parameters: {
		docs: { description: 'Grouped controls with horizontal/vertical orientation, separators, and text segments.' },
		layout: 'centered',
	},
} satisfies Meta<typeof ButtonGroup>

export const Basic: Story = {
	render: args => (
		<ButtonGroup {...args} aria-label="Message actions">
			<Button variant="outline">Archive</Button>
			<Button variant="outline">Report</Button>
			<Button variant="outline">Snooze</Button>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="button-group"]')
		const buttons = canvas.querySelectorAll('[data-slot="button"]')
		if (!group || buttons.length !== 3) throw new Error('Button group was not rendered')

		if (group.getAttribute('role') !== 'group' || group.getAttribute('data-orientation') !== 'horizontal') {
			throw new Error('Button group should expose group role and horizontal orientation')
		}
	},
}

export const Vertical: Story = {
	render: () => (
		<ButtonGroup orientation="vertical" aria-label="Zoom controls">
			<Button variant="outline" size="icon" aria-label="Zoom in">
				<span aria-hidden="true" class="i-lucide-plus size-4" />
			</Button>
			<Button variant="outline" size="icon" aria-label="Zoom out">
				<span aria-hidden="true" class="i-lucide-minus size-4" />
			</Button>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="button-group"]')
		if (!group || group.getAttribute('data-orientation') !== 'vertical') {
			throw new Error('Vertical button group was not rendered')
		}
	},
}

export const WithSeparator: Story = {
	args: { size: 'sm' },
	render: args => (
		<ButtonGroup {...args}>
			<Button variant="secondary">Copy</Button>
			<ButtonGroupSeparator />
			<Button variant="secondary">Paste</Button>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const separator = canvas.querySelector<HTMLElement>('[data-slot="button-group-separator"]')
		if (!separator || separator.getAttribute('aria-hidden') !== 'true' || separator.getAttribute('data-orientation') !== 'vertical') {
			throw new Error('Button group separator was not rendered')
		}
		// The separator is the seam: the member before it keeps its start
		// hairline and drops its end one, or the seam would be two lines.
		const style = getComputedStyle(separator.previousElementSibling!)
		const [start, end] = style.direction === 'rtl' ? ['-1px', '1px'] : ['1px', '-1px']
		const side = (x: string) => new RegExp(`\\) ${x} 0px 0px 0px inset`).test(style.boxShadow)
		if (!side(start) || side(end)) throw new Error(`Member before the separator draws a double seam: ${style.boxShadow}`)
	},
}

export const WithInput: Story = {
	render: () => (
		<ButtonGroup>
			<ButtonGroupText as="label" for="button-group-search">
				<span aria-hidden="true" class="i-lucide-search size-4" />
				Search
			</ButtonGroupText>
			<Input id="button-group-search" placeholder="Search messages" />
			<Button variant="outline">Submit</Button>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const label = canvas.querySelector<HTMLLabelElement>('label[data-slot="button-group-text"]')
		const input = canvas.querySelector<HTMLInputElement>('#button-group-search')
		if (!label || !input || label.htmlFor !== 'button-group-search') {
			throw new Error('Button group text label or input was not rendered')
		}
	},
}

export const Nested: Story = {
	render: () => (
		<ButtonGroup aria-label="Toolbar">
			<ButtonGroup>
				<Button variant="outline" size="icon" aria-label="Back">
					<span aria-hidden="true" class="i-lucide-arrow-left size-4 rtl:-scale-x-100" />
				</Button>
			</ButtonGroup>
			<ButtonGroup>
				<Button variant="outline">Archive</Button>
				<Button variant="outline">Report</Button>
			</ButtonGroup>
			<ButtonGroup>
				<Button variant="outline">Snooze</Button>
				<Button variant="outline" size="icon" aria-label="More">
					<span aria-hidden="true" class="i-lucide-ellipsis size-4" />
				</Button>
			</ButtonGroup>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const groups = canvas.querySelectorAll('[data-slot="button-group"]')
		if (groups.length !== 4) {
			throw new Error('Nested button groups were not rendered')
		}
	},
}

// One size for the whole row: the text, the input and both buttons take the
// group's height, the icon button stays square.
export const Sizes: Story = {
	argTypes: {
		size: { control: false },
	},
	render: args => (
		<div class="grid gap-4">
			{(['sm', 'default', 'lg'] as const).map(size => (
				<ButtonGroup key={size} {...args} size={size} aria-label={`Search, ${size}`} data-story-size={size}>
					<ButtonGroupText>Domain</ButtonGroupText>
					<Input aria-label="Domain" placeholder="shop.example.com" />
					<Button variant="outline">Add domain</Button>
					<Button variant="outline" size="icon" aria-label="More">
						<span aria-hidden="true" class="i-lucide-ellipsis" />
					</Button>
				</ButtonGroup>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const expected = { sm: 32, default: 36, lg: 40 }
		for (const [size, height] of Object.entries(expected)) {
			const group = canvas.querySelector<HTMLElement>(`[data-story-size="${size}"]`)!
			const boxes = Array.from(group.children, child => child.getBoundingClientRect())
			if (boxes.some(box => box.height !== height)) throw new Error(`${size} group children are ${boxes.map(box => box.height).join(', ')} px tall, not ${height}`)
			const icon = boxes.at(-1)!
			if (icon.width !== height) throw new Error(`${size} icon button is ${icon.width} px wide, not square`)
		}
	},
}
