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
	PopoverContent,
	PopoverTrigger,
	type PopupPlacement,
} from 'ajo-ui-playa/popover'

export default {
	title: 'UI/Popover',
	component: Popover,
	args: {
		placement: 'bottom-start',
		title: 'Dimensions',
		description: 'Set the dimensions for the layer.',
	},
	argTypes: {
		placement: { control: 'select', options: ['top', 'top-start', 'top-end', 'right', 'right-start', 'right-end', 'bottom', 'bottom-start', 'bottom-end', 'left', 'left-start', 'left-end', 'auto'] },
		title: { control: 'text' },
		description: { control: 'text' },
	},
	parameters: {
		docs: { description: 'Native Popover API overlay with Ajo-owned semantics, state, and anchor-aware placement.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Popover>

const fixed = { placement: { control: false }, title: { control: false }, description: { control: false } } as const
const hoverFixed = fixed

const triggerClass = buttonVariants({ variant: 'outline' })
const wait = (ms?: number) => ms == null
	? new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))
	: new Promise(resolve => setTimeout(resolve, ms))
const until = async (check: () => boolean, message: string) => {
	for (let attempt = 0; attempt < 40; attempt++) {
		if (check()) return
		await wait()
	}
	throw new Error(message)
}
const hover = (element: HTMLElement) => element.dispatchEvent(new MouseEvent('mouseenter', { cancelable: true }))
const leave = (element: HTMLElement) => element.dispatchEvent(new MouseEvent('mouseleave', { cancelable: true }))
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const hoverContentClass = 'w-64 rounded-md'
const placements = ['top', 'top-start', 'top-end', 'right', 'right-start', 'right-end', 'bottom', 'bottom-start', 'bottom-end', 'left', 'left-start', 'left-end', 'auto'] as const satisfies readonly PopupPlacement[]
type Direction = 'ltr' | 'rtl'
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
const centerY = (rect: DOMRect) => rect.top + rect.height / 2

const change = (select: HTMLSelectElement, value: string) => {
	select.value = value
	select.dispatchEvent(new Event('change', { bubbles: true }))
}

const assertAttached = (reference: HTMLElement, content: HTMLElement, direction: Direction, label: string) => {
	const placement = content.dataset.placement
	const [resolvedSide, resolvedAlign = 'center'] = placement?.split('-') ?? []
	const referenceRect = reference.getBoundingClientRect()
	const contentRect = content.getBoundingClientRect()
	const tolerance = 3
	const separated = resolvedSide === 'top' ? contentRect.bottom <= referenceRect.top + tolerance
		: resolvedSide === 'right' ? contentRect.left >= referenceRect.right - tolerance
			: resolvedSide === 'bottom' ? contentRect.top >= referenceRect.bottom - tolerance
				: resolvedSide === 'left' && contentRect.right <= referenceRect.left + tolerance

	if (!separated) throw new Error(`${label} content is not attached on its ${resolvedSide ?? 'unknown'} side`)

	const crossDelta = resolvedSide === 'top' || resolvedSide === 'bottom'
		? resolvedAlign === 'center' ? centerX(contentRect) - centerX(referenceRect)
			: resolvedAlign === 'start'
				? direction === 'rtl' ? contentRect.right - referenceRect.right : contentRect.left - referenceRect.left
				: direction === 'rtl' ? contentRect.left - referenceRect.left : contentRect.right - referenceRect.right
		: resolvedAlign === 'center' ? centerY(contentRect) - centerY(referenceRect)
			: resolvedAlign === 'start' ? contentRect.top - referenceRect.top : contentRect.bottom - referenceRect.bottom

	if (Math.abs(crossDelta) > tolerance) {
		throw new Error(`${label} ${resolvedAlign} alignment drifted by ${Math.round(crossDelta)}px`)
	}
	if (content.dataset.side !== resolvedSide || content.dataset.align !== resolvedAlign) {
		throw new Error(`${label} output datasets disagree with data-placement=${placement}`)
	}
	if (content.style.position !== 'fixed') throw new Error(`${label} content is not fixed-positioned`)
	if (!content.style.transformOrigin || /\b(?:start|end)\b/.test(content.style.transformOrigin)) {
		throw new Error(`${label} has invalid transform-origin: ${content.style.transformOrigin || 'empty'}`)
	}
}

const assertPaintedOutside = (content: HTMLElement, clip: HTMLElement, label: string) => {
	const contentRect = content.getBoundingClientRect()
	const clipRect = clip.getBoundingClientRect()
	const x = Math.min(contentRect.right - 2, clipRect.right + 8)
	const y = centerY(contentRect)
	if (x <= clipRect.right || x <= contentRect.left || x >= contentRect.right) {
		throw new Error(`${label} content did not escape its clipping ancestor`)
	}
	const hit = document.elementFromPoint(x, y)
	if (!hit || !content.contains(hit)) {
		throw new Error(`${label} top-layer content was clipped: hit ${hit ? hit.tagName.toLowerCase() : 'nothing'} instead`)
	}
}

const assertArrowOnEdge = (arrow: HTMLElement, content: HTMLElement, edge: 'top' | 'right' | 'bottom' | 'left', label: string) => {
	const arrowRect = arrow.getBoundingClientRect()
	const contentRect = content.getBoundingClientRect()
	const line = edge === 'top' ? contentRect.top
		: edge === 'right' ? contentRect.right
			: edge === 'bottom' ? contentRect.bottom
				: contentRect.left
	const straddles = edge === 'top' || edge === 'bottom'
		? arrowRect.top < line && arrowRect.bottom > line
		: arrowRect.left < line && arrowRect.right > line

	if (!straddles) {
		throw new Error(`${label} arrow does not straddle the content's ${edge} edge`)
	}
}

const assertArrowSurface = (content: HTMLElement, surface: HTMLElement, label: string) => {
	const contentRect = content.getBoundingClientRect()
	const surfaceRect = surface.getBoundingClientRect()
	const actual = { left: surfaceRect.left, top: surfaceRect.top, right: surfaceRect.right, bottom: surfaceRect.bottom }
	const extension = 7
	const tolerance = 1.25
	const expected = content.dataset.side === 'top'
		? { left: contentRect.left, top: contentRect.top, right: contentRect.right, bottom: contentRect.bottom + extension }
		: content.dataset.side === 'bottom'
			? { left: contentRect.left, top: contentRect.top - extension, right: contentRect.right, bottom: contentRect.bottom }
			: content.dataset.side === 'left'
				? { left: contentRect.left, top: contentRect.top, right: contentRect.right + extension, bottom: contentRect.bottom }
				: content.dataset.side === 'right'
					? { left: contentRect.left - extension, top: contentRect.top, right: contentRect.right, bottom: contentRect.bottom }
					: null

	if (!expected || Object.entries(expected).some(([edge, value]) =>
		Math.abs(actual[edge as keyof typeof actual] - value) > tolerance)) {
		throw new Error(`${label} arrow surface does not extend 7px toward data-side=${content.dataset.side ?? 'missing'}`)
	}
	if (!getComputedStyle(surface).clipPath || getComputedStyle(surface).clipPath === 'none') {
		throw new Error(`${label} arrow surface has no integrated clip-path`)
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
			<Popover label="Controlled popover" description="This popover is driven by Ajo state." open={open} onOpenChange={setOpen} placement="bottom-start">
				<PopoverTrigger class={triggerClass} id="controlled-popover-trigger">
					{open ? 'Close' : 'Open'} controlled
				</PopoverTrigger>
				<PopoverContent class="w-64" />
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
			<Popover label="Controlled hover preview" openOn="hover" open={open} onOpenChange={setOpen} openDelay={0} closeDelay={0}>
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

const PlacementMatrixExample: Stateful = function* () {
	let direction: Direction = 'ltr'
	let placement: PopupPlacement = 'top'

	while (true) yield (
		<div id="popover-placement-matrix" class="grid w-[36rem] gap-6" dir={direction}>
			<div class="flex items-end justify-center gap-4 text-sm">
				<label class="grid gap-1">
					<span class="text-muted-foreground">Placement</span>
					<select
						id="popover-placement-select"
						class="rounded-md edge bg-background px-2 py-1"
						set:value={placement}
						set:onchange={(event: Event) => this.next(() => {
							placement = (event.currentTarget as HTMLSelectElement).value as PopupPlacement
						})}
					>
						{placements.map(value => <option key={value} value={value}>{value}</option>)}
					</select>
				</label>
				<label class="grid gap-1">
					<span class="text-muted-foreground">Direction</span>
					<select
						id="popover-direction-select"
						class="rounded-md edge bg-background px-2 py-1"
						set:value={direction}
						set:onchange={(event: Event) => this.next(() => {
							direction = (event.currentTarget as HTMLSelectElement).value as Direction
						})}
					>
						<option value="ltr">ltr</option>
						<option value="rtl">rtl</option>
					</select>
				</label>
			</div>
			<div class="flex min-h-40 items-center justify-center">
				<Popover label="Placement probe" placement={placement} gap={8}>
					<PopoverTrigger class={triggerClass} id="placement-matrix-trigger">
						{placement}
					</PopoverTrigger>
					<PopoverContent class="w-40 text-sm" data-test="placement-matrix-content">
						Logical placement probe
					</PopoverContent>
				</Popover>
			</div>
		</div>
	)
}

export const Basic: Story<typeof Popover> = {
	render: args => (
		<Popover label={args.title} description={args.description} placement={args.placement}>
			<PopoverTrigger class={triggerClass} id="basic-popover-trigger">
				Open Popover
			</PopoverTrigger>
			<PopoverContent />
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#basic-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		if (!trigger || !content) throw new Error('Basic popover trigger or content was not rendered')
		if (!content.id || trigger.getAttribute('aria-controls') !== content.id) {
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

export const PlacementMatrix: Story = {
	argTypes: fixed,
	render: () => <PlacementMatrixExample />,
	play: async ({ canvas }) => {
		const matrix = canvas.querySelector<HTMLElement>('#popover-placement-matrix')
		const placementSelect = canvas.querySelector<HTMLSelectElement>('#popover-placement-select')
		const directionSelect = canvas.querySelector<HTMLSelectElement>('#popover-direction-select')
		const trigger = canvas.querySelector<HTMLButtonElement>('#placement-matrix-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-test="placement-matrix-content"]')
		if (!matrix || !placementSelect || !directionSelect || !trigger || !content) {
			throw new Error('Placement matrix controls, trigger, or content were not rendered')
		}

		const run = async (requested: PopupPlacement, direction: Direction) => {
			if (directionSelect.value !== direction) {
				change(directionSelect, direction)
				await until(
					() => matrix.dir === direction && getComputedStyle(trigger).direction === direction,
					`Placement matrix did not switch to ${direction}`,
				)
			}
			change(placementSelect, requested)
			await until(() => trigger.textContent?.trim() === requested, `Placement matrix did not render ${requested}`)

			trigger.click()
			await until(
				() => content.matches(':popover-open') && Boolean(content.dataset.placement),
				`${direction} ${requested} did not open with a committed placement`,
			)

			const resolved = content.dataset.placement as PopupPlacement
			if (requested === 'auto') {
				if (resolved === 'auto' || !placements.includes(resolved)) {
					throw new Error(`Automatic placement produced invalid data-placement=${resolved}`)
				}
			} else if (resolved !== requested) {
				throw new Error(`${direction} ${requested} unexpectedly resolved to ${resolved}`)
			}
			assertAttached(trigger, content, direction, `${direction} ${requested}`)

			if (direction === 'rtl' && (requested === 'bottom-start' || requested === 'bottom-end')) {
				const expected = requested === 'bottom-start' ? '100% 0%' : '0% 0%'
				if (!content.style.transformOrigin.startsWith(expected)) {
					throw new Error(`${requested} expected RTL transform-origin ${expected}, received ${content.style.transformOrigin}`)
				}
			}

			trigger.click()
			await until(
				() => !content.matches(':popover-open') && trigger.getAttribute('aria-expanded') === 'false',
				`${direction} ${requested} did not close cleanly`,
			)
		}

		for (const placement of placements) await run(placement, 'ltr')
		await run('bottom-start', 'rtl')
		await run('bottom-end', 'rtl')
	},
}

export const HoverBasic: Story<typeof Popover> = {
	args: { placement: 'bottom' },
	argTypes: { ...fixed, placement: { control: 'radio', options: ['top', 'right', 'bottom', 'left'] } },
	render: args => (
		<Popover label="Next.js profile" openOn="hover" openDelay={0} closeDelay={80} placement={args.placement}>
			<PopoverTrigger
				as="a"
				class={buttonVariants({ size: 'none', variant: 'link' })}
				href="https://nextjs.org"
				id="basic-hover-popover-trigger"
			>
				@nextjs
			</PopoverTrigger>
			<PopoverContent class={`${hoverContentClass} w-80`}>
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

		if (trigger.getAttribute('aria-controls') !== content.id ||
			trigger.getAttribute('aria-expanded') !== 'true' ||
			trigger.getAttribute('aria-haspopup') !== 'dialog') {
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

		if (content.matches(':popover-open') || trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Hover-mode Popover did not close after hover left and closeDelay elapsed')
		}
	},
}

export const WithForm: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<Popover label="Dimensions form" description="Set the dimensions for the layer." placement="bottom-start">
			<PopoverTrigger class={triggerClass} id="form-popover-trigger">
				Open Popover
			</PopoverTrigger>
			<PopoverContent class="w-64">
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
			<Popover label="Start aligned popover" placement="bottom-start">
				<PopoverTrigger class={buttonVariants({ variant: 'outline', size: 'sm' })} id="popover-start-trigger">
					Start
				</PopoverTrigger>
				<PopoverContent class="w-40" data-test="popover-start-content">
					Aligned to start
				</PopoverContent>
			</Popover>
			<Popover label="Center aligned popover" placement="bottom">
				<PopoverTrigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
					Center
				</PopoverTrigger>
				<PopoverContent class="w-40">
					Aligned to center
				</PopoverContent>
			</Popover>
			<Popover label="End aligned popover" placement="bottom-end">
				<PopoverTrigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
					End
				</PopoverTrigger>
				<PopoverContent class="w-40">
					Aligned to end
				</PopoverContent>
			</Popover>
		</div>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#popover-start-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-test="popover-start-content"]')
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
				<Popover key={side} label={`${side} hover popover`} openOn="hover" openDelay={0} closeDelay={60} placement={side}>
					<PopoverTrigger class={buttonVariants({ variant: 'outline', size: 'sm', class: 'capitalize' })} id={`hover-popover-${side}-trigger`}>
						{side}
					</PopoverTrigger>
					<PopoverContent class={hoverContentClass} data-test={`hover-popover-${side}-content`}>
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
		const content = canvas.querySelector<HTMLElement>('[data-test="hover-popover-left-content"]')
		if (!trigger || !content) throw new Error('Left hover popover trigger or content was not rendered')

		hover(trigger)
		await wait()

		if (!content.matches(':popover-open') || content.dataset.side !== 'left') {
			throw new Error('Hover-mode Popover side preference was not applied')
		}
	},
}

export const HoverDelays: Story<typeof Popover> = {
	argTypes: hoverFixed,
	render: () => (
		<Popover label="Delayed hover popover" openOn="hover" openDelay={80} closeDelay={120}>
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
		<Popover label="Keyboard hover popover" openOn="hover" openDelay={0} closeDelay={0}>
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
		<Popover label="Explicitly anchored popover" placement="bottom">
			<div class="grid justify-items-center gap-3">
				<DraggableAnchor />
				<PopoverTrigger class={buttonVariants({ variant: 'secondary', size: 'sm' })} id="anchor-popover-trigger">
					Show anchored content
				</PopoverTrigger>
			</div>
			<PopoverContent class="w-52">
				Content is positioned from the explicit anchor.
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#anchor-popover-trigger')
		const marker = canvas.querySelector<HTMLElement>('#anchor-popover-marker')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
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
		if (side(content) !== 'bottom') {
			throw new Error('Anchored popover did not return to the preferred side near center')
		}
		assertInsideViewport(content, 'Centered anchored')
	},
}

export const AdaptiveGeometry: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<div
			id="adaptive-popover-shell"
			style="position:relative;width:420px;height:240px;box-sizing:border-box;overflow:hidden;transform:translate(16px,12px);border:1px solid currentColor;border-radius:12px"
		>
			<div
				id="adaptive-popover-scroller"
				style="width:360px;height:190px;overflow:auto;border:1px dashed currentColor"
			>
				<div style="width:720px;height:520px">
					<div id="adaptive-popover-spacer" style="height:56px" />
					<Popover label="Adaptive geometry popover" placement="bottom-start" gap={8}>
						<PopoverTrigger
							class={triggerClass}
							id="adaptive-popover-trigger"
							style="margin-left:260px;width:96px"
						>
							Adaptive anchor
						</PopoverTrigger>
						<PopoverContent data-test="adaptive-popover-content" style="width:220px">
							Top-layer content escapes nested clipping and follows live geometry.
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const shell = canvas.querySelector<HTMLElement>('#adaptive-popover-shell')
		const scroller = canvas.querySelector<HTMLElement>('#adaptive-popover-scroller')
		const spacer = canvas.querySelector<HTMLElement>('#adaptive-popover-spacer')
		const trigger = canvas.querySelector<HTMLButtonElement>('#adaptive-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-test="adaptive-popover-content"]')
		if (!shell || !scroller || !spacer || !trigger || !content) {
			throw new Error('Adaptive popover shell, scroller, spacer, trigger, or content was not rendered')
		}

		trigger.click()
		await until(
			() => content.matches(':popover-open') && content.dataset.placement === 'bottom-start',
			'Adaptive popover did not open at bottom-start',
		)
		if (getComputedStyle(shell).transform === 'none' || getComputedStyle(shell).overflow !== 'hidden') {
			throw new Error('Adaptive fixture lost its transformed clipping ancestor')
		}
		assertAttached(trigger, content, 'ltr', 'Initial adaptive')
		assertInsideViewport(content, 'Initial adaptive')
		assertPaintedOutside(content, shell, 'Initial adaptive')

		const initial = content.getBoundingClientRect()
		scroller.scrollLeft = 32
		scroller.scrollTop = 20
		await until(
			() => Math.abs(content.getBoundingClientRect().left - initial.left) > 20,
			'Adaptive popover did not follow ancestor scroll',
		)
		assertAttached(trigger, content, 'ltr', 'Scrolled adaptive')

		trigger.style.width = '160px'
		await until(() => {
			const width = Number.parseFloat(content.style.getPropertyValue('--reference-width'))
			return Math.abs(width - trigger.getBoundingClientRect().width) < 1
		}, 'Adaptive popover did not publish resized reference width')
		assertAttached(trigger, content, 'ltr', 'Resized adaptive')

		const beforeShift = content.getBoundingClientRect().top
		spacer.style.height = '96px'
		await until(() => {
			const referenceRect = trigger.getBoundingClientRect()
			const contentRect = content.getBoundingClientRect()
			return Math.abs(contentRect.top - beforeShift) > 24 &&
				Math.abs(contentRect.left - referenceRect.left) < 3 &&
				contentRect.top >= referenceRect.bottom
		}, 'Adaptive popover did not follow a layout shift')
		assertAttached(trigger, content, 'ltr', 'Shifted adaptive')
		assertPaintedOutside(content, shell, 'Shifted adaptive')

		scroller.scrollTop = 450
		await until(
			() => !content.matches(':popover-open') && trigger.getAttribute('aria-expanded') === 'false',
			'Adaptive popover did not close after its reference became fully clipped',
		)
		if (content.dataset.referenceHidden !== 'true') {
			throw new Error('Adaptive popover did not publish data-reference-hidden before closing')
		}
	},
}

export const NarrowViewportLargeContent: Story<typeof Popover> = {
	argTypes: fixed,
	parameters: {
		docs: { description: 'Constrains oversized rich content to a 320x480 viewport and keeps it scrollable inside the collision padding.' },
		viewport: { width: 320, height: 480 },
	},
	render: () => (
		<Popover label="Oversized content" description="The surface is constrained by Floating UI size middleware." placement="bottom" gap={8}>
			<PopoverTrigger class={triggerClass} id="narrow-popover-trigger">
				Open oversized content
			</PopoverTrigger>
			<PopoverContent
				data-test="narrow-popover-content"
				style="width:640px;height:720px;overflow:auto"
			>
				<div style="width:600px;height:700px">
					Oversized content remains reachable by scrolling without letting the popup escape the viewport.
				</div>
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#narrow-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-test="narrow-popover-content"]')
		if (!trigger || !content) throw new Error('Narrow viewport Popover trigger or content was not rendered')

		const viewportWidth = document.documentElement.clientWidth
		const viewportHeight = document.documentElement.clientHeight
		if (viewportWidth !== 320 || viewportHeight !== 480) {
			throw new Error(`Narrow viewport story ran at ${viewportWidth}x${viewportHeight} instead of 320x480`)
		}

		trigger.click()
		await until(
			() => content.matches(':popover-open') && Boolean(content.style.maxWidth) && Boolean(content.style.maxHeight),
			'Narrow viewport Popover never committed size constraints',
		)

		const maxWidth = Number.parseFloat(content.style.maxWidth)
		const maxHeight = Number.parseFloat(content.style.maxHeight)
		const availableWidth = Number.parseFloat(content.style.getPropertyValue('--available-width'))
		const availableHeight = Number.parseFloat(content.style.getPropertyValue('--available-height'))
		if (![maxWidth, maxHeight, availableWidth, availableHeight].every(Number.isFinite)) {
			throw new Error('Narrow viewport Popover did not publish finite size outputs')
		}
		if (Math.abs(maxWidth - availableWidth) > 1 || Math.abs(maxHeight - availableHeight) > 1) {
			throw new Error('Narrow viewport Popover max dimensions disagree with its available-size variables')
		}
		if (maxWidth > viewportWidth - 16 + 1 || maxHeight > viewportHeight - 16 + 1) {
			throw new Error(`Narrow viewport Popover exceeded its 8px collision padding: ${maxWidth}x${maxHeight}`)
		}
		if (content.style.boxSizing !== 'border-box') {
			throw new Error('Narrow viewport Popover size constraints are not border-box')
		}

		const rect = content.getBoundingClientRect()
		const tolerance = 2
		if (
			rect.left < 8 - tolerance ||
			rect.top < 8 - tolerance ||
			rect.right > viewportWidth - 8 + tolerance ||
			rect.bottom > viewportHeight - 8 + tolerance
		) {
			throw new Error(`Narrow viewport Popover escaped collision padding: ${rect.left.toFixed(1)},${rect.top.toFixed(1)} ${rect.right.toFixed(1)}x${rect.bottom.toFixed(1)}`)
		}
		if (content.scrollWidth <= content.clientWidth || content.scrollHeight <= content.clientHeight) {
			throw new Error('Narrow viewport Popover did not retain scroll access to oversized content')
		}
		content.scrollTo({ left: 48, top: 64 })
		await wait()
		if (content.scrollLeft < 1 || content.scrollTop < 1) {
			throw new Error('Narrow viewport Popover could not scroll its oversized content')
		}

		trigger.click()
		await until(
			() => !content.matches(':popover-open') && trigger.getAttribute('aria-expanded') === 'false',
			'Narrow viewport Popover did not cleanly close after its geometry assertions',
		)
	},
}

export const WithArrow: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<Popover label="Anchored caret" description="The caret tracks the trigger center on the near edge." placement="bottom" gap={8}>
			<PopoverTrigger class={triggerClass} id="arrow-popover-trigger">
				Open with arrow
			</PopoverTrigger>
			<PopoverContent arrow class="w-64" data-test="arrow-popover-content" />
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#arrow-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		const surface = canvas.querySelector<HTMLElement>('[data-slot="popup-surface"]')
		const arrow = canvas.querySelector<HTMLElement>('[data-slot="popup-arrow"]')
		if (!trigger || !content || !surface || !arrow) throw new Error('Arrow popover trigger, content, surface, or arrow was not rendered')

		trigger.click()
		await wait()

		if (!content.matches(':popover-open') || side(content) !== 'bottom') {
			throw new Error('Arrow popover did not open on the bottom side')
		}

		if (Math.abs(centerX(arrow.getBoundingClientRect()) - centerX(trigger.getBoundingClientRect())) > 3) {
			throw new Error('Arrow is not horizontally centered on the trigger')
		}

		assertArrowOnEdge(arrow, content, 'top', 'Bottom-side')
		assertArrowSurface(content, surface, 'Bottom-side')

		if (arrow.hasAttribute('data-arrow-uncentered')) {
			throw new Error('Centered arrow was flagged data-arrow-uncentered')
		}
	},
}

export const ArrowSides: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<div class="grid grid-cols-2 gap-24 p-24">
			{hoverSides.map(placement => (
				<Popover key={placement} label={`${placement} caret`} placement={placement} gap={8}>
					<PopoverTrigger class={triggerClass} id={`arrow-${placement}-trigger`}>
						{placement}
					</PopoverTrigger>
					<PopoverContent arrow class="w-40" data-test={`arrow-${placement}-content`} />
				</Popover>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const edge = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const

		for (const placement of hoverSides) {
			const trigger = canvas.querySelector<HTMLButtonElement>(`#arrow-${placement}-trigger`)
			const content = canvas.querySelector<HTMLElement>(`[data-test="arrow-${placement}-content"]`)
			const surface = content?.querySelector<HTMLElement>('[data-slot="popup-surface"]')
			const arrow = content?.querySelector<HTMLElement>('[data-slot="popup-arrow"]')
			if (!trigger || !content || !surface || !arrow) {
				throw new Error(`${placement} arrow fixture was not rendered`)
			}

			trigger.click()
			await wait()
			if (!content.matches(':popover-open') || content.dataset.side !== placement) {
				throw new Error(`${placement} arrow did not retain its requested side`)
			}

			const arrowRect = arrow.getBoundingClientRect()
			const triggerRect = trigger.getBoundingClientRect()
			const centerDelta = placement === 'top' || placement === 'bottom'
				? centerX(arrowRect) - centerX(triggerRect)
				: centerY(arrowRect) - centerY(triggerRect)
			if (Math.abs(centerDelta) > 3 || arrow.hasAttribute('data-arrow-uncentered')) {
				throw new Error(`${placement} arrow marker is not centered on its trigger`)
			}

			assertArrowOnEdge(arrow, content, edge[placement], `${placement} side`)
			assertArrowSurface(content, surface, `${placement} side`)
			trigger.click()
			await wait()
		}
	},
}

export const ArrowFlip: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<Popover label="Flipped caret" description="The content flips above; the caret stays on the anchor side." placement="bottom" gap={8}>
			<PopoverTrigger
				class={triggerClass}
				id="flip-arrow-popover-trigger"
				style="position:fixed;bottom:8px;left:50%;transform:translateX(-50%)"
			>
				Near the bottom edge
			</PopoverTrigger>
			<PopoverContent arrow class="w-64" />
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#flip-arrow-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		const surface = canvas.querySelector<HTMLElement>('[data-slot="popup-surface"]')
		const arrow = canvas.querySelector<HTMLElement>('[data-slot="popup-arrow"]')
		if (!trigger || !content || !surface || !arrow) throw new Error('Flip arrow popover trigger, content, surface, or arrow was not rendered')

		trigger.click()
		await wait()

		if (!content.matches(':popover-open') || side(content) !== 'top') {
			throw new Error('Arrow popover did not flip to the top side')
		}

		if (Math.abs(centerX(arrow.getBoundingClientRect()) - centerX(trigger.getBoundingClientRect())) > 3) {
			throw new Error('Flipped arrow is not horizontally centered on the trigger')
		}

		assertArrowOnEdge(arrow, content, 'bottom', 'Flipped')
		assertArrowSurface(content, surface, 'Flipped')
	},
}

