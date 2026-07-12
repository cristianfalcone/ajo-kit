/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '/src/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from '/src/ui/input-group'
import { Kbd } from '/src/ui/kbd'

export default {
	title: 'UI/Input Group',
	component: InputGroup,
	args: {
		disabled: false,
	},
	argTypes: {
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Grouped input controls with addons, text, buttons, keyboard hints, and textarea layouts.' },
		layout: 'centered',
	},
} satisfies Meta<typeof InputGroup>

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const tokens = (value: string | null) => new Set((value ?? '').split(/\s+/).filter(Boolean))

const assertFieldControl = <Element extends HTMLInputElement | HTMLTextAreaElement>(
	canvas: HTMLElement,
	name: string,
	selector: string,
	expectedId?: string,
) => {
	const field = canvas.querySelector<HTMLElement>(`[data-story-field="${name}"]`)
	const label = field?.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
	const description = field?.querySelector<HTMLElement>('[data-slot="field-description"]')
	const error = field?.querySelector<HTMLElement>('[data-slot="field-error"]')
	const control = field?.querySelector<Element>(selector)
	if (!field || !label || !description || !error || !control) throw new Error(`Input group field wiring story did not render ${name}`)

	const labelFor = label.getAttribute('for')
	if (!labelFor || control.id !== labelFor) throw new Error(`Input group ${name} id did not match its label for attribute`)
	if (expectedId && control.id !== expectedId) throw new Error(`Input group ${name} did not keep its manual id`)

	const describedby = tokens(control.getAttribute('aria-describedby'))
	if (!describedby.has(description.id) || !describedby.has(error.id)) {
		throw new Error(`Input group ${name} aria-describedby did not include description and error ids`)
	}
	if (control.getAttribute('aria-invalid') !== 'true') throw new Error(`Input group ${name} did not receive aria-invalid`)
	if (control.getAttribute('aria-errormessage') !== error.id) throw new Error(`Input group ${name} did not receive aria-errormessage`)
}

export const Icon: Story = {
	args: {
		placeholder: 'Search...',
		results: '12 results',
	},
	render: ({ placeholder, results, ...args }) => (
		<InputGroup {...args} class="max-w-sm">
			<InputGroupInput placeholder={placeholder} aria-label="Search" disabled={args.disabled} />
			<InputGroupAddon>
				<span aria-hidden="true" class="i-lucide-search size-4" />
			</InputGroupAddon>
			<InputGroupAddon align="inline-end">{results}</InputGroupAddon>
		</InputGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="input-group"]')
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="input-group-control"]')
		const addons = canvas.querySelectorAll<HTMLElement>('[data-slot="input-group-addon"]')
		if (!group || !input || addons.length !== 2) throw new Error('Input group icon story was not rendered')
		const widthClasses = group.className.split(/\s+/).filter(token => token.startsWith('w-'))
		if (widthClasses.join(' ') !== 'w-full') throw new Error(`InputGroup must own one full-width utility, got ${widthClasses.join(' ')}`)

		if (group.getAttribute('role') !== 'group' || addons[1]?.getAttribute('data-align') !== 'inline-end') {
			throw new Error('Input group did not expose group role or addon alignment')
		}

		addons[0]?.click()
		await nextFrame()

		if (document.activeElement !== input) {
			throw new Error('Input group addon click did not focus the control')
		}
	},
}

export const Text: Story = {
	args: {
		placeholder: '0.00',
		prefix: '$',
		suffix: 'USD',
	},
	render: ({ placeholder, prefix, suffix, ...args }) => (
		<div class="grid w-full max-w-sm gap-4">
			<InputGroup {...args}>
				<InputGroupAddon>
					<InputGroupText>{prefix}</InputGroupText>
				</InputGroupAddon>
				<InputGroupInput placeholder={placeholder} inputMode="decimal" disabled={args.disabled} />
				<InputGroupAddon align="inline-end">
					<InputGroupText>{suffix}</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
			<InputGroup {...args}>
				<InputGroupAddon>
					<InputGroupText>https://</InputGroupText>
				</InputGroupAddon>
				<InputGroupInput placeholder="example.com" disabled={args.disabled} />
				<InputGroupAddon align="inline-end">
					<InputGroupText>.com</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
		</div>
	),
	play: async ({ canvas }) => {
		const texts = Array.from(canvas.querySelectorAll('[data-slot="input-group-text"]')).map(node => node.textContent)
		if (texts.join('|') !== '$|USD|https://|.com') {
			throw new Error('Input group text addons were not rendered in order')
		}
	},
}

export const KbdHint: Story = {
	args: {
		placeholder: 'Search commands...',
		keys: ['Ctrl', 'K'],
	},
	render: ({ keys, placeholder, ...args }) => (
		<InputGroup {...args} class="max-w-sm">
			<InputGroupInput placeholder={placeholder} aria-label="Search commands" disabled={args.disabled} />
			<InputGroupAddon>
				<span aria-hidden="true" class="i-lucide-search size-4" />
			</InputGroupAddon>
			<InputGroupAddon align="inline-end">
				{keys.map((key: string) => <Kbd key={key}>{key}</Kbd>)}
			</InputGroupAddon>
		</InputGroup>
	),
	play: async ({ canvas }) => {
		const keys = canvas.querySelectorAll('[data-slot="kbd"]')
		if (keys.length !== 2) throw new Error('Input group keyboard hint was not rendered')
	},
}

