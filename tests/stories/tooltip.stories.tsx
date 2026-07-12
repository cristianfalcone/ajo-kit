/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import Button, { buttonVariants } from '/src/ui/button'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '/src/ui/tooltip'

export default {
	title: 'UI/Tooltip',
	component: Tooltip,
	args: {
		content: 'Add to library',
		side: 'top',
	},
	argTypes: {
		content: { control: 'text' },
		side: { control: 'radio', options: ['top', 'right', 'bottom', 'left'] },
	},
	parameters: {
		docs: { description: 'Native Popover API tooltip with Ajo hover/focus state, aria-describedby wiring, Escape dismissal, and anchor-aware placement.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Tooltip>

const fixed = { content: { control: false }, side: { control: false } } as const

const triggerClass = buttonVariants({ variant: 'outline' })
const iconClass = buttonVariants({ variant: 'outline', size: 'icon-sm' })
const hover = (element: HTMLElement) => element.dispatchEvent(new MouseEvent('mouseenter', { cancelable: true }))
const leave = (element: HTMLElement) => element.dispatchEvent(new MouseEvent('mouseleave', { cancelable: true }))
const wait = (ms = 30) => new Promise(resolve => setTimeout(resolve, ms))
const sides = ['left', 'top', 'bottom', 'right'] as const

const closeTo = (actual: number, expected: number, tolerance = 4) =>
	Math.abs(actual - expected) <= tolerance

const centerX = (rect: DOMRect) => rect.left + rect.width / 2
const centerY = (rect: DOMRect) => rect.top + rect.height / 2

const expectSide = (side: typeof sides[number], trigger: HTMLElement, content: HTMLElement) => {
	const triggerRect = trigger.getBoundingClientRect()
	const contentRect = content.getBoundingClientRect()
	const gap = Number(content.dataset.sideOffset ?? 0)
	const style = getComputedStyle(content)

	if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
		throw new Error('Tooltip content rendered with scrollable overflow')
	}

	if (side === 'left') {
		if (!closeTo(contentRect.right, triggerRect.left - gap) || !closeTo(centerY(contentRect), centerY(triggerRect))) {
			throw new Error('Left tooltip was not positioned beside its trigger')
		}
	} else if (side === 'right') {
		if (!closeTo(contentRect.left, triggerRect.right + gap) || !closeTo(centerY(contentRect), centerY(triggerRect))) {
			throw new Error('Right tooltip was not positioned beside its trigger')
		}
	} else if (side === 'top') {
		if (!closeTo(contentRect.bottom, triggerRect.top - gap) || !closeTo(centerX(contentRect), centerX(triggerRect))) {
			throw new Error('Top tooltip was not positioned above its trigger')
		}
	} else if (!closeTo(contentRect.top, triggerRect.bottom + gap) || !closeTo(centerX(contentRect), centerX(triggerRect))) {
		throw new Error('Bottom tooltip was not positioned below its trigger')
	}
}

const ControlledExample: Stateful = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	while (true) yield (
		<div class="grid justify-items-center gap-3">
			<Tooltip open={open} onOpenChange={setOpen}>
				<TooltipTrigger class={triggerClass} id="controlled-tooltip-trigger">
					Controlled
				</TooltipTrigger>
				<TooltipContent>
					Open state is controlled by Ajo.
				</TooltipContent>
			</Tooltip>
			<p class="text-sm text-muted-foreground">Open: {open ? 'yes' : 'no'}</p>
		</div>
	)
}

export const Basic: Story<typeof Tooltip> = {
	render: args => (
		<Tooltip>
			<TooltipTrigger class={triggerClass} id="basic-tooltip-trigger">
				Hover
			</TooltipTrigger>
			<TooltipContent id="basic-tooltip-content" side={args.side}>
				<p>{args.content}</p>
			</TooltipContent>
		</Tooltip>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#basic-tooltip-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
		if (!trigger || !content) throw new Error('Basic tooltip trigger or content was not rendered')

		hover(trigger)
		await wait()

		if (!content.matches(':popover-open') || content.getAttribute('role') !== 'tooltip') {
			throw new Error('Tooltip did not open on hover with tooltip role')
		}

		if (content.id !== 'basic-tooltip-content' || trigger.getAttribute('aria-describedby') !== content.id) {
			throw new Error('Tooltip trigger is not described by tooltip content')
		}

		leave(trigger)
		await wait(120)

		if (content.matches(':popover-open')) {
			throw new Error('Tooltip did not close after hover left')
		}
	},
}

export const Keyboard: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<Tooltip>
			<TooltipTrigger class={iconClass} id="keyboard-tooltip-trigger" aria-label="Save changes">
				<span class="i-lucide-save size-4" />
			</TooltipTrigger>
			<TooltipContent>
				Save Changes <kbd class="ml-1 rounded-xs bg-primary-foreground/15 px-1 font-mono">S</kbd>
			</TooltipContent>
		</Tooltip>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#keyboard-tooltip-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
		if (!trigger || !content) throw new Error('Keyboard tooltip trigger or content was not rendered')

		trigger.focus()
		await wait()

		if (!content.matches(':popover-open')) {
			throw new Error('Tooltip did not open on keyboard focus')
		}

		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
		await wait()

		if (content.matches(':popover-open')) {
			throw new Error('Tooltip did not close on Escape')
		}
	},
}

