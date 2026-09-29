/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Args, Meta, Story } from './app'
import { assertFocusReturn, frame } from './play'
import { Button, buttonVariants } from 'ajo-ui-playa/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from 'ajo-ui-playa/dialog'
import { Field, FieldGroup, FieldLabel } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'

export default {
	title: 'UI/Dialog',
	component: Dialog,
	args: {
		defaultOpen: false,
		modal: true,
		trigger: 'Edit profile',
		title: 'Edit profile',
		description: 'Your name and email show on the deploys you make.',
	},
	parameters: {
		docs: { description: 'Native HTMLDialogElement dialog with Ajo Kit composition, accessible title/description, Escape handling, and controlled/uncontrolled state.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Dialog>

const DemoForm = ({ description, title }: Args) => (
	<>
		<DialogHeader>
			<DialogTitle>{title}</DialogTitle>
			<DialogDescription>{description}</DialogDescription>
		</DialogHeader>
		<FieldGroup>
			<Field name="dialog-name">
				<FieldLabel>Name</FieldLabel>
				<Input name="name" value="Ana Ferreira" />
			</Field>
			<Field name="dialog-email">
				<FieldLabel>Email</FieldLabel>
				<Input name="email" type="email" value="ana@example.com" />
			</Field>
		</FieldGroup>
		<DialogFooter>
			<DialogClose class={buttonVariants({ variant: 'secondary' })}>Cancel</DialogClose>
			<Button type="submit">Save changes</Button>
		</DialogFooter>
	</>
)

const ControlledExample: Stateful<Args> = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	for (const { defaultOpen: _defaultOpen, description, title, trigger, ...args } of this) yield (
		<div class="grid gap-3">
			<Button type="button" variant="outline" set:onclick={() => setOpen(true)}>{trigger}</Button>
			<p class="text-sm text-muted-foreground">Open: {open ? 'yes' : 'no'}</p>
			<Dialog {...args} open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose class={buttonVariants({ variant: 'secondary' })}>Cancel</DialogClose>
						<Button type="button" set:onclick={() => setOpen(false)}>Pause deploys</Button>
					</DialogFooter>
					<DialogClose />
				</DialogContent>
			</Dialog>
		</div>
	)
}

export const Basic: Story<typeof Dialog> = {
	render: ({ description, title, trigger, ...args }) => (
		<Dialog {...args}>
			<DialogTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</DialogTrigger>
			<DialogContent>
				<form class="contents">
					<DemoForm title={title} description={description} />
				</form>
				<DialogClose />
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
		await frame(2)

		if (!dialog.open || trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Dialog did not open after trigger click')
		}

		const animation = getComputedStyle(dialog)
		const screenshot = new URLSearchParams(location.search).get('screenshot') === '1'
		const duration = screenshot ? 0.000001 : 0.2
		const name = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'playa-modal-fade' : 'enter'
		if (animation.animationName !== name || Math.abs(Number.parseFloat(animation.animationDuration) - duration) > 1e-9) {
			throw new Error(`Dialog animation was ${animation.animationName} ${animation.animationDuration}; expected ${name} ${duration}s`)
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

		// The corner X sits on the title line, and the header's text stops short of it.
		const header = canvas.querySelector<HTMLElement>('[data-slot="dialog-header"]')
		const titleRect = canvas.querySelector('[data-slot="dialog-title"]')?.getBoundingClientRect()
		if (!header || !titleRect) throw new Error('Dialog header or title was not rendered')
		if (Math.abs(closeRect.top + closeRect.height / 2 - (titleRect.top + titleRect.height / 2)) > 1) {
			throw new Error(`Dialog close is centred at ${closeRect.top + closeRect.height / 2}, off the title line at ${titleRect.top + titleRect.height / 2}`)
		}
		const headerRect = header.getBoundingClientRect()
		const room = Number.parseFloat(getComputedStyle(header).paddingInlineEnd)
		const clear = getComputedStyle(header).direction === 'rtl'
			? closeRect.right <= headerRect.left + room
			: headerRect.right - room <= closeRect.left
		if (!clear) throw new Error('Dialog header text runs under the corner close')

		close.click()
		await frame(2)

		if (dialog.open || trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Dialog did not close from DialogClose')
		}

		await assertFocusReturn(trigger, dialog, () => dialog.querySelector('[data-slot="dialog-close"][aria-label="Close"]'))
	},
}

export const Invite: Story<typeof Dialog> = {
	args: {
		trigger: 'Invite people',
		title: 'Invite people',
		description: 'They get an email with a link to join this host.',
	},
	render: ({ description, title, trigger, ...args }) => (
		<Dialog {...args}>
			<DialogTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<Field name="dialog-invite">
					<FieldLabel>Email</FieldLabel>
					<Input type="email" placeholder="name@example.com" />
				</Field>
				<DialogFooter>
					<DialogClose class={buttonVariants({ variant: 'secondary' })}>Cancel</DialogClose>
					<Button type="button">Send invite</Button>
				</DialogFooter>
				<DialogClose />
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
		await frame(2)

		if (!dialog.open) throw new Error('Invite dialog did not open from trigger')

		const close = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
		if (!close) throw new Error('Invite dialog close button was not rendered')
		close.click()
		await frame(2)

		if (dialog.open) throw new Error('Invite dialog did not close after smoke')
	},
}

export const Controlled: Story<typeof Dialog> = {
	args: {
		trigger: 'Pause deploys',
		title: 'Pause deploys',
		description: 'New pushes wait in the queue until you resume deploys.',
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
		await frame(2)

		if (!dialog.open || !canvas.textContent?.includes('Open: yes')) {
			throw new Error('Controlled dialog did not open')
		}

		const close = canvas.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
		if (!close) throw new Error('Controlled dialog close button was not rendered')
		close.click()
		await frame(2)

		if (dialog.open || !canvas.textContent?.includes('Open: no')) {
			throw new Error('Controlled dialog did not close')
		}
	},
}

export const NoDefaultCloseButton: Story<typeof Dialog> = {
	args: {
		trigger: 'Rotate token',
		title: 'Rotate token',
		description: 'The current token stops working as soon as the new one is created.',
	},
	render: ({ description, title, trigger, ...args }) => (
		<Dialog {...args}>
			<DialogTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose class={buttonVariants({ variant: 'secondary' })}>Cancel</DialogClose>
					<Button type="button">Rotate token</Button>
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
		await frame(2)

		const closes = dialog.querySelectorAll('[data-slot="dialog-close"]')
		if (!dialog.open) throw new Error('Dialog without default close button did not open')
		if (closes.length !== 1) throw new Error('Dialog rendered a close button that was not composed')

		const close = closes[0] as HTMLButtonElement | undefined
		if (!close) throw new Error('Dialog footer close button was not rendered')
		close.click()
		await frame(2)

		if (dialog.open) throw new Error('Dialog without default close button did not close after smoke')
	},
}

export const PreventEscape: Story<typeof Dialog> = {
	args: {
		trigger: 'Close settings',
		title: 'Discard changes?',
		description: 'The app settings have changes you have not saved. Escape keeps this open until you choose.',
	},
	render: ({ description, title, trigger, ...args }) => (
		<Dialog {...args}>
			<DialogTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</DialogTrigger>
			<DialogContent
				set:onkeydown={(event: KeyboardEvent) => {
					if (event.key === 'Escape') event.preventDefault()
				}}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose class={buttonVariants({ variant: 'outline' })}>Keep editing</DialogClose>
					<DialogClose class={buttonVariants({ variant: 'danger' })}>Discard changes</DialogClose>
				</DialogFooter>
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
		await frame(2)

		if (!dialog.open) throw new Error('Prevent Escape dialog did not open')

		for (let index = 0; index < 3; index++) {
			const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
			;(document.activeElement ?? dialog).dispatchEvent(event)
			await frame(2)

			if (!event.defaultPrevented) throw new Error('Prevent Escape dialog did not prevent Escape keydown')
			if (!dialog.open) throw new Error('Dialog closed even though Escape was prevented')
		}

		const close = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
		if (!close) throw new Error('Prevent Escape dialog close button was not rendered')
		close.click()
		await frame(2)

		if (dialog.open) throw new Error('Prevent Escape dialog did not close after smoke')
	},
}
