/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Args, Meta, Story } from './app'
import Button, { buttonVariants } from '/src/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '/src/ui/dialog'
import Input from '/src/ui/input'
import Label from '/src/ui/label'

export default {
	title: 'UI/Dialog',
	component: Dialog,
	args: {
		defaultOpen: false,
		modal: true,
		trigger: 'Open Dialog',
		title: 'Edit profile',
		description: "Make changes to your profile here. Click save when you're done.",
		showCloseButton: true,
	},
	parameters: {
		docs: { description: 'Native HTMLDialogElement dialog with Ajo Kit composition, accessible title/description, Escape handling, and controlled/uncontrolled state.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Dialog>

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

const DemoForm = ({ description, title }: Args) => (
	<>
		<DialogHeader>
			<DialogTitle>{title}</DialogTitle>
			<DialogDescription>{description}</DialogDescription>
		</DialogHeader>
		<div class="grid gap-4">
			<div class="grid gap-3">
				<Label for="dialog-name">Name</Label>
				<Input id="dialog-name" name="name" value="Pedro Duarte" />
			</div>
			<div class="grid gap-3">
				<Label for="dialog-username">Username</Label>
				<Input id="dialog-username" name="username" value="@peduarte" />
			</div>
		</div>
		<DialogFooter>
			<DialogClose class={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
			<Button type="submit">Save changes</Button>
		</DialogFooter>
	</>
)

const ControlledExample: Stateful<Args> = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	for (const { defaultOpen: _defaultOpen, description, showCloseButton, title, trigger, ...args } of this) yield (
		<div class="grid gap-3">
			<Button type="button" variant="outline" set:onclick={() => setOpen(true)}>{trigger}</Button>
			<p class="text-sm text-muted-foreground">Open: {open ? 'yes' : 'no'}</p>
			<Dialog {...args} open={open} onOpenChange={setOpen}>
				<DialogContent showCloseButton={showCloseButton}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<DialogFooter showCloseButton>
						<Button type="button" set:onclick={() => setOpen(false)}>Done</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export const Basic: Story<typeof Dialog> = {
	render: ({ description, showCloseButton, title, trigger, ...args }) => (
		<Dialog {...args}>
			<DialogTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</DialogTrigger>
			<DialogContent class="sm:max-w-[425px]" showCloseButton={showCloseButton}>
				<form class="grid gap-4">
					<DemoForm title={title} description={description} />
				</form>
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="dialog-content"]')
		if (!trigger || !dialog) throw new Error('Dialog trigger or content was not rendered')
		if (
			trigger.getAttribute('aria-controls') !== dialog.id
			|| trigger.getAttribute('aria-expanded') !== 'false'
			|| trigger.dataset.state !== 'closed'
		) {
			throw new Error('Dialog trigger did not describe the initial closed dialog')
		}

		if (dialog.open || getComputedStyle(dialog).display !== 'none') {
			throw new Error('Dialog did not start closed and hidden')
		}

		trigger.click()
		await frame()

		if (!dialog.open || trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Dialog did not open after trigger click')
		}

		const animation = getComputedStyle(dialog)
		const screenshot = new URLSearchParams(location.search).get('screenshot') === '1'
		const duration = screenshot ? 0.000001 : 0.2
		if (animation.animationName !== 'enter' || Math.abs(Number.parseFloat(animation.animationDuration) - duration) > 1e-9) {
			throw new Error(`Dialog animation was ${animation.animationName} ${animation.animationDuration}; expected enter ${duration}s`)
		}

		await Promise.all(dialog.getAnimations().map(animation => animation.finished.catch(() => undefined)))
		const settled = getComputedStyle(dialog)
		const rect = dialog.getBoundingClientRect()
		if (
			settled.transform !== 'none'
			|| settled.translate !== 'none'
			|| Math.abs(rect.left + rect.width / 2 - innerWidth / 2) > 2
			|| Math.abs(rect.top + rect.height / 2 - innerHeight / 2) > 2
		) {
			throw new Error(`Dialog must center without translation, got transform=${settled.transform} translate=${settled.translate}`)
		}

		if (!dialog.getAttribute('aria-labelledby') || !canvas.querySelector('[data-slot="dialog-title"]')) {
			throw new Error('Dialog is missing accessible title wiring')
		}

		const close = canvas.querySelector<HTMLButtonElement>('[data-slot="dialog-close"][aria-label="Close"]')
		const closeIcon = close?.querySelector<HTMLElement>('[aria-hidden="true"]')
		if (!close || !closeIcon) throw new Error('Dialog close button or icon was not rendered')

		const closeRect = close.getBoundingClientRect()
		const closeIconRect = closeIcon.getBoundingClientRect()
		if (closeRect.width < 24 || closeRect.height < 24 || closeIconRect.width < 12 || closeIconRect.height < 12) {
			throw new Error('Dialog close button was not visible or clickable')
		}

		close.click()
		await frame()

		if (dialog.open || trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Dialog did not close from DialogClose')
		}
	},
}

export const Invite: Story<typeof Dialog> = {
	args: {
		trigger: 'Invite collaborators',
		title: 'Invite collaborators',
		description: 'Share access with teammates who should review this workspace.',
	},
	render: ({ description, showCloseButton, title, trigger, ...args }) => (
		<Dialog {...args}>
			<DialogTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</DialogTrigger>
			<DialogContent showCloseButton={showCloseButton}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<div class="grid gap-3">
					<Label for="dialog-email">Email</Label>
					<Input id="dialog-email" type="email" placeholder="name@example.com" />
				</div>
				<DialogFooter showCloseButton>
					<Button type="button">Send invite</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="dialog-content"]')
		if (!trigger || !dialog) throw new Error('Invite dialog trigger or content was not rendered')
		if (dialog.open || getComputedStyle(dialog).display !== 'none') {
			throw new Error('Invite dialog did not start closed and hidden')
		}

		trigger.click()
		await frame()

		if (!dialog.open) throw new Error('Invite dialog did not open from trigger')

		const close = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
		if (!close) throw new Error('Invite dialog close button was not rendered')
		close.click()
		await frame()

		if (dialog.open) throw new Error('Invite dialog did not close after smoke')
	},
}

export const Controlled: Story<typeof Dialog> = {
	args: {
		trigger: 'Open controlled dialog',
		title: 'Controlled dialog',
		description: 'The parent component owns the open state and reacts to dialog close events.',
	},
	argTypes: {
		defaultOpen: { control: false },
	},
	render: args => <ControlledExample {...args} />,
	play: async ({ canvas }) => {
		const open = canvas.querySelector<HTMLButtonElement>('button[data-slot="button"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="dialog-content"]')
		if (!open || !dialog) throw new Error('Controlled dialog controls were not rendered')

		if (dialog.open || !canvas.textContent?.includes('Open: no')) {
			throw new Error('Controlled dialog did not start closed')
		}

		open.click()
		await frame()

		if (!dialog.open || !canvas.textContent?.includes('Open: yes')) {
			throw new Error('Controlled dialog did not open')
		}

		const close = canvas.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
		if (!close) throw new Error('Controlled dialog close button was not rendered')
		close.click()
		await frame()

		if (dialog.open || !canvas.textContent?.includes('Open: no')) {
			throw new Error('Controlled dialog did not close')
		}
	},
}

export const NoDefaultCloseButton: Story<typeof Dialog> = {
	args: {
		trigger: 'Open custom close dialog',
		title: 'Custom footer close',
		description: 'The top-right close affordance is omitted, but composed footer actions can still close the dialog.',
		showCloseButton: false,
	},
	render: ({ description, showCloseButton, title, trigger, ...args }) => (
		<Dialog {...args}>
			<DialogTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</DialogTrigger>
			<DialogContent showCloseButton={showCloseButton}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter showCloseButton>
					<Button type="button">Confirm</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="dialog-content"]')
		if (!trigger || !dialog) throw new Error('Dialog without default close button trigger or content was not rendered')
		if (dialog.open || getComputedStyle(dialog).display !== 'none') {
			throw new Error('Dialog without default close button did not start closed and hidden')
		}

		trigger.click()
		await frame()

		const closes = dialog.querySelectorAll('[data-slot="dialog-close"]')
		if (!dialog.open) throw new Error('Dialog without default close button did not open')
		if (closes.length !== 1) throw new Error('Dialog rendered an unexpected default close button')

		const close = closes[0] as HTMLButtonElement | undefined
		if (!close) throw new Error('Dialog footer close button was not rendered')
		close.click()
		await frame()

		if (dialog.open) throw new Error('Dialog without default close button did not close after smoke')
	},
}

export const PreventEscape: Story<typeof Dialog> = {
	args: {
		trigger: 'Open guarded dialog',
		title: 'Unsaved changes',
		description: 'Escape is prevented so the dialog can require an explicit action.',
	},
	render: ({ description, showCloseButton, title, trigger, ...args }) => (
		<Dialog {...args}>
			<DialogTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</DialogTrigger>
			<DialogContent showCloseButton={showCloseButton} onEscapeKeyDown={event => event.preventDefault()}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter showCloseButton />
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="dialog-content"]')
		if (!trigger || !dialog) throw new Error('Prevent Escape dialog trigger or content was not rendered')
		if (dialog.open || getComputedStyle(dialog).display !== 'none') {
			throw new Error('Prevent Escape dialog did not start closed and hidden')
		}

		trigger.click()
		await frame()

		if (!dialog.open) throw new Error('Prevent Escape dialog did not open')

		for (let index = 0; index < 3; index++) {
			const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
			;(document.activeElement ?? dialog).dispatchEvent(event)
			await frame()

			if (!event.defaultPrevented) throw new Error('Prevent Escape dialog did not prevent Escape keydown')
			if (!dialog.open) throw new Error('Dialog closed even though Escape was prevented')
		}

		const close = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
		if (!close) throw new Error('Prevent Escape dialog close button was not rendered')
		close.click()
		await frame()

		if (dialog.open) throw new Error('Prevent Escape dialog did not close after smoke')
	},
}