export const ArrowUncentered: Story<typeof Popover> = {
	argTypes: fixed,
	render: () => (
		<Popover label="Clamped caret" description="The caret clamps inside the content and flags data-arrow-uncentered." placement="bottom" gap={8}>
			<PopoverTrigger
				aria-label="Corner trigger"
				class={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
				id="uncentered-arrow-popover-trigger"
				style="position:fixed;left:0px;top:8px"
			>
				<span class="i-lucide-crosshair size-4" />
			</PopoverTrigger>
			<PopoverContent arrow class="w-64" />
		</Popover>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#uncentered-arrow-popover-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="popover-content"]')
		const surface = canvas.querySelector<HTMLElement>('[data-slot="popup-surface"]')
		const arrow = canvas.querySelector<HTMLElement>('[data-slot="popup-arrow"]')
		if (!trigger || !content || !surface || !arrow) throw new Error('Uncentered arrow popover trigger, content, surface, or arrow was not rendered')

		trigger.click()
		await wait()

		if (!content.matches(':popover-open') || side(content) !== 'bottom') {
			throw new Error('Uncentered arrow popover did not open on the bottom side')
		}

		if (!arrow.hasAttribute('data-arrow-uncentered')) {
			throw new Error('Clamped arrow was not flagged data-arrow-uncentered')
		}

		const arrowRect = arrow.getBoundingClientRect()
		const surfaceRect = surface.getBoundingClientRect()

		if (centerX(arrowRect) <= centerX(trigger.getBoundingClientRect())) {
			throw new Error('Clamped arrow was not displaced away from the trigger center')
		}

		if (arrowRect.left < surfaceRect.left || arrowRect.right > surfaceRect.right) {
			throw new Error('Clamped arrow escaped the surface bounds')
		}

		assertArrowOnEdge(arrow, content, 'top', 'Clamped')
		assertArrowSurface(content, surface, 'Clamped')
	},
}
