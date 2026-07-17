/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { buttonVariants } from 'ajo-ui-playa/button'
import {
	Menu,
	MenuCheckboxItem,
	MenuContent,
	MenuGroup,
	MenuItem,
	MenuLabel,
	MenuRadioGroup,
	MenuRadioItem,
	MenuSeparator,
	MenuShortcut,
	MenuSub,
	MenuSubContent,
	MenuSubTrigger,
	MenuTrigger,
} from 'ajo-ui-playa/menu'

export default {
	title: 'UI/Menu',
	component: Menu,
	parameters: {
		docs: { description: 'Ajo menu using the Popover API, menu roles, roving focus, checkbox/radio items, and submenus.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Menu>

const triggerClass = buttonVariants({ variant: 'outline' })
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))
const until = async (condition: () => boolean, message: string) => {
	for (let attempt = 0; attempt < 30; attempt++) {
		if (condition()) return
		await frame()
	}
	throw new Error(message)
}

const DemoMenu = () => (
	<Menu placement="bottom-start">
		<MenuTrigger class={triggerClass} id="account-menu-trigger">
			Open
		</MenuTrigger>
		<MenuContent class="w-56" style="min-width:12rem">
			<MenuLabel>My Account</MenuLabel>
			<MenuGroup>
				<MenuItem textValue="Profile">
					<span class="i-lucide-user size-4" />
					Profile
					<MenuShortcut>Shift+P</MenuShortcut>
				</MenuItem>
				<MenuItem textValue="Billing">
					<span class="i-lucide-credit-card size-4" />
					Billing
					<MenuShortcut>Cmd+B</MenuShortcut>
				</MenuItem>
				<MenuItem textValue="Settings">
					<span class="i-lucide-settings size-4" />
					Settings
					<MenuShortcut>Cmd+S</MenuShortcut>
				</MenuItem>
			</MenuGroup>
			<MenuSeparator />
			<MenuItem disabled textValue="API">API</MenuItem>
			<MenuSeparator />
			<MenuItem variant="danger" textValue="Log out">
				<span class="i-lucide-log-out size-4" />
				Log out
			</MenuItem>
		</MenuContent>
	</Menu>
)

const ControlledSubPrecommitExample: Stateful = function* () {
	let open = false
	const setOpen = (next: boolean) => this.next(() => open = next)

	while (true) yield (
		<div class="grid gap-3">
			<div class="flex gap-2">
				<button id="controlled-sub-close" type="button" set:onclick={() => setOpen(false)}>Close sub</button>
				<button id="controlled-sub-reopen" type="button" set:onclick={() => setOpen(true)}>Reopen sub</button>
			</div>
			<Menu defaultOpen>
				<MenuTrigger id="controlled-sub-root-trigger">Root</MenuTrigger>
				<MenuContent>
					<MenuSub open={open} onOpenChange={setOpen}>
						<MenuSubTrigger textValue="Tools">Tools</MenuSubTrigger>
						<MenuSubContent>
							<MenuItem textValue="Child">Child</MenuItem>
						</MenuSubContent>
					</MenuSub>
				</MenuContent>
			</Menu>
		</div>
	)
}

const KeyboardExample: Stateful = function* () {
	let action = 'none'
	const select = (value: string) => (_event: Event) => this.next(() => action = value)

	while (true) yield (
		<div class="grid gap-3">
			<Menu>
				<MenuTrigger class={triggerClass} id="keyboard-menu-trigger">
					Actions
				</MenuTrigger>
				<MenuContent class="w-48">
					<MenuItem textValue="Archive" onSelect={select('archive')}>Archive</MenuItem>
					<MenuItem textValue="Duplicate" onSelect={select('duplicate')}>Duplicate</MenuItem>
					<MenuItem textValue="Delete" variant="danger" onSelect={select('delete')}>Delete</MenuItem>
				</MenuContent>
			</Menu>
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
			<Menu>
				<MenuTrigger class={triggerClass} id="checkbox-menu-trigger">
					Columns
				</MenuTrigger>
				<MenuContent class="w-52">
					<MenuCheckboxItem checked={activity} onCheckedChange={setActivity}>
						Activity bar
					</MenuCheckboxItem>
					<MenuCheckboxItem checked={panel} onCheckedChange={setPanel}>
						Panel
					</MenuCheckboxItem>
					<MenuCheckboxItem checked disabled>
						Status bar
					</MenuCheckboxItem>
				</MenuContent>
			</Menu>
			<p class="text-sm text-muted-foreground">Activity: {activity ? 'on' : 'off'}; Panel: {panel ? 'on' : 'off'}</p>
		</div>
	)
}

const RadioExample: Stateful = function* () {
	let position = 'bottom'
	const setPosition = (next: string) => this.next(() => position = next)

	while (true) yield (
		<div class="grid gap-3">
			<Menu>
				<MenuTrigger class={triggerClass} id="radio-menu-trigger">
					Panel position
				</MenuTrigger>
				<MenuContent class="w-56">
					<MenuLabel>Panel Position</MenuLabel>
					<MenuSeparator />
					<MenuRadioGroup value={position} onValueChange={setPosition}>
						<MenuRadioItem value="top">Top</MenuRadioItem>
						<MenuRadioItem value="bottom">Bottom</MenuRadioItem>
						<MenuRadioItem value="right">Right</MenuRadioItem>
					</MenuRadioGroup>
				</MenuContent>
			</Menu>
			<p class="text-sm text-muted-foreground">Position: {position}</p>
		</div>
	)
}

export const Basic: Story<typeof Menu> = {
	render: () => <DemoMenu />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#account-menu-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		const billing = canvas.querySelector<HTMLElement>('[data-slot="menu-item"][data-label="Billing"]')
		if (!trigger || !content || !billing) throw new Error('Menu trigger, content, or Billing item was not rendered')
		if (!content.id || trigger.getAttribute('aria-controls') !== content.id || trigger.getAttribute('aria-haspopup') !== 'menu') {
			throw new Error('Menu trigger did not describe its content')
		}
		if (content.getAttribute('popover') !== 'manual' || content.getAttribute('role') !== 'menu' || content.tabIndex !== -1) {
			throw new Error('Menu did not own its manual native semantics')
		}
		if (content.hasAttribute('data-side-preference') || content.hasAttribute('data-side-offset') || content.hasAttribute('data-align-offset')) {
			throw new Error('Menu leaked the legacy dataset positioning protocol')
		}

		trigger.click()
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Menu did not open after trigger click')
		}
		if (content.dataset.placement !== 'bottom-start' || content.dataset.side !== 'bottom' || content.dataset.align !== 'start') {
			throw new Error('Menu did not commit its root placement through Floating UI')
		}
		if (!content.style.maxHeight || !content.style.getPropertyValue('--available-height') || !content.style.cssText.includes('min-width')) {
			throw new Error('Menu did not compose consumer styles with available-height sizing')
		}

		billing.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
		await frame()

		if (billing.dataset.highlighted !== 'true' || document.activeElement !== billing) {
			throw new Error('Menu item did not highlight on pointer hover')
		}

		billing.click()
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Menu did not close after item click')
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
			throw new Error('ArrowDown did not open the menu and focus the first item')
		}

		focused.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if ((document.activeElement as HTMLElement | null)?.dataset.label !== 'Duplicate') {
			throw new Error('ArrowDown did not move focus to the next menu item')
		}

		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (!canvas.textContent?.includes('Action: duplicate') || trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Enter did not activate the focused menu item')
		}
	},
}

