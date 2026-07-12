/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { buttonVariants } from '/src/ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '/src/ui/dropdown-menu'

export default {
	title: 'UI/Dropdown Menu',
	component: DropdownMenu,
	parameters: {
		docs: { description: 'Ajo dropdown menu using Popover API, menu roles, roving focus, checkbox/radio items, and submenus.' },
		layout: 'centered',
	},
} satisfies Meta<typeof DropdownMenu>

const triggerClass = buttonVariants({ variant: 'outline' })
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

const DemoMenu = () => (
	<DropdownMenu>
		<DropdownMenuTrigger class={triggerClass} id="account-menu-trigger">
			Open
		</DropdownMenuTrigger>
		<DropdownMenuContent class="w-56" align="start" id="account-menu-content">
			<DropdownMenuLabel>My Account</DropdownMenuLabel>
			<DropdownMenuGroup>
				<DropdownMenuItem textValue="Profile">
					<span class="i-lucide-user size-4" />
					Profile
					<DropdownMenuShortcut>Shift+P</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem textValue="Billing">
					<span class="i-lucide-credit-card size-4" />
					Billing
					<DropdownMenuShortcut>Cmd+B</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem textValue="Settings">
					<span class="i-lucide-settings size-4" />
					Settings
					<DropdownMenuShortcut>Cmd+S</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<DropdownMenuItem disabled textValue="API">API</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem variant="danger" textValue="Log out">
				<span class="i-lucide-log-out size-4" />
				Log out
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
)

const KeyboardExample: Stateful = function* () {
	let action = 'none'
	const select = (value: string) => (_event: Event) => this.next(() => action = value)

	while (true) yield (
		<div class="grid gap-3">
			<DropdownMenu>
				<DropdownMenuTrigger class={triggerClass} id="keyboard-menu-trigger">
					Actions
				</DropdownMenuTrigger>
				<DropdownMenuContent class="w-48">
					<DropdownMenuItem textValue="Archive" onSelect={select('archive')}>Archive</DropdownMenuItem>
					<DropdownMenuItem textValue="Duplicate" onSelect={select('duplicate')}>Duplicate</DropdownMenuItem>
					<DropdownMenuItem textValue="Delete" variant="danger" onSelect={select('delete')}>Delete</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<p class="text-sm text-muted-foreground">Action: {action}</p>
		</div>
	)
}

const CheckboxExample: Stateful = function* () {
	let activity = true
	let panel = false
	const setActivity = (next: boolean) => this.next(() => activity = next)
	const setPanel = (next: boolean) => this.next(() => panel = next)

	while (true) yield (
		<div class="grid gap-3">
			<DropdownMenu>
				<DropdownMenuTrigger class={triggerClass} id="checkbox-menu-trigger">
					Columns
				</DropdownMenuTrigger>
				<DropdownMenuContent class="w-52">
					<DropdownMenuCheckboxItem checked={activity} onCheckedChange={setActivity}>
						Activity bar
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem checked={panel} onCheckedChange={setPanel}>
						Panel
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem checked disabled>
						Status bar
					</DropdownMenuCheckboxItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<p class="text-sm text-muted-foreground">Activity: {activity ? 'on' : 'off'}; Panel: {panel ? 'on' : 'off'}</p>
		</div>
	)
}

const RadioExample: Stateful = function* () {
	let position = 'bottom'
	const setPosition = (next: string) => this.next(() => position = next)

	while (true) yield (
		<div class="grid gap-3">
			<DropdownMenu>
				<DropdownMenuTrigger class={triggerClass} id="radio-menu-trigger">
					Panel position
				</DropdownMenuTrigger>
				<DropdownMenuContent class="w-56">
					<DropdownMenuLabel>Panel Position</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
						<DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
			<p class="text-sm text-muted-foreground">Position: {position}</p>
		</div>
	)
}

