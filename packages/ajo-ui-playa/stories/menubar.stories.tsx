/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { frame, until, press } from './play'
import {
	MenuCheckboxItem,
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
import { Menubar, MenubarContent, MenubarMenu, MenubarTrigger } from 'ajo-ui-playa/menubar'

export default {
	title: 'UI/Menubar',
	component: Menubar,
	parameters: {
		docs: { description: 'Ajo menubar using Popover API menu content, persistent horizontal triggers, roving trigger focus, checkbox/radio items, and submenus.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Menubar>

const AppMenubar = ({ onSelect }: { onSelect?: (action: string) => (event: Event) => void }) => (
	<Menubar aria-label="Application menu">
		<MenubarMenu value="file">
			<MenubarTrigger id="file-menubar-trigger">File</MenubarTrigger>
			<MenubarContent class="w-56">
				<MenuGroup>
					<MenuItem textValue="New Tab" onSelect={onSelect?.('new-tab')}>
						<span class="i-lucide-file-plus size-4" />
						New Tab
						<MenuShortcut>Ctrl+T</MenuShortcut>
					</MenuItem>
					<MenuItem textValue="New Window" onSelect={onSelect?.('new-window')}>
						<span class="i-lucide-app-window size-4" />
						New Window
					</MenuItem>
				</MenuGroup>
				<MenuSeparator />
				<MenuGroup>
					<MenuItem textValue="Share" onSelect={onSelect?.('share')}>Share</MenuItem>
					<MenuItem textValue="Print" onSelect={onSelect?.('print')}>Print</MenuItem>
				</MenuGroup>
				<MenuSeparator />
				<MenuItem disabled textValue="Import">Import</MenuItem>
				<MenuItem textValue="Delete" variant="danger" onSelect={onSelect?.('delete')}>
					<span class="i-lucide-trash-2 size-4" />
					Delete
				</MenuItem>
			</MenubarContent>
		</MenubarMenu>
		<MenubarMenu value="edit">
			<MenubarTrigger id="edit-menubar-trigger">Edit</MenubarTrigger>
			<MenubarContent class="w-48">
				<MenuItem textValue="Undo" onSelect={onSelect?.('undo')}>
					Undo
					<MenuShortcut>Ctrl+Z</MenuShortcut>
				</MenuItem>
				<MenuItem textValue="Redo" onSelect={onSelect?.('redo')}>
					Redo
					<MenuShortcut>Ctrl+Shift+Z</MenuShortcut>
				</MenuItem>
				<MenuSeparator />
				<MenuItem textValue="Cut" onSelect={onSelect?.('cut')}>Cut</MenuItem>
				<MenuItem textValue="Copy" onSelect={onSelect?.('copy')}>Copy</MenuItem>
				<MenuItem textValue="Paste" onSelect={onSelect?.('paste')}>Paste</MenuItem>
			</MenubarContent>
		</MenubarMenu>
		<MenubarMenu value="view">
			<MenubarTrigger id="view-menubar-trigger">View</MenubarTrigger>
			<MenubarContent class="w-52">
				<MenuCheckboxItem checked>Show toolbar</MenuCheckboxItem>
				<MenuCheckboxItem>Show sidebar</MenuCheckboxItem>
			</MenubarContent>
		</MenubarMenu>
	</Menubar>
)

const BasicExample: Stateful = function* () {
	let action = 'none'
	const select = (next: string) => (_event: Event) => this.next(() => action = next)

	while (true) yield (
		<div class="grid gap-3">
			<AppMenubar onSelect={select} />
			<p class="text-sm text-muted-foreground">Action: {action}</p>
		</div>
	)
}

const CheckboxExample: Stateful = function* () {
	let toolbar = true
	let sidebar = false
	const setToolbar = (next: boolean) => this.next(() => toolbar = next)
	const setSidebar = (next: boolean) => this.next(() => sidebar = next)

	while (true) yield (
		<div class="grid gap-3">
			<Menubar aria-label="View menu">
				<MenubarMenu value="view">
					<MenubarTrigger id="checkbox-menubar-trigger">View</MenubarTrigger>
					<MenubarContent class="w-56">
						<MenuLabel>Panels</MenuLabel>
						<MenuSeparator />
						<MenuCheckboxItem checked={toolbar} onCheckedChange={setToolbar}>
							Show toolbar
						</MenuCheckboxItem>
						<MenuCheckboxItem checked={sidebar} onCheckedChange={setSidebar}>
							Show sidebar
						</MenuCheckboxItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
			<p class="text-sm text-muted-foreground">Toolbar: {toolbar ? 'on' : 'off'}; Sidebar: {sidebar ? 'on' : 'off'}</p>
		</div>
	)
}

const RadioExample: Stateful = function* () {
	let profile = 'personal'
	const setProfile = (next: string) => this.next(() => profile = next)

	while (true) yield (
		<div class="grid gap-3">
			<Menubar aria-label="Profiles menu">
				<MenubarMenu value="profiles">
					<MenubarTrigger id="radio-menubar-trigger">Profiles</MenubarTrigger>
					<MenubarContent class="w-56">
						<MenuLabel inset>Switch Profile</MenuLabel>
						<MenuSeparator />
						<MenuRadioGroup value={profile} onValueChange={setProfile}>
							<MenuRadioItem value="personal">Personal</MenuRadioItem>
							<MenuRadioItem value="work">Work</MenuRadioItem>
							<MenuRadioItem value="guest">Guest</MenuRadioItem>
						</MenuRadioGroup>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
			<p class="text-sm text-muted-foreground">Profile: {profile}</p>
		</div>
	)
}

const RejectedCloseExample: Stateful = function* () {
	let changes = 0
	const reject = (_next: string) => this.next(() => changes++)

	while (true) yield (
		<div class="grid gap-3">
			<Menubar value="file" onValueChange={reject} aria-label="Controlled rejection menu">
				<MenubarMenu value="file">
					<MenubarTrigger id="rejected-close-menubar-trigger">File</MenubarTrigger>
					<MenubarContent>
						<MenuItem textValue="Persistent action">Persistent action</MenuItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
			<p data-rejected-close-count>{changes}</p>
		</div>
	)
}

export const Basic: Story<typeof Menubar> = {
	render: () => <BasicExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#file-menubar-trigger')
		if (!trigger) throw new Error('File menubar trigger was not rendered')

		trigger.click()
		await frame(2)

		const item = canvas.querySelector<HTMLElement>('[data-slot="menu-item"][data-label="New Tab"]')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menubar-content"]')
		if (!item || !content) throw new Error('Menubar content or New Tab item was not rendered')
		if (trigger.getAttribute('aria-expanded') !== 'true' || !content.matches(':popover-open')) {
			throw new Error('Menubar did not open File menu from trigger click')
		}
		const triggerRect = trigger.getBoundingClientRect()
		const contentRect = content.getBoundingClientRect()
		if (content.dataset.placement !== 'bottom-start') {
			throw new Error(`Menubar default placement was ${content.dataset.placement ?? 'missing'}, expected bottom-start`)
		}
		if (Math.abs(contentRect.top - triggerRect.bottom - 8) > 1.5) {
			throw new Error('Menubar default profile did not preserve its 8px gap')
		}
		if (Math.abs(contentRect.left - triggerRect.left + 4) > 1.5) {
			throw new Error('Menubar default profile did not preserve its private -4px cross-axis correction')
		}

		item.click()
		await frame(2)

		if (!canvas.textContent?.includes('Action: new-tab') || trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Menubar item did not select and close')
		}
	},
}

export const Keyboard: Story<typeof Menubar> = {
	render: () => <BasicExample />,
	play: async ({ canvas }) => {
		const file = canvas.querySelector<HTMLButtonElement>('#file-menubar-trigger')
		const edit = canvas.querySelector<HTMLButtonElement>('#edit-menubar-trigger')
		const view = canvas.querySelector<HTMLButtonElement>('#view-menubar-trigger')
		if (!file || !edit || !view) throw new Error('Menubar triggers were not rendered')

		file.focus()
		press(file, 'ArrowRight')
		await frame(2)

		if (document.activeElement !== edit) {
			throw new Error('ArrowRight did not move focus to the next menubar trigger')
		}

		press(edit, 'ArrowDown')
		await frame(2)

		const focused = document.activeElement as HTMLElement | null
		if (edit.getAttribute('aria-expanded') !== 'true' || focused?.dataset.label !== 'Undo') {
			throw new Error('ArrowDown did not open Edit menu and focus the first item')
		}

		press(focused, 'ArrowDown')
		await frame(2)

		if ((document.activeElement as HTMLElement | null)?.dataset.label !== 'Redo') {
			throw new Error('ArrowDown did not move within Menubar content')
		}

		// ArrowRight from inside an open menu moves to the adjacent menu (APG)
		// with its first item focused only after current Floating UI geometry.
		const firstViewItem = canvas.querySelector<HTMLElement>('[data-slot="menu-checkbox-item"][data-label="Show toolbar"]')
		const viewContent = firstViewItem?.closest<HTMLElement>('[data-slot="menubar-content"]')
		let focusSawCommittedGeometry = false
		const observeFocus = () => {
			focusSawCommittedGeometry = Boolean(
				viewContent?.matches(':popover-open')
				&& viewContent.dataset.state === 'open'
				&& viewContent.dataset.placement,
			)
		}
		firstViewItem?.addEventListener('focus', observeFocus, { once: true })
		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		await frame(2)

		if (view.getAttribute('aria-expanded') !== 'true' || edit.getAttribute('aria-expanded') !== 'false') {
			throw new Error('ArrowRight inside the Edit menu did not move to the View menu')
		}
		if (document.activeElement !== firstViewItem) {
			throw new Error('Adjacent menu did not focus its first item')
		}
		if (!focusSawCommittedGeometry) {
			throw new Error('Adjacent menu focused before its current Floating UI geometry commit')
		}
		if ((document.activeElement as HTMLElement | null)?.dataset.highlighted !== 'true') {
			throw new Error('Adjacent menu entry did not register the item highlight')
		}

		// Tab from inside an open menu closes it.
		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' }))
		await frame(2)

		if (view.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Tab inside an open menu did not close the menubar')
		}

		// Tab while focus sits ON an open trigger also closes.
		view.click()
		await frame(2)
		view.focus()
		if (view.getAttribute('aria-expanded') !== 'true') throw new Error('View menu did not reopen from click')
		press(view, 'Tab')
		await frame(2)

		if (view.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Tab on an open trigger left the menu open')
		}
	},
}

export const KeyboardPrecommitTransfer: Story<typeof Menubar> = {
	render: () => <AppMenubar />,
	play: async ({ canvas }) => {
		const file = canvas.querySelector<HTMLButtonElement>('#file-menubar-trigger')
		const edit = canvas.querySelector<HTMLButtonElement>('#edit-menubar-trigger')
		const view = canvas.querySelector<HTMLButtonElement>('#view-menubar-trigger')
		const undo = canvas.querySelector<HTMLElement>('[data-label="Undo"]')
		const firstFileItem = canvas.querySelector<HTMLElement>('[data-label="New Tab"]')
		const fileContent = firstFileItem?.closest<HTMLElement>('[data-slot="menubar-content"]')
		if (!file || !edit || !view || !undo || !firstFileItem || !fileContent) {
			throw new Error('Keyboard precommit transfer fixture was not rendered')
		}

		edit.focus()
		press(edit, 'ArrowDown')
		await until(() => document.activeElement === undo, 'Edit menu did not establish keyboard focus')

		let focusSawCommittedGeometry = false
		firstFileItem.addEventListener('focus', () => {
			focusSawCommittedGeometry = Boolean(
				fileContent.matches(':popover-open')
				&& fileContent.dataset.state === 'open'
				&& fileContent.dataset.placement,
			)
		}, { once: true })

		// A→B begins while focus is in A. Before B can commit, a second row
		// arrow on trigger B transfers the same keyboard-entry intent to C.
		press(undo, 'ArrowRight')
		press(view, 'ArrowRight')
		await until(
			() => fileContent.dataset.state === 'open' && document.activeElement === firstFileItem,
			'Final File menu did not open and focus its first item',
		)

		if (file.getAttribute('aria-expanded') !== 'true'
			|| edit.getAttribute('aria-expanded') !== 'false'
			|| view.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Keyboard precommit transfer did not settle on only the final menu')
		}
		if (document.activeElement !== firstFileItem) {
			throw new Error('Keyboard precommit transfer did not focus the final menu first item')
		}
		if (!focusSawCommittedGeometry) {
			throw new Error('Keyboard precommit transfer focused before final geometry committed')
		}

		press(firstFileItem, 'Escape')
		await until(() => file.getAttribute('aria-expanded') === 'false', 'File menu did not close before Home transfer')
		edit.focus()
		press(edit, 'ArrowDown')
		await until(() => document.activeElement === undo, 'Edit menu did not reopen for Home transfer')

		let homeFocusSawCommittedGeometry = false
		firstFileItem.addEventListener('focus', () => {
			homeFocusSawCommittedGeometry = Boolean(
				fileContent.matches(':popover-open')
				&& fileContent.dataset.state === 'open'
				&& fileContent.dataset.placement,
			)
		}, { once: true })
		press(undo, 'ArrowRight')
		press(view, 'Home')
		await until(
			() => file.getAttribute('aria-expanded') === 'true' && document.activeElement === firstFileItem,
			'Home did not transfer pending keyboard entry to the final menu',
		)
		if (!homeFocusSawCommittedGeometry) {
			throw new Error('Home transfer focused before final geometry committed')
		}
	},
}

export const GeometryOverride: Story<typeof Menubar> = {
	render: () => (
		<Menubar aria-label="Placement override menu" gap={10} placement="top-end">
			<MenubarMenu value="tools">
				<MenubarTrigger id="override-menubar-trigger">Tools</MenubarTrigger>
				<MenubarContent class="w-48">
					<MenuItem>Options</MenuItem>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#override-menubar-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menubar-content"]')
		if (!trigger || !content) throw new Error('Override menubar did not render')

		trigger.click()
		await frame(2)

		const triggerRect = trigger.getBoundingClientRect()
		if (content.dataset.placement !== 'top-end') {
			throw new Error(`Menubar root placement override resolved to ${content.dataset.placement ?? 'missing'}`)
		}
		const bottom = Number.parseFloat(content.style.top) + content.offsetHeight
		const right = Number.parseFloat(content.style.left) + content.offsetWidth
		if (Math.abs(triggerRect.top - bottom - 10) > 1.5) {
			throw new Error('Menubar root gap override was not committed')
		}
		if (Math.abs(right - triggerRect.right + 4) > 1.5) {
			throw new Error('Menubar override lost its private -4px cross-axis correction')
		}
	},
}

export const RapidSwitching: Story<typeof Menubar> = {
	render: () => <AppMenubar />,
	play: async ({ canvas }) => {
		const file = canvas.querySelector<HTMLButtonElement>('#file-menubar-trigger')
		const edit = canvas.querySelector<HTMLButtonElement>('#edit-menubar-trigger')
		const view = canvas.querySelector<HTMLButtonElement>('#view-menubar-trigger')
		const undo = canvas.querySelector<HTMLElement>('[data-label="Undo"]')
		const firstViewItem = canvas.querySelector<HTMLElement>('[data-label="Show toolbar"]')
		if (!file || !edit || !view || !undo || !firstViewItem) throw new Error('Rapid-switch menubar did not render')

		edit.focus()
		press(edit, 'ArrowDown')
		await frame(2)
		if (document.activeElement !== undo) throw new Error('Edit menu did not establish keyboard focus')

		// Start a keyboard move to View, then supersede it with pointer follow
		// before View can commit geometry. The stale intent must never focus View.
		press(undo, 'ArrowRight')
		file.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }))
		await frame(2)

		if (file.getAttribute('aria-expanded') !== 'true' || view.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Rapid keyboard/pointer switch did not settle on File')
		}
		view.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }))
		await frame(2)

		if (view.getAttribute('aria-expanded') !== 'true' || file.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Hover follow did not settle on View')
		}
		if (document.activeElement === firstViewItem || firstViewItem.dataset.highlighted === 'true') {
			throw new Error('Stale adjacent-menu intent focused an item during pointer follow')
		}
	},
}

