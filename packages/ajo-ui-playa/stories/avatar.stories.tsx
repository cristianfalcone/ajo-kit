/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { frame } from './play'
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
} from 'ajo-ui-playa/avatar'

const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="%23234c6a"/%3E%3Ccircle cx="32" cy="24" r="12" fill="white"/%3E%3Cpath d="M12 58c4-13 14-20 20-20s16 7 20 20" fill="white"/%3E%3C/svg%3E'

export default {
	title: 'UI/Avatar',
	component: Avatar,
	args: {
		size: 'default',
		src: image,
		alt: 'Grace Hopper',
		fallback: 'GH',
	},
	argTypes: {
		size: { control: 'select', options: ['sm', 'default', 'lg'] },
		src: { control: 'text' },
		alt: { control: 'text' },
		fallback: { control: 'text' },
	},
	render: ({ alt, fallback, src, ...args }) => (
		<Avatar {...args}>
			<AvatarImage src={String(src)} alt={String(alt)} />
			<AvatarFallback>{fallback}</AvatarFallback>
		</Avatar>
	),
	parameters: {
		docs: { description: 'User avatar with image fallback, badge, group, count, and Ajo Kit sizes.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Avatar>

export const Basic: Story<typeof Avatar> = {
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="avatar"]')
		const img = canvas.querySelector<HTMLImageElement>('[data-slot="avatar-image"]')
		const fallback = canvas.querySelector<HTMLElement>('[data-slot="avatar-fallback"]')
		if (!root || !img || !fallback) throw new Error('Avatar composition was not rendered')

		if (root.getAttribute('data-size') !== 'default' || img.alt !== 'Grace Hopper' || img.loading !== 'lazy') {
			throw new Error('Avatar did not expose default size or image attributes')
		}
	},
}

export const Fallback: Story<typeof Avatar> = {
	args: {
		src: '/missing-avatar.png',
		alt: 'Missing avatar',
	},
	play: async ({ canvas }) => {
		const img = canvas.querySelector<HTMLImageElement>('[data-slot="avatar-image"]')
		const fallback = canvas.querySelector<HTMLElement>('[data-slot="avatar-fallback"]')
		if (!img || !fallback) throw new Error('Fallback avatar was not rendered')

		img.dispatchEvent(new Event('error'))
		await frame()

		if (!img.hidden || fallback.textContent !== 'GH') {
			throw new Error('Avatar image error did not reveal fallback')
		}
	},
}

export const Badge: Story<typeof Avatar> = {
	args: {
		label: 'Online',
	},
	argTypes: {
		label: { control: 'text', label: 'Badge label' },
	},
	render: ({ alt, fallback, label, src, ...args }) => (
		<Avatar {...args}>
			<AvatarImage src={String(src)} alt={String(alt)} />
			<AvatarFallback>{fallback}</AvatarFallback>
			<AvatarBadge class="bg-success" aria-label={String(label)} />
		</Avatar>
	),
	play: async ({ canvas }) => {
		const badge = canvas.querySelector<HTMLElement>('[data-slot="avatar-badge"]')
		if (!badge || badge.getAttribute('aria-label') !== 'Online') {
			throw new Error('Avatar badge was not rendered')
		}
	},
}

export const WithIconBadge: Story<typeof Avatar> = {
	args: {
		size: 'lg',
		fallback: 'AT',
		label: 'Invite a member',
	},
	argTypes: {
		label: { control: 'text', label: 'Badge label' },
	},
	render: ({ alt, fallback, label, src, ...args }) => (
		<Avatar {...args}>
			<AvatarImage src={String(src)} alt={String(alt)} />
			<AvatarFallback>{fallback}</AvatarFallback>
			<AvatarBadge aria-label={String(label)}>
				<span aria-hidden="true" class="i-lucide-plus" />
			</AvatarBadge>
		</Avatar>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="avatar"]')
		const icon = canvas.querySelector<HTMLElement>('.i-lucide-plus')
		if (!root || !icon || root.getAttribute('data-size') !== 'lg') {
			throw new Error('Avatar icon badge or large size was not rendered')
		}
	},
}

export const Group: Story<typeof Avatar> = {
	args: {
		members: ['GH', 'AL', 'AT'],
		count: '+3',
	},
	argTypes: {
		fallback: { control: false },
		count: { control: 'text' },
	},
	render: ({ alt, count, fallback: _fallback, members, src, ...args }) => (
		<AvatarGroup>
			{members.map((member: string, index: number) => (
				<Avatar key={member} {...args}>
					{index === 0 ? <AvatarImage src={String(src)} alt={String(alt)} /> : null}
					<AvatarFallback>{member}</AvatarFallback>
				</Avatar>
			))}
			<AvatarGroupCount>{count}</AvatarGroupCount>
		</AvatarGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="avatar-group"]')
		const count = canvas.querySelector<HTMLElement>('[data-slot="avatar-group-count"]')
		if (!group || !count || count.textContent !== '+3') {
			throw new Error('Avatar group count was not rendered')
		}

		// The next avatar and its separating ring overlap an avatar's edge, never its initials.
		const rtl = getComputedStyle(group).direction === 'rtl'
		for (const avatar of group.querySelectorAll<HTMLElement>(':scope > [data-slot="avatar"]:not(:has([data-slot="avatar-image"]))')) {
			const text = avatar.querySelector('[data-slot="avatar-fallback"]')?.firstChild
			const next = avatar.nextElementSibling
			if (!text || !next) throw new Error('Avatar group fallback was not rendered')
			const range = document.createRange()
			range.selectNodeContents(text)
			const initials = range.getBoundingClientRect()
			const ring = 2 // the ring-2 that separates grouped avatars
			const edge = rtl ? next.getBoundingClientRect().right + ring : next.getBoundingClientRect().left - ring
			if (rtl ? initials.left < edge : initials.right > edge) {
				throw new Error(`Avatar group cuts the initials ${text.textContent}: they end at ${rtl ? initials.left : initials.right}, the next avatar's ring starts at ${edge}`)
			}
		}
	},
}

export const Sizes: Story<typeof Avatar> = {
	argTypes: {
		size: { control: false },
		src: { control: false },
		alt: { control: false },
		fallback: { control: false },
	},
	render: ({ alt: _alt, fallback: _fallback, size: _size, src: _src, ...args }) => (
		<div class="flex items-center gap-4">
			<Avatar {...args} size="sm">
				<AvatarFallback>AL</AvatarFallback>
			</Avatar>
			<Avatar {...args}>
				<AvatarFallback>GH</AvatarFallback>
			</Avatar>
			<Avatar {...args} size="lg">
				<AvatarFallback>AT</AvatarFallback>
			</Avatar>
		</div>
	),
	play: async ({ canvas }) => {
		const sizes = Array.from(canvas.querySelectorAll('[data-slot="avatar"]')).map(node => node.getAttribute('data-size'))
		if (sizes.join(',') !== 'sm,default,lg') {
			throw new Error('Avatar sizes were not rendered in order')
		}
	},
}
