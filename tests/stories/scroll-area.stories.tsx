/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { ScrollArea } from '/src/ui/scroll-area'
import { Separator } from '/src/ui/separator'

const tags = Array.from({ length: 50 }, (_, index) => `v1.2.0-beta.${50 - index}`)

const works = [
	['Ornella Binni', 'linear-gradient(135deg,#6cc3d5,#234c6a 45%,#0f2334)'],
	['Tom Byrom', 'linear-gradient(135deg,#fcb53b,#a94b4c 48%,#1b3c53)'],
	['Vladimir Malyavko', 'linear-gradient(135deg,#9db36a,#276e7e 45%,#0f2334)'],
	['Ajo Studio', 'linear-gradient(135deg,#d2c1b6,#3596ac 48%,#1b3c53)'],
] as const

export default {
	title: 'UI/Scroll Area',
	component: ScrollArea,
	parameters: {
		docs: { description: 'Native scroll container with browser scrollbar styling.' },
		layout: 'centered',
	},
} satisfies Meta<typeof ScrollArea>

const area = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="scroll-area"]')

const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

export const Basic: Story<typeof ScrollArea> = {
	render: () => (
		<ScrollArea aria-label="Release tags" class="h-72 w-48 rounded-md edge bg-card text-card-foreground">
			<div class="p-4">
				<h4 class="mb-4 text-sm font-medium leading-none">Tags</h4>
				{tags.map(tag => (
					<div key={tag}>
						<div class="text-sm">{tag}</div>
						<Separator class="my-2" />
					</div>
				))}
			</div>
		</ScrollArea>
	),
	play: async ({ canvas }) => {
		const root = area(canvas)
		if (!root) throw new Error('ScrollArea root was not rendered')
		if (root.dataset.slot !== 'scroll-area') throw new Error('ScrollArea data-slot is missing')
		if (root.tabIndex !== 0) throw new Error('ScrollArea should be keyboard focusable by default')
		if (root.scrollHeight <= root.clientHeight) throw new Error('ScrollArea did not create vertical overflow')

		root.scrollTop = 80
		await waitFrame()

		if (root.scrollTop <= 0) throw new Error('ScrollArea did not scroll vertically')
		root.scrollTop = 0
	},
}

export const Horizontal: Story<typeof ScrollArea> = {
	render: () => (
		<ScrollArea aria-label="Artwork gallery" class="w-96 rounded-md edge bg-card whitespace-nowrap">
			<div class="flex w-max gap-4 p-4">
				{works.map(([artist, gradient]) => (
					<figure key={artist} class="w-[150px] shrink-0">
						<div class="aspect-[3/4] overflow-hidden rounded-md" style={`background:${gradient}`} />
						<figcaption class="pt-2 text-xs text-muted-foreground">
							Photo by <span class="font-semibold text-foreground">{artist}</span>
						</figcaption>
					</figure>
				))}
			</div>
		</ScrollArea>
	),
	play: async ({ canvas }) => {
		const root = area(canvas)
		if (!root) throw new Error('Horizontal ScrollArea root was not rendered')
		if (root.scrollWidth <= root.clientWidth) throw new Error('ScrollArea did not create horizontal overflow')

		root.scrollLeft = 120
		await waitFrame()

		if (root.scrollLeft <= 0) throw new Error('ScrollArea did not scroll horizontally')
		root.scrollLeft = 0
	},
}

export const BothAxes: Story<typeof ScrollArea> = {
	render: () => (
		<ScrollArea aria-label="Metrics grid" class="h-72 w-80 rounded-md edge bg-card">
			<div class="grid w-[42rem] grid-cols-4 gap-3 p-4">
				{Array.from({ length: 32 }, (_, index) => (
					<div key={index} class="rounded-md edge bg-background p-3 shadow-xs">
						<div class="text-sm font-medium">Metric {index + 1}</div>
						<div class="mt-6 h-2 rounded-full bg-muted">
							<div class="h-full rounded-full bg-primary" style={`width:${32 + (index % 8) * 8}%`} />
						</div>
					</div>
				))}
			</div>
		</ScrollArea>
	),
	play: async ({ canvas }) => {
		const root = area(canvas)
		if (!root) throw new Error('BothAxes ScrollArea root was not rendered')
		if (root.scrollWidth <= root.clientWidth) throw new Error('BothAxes story did not create horizontal overflow')
		if (root.scrollHeight <= root.clientHeight) throw new Error('BothAxes story did not create vertical overflow')

		root.scrollLeft = 80
		root.scrollTop = 80
		await waitFrame()

		if (root.scrollLeft <= 0 || root.scrollTop <= 0) {
			throw new Error('BothAxes ScrollArea did not scroll on both axes')
		}

		root.scrollLeft = 0
		root.scrollTop = 0
	},
}

export const PaddedContent: Story<typeof ScrollArea> = {
	render: () => (
		<ScrollArea aria-label="Long form copy" class="h-64 w-[420px] rounded-md edge bg-card p-4 text-sm leading-6">
			<div class="space-y-4">
				<p>
					Release notes include routing fixes, theme polish, and a tighter account settings flow.
					Review the checklist before publishing the next beta.
				</p>
				<p>
					The chat view now preserves position while older messages stream in, and unread markers
					stay anchored to the first unseen message.
				</p>
				<p>
					Admin tables received denser filters, clearer empty states, and consistent danger
					actions across sessions and token screens.
				</p>
				<p>
					Follow-up work remains for navigation primitives, overlay components, and the final
					application migration pass.
				</p>
			</div>
		</ScrollArea>
	),
}
