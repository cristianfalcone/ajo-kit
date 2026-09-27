/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { frame, until, press } from './play'
import { ContextMenu, ContextMenuTrigger } from 'ajo-ui-playa/context-menu'
import {
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
} from 'ajo-ui-playa/menu'

export default {
	title: 'UI/Context Menu',
	component: ContextMenu,
	parameters: {
		docs: { description: 'Ajo context menu using the native contextmenu event, Popover API content, menu roles, keyboard activation, checkbox/radio items, and submenus.' },
		layout: 'centered',
	},
} satisfies Meta<typeof ContextMenu>

const targetClass = 'flex h-36 w-72 select-none items-center justify-center rounded-md border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

// Menu surfaces animate open (scale/opacity transition), so geometry
// assertions poll until placement and motion settle.

const openAndPositioned = (content: HTMLElement | null | undefined) => Boolean(
	content?.matches(':popover-open')
	&& content.dataset.state === 'open'
	&& content.dataset.placement
	&& getComputedStyle(content).visibility === 'visible',
)

const openContext = async (target: HTMLElement, x?: number, y?: number) => {
	const rect = target.getBoundingClientRect()
	target.dispatchEvent(new MouseEvent('contextmenu', {
		bubbles: true,
		button: 2,
		cancelable: true,
		clientX: x ?? rect.left + rect.width / 2,
		clientY: y ?? rect.top + rect.height / 2,
	}))
	const content = target.closest('[data-slot="context-menu"]')?.querySelector<HTMLElement>('[data-slot="menu-content"]')
	await until(() => openAndPositioned(content), 'Context menu did not finish its first visible geometry commit')
}

const closeContext = async (content: HTMLElement) => {
	press(content, 'Escape')
	await until(() => !content.matches(':popover-open'), 'Context menu did not close from Escape')
}

const BasicExample: Stateful = function* () {
	let action = 'none'
	const select = (next: string) => (_event: Event) => this.next(() => action = next)

	while (true) yield (
		<div class="grid gap-3">
			<ContextMenu>
				<ContextMenuTrigger id="basic-context-target" class={targetClass}>
					Right click here or press Shift+F10
				</ContextMenuTrigger>
				<MenuContent class="w-56">
					<MenuLabel>File</MenuLabel>
					<MenuGroup>
						<MenuItem textValue="Copy" onSelect={select('copy')}>
							<span class="i-lucide-copy size-4" />
							Copy
							<MenuShortcut>Cmd+C</MenuShortcut>
						</MenuItem>
						<MenuItem textValue="Duplicate" onSelect={select('duplicate')}>
							<span class="i-lucide-copy-plus size-4" />
							Duplicate
						</MenuItem>
						<MenuItem textValue="Rename" onSelect={select('rename')}>
							<span class="i-lucide-pencil size-4" />
							Rename
						</MenuItem>
					</MenuGroup>
					<MenuSeparator />
					<MenuItem disabled textValue="Archive">Archive</MenuItem>
					<MenuSeparator />
					<MenuItem textValue="Delete" variant="danger" onSelect={select('delete')}>
						<span class="i-lucide-trash-2 size-4" />
						Delete
					</MenuItem>
				</MenuContent>
			</ContextMenu>
			<p class="text-sm text-muted-foreground">Action: {action}</p>
		</div>
	)
}

const CheckboxExample: Stateful = function* () {
	let comments = true
	let minimap = false
	const setComments = (next: boolean) => this.next(() => comments = next)
	const setMinimap = (next: boolean) => this.next(() => minimap = next)

	while (true) yield (
		<div class="grid gap-3">
			<ContextMenu>
				<ContextMenuTrigger id="checkbox-context-target" class={targetClass}>
					Right click editor surface
				</ContextMenuTrigger>
				<MenuContent class="w-56">
					<MenuLabel>View</MenuLabel>
					<MenuSeparator />
					<MenuCheckboxItem checked={comments} onCheckedChange={setComments}>
						Show comments
					</MenuCheckboxItem>
					<MenuCheckboxItem checked={minimap} onCheckedChange={setMinimap}>
						Show minimap
					</MenuCheckboxItem>
					<MenuCheckboxItem checked disabled>
						Show gutter
					</MenuCheckboxItem>
				</MenuContent>
			</ContextMenu>
			<p class="text-sm text-muted-foreground">Comments: {comments ? 'on' : 'off'}; Minimap: {minimap ? 'on' : 'off'}</p>
		</div>
	)
}

