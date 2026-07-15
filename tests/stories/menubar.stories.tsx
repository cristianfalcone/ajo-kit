/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarGroup,
	MenubarItem,
	MenubarLabel,
	MenubarMenu,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
} from 'ajo-ui-playa/menubar'

export default {
	title: 'UI/Menubar',
	component: Menubar,
	parameters: {
		docs: { description: 'Ajo menubar using Popover API menu content, persistent horizontal triggers, roving trigger focus, checkbox/radio items, and submenus.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Menubar>

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

const AppMenubar = ({ onSelect }: { onSelect?: (action: string) => (event: Event) => void }) => (
	<Menubar aria-label="Application menu">
		<MenubarMenu value="file">
			<MenubarTrigger id="file-menubar-trigger">File</MenubarTrigger>
			<MenubarContent class="w-56">
				<MenubarGroup>
					<MenubarItem textValue="New Tab" onSelect={onSelect?.('new-tab')}>
						<span class="i-lucide-file-plus size-4" />
						New Tab
						<MenubarShortcut>Ctrl+T</MenubarShortcut>
					</MenubarItem>
					<MenubarItem textValue="New Window" onSelect={onSelect?.('new-window')}>
						<span class="i-lucide-app-window size-4" />
						New Window
					</MenubarItem>
				</MenubarGroup>
				<MenubarSeparator />
				<MenubarGroup>
					<MenubarItem textValue="Share" onSelect={onSelect?.('share')}>Share</MenubarItem>
					<MenubarItem textValue="Print" onSelect={onSelect?.('print')}>Print</MenubarItem>
				</MenubarGroup>
				<MenubarSeparator />
				<MenubarItem disabled textValue="Import">Import</MenubarItem>
				<MenubarItem textValue="Delete" variant="danger" onSelect={onSelect?.('delete')}>
					<span class="i-lucide-trash-2 size-4" />
					Delete
				</MenubarItem>
			</MenubarContent>
		</MenubarMenu>
		<MenubarMenu value="edit">
			<MenubarTrigger id="edit-menubar-trigger">Edit</MenubarTrigger>
			<MenubarContent class="w-48">
				<MenubarItem textValue="Undo" onSelect={onSelect?.('undo')}>
					Undo
					<MenubarShortcut>Ctrl+Z</MenubarShortcut>
				</MenubarItem>
				<MenubarItem textValue="Redo" onSelect={onSelect?.('redo')}>
					Redo
					<MenubarShortcut>Ctrl+Shift+Z</MenubarShortcut>
				</MenubarItem>
				<MenubarSeparator />
				<MenubarItem textValue="Cut" onSelect={onSelect?.('cut')}>Cut</MenubarItem>
				<MenubarItem textValue="Copy" onSelect={onSelect?.('copy')}>Copy</MenubarItem>
				<MenubarItem textValue="Paste" onSelect={onSelect?.('paste')}>Paste</MenubarItem>
			</MenubarContent>
		</MenubarMenu>
		<MenubarMenu value="view">
			<MenubarTrigger id="view-menubar-trigger">View</MenubarTrigger>
			<MenubarContent class="w-52">
				<MenubarCheckboxItem checked>Show toolbar</MenubarCheckboxItem>
				<MenubarCheckboxItem>Show sidebar</MenubarCheckboxItem>
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
						<MenubarLabel>Panels</MenubarLabel>
						<MenubarSeparator />
						<MenubarCheckboxItem checked={toolbar} onCheckedChange={setToolbar}>
							Show toolbar
						</MenubarCheckboxItem>
						<MenubarCheckboxItem checked={sidebar} onCheckedChange={setSidebar}>
							Show sidebar
						</MenubarCheckboxItem>
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
						<MenubarLabel inset>Switch Profile</MenubarLabel>
						<MenubarSeparator />
						<MenubarRadioGroup value={profile} onValueChange={setProfile}>
							<MenubarRadioItem value="personal">Personal</MenubarRadioItem>
							<MenubarRadioItem value="work">Work</MenubarRadioItem>
							<MenubarRadioItem value="guest">Guest</MenubarRadioItem>
						</MenubarRadioGroup>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
			<p class="text-sm text-muted-foreground">Profile: {profile}</p>
		</div>
	)
}

export const Basic: Story<typeof Menubar> = {
	render: () => <BasicExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#file-menubar-trigger')
		if (!trigger) throw new Error('File menubar trigger was not rendered')

		trigger.click()
		await frame()

		const item = canvas.querySelector<HTMLElement>('[data-slot="menubar-item"][data-label="New Tab"]')
		const content = canvas.querySelector<HTMLElement>('[data-slot="menubar-content"]')
		if (!item || !content) throw new Error('Menubar content or New Tab item was not rendered')
		if (trigger.getAttribute('aria-expanded') !== 'true' || !content.matches(':popover-open')) {
			throw new Error('Menubar did not open File menu from trigger click')
		}

		item.click()
		await frame()

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
		file.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		await frame()

		if (document.activeElement !== edit) {
			throw new Error('ArrowRight did not move focus to the next menubar trigger')
		}

		edit.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
		await frame()

		const focused = document.activeElement as HTMLElement | null
		if (edit.getAttribute('aria-expanded') !== 'true' || focused?.dataset.label !== 'Undo') {
			throw new Error('ArrowDown did not open Edit menu and focus the first item')
		}

		focused.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
		await frame()

		if ((document.activeElement as HTMLElement | null)?.dataset.label !== 'Redo') {
			throw new Error('ArrowDown did not move within Menubar content')
		}

		// ArrowRight from inside an open menu moves to the adjacent menu (APG)
		// with its first item focused.
		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		await frame()
		await frame()

		if (view.getAttribute('aria-expanded') !== 'true' || edit.getAttribute('aria-expanded') !== 'false') {
			throw new Error('ArrowRight inside the Edit menu did not move to the View menu')
		}
		if ((document.activeElement as HTMLElement | null)?.dataset.label !== 'Show toolbar') {
			throw new Error('Adjacent menu did not focus its first item')
		}
		if ((document.activeElement as HTMLElement | null)?.dataset.highlighted !== 'true') {
			throw new Error('Adjacent menu entry did not register the item highlight')
		}

		// Tab from inside an open menu closes it.
		document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' }))
		await frame()

		if (view.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Tab inside an open menu did not close the menubar')
		}

		// Tab while focus sits ON an open trigger also closes.
		view.click()
		await frame()
		view.focus()
		if (view.getAttribute('aria-expanded') !== 'true') throw new Error('View menu did not reopen from click')
		view.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' }))
		await frame()

		if (view.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Tab on an open trigger left the menu open')
		}
	},
}

export const DisabledFirst: Story = {
	render: () => (
		<Menubar aria-label="Partially disabled menu">
			<MenubarMenu value="archive" disabled>
				<MenubarTrigger id="disabled-menubar-trigger">Archive</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>Restore</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu value="tools">
				<MenubarTrigger id="enabled-menubar-trigger">Tools</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>Options</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	),
	play: async ({ canvas }) => {
		await frame()
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
		await frame()

		const sidebar = canvas.querySelector<HTMLElement>('[data-slot="menubar-checkbox-item"][data-label="Show sidebar"]')
		if (!sidebar) throw new Error('Menubar checkbox item was not rendered')

		sidebar.click()
		await frame()

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
		await frame()

		const work = canvas.querySelector<HTMLElement>('[data-slot="menubar-radio-item"][data-label="Work"]')
		if (!work) throw new Error('Menubar radio item was not rendered')

		work.click()
		await frame()

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
					<MenubarItem>New File</MenubarItem>
					<MenubarSub>
						<MenubarSubTrigger textValue="Export">Export</MenubarSubTrigger>
						<MenubarSubContent>
							<MenubarItem>PDF</MenubarItem>
							<MenubarItem>HTML</MenubarItem>
							<MenubarSeparator />
							<MenubarItem>Archive</MenubarItem>
						</MenubarSubContent>
					</MenubarSub>
					<MenubarSeparator />
					<MenubarItem variant="danger">Delete Project</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu value="edit">
				<MenubarTrigger>Edit</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>Undo</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#submenu-menubar-trigger')
		if (!trigger) throw new Error('Submenu menubar trigger was not rendered')

		trigger.click()
		await frame()

		const subTrigger = canvas.querySelector<HTMLElement>('[data-slot="menubar-sub-trigger"]')
		const pdf = canvas.querySelector<HTMLElement>('[data-slot="menubar-sub-content"] [data-label="PDF"]')
		if (!subTrigger || !pdf) throw new Error('Menubar submenu trigger or item was not rendered')

		subTrigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
		await frame()

		if (subTrigger.getAttribute('aria-expanded') !== 'true' || pdf.hidden) {
			throw new Error('ArrowRight did not open the menubar submenu')
		}
	},
}

export const WithIcons: Story = {
	render: () => (
		<Menubar aria-label="Icon menu">
			<MenubarMenu value="file">
				<MenubarTrigger>File</MenubarTrigger>
				<MenubarContent class="w-56">
					<MenubarItem>
						<span class="i-lucide-file size-4" />
						New File
					</MenubarItem>
					<MenubarItem>
						<span class="i-lucide-folder-open size-4" />
						Open Folder
					</MenubarItem>
					<MenubarSeparator />
					<MenubarItem variant="danger">
						<span class="i-lucide-trash-2 size-4" />
						Delete
					</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu value="more">
				<MenubarTrigger>More</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>Settings</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	),
}