export const EdgeScrollDismissal: Story<typeof Menubar> = {
	render: () => (
		<div class="fixed right-1 top-20 grid gap-2">
			<div id="menubar-scrollport" class="h-40 w-80 overflow-auto rounded-md border">
				<div class="h-12" />
				<div class="flex justify-end">
					<Menubar aria-label="Edge menu">
						<MenubarMenu value="edge">
							<MenubarTrigger id="edge-menubar-trigger">Edge</MenubarTrigger>
							<MenubarContent class="w-72">
								<MenuItem>First edge action</MenuItem>
								<MenuItem>Second edge action</MenuItem>
							</MenubarContent>
						</MenubarMenu>
					</Menubar>
				</div>
				<div class="h-48" />
			</div>
			<button id="menubar-outside" type="button">Outside target</button>
		</div>
	),
	play: async ({ canvas }) => {
		const scroller = canvas.querySelector<HTMLElement>('#menubar-scrollport')
		const outside = canvas.querySelector<HTMLButtonElement>('#menubar-outside')
		const trigger = canvas.querySelector<HTMLButtonElement>('#edge-menubar-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menubar-content"]')
		if (!scroller || !outside || !trigger || !content) throw new Error('Edge Menubar fixture was not rendered')

		trigger.click()
		await until(
			() => content.dataset.state === 'open' && Boolean(content.dataset.placement),
			'Edge Menubar did not commit geometry',
		)
		const initialContent = content.getBoundingClientRect()
		if (initialContent.right > innerWidth - 3) {
			throw new Error(`Menubar shift policy allowed content to escape the viewport edge (${initialContent.right}px > ${innerWidth - 3}px, ${content.dataset.placement ?? 'missing'})`)
		}

		scroller.scrollTop = 20
		await until(
			() => Math.abs(content.getBoundingClientRect().top - initialContent.top) > 10,
			'Menubar did not follow its trigger during ancestor scroll',
		)
		const movedTrigger = trigger.getBoundingClientRect()
		const movedContent = content.getBoundingClientRect()
		const attachedGap = content.dataset.side === 'top'
			? movedTrigger.top - movedContent.bottom
			: movedContent.top - movedTrigger.bottom
		if (Math.abs(attachedGap - 8) > 2) {
			throw new Error(`Menubar lost its 8px trigger attachment during scroll autoUpdate (${attachedGap}px)`)
		}

		outside.focus()
		outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
		await until(() => !content.matches(':popover-open'), 'Outside pointerdown did not dismiss Menubar')
		if (trigger.getAttribute('aria-expanded') !== 'false' || document.activeElement !== outside) {
			throw new Error('Menubar outside dismissal left state open or stole target focus')
		}
	},
}

