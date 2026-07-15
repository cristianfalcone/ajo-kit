/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import { move } from 'ajo-cloves'
import type { Meta, Story } from './app'
import { buttonVariants } from 'ajo-ui-playa/button'
import { Field, FieldGroup, FieldLabel } from 'ajo-ui-playa/field'
import Input from 'ajo-ui-playa/input'
import {
	Popover,
	PopoverAnchor,
	PopoverArrow,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from 'ajo-ui-playa/popover'

export default {
	title: 'UI/Popover',
	component: Popover,
	args: {
		align: 'start',
		title: 'Dimensions',
		description: 'Set the dimensions for the layer.',
	},
	argTypes: {
		align: { control: 'radio', options: ['start', 'center', 'end'] },
		title: { control: 'text' },
		description: { control: 'text' },
	},
	parameters: {
		docs: { description: 'Native Popover API overlay with Ajo state, Ajo Kit slots, header/title/description helpers, and anchor-aware placement.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Popover>

const fixed = { align: { control: false }, title: { control: false }, description: { control: false } } as const
const hoverFixed = { ...fixed, side: { control: false } } as const

const triggerClass = buttonVariants({ variant: 'outline' })
const wait = (ms?: number) => ms == null
	? new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))
	: new Promise(resolve => setTimeout(resolve, ms))
const hover = (element: HTMLElement) => element.dispatchEvent(new MouseEvent('mouseenter', { cancelable: true }))
const leave = (element: HTMLElement) => element.dispatchEvent(new MouseEvent('mouseleave', { cancelable: true }))
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const hoverContentClass = 'w-64 rounded-md'
const markerStyle = (x: number, y: number, hidden: boolean) =>
	`position:fixed;left:${x}px;top:${y}px;z-index:60;touch-action:none;cursor:grab;visibility:${hidden ? 'hidden' : 'visible'}`

const pointer = (type: 'pointerdown' | 'pointermove' | 'pointerup', x: number, y: number) => new PointerEvent(type, {
	bubbles: true,
	button: 0,
	buttons: type === 'pointerup' ? 0 : 1,
	clientX: x,
	clientY: y,
	isPrimary: true,
	pointerId: 1,
	pointerType: 'mouse',
})

const dragAnchor = async (marker: HTMLElement, x: number, y: number) => {
	const rect = marker.getBoundingClientRect()
	const startX = rect.left + rect.width / 2
	const startY = rect.top + rect.height / 2

	marker.dispatchEvent(pointer('pointerdown', startX, startY))
	marker.dispatchEvent(pointer('pointermove', x, y))
	marker.dispatchEvent(pointer('pointerup', x, y))
	await wait()
}

const assertInsideViewport = (element: HTMLElement, label: string) => {
	const rect = element.getBoundingClientRect()
	const width = document.documentElement.clientWidth
	const height = document.documentElement.clientHeight
	const tolerance = 1

	if (
		rect.left < -tolerance ||
		rect.top < -tolerance ||
		rect.right > width + tolerance ||
		rect.bottom > height + tolerance
	) {
		throw new Error(`${label} popover escaped the viewport: ${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.right)}x${Math.round(rect.bottom)}`)
	}
}

const side = (element: HTMLElement) => element.dataset.side
const hoverSides = ['left', 'top', 'bottom', 'right'] as const

const centerX = (rect: DOMRect) => rect.left + rect.width / 2

const assertArrowOnEdge = (arrow: HTMLElement, content: HTMLElement, edge: 'top' | 'bottom', label: string) => {
	const arrowRect = arrow.getBoundingClientRect()
	const contentRect = content.getBoundingClientRect()
	const line = edge === 'top' ? contentRect.top : contentRect.bottom

	if (!(arrowRect.top < line && arrowRect.bottom > line)) {
		throw new Error(`${label} arrow does not straddle the content's ${edge} edge`)
	}
}

// Paint-level probe: overflow clipping removes the caret's protruding half
// from paint and hit testing while leaving every rect unchanged, so rect
// asserts alone would pass an invisible caret.
const assertArrowPainted = (arrow: HTMLElement, content: HTMLElement, label: string) => {
	const arrowRect = arrow.getBoundingClientRect()
	const contentRect = content.getBoundingClientRect()
	// Midpoint of the protruding half, above or below the content box.
	const outsideY = arrowRect.top < contentRect.top
		? (arrowRect.top + contentRect.top) / 2
		: (contentRect.bottom + arrowRect.bottom) / 2
	const previous = arrow.style.pointerEvents

	arrow.style.pointerEvents = 'auto'
	const hit = document.elementFromPoint(centerX(arrowRect), outsideY)
	arrow.style.pointerEvents = previous

	if (!hit || !arrow.contains(hit)) {
		throw new Error(`${label} arrow's protruding half is not painted: hit ${hit ? hit.tagName.toLowerCase() : 'nothing'} instead`)
	}
}

const VercelPreview = () => (
	<div class="flex justify-between gap-4">
		<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
			VC
		</div>
		<div class="space-y-1">
			<h4 class="text-sm font-semibold">@nextjs</h4>
			<p class="text-sm">
				The React Framework - created and maintained by @vercel.
			</p>
			<div class="flex items-center pt-2 text-xs text-muted-foreground">
				<span class="i-lucide-calendar-days mr-2 size-4" />
				Joined December 2021
			</div>
		</div>
	</div>
)

const ControlledExample: Stateful = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	while (true) yield (
		<div class="grid gap-3">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger class={triggerClass} id="controlled-popover-trigger">
					{open ? 'Close' : 'Open'} controlled
				</PopoverTrigger>
				<PopoverContent align="start" class="w-64">
					<PopoverHeader>
						<PopoverTitle>Controlled popover</PopoverTitle>
						<PopoverDescription>
							This popover is driven by Ajo state.
						</PopoverDescription>
					</PopoverHeader>
				</PopoverContent>
			</Popover>
			<p class="text-sm text-muted-foreground">Open: {open ? 'yes' : 'no'}</p>
		</div>
	)
}

const ControlledHoverExample: Stateful = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	while (true) yield (
		<div class="grid justify-items-center gap-3">
			<Popover openOn="hover" open={open} onOpenChange={setOpen} openDelay={0} closeDelay={0}>
				<PopoverTrigger class={triggerClass} id="controlled-hover-popover-trigger">
					Controlled
				</PopoverTrigger>
				<PopoverContent class={hoverContentClass}>
					<div class="text-sm">Controlled hover popover content.</div>
				</PopoverContent>
			</Popover>
			<p class="text-sm text-muted-foreground">Open: {open ? 'yes' : 'no'}</p>
		</div>
	)
}

