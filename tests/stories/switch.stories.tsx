/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story, StoryContext } from './app'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '/src/ui/field'
import Switch from '/src/ui/switch'

const bind = (setArg: StoryContext['setArg']) => (next: boolean) => setArg('checked', next)
const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const tokens = (value: string | null) => new Set((value ?? '').split(/\s+/).filter(Boolean))

const assertFieldControl = (canvas: HTMLElement, name: string, expectedId?: string) => {
	const field = canvas.querySelector<HTMLElement>(`[data-story-field="${name}"]`)
	const label = field?.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
	const description = field?.querySelector<HTMLElement>('[data-slot="field-description"]')
	const error = field?.querySelector<HTMLElement>('[data-slot="field-error"]')
	const control = field?.querySelector<HTMLInputElement>('[data-slot="switch-input"]')
	if (!field || !label || !description || !error || !control) throw new Error(`Switch field wiring story did not render ${name}`)

	const labelFor = label.getAttribute('for')
	if (!labelFor || control.id !== labelFor) throw new Error(`Switch ${name} id did not match its label for attribute`)
	if (expectedId && control.id !== expectedId) throw new Error(`Switch ${name} did not keep its manual id`)

	const describedby = tokens(control.getAttribute('aria-describedby'))
	if (!describedby.has(description.id) || !describedby.has(error.id)) {
		throw new Error(`Switch ${name} aria-describedby did not include description and error ids`)
	}
	if (control.getAttribute('aria-invalid') !== 'true') throw new Error(`Switch ${name} did not receive aria-invalid`)
	if (control.getAttribute('aria-errormessage') !== error.id) throw new Error(`Switch ${name} did not receive aria-errormessage`)
}

export default {
	title: 'UI/Switch',
	component: Switch,
	args: {
		id: 'airplane-mode',
		name: 'airplane-mode',
		checked: false,
		disabled: false,
		size: 'default',
	},
	argTypes: {
		checked: { control: 'boolean' },
		disabled: { control: 'boolean' },
		size: { control: 'select', options: ['default', 'sm'] },
	},
	render: (args, { setArg }) => (
		<Switch {...args} onCheckedChange={bind(setArg)} />
	),
	parameters: {
		docs: { description: 'Native checkbox switch with Ajo Kit styling and form behavior.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Switch>

const ControlledExample: Stateful = function* () {
	let checked = true
	const toggle = (next: boolean) => this.next(() => checked = next)

	while (true) yield (
		<Field orientation="horizontal" class="max-w-sm">
			<Switch id="controlled-switch" name="controlled" checked={checked} onCheckedChange={toggle} />
			<FieldContent>
				<FieldLabel for="controlled-switch">Sync drafts</FieldLabel>
				<FieldDescription>{checked ? 'Drafts sync automatically.' : 'Draft sync is paused.'}</FieldDescription>
			</FieldContent>
		</Field>
	)
}

export const Basic: Story<typeof Switch> = {
	play: async ({ canvas }) => {
		await frame()
		const root = canvas.querySelector<HTMLElement>('[data-slot="switch"]')
		const input = root?.querySelector<HTMLInputElement>('[data-slot="switch-input"]')
		if (!root || !input) throw new Error('Basic switch or native input was not rendered')
		const rect = root.getBoundingClientRect()
		const inputRect = input.getBoundingClientRect()
		const inputStyle = getComputedStyle(input)
		if (
			inputStyle.position !== 'absolute'
			|| inputStyle.opacity !== '0'
			|| Math.abs(inputRect.width - rect.width) > 1
			|| Math.abs(inputRect.height - rect.height) > 1
			|| document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) !== input
		) {
			throw new Error('Switch visual did not expose the shared native input hit target')
		}
		input.click()
		await frame()
		if (!input.checked) throw new Error('Switch native input did not toggle from its visual hit area')
	},
}

export const Checked: Story<typeof Switch> = {
	args: { checked: true },
}

export const Small: Story<typeof Switch> = {
	args: { size: 'sm', checked: true },
}

export const WithLabel: Story<typeof Switch> = {
	args: {
		id: 'marketing-emails',
		name: 'marketing-emails',
		label: 'Marketing emails',
	},
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Switch {...args} onCheckedChange={bind(setArg)} />
			<FieldLabel for={args.id}>{args.label}</FieldLabel>
		</Field>
	),
}

export const WithDescription: Story<typeof Switch> = {
	args: {
		id: 'notifications-switch',
		name: 'notifications',
		checked: true,
		label: 'Notifications',
		description: 'Receive alerts for activity in your workspace.',
	},
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Switch {...args} onCheckedChange={bind(setArg)} />
			<FieldContent>
				<FieldLabel for={args.id}>{args.label}</FieldLabel>
				<FieldDescription>{args.description}</FieldDescription>
			</FieldContent>
		</Field>
	),
}

export const FieldWiring: Story<typeof Switch> = {
	render: () => (
		<div class="grid w-full max-w-md gap-6">
			<Field orientation="horizontal" name="switch-auto-wire" invalid data-story-field="auto">
				<Switch name="auto-switch" />
				<FieldContent>
					<FieldLabel>Notifications</FieldLabel>
					<FieldDescription>Required notification preference.</FieldDescription>
					<FieldError>Choose a valid notification preference.</FieldError>
				</FieldContent>
			</Field>
			<Field orientation="horizontal" name="switch-manual-wire" invalid data-story-field="manual">
				<Switch id="manual-switch-control" name="manual-switch" />
				<FieldContent>
					<FieldLabel for="manual-switch-control">Manual notifications</FieldLabel>
					<FieldDescription>Manual switch keeps its caller id.</FieldDescription>
					<FieldError>Choose a valid manual notification preference.</FieldError>
				</FieldContent>
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		await frame()
		await frame()

		assertFieldControl(canvas, 'auto')
		assertFieldControl(canvas, 'manual', 'manual-switch-control')
	},
}

export const Disabled: Story<typeof Switch> = {
	args: {
		id: 'disabled-switch',
		name: 'disabled',
		disabled: true,
		label: 'Disabled',
	},
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Switch {...args} onCheckedChange={bind(setArg)} />
			<FieldLabel for={args.id}>{args.label}</FieldLabel>
		</Field>
	),
}

export const DisabledChecked: Story<typeof Switch> = {
	args: { checked: true, disabled: true },
}

export const Controlled: Story = {
	argTypes: {
		id: { control: false },
		name: { control: false },
		checked: { control: false },
		disabled: { control: false },
		size: { control: false },
	},
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('#controlled-switch')
		if (!input) throw new Error('Controlled switch input was not rendered')
		if (!canvas.textContent?.includes('Drafts sync automatically.')) {
			throw new Error('Controlled switch did not render its initial checked state')
		}

		input.click()
		await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

		if (!canvas.textContent?.includes('Draft sync is paused.')) {
			throw new Error('Controlled switch did not update after click')
		}
	},
}