export const Checkboxes: Story = {
	render: () => <CheckboxExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#checkbox-menu-trigger')
		const panel = canvas.querySelector<HTMLElement>('[data-slot="menu-checkbox-item"][data-label="Panel"]')
		if (!trigger || !panel) throw new Error('Checkbox menu trigger or Panel item was not rendered')

		trigger.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
		panel.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (panel.getAttribute('aria-checked') !== 'true' || !canvas.textContent?.includes('Panel: on')) {
			throw new Error('Menu checkbox item did not toggle on')
		}
	},
}

export const RadioGroup: Story = {
	render: () => <RadioExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#radio-menu-trigger')
		const right = canvas.querySelector<HTMLElement>('[data-slot="menu-radio-item"][data-label="Right"]')
		if (!trigger || !right) throw new Error('Radio menu trigger or Right item was not rendered')

		trigger.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
		right.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (right.getAttribute('aria-checked') !== 'true' || !canvas.textContent?.includes('Position: right')) {
			throw new Error('Menu radio item did not select Right')
		}
	},
}

export const Submenu: Story = {
	render: () => (
		<Menu>
			<MenuTrigger class={triggerClass} id="submenu-trigger">
				Open
			</MenuTrigger>
			<MenuContent class="w-56">
				<MenuItem>Team</MenuItem>
				<MenuSub>
					<MenuSubTrigger textValue="Invite users">Invite users</MenuSubTrigger>
					<MenuSubContent>
						<MenuItem>Email</MenuItem>
						<MenuItem>Message</MenuItem>
						<MenuSeparator />
						<MenuItem>More...</MenuItem>
					</MenuSubContent>
				</MenuSub>
				<MenuSeparator />
				<MenuItem>New team</MenuItem>
			</MenuContent>
		</Menu>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#submenu-trigger')
		const subTrigger = canvas.querySelector<HTMLElement>('[data-slot="menu-sub-trigger"]')
		const subContent = canvas.querySelector<HTMLElement>('[data-slot="menu-sub-content"]')
		const email = canvas.querySelector<HTMLElement>('[data-slot="menu-sub-content"] [data-label="Email"]')
		const newTeam = canvas.querySelector<HTMLElement>('[data-slot="menu-item"][data-label="New team"]')
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

		if (subTrigger.getAttribute('aria-expanded') !== 'true' || !subContent.matches(':popover-open')) {
			throw new Error('ArrowRight did not open the submenu')
		}

		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		if (!content) throw new Error('Submenu parent content was not rendered')

		newTeam.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
		await frame()

		const hoverHighlighted = Array.from(content.querySelectorAll<HTMLElement>('[data-item="menu"][data-highlighted="true"]'))
		if (subTrigger.getAttribute('aria-expanded') !== 'false' || subContent.matches(':popover-open') || hoverHighlighted.length !== 1 || hoverHighlighted[0]?.dataset.label !== 'New team') {
			throw new Error('Hovering a sibling item did not close the submenu and move highlight')
		}

		trigger.click()
		await frame()
		trigger.click()
		await frame()

		const highlighted = Array.from(content.querySelectorAll<HTMLElement>('[data-item="menu"][data-highlighted="true"]'))
		if (subTrigger.getAttribute('aria-expanded') !== 'false' || subContent.matches(':popover-open') || highlighted.length !== 1 || highlighted[0]?.dataset.label !== 'Team') {
			throw new Error('Submenu stayed open or highlighted after parent close and reopen')
		}

		// Escape closes one level at a time: from inside an open submenu it
		// closes only the submenu (focus back on the sub trigger, the menu
		// stays open); the next Escape closes the menu itself.
		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
		await frame()
		if (document.activeElement !== subTrigger) throw new Error('ArrowDown did not move focus to the submenu trigger')

		subTrigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		await frame()
		if (subTrigger.getAttribute('aria-expanded') !== 'true' || !subContent.matches(':popover-open')) {
			throw new Error('ArrowRight did not reopen the submenu for the Escape walk')
		}

		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
		await frame()
		if (subTrigger.getAttribute('aria-expanded') !== 'false' || subContent.matches(':popover-open')) {
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
		<Menu>
			<MenuTrigger class={triggerClass} id="modality-menu-trigger">
				Open
			</MenuTrigger>
			<MenuContent class="w-48">
				<MenuItem textValue="First">First</MenuItem>
				<MenuItem textValue="Second">Second</MenuItem>
			</MenuContent>
		</Menu>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#modality-menu-trigger')
		const first = canvas.querySelector<HTMLElement>('[data-slot="menu-item"][data-label="First"]')
		if (!trigger || !first) throw new Error('Modality menu trigger or first item was not rendered')

		// A real pointer click carries detail >= 1: the menu opens without keyboard-focusing the first item.
		trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Pointer click did not open the menu')
		}
		if (document.activeElement === first || first.dataset.highlighted === 'true') {
			throw new Error('Pointer click open must not keyboard-focus the first item')
		}

		trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Pointer click did not close the menu')
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
		<Menu placement="bottom-end">
			<MenuTrigger class={triggerClass}>End aligned</MenuTrigger>
			<MenuContent class="w-48">
				<MenuItem>Documentation</MenuItem>
				<MenuItem>Themes</MenuItem>
				<MenuItem>GitHub</MenuItem>
			</MenuContent>
		</Menu>
	),
}