export const NestedOwnership: Story<typeof Menubar> = {
	render: () => (
		<Menubar aria-label="Outer menu">
			<MenubarMenu value="outer-file">
				<MenubarTrigger id="outer-file-trigger">File</MenubarTrigger>
				<MenubarContent>
					<MenuItem>Outer action</MenuItem>
					<Menubar aria-label="Inner menu">
						<MenubarMenu value="inner-one">
							<MenubarTrigger id="inner-one-trigger">Inner One</MenubarTrigger>
							<MenubarContent><MenuItem>Inner first</MenuItem></MenubarContent>
						</MenubarMenu>
						<MenubarMenu value="inner-two">
							<MenubarTrigger id="inner-two-trigger">Inner Two</MenubarTrigger>
							<MenubarContent><MenuItem>Inner second</MenuItem></MenubarContent>
						</MenubarMenu>
					</Menubar>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu value="outer-edit">
				<MenubarTrigger id="outer-edit-trigger">Edit</MenubarTrigger>
				<MenubarContent><MenuItem>Outer edit action</MenuItem></MenubarContent>
			</MenubarMenu>
		</Menubar>
	),
	play: async ({ canvas }) => {
		const outerFile = canvas.querySelector<HTMLButtonElement>('#outer-file-trigger')
		const outerEdit = canvas.querySelector<HTMLButtonElement>('#outer-edit-trigger')
		const innerOne = canvas.querySelector<HTMLButtonElement>('#inner-one-trigger')
		const innerTwo = canvas.querySelector<HTMLButtonElement>('#inner-two-trigger')
		const outerFileContent = canvas.querySelector<HTMLElement>('[data-slot="menubar-content"][aria-labelledby="outer-file-trigger"]')
		if (!outerFile || !outerEdit || !innerOne || !innerTwo || !outerFileContent) throw new Error('Nested Menubar ownership fixture was not rendered')

		outerFile.focus()
		press(outerFile, 'ArrowRight')
		if (document.activeElement !== outerEdit) {
			throw new Error('Outer Menubar ArrowRight entered a nested Menubar trigger row')
		}
		press(outerEdit, 'i')
		if (document.activeElement !== outerEdit) {
			throw new Error('Outer Menubar typeahead matched a nested Menubar trigger')
		}

		outerFile.click()
		await until(() => outerFileContent.matches(':popover-open'), 'Outer menu did not open')
		outerFile.focus()
		press(outerFile, 'ArrowRight')
		if (document.activeElement !== outerEdit) {
			throw new Error('Visible nested Menubar contaminated the outer trigger order')
		}
		press(outerEdit, 'i')
		if (document.activeElement !== outerEdit) {
			throw new Error('Visible nested Menubar contaminated outer typeahead')
		}
		outerFile.click()
		await until(() => outerFileContent.matches(':popover-open'), 'Outer menu did not reopen for inner navigation')
		innerOne.click()
		await until(() => innerOne.getAttribute('aria-expanded') === 'true', 'Inner menu did not open')
		innerOne.focus()
		press(innerOne, 'ArrowRight')
		if (document.activeElement !== innerTwo) {
			const active = document.activeElement as HTMLElement | null
			throw new Error(`Inner Menubar did not retain its own trigger navigation (${active?.id ?? active?.dataset.label ?? active?.tagName ?? 'missing'})`)
		}
		press(innerTwo, 'Tab')
		await frame(2)
		if (outerFile.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Nested Menubar Tab was processed by the outer Menubar listener')
		}
	},
}

