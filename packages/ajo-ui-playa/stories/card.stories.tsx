/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { AspectRatio } from 'ajo-ui-playa/aspect-ratio'
import { Button } from 'ajo-ui-playa/button'
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from 'ajo-ui-playa/card'
import { Chip } from 'ajo-ui-playa/chip'

export default {
	title: 'UI/Card',
	component: Card,
	args: {
		size: 'default',
	},
	argTypes: {
		size: { control: 'radio', options: ['default', 'sm'] },
	},
	parameters: {
		docs: { description: 'Structured content container with header, content, footer, and action slots.' },
	},
} satisfies Meta<typeof Card>

// A computed colour as 0-255 channels, whether the engine wrote rgb() or color(srgb).
const channels = (value: string) => {
	const numbers = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
	return (value.startsWith('color(') ? numbers.map(number => number * 255) : numbers).map(Math.round).join(',')
}

// Whether a surface casts a shadow: an outer box-shadow that is not transparent.
const casts = (style: CSSStyleDeclaration) => style.boxShadow.split(/,(?![^(]*\))/)
	.some(shadow => !shadow.includes('inset') && !shadow.trim().startsWith('rgba(0, 0, 0, 0)') && shadow.trim() !== 'none')

// The bottom of an element's text and its font size.
const text = (element: HTMLElement) => {
	const range = document.createRange()
	range.selectNodeContents(element)
	return { bottom: range.getBoundingClientRect().bottom, size: Number.parseFloat(getComputedStyle(element).fontSize) }
}

// The baseline of a block's first line: the top of an empty inline block placed in it.
const baseline = (element: HTMLElement) => {
	const probe = element.appendChild(document.createElement('span'))
	probe.style.display = 'inline-block'
	const top = probe.getBoundingClientRect().top
	probe.remove()
	return top
}

// A storefront banner for the media story: sky, sea and a pier at dusk.
const banner = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200"><defs><linearGradient id="s" x2="0" y2="1"><stop offset="0" stop-color="#8f95b1"/><stop offset="1" stop-color="#2f3d5c"/></linearGradient></defs><rect width="600" height="200" fill="url(#s)"/><rect y="130" width="600" height="70" fill="#1e2a44"/><path d="M360 128h200v6H360zM380 134h6v40h-6zM450 134h6v40h-6zM520 134h6v40h-6z" fill="#c9b27c"/></svg>')}`

export const Default: Story<typeof Card> = {
	args: {
		title: 'Sign in to host-01',
		description: 'Use the email your invitation was sent to.',
	},
	render: ({ title, description, ...args }) => (
		<Card {...args} class="w-full max-w-sm">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
				<CardAction>
					<Button variant="link" size="sm">Create account</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<div class="grid gap-3">
					<label class="grid gap-2 text-sm font-medium">
						Email
						<input class="h-control px-3 text-sm playa-field" placeholder="ada@example.com" />
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Password
						<input class="h-control px-3 text-sm playa-field" type="password" />
					</label>
				</div>
			</CardContent>
			<CardFooter class="gap-2">
				<Button class="flex-1">Sign in</Button>
				<Button variant="outline" class="flex-1">Email me a link</Button>
			</CardFooter>
		</Card>
	),
	// Enamel at rest: the card fill and its hairline, no shadow; the header
	// action sits on the title's baseline and the description runs under both.
	play: async ({ canvas }) => {
		const card = canvas.querySelector<HTMLElement>('[data-slot="card"]')
		const title = canvas.querySelector<HTMLElement>('[data-slot="card-title"]')
		const description = canvas.querySelector<HTMLElement>('[data-slot="card-description"]')
		const slot = canvas.querySelector<HTMLElement>('[data-slot="card-action"]')
		const action = slot?.querySelector<HTMLElement>('button')
		if (!card || !title || !description || !slot || !action) throw new Error('Card parts were not rendered')

		const probe = canvas.appendChild(document.createElement('div'))
		probe.style.backgroundColor = 'var(--card)'
		const fill = getComputedStyle(probe).backgroundColor
		probe.remove()
		const style = getComputedStyle(card)
		if (channels(style.backgroundColor) !== channels(fill) || casts(style)) throw new Error(`Card is not flat enamel: ${style.backgroundColor} ${style.boxShadow}`)
		// The action's text is in the same face at another size, so its baseline sits
		// the same share of its size above the bottom of its text as the title's does.
		const line = baseline(title)
		const own = text(title)
		const label = text(action)
		const offset = label.bottom - (own.bottom - line) / own.size * label.size - line
		if (Math.abs(offset) > 1) throw new Error(`Card action is off the title baseline by ${offset} px`)
		const rtl = getComputedStyle(card).direction === 'rtl'
		const end = rtl ? slot.getBoundingClientRect().left - description.getBoundingClientRect().left : description.getBoundingClientRect().right - slot.getBoundingClientRect().right
		if (Math.abs(end) > 0.5) throw new Error(`Card description stops ${end} px short of the header's end, beside an empty cell`)
	},
}

