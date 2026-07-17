/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import { position, type PositionReference } from '../../packages/ajo-ui/src/position'
import type { Meta, Story } from './app'
import Button, { buttonVariants } from 'ajo-ui-playa/button'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from 'ajo-ui-playa/tooltip'

export default {
	title: 'UI/Tooltip',
	component: Tooltip,
	args: {
		content: 'Add to library',
		gap: 12,
		placement: 'top',
	},
	argTypes: {
		content: { control: 'text' },
		gap: { control: 'number' },
		placement: { control: 'radio', options: ['top', 'right', 'bottom', 'left'] },
	},
	parameters: {
		docs: { description: 'Native Popover API tooltip with Ajo hover/focus state, aria-describedby wiring, Escape dismissal, and anchor-aware placement.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Tooltip>

const fixed = { content: { control: false }, gap: { control: false }, placement: { control: false } } as const

const triggerClass = buttonVariants({ variant: 'outline' })
const iconClass = buttonVariants({ variant: 'outline', size: 'icon-sm' })
const hover = (element: HTMLElement) => element.dispatchEvent(new MouseEvent('mouseenter', { cancelable: true }))
const leave = (element: HTMLElement) => element.dispatchEvent(new MouseEvent('mouseleave', { cancelable: true }))
const wait = (ms = 30) => new Promise(resolve => setTimeout(resolve, ms))
const until = async (condition: () => boolean, message: string, timeout = 1200) => {
	const deadline = performance.now() + timeout
	while (!condition()) {
		if (performance.now() >= deadline) throw new Error(message)
		await wait(20)
	}
}
const sides = ['left', 'top', 'bottom', 'right'] as const

const closeTo = (actual: number, expected: number, tolerance = 4) =>
	Math.abs(actual - expected) <= tolerance

const centerX = (rect: DOMRect) => rect.left + rect.width / 2
const centerY = (rect: DOMRect) => rect.top + rect.height / 2
const describedContent = (canvas: HTMLElement, trigger: HTMLElement) => {
	const id = trigger.getAttribute('aria-describedby')
	return id ? canvas.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null
}

const RangeReferenceExample: Stateful = function* () {
	let floating: HTMLElement | null = null
	let reference: PositionReference | null = null
	let referenceElement: HTMLElement | null = null
	let visible = true
	let scheduled = false
	const geometry = position(this, {
		profile: 'tooltip',
		elements: () => ({ arrow: null, floating, reference }),
		gap: () => 8,
		placement: () => 'top',
	})

	const report = (error: unknown) => {
		if (this.signal.aborted) return
		queueMicrotask(() => {
			if (!this.signal.aborted) this.throw(error)
		})
	}
	const schedule = () => {
		if (scheduled || !floating || !reference || this.signal.aborted) return
		scheduled = true
		queueMicrotask(() => {
			scheduled = false
			if (!floating || !reference || this.signal.aborted) return
			void geometry.start().catch(report)
		})
	}
	const setReference = (element: HTMLElement | null) => {
		if (element === referenceElement) return
		geometry.stop()
		referenceElement = element
		if (element) {
			let range: Range | null = null
			const selection = () => {
				if (!range) {
					range = document.createRange()
					range.selectNodeContents(element)
				}
				return range
			}
			reference = {
				contextElement: element,
				getBoundingClientRect: () => selection().getBoundingClientRect(),
				getClientRects: () => selection().getClientRects(),
			}
		} else {
			reference = null
		}
		schedule()
	}
	const setFloating = (element: HTMLElement | null) => {
		if (element === floating) return
		geometry.stop()
		floating = element
		schedule()
	}

	while (true) yield (
		<div class="grid justify-items-center gap-6">
		<button
			class={buttonVariants({ variant: 'outline', size: 'sm' })}
			id="range-reference-toggle"
			set:onclick={() => this.next(() => visible = !visible)}
			type="button"
		>
			{visible ? 'Remove range fixture' : 'Restore range fixture'}
		</button>
		{visible ? (
			<div data-test="range-reference-fixture" class="grid justify-items-center gap-3">
				<p class="text-sm text-muted-foreground" style="width:360px;line-height:24px">
					<span
						id="range-reference-text"
						ref={setReference}
						style="display:inline;white-space:nowrap;line-height:24px"
					>
						Short range<br />a deliberately much wider second selected line
					</span>
				</p>
				<div
					data-test="range-reference-tooltip"
					class="z-50 w-fit max-w-xs rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-xs outline-none"
					ref={setFloating}
					role="tooltip"
					style="width:160px"
				>
					Range-backed virtual reference
				</div>
			</div>
		) : <p data-test="range-reference-removed" class="text-sm text-muted-foreground">Range fixture removed.</p>}
	</div>
	)
}

const expectSide = (side: typeof sides[number], trigger: HTMLElement, content: HTMLElement, gap = 8) => {
	const triggerRect = trigger.getBoundingClientRect()
	const contentRect = content.getBoundingClientRect()
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
			throw new Error(`Top tooltip was not positioned above its trigger: bottom ${contentRect.bottom.toFixed(1)} expected ${(triggerRect.top - gap).toFixed(1)}, center ${centerX(contentRect).toFixed(1)} expected ${centerX(triggerRect).toFixed(1)}`)
		}
	} else if (!closeTo(contentRect.top, triggerRect.bottom + gap) || !closeTo(centerX(contentRect), centerX(triggerRect))) {
		throw new Error('Bottom tooltip was not positioned below its trigger')
	}

	const surface = content.querySelector<HTMLElement>('[data-slot=popup-surface]')
	if (!surface) throw new Error(`${side} tooltip has no shared popup surface`)
	const surfaceRect = surface.getBoundingClientRect()
	const attached = side === 'left'
		? closeTo(surfaceRect.left, contentRect.left, 1.25) && closeTo(surfaceRect.right, contentRect.right + 7, 1.25)
		: side === 'right'
			? closeTo(surfaceRect.left, contentRect.left - 7, 1.25) && closeTo(surfaceRect.right, contentRect.right, 1.25)
			: side === 'top'
				? closeTo(surfaceRect.top, contentRect.top, 1.25) && closeTo(surfaceRect.bottom, contentRect.bottom + 7, 1.25)
				: closeTo(surfaceRect.top, contentRect.top - 7, 1.25) && closeTo(surfaceRect.bottom, contentRect.bottom, 1.25)
	if (!attached || getComputedStyle(surface).clipPath === 'none') {
		throw new Error(`${side} tooltip arrow is not integrated into its popup surface`)
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
		<Tooltip gap={Number(args.gap)} placement={args.placement}>
			<TooltipTrigger class={triggerClass} id="basic-tooltip-trigger">
				Hover
			</TooltipTrigger>
			<TooltipContent>
				<p>{args.content}</p>
			</TooltipContent>
		</Tooltip>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#basic-tooltip-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
		if (!trigger || !content) throw new Error('Basic tooltip trigger or content was not rendered')

		hover(trigger)
		await wait(180)

		if (!content.matches(':popover-open') || content.getAttribute('role') !== 'tooltip') {
			throw new Error('Tooltip did not open on hover with tooltip role')
		}

		if (!content.id || trigger.getAttribute('aria-describedby') !== content.id) {
			throw new Error('Tooltip trigger is not described by tooltip content')
		}

		if (content.style.position !== 'fixed' || content.dataset.placement !== 'top') {
			throw new Error('Tooltip root placement did not produce fixed geometry output')
		}
		expectSide('top', trigger, content, 12)

		if (content.hasAttribute('data-side-preference') || content.hasAttribute('data-side-offset')) {
			throw new Error('Tooltip leaked legacy placement-input datasets')
		}

		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		await wait()

		if (!content.matches(':popover-open')) {
			throw new Error('Outside pointerdown dismissed a hover tooltip')
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
				<Tooltip key={side} placement={side}>
					<TooltipTrigger class={buttonVariants({ variant: 'outline', size: 'sm', class: 'w-fit capitalize' })} id={`tooltip-${side}-trigger`}>
						{side}
					</TooltipTrigger>
					<TooltipContent>
						<p>Add to library</p>
					</TooltipContent>
				</Tooltip>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		for (const side of sides) {
			const trigger = canvas.querySelector<HTMLElement>(`#tooltip-${side}-trigger`)
			const content = trigger && describedContent(canvas, trigger)
			if (!trigger || !content) throw new Error(`${side} tooltip trigger or content was not rendered`)

			hover(trigger)
			await wait(180)

			if (!content.matches(':popover-open') || content.dataset.placement !== side || content.dataset.side !== side) {
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

export const ProviderSkipDelay: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<TooltipProvider delayDuration={400} skipDelayDuration={1000}>
			<div class="flex gap-2">
				<Tooltip>
					<TooltipTrigger class={triggerClass} id="skip-first-trigger">
						First
					</TooltipTrigger>
					<TooltipContent>First tooltip</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger class={triggerClass} id="skip-second-trigger">
						Second
					</TooltipTrigger>
					<TooltipContent>Second tooltip</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	),
	play: async ({ canvas }) => {
		const firstTrigger = canvas.querySelector<HTMLElement>('#skip-first-trigger')
		const secondTrigger = canvas.querySelector<HTMLElement>('#skip-second-trigger')
		const firstContent = firstTrigger && describedContent(canvas, firstTrigger)
		const secondContent = secondTrigger && describedContent(canvas, secondTrigger)
		if (!firstTrigger || !firstContent || !secondTrigger || !secondContent) {
			throw new Error('Skip-delay tooltip fixtures were not rendered')
		}

		hover(firstTrigger)
		await wait(200)
		if (firstContent.matches(':popover-open')) throw new Error('First tooltip skipped the initial provider delay')

		await wait(250)
		if (!firstContent.matches(':popover-open')) throw new Error('First tooltip did not open after the provider delay')

		leave(firstTrigger)
		await wait(120)
		if (firstContent.matches(':popover-open')) throw new Error('First tooltip did not close before the skip window')

		hover(secondTrigger)
		await wait()
		if (!secondContent.matches(':popover-open')) throw new Error('Second tooltip did not skip delay within the provider window')
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
			<TooltipContent>
				<p>The caret tracks the trigger center</p>
			</TooltipContent>
		</Tooltip>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#arrow-tooltip-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
		const surface = canvas.querySelector<HTMLElement>('[data-slot="popup-surface"]')
		const arrow = canvas.querySelector<HTMLElement>('[data-slot="popup-arrow"]')
		if (!trigger || !content || !surface || !arrow) throw new Error('Arrow tooltip trigger, content, surface, or arrow was not rendered')

		hover(trigger)
		await wait()

		if (!content.matches(':popover-open') || content.dataset.side !== 'top') {
			throw new Error('Arrow tooltip did not open on the top side')
		}

		const arrowRect = arrow.getBoundingClientRect()
		const contentRect = content.getBoundingClientRect()
		const surfaceRect = surface.getBoundingClientRect()

		if (!closeTo(centerX(arrowRect), centerX(trigger.getBoundingClientRect()), 3)) {
			throw new Error('Tooltip arrow is not horizontally centered on the trigger')
		}

		if (!(arrowRect.top < contentRect.bottom && arrowRect.bottom > contentRect.bottom)) {
			throw new Error('Tooltip arrow marker does not straddle the content bottom edge')
		}

		if (arrow.hasAttribute('data-arrow-uncentered')) {
			throw new Error('Centered tooltip arrow was flagged data-arrow-uncentered')
		}

		if (!closeTo(surfaceRect.left, contentRect.left, 1.25) ||
			!closeTo(surfaceRect.top, contentRect.top, 1.25) ||
			!closeTo(surfaceRect.right, contentRect.right, 1.25) ||
			!closeTo(surfaceRect.bottom, contentRect.bottom + 7, 1.25)) {
			throw new Error('Tooltip surface does not extend 7px toward its top-side arrow')
		}
		if (!getComputedStyle(surface).clipPath || getComputedStyle(surface).clipPath === 'none') {
			throw new Error('Tooltip surface has no integrated arrow clip-path')
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

export const InlineReference: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<Tooltip placement="top">
			<TooltipTrigger
				as="span"
				class="cursor-help text-sm underline decoration-dotted underline-offset-4"
				id="inline-tooltip-trigger"
				style="display:inline;line-height:24px"
			>
				A deliberately wider first line<br />short line
			</TooltipTrigger>
			<TooltipContent>Anchored to the first inline box</TooltipContent>
		</Tooltip>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#inline-tooltip-trigger')
		const content = trigger && describedContent(canvas, trigger)
		if (!trigger || !content) throw new Error('Inline tooltip trigger or content was not rendered')

		const lineRects = () => Array.from(trigger.getClientRects()).filter(rect => rect.width > 1 && rect.height > 1)
		if (lineRects().length < 2) throw new Error('Inline tooltip trigger did not produce multiple line boxes')

		hover(trigger)
		await until(() => content.matches(':popover-open'), 'Inline tooltip did not open')
		await wait(180)

		const first = lineRects()[0]!
		const contentRect = content.getBoundingClientRect()
		if (!closeTo(centerX(contentRect), centerX(first), 4)) {
			throw new Error('Tooltip was not centered on the first inline line box')
		}
		if (!closeTo(contentRect.bottom, first.top - 8, 4)) {
			throw new Error(`Tooltip did not use the first inline line box as its top reference: bottom ${contentRect.bottom.toFixed(1)}, expected ${(first.top - 8).toFixed(1)}, side ${content.dataset.side ?? 'missing'}`)
		}
	},
}

export const RangeVirtualReference: Story = {
	argTypes: fixed,
	parameters: {
		docs: { description: 'Exercises the private positioning Adapter with a real multi-rect DOM Range and no public geometry escape hatch.' },
	},
	render: () => <RangeReferenceExample />,
	play: async ({ canvas }) => {
		const assertPosition = async () => {
			const text = canvas.querySelector<HTMLElement>('#range-reference-text')
			const content = canvas.querySelector<HTMLElement>('[data-test="range-reference-tooltip"]')
			if (!text || !content) throw new Error('Range virtual reference fixture was not rendered')
			await until(
				() => content.dataset.side === 'top' && Boolean(content.style.left) && Boolean(content.style.top),
				'Range virtual reference never committed top placement',
			)
			// The raw fixture leaves normal flow on its first fixed-position commit;
			// allow autoUpdate's layout-shift pass to settle that deliberate change.
			await wait(180)

			const range = document.createRange()
			range.selectNodeContents(text)
			const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 1 && rect.height > 1)
			const union = range.getBoundingClientRect()
			if (rects.length < 2) throw new Error('Range virtual reference did not produce multiple client rects')
			const first = rects[0]!
			if (Math.abs(centerX(first) - centerX(union)) < 12) {
				throw new Error('Range virtual reference fixture does not distinguish its first rect from the union box')
			}

			const contentRect = content.getBoundingClientRect()
			if (!closeTo(centerX(contentRect), centerX(first), 4)) {
				throw new Error('Range virtual reference was centered on its union box instead of the first line rect')
			}
			if (!closeTo(contentRect.bottom, first.top - 8, 4)) {
				throw new Error(`Range virtual reference lost its 8px gap: bottom ${contentRect.bottom.toFixed(1)}, expected ${(first.top - 8).toFixed(1)}`)
			}
		}

		await assertPosition()
		canvas.querySelector<HTMLButtonElement>('#range-reference-toggle')?.click()
		await until(
			() => !canvas.querySelector('[data-test="range-reference-fixture"]') && Boolean(canvas.querySelector('[data-test="range-reference-removed"]')),
			'Range virtual reference fixture did not unmount cleanly',
		)
		canvas.querySelector<HTMLButtonElement>('#range-reference-toggle')?.click()
		await assertPosition()
	},
}

export const ClippedReference: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<div
			class="rounded-md border border-border"
			id="tooltip-clip"
			style="position:relative;width:280px;height:96px;overflow:auto"
		>
			<div style="height:360px;padding:24px">
				<Tooltip placement="right">
					<TooltipTrigger class={triggerClass} id="clipped-tooltip-trigger">
						Scroll reference
					</TooltipTrigger>
					<TooltipContent>Hidden only while its reference is clipped</TooltipContent>
				</Tooltip>
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const clip = canvas.querySelector<HTMLElement>('#tooltip-clip')
		const trigger = canvas.querySelector<HTMLElement>('#clipped-tooltip-trigger')
		const content = trigger && describedContent(canvas, trigger)
		if (!clip || !trigger || !content) throw new Error('Clipped tooltip fixtures were not rendered')
		if (clip.scrollHeight <= clip.clientHeight) throw new Error('Tooltip clipping fixture is not scrollable')

		hover(trigger)
		await until(() => content.matches(':popover-open'), 'Clipped-reference tooltip did not open')

		clip.scrollTop = 220
		clip.dispatchEvent(new Event('scroll'))
		await until(
			() => content.dataset.referenceHidden === 'true',
			'Tooltip did not detect its fully clipped reference',
		)
		if (!content.matches(':popover-open') || content.style.visibility !== 'hidden' || content.style.pointerEvents !== 'none') {
			throw new Error('Clipped tooltip was not kept natively open, hidden, and pointer-inert')
		}

		clip.scrollTop = 0
		clip.dispatchEvent(new Event('scroll'))
		await until(
			() => !content.hasAttribute('data-reference-hidden') && content.style.visibility === '' && content.style.pointerEvents === '',
			'Tooltip did not restore itself after its reference became visible',
		)
		if (!content.matches(':popover-open')) throw new Error('Restored tooltip lost its native open state')
	},
}

export const FocusAndDisabledHover: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<Tooltip disableHoverableContent>
			<TooltipTrigger class={triggerClass} id="focus-disabled-hover-trigger">
				Focus and hover
			</TooltipTrigger>
			<TooltipContent>Focus independently holds this tooltip open</TooltipContent>
		</Tooltip>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#focus-disabled-hover-trigger')
		const content = trigger && describedContent(canvas, trigger)
		if (!trigger || !content) throw new Error('Focus/hover tooltip fixtures were not rendered')

		trigger.focus()
		await until(() => content.matches(':popover-open'), 'Focused tooltip did not open')
		hover(trigger)
		leave(trigger)
		await wait(100)
		if (!content.matches(':popover-open')) {
			throw new Error('Pointer leave closed disableHoverableContent tooltip while focus still held it')
		}

		trigger.blur()
		await until(() => !content.matches(':popover-open'), 'Tooltip did not close after its final focus zone left')
	},
}