const DraggableAnchor: Stateful = function* () {
	let marker: HTMLElement | null = null
	let positioned = false
	let startX = 0
	let startY = 0
	let x = 0
	let y = 0

	const nudge = () => {
		// Moving a static anchor changes its rect without resize, scroll, or ResizeObserver.
		// The synthetic resize drives the production shared-source -> frame-coalesced -> place() path.
		window.dispatchEvent(new Event('resize'))
	}

	const apply = () => {
		if (!marker) return
		marker.style.left = `${x}px`
		marker.style.top = `${y}px`
		marker.style.visibility = 'visible'
	}

	const place = (nextX: number, nextY: number) => {
		const width = marker?.offsetWidth || 40
		const height = marker?.offsetHeight || 40

		x = clamp(Math.round(nextX), 4, Math.max(4, window.innerWidth - width - 4))
		y = clamp(Math.round(nextY), 4, Math.max(4, window.innerHeight - height - 4))
		apply()
		nudge()
	}

	const capture = (element: HTMLElement | null) => {
		marker = element
		if (!element || positioned) return

		queueMicrotask(() => {
			if (!element.isConnected) return

			const rect = this.getBoundingClientRect()
			positioned = true
			place(rect.left, rect.top)
		})
	}

	const drag = move(this, {
		onStart: () => {
			startX = x
			startY = y
			if (marker) marker.style.cursor = 'grabbing'
		},
		onMove: data => {
			place(startX + data.dx, startY + data.dy)
		},
		onEnd: () => {
			if (marker) marker.style.cursor = 'grab'
			nudge()
		},
	})

	while (true) yield (
		<PopoverAnchor
			aria-label="Drag anchor marker"
			class="flex size-10 select-none items-center justify-center rounded-full edge bg-muted text-muted-foreground shadow-sm"
			id="anchor-popover-marker"
			ref={capture}
			style={markerStyle(x, y, !positioned)}
			set:onpointerdown={(event: PointerEvent) => {
				event.preventDefault()
				drag.start(event)
			}}
		>
			<span class="i-lucide-crosshair size-4" />
		</PopoverAnchor>
	)
}

