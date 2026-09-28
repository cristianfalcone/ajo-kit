/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { frame } from './play'
import { Button } from 'ajo-ui-playa/button'
import {
	Bubble,
	BubbleContent,
	BubbleGroup,
	BubbleReactions,
} from 'ajo-ui-playa/bubble'

export default {
	title: 'UI/Bubble',
	component: Bubble,
	args: {
		variant: 'default',
		align: 'start',
	},
	argTypes: {
		variant: { control: 'select', options: ['default', 'secondary', 'muted', 'tinted', 'outline', 'danger', 'ghost'] },
		align: { control: 'radio', options: ['start', 'end'] },
	},
	parameters: {
		docs: { description: 'Presentational conversational bubble with variants, alignment, grouping, reactions, and interactive content.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Bubble>

const InteractiveExample: Stateful = function* () {
	let selected = 'none'
	const choose = (next: string) => this.next(() => selected = next)

	while (true) yield (
		<div class="grid w-96 gap-4">
			<Bubble variant="secondary">
				<BubbleContent>The deploy of shop-web 1.4.2 failed. What do you want to do?</BubbleContent>
			</Bubble>
			<BubbleGroup>
				<Bubble align="end">
					<BubbleContent as="button" id="rollback" set:onclick={() => choose('rollback')}>
						Roll back to 1.4.1
					</BubbleContent>
				</Bubble>
				<Bubble align="end">
					<BubbleContent as="button" id="retry" set:onclick={() => choose('retry')}>
						Deploy 1.4.2 again
					</BubbleContent>
				</Bubble>
				<Bubble variant="outline" align="end">
					<BubbleContent as="a" href="#logs">
						Open the build log
					</BubbleContent>
				</Bubble>
			</BubbleGroup>
			<p class="text-sm text-muted-foreground">Selected: {selected}</p>
		</div>
	)
}

export const Variants: Story = {
	render: () => (
		<div class="grid w-[32rem] gap-5">
			<Bubble variant="default">
				<BubbleContent>Deploy shop-web 1.4.2 to host-01.</BubbleContent>
			</Bubble>
			<Bubble variant="secondary">
				<BubbleContent>Deployed. It passed the health check.</BubbleContent>
			</Bubble>
			<Bubble variant="muted">
				<BubbleContent>The logs have been quiet since the restart.</BubbleContent>
			</Bubble>
			<Bubble variant="tinted">
				<BubbleContent>Pinned: rotate the API token on Friday.</BubbleContent>
			</Bubble>
			<Bubble variant="outline">
				<BubbleContent>The certificate for shop.example.com renews in 12 days.</BubbleContent>
			</Bubble>
			<Bubble variant="danger">
				<BubbleContent>The deploy failed. Check the build log and deploy again.</BubbleContent>
				<BubbleReactions role="img" aria-label="Reaction: warning">!</BubbleReactions>
			</Bubble>
			<Bubble variant="ghost">
				<BubbleContent>
					The last deploy took 42 seconds and passed its health check on the first try.
				</BubbleContent>
			</Bubble>
		</div>
	),
	play: async ({ canvas }) => {
		const variants = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="bubble"]')).map(item => item.dataset.variant)
		if (variants.join('|') !== 'default|secondary|muted|tinted|outline|danger|ghost') {
			throw new Error('Bubble variants were not rendered in order')
		}
	},
}

export const Alignment: Story = {
	render: () => (
		<div class="grid w-96 gap-3">
			<Bubble align="start" variant="secondary">
				<BubbleContent>Is the nightly backup done?</BubbleContent>
			</Bubble>
			<Bubble align="end">
				<BubbleContent>Yes, it finished at 03:12.</BubbleContent>
			</Bubble>
		</div>
	),
	play: async ({ canvas }) => {
		const bubbles = canvas.querySelectorAll<HTMLElement>('[data-slot="bubble"]')
		const [start, end] = bubbles
		if (start?.dataset.align !== 'start' || end?.dataset.align !== 'end') {
			throw new Error('Bubble alignment data attributes are wrong')
		}
		// A grid ignores align-self across the inline axis, so the end bubble
		// must meet the container's inline end in both reading directions.
		const container = end.parentElement!
		const dir = container.getAttribute('dir')
		try {
			for (const next of ['ltr', 'rtl'] as const) {
				container.setAttribute('dir', next)
				const box = container.getBoundingClientRect()
				const a = start.getBoundingClientRect()
				const b = end.getBoundingClientRect()
				const startGap = next === 'rtl' ? box.right - a.right : a.left - box.left
				const endGap = next === 'rtl' ? b.left - box.left : box.right - b.right
				if (Math.abs(startGap) > 1) throw new Error(`Start bubble is ${startGap}px off the inline start in ${next}`)
				if (Math.abs(endGap) > 1) throw new Error(`End bubble is ${endGap}px off the inline end in ${next}`)
			}
		} finally {
			if (dir === null) container.removeAttribute('dir')
			else container.setAttribute('dir', dir)
		}
	},
}

export const Group: Story = {
	render: () => (
		<div class="grid w-96 gap-5">
			<BubbleGroup>
				<Bubble variant="secondary">
					<BubbleContent>What changed in shop-web 1.4.2?</BubbleContent>
				</Bubble>
				<Bubble variant="secondary">
					<BubbleContent>The checkout retries a failed payment once.</BubbleContent>
				</Bubble>
			</BubbleGroup>
			<BubbleGroup>
				<Bubble align="end">
					<BubbleContent>Good. Is it live on host-01?</BubbleContent>
				</Bubble>
				<Bubble align="end">
					<BubbleContent>Yes, since 14:20.</BubbleContent>
				</Bubble>
			</BubbleGroup>
		</div>
	),
	play: async ({ canvas }) => {
		const groups = canvas.querySelectorAll('[data-slot="bubble-group"]')
		const bubbles = canvas.querySelectorAll('[data-slot="bubble"]')
		if (groups.length !== 2 || bubbles.length !== 4) {
			throw new Error('Bubble groups did not render expected children')
		}
	},
}

export const Interactive: Story = {
	render: () => <InteractiveExample />,
	play: async ({ canvas }) => {
		const rollback = canvas.querySelector<HTMLButtonElement>('#rollback')
		const link = canvas.querySelector<HTMLAnchorElement>('[data-slot="bubble-content"][href="#logs"]')
		if (!rollback || !link) throw new Error('Interactive bubble content was not rendered')
		if (rollback.type !== 'button') throw new Error('Interactive button bubble should default to type button')

		rollback.click()
		await frame()
		if (!canvas.textContent?.includes('Selected: rollback')) {
			throw new Error('Interactive button bubble did not fire click handler')
		}
	},
}

export const Reactions: Story = {
	render: () => (
		<div class="grid w-96 gap-12">
			<Bubble variant="secondary">
				<BubbleContent>shop-web 1.4.2 is live on host-01.</BubbleContent>
				<BubbleReactions role="img" aria-label="Reactions: thumbs up, fire, and two more">
					<span>👍</span>
					<span>🔥</span>
					<span>+2</span>
				</BubbleReactions>
			</Bubble>
			<Bubble variant="outline" align="end">
				<BubbleContent>Roll back shop-web to 1.4.1?</BubbleContent>
				<BubbleReactions side="top" align="start">
					<Button size="xs" variant="secondary">Roll back</Button>
				</BubbleReactions>
			</Bubble>
		</div>
	),
	play: async ({ canvas }) => {
		const labeled = canvas.querySelector<HTMLElement>('[data-slot="bubble-reactions"][role="img"]')
		const topStart = canvas.querySelector<HTMLElement>('[data-slot="bubble-reactions"][data-side="top"][data-align="start"]')
		if (!labeled || labeled.getAttribute('aria-label') !== 'Reactions: thumbs up, fire, and two more' || !topStart) {
			throw new Error('Bubble reactions did not expose expected accessibility and positioning attributes')
		}
		// Each pill overhangs its bubble, so the gap between the bubbles must
		// hold both overhangs or the action reads as part of the reactions.
		const a = labeled.getBoundingClientRect()
		const b = topStart.getBoundingClientRect()
		if (a.bottom > b.top) throw new Error(`Bubble reaction pills overlap by ${a.bottom - b.top}px`)
	},
}

export const LongContent: Story = {
	args: {
		variant: 'ghost',
		content: 'The deploy of shop-web 1.4.2 failed while installing dependencies: its lockfile names a version of the payments package that the registry no longer serves. Version 1.4.1 kept serving traffic the whole time. Pin the package to the version 1.4.1 uses and deploy again, or roll back from the versions page.',
	},
	render: args => (
		<div class="w-[36rem]">
			<Bubble variant={args.variant} align={args.align}>
				<BubbleContent>
					{args.content}
				</BubbleContent>
			</Bubble>
		</div>
	),
	play: async ({ canvas }) => {
		const bubble = canvas.querySelector<HTMLElement>('[data-slot="bubble"][data-variant="ghost"]')
		if (!bubble || bubble.dataset.variant !== 'ghost') {
			throw new Error('Long ghost bubble did not render')
		}
	},
}