export const ControlledCloseRejection: Story<typeof Menubar> = {
	render: () => <RejectedCloseExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#rejected-close-menubar-trigger')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menubar-content"]')
		const item = canvas.querySelector<HTMLElement>('[data-label="Persistent action"]')
		const count = canvas.querySelector<HTMLElement>('[data-rejected-close-count]')
		if (!trigger || !content || !item || !count) throw new Error('Controlled Menubar rejection fixture was not rendered')

		await until(() => content.matches(':popover-open') && Boolean(content.dataset.placement), 'Controlled Menubar did not open')
		item.focus()
		press(item, 'Escape')
		await until(() => count.textContent === '1', 'Controlled Menubar did not request its close')
		await frame(2)

		const currentItem = canvas.querySelector<HTMLElement>('[data-label="Persistent action"]')
		if (!content.matches(':popover-open') || trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Rejected controlled close left Menubar visually closed')
		}
		if (document.activeElement !== currentItem) {
			const active = document.activeElement as HTMLElement | null
			throw new Error(`Rejected controlled close restored focus outside the still-open menu (${active?.id ?? active?.dataset.label ?? active?.tagName ?? 'missing'})`)
		}
	},
}

export const DisabledFirst: Story = {
	render: () => (
		<Menubar aria-label="Partially disabled menu">
			<MenubarMenu value="archive" disabled>
				<MenubarTrigger id="disabled-menubar-trigger">Archive</MenubarTrigger>
				<MenubarContent>
					<MenuItem>Restore</MenuItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu value="tools">
				<MenubarTrigger id="enabled-menubar-trigger">Tools</MenubarTrigger>
				<MenubarContent>
					<MenuItem>Options</MenuItem>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	),
	play: async ({ canvas }) => {
		await frame(2)
		const enabled = canvas.querySelector<HTMLButtonElement>('#enabled-menubar-trigger')
		if (!enabled) throw new Error('Enabled menubar trigger was not rendered')

		// The single tab stop lands on the first enabled trigger, not the
		// disabled one (which would make the whole menubar keyboard-unreachable).
		if (enabled.tabIndex !== 0) {
			throw new Error('First enabled trigger did not hold the menubar tab stop')
		}
	},
}

