/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Button from 'ajo-ui-playa/button'
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
		title: 'No Projects Yet',
		description: 'You have not created any projects yet. Get started by creating your first project.',
	},
	render: args => (
		<Empty class="w-[32rem]">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<span class="i-lucide-folder-code" />
				</EmptyMedia>
				<EmptyTitle>{args.title}</EmptyTitle>
				<EmptyDescription>
					{args.description}
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<div class="flex flex-wrap justify-center gap-2">
					<Button>Create Project</Button>
					<Button variant="outline">Import Project</Button>
				</div>
			</EmptyContent>
			<a class="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline" href="#learn-empty">
				Learn More
				<span class="i-lucide-arrow-up-right size-4" aria-hidden="true" />
			</a>
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
	},
}

export const Outline: Story = {
	render: () => (
		<Empty class="w-[32rem] border border-dashed">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<span class="i-lucide-cloud" />
				</EmptyMedia>
				<EmptyTitle>Cloud Storage Empty</EmptyTitle>
				<EmptyDescription>
					Upload files to your cloud storage to access them anywhere.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button variant="outline" size="sm">Upload Files</Button>
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
					<span class="i-lucide-bell" />
				</EmptyMedia>
				<EmptyTitle>No Notifications</EmptyTitle>
				<EmptyDescription class="max-w-xs">
					You are all caught up. New notifications will appear here.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button variant="outline" size="sm">
					<span class="i-lucide-refresh-cw" />
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
						<span class="i-lucide-inbox" />
					</EmptyMedia>
					<EmptyTitle>No messages</EmptyTitle>
					<EmptyDescription>New messages will appear here.</EmptyDescription>
				</EmptyHeader>
			</Empty>
			<Empty class="w-72 border border-dashed">
				<EmptyHeader>
					<EmptyMedia>
						<div class="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
							CN
						</div>
					</EmptyMedia>
					<EmptyTitle>User Offline</EmptyTitle>
					<EmptyDescription>You can leave a message to notify them.</EmptyDescription>
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
				<EmptyTitle>404 - Not Found</EmptyTitle>
				<EmptyDescription>
					The page you are looking for does not exist. <a href="/dashboard">Go back home</a>.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	),
	play: async ({ canvas }) => {
		const link = canvas.querySelector<HTMLAnchorElement>('[data-slot="empty-description"] a')
		if (!link || link.getAttribute('href') !== '/dashboard') {
			throw new Error('EmptyDescription should allow inline links')
		}
	},
}
