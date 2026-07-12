/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import clsx from 'clsx'
import type { Meta, Story } from './app'
import Button, { buttonVariants } from '/src/ui/button'
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
	type CommandFilter,
} from '/src/ui/command'
import {
	Dialog as UiDialog,
	DialogContent as UiDialogContent,
	DialogDescription as UiDialogDescription,
	DialogTitle as UiDialogTitle,
	DialogTrigger as UiDialogTrigger,
} from '/src/ui/dialog'
import { modalCentered, modalSurface } from '/src/ui/modal'

export default {
	title: 'UI/Command',
	component: Command,
	parameters: {
		docs: { description: 'Ajo command menu with native search input, listbox options, filtering, keyboard selection, and a native dialog palette.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Command>

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

const escape = (target: EventTarget) => {
	const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
	target.dispatchEvent(event)
	return event
}

const cancel = (dialog: HTMLDialogElement) => {
	const event = new Event('cancel', { bubbles: true, cancelable: true })
	dialog.dispatchEvent(event)
	return event
}

const backdrop = (dialog: HTMLDialogElement) => {
	const event = new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
		clientX: 0,
		clientY: 0,
	})
	dialog.dispatchEvent(event)
	return event
}

const CommandDemo = ({
	filter,
	onSelect,
}: {
	filter?: CommandFilter | null
	onSelect?: (value: string) => (selected: string, event: Event) => void
}) => (
	<Command class="w-[28rem] glass-overlay edge shadow-lg" filter={filter}>
		<CommandInput placeholder="Type a command or search..." />
		<CommandList>
			<CommandEmpty>No results found.</CommandEmpty>
			<CommandGroup heading="Suggestions">
				<CommandItem value="calendar" keywords={['schedule', 'events']} onSelect={onSelect?.('calendar')}>
					<span class="i-lucide-calendar size-4" />
					Calendar
				</CommandItem>
				<CommandItem value="search-emoji" keywords={['smile', 'icons']} onSelect={onSelect?.('search-emoji')}>
					<span class="i-lucide-smile size-4" />
					Search Emoji
				</CommandItem>
				<CommandItem value="calculator" keywords={['math']} onSelect={onSelect?.('calculator')}>
					<span class="i-lucide-calculator size-4" />
					Calculator
				</CommandItem>
			</CommandGroup>
			<CommandSeparator />
			<CommandGroup heading="Settings">
				<CommandItem value="profile" onSelect={onSelect?.('profile')}>
					<span class="i-lucide-user size-4" />
					Profile
					<CommandShortcut>Cmd+P</CommandShortcut>
				</CommandItem>
				<CommandItem value="billing" keywords={['payments']} onSelect={onSelect?.('billing')}>
					<span class="i-lucide-credit-card size-4" />
					Billing
					<CommandShortcut>Cmd+B</CommandShortcut>
				</CommandItem>
				<CommandItem value="settings" onSelect={onSelect?.('settings')}>
					<span class="i-lucide-settings size-4" />
					Settings
				</CommandItem>
			</CommandGroup>
		</CommandList>
	</Command>
)

const DialogCommands = () => (
	<>
		<CommandInput placeholder="Search commands..." />
		<CommandList>
			<CommandEmpty>No commands found.</CommandEmpty>
			<CommandGroup heading="Commands">
				<CommandItem value="open">Open File</CommandItem>
				<CommandItem value="save">Save File</CommandItem>
				<CommandItem value="close">Close Window</CommandItem>
			</CommandGroup>
		</CommandList>
	</>
)

const BasicExample: Stateful = function* () {
	let action = 'none'
	const select = (next: string) => (_value: string, _event: Event) => this.next(() => action = next)

	while (true) yield (
		<div class="grid gap-3">
			<CommandDemo onSelect={select} />
			<p class="text-sm text-muted-foreground">Action: {action}</p>
		</div>
	)
}

const ControlledExample: Stateful = function* () {
	let search = 'bill'
	let value = 'billing'
	const setSearch = (next: string) => this.next(() => search = next)
	const setValue = (next: string) => this.next(() => value = next)

	while (true) yield (
		<div class="grid gap-3">
			<Command
				class="w-[28rem] glass-overlay edge shadow-lg"
				search={search}
				value={value}
				onSearchChange={setSearch}
				onValueChange={setValue}
			>
				<CommandInput placeholder="Search settings..." />
				<CommandList>
					<CommandEmpty>No settings found.</CommandEmpty>
					<CommandGroup heading="Settings">
						<CommandItem value="profile">Profile</CommandItem>
						<CommandItem value="billing">Billing</CommandItem>
						<CommandItem value="security">Security</CommandItem>
					</CommandGroup>
				</CommandList>
			</Command>
			<p class="text-sm text-muted-foreground">Search: {search}; Value: {value}</p>
		</div>
	)
}

const EnterGuardExample: Stateful = function* () {
	let committed = 'none'
	let search = ''
	const setSearch = (next: string) => this.next(() => search = next)
	const commit = (next: string, _event: Event) => this.next(() => committed = next)

	while (true) yield (
		<div class="grid gap-3">
			<Command
				class="w-[28rem] glass-overlay edge shadow-lg"
				value="billing"
				search={search}
				onSearchChange={setSearch}
			>
				<CommandInput placeholder="Search settings..." />
				<CommandList>
					<CommandEmpty>No settings found.</CommandEmpty>
					<CommandGroup heading="Settings">
						<CommandItem value="profile" onSelect={commit}>Profile</CommandItem>
						<CommandItem value="billing" onSelect={commit}>Billing</CommandItem>
						<CommandItem value="security" onSelect={commit}>Security</CommandItem>
					</CommandGroup>
				</CommandList>
			</Command>
			<p class="text-sm text-muted-foreground">Committed: {committed}</p>
		</div>
	)
}

const CommandDialogExample: Stateful = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	while (true) yield (
		<div class="grid gap-3">
			<Button type="button" variant="outline" set:onclick={() => setOpen(true)}>
				Open command dialog
			</Button>
			<CommandDialog closeLabel="Dismiss command palette" open={open} onOpenChange={setOpen} title="Search commands" description="Choose a command">
				<DialogCommands />
			</CommandDialog>
		</div>
	)
}