export const Basic: Story<typeof DropdownMenu> = {
	render: () => <DemoMenu />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#account-menu-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]')
		const billing = canvas.querySelector<HTMLElement>('[data-slot="dropdown-menu-item"][data-label="Billing"]')
		if (!trigger || !content || !billing) throw new Error('Dropdown menu trigger, content, or Billing item was not rendered')
		if (content.id !== 'account-menu-content' || trigger.getAttribute('aria-controls') !== content.id || trigger.getAttribute('aria-haspopup') !== 'menu') {
			throw new Error('Dropdown menu trigger did not describe its menu content')
		}
		if (
			content.dataset.align !== 'start'
			|| content.dataset.sidePreference !== 'bottom'
			|| content.dataset.sideOffset !== '4'
			|| content.hasAttribute('data-collision-padding')
		) {
			throw new Error('Dropdown menu content did not preserve its placement defaults')
		}

		trigger.click()
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Dropdown menu did not open after trigger click')
		}

		billing.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
		await frame()

		if (billing.dataset.highlighted !== 'true' || document.activeElement !== billing) {
			throw new Error('Dropdown menu item did not highlight on pointer hover')
		}

		billing.click()
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Dropdown menu did not close after item click')
		}
	},
}

export const Keyboard: Story = {
	render: () => <KeyboardExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#keyboard-menu-trigger')
		if (!trigger) throw new Error('Keyboard menu trigger was not rendered')

		trigger.focus()
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

		const focused = document.activeElement as HTMLElement | null
		if (trigger.getAttribute('aria-expanded') !== 'true' || focused?.dataset.label !== 'Archive') {
			throw new Error('ArrowDown did not open Dropdown Menu and focus the first item')
		}

		focused.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if ((document.activeElement as HTMLElement | null)?.dataset.label !== 'Duplicate') {
			throw new Error('ArrowDown did not move focus to the next dropdown item')
		}

		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (!canvas.textContent?.includes('Action: duplicate') || trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Enter did not activate the focused dropdown item')
		}
	},
}

export const Checkboxes: Story = {
	render: () => <CheckboxExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#checkbox-menu-trigger')
		const panel = canvas.querySelector<HTMLElement>('[data-slot="dropdown-menu-checkbox-item"][data-label="Panel"]')
		if (!trigger || !panel) throw new Error('Checkbox dropdown trigger or Panel item was not rendered')

		trigger.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
		panel.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (panel.getAttribute('aria-checked') !== 'true' || !canvas.textContent?.includes('Panel: on')) {
			throw new Error('Dropdown checkbox item did not toggle on')
		}
	},
}

export const RadioGroup: Story = {
	render: () => <RadioExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#radio-menu-trigger')
		const right = canvas.querySelector<HTMLElement>('[data-slot="dropdown-menu-radio-item"][data-label="Right"]')
		if (!trigger || !right) throw new Error('Radio dropdown trigger or Right item was not rendered')

		trigger.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
		right.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (right.getAttribute('aria-checked') !== 'true' || !canvas.textContent?.includes('Position: right')) {
			throw new Error('Dropdown radio item did not select Right')
		}
	},
}

