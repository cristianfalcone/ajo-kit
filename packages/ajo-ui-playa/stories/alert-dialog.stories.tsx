/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Args, Meta, Story } from './app'
import { buttonVariants } from 'ajo-ui-playa/button'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
	AlertDialogTrigger,
} from 'ajo-ui-playa/alert-dialog'

export default {
	title: 'UI/Alert Dialog',
	component: AlertDialog,
	args: {
		defaultOpen: false,
		size: 'default',
		trigger: 'Show Dialog',
		title: 'Are you absolutely sure?',
		description: 'This action cannot be undone. This will permanently delete your account and remove your data from our servers.',
		cancel: 'Cancel',
		action: 'Continue',
	},
	argTypes: {
		size: { control: 'select', options: ['default', 'sm'] },
	},
	parameters: {
		docs: { description: 'Modal alert dialog for critical confirmations, built on native HTMLDialogElement with alertdialog semantics and Ajo Kit composition.' },
		layout: 'centered',
	},
} satisfies Meta<typeof AlertDialog>

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

const BasicContent = ({ action, cancel, description, size, title }: Args) => (
	<AlertDialogContent size={size}>
		<AlertDialogHeader>
			<AlertDialogTitle>{title}</AlertDialogTitle>
			<AlertDialogDescription>{description}</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel>{cancel}</AlertDialogCancel>
			<AlertDialogAction>{action}</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
)

const ControlledExample: Stateful<Args> = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	for (const { action, cancel, defaultOpen: _defaultOpen, description, size, title, trigger, ...args } of this) yield (
		<div class="grid gap-3">
			<button class={buttonVariants({ variant: 'outline' })} type="button" set:onclick={() => setOpen(true)}>
				{trigger}
			</button>
			<p class="text-sm text-muted-foreground">Open: {open ? 'yes' : 'no'}</p>
			<AlertDialog {...args} open={open} onOpenChange={setOpen}>
				<BasicContent action={action} cancel={cancel} description={description} size={size} title={title} />
			</AlertDialog>
		</div>
	)
}

const DangerExample: Stateful<Args> = function* () {
	let result = 'pending'
	const remove = () => this.next(() => result = 'deleted')

	for (const { action, cancel, description, size, title, trigger, ...args } of this) yield (
		<div class="grid gap-3">
			<AlertDialog {...args}>
				<AlertDialogTrigger class={buttonVariants({ variant: 'danger' })}>
					{trigger}
				</AlertDialogTrigger>
				<AlertDialogContent size={size}>
					<AlertDialogHeader>
						<AlertDialogMedia class="text-danger">
							<span class="i-lucide-trash-2 size-8" />
						</AlertDialogMedia>
						<AlertDialogTitle>{title}</AlertDialogTitle>
						<AlertDialogDescription>{description}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{cancel}</AlertDialogCancel>
						<AlertDialogAction variant="danger" set:onclick={remove}>{action}</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<p class="text-sm text-muted-foreground">Result: {result}</p>
		</div>
	)
}

export const Basic: Story<typeof AlertDialog> = {
	render: ({ action, cancel, description, size, title, trigger, ...args }) => (
		<AlertDialog {...args}>
			<AlertDialogTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</AlertDialogTrigger>
			<BasicContent action={action} cancel={cancel} description={description} size={size} title={title} />
		</AlertDialog>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="alert-dialog-content"]')
		if (!trigger || !dialog) throw new Error('AlertDialog trigger or content was not rendered')

		if (dialog.open || getComputedStyle(dialog).display !== 'none') {
			throw new Error('AlertDialog did not start closed and hidden')
		}

		trigger.click()
		await frame()

		if (!dialog.open || dialog.getAttribute('role') !== 'alertdialog') {
			throw new Error('AlertDialog did not open with alertdialog role')
		}

		const animation = getComputedStyle(dialog)
		const screenshot = new URLSearchParams(location.search).get('screenshot') === '1'
		const duration = screenshot ? 0.000001 : 0.2
		if (animation.animationName !== 'enter' || Math.abs(Number.parseFloat(animation.animationDuration) - duration) > 1e-9) {
			throw new Error(`AlertDialog animation was ${animation.animationName} ${animation.animationDuration}; expected enter ${duration}s`)
		}
		await Promise.all(dialog.getAnimations().map(animation => animation.finished.catch(() => undefined)))
		const centered = getComputedStyle(dialog)
		const rect = dialog.getBoundingClientRect()
		if (
			centered.translate !== 'none'
			|| Math.abs(rect.left + rect.width / 2 - innerWidth / 2) > 2
			|| Math.abs(rect.top + rect.height / 2 - innerHeight / 2) > 2
		) {
			throw new Error(`AlertDialog must center without translation, got ${centered.translate}`)
		}

		if (!dialog.getAttribute('aria-labelledby') || !dialog.getAttribute('aria-describedby')) {
			throw new Error('AlertDialog is missing accessible title or description wiring')
		}

		const title = dialog.querySelector<HTMLElement>('[data-slot="alert-dialog-title"]')
		const description = dialog.querySelector<HTMLElement>('[data-slot="alert-dialog-description"]')
		if (!title || !description) throw new Error('AlertDialog title or description was not rendered')
		const titleStyle = getComputedStyle(title)
		const descriptionStyle = getComputedStyle(description)
		if (descriptionStyle.fontSize !== '14px' || descriptionStyle.color === titleStyle.color) {
			throw new Error('AlertDialog description did not inherit the themed muted-description recipe')
		}
		if (dialog.querySelector('[data-slot="dialog-close"][aria-label="Close"]')) {
			throw new Error('AlertDialog rendered Dialog\'s default close button')
		}

		const cancel = canvas.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-cancel"]')
		if (!cancel || document.activeElement !== cancel) {
			throw new Error('AlertDialog did not move focus to the cancel control')
		}

		cancel.click()
		await frame()

		if (dialog.open || trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('AlertDialog did not close from cancel')
		}

		trigger.click()
		await frame()

		dialog.dispatchEvent(new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			clientX: 0,
			clientY: 0,
		}))
		await frame()

		if (!dialog.open || trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('AlertDialog closed from outside click')
		}

		dialog.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }))
		await frame()

		if (dialog.open || trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('AlertDialog did not close from Escape cancel event')
		}
	},
}