const GuardedCommandDialogExample: Stateful = function* () {
	let escapes = 0
	let open = false
	let outside = 0
	const setOpen = (next: boolean) => this.next(() => open = next)

	while (true) yield (
		<div class="grid gap-3">
			<Button type="button" variant="outline" set:onclick={() => setOpen(true)}>
				Open guarded command dialog
			</Button>
			<p class="text-sm text-muted-foreground">Open: {open ? 'yes' : 'no'}; Escape: {escapes}; Outside: {outside}</p>
			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				onEscapeKeyDown={(event: KeyboardEvent) => {
					event.preventDefault()
					this.next(() => escapes++)
				}}
				onPointerDownOutside={(event: MouseEvent) => {
					event.preventDefault()
					this.next(() => outside++)
				}}
			>
				<DialogCommands />
			</CommandDialog>
		</div>
	)
}

const TriggeredCommandDialogExample = () => (
	<UiDialog>
		<UiDialogTrigger class={buttonVariants({ variant: 'outline' })}>
			Open trigger command dialog
		</UiDialogTrigger>
		<UiDialogContent
			class={clsx(
				modalSurface,
				modalCentered,
				'max-h-[85vh] w-[min(92vw,32rem)] overflow-hidden rounded-xl edge p-0',
			)}
			data-slot="command-dialog"
			unstyled
		>
			<UiDialogTitle class="sr-only">Command Palette</UiDialogTitle>
			<UiDialogDescription class="sr-only">Search for a command to run...</UiDialogDescription>
			<Command>
				<DialogCommands />
			</Command>
		</UiDialogContent>
	</UiDialog>
)

export const Basic: Story<typeof Command> = {
	render: () => <BasicExample />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="command-input"]')
		const billing = canvas.querySelector<HTMLElement>('[data-slot="command-item"][data-value="billing"]')
		if (!input || !billing) throw new Error('Command input or Billing item was not rendered')

		billing.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
		await frame()

		if (billing.dataset.highlighted !== 'true') {
			throw new Error('Command item did not highlight on pointer hover')
		}

		input.focus()
		input.value = 'bill'
		input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'bill' }))
		await frame()

		const calendar = canvas.querySelector<HTMLElement>('[data-slot="command-item"][data-value="calendar"]')
		if (!calendar?.hidden || billing.hidden) {
			throw new Error('Command filtering did not hide non-matching items')
		}

		billing.click()
		await frame()

		if (!canvas.textContent?.includes('Action: billing')) {
			throw new Error('Command item did not call onSelect')
		}
	},
}

