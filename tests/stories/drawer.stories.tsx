/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Args, Meta, Story } from './app'
import Button, { buttonVariants } from '/src/ui/button'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
	type DrawerSide,
} from '/src/ui/drawer'
import Input from '/src/ui/input'
import Label from '/src/ui/label'

export default {
	title: 'UI/Drawer',
	component: Drawer,
	args: {
		defaultOpen: false,
		modal: true,
		side: 'right',
		showCloseButton: true,
		trigger: 'Open',
		title: 'Edit profile',
		description: "Make changes to your profile here. Click save when you're done.",
	},
	argTypes: {
		side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
	},
	parameters: {
		docs: { description: 'Native HTMLDialogElement drawer for complementary content, with Ajo Kit side variants and Dialog-based focus/state behavior.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Drawer>

const sides: DrawerSide[] = ['top', 'right', 'bottom', 'left']
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const settle = async (element: Element) => {
	const animations = element.getAnimations().filter(animation => animation.playState !== 'finished')
	if (!animations.length) {
		await frame()
		return
	}

	await Promise.all(animations.map(animation => animation.finished.catch(() => undefined)))
	await frame()
}

const closeButton = (drawer: HTMLDialogElement) => {
	const close = drawer.querySelector<HTMLButtonElement>('[data-slot="drawer-close"][aria-label="Close"]')
	if (!close) throw new Error('Drawer default close button was not rendered')
	return close
}

const assertCloseButton = (drawer: HTMLDialogElement) => {
	const close = closeButton(drawer)
	const icon = close.querySelector<HTMLElement>('[aria-hidden="true"]')
	const closeRect = close.getBoundingClientRect()
	const iconRect = icon?.getBoundingClientRect()

	if (closeRect.width < 24 || closeRect.height < 24 || !iconRect || iconRect.width < 12 || iconRect.height < 12) {
		throw new Error('Drawer default close button or icon has no clickable box')
	}

	return close
}

const assertTransition = (drawer: HTMLDialogElement) => {
	if (reducedMotion()) return
	const properties = getComputedStyle(drawer).transitionProperty.split(',').map(item => item.trim())
	if (!properties.includes('transform')) {
		throw new Error(`Drawer transition-property did not include transform; got ${properties.join(', ')}`)
	}
}

const assertVisualChrome = (drawer: HTMLDialogElement, side: DrawerSide) => {
	const style = getComputedStyle(drawer)
	const backdrop = getComputedStyle(drawer, '::backdrop')
	const borders = {
		top: style.borderTopWidth,
		right: style.borderRightWidth,
		bottom: style.borderBottomWidth,
		left: style.borderLeftWidth,
	}

	const expected = {
		top: side === 'bottom' ? '1px' : '0px',
		right: side === 'left' ? '1px' : '0px',
		bottom: side === 'top' ? '1px' : '0px',
		left: side === 'right' ? '1px' : '0px',
	}

	if (
		borders.top !== expected.top ||
		borders.right !== expected.right ||
		borders.bottom !== expected.bottom ||
		borders.left !== expected.left
	) {
		throw new Error(`Drawer side ${side} drew borders on viewport edges`)
	}

	const innerColor = side === 'right'
		? style.borderLeftColor
		: side === 'left'
			? style.borderRightColor
			: side === 'top'
				? style.borderBottomColor
				: style.borderTopColor

	if (innerColor === style.color) {
		throw new Error(`Drawer side ${side} used foreground color for its border`)
	}

	if (backdrop.backdropFilter === 'none') {
		throw new Error(`Drawer side ${side} did not blur the backdrop`)
	}
}

const assertSide = (drawer: HTMLDialogElement, side: DrawerSide) => {
	const rect = drawer.getBoundingClientRect()
	const width = document.documentElement.clientWidth
	const height = document.documentElement.clientHeight
	const tolerance = 2

	if (side === 'right' && (
		Math.abs(rect.right - width) > tolerance ||
		Math.abs(rect.top) > tolerance ||
		Math.abs(rect.bottom - height) > tolerance
	)) {
		throw new Error('Right drawer was not full-height and anchored to the right viewport edge')
	}

	if (side === 'left' && (
		Math.abs(rect.left) > tolerance ||
		Math.abs(rect.top) > tolerance ||
		Math.abs(rect.bottom - height) > tolerance
	)) {
		throw new Error('Left drawer was not full-height and anchored to the left viewport edge')
	}

	if (side === 'top' && (Math.abs(rect.top) > tolerance || rect.height >= height * 0.9)) {
		throw new Error('Top drawer was not anchored to the top edge with content height')
	}

	if (side === 'bottom' && (Math.abs(rect.bottom - height) > tolerance || rect.height >= height * 0.9)) {
		throw new Error('Bottom drawer was not anchored to the bottom edge with content height')
	}
}

const drag = (handle: HTMLElement, fromY: number, toY: number) => {
	handle.dispatchEvent(new PointerEvent('pointerdown', {
		bubbles: true,
		button: 0,
		buttons: 1,
		clientX: 200,
		clientY: fromY,
		isPrimary: true,
		pointerId: 1,
		pointerType: 'mouse',
	}))
	handle.dispatchEvent(new PointerEvent('pointermove', {
		bubbles: true,
		buttons: 1,
		clientX: 200,
		clientY: toY,
		isPrimary: true,
		pointerId: 1,
		pointerType: 'mouse',
	}))
	handle.dispatchEvent(new PointerEvent('pointerup', {
		bubbles: true,
		button: 0,
		buttons: 0,
		clientX: 200,
		clientY: toY,
		isPrimary: true,
		pointerId: 1,
		pointerType: 'mouse',
	}))
}

const ProfileFields = () => (
	<div class="grid flex-1 auto-rows-min gap-6 px-4">
		<div class="grid gap-3">
			<Label for="drawer-demo-name">Name</Label>
			<Input id="drawer-demo-name" value="Pedro Duarte" />
		</div>
		<div class="grid gap-3">
			<Label for="drawer-demo-username">Username</Label>
			<Input id="drawer-demo-username" value="@peduarte" />
		</div>
	</div>
)

const ProfileContent = ({ description, showCloseButton = true, title }: Args) => (
	<DrawerContent showCloseButton={showCloseButton}>
		<DrawerHeader>
			<DrawerTitle>{title}</DrawerTitle>
			<DrawerDescription>{description}</DrawerDescription>
		</DrawerHeader>
		<ProfileFields />
		<DrawerFooter>
			<Button type="submit">Save changes</Button>
			<DrawerClose class={buttonVariants({ variant: 'outline' })}>Close</DrawerClose>
		</DrawerFooter>
	</DrawerContent>
)

const NavigationContent = () => (
	<>
		<DrawerHeader>
			<DrawerTitle>Navigation</DrawerTitle>
			<DrawerDescription>Choose where this drawer should appear.</DrawerDescription>
		</DrawerHeader>
		<div class="grid gap-2 px-4 pb-4">
			<a class="rounded-md edge p-3 text-sm" href="#overview">Overview</a>
			<a class="rounded-md edge p-3 text-sm" href="#settings">Settings</a>
			<a class="rounded-md edge p-3 text-sm" href="#members">Members</a>
		</div>
		<DrawerFooter>
			<DrawerClose class={buttonVariants({ variant: 'outline' })}>Close</DrawerClose>
		</DrawerFooter>
	</>
)

const ControlledExample: Stateful<Args> = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	for (const { defaultOpen: _defaultOpen, description, showCloseButton, side, title, trigger, ...args } of this) yield (
		<div class="grid gap-3">
			<Button type="button" variant="outline" set:onclick={() => setOpen(true)}>{trigger}</Button>
			<p class="text-sm text-muted-foreground">Open: {open ? 'yes' : 'no'}</p>
			<Drawer {...args} side={side} open={open} onOpenChange={setOpen}>
				<ProfileContent showCloseButton={showCloseButton} title={title} description={description} />
			</Drawer>
		</div>
	)
}

export const Basic: Story<typeof Drawer> = {
	render: ({ description, showCloseButton, side, title, trigger, ...args }) => (
		<Drawer {...args} side={side}>
			<DrawerTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</DrawerTrigger>
			<ProfileContent showCloseButton={showCloseButton} title={title} description={description} />
		</Drawer>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]')
		const drawer = canvas.querySelector<HTMLDialogElement>('[data-slot="drawer-content"]')
		if (!trigger || !drawer) throw new Error('Drawer trigger or content was not rendered')
		if (drawer.open || getComputedStyle(drawer).display !== 'none') {
			throw new Error('Drawer did not start closed and hidden')
		}

		trigger.click()
		await frame()

		if (!drawer.open || trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Drawer did not open after trigger click')
		}

		if (
			drawer.dataset.side !== 'right' ||
			drawer.dataset.state !== 'open' ||
			!drawer.getAttribute('aria-labelledby') ||
			!drawer.querySelector('[data-slot="drawer-title"]')
		) {
			throw new Error('Drawer did not render default side, open state, or accessible title')
		}

		assertTransition(drawer)
		assertVisualChrome(drawer, 'right')
		await settle(drawer)
		assertSide(drawer, 'right')

		const close = assertCloseButton(drawer)
		close.click()
		await frame()

		if (drawer.open || trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Drawer did not close')
		}
	},
}

export const Sides: Story<typeof Drawer> = {
	argTypes: {
		defaultOpen: { control: false },
		side: { control: false },
		trigger: { control: false },
	},
	render: ({ defaultOpen: _defaultOpen, description, showCloseButton, side: _side, title, trigger: _trigger, ...args }) => (
		<div class="grid grid-cols-2 gap-2">
			{sides.map(side => (
				<Drawer key={side} {...args} side={side}>
					<DrawerTrigger class={buttonVariants({ variant: 'outline' })}>
						{side}
					</DrawerTrigger>
					<ProfileContent showCloseButton={showCloseButton} title={title} description={description} />
				</Drawer>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		for (const side of sides) {
			const trigger = Array.from(canvas.querySelectorAll<HTMLButtonElement>('[data-slot="drawer-trigger"]'))
				.find(button => button.textContent?.trim() === side)
			if (!trigger) throw new Error(`Drawer trigger for ${side} was not rendered`)

			trigger.click()
			await frame()

			const drawer = canvas.querySelector<HTMLDialogElement>(`[data-slot="drawer-content"][data-side="${side}"]`)
			if (!drawer?.open) throw new Error(`Drawer side ${side} did not open`)

			assertTransition(drawer)
			assertVisualChrome(drawer, side)
			await settle(drawer)
			assertSide(drawer, side)

			const close = assertCloseButton(drawer)
			close.click()
			await frame()
		}
	},
}

export const Controlled: Story<typeof Drawer> = {
	args: {
		trigger: 'Open controlled drawer',
	},
	argTypes: {
		defaultOpen: { control: false },
	},
	render: args => <ControlledExample {...args} />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('button[data-slot="button"]')
		const drawer = canvas.querySelector<HTMLDialogElement>('[data-slot="drawer-content"]')
		if (!trigger || !drawer) throw new Error('Controlled Drawer trigger or content was not rendered')

		if (drawer.open || !canvas.textContent?.includes('Open: no')) {
			throw new Error('Controlled Drawer did not start closed')
		}

		trigger.click()
		await frame()

		if (!drawer.open || !canvas.textContent?.includes('Open: yes')) {
			throw new Error('Controlled Drawer did not open')
		}

		const close = canvas.querySelector<HTMLButtonElement>('[data-slot="drawer-close"]')
		if (!close) throw new Error('Controlled Drawer close button was not rendered')
		close.click()
		await frame()

		if (drawer.open || !canvas.textContent?.includes('Open: no')) {
			throw new Error('Controlled Drawer did not close')
		}
	},
}

export const NoCloseButton: Story<typeof Drawer> = {
	args: {
		trigger: 'Open notifications',
		title: 'Notifications',
		description: 'Review updates from this workspace.',
		showCloseButton: false,
	},
	render: ({ description, showCloseButton, side, title, trigger, ...args }) => (
		<Drawer {...args} side={side}>
			<DrawerTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</DrawerTrigger>
			<DrawerContent showCloseButton={showCloseButton}>
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					<DrawerDescription>{description}</DrawerDescription>
				</DrawerHeader>
				<div class="grid gap-3 px-4">
					<p class="rounded-md edge bg-muted p-3 text-sm">Build finished successfully.</p>
					<p class="rounded-md edge bg-muted p-3 text-sm">Two people requested access.</p>
				</div>
				<DrawerFooter>
					<DrawerClose class={buttonVariants({ variant: 'outline' })}>Done</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]')
		const drawer = canvas.querySelector<HTMLDialogElement>('[data-slot="drawer-content"]')
		if (!trigger || !drawer) throw new Error('No close button Drawer trigger or content was not rendered')
		if (drawer.open || getComputedStyle(drawer).display !== 'none') {
			throw new Error('No close button Drawer did not start closed and hidden')
		}

		trigger.click()
		await frame()

		const closes = drawer.querySelectorAll('[data-slot="drawer-close"]')
		if (!drawer.open) throw new Error('Drawer did not open from trigger')
		if (closes.length !== 1) throw new Error('Drawer rendered an unexpected default close button')

		const close = closes[0] as HTMLButtonElement | undefined
		if (!close) throw new Error('Drawer footer close button was not rendered')
		close.click()
		await frame()

		if (drawer.open) throw new Error('Drawer did not close after smoke')
	},
}

export const NoHandleByDefault: Story<typeof Drawer> = {
	argTypes: { side: { control: false } },
	render: () => (
		<Drawer>
			<DrawerTrigger class={buttonVariants({ variant: 'outline' })}>
				Open default drawer
			</DrawerTrigger>
			<DrawerContent>
				<NavigationContent />
			</DrawerContent>
		</Drawer>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]')
		const drawer = canvas.querySelector<HTMLDialogElement>('[data-slot="drawer-content"]')
		if (!trigger || !drawer) throw new Error('Default Drawer trigger or content was not rendered')
		if (canvas.querySelector('[data-slot="drawer-handle"]')) {
			throw new Error('Drawer rendered a drag handle by default')
		}

		trigger.click()
		await frame()

		if (!drawer.open || drawer.dataset.side !== 'right') {
			throw new Error('Default Drawer did not open on the right side')
		}
		if (drawer.querySelector('[data-slot="drawer-handle"]')) {
			throw new Error('Drawer rendered a drag handle after opening without handle=true')
		}

		const close = closeButton(drawer)
		close.click()
		await frame()

		if (drawer.open) throw new Error('Default Drawer did not close after smoke')
	},
}

export const DragHandle: Story<typeof Drawer> = {
	argTypes: { side: { control: false } },
	render: () => (
		<Drawer side="bottom">
			<DrawerTrigger class={buttonVariants({ variant: 'outline' })}>
				Open draggable drawer
			</DrawerTrigger>
			<DrawerContent handle>
				<NavigationContent />
			</DrawerContent>
		</Drawer>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]')
		const drawer = canvas.querySelector<HTMLDialogElement>('[data-slot="drawer-content"]')
		const handle = canvas.querySelector<HTMLElement>('[data-slot="drawer-handle"]')
		if (!trigger || !drawer || !handle) throw new Error('Drawer handle trigger, content, or handle was not rendered')
		if (drawer.open || getComputedStyle(drawer).display !== 'none') {
			throw new Error('Drawer handle story did not start closed and hidden')
		}

		trigger.click()
		await frame()

		if (!drawer.open || drawer.dataset.side !== 'bottom') {
			throw new Error('Drawer handle story did not open on the bottom side')
		}
		const handleRect = handle.getBoundingClientRect()
		if (getComputedStyle(handle).display === 'none' || handleRect.width < 90 || handleRect.height < 6) {
			throw new Error('Drawer handle was not visibly laid out')
		}

		drag(handle, 100, 140)
		await frame()

		if (!drawer.open) throw new Error('Drawer closed after a below-threshold drag')
		if (drawer.style.transform || drawer.style.transition || drawer.style.willChange) {
			throw new Error('Drawer drag reset did not clear inline motion styles')
		}

		await settle(drawer)
		if (!reducedMotion() && getComputedStyle(drawer).transform !== 'none') {
			throw new Error('Drawer did not settle back to its open transform after below-threshold drag')
		}

		drag(handle, 100, 190)
		await frame()

		if (drawer.open) throw new Error('Drawer did not close after dragging the handle')
	},
}