export const SmallWithMedia: Story<typeof AlertDialog> = {
	args: {
		size: 'sm',
		trigger: 'Share project',
		title: 'Share project?',
		description: 'Anyone with access can duplicate this workspace.',
		action: 'Share',
	},
	render: ({ action, cancel, description, size, title, trigger, ...args }) => (
		<AlertDialog {...args}>
			<AlertDialogTrigger class={buttonVariants({ variant: 'outline' })}>
				{trigger}
			</AlertDialogTrigger>
			<AlertDialogContent size={size}>
				<AlertDialogHeader>
					<AlertDialogMedia>
						<span class="i-lucide-alert-triangle size-8" />
					</AlertDialogMedia>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{cancel}</AlertDialogCancel>
					<AlertDialogAction>{action}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="alert-dialog-content"]')
		const media = canvas.querySelector<HTMLElement>('[data-slot="alert-dialog-media"]')
		if (!trigger || !dialog || !media) throw new Error('Small media AlertDialog trigger, content, or media was not rendered')
		if (dialog.open || getComputedStyle(dialog).display !== 'none') {
			throw new Error('Small media AlertDialog did not start closed and hidden')
		}

		trigger.click()
		await frame()

		if (!dialog?.open || dialog.dataset.size !== 'sm' || !media) {
			throw new Error('Small media AlertDialog did not render expected state')
		}

		const cancel = dialog.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-cancel"]')
		if (!cancel) throw new Error('Small media AlertDialog cancel button was not rendered')
		cancel.click()
		await frame()

		if (dialog.open) throw new Error('Small media AlertDialog did not close after smoke')
	},
}

export const Controlled: Story<typeof AlertDialog> = {
	args: {
		trigger: 'Open controlled alert',
	},
	argTypes: {
		defaultOpen: { control: false },
	},
	render: args => <ControlledExample {...args} />,
	play: async ({ canvas }) => {
		const open = canvas.querySelector<HTMLButtonElement>('button')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="alert-dialog-content"]')
		if (!open || !dialog) throw new Error('Controlled AlertDialog controls were not rendered')

		if (dialog.open || !canvas.textContent?.includes('Open: no')) {
			throw new Error('Controlled AlertDialog did not start closed')
		}

		open.click()
		await frame()

		if (!dialog.open || !canvas.textContent?.includes('Open: yes')) {
			throw new Error('Controlled AlertDialog did not open')
		}

		const action = canvas.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')
		if (!action) throw new Error('Controlled AlertDialog action was not rendered')
		action.click()
		await frame()

		if (dialog.open || !canvas.textContent?.includes('Open: no')) {
			throw new Error('Controlled AlertDialog did not close from action')
		}
	},
}

export const Danger: Story<typeof AlertDialog> = {
	args: {
		trigger: 'Delete chat',
		title: 'Delete chat?',
		description: 'This removes the conversation for every participant and cannot be undone.',
		cancel: 'Keep chat',
		action: 'Delete',
	},
	render: args => <DangerExample {...args} />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')
		if (!trigger) throw new Error('Danger AlertDialog trigger was not rendered')

		trigger.click()
		await frame()

		const action = canvas.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="alert-dialog-content"]')
		if (!action || !dialog) throw new Error('Danger AlertDialog action or content was not rendered')

		action.click()
		await frame()

		if (dialog.open || !canvas.textContent?.includes('Result: deleted')) {
			throw new Error('AlertDialog action did not run and close')
		}
	},
}