export const Keyboard: Story<typeof Command> = {
	render: () => <BasicExample />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="command-input"]')
		if (!input) throw new Error('Command input was not rendered')

		input.focus()
		input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))
		await frame()

		let highlighted = canvas.querySelector<HTMLElement>('[data-slot="command-item"][data-highlighted="true"]')
		if (highlighted?.dataset.value !== 'search-emoji') {
			throw new Error('ArrowDown did not move Command highlight to Search Emoji')
		}

		input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))
		await frame()

		highlighted = canvas.querySelector<HTMLElement>('[data-slot="command-item"][data-highlighted="true"]')
		if (highlighted?.dataset.value !== 'calculator') {
			throw new Error('ArrowDown did not move Command highlight to Calculator')
		}

		input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
		await frame()

		if (!canvas.textContent?.includes('Action: calculator')) {
			throw new Error('Enter did not select the active Command item')
		}
	},
}

export const Empty: Story<typeof Command> = {
	render: () => <CommandDemo />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="command-input"]')
		const empty = canvas.querySelector<HTMLElement>('[data-slot="command-empty"]')
		const separator = canvas.querySelector<HTMLElement>('[data-slot="command-separator"]')
		const groups = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="command-group"]'))
		const suggestions = groups.find(group => group.textContent?.includes('Suggestions'))
		const settings = groups.find(group => group.textContent?.includes('Settings'))
		if (!input || !empty || !separator || !suggestions || !settings) {
			throw new Error('Command structural filtering fixture was not rendered')
		}
		const search = async (value: string) => {
			input.value = value
			input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }))
			await frame()
		}

		await frame()
		if (suggestions.hidden || settings.hidden || separator.hidden || !empty.hidden) {
			throw new Error('Command structure did not start fully visible')
		}

		await search('calendar')
		if (suggestions.hidden || !settings.hidden || !separator.hidden || !empty.hidden) {
			throw new Error('Command did not hide the empty group and trailing separator')
		}

		await search('zzz')

		if (!suggestions.hidden || !settings.hidden || !separator.hidden || empty.hidden) {
			throw new Error('Command empty state did not appear after filtering all items')
		}

		await search('')
		if (suggestions.hidden || settings.hidden || separator.hidden || !empty.hidden) {
			throw new Error('Command structure did not restore after clearing the search')
		}
	},
}

export const ExternalFiltering: Story<typeof Command> = {
	render: () => <CommandDemo filter={null} />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="command-input"]')
		const empty = canvas.querySelector<HTMLElement>('[data-slot="command-empty"]')
		if (!input || !empty) throw new Error('External Command filtering fixture was not rendered')

		input.value = 'server-owned'
		input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'server-owned' }))
		await frame()

		const items = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="command-item"]'))
		if (!items.length || items.some(item => item.hidden) || !empty.hidden) {
			throw new Error('filter=null did not leave Command results under external ownership')
		}
	},
}

export const Controlled: Story<typeof Command> = {
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="command-input"]')
		const billing = canvas.querySelector<HTMLElement>('[data-slot="command-item"][data-value="billing"]')
		if (!input || !billing) throw new Error('Controlled command input or Billing item was not rendered')

		if (input.value !== 'bill' || !canvas.textContent?.includes('Search: bill; Value: billing')) {
			throw new Error('Controlled Command did not render initial search/value')
		}

		input.value = 'sec'
		input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'sec' }))
		await frame()

		const security = canvas.querySelector<HTMLElement>('[data-slot="command-item"][data-value="security"]')
		if (!security || security.hidden || !canvas.textContent?.includes('Search: sec')) {
			throw new Error('Controlled Command did not update search')
		}

		security.click()
		await frame()

		if (!canvas.textContent?.includes('Value: security')) {
			throw new Error('Controlled Command did not update value')
		}
	},
}

export const Announce: Story<typeof Command> = {
	render: () => <CommandDemo />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="command-input"]')
		if (!input) throw new Error('Command input was not rendered')

		input.value = 'bill'
		input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'bill' }))
		await frame()

		const region = Array.from(document.body.children).find(element =>
			element.getAttribute('aria-live') === 'polite' && element.getAttribute('aria-atomic') === 'true')
		const liveText = () => region?.textContent
		if (liveText() !== '1 result') {
			throw new Error('Command filtering did not announce the result count')
		}

		input.value = 'zzz'
		input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'zzz' }))
		await frame()

		if (liveText() !== '0 results') {
			throw new Error('Command announce did not update for an empty result set')
		}
	},
}