export const Sides: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<div class="flex flex-wrap justify-center gap-2">
			{sides.map(side => (
				<Tooltip key={side}>
					<TooltipTrigger class={buttonVariants({ variant: 'outline', size: 'sm', class: 'w-fit capitalize' })} id={`tooltip-${side}-trigger`}>
						{side}
					</TooltipTrigger>
					<TooltipContent side={side}>
						<p>Add to library</p>
					</TooltipContent>
				</Tooltip>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		for (const side of sides) {
			const trigger = canvas.querySelector<HTMLElement>(`#tooltip-${side}-trigger`)
			const content = canvas.querySelector<HTMLElement>(`[data-slot="tooltip-content"][data-side-preference="${side}"]`)
			if (!trigger || !content) throw new Error(`${side} tooltip trigger or content was not rendered`)

			hover(trigger)
			await wait(180)

			if (!content.matches(':popover-open') || content.dataset.sidePreference !== side || content.dataset.side !== side) {
				throw new Error(`${side} tooltip side was not applied`)
			}

			expectSide(side, trigger, content)

			leave(trigger)
			await wait(120)

			if (content.matches(':popover-open')) {
				throw new Error(`${side} tooltip did not close after hover left`)
			}
		}
	},
}

export const ProviderDelay: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<TooltipProvider delayDuration={700} skipDelayDuration={0}>
			<Tooltip>
				<TooltipTrigger class={triggerClass} id="delayed-tooltip-trigger">
					Delayed
				</TooltipTrigger>
				<TooltipContent>
					Provider controls the delay.
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#delayed-tooltip-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
		if (!trigger || !content) throw new Error('Delayed tooltip trigger or content was not rendered')

		hover(trigger)
		await wait(250)

		if (content.matches(':popover-open')) {
			throw new Error('Tooltip opened before provider delay elapsed')
		}

		await wait(550)

		if (!content.matches(':popover-open')) {
			throw new Error('Tooltip did not open after provider delay elapsed')
		}

		leave(trigger)
		await wait(120)

		if (content.matches(':popover-open')) {
			throw new Error('Delayed tooltip did not close after hover left')
		}
	},
}

export const DisabledControl: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<Tooltip>
			<TooltipTrigger as="span" class="inline-block w-fit" id="disabled-tooltip-trigger">
				<Button variant="outline" disabled>
					Disabled
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>This feature is currently unavailable</p>
			</TooltipContent>
		</Tooltip>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#disabled-tooltip-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
		if (!trigger || !content) throw new Error('Disabled tooltip wrapper or content was not rendered')

		hover(trigger)
		await wait()

		if (!content.matches(':popover-open') || !canvas.textContent?.includes('currently unavailable')) {
			throw new Error('Tooltip did not open for disabled control wrapper')
		}

		leave(trigger)
		await wait(120)

		if (content.matches(':popover-open')) {
			throw new Error('Disabled control tooltip did not close after hover left')
		}
	},
}

export const Arrow: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<Tooltip>
			<TooltipTrigger class={triggerClass} id="arrow-tooltip-trigger">
				Hover
			</TooltipTrigger>
			<TooltipContent side="top">
				<p>The caret tracks the trigger center</p>
			</TooltipContent>
		</Tooltip>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#arrow-tooltip-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
		const arrow = canvas.querySelector<HTMLElement>('[data-slot="tooltip-arrow"]')
		if (!trigger || !content || !arrow) throw new Error('Arrow tooltip trigger, content, or arrow was not rendered')

		hover(trigger)
		await wait()

		if (!content.matches(':popover-open') || content.dataset.side !== 'top') {
			throw new Error('Arrow tooltip did not open on the top side')
		}

		const arrowRect = arrow.getBoundingClientRect()
		const contentRect = content.getBoundingClientRect()

		if (!closeTo(centerX(arrowRect), centerX(trigger.getBoundingClientRect()), 3)) {
			throw new Error('Tooltip arrow is not horizontally centered on the trigger')
		}

		if (!(arrowRect.top < contentRect.bottom && arrowRect.bottom > contentRect.bottom)) {
			throw new Error('Tooltip arrow does not straddle the content bottom edge')
		}

		if (arrow.hasAttribute('data-uncentered')) {
			throw new Error('Centered tooltip arrow was flagged data-uncentered')
		}

		// Paint-level probe: overflow clipping would remove the protruding half
		// from paint and hit testing while leaving every rect unchanged.
		const previous = arrow.style.pointerEvents
		arrow.style.pointerEvents = 'auto'
		const hit = document.elementFromPoint(centerX(arrowRect), (contentRect.bottom + arrowRect.bottom) / 2)
		arrow.style.pointerEvents = previous

		if (!hit || !arrow.contains(hit)) {
			throw new Error(`Tooltip arrow's protruding half is not painted: hit ${hit ? hit.tagName.toLowerCase() : 'nothing'} instead`)
		}
	},
}

export const Controlled: Story = {
	argTypes: fixed,
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#controlled-tooltip-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
		if (!trigger || !content) throw new Error('Controlled tooltip trigger or content was not rendered')

		hover(trigger)
		await wait()

		if (!content.matches(':popover-open') || !canvas.textContent?.includes('Open: yes')) {
			throw new Error('Controlled tooltip did not update controlled state')
		}

		leave(trigger)
		await wait(120)

		if (content.matches(':popover-open') || !canvas.textContent?.includes('Open: no')) {
			throw new Error('Controlled tooltip did not close through controlled state')
		}
	},
}