DraggableAnchor.attrs = { class: 'size-10' }

export const Basic: Story<typeof Popover> = {
	render: args => (
		<Popover>
			<PopoverTrigger class={triggerClass} id="basic-popover-trigger">
				Open Popover
			</PopoverTrigger>
			<PopoverContent align={args.align} id="basic-popover-content">
				<PopoverHeader>
					<PopoverTitle>{args.title}</PopoverTitle>
					<PopoverDescription>
						{args.description}
					</PopoverDescription>
				</PopoverHeader>
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#basic-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		if (!trigger || !content) throw new Error('Basic popover trigger or content was not rendered')
		if (content.id !== 'basic-popover-content' || trigger.getAttribute('aria-controls') !== content.id) {
			throw new Error('Popover trigger aria-controls did not reference its content')
		}

		trigger.click()
		await wait()

		if (!content.matches(':popover-open') || trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Popover did not open after trigger click')
		}

		content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
		await wait()

		if (content.matches(':popover-open') || trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Popover did not close on Escape')
		}
	},
}

export const HoverBasic: Story<typeof Popover> = {
	args: { side: 'bottom' },
	argTypes: { ...fixed, side: { control: 'radio', options: ['top', 'right', 'bottom', 'left'] } },
	render: args => (
		<Popover openOn="hover" openDelay={0} closeDelay={80}>
			<PopoverTrigger
				as="a"
				class={buttonVariants({ size: 'none', variant: 'link' })}
				href="https://nextjs.org"
				id="basic-hover-popover-trigger"
			>
				@nextjs
			</PopoverTrigger>
			<PopoverContent side={args.side} class={`${hoverContentClass} w-80`}>
				<VercelPreview />
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#basic-hover-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		if (!trigger || !content) throw new Error('Basic hover popover trigger or content was not rendered')
		const triggerStyle = getComputedStyle(trigger)
		if (triggerStyle.paddingLeft !== '0px' || triggerStyle.paddingRight !== '0px') {
			throw new Error('Hover-mode Popover link trigger did not preserve its zero inline padding')
		}

		hover(trigger)
		await wait()

		if (!content.matches(':popover-open') || content.dataset.state !== 'open') {
			throw new Error('Hover-mode Popover did not open on hover')
		}

		if (trigger.getAttribute('aria-controls') !== content.id || trigger.hasAttribute('aria-expanded')) {
			throw new Error('Hover-mode Popover trigger ARIA does not match hover behavior')
		}

		leave(trigger)
		hover(content)
		await wait(120)

		if (!content.matches(':popover-open')) {
			throw new Error('Hover-mode Popover did not stay open while pointer moved into content')
		}

		leave(content)
		await wait(120)

		if (content.matches(':popover-open')) {
			throw new Error('Hover-mode Popover did not close after hover left and closeDelay elapsed')
		}
	},
}

