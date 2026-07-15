/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { Avatar, AvatarFallback, AvatarImage } from 'ajo-ui-playa/avatar'
import Button from 'ajo-ui-playa/button'
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

const fixed = { variant: { control: false }, size: { control: false } } as const

export const Basic: Story = {
	args: { title: 'Basic Item', description: 'A simple item with title and description.' },
	render: args => (
		<div class="w-full max-w-md">
			<Item {...args}>
				<ItemContent>
					<ItemTitle>{args.title}</ItemTitle>
					<ItemDescription>{args.description}</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button variant="outline" size="sm">Action</Button>
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
					<ItemTitle>Security Alert</ItemTitle>
					<ItemDescription>New login detected from unknown device.</ItemDescription>
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
						<AvatarImage src={image} alt="@evilrabbit" />
						<AvatarFallback>ER</AvatarFallback>
					</Avatar>
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Evil Rabbit</ItemTitle>
					<ItemDescription>Last seen 5 months ago</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button size="none" variant="outline" class="size-8 rounded-full" aria-label="Invite">
						<span aria-hidden="true" class="i-lucide-plus size-4" />
					</Button>
				</ItemActions>
			</Item>
		</div>
	),
	play: async ({ canvas }) => {
		const avatar = canvas.querySelector<HTMLElement>('[data-slot="avatar"]')
		const action = canvas.querySelector<HTMLButtonElement>('[data-slot="item-actions"] button')
		if (!avatar || !action || !canvas.textContent?.includes('Evil Rabbit')) {
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
	argTypes: fixed,
	render: () => (
		<div class="grid w-full max-w-md gap-3">
			<Item>
				<ItemContent>
					<ItemTitle>Default Variant</ItemTitle>
					<ItemDescription>Transparent background with no border.</ItemDescription>
				</ItemContent>
			</Item>
			<Item variant="outline">
				<ItemContent>
					<ItemTitle>Outline Variant</ItemTitle>
					<ItemDescription>Outlined style with a visible border.</ItemDescription>
				</ItemContent>
			</Item>
			<Item variant="muted">
				<ItemContent>
					<ItemTitle>Muted Variant</ItemTitle>
					<ItemDescription>Muted background for secondary content.</ItemDescription>
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
	argTypes: fixed,
	render: () => (
		<div class="grid w-full max-w-md gap-3">
			{(['default', 'sm', 'xs'] as const).map(size => (
				<Item key={size} size={size} variant="outline">
					<ItemMedia>
						<span aria-hidden="true" class="i-lucide-inbox size-4" />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>{size === 'xs' ? 'Extra Small' : size === 'sm' ? 'Small' : 'Default'} Size</ItemTitle>
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

export const Group: Story = {
	argTypes: fixed,
	render: () => (
		<ItemGroup class="w-full max-w-md rounded-md edge">
			<Item>
				<ItemMedia><span class="font-medium">s</span></ItemMedia>
				<ItemContent>
					<ItemTitle>Ajo Kit</ItemTitle>
					<ItemDescription>team@ajo.dev</ItemDescription>
				</ItemContent>
			</Item>
			<ItemSeparator />
			<Item>
				<ItemMedia><span class="font-medium">m</span></ItemMedia>
				<ItemContent>
					<ItemTitle>maxleiter</ItemTitle>
					<ItemDescription>maxleiter@vercel.com</ItemDescription>
				</ItemContent>
			</Item>
		</ItemGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="item-group"]')
		const separator = canvas.querySelector<HTMLElement>('[data-slot="item-separator"]')
		if (!group || !separator || group.getAttribute('role') !== 'list') {
			throw new Error('Item group or separator was not rendered')
		}
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
					<ItemDescription>Overview of your account and activity.</ItemDescription>
				</ItemContent>
				<ItemActions>
					<span aria-hidden="true" class="i-lucide-chevron-right size-4" />
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
