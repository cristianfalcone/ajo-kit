/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { frame } from './play'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from 'ajo-ui-playa/input-group'
import { Kbd } from 'ajo-ui-playa/kbd'

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
		await frame()

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
		// Only inset layers may remain (the plate's own edge): nothing cast outside it.
		const cast = run && getComputedStyle(run).boxShadow.split(/,(?![^(]*\))/).filter(layer => !layer.includes('inset') && !/^\s*rgba\(0, 0, 0, 0\)/.test(layer) && layer.trim() !== 'none')
		if (!run || cast?.length) {
			throw new Error('Input group button did not opt out of its standalone variant shadow')
		}
	},
}