export const EnterFilterGuard: Story<typeof Command> = {
	render: () => <EnterGuardExample />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="command-input"]')
		const billing = canvas.querySelector<HTMLElement>('[data-slot="command-item"][data-value="billing"]')
		if (!input || !billing) throw new Error('Enter guard input or Billing item was not rendered')

		input.focus()
		input.value = 'sec'
		input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'sec' }))
		await frame()

		if (!billing.hidden) throw new Error('Enter guard filter did not hide the controlled value item')

		const guarded = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' })
		input.dispatchEvent(guarded)
		await frame()

		if (guarded.defaultPrevented || canvas.textContent?.includes('Committed: billing')) {
			throw new Error('Enter committed a filtered-out controlled value')
		}
		if (!canvas.textContent?.includes('Committed: none')) {
			throw new Error('Enter guard changed the committed value unexpectedly')
		}

		input.value = ''
		input.dispatchEvent(new InputEvent('input', { bubbles: true }))
		await frame()

		if (billing.hidden) throw new Error('Clearing the search did not restore the controlled value item')

		input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }))
		await frame()

		if (!canvas.textContent?.includes('Committed: billing')) {
			throw new Error('Enter did not commit the visible controlled value')
		}
	},
}

export const Dialog: Story<typeof Command> = {
	render: () => <CommandDialogExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('button[data-slot="button"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="command-dialog"]')
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="command-input"]')
		if (!trigger || !dialog || !input) throw new Error('Command dialog trigger, content, or input was not rendered')
		if (dialog.open || getComputedStyle(dialog).display !== 'none') {
			throw new Error('CommandDialog did not start closed and hidden')
		}

		trigger.click()
		await frame()

		if (!dialog.open) throw new Error('CommandDialog did not open from trigger')

		const style = getComputedStyle(dialog)
		const screenshot = new URLSearchParams(location.search).get('screenshot') === '1'
		const duration = screenshot ? 0.000001 : 0.2
		if (style.animationName !== 'enter' || Math.abs(Number.parseFloat(style.animationDuration) - duration) > 1e-9) {
			throw new Error(`CommandDialog animation was ${style.animationName} ${style.animationDuration}; expected enter ${duration}s`)
		}
		await Promise.all(dialog.getAnimations().map(animation => animation.finished.catch(() => undefined)))
		const centered = getComputedStyle(dialog)
		const rect = dialog.getBoundingClientRect()
		if (
			centered.translate !== 'none'
			|| Math.abs(rect.left + rect.width / 2 - innerWidth / 2) > 2
			|| Math.abs(rect.top + rect.height / 2 - innerHeight / 2) > 2
		) {
			throw new Error(`CommandDialog must center without translation, got ${centered.translate}`)
		}

		const title = dialog.ownerDocument.getElementById(dialog.getAttribute('aria-labelledby') ?? '')
		const description = dialog.ownerDocument.getElementById(dialog.getAttribute('aria-describedby') ?? '')
		if (title?.textContent !== 'Search commands' || description?.textContent !== 'Choose a command') {
			throw new Error('CommandDialog did not wire custom title and description through Dialog context')
		}

		input.value = 'save'
		input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'save' }))
		await frame()

		const save = canvas.querySelector<HTMLElement>('[data-slot="command-item"][data-value="save"]')
		if (!save || save.hidden) throw new Error('CommandDialog did not filter command items')

		const firstEscape = escape(input)
		await frame()

		if (!firstEscape.defaultPrevented) throw new Error('CommandDialog search Escape was not prevented')
		if (input.value !== '') throw new Error('CommandDialog Escape did not clear search first')
		if (!dialog.open) throw new Error('CommandDialog closed before Escape reached empty search')

		const secondEscape = escape(input)
		await frame()

		if (secondEscape.defaultPrevented) throw new Error('CommandDialog empty-search Escape was prevented')
		cancel(dialog)
		await frame()

		if (dialog.open) throw new Error('CommandDialog did not close after empty-search Escape cancel')

		trigger.click()
		await frame()

		if (!dialog.open) throw new Error('CommandDialog did not reopen after Escape close')

		const close = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
		const closeIcon = close?.querySelector<HTMLElement>('[aria-hidden="true"]')
		if (!close || !closeIcon) throw new Error('CommandDialog close button or icon was not rendered')
		if (close.getAttribute('aria-label') !== 'Dismiss command palette') {
			throw new Error('CommandDialog did not honor its closeLabel override')
		}
		const closeRect = close.getBoundingClientRect()
		const closeIconRect = closeIcon.getBoundingClientRect()
		if (closeRect.width < 24 || closeRect.height < 24 || closeIconRect.width < 12 || closeIconRect.height < 12) {
			throw new Error('CommandDialog close button was not visible or clickable')
		}
		close.click()
		await frame()

		if (dialog.open) throw new Error('CommandDialog did not close after smoke')

		trigger.click()
		await frame()

		if (!dialog.open) throw new Error('CommandDialog did not reopen for backdrop close')
		backdrop(dialog)
		await frame()

		if (dialog.open) throw new Error('CommandDialog did not close from backdrop click')
	},
}