export const Small: Story<typeof Card> = {
	args: {
		size: 'sm',
		title: 'Disk',
		description: '72 of 80 GB used.',
		content: 'Old versions take 6.2 GB. Deleting them keeps the running version and the two before it.',
	},
	render: ({ title, description, content, ...args }) => (
		<Card {...args} class="w-full max-w-xs">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
				<CardAction>
					<Button variant="outline" size="sm">Clean up</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				{content}
			</CardContent>
		</Card>
	),
}

export const WithMedia: Story<typeof Card> = {
	args: {
		title: 'shop-web',
		description: 'The storefront, served at www.shop.example.com.',
		chip: 'Running',
	},
	render: ({ title, description, chip, ...args }) => (
		<Card {...args} class="max-w-md">
			<AspectRatio ratio={3}>
				<img src={banner} alt="The shop-web storefront banner" class="size-full object-cover" />
			</AspectRatio>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
				<CardAction>
					<Chip variant="success">{chip}</Chip>
				</CardAction>
			</CardHeader>
			<CardFooter>
				<Button variant="outline">Open app</Button>
			</CardFooter>
		</Card>
	),
	// Media placed first sits flush with the card's top edge, with no band above it.
	play: async ({ canvas }) => {
		const card = canvas.querySelector<HTMLElement>('[data-slot="card"]')
		const media = card?.firstElementChild
		if (!card || !media) throw new Error('Card media was not rendered')
		const gap = media.getBoundingClientRect().top - card.getBoundingClientRect().top
		if (Math.abs(gap) > 0.5) throw new Error(`Card media sits ${gap} px below the card's top edge`)
	},
}

// A stateful page rendered inside a Card (the demo's sign-in layout) arrives in
// Ajo's wrapper div, collapsed so the card parts join the card's column.
export const WrappedParts: Story<typeof Card> = {
	args: {
		title: 'Reset your password',
		description: 'We send a link to the email on your account.',
	},
	render: ({ title, description, ...args }) => (
		<Card {...args} class="w-full max-w-sm [&>div:not([data-slot])]:contents">
			<div>
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardFooter>
					<Button class="flex-1">Send the link</Button>
				</CardFooter>
			</div>
		</Card>
	),
	// Only media sits flush: a wrapper first child keeps the card's top padding.
	play: async ({ canvas }) => {
		const card = canvas.querySelector<HTMLElement>('[data-slot="card"]')
		const title = canvas.querySelector<HTMLElement>('[data-slot="card-title"]')
		if (!card || !title) throw new Error('Wrapped card parts were not rendered')
		const padding = getComputedStyle(card).paddingTop
		const inset = title.getBoundingClientRect().top - card.getBoundingClientRect().top
		if (padding !== '24px' || inset < 24) throw new Error(`A wrapper first child dropped the card's top padding: ${padding}, title ${inset} px from the edge`)
	},
}

export const EdgeToEdge: Story<typeof Card> = {
	args: {
		title: 'Delete the old versions?',
		description: 'Frees 6.2 GB on host-01.',
		content: 'The 14 versions older than 30 days are deleted. The running version and the two before it stay, so a rollback still works.',
	},
	render: ({ title, description, content, ...args }) => (
		<Card {...args} class="max-w-lg">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent class="bg-muted py-4 text-sm text-muted-foreground">
				{content}
			</CardContent>
			<CardFooter class="justify-end gap-2">
				<Button variant="secondary">Cancel</Button>
				<Button>Delete versions</Button>
			</CardFooter>
		</Card>
	),
}

export const Anchor: Story<typeof Card> = {
	args: {
		href: '/dashboard',
		title: 'Open the dashboard',
		description: 'Host health, recent deploys and logs.',
	},
	render: ({ title, description, ...args }) => (
		<Card
			{...args}
			as="a"
			class="block max-w-sm transition-colors hover:bg-accent hover:text-accent-foreground"
			href={String(args.href)}
		>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
		</Card>
	),
}