const RadioExample: Stateful = function* () {
	let mode = 'comfortable'
	const setMode = (next: string) => this.next(() => mode = next)

	while (true) yield (
		<div class="grid gap-3">
			<ContextMenu>
				<ContextMenuTrigger id="radio-context-target" class={targetClass}>
					Right click workspace
				</ContextMenuTrigger>
				<MenuContent class="w-56">
					<MenuLabel>Density</MenuLabel>
					<MenuSeparator />
					<MenuRadioGroup value={mode} onValueChange={setMode}>
						<MenuRadioItem value="compact">Compact</MenuRadioItem>
						<MenuRadioItem value="comfortable">Comfortable</MenuRadioItem>
						<MenuRadioItem value="spacious">Spacious</MenuRadioItem>
					</MenuRadioGroup>
				</MenuContent>
			</ContextMenu>
			<p class="text-sm text-muted-foreground">Density: {mode}</p>
		</div>
	)
}

const RetargetExample: Stateful = function* () {
	let alternate = false
	let changes: boolean[] = []
	const swap = () => this.next(() => alternate = !alternate)
	const onOpenChange = (open: boolean) => {
		changes = [...changes, open]
		const output = (this as unknown as HTMLElement).querySelector<HTMLElement>('[data-context-changes]')
		if (output) output.dataset.contextChanges = changes.join(',')
	}

	while (true) yield (
		<div class="grid gap-3">
			<button id="context-outside-target" type="button" set:onclick={swap}>Swap invoker</button>
			<ContextMenu onOpenChange={onOpenChange}>
				{alternate
					? <ContextMenuTrigger key="second" id="retarget-context-b" class={targetClass}>Second invoker</ContextMenuTrigger>
					: <ContextMenuTrigger key="first" id="retarget-context-a" class={targetClass}>First invoker</ContextMenuTrigger>}
				<MenuContent key="content" class="w-56">
					<MenuItem>Open</MenuItem>
					<MenuItem>Rename</MenuItem>
				</MenuContent>
			</ContextMenu>
			<output data-context-changes={changes.join(',')} />
		</div>
	)
}

export const Basic: Story<typeof ContextMenu> = {
	render: () => <BasicExample />,
	play: async ({ canvas }) => {
		const target = canvas.querySelector<HTMLElement>('#basic-context-target')
		if (!target) throw new Error('Context menu trigger was not rendered')

		await openContext(target)

		const copy = canvas.querySelector<HTMLElement>('[data-slot="menu-item"][data-label="Copy"]')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		if (!copy || !content) throw new Error('Context menu content or Copy item was not rendered')
		if (!content.matches(':popover-open') || target.getAttribute('data-state') !== 'open') {
			throw new Error('Context menu did not open from contextmenu event')
		}

		const duplicate = canvas.querySelector<HTMLElement>('[data-slot="menu-item"][data-label="Duplicate"]')
		if (!duplicate) throw new Error('Context menu Duplicate item was not rendered')

		duplicate.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
		await frame(2)

		if (duplicate.dataset.highlighted !== 'true') {
			throw new Error('Context menu item did not highlight on pointer hover')
		}

		// Right-click over the open menu must not summon the browser's native
		// context menu.
		const overMenu = new MouseEvent('contextmenu', { bubbles: true, button: 2, cancelable: true })
		duplicate.dispatchEvent(overMenu)
		if (!overMenu.defaultPrevented) {
			throw new Error('contextmenu over the open menu was not prevented')
		}

		await closeContext(content)
		await openContext(target)

		// Pointer opens follow input modality: the surface itself takes focus
		// and no item carries a phantom keyboard highlight.
		const highlighted = Array.from(content.querySelectorAll<HTMLElement>('[data-item="menu"][data-highlighted="true"]'))
		if (highlighted.length !== 0) {
			throw new Error('Pointer reopen keyboard-highlighted a menu item')
		}
		if (document.activeElement !== content) {
			throw new Error('Pointer open did not focus the menu surface')
		}

		copy.click()
		await frame(2)

		if (!canvas.textContent?.includes('Action: copy') || target.getAttribute('data-state') !== 'closed' || document.activeElement !== target) {
			throw new Error('Context menu item did not select and close')
		}
	},
}