export const DialogDefaults: Story<typeof Command> = {
	render: () => (
		<CommandDialog defaultOpen>
			<DialogCommands />
		</CommandDialog>
	),
	play: async ({ canvas }) => {
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="command-dialog"]')
		if (!dialog) throw new Error('Default CommandDialog was not rendered')
		await frame()

		if (!dialog.open) throw new Error('Default CommandDialog did not start open')

		const title = dialog.ownerDocument.getElementById(dialog.getAttribute('aria-labelledby') ?? '')
		const description = dialog.ownerDocument.getElementById(dialog.getAttribute('aria-describedby') ?? '')
		if (title?.textContent !== 'Command Palette') throw new Error('CommandDialog default title changed')
		if (description?.textContent !== 'Search for a command to run...') {
			throw new Error('CommandDialog default description changed')
		}
		if (dialog.querySelector('[data-slot="dialog-close"]')?.getAttribute('aria-label') !== 'Close') {
			throw new Error('CommandDialog default close label changed')
		}
	},
}

export const DialogPreventableDismissal: Story<typeof Command> = {
	render: () => <GuardedCommandDialogExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('button[data-slot="button"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="command-dialog"]')
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="command-input"]')
		if (!trigger || !dialog || !input) throw new Error('Guarded CommandDialog controls were not rendered')

		trigger.click()
		await frame()

		if (!dialog.open || !canvas.textContent?.includes('Open: yes')) {
			throw new Error('Guarded CommandDialog did not open')
		}

		const blockedEscape = escape(input)
		await frame()

		if (!blockedEscape.defaultPrevented) throw new Error('CommandDialog onEscapeKeyDown did not prevent Escape')
		if (!dialog.open || !canvas.textContent?.includes('Escape: 1')) {
			throw new Error('CommandDialog closed or missed preventable Escape')
		}

		const blockedOutside = backdrop(dialog)
		await frame()

		if (!blockedOutside.defaultPrevented) throw new Error('CommandDialog onPointerDownOutside did not prevent backdrop click')
		if (!dialog.open || !canvas.textContent?.includes('Outside: 1')) {
			throw new Error('CommandDialog closed or missed preventable backdrop click')
		}

		const close = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
		if (!close) throw new Error('Guarded CommandDialog close button was not rendered')
		close.click()
		await frame()

		if (dialog.open || !canvas.textContent?.includes('Open: no')) {
			throw new Error('Guarded CommandDialog did not close from family close button')
		}
	},
}

export const DialogTriggerFocusReturn: Story<typeof Command> = {
	render: () => <TriggeredCommandDialogExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="command-dialog"]')
		if (!trigger || !dialog) throw new Error('Triggered Command dialog controls were not rendered')

		trigger.focus()
		trigger.click()
		await frame()

		if (!dialog.open) throw new Error('Triggered Command dialog did not open')

		const close = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
		if (!close) throw new Error('Triggered Command dialog close button was not rendered')
		close.click()
		await frame()

		if (dialog.open) throw new Error('Triggered Command dialog did not close')
		if (document.activeElement !== trigger) {
			throw new Error('Triggered Command dialog did not return focus to DialogTrigger')
		}
	},
}

export const Disabled: Story<typeof Command> = {
	render: () => (
		<Command disabled class="w-[28rem] glass-overlay edge shadow-lg">
			<CommandInput />
			<CommandList>
				<CommandGroup heading="Disabled">
					<CommandItem value="profile">Profile</CommandItem>
					<CommandItem value="settings">Settings</CommandItem>
				</CommandGroup>
			</CommandList>
		</Command>
	),
}