export const Checkboxes: Story = {
	render: () => <CheckboxExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#checkbox-menubar-trigger')
		if (!trigger) throw new Error('Checkbox menubar trigger was not rendered')

		trigger.click()
		await frame(2)

		const sidebar = canvas.querySelector<HTMLElement>('[data-slot="menu-checkbox-item"][data-label="Show sidebar"]')
		if (!sidebar) throw new Error('Menubar checkbox item was not rendered')

		sidebar.click()
		await frame(2)

		if (sidebar.getAttribute('aria-checked') !== 'true' || !canvas.textContent?.includes('Sidebar: on')) {
			throw new Error('Menubar checkbox item did not toggle on')
		}
	},
}

export const RadioGroup: Story = {
	render: () => <RadioExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#radio-menubar-trigger')
		if (!trigger) throw new Error('Radio menubar trigger was not rendered')

		trigger.click()
		await frame(2)

		const work = canvas.querySelector<HTMLElement>('[data-slot="menu-radio-item"][data-label="Work"]')
		if (!work) throw new Error('Menubar radio item was not rendered')

		work.click()
		await frame(2)

		if (work.getAttribute('aria-checked') !== 'true' || !canvas.textContent?.includes('Profile: work')) {
			throw new Error('Menubar radio item did not select Work')
		}
	},
}

