/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { Avatar, AvatarFallback, AvatarImage } from 'ajo-ui-playa/avatar'
import { Button } from 'ajo-ui-playa/button'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from 'ajo-ui-playa/item'

const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="%23234c6a"/%3E%3Ccircle cx="32" cy="24" r="12" fill="white"/%3E%3Cpath d="M12 58c4-13 14-20 20-20s16 7 20 20" fill="white"/%3E%3C/svg%3E'

export default {
	title: 'UI/Item',
	component: Item,
	args: {
		variant: 'outline',
		size: 'default',
	},
	argTypes: {
		variant: { control: 'select', options: ['default', 'outline', 'muted'] },
		size: { control: 'select', options: ['default', 'sm', 'xs'] },
	},
	parameters: {
		docs: { description: 'Flexible Ajo Kit content row for media, title, description, and actions.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Item>

export const Basic: Story = {
	args: { title: 'Nightly backup', description: 'Saves every app, domain and secret at 03:00.' },
	render: args => (
		<div class="w-full max-w-md">
			<Item {...args}>
				<ItemContent>
					<ItemTitle>{args.title}</ItemTitle>
					<ItemDescription>{args.description}</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button variant="outline" size="sm">Edit</Button>
				</ItemActions>
			</Item>
		</div>
	),
	play: async ({ canvas }) => {
		const item = canvas.querySelector<HTMLElement>('[data-slot="item"]')
		const title = canvas.querySelector<HTMLElement>('[data-slot="item-title"]')
		const actions = canvas.querySelector<HTMLElement>('[data-slot="item-actions"]')
		if (!item || !title || !actions) throw new Error('Item composition was not rendered')

		if (item.getAttribute('data-variant') !== 'outline' || item.getAttribute('data-size') !== 'default') {
			throw new Error('Item did not expose variant or size data')
		}
	},
}

export const WithIcon: Story = {
	render: args => (
		<div class="w-full max-w-md">
			<Item {...args}>
				<ItemMedia variant="icon">
					<span aria-hidden="true" class="i-lucide-shield-alert size-4" />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>New sign-in</ItemTitle>
					<ItemDescription>Firefox on Linux signed in from 203.0.113.24.</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button size="sm" variant="outline">Review</Button>
				</ItemActions>
			</Item>
		</div>
	),
	play: async ({ canvas }) => {
		const media = canvas.querySelector<HTMLElement>('[data-slot="item-media"]')
		if (!media || media.getAttribute('data-variant') !== 'icon') {
			throw new Error('Item icon media was not rendered')
		}
	},
}

export const WithAvatar: Story = {
	render: args => (
		<div class="w-full max-w-md">
			<Item {...args}>
				<ItemMedia>
					<Avatar class="size-10">
						<AvatarImage src={image} alt="Grace Hopper" />
						<AvatarFallback>GH</AvatarFallback>
					</Avatar>
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Grace Hopper</ItemTitle>
					<ItemDescription>Invited 2 days ago, not joined yet</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button size="none" variant="outline" class="size-8 rounded-full" aria-label="Resend invitation">
						<span aria-hidden="true" class="i-lucide-plus size-4" />
					</Button>
				</ItemActions>
			</Item>
		</div>
	),
	play: async ({ canvas }) => {
		const avatar = canvas.querySelector<HTMLElement>('[data-slot="avatar"]')
		const action = canvas.querySelector<HTMLButtonElement>('[data-slot="item-actions"] button')
		if (!avatar || !action || !canvas.textContent?.includes('Grace Hopper')) {
			throw new Error('Item avatar content was not rendered')
		}
		const bounds = action.getBoundingClientRect()
		const radius = Number.parseFloat(getComputedStyle(action).borderTopLeftRadius)
		if (
			Math.abs(bounds.width - 32) > 0.5
			|| Math.abs(bounds.height - 32) > 0.5
			|| Math.abs(bounds.width - bounds.height) > 0.5
			|| radius < bounds.width / 2
		) {
			throw new Error('Item avatar action did not render as a circular icon button')
		}
	},
}

export const Variants: Story = {
	render: () => (
		<div class="grid w-full max-w-md gap-3">
			<Item>
				<ItemContent>
					<ItemTitle>Default variant</ItemTitle>
					<ItemDescription>Transparent, with no border.</ItemDescription>
				</ItemContent>
			</Item>
			<Item variant="outline">
				<ItemContent>
					<ItemTitle>Outline variant</ItemTitle>
					<ItemDescription>A hairline around the row.</ItemDescription>
				</ItemContent>
			</Item>
			<Item variant="muted">
				<ItemContent>
					<ItemTitle>Muted variant</ItemTitle>
					<ItemDescription>A muted fill for secondary content.</ItemDescription>
				</ItemContent>
			</Item>
		</div>
	),
	play: async ({ canvas }) => {
		const variants = Array.from(canvas.querySelectorAll('[data-slot="item"]')).map(node => node.getAttribute('data-variant'))
		if (variants.join(',') !== 'default,outline,muted') {
			throw new Error('Item variants were not rendered in order')
		}
	},
}

export const Sizes: Story = {
	render: () => (
		<div class="grid w-full max-w-md gap-3">
			{(['default', 'sm', 'xs'] as const).map(size => (
				<Item key={size} size={size} variant="outline">
					<ItemMedia>
						<span aria-hidden="true" class="i-lucide-inbox size-4" />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>{size === 'xs' ? 'Extra small' : size === 'sm' ? 'Small' : 'Default'} size</ItemTitle>
						<ItemDescription>The {size} item size.</ItemDescription>
					</ItemContent>
				</Item>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const sizes = Array.from(canvas.querySelectorAll('[data-slot="item"]')).map(node => node.getAttribute('data-size'))
		if (sizes.join(',') !== 'default,sm,xs') {
			throw new Error('Item sizes were not rendered in order')
		}
	},
}

const people = [
	['AL', 'Ada Lovelace', 'ada@example.com'],
	['GH', 'Grace Hopper', 'grace@example.com'],
	['AT', 'Alan Turing', 'alan@example.com'],
]

// Every row's title starts on one column, whatever the width of its initials.
const aligned = (canvas: HTMLElement) => {
	const rtl = getComputedStyle(canvas).direction === 'rtl'
	const starts = [...canvas.querySelectorAll<HTMLElement>('[data-slot="item-title"]')]
		.map(title => rtl ? title.getBoundingClientRect().right : title.getBoundingClientRect().left)
	if (Math.max(...starts) - Math.min(...starts) > 0.5) throw new Error(`Item titles start at ${starts.join(', ')}, not on one column`)
}

export const Group: Story = {
	render: () => (
		<ItemGroup class="w-full max-w-md" role="list">
			{people.map(([initials, name, email]) => (
				<Item key={email} role="listitem" variant="outline">
					<ItemMedia>
						<Avatar>
							<AvatarFallback>{initials}</AvatarFallback>
						</Avatar>
					</ItemMedia>
					<ItemContent>
						<ItemTitle>{name}</ItemTitle>
						<ItemDescription>{email}</ItemDescription>
					</ItemContent>
				</Item>
			))}
		</ItemGroup>
	),
	// Outline items in a group are one panel with a hairline between rows,
	// never cards stacked edge to edge.
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="item-group"]')
		const rows = [...canvas.querySelectorAll<HTMLElement>('[data-slot="item"]')]
		if (!group || rows.length !== 3 || group.getAttribute('role') !== 'list') {
			throw new Error('Item group was not rendered')
		}

		const panel = getComputedStyle(group)
		if (panel.borderTopWidth !== '1px' || panel.borderTopLeftRadius === '0px') {
			throw new Error(`Item group is not one panel: ${panel.borderTopWidth} ${panel.borderTopLeftRadius}`)
		}
		rows.forEach((row, index) => {
			const style = getComputedStyle(row)
			const framed = style.borderTopLeftRadius !== '0px' || (style.boxShadow !== 'none' && style.boxShadow.includes('inset'))
			const separated = index === 0 ? style.borderTopWidth === '0px' : style.borderTopWidth === '1px'
			if (framed || !separated) throw new Error(`Item row ${index + 1} is a card of its own, not a row of the panel: ${style.borderTopLeftRadius} ${style.boxShadow} ${style.borderTopWidth}`)
		})
		aligned(canvas)

		// A gap the author sets on the group does not open blank bands inside the panel.
		group.classList.add('gap-4')
		try {
			rows.slice(1).forEach((row, index) => {
				const band = row.getBoundingClientRect().top - rows[index]!.getBoundingClientRect().bottom
				if (Math.abs(band) > 0.5) throw new Error(`Item panel rows ${index + 1} and ${index + 2} are ${band} px apart`)
			})
		} finally {
			group.classList.remove('gap-4')
		}
	},
}

export const Separated: Story = {
	render: () => (
		<ItemGroup class="w-full max-w-md">
			{people.flatMap(([initials, name, email], index) => [
				index > 0 && <ItemSeparator key={`separator-${email}`} />,
				<Item key={email}>
					<ItemMedia>
						<Avatar>
							<AvatarFallback>{initials}</AvatarFallback>
						</Avatar>
					</ItemMedia>
					<ItemContent>
						<ItemTitle>{name}</ItemTitle>
						<ItemDescription>{email}</ItemDescription>
					</ItemContent>
				</Item>,
			])}
		</ItemGroup>
	),
	play: async ({ canvas }) => {
		if (canvas.querySelectorAll('[data-slot="item-separator"]').length !== 2) throw new Error('Item separators were not rendered')
		aligned(canvas)
	},
}

export const Link: Story = {
	render: args => (
		<div class="w-full max-w-md">
			<Item {...args} as="a" href="#docs">
				<ItemMedia>
					<span aria-hidden="true" class="i-lucide-home size-4" />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Dashboard</ItemTitle>
					<ItemDescription>Host health, recent deploys and logs.</ItemDescription>
				</ItemContent>
				<ItemActions>
					<span aria-hidden="true" class="i-lucide-chevron-right size-4 rtl:-scale-x-100" />
				</ItemActions>
			</Item>
		</div>
	),
	play: async ({ canvas }) => {
		const link = canvas.querySelector<HTMLAnchorElement>('a[data-slot="item"]')
		if (!link || link.getAttribute('href') !== '#docs') {
			throw new Error('Item link mode was not rendered')
		}
	},
}
