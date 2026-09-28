/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { frame } from './play'
import { Button, buttonVariants } from 'ajo-ui-playa/button'

const variants = ['default', 'danger', 'danger-ghost', 'outline', 'secondary', 'ghost', 'muted-ghost', 'link'] as const

export default {
	title: 'UI/Button',
	component: Button,
	args: {
		variant: 'default',
		size: 'default',
		children: 'Button',
		disabled: false,
	},
	argTypes: {
		children: { control: 'text', label: 'Text' },
		variant: { control: 'select', options: variants },
		size: { control: 'select', options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Interactive action surface matching the Ajo Kit Button API.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Button>

export const Default: Story<typeof Button> = {}

export const Variants: Story<typeof Button> = {
	argTypes: {
		children: { control: false },
		variant: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			{variants.map(variant => <Button key={variant} {...args} variant={variant}>{variant}</Button>)}
		</div>
	),
	play: async ({ canvas }) => {
		const background = (variant: string) => getComputedStyle(canvas.querySelector<HTMLElement>(`[data-variant="${variant}"]`)!).backgroundImage
		// The plate is the one gradient; every other fill is flat.
		if (!background('default').includes('gradient')) throw new Error('The primary action does not wear the plate')
		for (const variant of variants.slice(1)) {
			if (background(variant) !== 'none') throw new Error(`${variant} paints a gradient`)
		}
	},
}

export const Sizes: Story<typeof Button> = {
	argTypes: {
		children: { control: false },
		size: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			<Button {...args} size="xs">Extra small</Button>
			<Button {...args} size="sm">Small</Button>
			<Button {...args} size="default">Default</Button>
			<Button {...args} size="lg">Large</Button>
		</div>
	),
}

export const WithIcon: Story<typeof Button> = {
	argTypes: {
		children: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			<Button {...args}>
				<span class="i-lucide-plus" />
				Create
			</Button>
			<Button {...args} variant="outline">
				Download
				<span class="i-lucide-chevron-right rtl:-scale-x-100" />
			</Button>
		</div>
	),
}

export const IconOnly: Story<typeof Button> = {
	argTypes: {
		children: { control: false },
		size: { control: false },
	},
	render: args => (
		<div class="flex flex-wrap items-center gap-2">
			<Button {...args} size="icon" variant="outline" aria-label="Add">
				<span class="i-lucide-plus" />
			</Button>
			<Button {...args} size="icon-sm" variant="danger-ghost" aria-label="Delete">
				<span class="i-lucide-trash-2" />
			</Button>
			<Button {...args} size="icon-lg" variant="ghost" aria-label="Remove">
				<span class="i-lucide-x" />
			</Button>
		</div>
	),
}

export const Anchor: Story<typeof Button> = {
	args: {
		as: 'a',
		href: '/dashboard',
		variant: 'outline',
		children: 'Go to dashboard',
	},
}

export const DisabledAnchor: Story<typeof Button> = {
	args: {
		as: 'a',
		href: '/dashboard',
		variant: 'outline',
		disabled: true,
		children: 'Unavailable',
	},
}

export const VariantsHelper: Story = {
	render: () => (
		<a href="/dashboard" class={buttonVariants({ variant: 'link' })}>
			Link styled with buttonVariants
		</a>
	),
}

// Activations the Loading story's buttons received: clicks and form submits.
const received = { clicks: 0, submits: 0 }

// Save changes, text only, then Create app with its icon: each busy one keeps
// its width, its look and its accessible name, and ignores activation. The
// spinner covers a label without an icon and takes an icon's place.
export const Loading: Story<typeof Button> = {
	args: { loading: true },
	argTypes: {
		children: { control: false },
		loading: { control: 'boolean' },
	},
	render: args => (
		<form
			class="flex flex-wrap items-center gap-2"
			set:onsubmit={(event: Event) => {
				event.preventDefault()
				received.submits++
			}}
		>
			<Button {...args} type="button" variant="secondary" loading={false}>Cancel</Button>
			<Button {...args} type="button" variant="secondary" data-story-busy="text">Save changes</Button>
			<Button {...args} type="submit" data-story-busy="icon" set:onclick={() => received.clicks++}>
				<span aria-hidden="true" class="i-lucide-plus" />
				Create app
			</Button>
		</form>
	),
	play: async ({ canvas, setArg }) => {
		const busy = (name: string) => canvas.querySelector<HTMLButtonElement>(`[data-story-busy="${name}"]`)!
		const widths = () => [busy('text').offsetWidth, busy('icon').offsetWidth]
		try {
			setArg('loading', false)
			await frame(2)
			const rest = widths()
			busy('icon').click()
			if (received.clicks !== 1 || received.submits !== 1) throw new Error('An idle button did not click and submit')

			setArg('loading', true)
			await frame(2)
			for (const name of ['text', 'icon']) {
				const button = busy(name)
				if (button.getAttribute('aria-busy') !== 'true' || button.getAttribute('aria-disabled') !== 'true') throw new Error(`Busy ${name} button is not aria-busy and aria-disabled`)
				if (getComputedStyle(button).opacity !== '1') throw new Error(`Busy ${name} button dims, so the plate loses its metal`)
				if (button.firstElementChild?.getAttribute('data-slot') !== 'spinner') throw new Error(`Busy ${name} button shows no spinner first`)
			}
			if (busy('icon').querySelector<HTMLElement>('.i-lucide-plus')!.offsetParent !== null) throw new Error('The spinner did not take the icon\'s place')
			const now = widths()
			if (now[0] !== rest[0]) throw new Error(`Busy Save changes changed width: ${rest[0]} to ${now[0]}`)
			if (now[1] !== rest[1]) throw new Error(`Busy Create app changed width: ${rest[1]} to ${now[1]}`)
			// Text only: the label keeps its room and name but is not painted,
			// and the spinner, in the label's colour, sits centred over it.
			const text = busy('text')
			const spinner = text.firstElementChild!.getBoundingClientRect()
			const box = text.getBoundingClientRect()
			if (Math.abs(spinner.left + spinner.width / 2 - (box.left + box.width / 2)) > 0.5 || Math.abs(spinner.top + spinner.height / 2 - (box.top + box.height / 2)) > 0.5) throw new Error('The spinner is not centred over the busy label')
			await Promise.all(text.getAnimations().map(animation => animation.finished))
			const fill = getComputedStyle(text).webkitTextFillColor
			if (fill !== 'rgba(0, 0, 0, 0)') throw new Error(`The busy label is still painted under the spinner (${fill})`)
			if (!text.textContent?.includes('Save changes')) throw new Error('The busy button lost its name')
			if (getComputedStyle(busy('icon')).webkitTextFillColor === 'rgba(0, 0, 0, 0)') throw new Error('A busy button with an icon hid its label')
			busy('icon').click()
			if (received.clicks !== 1 || received.submits !== 1) throw new Error('A busy button ran its click handler or submitted its form')
		} finally {
			received.clicks = 0
			received.submits = 0
			setArg('loading', true)
		}
	},
}
