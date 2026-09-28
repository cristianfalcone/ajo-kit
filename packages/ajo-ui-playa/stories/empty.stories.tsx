/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { Button } from 'ajo-ui-playa/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from 'ajo-ui-playa/empty'

export default {
	title: 'UI/Empty',
	component: Empty,
	parameters: {
		docs: { description: 'Composable empty-state layout matching the Ajo Kit Empty API.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Empty>

export const Default: Story = {
	args: {
		title: 'No apps yet',
		description: 'Deploy an app and it shows up here with its versions, domains and logs.',
	},
	render: args => (
		<Empty class="w-[32rem]">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<span aria-hidden="true" class="i-lucide-rocket" />
				</EmptyMedia>
				<EmptyTitle>{args.title}</EmptyTitle>
				<EmptyDescription>
					{args.description}
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<div class="flex flex-wrap justify-center gap-2">
					<Button>Deploy your first app</Button>
					<Button variant="outline">Import from Git</Button>
				</div>
			</EmptyContent>
			<EmptyDescription>
				<a href="#learn-empty">How deploys work</a>
			</EmptyDescription>
		</Empty>
	),
	play: async ({ canvas }) => {
		const slots = [
			'empty',
			'empty-header',
			'empty-media',
			'empty-title',
			'empty-description',
			'empty-content',
		]

		for (const slot of slots) {
			if (!canvas.querySelector(`[data-slot="${slot}"]`)) {
				throw new Error(`Empty slot ${slot} was not rendered`)
			}
		}

		const description = canvas.querySelector('[data-slot="empty-description"]')
		const media = canvas.querySelector('[data-slot="empty-media"]')
		if (description?.tagName !== 'P') throw new Error('EmptyDescription should render a paragraph')
		if (media?.getAttribute('data-variant') !== 'icon') throw new Error('EmptyMedia did not expose icon variant')
		// Designed states: the icon sits in a 40 px disc at a readable 20 px.
		const disc = media.getBoundingClientRect()
		const icon = media.firstElementChild?.getBoundingClientRect()
		const radius = Number.parseFloat(getComputedStyle(media).borderTopLeftRadius)
		if (disc.width !== 40 || radius < 20 || icon?.width !== 20) {
			throw new Error(`EmptyMedia icon is not a 40 px disc with a 20 px icon: ${disc.width} ${radius} ${icon?.width}`)
		}
	},
}

export const Outline: Story = {
	render: () => (
		<Empty class="w-[32rem] border border-dashed">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<span aria-hidden="true" class="i-lucide-hard-drive" />
				</EmptyMedia>
				<EmptyTitle>No backups yet</EmptyTitle>
				<EmptyDescription>
					The first backup runs tonight at 03:00. Run one now to have it sooner.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button variant="outline" size="sm">Back up now</Button>
			</EmptyContent>
		</Empty>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="empty"]')
		if (!root?.className.includes('border-dashed')) throw new Error('Outline empty state should keep dashed border styling')
	},
}

export const Background: Story = {
	render: () => (
		<Empty class="h-80 w-[32rem] bg-muted/30">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<span aria-hidden="true" class="i-lucide-bell" />
				</EmptyMedia>
				<EmptyTitle>No notifications</EmptyTitle>
				<EmptyDescription class="max-w-xs">
					Deploys, failed checks and new sign-ins show up here.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button variant="outline" size="sm">
					<span aria-hidden="true" class="i-lucide-refresh-cw" />
					Refresh
				</Button>
			</EmptyContent>
		</Empty>
	),
}

export const MediaVariants: Story = {
	render: () => (
		<div class="grid gap-4 md:grid-cols-2">
			<Empty class="w-72 border border-dashed">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<span aria-hidden="true" class="i-lucide-inbox" />
					</EmptyMedia>
					<EmptyTitle>No invitations</EmptyTitle>
					<EmptyDescription>Invite someone and their invitation waits here until they join.</EmptyDescription>
				</EmptyHeader>
			</Empty>
			<Empty class="w-72 border border-dashed">
				<EmptyHeader>
					<EmptyMedia>
						<div class="flex size-10 items-center justify-center rounded-full bg-secondary edge text-sm font-medium">
							GH
						</div>
					</EmptyMedia>
					<EmptyTitle>Grace has not joined yet</EmptyTitle>
					<EmptyDescription>Resend the invitation if it did not arrive.</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</div>
	),
	play: async ({ canvas }) => {
		const variants = Array.from(canvas.querySelectorAll('[data-slot="empty-media"]')).map(node => node.getAttribute('data-variant'))
		if (!variants.includes('icon') || !variants.includes('default')) {
			throw new Error('EmptyMedia should render default and icon variants')
		}
	},
}

export const DescriptionLink: Story = {
	render: () => (
		<Empty class="w-[32rem] border border-dashed">
			<EmptyHeader>
				<EmptyTitle>This page does not exist</EmptyTitle>
				<EmptyDescription>
					Check the address, or go back to the <a href="/dashboard">dashboard</a>.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	),
	play: async ({ canvas }) => {
		const link = canvas.querySelector<HTMLAnchorElement>('[data-slot="empty-description"] a')
		if (!link || link.getAttribute('href') !== '/dashboard') {
			throw new Error('EmptyDescription should allow inline links')
		}
		// An inline link is underlined and its focus ring stands off its first and last letters.
		const style = getComputedStyle(link)
		if (style.textDecorationLine !== 'underline' || Number.parseFloat(style.outlineOffset) < 2) {
			throw new Error(`EmptyDescription link is not underlined or its ring touches the text: ${style.textDecorationLine} ${style.outlineOffset}`)
		}
	},
}