export const WithForm: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<Popover>
			<PopoverTrigger class={triggerClass} id="form-popover-trigger">
				Open Popover
			</PopoverTrigger>
			<PopoverContent align="start" class="w-64" id="form-popover-content">
				<PopoverHeader>
					<PopoverTitle>Dimensions</PopoverTitle>
					<PopoverDescription>
						Set the dimensions for the layer.
					</PopoverDescription>
				</PopoverHeader>
				<FieldGroup class="mt-4 gap-4">
					<Field orientation="horizontal">
						<FieldLabel for="popover-width" class="w-1/2">
							Width
						</FieldLabel>
						<Input id="popover-width" set:value="100%" />
					</Field>
					<Field orientation="horizontal">
						<FieldLabel for="popover-height" class="w-1/2">
							Height
						</FieldLabel>
						<Input id="popover-height" set:value="25px" />
					</Field>
				</FieldGroup>
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#form-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		if (!trigger || !content) throw new Error('Form popover trigger or content was not rendered')

		trigger.click()
		await wait()

		const input = canvas.querySelector<HTMLInputElement>('#popover-width')
		if (!content.matches(':popover-open') || input?.value !== '100%') {
			throw new Error('Popover form did not open with input content')
		}
	},
}

export const Alignments: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<div class="flex gap-6">
			<Popover>
				<PopoverTrigger class={buttonVariants({ variant: 'outline', size: 'sm' })} id="popover-start-trigger">
					Start
				</PopoverTrigger>
				<PopoverContent align="start" class="w-40" id="popover-start-content">
					Aligned to start
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
					Center
				</PopoverTrigger>
				<PopoverContent align="center" class="w-40">
					Aligned to center
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
					End
				</PopoverTrigger>
				<PopoverContent align="end" class="w-40">
					Aligned to end
				</PopoverContent>
			</Popover>
		</div>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#popover-start-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"][data-align="start"]')
		if (!trigger || !content) throw new Error('Aligned popover trigger or content was not rendered')

		trigger.click()
		await wait()

		if (!content.matches(':popover-open') || content.dataset.align !== 'start') {
			throw new Error('Start-aligned popover did not open with align metadata')
		}
	},
}

export const Controlled: Story = {
	argTypes: fixed,
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#controlled-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		if (!trigger || !content) throw new Error('Controlled popover trigger or content was not rendered')

		trigger.click()
		await wait()

		if (!content.matches(':popover-open') || !canvas.textContent?.includes('Open: yes')) {
			throw new Error('Controlled popover did not update open state')
		}
	},
}

