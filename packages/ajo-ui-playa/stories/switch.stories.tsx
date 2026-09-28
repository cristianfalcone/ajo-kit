/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { assertInk, frame, until } from './play'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
} from 'ajo-ui-playa/field'
import { Switch } from 'ajo-ui-playa/switch'

const sizes = ['default', 'sm'] as const

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
		size: { control: 'select', options: sizes },
	},
	render: (args, { setArg }) => (
		<Switch {...args} onCheckedChange={next => setArg('checked', next)} />
	),
	parameters: {
		docs: { description: 'Native checkbox switch with Ajo Kit styling and form behavior.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Switch>

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
			|| inputRect.width < Math.max(24, rect.width) || inputRect.height < 24
			|| Math.abs(inputRect.left + inputRect.width / 2 - rect.left - rect.width / 2) > 1
			|| Math.abs(inputRect.top + inputRect.height / 2 - rect.top - rect.height / 2) > 1
			|| document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) !== input
		) {
			throw new Error('Switch input is not a 24 px target centred on its track')
		}
		input.click()
		await frame()
		if (!input.checked) throw new Error('Switch native input did not toggle from its visual hit area')
		const thumb = root.querySelector<HTMLElement>('[data-slot="switch-thumb"]')
		if (!thumb) throw new Error('Switch did not render its thumb')
		await until(() => !root.getAnimations({ subtree: true }).length, 'Switch did not settle')
		assertInk(root, thumb)
	},
}

export const Variants: Story<typeof Switch> = {
	argTypes: {
		checked: { control: false },
		disabled: { control: false },
		size: { control: false },
	},
	render: args => (
		<div class="grid gap-4">
			{[false, true].map(disabled => (
				<div key={`${disabled}`} class="flex items-center gap-4">
					{sizes.flatMap(size => [false, true].map(checked => {
						const id = `switch-${size}-${checked}${disabled ? '-disabled' : ''}`
						return (
							<Switch
								key={id}
								{...args}
								id={id}
								name={id}
								size={size}
								checked={checked}
								disabled={disabled}
								aria-label={`${size} switch, ${checked ? 'on' : 'off'}${disabled ? ', disabled' : ''}`}
							/>
						)
					}))}
				</div>
			))}
		</div>
	),
}

export const WithLabel: Story<typeof Switch> = {
	args: {
		id: 'marketing-emails',
		name: 'marketing-emails',
		label: 'Marketing emails',
	},
	render: (args, { setArg }) => (
		<Field orientation="horizontal" disabled={Boolean(args.disabled)}>
			<Switch {...args} onCheckedChange={next => setArg('checked', next)} />
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
			<Switch {...args} onCheckedChange={next => setArg('checked', next)} />
			<FieldContent>
				<FieldLabel for={args.id}>{args.label}</FieldLabel>
				<FieldDescription>{args.description}</FieldDescription>
			</FieldContent>
		</Field>
	),
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
			<Switch {...args} onCheckedChange={next => setArg('checked', next)} />
			<FieldLabel for={args.id}>{args.label}</FieldLabel>
		</Field>
	),
}

export const RightToLeft: Story<typeof Switch> = {
	argTypes: {
		checked: { control: false },
		size: { control: false },
	},
	render: args => (
		<div dir="rtl" class="flex items-center gap-4">
			{sizes.flatMap(size => [false, true].map(checked => (
				<Switch
					key={`${size}-${checked}`}
					{...args}
					id={`switch-rtl-${size}-${checked}`}
					name={`switch-rtl-${size}-${checked}`}
					size={size}
					checked={checked}
					aria-label={`${size} switch, ${checked ? 'on' : 'off'}`}
				/>
			)))}
		</div>
	),
	play: async ({ canvas }) => {
		await frame(2)
		const tracks = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="switch"]'))
		if (tracks.length !== 4) throw new Error('Right-to-left switches were not rendered')
		for (const track of tracks) {
			const thumb = track.querySelector<HTMLElement>('[data-slot="switch-thumb"]')
			const input = track.querySelector<HTMLInputElement>('[data-slot="switch-input"]')
			if (!thumb || !input) throw new Error('Right-to-left switch parts were not rendered')
			const outer = track.getBoundingClientRect()
			const inner = thumb.getBoundingClientRect()
			if (inner.left < outer.left || inner.right > outer.right) throw new Error(`${track.getAttribute('aria-label') ?? input.getAttribute('aria-label')} thumb sits outside its track`)
			// Right to left, off rests at the right and on travels to the left.
			const start = input.checked ? inner.left - outer.left : outer.right - inner.right
			if (Math.abs(start - 2) > 1) throw new Error(`${input.getAttribute('aria-label')} thumb is not 2 px inside its ${input.checked ? 'left' : 'right'} edge`)
		}
	},
}