export const Submenu: Story = {
	render: () => (
		<Menubar aria-label="Project menu">
			<MenubarMenu value="file">
				<MenubarTrigger id="submenu-menubar-trigger">File</MenubarTrigger>
				<MenubarContent class="w-56">
					<MenuItem>New File</MenuItem>
					<MenuSub>
						<MenuSubTrigger textValue="Export">Export</MenuSubTrigger>
						<MenuSubContent>
							<MenuItem>PDF</MenuItem>
							<MenuItem>HTML</MenuItem>
							<MenuSeparator />
							<MenuItem>Archive</MenuItem>
						</MenuSubContent>
					</MenuSub>
					<MenuSeparator />
					<MenuItem variant="danger">Delete Project</MenuItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu value="edit">
				<MenubarTrigger id="submenu-edit-menubar-trigger">Edit</MenubarTrigger>
				<MenubarContent>
					<MenuItem>Undo</MenuItem>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#submenu-menubar-trigger')
		const edit = canvas.querySelector<HTMLButtonElement>('#submenu-edit-menubar-trigger')
		if (!trigger || !edit) throw new Error('Submenu menubar triggers were not rendered')

		trigger.click()
		await frame(2)

		const subTrigger = canvas.querySelector<HTMLElement>('[data-slot="menu-sub-trigger"]')
		const subContent = canvas.querySelector<HTMLElement>('[data-slot="menu-sub-content"]')
		const pdf = subContent?.querySelector<HTMLElement>('[data-label="PDF"]')
		if (!subTrigger || !subContent || !pdf) throw new Error('Menubar submenu trigger, content, or item was not rendered')

		subTrigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
		await frame(2)

		if (subTrigger.getAttribute('aria-expanded') !== 'true' || !subContent.matches(':popover-open')) {
			throw new Error('ArrowRight did not open the menubar submenu')
		}
		await until(() => document.activeElement === pdf, 'Menubar submenu did not focus its first item')
		press(pdf, 'ArrowRight')
		await frame(2)

		if (trigger.getAttribute('aria-expanded') !== 'true' || edit.getAttribute('aria-expanded') !== 'false') {
			throw new Error('ArrowRight in submenu content switched the outer Menubar')
		}
		if (document.activeElement !== pdf) {
			throw new Error('ArrowRight on a submenu leaf escaped its submenu')
		}
	},
}

export const WithIcons: Story = {
	render: () => (
		<Menubar aria-label="Icon menu">
			<MenubarMenu value="file">
				<MenubarTrigger>File</MenubarTrigger>
				<MenubarContent class="w-56">
					<MenuItem>
						<span class="i-lucide-file size-4" />
						New File
					</MenuItem>
					<MenuItem>
						<span class="i-lucide-folder-open size-4" />
						Open Folder
					</MenuItem>
					<MenuSeparator />
					<MenuItem variant="danger">
						<span class="i-lucide-trash-2 size-4" />
						Delete
					</MenuItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu value="more">
				<MenubarTrigger>More</MenubarTrigger>
				<MenubarContent>
					<MenuItem>Settings</MenuItem>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	),
}