export const ViewportEdge: Story = {
	render: () => (
		<div style="position:fixed;right:4px;bottom:4px">
			<Menu gap={6} placement="bottom-end">
				<MenuTrigger class={triggerClass} id="edge-menu-trigger">Edge menu</MenuTrigger>
				<MenuContent style="width:18rem">
					<MenuItem>Account settings</MenuItem>
					<MenuItem>Sign out</MenuItem>
				</MenuContent>
			</Menu>
		</div>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#edge-menu-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		if (!trigger || !content) throw new Error('Edge menu trigger or content was not rendered')

		trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
		await until(() => content.matches(':popover-open') && Boolean(content.dataset.placement), 'Edge menu never committed geometry')

		const triggerRect = trigger.getBoundingClientRect()
		const contentRect = content.getBoundingClientRect()
		const separated = content.dataset.side === 'top' ? contentRect.bottom <= triggerRect.top + 1
			: content.dataset.side === 'left' ? contentRect.right <= triggerRect.left + 1
				: content.dataset.side === 'right' ? contentRect.left >= triggerRect.right - 1
					: false
		if (!separated || content.dataset.align !== 'end') {
			throw new Error(`Menu did not choose a valid non-overlapping edge fallback: ${content.dataset.placement}`)
		}
		if (contentRect.left < 3 || contentRect.right > window.innerWidth - 3) {
			throw new Error('Shift middleware did not keep edge menu inside the viewport')
		}
	},
}

