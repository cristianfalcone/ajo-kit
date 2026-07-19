/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Button from 'ajo-ui-playa/button'
import Input from 'ajo-ui-playa/input'
import { ToggleGroup, ToggleGroupItem } from 'ajo-ui-playa/toggle-group'
import { Toolbar, ToolbarSeparator } from 'ajo-ui-playa/toolbar'

export default {
	title: 'UI/Toolbar',
	component: Toolbar,
	args: {
		orientation: 'horizontal',
		loop: true,
	},
	argTypes: {
		orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
		loop: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'APG toolbar: arbitrary controls (buttons, toggle groups, inputs) behind a single tab stop with arrow-key roving.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Toolbar>

const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const press = (element: HTMLElement, key: string) =>
	element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))

const toolbarOf = (canvas: HTMLElement) => {
	const toolbar = canvas.querySelector<HTMLElement>('[data-slot="toolbar"]')
	if (!toolbar) throw new Error('Toolbar did not render')
	return toolbar
}

const buttonsOf = (toolbar: HTMLElement) =>
	Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button'))

// Reads tabIndex through a call so TS narrowing from earlier literal checks
// does not survive focus() mutations it cannot see.
const stop = (element: HTMLElement) => element.tabIndex

export const Basic: Story<typeof Toolbar> = {
	render: args => (
		<Toolbar {...args} aria-label="Text formatting">
			<Button size="sm" variant="ghost">Bold</Button>
			<Button size="sm" variant="ghost">Italic</Button>
			<ToolbarSeparator />
			<Button size="sm" variant="ghost">Undo</Button>
			<Button size="sm" variant="ghost">Redo</Button>
		</Toolbar>
	),
	play: async ({ canvas }) => {
		await waitFrame()
		const toolbar = toolbarOf(canvas)
		if (toolbar.getAttribute('role') !== 'toolbar') throw new Error('Toolbar root is missing role="toolbar"')
		if (toolbar.getAttribute('aria-label') !== 'Text formatting') throw new Error('Toolbar did not pass aria-label through')
		if (toolbar.getAttribute('aria-orientation') !== 'horizontal') throw new Error('Toolbar did not expose aria-orientation')

		const separator = toolbar.querySelector<HTMLElement>('[data-slot="toolbar-separator"]')
		if (separator?.getAttribute('role') !== 'separator') throw new Error('ToolbarSeparator is missing role="separator"')
		if (separator.getAttribute('aria-orientation') !== 'vertical') throw new Error('Horizontal toolbar separator should be aria-orientation vertical')

		const buttons = buttonsOf(toolbar)
		if (buttons.length !== 4) throw new Error('Basic toolbar did not render four controls')
		if (buttons[0].tabIndex !== 0) throw new Error('First control is not the initial tab stop')
		if (buttons.slice(1).some(button => button.tabIndex !== -1)) throw new Error('Toolbar has more than one tab stop')

		buttons[0].focus()
		press(buttons[0], 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== buttons[1]) throw new Error('ArrowRight did not move focus to the next control')
		if (stop(buttons[1]) !== 0 || stop(buttons[0]) !== -1) throw new Error('Tab stop did not follow focus')

		press(buttons[1], 'End')
		await waitFrame()
		if (document.activeElement !== buttons[3]) throw new Error('End did not move focus to the last control')

		press(buttons[3], 'Home')
		await waitFrame()
		if (document.activeElement !== buttons[0]) throw new Error('Home did not move focus to the first control')
		if (buttons.filter(button => button.tabIndex === 0).length !== 1) throw new Error('Toolbar lost its single tab stop after roving')
	},
}