export const Keyboard: Story<typeof ContextMenu> = {
	render: () => <BasicExample />,
	play: async ({ canvas }) => {
		const target = canvas.querySelector<HTMLElement>('#basic-context-target')
		if (!target) throw new Error('Context menu trigger was not rendered')

		target.focus()
		const targetRect = target.getBoundingClientRect()
		target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'F10', shiftKey: true }))
		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		if (!content) throw new Error('Keyboard context content was not rendered')
		await until(() => openAndPositioned(content), 'Keyboard context menu did not commit visible geometry')

		const focused = document.activeElement as HTMLElement | null
		if (target.getAttribute('data-state') !== 'open' || focused?.dataset.label !== 'Copy') {
			throw new Error('Shift+F10 did not open Context Menu and focus the first item')
		}
		const contentRect = content.getBoundingClientRect()
		if (Math.abs(contentRect.left - targetRect.left) > 3 || Math.abs(contentRect.top - (targetRect.bottom + 2)) > 3) {
			throw new Error('Keyboard Context Menu did not use the invoker left/bottom point')
		}

		focused.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))
		await frame(2)

		if ((document.activeElement as HTMLElement | null)?.dataset.label !== 'Duplicate') {
			throw new Error('ArrowDown did not move focus to the next context menu item')
		}

		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
		await frame(2)

		if (!canvas.textContent?.includes('Action: duplicate') || target.getAttribute('data-state') !== 'closed') {
			throw new Error('Enter did not activate the focused context menu item')
		}
	},
}

export const Retargeting: Story = {
	render: () => <RetargetExample />,
	play: async ({ canvas }) => {
		const first = canvas.querySelector<HTMLElement>('#retarget-context-a')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]') as HTMLElement & {
			showPopover: (options?: { source?: HTMLElement }) => void
		}
		const outside = canvas.querySelector<HTMLElement>('#context-outside-target')
		const output = canvas.querySelector<HTMLElement>('[data-context-changes]')
		if (!first || !content || !outside || !output) throw new Error('Retargeting ContextMenu fixture was not rendered')
		const stateChanges = () => output.dataset.contextChanges

		const sources: Array<HTMLElement | undefined> = []
		const show = content.showPopover.bind(content)
		content.showPopover = options => {
			sources.push(options?.source)
			show(options)
		}
		const firstRect = first.getBoundingClientRect()
		const firstX = firstRect.left + 24
		const firstY = firstRect.top + 24
		await openContext(first, firstX, firstY)
		if (document.activeElement !== content || sources[0] !== first || stateChanges() !== 'true') {
			throw new Error('Initial pointer invocation did not commit focus/source/state together')
		}

		const nextX = firstX + 48
		const nextY = firstY + 32
		await openContext(first, nextX, nextY)
		await until(() => {
			const rect = content.getBoundingClientRect()
			return Math.abs(rect.left - nextX) <= 3 && Math.abs(rect.top - (nextY + 2)) <= 3
		}, 'Same-invoker point update did not commit its latest coordinates')
		if (sources.length !== 1 || stateChanges() !== 'true') {
			throw new Error('Same-invoker update reopened native state or emitted another open transition')
		}

		outside.click()
		await frame(2)
		const second = canvas.querySelector<HTMLElement>('#retarget-context-b')
		if (!second || second === first) throw new Error('Retarget fixture did not mount a fresh invoker')
		const secondRect = second.getBoundingClientRect()
		await openContext(second, secondRect.left + 30, secondRect.top + 28)
		await until(() => sources.length === 2, 'Invoker change did not refresh the native Popover source')
		if (sources[1] !== second || stateChanges() !== 'true' || content.getAttribute('aria-labelledby') !== second.id) {
			throw new Error('Invoker retarget did not preserve semantic state/source/ARIA')
		}

		await closeContext(content)
		await frame(2)
		if (document.activeElement !== second || stateChanges() !== 'true,false') {
			throw new Error('Escape did not restore the current real invoker exactly once')
		}

		await openContext(second)
		outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
		outside.focus()
		await until(() => !content.matches(':popover-open'), 'Outside pointer did not close ContextMenu')
		await frame(2)
		if (document.activeElement !== outside || stateChanges() !== 'true,false,true,false') {
			throw new Error('Outside dismissal restored the invoker or desynchronized open state')
		}
	},
}

export const Checkboxes: Story = {
	render: () => <CheckboxExample />,
	play: async ({ canvas }) => {
		const target = canvas.querySelector<HTMLElement>('#checkbox-context-target')
		if (!target) throw new Error('Checkbox context target was not rendered')

		await openContext(target)

		const minimap = canvas.querySelector<HTMLElement>('[data-slot="menu-checkbox-item"][data-label="Show minimap"]')
		if (!minimap) throw new Error('Context checkbox item was not rendered')

		minimap.click()
		await frame(2)

		if (minimap.getAttribute('aria-checked') !== 'true' || !canvas.textContent?.includes('Minimap: on')) {
			throw new Error('Context checkbox item did not toggle on')
		}
	},
}

