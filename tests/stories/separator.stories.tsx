/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { Separator } from 'ajo-ui-playa/separator'

export default {
	title: 'UI/Separator',
	component: Separator,
	args: {
		decorative: true,
		orientation: 'horizontal',
	},
	argTypes: {
		decorative: { control: 'boolean' },
		orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
	},
	parameters: {
		docs: { description: 'Visual or semantic divider with Ajo Kit orientation and decorative behavior.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Separator>

const fixed = { decorative: { control: false }, orientation: { control: false } } as const

export const Basic: Story<typeof Separator> = {
	render: args => (
		<div class="w-72">
			<div class="space-y-1">
				<h4 class="text-sm font-medium leading-none">Ajo Kit</h4>
				<p class="text-sm text-muted-foreground">A UI system for Ajo applications.</p>
			</div>
			<Separator {...args} class="my-4" />
			<div class="flex h-5 items-center gap-4 text-sm">
				<span>Blog</span>
				<span>Docs</span>
				<span>Source</span>
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const separator = canvas.querySelector<HTMLElement>('[data-slot="separator"]')
		if (!separator) throw new Error('Separator was not rendered')
		if (separator.dataset.orientation !== 'horizontal') throw new Error('Separator did not set horizontal orientation')
		if (separator.getAttribute('aria-hidden') !== 'true' || separator.getAttribute('role') !== 'none') {
			throw new Error('Decorative Separator was not hidden from assistive technology')
		}
	},
}

export const Vertical: Story<typeof Separator> = {
	argTypes: fixed,
	render: () => (
		<div class="flex h-5 items-center gap-4 text-sm">
			<span>Blog</span>
			<Separator orientation="vertical" />
			<span>Docs</span>
			<Separator orientation="vertical" />
			<span>Source</span>
		</div>
	),
	play: async ({ canvas }) => {
		const separator = canvas.querySelector<HTMLElement>('[data-slot="separator"]')
		if (!separator) throw new Error('Vertical Separator was not rendered')
		if (separator.dataset.orientation !== 'vertical') throw new Error('Separator did not set vertical orientation')
	},
}

export const Menu: Story<typeof Separator> = {
	argTypes: fixed,
	render: () => (
		<div class="w-72 rounded-md edge bg-card p-3 text-card-foreground shadow-xs">
			<div class="grid gap-1">
				<div>
					<p class="text-sm font-medium">Settings</p>
					<p class="text-xs text-muted-foreground">Manage preferences</p>
				</div>
				<Separator />
				<div>
					<p class="text-sm font-medium">Account</p>
					<p class="text-xs text-muted-foreground">Profile and security</p>
				</div>
				<Separator />
				<div>
					<p class="text-sm font-medium">Help</p>
					<p class="text-xs text-muted-foreground">Support and docs</p>
				</div>
			</div>
		</div>
	),
}

export const List: Story<typeof Separator> = {
	argTypes: fixed,
	render: () => (
		<div class="w-80 rounded-md edge bg-card text-card-foreground">
			{[
				['Item 1', 'Value 1'],
				['Item 2', 'Value 2'],
				['Item 3', 'Value 3'],
			].map(([label, value], index) => (
				<div key={label}>
					<div class="flex items-center justify-between px-3 py-2 text-sm">
						<span>{label}</span>
						<span class="text-muted-foreground">{value}</span>
					</div>
					{index < 2 ? <Separator /> : null}
				</div>
			))}
		</div>
	),
}

export const Semantic: Story<typeof Separator> = {
	argTypes: fixed,
	render: () => (
		<div class="w-72 space-y-4">
			<section>
				<h4 class="text-sm font-medium">Profile</h4>
				<p class="text-sm text-muted-foreground">Public account details.</p>
			</section>
			<Separator decorative={false} />
			<section>
				<h4 class="text-sm font-medium">Security</h4>
				<p class="text-sm text-muted-foreground">Password and sessions.</p>
			</section>
		</div>
	),
	play: async ({ canvas }) => {
		const separator = canvas.querySelector<HTMLElement>('[data-slot="separator"]')
		if (!separator) throw new Error('Semantic Separator was not rendered')
		if (separator.getAttribute('role') !== 'separator' || separator.getAttribute('aria-orientation') !== 'horizontal') {
			throw new Error('Non-decorative Separator did not expose separator semantics')
		}
	},
}