export const Button: Story = {
	args: {
		placeholder: 'example.com',
		prefix: 'https://',
		button: 'Search',
	},
	render: ({ button, placeholder, prefix, ...args }) => (
		<InputGroup {...args} class="max-w-sm">
			<InputGroupAddon>
				<InputGroupText>{prefix}</InputGroupText>
			</InputGroupAddon>
			<InputGroupInput placeholder={placeholder} disabled={args.disabled} />
			<InputGroupAddon align="inline-end">
				<InputGroupButton>{button}</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	),
	play: async ({ canvas }) => {
		const button = canvas.querySelector<HTMLButtonElement>('[data-slot="input-group-button"]')
		if (!button || button.type !== 'button' || button.getAttribute('data-size') !== 'xs') {
			throw new Error('Input group button was not rendered with defaults')
		}
	},
}

export const Textarea: Story = {
	args: {
		placeholder: 'Ask, Search or Chat...',
		file: 'script.js',
		status: 'Line 1, Column 1',
	},
	render: ({ file, placeholder, status, ...args }) => (
		<InputGroup {...args} class="max-w-md">
			<InputGroupTextarea placeholder={placeholder} class="min-h-[160px]" disabled={args.disabled} />
			<InputGroupAddon align="block-start" class="border-b">
				<InputGroupText class="font-mono font-medium">
					<span aria-hidden="true" class="i-lucide-file-code size-4" />
					{file}
				</InputGroupText>
				<InputGroupButton class="ml-auto" size="icon-xs" aria-label="Copy">
					<span aria-hidden="true" class="i-lucide-copy size-3" />
				</InputGroupButton>
			</InputGroupAddon>
			<InputGroupAddon align="block-end" class="border-t">
				<InputGroupText>{status}</InputGroupText>
				<InputGroupButton size="sm" class="ml-auto" variant="default">
					Run
					<span aria-hidden="true" class="i-lucide-corner-down-left size-4" />
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	),
	play: async ({ canvas }) => {
		const textarea = canvas.querySelector<HTMLTextAreaElement>('[data-slot="input-group-control"]')
		const blockStart = canvas.querySelector<HTMLElement>('[data-align="block-start"]')
		const blockEnd = canvas.querySelector<HTMLElement>('[data-align="block-end"]')
		if (!textarea || !blockStart || !blockEnd) {
			throw new Error('Input group textarea layout was not rendered')
		}
		const run = blockEnd.querySelector<HTMLButtonElement>('[data-slot="input-group-button"]')
		if (!run || getComputedStyle(run).boxShadow !== 'none') {
			throw new Error('Input group button did not opt out of its standalone variant shadow')
		}
	},
}

export const FieldWiring: Story = {
	render: () => (
		<div class="grid w-full max-w-md gap-6">
			<Field name="input-group-input-auto-wire" invalid data-story-field="input-auto">
				<FieldLabel>Search</FieldLabel>
				<InputGroup>
					<InputGroupInput placeholder="Search..." />
					<InputGroupAddon align="inline-end">
						<span aria-hidden="true" class="i-lucide-search size-4" />
					</InputGroupAddon>
				</InputGroup>
				<FieldDescription>Search by title or owner.</FieldDescription>
				<FieldError>Enter a valid search term.</FieldError>
			</Field>
			<Field name="input-group-input-manual-wire" invalid data-story-field="input-manual">
				<FieldLabel for="manual-input-group-control">Manual search</FieldLabel>
				<InputGroup>
					<InputGroupInput id="manual-input-group-control" placeholder="Manual search..." />
					<InputGroupAddon align="inline-end">Ctrl K</InputGroupAddon>
				</InputGroup>
				<FieldDescription>Manual grouped input keeps its caller id.</FieldDescription>
				<FieldError>Enter a valid manual search term.</FieldError>
			</Field>
			<Field name="input-group-textarea-auto-wire" invalid data-story-field="textarea-auto">
				<FieldLabel>Prompt</FieldLabel>
				<InputGroup>
					<InputGroupTextarea placeholder="Ask a question..." />
				</InputGroup>
				<FieldDescription>Write a complete prompt.</FieldDescription>
				<FieldError>Enter a valid prompt.</FieldError>
			</Field>
			<Field name="input-group-textarea-manual-wire" invalid data-story-field="textarea-manual">
				<FieldLabel for="manual-input-group-textarea">Manual prompt</FieldLabel>
				<InputGroup>
					<InputGroupTextarea id="manual-input-group-textarea" placeholder="Manual prompt..." />
				</InputGroup>
				<FieldDescription>Manual grouped textarea keeps its caller id.</FieldDescription>
				<FieldError>Enter a valid manual prompt.</FieldError>
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		await nextFrame()
		await nextFrame()

		assertFieldControl<HTMLInputElement>(canvas, 'input-auto', 'input[data-slot="input-group-control"]')
		assertFieldControl<HTMLInputElement>(canvas, 'input-manual', 'input[data-slot="input-group-control"]', 'manual-input-group-control')
		assertFieldControl<HTMLTextAreaElement>(canvas, 'textarea-auto', 'textarea[data-slot="input-group-control"]')
		assertFieldControl<HTMLTextAreaElement>(canvas, 'textarea-manual', 'textarea[data-slot="input-group-control"]', 'manual-input-group-textarea')
	},
}
