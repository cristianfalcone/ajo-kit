/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { Card, CardContent, CardHeader } from '/src/ui/card'
import { Skeleton } from '/src/ui/skeleton'

export default {
	title: 'UI/Skeleton',
	component: Skeleton,
	args: {
		class: 'h-5 w-48',
		decorative: true,
	},
	argTypes: {
		class: { control: 'text', label: 'Class' },
		decorative: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Decorative loading placeholder matching the Ajo Kit Skeleton API.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Skeleton>

const fixed = { class: { control: false }, decorative: { control: false } } as const

export const Basic: Story<typeof Skeleton> = {
	render: args => <Skeleton {...args} />,
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="skeleton"]')
		if (!root) throw new Error('Skeleton was not rendered')

		if (root.getAttribute('aria-hidden') !== 'true' || root.getAttribute('role') !== 'presentation') {
			throw new Error('Decorative skeleton should be hidden from assistive technology')
		}

		if (!root.className.includes('motion-reduce:animate-none')) {
			throw new Error('Skeleton should include reduced-motion animation guard')
		}
	},
}

export const Avatar: Story = {
	argTypes: fixed,
	render: () => (
		<div class="flex items-center gap-4">
			<Skeleton class="size-12 rounded-full" />
			<div class="space-y-2">
				<Skeleton class="h-4 w-64" />
				<Skeleton class="h-4 w-48" />
			</div>
		</div>
	),
}

export const CardPreview: Story = {
	argTypes: fixed,
	render: () => (
		<Card class="w-80">
			<CardHeader class="gap-2">
				<Skeleton class="h-4 w-2/3" />
				<Skeleton class="h-4 w-1/2" />
			</CardHeader>
			<CardContent>
				<Skeleton class="aspect-video w-full" />
			</CardContent>
		</Card>
	),
	play: async ({ canvas }) => {
		const roots = canvas.querySelectorAll('[data-slot="skeleton"]')
		if (roots.length !== 3) throw new Error('Card skeleton should render three placeholders')
	},
}

export const Text: Story = {
	argTypes: fixed,
	render: () => (
		<div class="w-96 space-y-2">
			<Skeleton class="h-4 w-full" />
			<Skeleton class="h-4 w-full" />
			<Skeleton class="h-4 w-3/4" />
		</div>
	),
}

export const TableRows: Story = {
	argTypes: fixed,
	render: () => (
		<div class="flex w-full max-w-md flex-col gap-2" aria-busy="true" aria-label="Loading invoices">
			{Array.from({ length: 5 }, (_, index) => (
				<div class="flex gap-4" key={index}>
					<Skeleton class="h-4 flex-1" />
					<Skeleton class="h-4 w-24" />
					<Skeleton class="h-4 w-20" />
				</div>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const region = canvas.querySelector<HTMLElement>('[aria-label="Loading invoices"]')
		const roots = canvas.querySelectorAll('[data-slot="skeleton"]')
		if (!region || roots.length !== 15) throw new Error('Table skeleton rows were not rendered')

		if (region.getAttribute('aria-busy') !== 'true') {
			throw new Error('Loading region should expose aria-busy on the container')
		}
	},
}

export const SemanticPlaceholder: Story = {
	argTypes: fixed,
	render: () => (
		<Skeleton
			aria-label="Loading profile"
			class="h-5 w-48"
			decorative={false}
			role="status"
		/>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="skeleton"]')
		if (!root) throw new Error('Semantic skeleton was not rendered')

		if (root.hasAttribute('aria-hidden') || root.getAttribute('role') !== 'status') {
			throw new Error('Semantic skeleton should remain exposed when decorative is false')
		}
	},
}