export const RadioGroup: Story = {
	render: () => <RadioExample />,
	play: async ({ canvas }) => {
		const target = canvas.querySelector<HTMLElement>('#radio-context-target')
		if (!target) throw new Error('Radio context target was not rendered')

		await openContext(target)

		const spacious = canvas.querySelector<HTMLElement>('[data-slot="menu-radio-item"][data-label="Spacious"]')
		if (!spacious) throw new Error('Context radio item was not rendered')

		spacious.click()
		await frame(2)

		if (spacious.getAttribute('aria-checked') !== 'true' || !canvas.textContent?.includes('Density: spacious')) {
			throw new Error('Context radio item did not select Spacious')
		}
	},
}

export const Submenu: Story = {
	render: () => (
		<ContextMenu>
			<ContextMenuTrigger id="submenu-context-target" class={targetClass}>
				Right click project
			</ContextMenuTrigger>
			<MenuContent class="w-56">
				<MenuItem>Open</MenuItem>
				<MenuSub>
					<MenuSubTrigger textValue="Share">Share</MenuSubTrigger>
					<MenuSubContent>
						<MenuItem>Email link</MenuItem>
						<MenuItem>Copy link</MenuItem>
						<MenuSeparator />
						<MenuItem>Manage access</MenuItem>
					</MenuSubContent>
				</MenuSub>
				<MenuSeparator />
				<MenuItem variant="danger">Remove</MenuItem>
			</MenuContent>
		</ContextMenu>
	),
	play: async ({ canvas }) => {
		const target = canvas.querySelector<HTMLElement>('#submenu-context-target')
		if (!target) throw new Error('Submenu context target was not rendered')

		await openContext(target)

		const subTrigger = canvas.querySelector<HTMLElement>('[data-slot="menu-sub-trigger"]')
		const subContent = canvas.querySelector<HTMLElement>('[data-slot="menu-sub-content"]')
		const email = canvas.querySelector<HTMLElement>('[data-slot="menu-sub-content"] [data-label="Email link"]')
		const remove = canvas.querySelector<HTMLElement>('[data-slot="menu-item"][data-label="Remove"]')
		if (!subTrigger || !subContent || !email || !remove) throw new Error('Context submenu trigger, content, or item was not rendered')

		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		if (!content) throw new Error('Context submenu parent content was not rendered')

		subTrigger.dispatchEvent(new MouseEvent('mouseenter'))
		await frame(2)

		if (subTrigger.getAttribute('aria-expanded') !== 'true' || !subContent.matches(':popover-open')) {
			throw new Error('Hover did not open the context submenu')
		}

		await until(() => {
			const parentRect = content.getBoundingClientRect()
			const subRect = subContent.getBoundingClientRect()
			return content.scrollHeight <= content.clientHeight + 1 &&
				subRect.left >= parentRect.right - 2 &&
				subRect.right <= window.innerWidth - 4
		}, 'Context submenu was clipped by the parent menu instead of opening beside it')

		remove.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
		await frame(2)

		const hoverHighlighted = Array.from(content.querySelectorAll<HTMLElement>('[data-item="menu"][data-highlighted="true"]'))
		if (subTrigger.getAttribute('aria-expanded') !== 'false' || subContent.matches(':popover-open') || hoverHighlighted.length !== 1 || hoverHighlighted[0]?.dataset.label !== 'Remove') {
			throw new Error('Hovering a sibling item did not close the context submenu and move highlight')
		}

		await closeContext(content)
		await openContext(target)

		// Pointer reopen: submenu reset and no phantom keyboard highlight.
		const highlighted = Array.from(content.querySelectorAll<HTMLElement>('[data-item="menu"][data-highlighted="true"]'))
		if (subTrigger.getAttribute('aria-expanded') !== 'false' || subContent.matches(':popover-open') || highlighted.length !== 0) {
			throw new Error('Context submenu stayed open or highlighted after parent close and reopen')
		}
	},
}

