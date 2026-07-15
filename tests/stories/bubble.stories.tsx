/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import Button from 'ajo-ui-playa/button'
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

const fixed = { variant: { control: false }, align: { control: false } } as const

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const InteractiveExample: Stateful = function* () {
	let selected = 'none'
	const choose = (next: string) => this.next(() => selected = next)

	while (true) yield (
		<div class="grid w-96 gap-4">
			<Bubble variant="secondary">
				<BubbleContent>How can I help you today?</BubbleContent>
			</Bubble>
			<BubbleGroup>
				<Bubble variant="muted" align="end">
					<BubbleContent as="button" id="password-help" set:onclick={() => choose('password')}>
						I forgot my password
					</BubbleContent>
				</Bubble>
				<Bubble variant="muted" align="end">
					<BubbleContent as="button" id="billing-help" set:onclick={() => choose('billing')}>
						I need help with billing
					</BubbleContent>
				</Bubble>
				<Bubble variant="outline" align="end">
					<BubbleContent as="a" href="#support">
						Talk to a human
					</BubbleContent>
				</Bubble>
			</BubbleGroup>
			<p class="text-sm text-muted-foreground">Selected: {selected}</p>
		</div>
	)
}

export const Variants: Story = {
	argTypes: fixed,
	render: () => (
		<div class="grid w-[32rem] gap-5">
			<Bubble variant="default">
				<BubbleContent>This is the default primary bubble.</BubbleContent>
			</Bubble>
			<Bubble variant="secondary">
				<BubbleContent>This is the secondary variant.</BubbleContent>
			</Bubble>
			<Bubble variant="muted">
				<BubbleContent>This muted bubble lowers visual emphasis.</BubbleContent>
			</Bubble>
			<Bubble variant="tinted">
				<BubbleContent>This tinted bubble uses a soft primary treatment.</BubbleContent>
			</Bubble>
			<Bubble variant="outline">
				<BubbleContent>This outlined bubble works for rich content.</BubbleContent>
			</Bubble>
			<Bubble variant="danger">
				<BubbleContent>Failed to run the command.</BubbleContent>
				<BubbleReactions role="img" aria-label="Reaction: warning">!</BubbleReactions>
			</Bubble>
			<Bubble variant="ghost">
				<BubbleContent>
					Ghost bubbles work for assistant text, markdown, and other content that should not be framed.
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
	argTypes: fixed,
	render: () => (
		<div class="grid w-96 gap-3">
			<Bubble align="start" variant="secondary">
				<BubbleContent>This bubble is aligned to the start.</BubbleContent>
			</Bubble>
			<Bubble align="end">
				<BubbleContent>This bubble is aligned to the end.</BubbleContent>
			</Bubble>
		</div>
	),
	play: async ({ canvas }) => {
		const bubbles = canvas.querySelectorAll<HTMLElement>('[data-slot="bubble"]')
		if (bubbles[0]?.dataset.align !== 'start' || bubbles[1]?.dataset.align !== 'end') {
			throw new Error('Bubble alignment data attributes are wrong')
		}
	},
}

export const Group: Story = {
	argTypes: fixed,
	render: () => (
		<div class="grid w-96 gap-5">
			<BubbleGroup>
				<Bubble variant="secondary">
					<BubbleContent>Can you tell me what changed?</BubbleContent>
				</Bubble>
				<Bubble variant="secondary">
					<BubbleContent>The route cache now revalidates by topic version.</BubbleContent>
				</Bubble>
			</BubbleGroup>
			<BubbleGroup>
				<Bubble align="end">
					<BubbleContent>Good. Did you update the tests?</BubbleContent>
				</Bubble>
				<Bubble align="end">
					<BubbleContent>Yes, the smoke path is covered.</BubbleContent>
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
	argTypes: fixed,
	render: () => <InteractiveExample />,
	play: async ({ canvas }) => {
		const password = canvas.querySelector<HTMLButtonElement>('#password-help')
		const link = canvas.querySelector<HTMLAnchorElement>('[data-slot="bubble-content"][href="#support"]')
		if (!password || !link) throw new Error('Interactive bubble content was not rendered')
		if (password.type !== 'button') throw new Error('Interactive button bubble should default to type button')

		password.click()
		await nextFrame()
		if (!canvas.textContent?.includes('Selected: password')) {
			throw new Error('Interactive button bubble did not fire click handler')
		}
	},
}

export const Reactions: Story = {
	argTypes: fixed,
	render: () => (
		<div class="grid w-96 gap-8">
			<Bubble variant="secondary">
				<BubbleContent>I do not need tests, I know this works.</BubbleContent>
				<BubbleReactions role="img" aria-label="Reactions: thumbs up, fire, and two more">
					<span>👍</span>
					<span>🔥</span>
					<span>+2</span>
				</BubbleReactions>
			</Bubble>
			<Bubble variant="outline" align="end">
				<BubbleContent>Are you sure I can run this command?</BubbleContent>
				<BubbleReactions side="top" align="start">
					<Button size="xs" variant="secondary">Yes, run it</Button>
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
	},
}

export const LongContent: Story = {
	args: {
		variant: 'ghost',
		content: 'The accessibility review found two focus states that were visually too subtle in dark mode. I checked the dialog, menu, drawer, and popover paths because each renders focusable controls in a different top-layer or anchored context. The fix keeps the content unframed and lets the text span the full row.',
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