export const EscapeRecovery: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<Tooltip>
			<TooltipTrigger class={triggerClass} id="escape-recovery-trigger">
				Escape and reopen
			</TooltipTrigger>
			<TooltipContent>Hover bridge must reset after Escape</TooltipContent>
		</Tooltip>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#escape-recovery-trigger')
		const content = trigger && describedContent(canvas, trigger)
		if (!trigger || !content) throw new Error('Escape recovery tooltip fixtures were not rendered')

		hover(trigger)
		await until(() => content.matches(':popover-open'), 'Escape recovery tooltip did not open')
		hover(content)
		leave(trigger)
		await wait(30)
		if (!content.matches(':popover-open')) throw new Error('Content hover did not bridge the trigger leave')

		const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
		content.dispatchEvent(escape)
		await until(() => !content.matches(':popover-open'), 'Escape did not close a content-hovered tooltip')
		if (!escape.defaultPrevented) throw new Error('Tooltip Escape was not consumed')

		hover(trigger)
		await until(() => content.matches(':popover-open'), 'Tooltip did not reopen after Escape')
		leave(trigger)
		await until(
			() => !content.matches(':popover-open'),
			'Tooltip remained open because Escape retained a stale hover zone',
		)
	},
}

export const ZeroSkipDelay: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<TooltipProvider delayDuration={300} skipDelayDuration={0}>
			<div class="flex gap-2">
				<Tooltip disableHoverableContent>
					<TooltipTrigger class={triggerClass} id="zero-skip-first-trigger">First</TooltipTrigger>
					<TooltipContent>First zero-skip tooltip</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger class={triggerClass} id="zero-skip-second-trigger">Second</TooltipTrigger>
					<TooltipContent>Second zero-skip tooltip</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	),
	play: async ({ canvas }) => {
		const firstTrigger = canvas.querySelector<HTMLElement>('#zero-skip-first-trigger')
		const secondTrigger = canvas.querySelector<HTMLElement>('#zero-skip-second-trigger')
		const firstContent = firstTrigger && describedContent(canvas, firstTrigger)
		const secondContent = secondTrigger && describedContent(canvas, secondTrigger)
		if (!firstTrigger || !secondTrigger || !firstContent || !secondContent) {
			throw new Error('Zero skip-delay tooltip fixtures were not rendered')
		}

		hover(firstTrigger)
		await wait(60)
		if (firstContent.matches(':popover-open')) throw new Error('First zero-skip tooltip ignored its initial delay')
		await until(() => firstContent.matches(':popover-open'), 'First zero-skip tooltip did not open after its delay')

		leave(firstTrigger)
		await until(() => !firstContent.matches(':popover-open'), 'First zero-skip tooltip did not close immediately')
		hover(secondTrigger)
		await wait(60)
		if (secondContent.matches(':popover-open')) {
			throw new Error('skipDelayDuration=0 skipped the second tooltip delay')
		}
		await until(() => secondContent.matches(':popover-open'), 'Second zero-skip tooltip did not open after its full delay')
	},
}

export const DescribedbyComposition: Story<typeof Tooltip> = {
	argTypes: fixed,
	render: () => (
		<div class="grid justify-items-center gap-2">
			<p id="tooltip-caller-description">Existing caller description</p>
			<Tooltip>
				<TooltipTrigger
					aria-describedby="tooltip-caller-description"
					class={triggerClass}
					id="describedby-composition-trigger"
				>
					Combined descriptions
				</TooltipTrigger>
				<TooltipContent>Additional tooltip description</TooltipContent>
			</Tooltip>
		</div>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#describedby-composition-trigger')
		const tooltipContent = canvas.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
		if (!trigger) throw new Error('Describedby composition trigger was not rendered')
		const ids = (trigger.getAttribute('aria-describedby') ?? '').trim().split(/\s+/).filter(Boolean)

		if (!tooltipContent || !ids.includes('tooltip-caller-description') || !ids.includes(tooltipContent.id)) {
			throw new Error('Tooltip did not compose caller and generated aria-describedby relations')
		}
		if (new Set(ids).size !== ids.length) throw new Error('Tooltip emitted duplicate aria-describedby tokens')
	},
}