export const HoverSides: Story<typeof Popover> = {
	argTypes: hoverFixed,
	render: () => (
		<div class="flex flex-wrap justify-center gap-2">
			{hoverSides.map(side => (
				<Popover key={side} openOn="hover" openDelay={0} closeDelay={60}>
					<PopoverTrigger class={buttonVariants({ variant: 'outline', size: 'sm', class: 'capitalize' })} id={`hover-popover-${side}-trigger`}>
						{side}
					</PopoverTrigger>
					<PopoverContent side={side} class={hoverContentClass}>
						<div class="flex flex-col gap-1">
							<h4 class="font-medium">Hover Popover</h4>
							<p class="text-sm">This hover popover appears on the {side} side of the trigger.</p>
						</div>
					</PopoverContent>
				</Popover>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#hover-popover-left-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"][data-side-preference="left"]')
		if (!trigger || !content) throw new Error('Left hover popover trigger or content was not rendered')

		hover(trigger)
		await wait()

		if (!content.matches(':popover-open') || content.dataset.sidePreference !== 'left') {
			throw new Error('Hover-mode Popover side preference was not applied')
		}
	},
}

export const HoverDelays: Story<typeof Popover> = {
	argTypes: hoverFixed,
	render: () => (
		<Popover openOn="hover" openDelay={80} closeDelay={120}>
			<PopoverTrigger class={triggerClass} id="delayed-hover-popover-trigger">
				Hover with delay
			</PopoverTrigger>
			<PopoverContent class={hoverContentClass}>
				<div class="text-sm">Open and close delays are controlled by the root.</div>
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#delayed-hover-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		if (!trigger || !content) throw new Error('Delayed hover popover trigger or content was not rendered')

		hover(trigger)
		await wait(20)

		if (content.matches(':popover-open')) {
			throw new Error('Hover-mode Popover opened before openDelay elapsed')
		}

		await wait(90)

		if (!content.matches(':popover-open')) {
			throw new Error('Hover-mode Popover did not open after openDelay elapsed')
		}
	},
}

export const HoverKeyboard: Story<typeof Popover> = {
	argTypes: hoverFixed,
	render: () => (
		<Popover openOn="hover" openDelay={0} closeDelay={0}>
			<PopoverTrigger class={triggerClass} id="keyboard-hover-popover-trigger">
				Focus preview
			</PopoverTrigger>
			<PopoverContent class={hoverContentClass}>
				<div class="text-sm">Focus opens the card and Escape dismisses it.</div>
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#keyboard-hover-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		if (!trigger || !content) throw new Error('Keyboard hover popover trigger or content was not rendered')

		trigger.focus()
		await wait()

		if (!content.matches(':popover-open')) {
			throw new Error('Hover-mode Popover did not open on focus')
		}

		const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
		trigger.dispatchEvent(event)
		await wait()

		if (!event.defaultPrevented || content.matches(':popover-open')) {
			throw new Error('Hover-mode Popover did not close on Escape through the hover dismiss channel')
		}
	},
}

export const HoverControlled: Story = {
	argTypes: hoverFixed,
	render: () => <ControlledHoverExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLElement>('#controlled-hover-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		if (!trigger || !content) throw new Error('Controlled hover popover trigger or content was not rendered')

		hover(trigger)
		await wait()

		if (!content.matches(':popover-open') || !canvas.textContent?.includes('Open: yes')) {
			throw new Error('Controlled hover-mode Popover did not update controlled state')
		}
	},
}

export const ExplicitAnchor: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<Popover>
			<div class="grid justify-items-center gap-3">
				<DraggableAnchor />
				<PopoverTrigger class={buttonVariants({ variant: 'secondary', size: 'sm' })} id="anchor-popover-trigger">
					Show anchored content
				</PopoverTrigger>
			</div>
			<PopoverContent popover="manual" side="bottom" align="center" class="w-52" id="anchor-popover-content">
				Content is positioned from the explicit anchor.
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#anchor-popover-trigger')
		const marker = canvas.querySelector<HTMLElement>('#anchor-popover-marker')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"][data-side-preference="bottom"]')
		if (!trigger || !marker || !content) throw new Error('Anchored popover trigger, marker, or content was not rendered')

		await wait()

		trigger.click()
		await wait()

		if (!content.matches(':popover-open') || side(content) !== 'bottom') {
			throw new Error('Anchored popover did not open on the requested side')
		}

		const markerRect = marker.getBoundingClientRect()
		await dragAnchor(marker, window.innerWidth - 12, markerRect.top + markerRect.height / 2)
		assertInsideViewport(content, 'Right-edge anchored')

		await dragAnchor(marker, window.innerWidth / 2, window.innerHeight - 12)
		if (side(content) !== 'top') throw new Error('Anchored popover did not flip above the bottom edge')
		assertInsideViewport(content, 'Bottom-edge anchored')

		await dragAnchor(marker, window.innerWidth / 2, window.innerHeight / 2)
		if (side(content) !== content.dataset.sidePreference) {
			throw new Error('Anchored popover did not return to the preferred side near center')
		}
		assertInsideViewport(content, 'Centered anchored')
	},
}

export const WithArrow: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<Popover>
			<PopoverTrigger class={triggerClass} id="arrow-popover-trigger">
				Open with arrow
			</PopoverTrigger>
			<PopoverContent side="bottom" sideOffset={8} class="w-64" id="arrow-popover-content">
				<PopoverHeader>
					<PopoverTitle>Anchored caret</PopoverTitle>
					<PopoverDescription>
						The caret tracks the trigger center on the near edge.
					</PopoverDescription>
				</PopoverHeader>
				<PopoverArrow />
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#arrow-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		const arrow = canvas.querySelector<HTMLElement>('[data-slot="popover-arrow"]')
		if (!trigger || !content || !arrow) throw new Error('Arrow popover trigger, content, or arrow was not rendered')

		trigger.click()
		await wait()

		if (!content.matches(':popover-open') || side(content) !== 'bottom') {
			throw new Error('Arrow popover did not open on the bottom side')
		}

		if (Math.abs(centerX(arrow.getBoundingClientRect()) - centerX(trigger.getBoundingClientRect())) > 3) {
			throw new Error('Arrow is not horizontally centered on the trigger')
		}

		assertArrowOnEdge(arrow, content, 'top', 'Bottom-side')
		assertArrowPainted(arrow, content, 'Bottom-side')

		if (arrow.hasAttribute('data-uncentered')) {
			throw new Error('Centered arrow was flagged data-uncentered')
		}
	},
}