export const ScrollTracking: Story = {
	render: () => (
		<div id="menu-scroll" style="height:8rem;width:22rem;overflow:auto;border:1px solid currentColor">
			<div style="height:28rem;padding:2rem">
				<Menu placement="bottom-start">
					<MenuTrigger class={triggerClass} id="scroll-menu-trigger">Scroll source</MenuTrigger>
					<MenuContent style="width:12rem">
						<MenuItem>One</MenuItem>
						<MenuItem>Two</MenuItem>
					</MenuContent>
				</Menu>
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const scroller = canvas.querySelector<HTMLElement>('#menu-scroll')
		const trigger = canvas.querySelector<HTMLButtonElement>('#scroll-menu-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		if (!scroller || !trigger || !content) throw new Error('Scroll menu fixture was not rendered')

		trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
		await until(() => content.matches(':popover-open') && Boolean(content.style.top), 'Scroll menu never opened')
		const initialTop = Number.parseFloat(content.style.top)

		scroller.scrollTop = 16
		await until(
			() => Math.abs(Number.parseFloat(content.style.top) - initialTop) > 8,
			'Menu did not follow its trigger while a clipping ancestor scrolled',
		)
		if (Math.abs(content.getBoundingClientRect().left - trigger.getBoundingClientRect().left) > 2) {
			throw new Error('Menu lost alignment with its trigger after scroll autoUpdate')
		}

		scroller.scrollTop = scroller.scrollHeight
		await until(() => trigger.getAttribute('aria-expanded') === 'false', 'Hidden reference did not close the menu')
		if (content.matches(':popover-open')) throw new Error('Reference-hidden menu left its native popover open')
	},
}

export const Dismissal: Story = {
	render: () => (
		<div class="grid gap-4">
			<button id="menu-outside" type="button">Outside target</button>
			<Menu>
				<MenuTrigger class={triggerClass} id="dismiss-menu-trigger">Dismiss menu</MenuTrigger>
				<MenuContent>
					<MenuItem textValue="First">First</MenuItem>
				</MenuContent>
			</Menu>
		</div>
	),
	play: async ({ canvas }) => {
		const outside = canvas.querySelector<HTMLButtonElement>('#menu-outside')
		const trigger = canvas.querySelector<HTMLButtonElement>('#dismiss-menu-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		const first = canvas.querySelector<HTMLElement>('[data-label="First"]')
		if (!outside || !trigger || !content || !first) throw new Error('Dismiss menu fixture was not rendered')

		trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
		await until(() => content.matches(':popover-open'), 'Pointer did not open dismissal menu')
		outside.focus()
		outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		await until(() => !content.matches(':popover-open'), 'Outside pointerdown did not close the menu')
		if (document.activeElement !== outside) throw new Error('Outside dismissal stole focus from its target')

		trigger.focus()
		trigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
		await until(() => document.activeElement === first, 'Keyboard menu did not focus after geometry commit')
		first.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
		await until(() => !content.matches(':popover-open'), 'Escape did not close the root menu')
		if (document.activeElement !== trigger) throw new Error('Escape did not restore focus to the menu trigger')
	},
}

export const ControlledSubPrecommit: Story = {
	render: () => <ControlledSubPrecommitExample />,
	play: async ({ canvas }) => {
		const close = canvas.querySelector<HTMLButtonElement>('#controlled-sub-close')
		const reopen = canvas.querySelector<HTMLButtonElement>('#controlled-sub-reopen')
		const subTrigger = canvas.querySelector<HTMLElement>('[data-slot="menu-sub-trigger"]')
		const subContent = canvas.querySelector<HTMLElement>('[data-slot="menu-sub-content"]')
		const child = canvas.querySelector<HTMLElement>('[data-label="Child"]')
		if (!close || !reopen || !subTrigger || !subContent || !child) {
			throw new Error('Controlled submenu precommit fixture was not rendered')
		}

		await until(() => subTrigger.offsetParent !== null, 'Controlled submenu trigger did not render')
		let childFocused = false
		const observeFocus = (event: Event) => {
			const target = event.target as HTMLElement | null
			if (target?.dataset.label === 'Child') childFocused = true
		}
		document.addEventListener('focus', observeFocus, true)
		subTrigger.focus()
		subTrigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		close.click()
		await until(
			() => subTrigger.getAttribute('aria-expanded') === 'false' && !subContent.matches(':popover-open'),
			'Controlled submenu did not close before its first geometry commit',
		)
		reopen.click()
		await until(() => subContent.dataset.state === 'open', 'Controlled submenu did not reopen')
		document.removeEventListener('focus', observeFocus, true)

		const currentChild = canvas.querySelector<HTMLElement>('[data-label="Child"]')
		if (childFocused || document.activeElement === currentChild || currentChild?.dataset.highlighted === 'true') {
			throw new Error('Programmatic submenu reopen consumed stale precommit keyboard focus')
		}
	},
}

export const NestedSubmenus: Story = {
	render: () => (
		<div class="grid gap-4">
			<button id="nested-menu-outside" type="button">Outside target</button>
			<Menu>
				<MenuTrigger class={triggerClass} id="nested-menu-trigger">Nested menu</MenuTrigger>
				<MenuContent>
					<MenuSub defaultOpen>
						<MenuSubTrigger textValue="Tools">Tools</MenuSubTrigger>
						<MenuSubContent>
							<MenuSub>
								<MenuSubTrigger textValue="Share">Share</MenuSubTrigger>
								<MenuSubContent>
									<MenuItem textValue="Copy link">Copy link</MenuItem>
								</MenuSubContent>
							</MenuSub>
							<MenuItem textValue="Export">Export</MenuItem>
						</MenuSubContent>
					</MenuSub>
				</MenuContent>
			</Menu>
		</div>
	),
	play: async ({ canvas }) => {
		const outside = canvas.querySelector<HTMLButtonElement>('#nested-menu-outside')
		const rootTrigger = canvas.querySelector<HTMLButtonElement>('#nested-menu-trigger')
		const triggers = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="menu-sub-trigger"]'))
		const contents = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="menu-sub-content"]'))
		const rootContent = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		const leaf = canvas.querySelector<HTMLElement>('[data-label="Copy link"]')
		const exportItem = canvas.querySelector<HTMLElement>('[data-label="Export"]')
		const [tools, share] = triggers
		const [toolsContent, shareContent] = contents
		if (!outside || !rootTrigger || !rootContent || !tools || !share || !toolsContent || !shareContent || !leaf || !exportItem) {
			throw new Error('Nested submenu fixture was not rendered')
		}
		const outsideParent = (child: HTMLElement, parent: HTMLElement) => {
			const childRect = child.getBoundingClientRect()
			const parentRect = parent.getBoundingClientRect()
			return child.dataset.side === 'right' ? childRect.left >= parentRect.right - 1
				: child.dataset.side === 'left' ? childRect.right <= parentRect.left + 1
					: false
		}

		rootTrigger.focus()
		rootTrigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
		await until(() => document.activeElement === tools, 'Root menu did not focus its first submenu trigger')
		if (tools.getAttribute('aria-expanded') !== 'false' || toolsContent.matches(':popover-open')) {
			throw new Error('defaultOpen submenu survived while its parent root was closed')
		}

		tools.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		await until(() => document.activeElement === share && toolsContent.matches(':popover-open'), 'First submenu did not open and focus after geometry commit')
		if (!outsideParent(toolsContent, rootContent)) throw new Error('Submenu collision policy constrained it inside the parent surface')
		share.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		await until(() => document.activeElement === leaf && shareContent.matches(':popover-open'), 'Second submenu level did not open')
		if (!outsideParent(shareContent, toolsContent)) throw new Error('Nested submenu collision policy constrained it inside the parent surface')

		leaf.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
		await until(() => document.activeElement === share && !shareContent.matches(':popover-open'), 'First Escape did not close only the deepest submenu')
		if (!toolsContent.matches(':popover-open')) throw new Error('Deep Escape closed its parent submenu')

		share.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
		await until(() => document.activeElement === tools && !toolsContent.matches(':popover-open'), 'Second Escape did not close the parent submenu')
		if (rootTrigger.getAttribute('aria-expanded') !== 'true') throw new Error('Second Escape closed the root menu')

		tools.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
		await until(() => rootTrigger.getAttribute('aria-expanded') === 'false', 'Third Escape did not close the root menu')
		if (document.activeElement !== rootTrigger) throw new Error('Root Escape did not restore trigger focus')

		rootTrigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
		await until(() => document.activeElement === tools, 'Root menu did not reopen for pointer dismissal')
		tools.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		await until(() => document.activeElement === share && toolsContent.matches(':popover-open'), 'Parent submenu did not reopen for pointer dismissal')
		share.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		await until(() => document.activeElement === leaf && shareContent.matches(':popover-open'), 'Child submenu did not reopen for pointer dismissal')

		exportItem.focus()
		exportItem.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		await until(() => !shareContent.matches(':popover-open'), 'Pointer inside parent did not close the child submenu')
		if (!toolsContent.matches(':popover-open') || rootTrigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Pointer inside parent closed more than the child submenu')
		}
		if (document.activeElement !== exportItem) throw new Error('Pointer branch pruning stole focus inside the parent submenu')

		share.focus()
		share.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		await until(() => document.activeElement === leaf && shareContent.matches(':popover-open'), 'Child submenu did not reopen before outside dismissal')
		outside.focus()
		outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		await until(() => rootTrigger.getAttribute('aria-expanded') === 'false', 'Pointer outside the cluster did not close the root')
		if (toolsContent.matches(':popover-open') || shareContent.matches(':popover-open')) {
			throw new Error('Pointer outside left a nested submenu open')
		}
		if (document.activeElement !== outside) throw new Error('Nested outside dismissal stole focus from its target')
	},
}