export const WithToggleGroup: Story<typeof Toolbar> = {
	render: args => (
		<Toolbar {...args} aria-label="Editor">
			<Button size="sm" variant="ghost">Undo</Button>
			<ToolbarSeparator />
			<ToggleGroup type="multiple" aria-label="Formatting">
				<ToggleGroupItem value="bold" aria-label="Bold">B</ToggleGroupItem>
				<ToggleGroupItem value="italic" aria-label="Italic">I</ToggleGroupItem>
			</ToggleGroup>
			<ToolbarSeparator />
			<Button size="sm" variant="ghost">Redo</Button>
		</Toolbar>
	),
	play: async ({ canvas }) => {
		await waitFrame()
		const toolbar = toolbarOf(canvas)
		const [undo, bold, italic, redo] = buttonsOf(toolbar)
		if (!undo || !bold || !italic || !redo) throw new Error('Toolbar with toggle group did not render four controls')
		if (bold.dataset.slot !== 'toggle-group-item') throw new Error('Toggle group items did not render inside the toolbar')

		if (undo.tabIndex !== 0 || [bold, italic, redo].some(button => button.tabIndex !== -1)) {
			throw new Error('Toggle group items did not join the toolbar single tab stop')
		}

		undo.focus()
		press(undo, 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== bold) throw new Error('ArrowRight did not traverse into the toggle group')

		press(bold, 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== italic) throw new Error('ArrowRight double-jumped inside the toggle group')

		press(italic, 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== redo) throw new Error('ArrowRight did not traverse out of the toggle group')

		press(redo, 'ArrowLeft')
		await waitFrame()
		if (document.activeElement !== italic) throw new Error('ArrowLeft did not traverse back into the toggle group')
	},
}

export const WithInput: Story<typeof Toolbar> = {
	render: args => (
		<Toolbar {...args} aria-label="Search controls">
			<Button size="sm" variant="ghost">Back</Button>
			<Input aria-label="Search" class="h-8 w-40" value="hello" />
			<Button size="sm" variant="ghost">Go</Button>
		</Toolbar>
	),
	play: async ({ canvas }) => {
		await waitFrame()
		const toolbar = toolbarOf(canvas)
		const [back, go] = buttonsOf(toolbar)
		const input = toolbar.querySelector<HTMLInputElement>('input')
		if (!back || !go || !input) throw new Error('Toolbar with input did not render its controls')

		input.focus()
		input.setSelectionRange(2, 2)
		// dispatchEvent returns false when preventDefault was called: a mid-text
		// arrow must be left to the caret (not consumed, focus unchanged).
		const kept = press(input, 'ArrowLeft')
		await waitFrame()
		if (!kept) throw new Error('Toolbar stole ArrowLeft from the text input caret')
		if (document.activeElement !== input) throw new Error('ArrowLeft inside the input moved focus instead of the caret')

		input.setSelectionRange(input.value.length, input.value.length)
		press(input, 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== go) throw new Error('ArrowRight at the caret end did not rove to the next control')

		press(go, 'ArrowLeft')
		await waitFrame()
		if (document.activeElement !== input) throw new Error('ArrowLeft from a button did not rove back onto the input')
	},
}

export const WithSummary: Story<typeof Toolbar> = {
	render: args => (
		<Toolbar {...args} aria-label="Filters">
			<Button size="sm" variant="ghost">Reset</Button>
			<details>
				<summary>Status</summary>
				<div class="p-2">
					<Button size="sm" variant="ghost">Active</Button>
				</div>
			</details>
			<Button size="sm" variant="ghost">Apply</Button>
		</Toolbar>
	),
	play: async ({ canvas }) => {
		await waitFrame()
		const toolbar = toolbarOf(canvas)
		const details = toolbar.querySelector<HTMLDetailsElement>('details')
		const summary = toolbar.querySelector<HTMLElement>('summary')
		if (!details || !summary) throw new Error('Toolbar details facet did not render')

		const [reset, active, apply] = buttonsOf(toolbar)
		if (!reset || !active || !apply) throw new Error('Toolbar details facet story did not render its controls')

		// A native summary is a toolbar control: it joins the single tab stop
		// instead of adding another one.
		if (reset.tabIndex !== 0) throw new Error('First control is not the initial tab stop')
		if (summary.getAttribute('tabindex') !== '-1') throw new Error('summary did not join the toolbar roving row')

		reset.focus()
		press(reset, 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== summary) throw new Error('ArrowRight did not rove onto the summary control')

		// Closed details content stays out of the row (offsetParent filter):
		// the next arrow lands on Apply, not on the hidden button.
		press(summary, 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== apply) throw new Error('ArrowRight from summary did not skip the closed details content')

		// Opening the details folds its content into the live row.
		details.open = true
		await waitFrame()
		summary.focus()
		press(summary, 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== active) throw new Error('Open details content did not join the toolbar row')
	},
}