export const ArrowFlip: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<Popover>
			<PopoverTrigger
				class={triggerClass}
				id="flip-arrow-popover-trigger"
				style="position:fixed;bottom:8px;left:50%;transform:translateX(-50%)"
			>
				Near the bottom edge
			</PopoverTrigger>
			<PopoverContent side="bottom" sideOffset={8} class="w-64" id="flip-arrow-popover-content">
				<PopoverHeader>
					<PopoverTitle>Flipped caret</PopoverTitle>
					<PopoverDescription>
						The content flips above; the caret stays on the anchor side.
					</PopoverDescription>
				</PopoverHeader>
				<PopoverArrow />
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#flip-arrow-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		const arrow = canvas.querySelector<HTMLElement>('[data-slot="popover-arrow"]')
		if (!trigger || !content || !arrow) throw new Error('Flip arrow popover trigger, content, or arrow was not rendered')

		trigger.click()
		await wait()

		if (!content.matches(':popover-open') || side(content) !== 'top') {
			throw new Error('Arrow popover did not flip to the top side')
		}

		if (Math.abs(centerX(arrow.getBoundingClientRect()) - centerX(trigger.getBoundingClientRect())) > 3) {
			throw new Error('Flipped arrow is not horizontally centered on the trigger')
		}

		assertArrowOnEdge(arrow, content, 'bottom', 'Flipped')
		assertArrowPainted(arrow, content, 'Flipped')
	},
}

export const ArrowUncentered: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<Popover>
			<PopoverTrigger
				aria-label="Corner trigger"
				class={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
				id="uncentered-arrow-popover-trigger"
				style="position:fixed;left:0px;top:8px"
			>
				<span class="i-lucide-crosshair size-4" />
			</PopoverTrigger>
			<PopoverContent side="bottom" sideOffset={8} class="w-64" id="uncentered-arrow-popover-content">
				<PopoverHeader>
					<PopoverTitle>Clamped caret</PopoverTitle>
					<PopoverDescription>
						The caret clamps inside the content and flags data-uncentered.
					</PopoverDescription>
				</PopoverHeader>
				<PopoverArrow />
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#uncentered-arrow-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		const arrow = canvas.querySelector<HTMLElement>('[data-slot="popover-arrow"]')
		if (!trigger || !content || !arrow) throw new Error('Uncentered arrow popover trigger, content, or arrow was not rendered')

		trigger.click()
		await wait()

		if (!content.matches(':popover-open') || side(content) !== 'bottom') {
			throw new Error('Uncentered arrow popover did not open on the bottom side')
		}

		if (!arrow.hasAttribute('data-uncentered')) {
			throw new Error('Clamped arrow was not flagged data-uncentered')
		}

		const arrowRect = arrow.getBoundingClientRect()
		const contentRect = content.getBoundingClientRect()

		if (centerX(arrowRect) <= centerX(trigger.getBoundingClientRect())) {
			throw new Error('Clamped arrow was not displaced away from the trigger center')
		}

		if (arrowRect.left < contentRect.left || arrowRect.right > contentRect.right) {
			throw new Error('Clamped arrow escaped the content bounds')
		}

		assertArrowOnEdge(arrow, content, 'top', 'Clamped')
	},
}