export const Submenu: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger class={triggerClass} id="submenu-trigger">
				Open
			</DropdownMenuTrigger>
			<DropdownMenuContent class="w-56">
				<DropdownMenuItem>Team</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger textValue="Invite users">Invite users</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem>Email</DropdownMenuItem>
						<DropdownMenuItem>Message</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>More...</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSeparator />
				<DropdownMenuItem>New team</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#submenu-trigger')
		const subTrigger = canvas.querySelector<HTMLElement>('[data-slot="dropdown-menu-sub-trigger"]')
		const subContent = canvas.querySelector<HTMLElement>('[data-slot="dropdown-menu-sub-content"]')
		const email = canvas.querySelector<HTMLElement>('[data-slot="dropdown-menu-sub-content"] [data-label="Email"]')
		const newTeam = canvas.querySelector<HTMLElement>('[data-slot="dropdown-menu-item"][data-label="New team"]')
		if (!trigger || !subTrigger || !subContent || !email || !newTeam) throw new Error('Submenu trigger, content, or item was not rendered')

		trigger.focus()
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (document.activeElement !== subTrigger) {
			throw new Error('ArrowDown did not move focus to the submenu trigger')
		}

		subTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (subTrigger.getAttribute('aria-expanded') !== 'true' || subContent.hidden) {
			throw new Error('ArrowRight did not open the dropdown submenu')
		}

		const content = canvas.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]')
		if (!content) throw new Error('Dropdown submenu parent content was not rendered')

		newTeam.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
		await frame()

		const hoverHighlighted = Array.from(content.querySelectorAll<HTMLElement>('[data-item="menu"][data-highlighted="true"]'))
		if (subTrigger.getAttribute('aria-expanded') !== 'false' || !subContent.hidden || hoverHighlighted.length !== 1 || hoverHighlighted[0]?.dataset.label !== 'New team') {
			throw new Error('Hovering a sibling item did not close the dropdown submenu and move highlight')
		}

		content.hidePopover()
		await frame()
		trigger.click()
		await frame()

		const highlighted = Array.from(content.querySelectorAll<HTMLElement>('[data-item="menu"][data-highlighted="true"]'))
		if (subTrigger.getAttribute('aria-expanded') !== 'false' || !subContent.hidden || highlighted.length !== 1 || highlighted[0]?.dataset.label !== 'Team') {
			throw new Error('Dropdown submenu stayed open or highlighted after parent close and reopen')
		}

		// Escape closes one level at a time: from inside an open submenu it
		// closes only the submenu (focus back on the sub trigger, the menu
		// stays open); the next Escape closes the menu itself.
		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
		await frame()
		if (document.activeElement !== subTrigger) throw new Error('ArrowDown did not move focus to the submenu trigger')

		subTrigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		await frame()
		if (subTrigger.getAttribute('aria-expanded') !== 'true' || subContent.hidden) {
			throw new Error('ArrowRight did not reopen the submenu for the Escape walk')
		}

		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
		await frame()
		if (subTrigger.getAttribute('aria-expanded') !== 'false' || !subContent.hidden) {
			throw new Error('Escape did not close the submenu')
		}
		if (trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Escape inside the submenu closed the whole menu')
		}
		if (document.activeElement !== subTrigger) {
			throw new Error('Escape did not return focus to the submenu trigger')
		}

		subTrigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
		await frame()
		if (trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Second Escape did not close the menu')
		}
	},
}

export const FocusModality: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger class={triggerClass} id="modality-menu-trigger">
				Open
			</DropdownMenuTrigger>
			<DropdownMenuContent class="w-48">
				<DropdownMenuItem textValue="First">First</DropdownMenuItem>
				<DropdownMenuItem textValue="Second">Second</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#modality-menu-trigger')
		const first = canvas.querySelector<HTMLElement>('[data-slot="dropdown-menu-item"][data-label="First"]')
		if (!trigger || !first) throw new Error('Modality menu trigger or first item was not rendered')

		// A real pointer click carries detail >= 1: the menu opens without keyboard-focusing the first item.
		trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Pointer click did not open the dropdown menu')
		}
		if (document.activeElement === first || first.dataset.highlighted === 'true') {
			throw new Error('Pointer click open must not keyboard-focus the first item')
		}

		trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Pointer click did not close the dropdown menu')
		}

		trigger.focus()
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'true' || document.activeElement !== first || first.dataset.highlighted !== 'true') {
			throw new Error('Keyboard open did not focus the first item')
		}
	},
}

export const EndAligned: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger class={triggerClass}>End aligned</DropdownMenuTrigger>
			<DropdownMenuContent align="end" class="w-48">
				<DropdownMenuItem>Documentation</DropdownMenuItem>
				<DropdownMenuItem>Themes</DropdownMenuItem>
				<DropdownMenuItem>GitHub</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
}