export const DisabledFirstItem: Story = {
	render: () => (
		<ContextMenu>
			<ContextMenuTrigger id="disabled-first-context-target" class={targetClass}>
				Right click the archived file
			</ContextMenuTrigger>
			<MenuContent class="w-56">
				<MenuItem disabled textValue="Restore">Restore</MenuItem>
				<MenuItem textValue="Duplicate">Duplicate</MenuItem>
				<MenuItem textValue="Delete" variant="danger">Delete</MenuItem>
			</MenuContent>
		</ContextMenu>
	),
	play: async ({ canvas }) => {
		const target = canvas.querySelector<HTMLElement>('#disabled-first-context-target')
		if (!target) throw new Error('Disabled-first context target was not rendered')

		// Keyboard open (pointer opens focus the surface, not the first item).
		target.focus()
		press(target, 'F10', { shiftKey: true })
		await frame(2)

		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		const restore = canvas.querySelector<HTMLElement>('[data-slot="menu-item"][data-label="Restore"]')
		const duplicate = canvas.querySelector<HTMLElement>('[data-slot="menu-item"][data-label="Duplicate"]')
		if (!content || !restore || !duplicate) throw new Error('Disabled-first context content or item was not rendered')

		// Focus policy: disabled items render but stay out of the keyboard
		// order (Radix/React Aria default), matching pointer behavior — the
		// first ENABLED item takes focus on keyboard open.
		if (document.activeElement !== duplicate || duplicate.dataset.highlighted !== 'true') {
			throw new Error('First enabled item was not focused on keyboard open')
		}
		if (restore.dataset.highlighted === 'true') {
			throw new Error('Disabled item must not be highlighted by keyboard navigation')
		}

		// Relationship attrs live on the real trigger, not a fake hidden button.
		if (target.getAttribute('aria-expanded') !== 'true' || target.getAttribute('aria-controls') !== content.id) {
			throw new Error('Context menu trigger is missing aria-expanded/aria-controls wiring')
		}

		if (content.getAttribute('aria-labelledby') !== target.id) {
			throw new Error('Context menu surface is not labelled by its real invoker')
		}
	},
}

export const LongList: Story = {
	render: () => (
		<ContextMenu>
			<ContextMenuTrigger id="long-list-context-target" class={targetClass}>
				Right click for a long menu
			</ContextMenuTrigger>
			<MenuContent class="w-56">
				{Array.from({ length: 30 }, (_, index) => {
					const label = `Item ${index + 1}`
					return <MenuItem textValue={label}>{label}</MenuItem>
				})}
			</MenuContent>
		</ContextMenu>
	),
	play: async ({ canvas }) => {
		const target = canvas.querySelector<HTMLElement>('#long-list-context-target')
		if (!target) throw new Error('Long-list context target was not rendered')

		// Stay just inside the profile's 4px hidden-reference padding while
		// still forcing both axes through collision handling.
		await openContext(target, window.innerWidth - 8, window.innerHeight - 8)

		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		if (!content || !openAndPositioned(content)) throw new Error('Long-list context menu did not open')
		await until(() => {
			const rect = content.getBoundingClientRect()
			return rect.left >= 3
				&& rect.top >= 3
				&& rect.right <= window.innerWidth - 3
				&& rect.bottom <= window.innerHeight - 3
		}, 'Virtual edge point did not keep ContextMenu inside the viewport')

		await closeContext(content)
		await openContext(target)

		// The shared content token uses the available placement height while
		// keeping long floating menus within compact viewport bounds.
		await until(() => {
			const maxHeight = Number.parseFloat(getComputedStyle(content).maxHeight)
			return Number.isFinite(maxHeight) && maxHeight <= 324
		}, 'Long-list context menu max-height is not capped')
		if (content.getBoundingClientRect().height > 324) {
			throw new Error('Long-list context menu rendered taller than its height cap')
		}
		if (content.scrollHeight <= content.clientHeight) {
			throw new Error('Long-list context menu did not scroll inside its height cap')
		}

		await closeContext(content)
	},
}

export const Shortcuts: Story = {
	render: () => (
		<ContextMenu>
			<ContextMenuTrigger class={targetClass}>
				Right click document
			</ContextMenuTrigger>
			<MenuContent class="w-56">
				<MenuItem>
					Copy
					<MenuShortcut>Cmd+C</MenuShortcut>
				</MenuItem>
				<MenuItem>
					Paste
					<MenuShortcut>Cmd+V</MenuShortcut>
				</MenuItem>
				<MenuSeparator />
				<MenuItem variant="danger">
					Delete
					<MenuShortcut>Del</MenuShortcut>
				</MenuItem>
			</MenuContent>
		</ContextMenu>
	),
}