export const WithDialogLayer: Story<typeof Toolbar> = {
	render: args => (
		<Toolbar {...args} aria-label="Compose">
			<Button size="sm" variant="ghost">Bold</Button>
			<Button size="sm" variant="ghost">Italic</Button>
			<dialog open style="position:static">
				<ToggleGroup type="single" defaultValue="left" aria-label="Alignment">
					<ToggleGroupItem value="left" aria-label="Align left">L</ToggleGroupItem>
					<ToggleGroupItem value="right" aria-label="Align right">R</ToggleGroupItem>
				</ToggleGroup>
			</dialog>
		</Toolbar>
	),
	play: async ({ canvas }) => {
		await waitFrame()
		const toolbar = toolbarOf(canvas)
		const dialog = toolbar.querySelector<HTMLDialogElement>('dialog')
		if (!dialog) throw new Error('Toolbar dialog layer did not render')

		const [bold, italic] = buttonsOf(toolbar).filter(button => !dialog.contains(button))
		const [left, right] = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'))
		if (!bold || !italic || !left || !right) throw new Error('Toolbar dialog layer did not render its controls')

		// A <dialog> is its own layer, like [popover]: the toolbar must not
		// stamp roving tabindex on the dialog's controls (that would destroy
		// the dialog's own Tab order).
		if (left.hasAttribute('tabindex') || right.hasAttribute('tabindex')) {
			throw new Error('Toolbar stamped roving tabindex on dialog-layer controls')
		}
		if (bold.tabIndex !== 0 || italic.tabIndex !== -1) {
			throw new Error('Toolbar row outside the dialog lost its single tab stop')
		}

		// Toolbar roving stays in its own layer: from the row's end it wraps
		// to the start instead of entering the dialog.
		italic.focus()
		press(italic, 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== bold) throw new Error('Toolbar roving crossed into the dialog layer')

		// The toggle group inside the dialog keeps its own roving even though
		// the toolbar is a DOM ancestor (its guard is layer-scoped).
		left.focus()
		press(left, 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== right) throw new Error('ToggleGroup inside a dialog layer lost its own roving')
	},
}

export const Vertical: Story<typeof Toolbar> = {
	args: {
		orientation: 'vertical',
	},
	render: args => (
		<Toolbar {...args} aria-label="Layers">
			<Button size="sm" variant="ghost">Move up</Button>
			<Button size="sm" variant="ghost">Move down</Button>
			<ToolbarSeparator />
			<Button size="sm" variant="ghost">Delete</Button>
		</Toolbar>
	),
	play: async ({ canvas }) => {
		await waitFrame()
		const toolbar = toolbarOf(canvas)
		if (toolbar.getAttribute('aria-orientation') !== 'vertical') throw new Error('Vertical toolbar did not expose aria-orientation')
		if (toolbar.dataset.orientation !== 'vertical') throw new Error('Vertical toolbar did not expose data-orientation')

		const separator = toolbar.querySelector<HTMLElement>('[data-slot="toolbar-separator"]')
		if (separator?.getAttribute('aria-orientation') !== 'horizontal') throw new Error('Vertical toolbar separator should be aria-orientation horizontal')

		const [up, down] = buttonsOf(toolbar)
		up.focus()
		press(up, 'ArrowDown')
		await waitFrame()
		if (document.activeElement !== down) throw new Error('ArrowDown did not move focus in the vertical toolbar')

		press(down, 'ArrowRight')
		await waitFrame()
		if (document.activeElement !== down) throw new Error('Horizontal arrows should not rove in a vertical toolbar')
	},
}
