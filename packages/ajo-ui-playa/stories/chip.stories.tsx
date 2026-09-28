/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { frame } from './play'
import { Chip, chipVariants } from 'ajo-ui-playa/chip'

const variants = ['default', 'secondary', 'danger', 'success', 'warning', 'info', 'outline', 'ghost', 'link'] as const

export default {
	title: 'UI/Chip',
	component: Chip,
	args: {
		variant: 'default',
		children: 'Running',
	},
	argTypes: {
		variant: { control: 'select', options: variants },
		children: { control: 'text', label: 'Text' },
	},
	parameters: {
		docs: { description: 'Compact inline token matching the Ajo Kit Chip API.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Chip>

export const Default: Story<typeof Chip> = {}

export const Variants: Story<typeof Chip> = {
	argTypes: {
		children: { control: false },
		variant: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			{variants.map(variant => <Chip key={variant} {...args} variant={variant}>{variant}</Chip>)}
		</div>
	),
	// Status chips are quiet: their hue as text on a 10% tint of it, not a fill.
	play: async ({ canvas }) => {
		for (const variant of ['success', 'warning', 'info']) {
			const chip = canvas.querySelector<HTMLElement>(`[data-slot="chip"][data-variant="${variant}"]`)
			if (!chip) throw new Error(`Chip ${variant} was not rendered`)
			const fill = getComputedStyle(chip).backgroundColor
			const alpha = Number(/\/\s*([\d.]+)\)$/.exec(fill)?.[1] ?? /^rgba\(.*,\s*([\d.]+)\)$/.exec(fill)?.[1] ?? 1)
			if (alpha > 0.2) throw new Error(`Chip ${variant} is a saturated fill, not a tint: ${fill}`)
		}
	},
}

export const WithIcon: Story<typeof Chip> = {
	args: { variant: 'secondary' },
	argTypes: {
		children: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			<Chip {...args}>
				<span aria-hidden="true" class="i-lucide-circle-check" data-icon="inline-start" />
				Verified
			</Chip>
			<Chip {...args} variant="outline">
				Bookmark
				<span aria-hidden="true" class="i-lucide-bookmark" data-icon="inline-end" />
			</Chip>
		</div>
	),
}

export const Counts: Story<typeof Chip> = {
	args: { variant: 'danger' },
	argTypes: {
		children: { control: false },
	},
	render: args => (
		<div class="flex items-center gap-3">
			<Chip {...args} class="min-w-5 px-1 tabular-nums">3</Chip>
			<Chip {...args} class="min-w-5 px-1 tabular-nums">42</Chip>
			<Chip {...args} class="min-w-5 px-1 tabular-nums">999</Chip>
		</div>
	),
}

const RemovableExample: Stateful = function* () {
	let tags = ['production', 'staging', 'preview']
	const remove = (tag: string) => this.next(() => tags = tags.filter(item => item !== tag))

	while (true) yield (
		<div class="flex flex-wrap items-center gap-2">
			{tags.map(tag => (
				<Chip key={tag} variant="secondary" onRemove={() => remove(tag)}>{tag}</Chip>
			))}
		</div>
	)
}

export const Removable: Story<typeof Chip> = {
	render: () => <RemovableExample />,
	play: async ({ canvas }) => {
		const chips = () => canvas.querySelectorAll('[data-slot="chip"]').length
		const before = chips()

		const remove = canvas.querySelector<HTMLButtonElement>('[data-slot="chip-remove"]')
		if (!remove) throw new Error('Chip remove button was not rendered')

		remove.click()
		await frame(2)

		if (chips() !== before - 1) throw new Error('Chip was not removed')
	},
}

export const Anchor: Story<typeof Chip> = {
	args: {
		as: 'a',
		href: '/dashboard',
		variant: 'outline',
		children: 'Open the app',
	},
}

export const VariantsHelper: Story = {
	render: () => (
		<a href="/dashboard" class={chipVariants({ variant: 'outline' })}>
			Styled with chipVariants
		</a>
	),
}
