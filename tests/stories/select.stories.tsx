/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story, StoryContext } from './app'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from 'ajo-ui-playa/field'
import {
	Select,
	SelectChip,
	SelectChips,
	SelectChipsInput,
	SelectContent,
	SelectCreate,
	SelectEmpty,
	SelectGroup,
	SelectInput,
	SelectItem,
	SelectLabel,
	SelectList,
	SelectSeparator,
	SelectStatus,
	SelectTrigger,
	SelectValue,
} from 'ajo-ui-playa/select'
import Spinner from 'ajo-ui-playa/spinner'

type Country = {
	code: string
	label: string
	value: string
}

const fruits = ['apple', 'banana', 'blueberry', 'grapes', 'pineapple']
const vegetables = ['carrot', 'broccoli', 'potato']
const frameworks = ['Next.js', 'SvelteKit', 'Nuxt.js', 'Remix', 'Astro']
const zones = [
	'Pacific/Midway',
	'America/Los_Angeles',
	'America/Denver',
	'America/Chicago',
	'America/New_York',
	'America/Sao_Paulo',
	'Europe/London',
	'Europe/Paris',
	'Europe/Madrid',
	'Africa/Cairo',
	'Asia/Dubai',
	'Asia/Kolkata',
	'Asia/Tokyo',
	'Australia/Sydney',
]
const countries = [
	{ code: 'AR', label: 'Argentina', value: 'argentina' },
	{ code: 'BR', label: 'Brazil', value: 'brazil' },
	{ code: 'CL', label: 'Chile', value: 'chile' },
	{ code: 'JP', label: 'Japan', value: 'japan' },
	{ code: 'UY', label: 'Uruguay', value: 'uruguay' },
] satisfies Country[]

const bind = (setArg: StoryContext['setArg']) => (next: string | null) => setArg('defaultValue', next ?? '')

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const announced = () =>
	document.body.querySelector<HTMLElement>('[aria-live="polite"][aria-atomic="true"]')?.textContent

const typeInto = async (input: HTMLInputElement, value: string) => {
	input.focus()
	input.value = value
	input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }))
	await frame()
}

const press = (target: HTMLElement, key: string) =>
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

export default {
	title: 'UI/Select',
	component: Select,
	args: {
		defaultValue: '',
		disabled: false,
	},
	argTypes: {
		defaultValue: { control: 'select', options: ['', ...fruits] },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'Unified Ajo select: single, multiple, searchable, editable, chips, and tagging by composition over one popup engine.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Select>

const FruitItems = () => (
	<>
		<SelectItem value="apple">Apple</SelectItem>
		<SelectItem value="banana">Banana</SelectItem>
		<SelectItem value="blueberry">Blueberry</SelectItem>
		<SelectItem value="grapes">Grapes</SelectItem>
		<SelectItem value="pineapple">Pineapple</SelectItem>
	</>
)

const FruitSelect = (args: Record<string, unknown> = {}) => (
	<Select {...args}>
		<SelectTrigger class="w-[180px]" aria-label="Fruit">
			<SelectValue placeholder="Select a fruit" />
		</SelectTrigger>
		<SelectContent>
			<SelectList>
				<SelectGroup>
					<FruitItems />
				</SelectGroup>
			</SelectList>
		</SelectContent>
	</Select>
)

const ControlledExample: Stateful = function* () {
	let value = 'system'
	const change = (next: string | null) => this.next(() => value = next ?? '')

	while (true) yield (
		<Field class="max-w-sm">
			<FieldLabel>Theme</FieldLabel>
			<Select name="theme" value={value} onValueChange={change}>
				<SelectTrigger id="controlled-select" class="w-[180px]">
					<SelectValue placeholder="Select theme" />
				</SelectTrigger>
				<SelectContent>
					<SelectList>
						<SelectItem value="light">Light</SelectItem>
						<SelectItem value="dark">Dark</SelectItem>
						<SelectItem value="system">System</SelectItem>
					</SelectList>
				</SelectContent>
			</Select>
			<FieldDescription>Selected: {value}</FieldDescription>
		</Field>
	)
}

const AutocompleteExample: Stateful = function* () {
	let value = 'Astro'
	const change = (next: unknown) => this.next(() => value = String(next ?? ''))

	while (true) yield (
		<div class="grid w-[22rem] gap-3">
			<Select items={frameworks} value={value || null} onValueChange={change} autoHighlight>
				<SelectInput placeholder="Select framework" showClear />
				<SelectContent>
					<SelectEmpty>No framework found.</SelectEmpty>
					<SelectList>{(item: string) => (
						<SelectItem key={item} value={item}>{item}</SelectItem>
					)}</SelectList>
				</SelectContent>
			</Select>
			<p class="text-sm text-muted-foreground">Selected: {value || 'none'}</p>
		</div>
	)
}

const ChipsExample: Stateful = function* () {
	let value = ['Next.js']
	const change = (next: unknown) => this.next(() => value = Array.isArray(next) ? next.map(String) : [])

	while (true) yield (
		<div class="grid w-[26rem] gap-3">
			<Select items={frameworks} multiple value={value} onValueChange={change} autoHighlight>
				<SelectChips>
					{value.map(item => (
						<SelectChip key={item} value={item}>{item}</SelectChip>
					))}
					<SelectChipsInput placeholder="Add framework..." />
				</SelectChips>
				<SelectContent>
					<SelectEmpty>No framework found.</SelectEmpty>
					<SelectList>{(item: string) => (
						<SelectItem key={item} value={item}>{item}</SelectItem>
					)}</SelectList>
				</SelectContent>
			</Select>
			<p class="text-sm text-muted-foreground">Selected: {value.join(', ') || 'none'}</p>
		</div>
	)
}

const CustomExample: Stateful = function* () {
	let value: Country | undefined = countries[0]
	const change = (next: unknown) => this.next(() => value = (next ?? undefined) as Country | undefined)

	while (true) yield (
		<div class="grid w-[24rem] gap-3">
			<Select
				items={countries}
				value={value ?? null}
				itemToStringValue={item => item.label}
				filter={(item, search, label) => `${label} ${item.code}`.toLowerCase().includes(search.trim().toLowerCase())}
				onValueChange={change}
				autoHighlight
			>
				<SelectInput placeholder="Select country" />
				<SelectContent>
					<SelectEmpty>No country found.</SelectEmpty>
					<SelectList>{(item: Country) => (
						<SelectItem key={item.value} value={item} keywords={[item.code]} data-country={item.value}>
							<span class="flex size-7 items-center justify-center rounded-sm bg-muted text-xs font-medium">{item.code}</span>
							<span class="flex flex-col">
								<span>{item.label}</span>
								<span class="text-xs text-muted-foreground">{item.value}</span>
							</span>
						</SelectItem>
					)}</SelectList>
				</SelectContent>
			</Select>
			<p class="text-sm text-muted-foreground">Selected: {value?.label ?? 'none'}</p>
		</div>
	)
}

const PopupExample: Stateful = function* () {
	let value: Country | undefined
	const change = (next: unknown) => this.next(() => value = (next ?? undefined) as Country | undefined)

	while (true) yield (
		<Select items={countries} value={value ?? null} itemToStringValue={item => item.label} onValueChange={change} autoHighlight>
			<SelectTrigger class="w-[240px]">
				<SelectValue placeholder="Select country" />
			</SelectTrigger>
			<SelectContent class="w-[240px]">
				<SelectInput class="m-1 mb-0" placeholder="Search country" showTrigger={false} />
				<SelectEmpty>No country found.</SelectEmpty>
				<SelectList>{(item: Country) => (
					<SelectItem key={item.value} value={item}>{item.label}</SelectItem>
				)}</SelectList>
			</SelectContent>
		</Select>
	)
}

const TaggingExample: Stateful = function* () {
	let items = ['ajo', 'vite', 'unocss']
	let value: string[] = ['ajo']
	const change = (next: unknown) => this.next(() => value = Array.isArray(next) ? next.map(String) : [])
	const create = (tag: string) => this.next(() => {
		if (!items.includes(tag)) items = [...items, tag]
		value = [...value, tag]
	})

	while (true) yield (
		<div class="grid w-[26rem] gap-3">
			<Select items={items} multiple value={value} onValueChange={change} onCreate={create}>
				<SelectChips>
					{value.map(item => (
						<SelectChip key={item} value={item}>{item}</SelectChip>
					))}
					<SelectChipsInput placeholder="Add tag..." />
				</SelectChips>
				<SelectContent>
					<SelectList>
						{items.map(item => (
							<SelectItem key={item} value={item}>{item}</SelectItem>
						))}
						<SelectCreate />
					</SelectList>
				</SelectContent>
			</Select>
			<p class="text-sm text-muted-foreground">Tags: {value.join(', ') || 'none'}</p>
		</div>
	)
}

const AsyncExample: Stateful = function* () {
	let items: string[] = []
	let loading = false
	let query = ''
	let version = 0
	const search = (next: string) => {
		const current = ++version
		this.next(() => {
			query = next.trim()
			loading = true
		})
		setTimeout(() => {
			if (current !== version || !this.isConnected) return
			this.next(() => {
				items = query === 'server-owned'
					? ['Nuxt.js']
					: frameworks.filter(item => item.toLowerCase().includes(query.toLowerCase()))
				loading = false
			})
		}, 120)
	}

	while (true) yield (
		<Select class="w-[22rem]" items={items} filter={null} onInputValueChange={search} autoHighlight>
			<SelectInput placeholder="Search frameworks (async)" />
			<SelectContent>
				<SelectStatus>
					{loading
						? <><Spinner label="Loading" /> Loading...</>
						: items.length
							? `${items.length} result${items.length === 1 ? '' : 's'}`
							: query ? null : 'Type to search.'}
				</SelectStatus>
				{!loading ? <SelectEmpty>No framework found.</SelectEmpty> : null}
				<SelectList>{(item: string) => (
					<SelectItem key={item} value={item}>{item}</SelectItem>
				)}</SelectList>
			</SelectContent>
		</Select>
	)
}

export const Basic: Story<typeof Select> = {
	render: args => <FruitSelect {...args} />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]')
		const banana = canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="banana"]')
		const content = canvas.querySelector<HTMLElement>('[data-slot="select-content"]')
		if (!trigger || !banana || !content) throw new Error('Basic select trigger, item, or content was not rendered')
		if (
			content.dataset.align !== 'start'
			|| content.dataset.sidePreference !== 'bottom'
			|| content.dataset.sideOffset !== '6'
			|| content.dataset.collisionPadding !== '8'
		) {
			throw new Error('Select content did not stamp its placement defaults')
		}

		// Computed visibility, not just state: an author display class beating
		// the UA [popover] display:none kept closed popups painted once.
		if (getComputedStyle(content).display !== 'none') {
			throw new Error('Select content was visible before opening')
		}

		trigger.click()
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Select trigger did not open the popup')
		}
		if (getComputedStyle(content).display === 'none') {
			throw new Error('Select content stayed hidden while open')
		}

		banana.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
		await frame()

		if (!banana.hasAttribute('data-highlighted') || document.activeElement !== banana) {
			throw new Error('Select item did not highlight on pointer hover')
		}

		banana.click()
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'false' || !trigger.textContent?.includes('Banana')) {
			throw new Error('Select did not choose Banana after item click')
		}
		if (getComputedStyle(content).display !== 'none') {
			throw new Error('Select content stayed visible after selection')
		}

		// Single toggle-off: clicking the selected option again deselects it
		// and the commit closes the popup.
		trigger.click()
		await frame()
		if (banana.getAttribute('aria-selected') !== 'true') {
			throw new Error('Reopened select did not mark Banana selected')
		}
		banana.click()
		await frame()
		if (trigger.textContent?.includes('Banana')) {
			throw new Error('Clicking the selected option did not deselect it')
		}
		if (trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Deselecting did not close the popup')
		}
		trigger.click()
		await frame()
		if (banana.getAttribute('aria-selected') !== 'false') {
			throw new Error('Deselected option still reads as selected')
		}
		banana.click()
		await frame()
	},
}

export const Deselectable: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
	},
	parameters: {
		docs: { description: 'Starts without a value: picking an option selects it, and clicking the selected option again deselects it back to the placeholder.' },
	},
	render: args => <FruitSelect {...args} defaultValue={undefined} />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]')
		const grapes = canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="grapes"]')
		if (!trigger || !grapes) throw new Error('Deselectable select was not rendered')
		if (!trigger.textContent?.includes('Select a fruit')) throw new Error('Deselectable select should start on the placeholder')

		trigger.click()
		await frame()
		grapes.click()
		await frame()
		if (!trigger.textContent?.includes('Grapes')) throw new Error('Deselectable select did not pick Grapes')

		trigger.click()
		await frame()
		grapes.click()
		await frame()
		if (!trigger.textContent?.includes('Select a fruit')) {
			throw new Error('Clicking the selected option did not return to the placeholder')
		}
	},
}

export const Required: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
	},
	parameters: {
		docs: { description: 'Comes with a default value and required semantics: clicking the selected option again keeps it — a required selection cannot be emptied from the list.' },
	},
	render: args => <FruitSelect {...args} defaultValue="banana" required />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]')
		const banana = canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="banana"]')
		if (!trigger || !banana) throw new Error('Required select was not rendered')
		if (!trigger.textContent?.includes('Banana')) throw new Error('Required select should start on its default value')

		trigger.click()
		await frame()
		if (banana.getAttribute('aria-selected') !== 'true') throw new Error('Required select did not mark its default selected')
		banana.click()
		await frame()
		if (!trigger.textContent?.includes('Banana')) {
			throw new Error('Required select must keep its value when the selected option is clicked again')
		}
		if (trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Clicking the selected option should still close a required select')
		}
	},
}

export const WithLabel: Story<typeof Select> = {
	args: {
		defaultValue: 'apple',
		name: 'fruit',
		label: 'Favorite fruit',
		description: 'Custom styled popup while preserving form value with a hidden input.',
	},
	render: ({ description, label, ...args }, { setArg }) => (
		<Field class="max-w-sm">
			<FieldLabel for="favorite-fruit">{label}</FieldLabel>
			<Select {...args} onValueChange={bind(setArg)}>
				<SelectTrigger id="favorite-fruit" class="w-[220px]">
					<SelectValue placeholder="Select a fruit" />
				</SelectTrigger>
				<SelectContent>
					<SelectList>
						<FruitItems />
					</SelectList>
				</SelectContent>
			</Select>
			<FieldDescription>{description}</FieldDescription>
		</Field>
	),
	play: async ({ canvas }) => {
		const hidden = canvas.querySelector<HTMLInputElement>('input[type="hidden"][name="fruit"]')
		if (!hidden || hidden.value !== 'apple') throw new Error('Select did not serialize its value to a hidden input')
	},
}

export const Groups: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: 'select', options: ['', ...fruits, ...vegetables] },
	},
	render: (args, { setArg }) => (
		<Select {...args} onValueChange={bind(setArg)}>
			<SelectTrigger class="w-[220px]" aria-label="Food">
				<SelectValue placeholder="Select food" />
			</SelectTrigger>
			<SelectContent>
				<SelectList>
					<SelectGroup>
						<SelectLabel>Fruits</SelectLabel>
						<FruitItems />
					</SelectGroup>
					<SelectSeparator />
					<SelectGroup>
						<SelectLabel>Vegetables</SelectLabel>
						<SelectItem value="carrot">Carrot</SelectItem>
						<SelectItem value="broccoli">Broccoli</SelectItem>
						<SelectItem value="potato">Potato</SelectItem>
					</SelectGroup>
				</SelectList>
			</SelectContent>
		</Select>
	),
}

export const Small: Story<typeof Select> = {
	args: { defaultValue: 'banana' },
	render: (args, { setArg }) => (
		<Select {...args} onValueChange={bind(setArg)}>
			<SelectTrigger size="sm" class="w-[180px]" aria-label="Small fruit">
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectList>
					<FruitItems />
				</SelectList>
			</SelectContent>
		</Select>
	),
}

export const Disabled: Story<typeof Select> = {
	args: { defaultValue: 'apple', disabled: true },
	render: (args, { setArg }) => (
		<Select {...args} onValueChange={bind(setArg)}>
			<SelectTrigger class="w-[180px]" aria-label="Disabled fruit">
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectList>
					<FruitItems />
				</SelectList>
			</SelectContent>
		</Select>
	),
}

export const Invalid: Story<typeof Select> = {
	args: {
		description: 'Choose one fruit from the menu.',
		label: 'Fruit',
		error: 'Please select a fruit.',
	},
	render: ({ description, error, label, ...args }, { setArg }) => (
		<Field invalid class="max-w-sm">
			<FieldLabel for="invalid-select">{label}</FieldLabel>
			<Select {...args} required onValueChange={bind(setArg)}>
				<SelectTrigger id="invalid-select" class="w-[220px]" aria-invalid="true">
					<SelectValue placeholder="Select a fruit" />
				</SelectTrigger>
				<SelectContent>
					<SelectList>
						<FruitItems />
					</SelectList>
				</SelectContent>
			</Select>
			<FieldDescription>{description}</FieldDescription>
			<FieldError>{error}</FieldError>
		</Field>
	),
	play: async ({ canvas }) => {
		await frame()

		const label = canvas.querySelector<HTMLElement>('[data-slot="field-label"]')
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]')
		const list = canvas.querySelector<HTMLElement>('[data-slot="select-list"]')
		const description = canvas.querySelector<HTMLElement>('[data-slot="field-description"]')
		const error = canvas.querySelector<HTMLElement>('[data-slot="field-error"]')
		if (!label || !trigger || !list || !description || !error) throw new Error('Invalid select field parts were not rendered')

		const describedby = trigger.getAttribute('aria-describedby')?.split(/\s+/) ?? []
		if (trigger.getAttribute('aria-labelledby') !== label.id) throw new Error('Select trigger was not labelled by the FieldLabel id')
		if (list.getAttribute('aria-labelledby') !== trigger.id) throw new Error('Select list did not follow the adopted trigger id')
		if (trigger.getAttribute('aria-controls') !== list.id) throw new Error('Select trigger aria-controls did not reference the listbox')
		if (!describedby.includes(description.id) || !describedby.includes(error.id)) {
			throw new Error('Select trigger aria-describedby did not include description and error ids')
		}

		// A required selection cannot be toggled off from the list.
		trigger.click()
		await frame()
		const apple = canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="apple"]')
		if (!apple) throw new Error('Required select apple option was not rendered')
		apple.click()
		await frame()
		trigger.click()
		await frame()
		apple.click()
		await frame()
		if (!trigger.textContent?.includes('Apple')) {
			throw new Error('Required select must keep its value when the selected option is clicked again')
		}
	},
}

export const Scrollable: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: 'select', options: ['', ...zones] },
	},
	render: (args, { setArg }) => (
		<Select {...args} onValueChange={bind(setArg)}>
			<SelectTrigger class="w-[260px]" aria-label="Timezone">
				<SelectValue placeholder="Select a timezone" />
			</SelectTrigger>
			<SelectContent>
				<SelectList class="max-h-56">
					{zones.map(zone => (
						<SelectItem key={zone} value={zone}>{zone}</SelectItem>
					))}
				</SelectList>
			</SelectContent>
		</Select>
	),
}

export const Keyboard: Story = {
	args: { defaultValue: 'light' },
	argTypes: {
		defaultValue: { control: 'select', options: ['light', 'dark', 'system'] },
	},
	render: args => (
		<Select {...args}>
			<SelectTrigger id="keyboard-select" class="w-[180px]">
				<SelectValue placeholder="Select theme" />
			</SelectTrigger>
			<SelectContent>
				<SelectList>
					<SelectItem value="light">Light</SelectItem>
					<SelectItem value="dark">Dark</SelectItem>
					<SelectItem value="system">System</SelectItem>
				</SelectList>
			</SelectContent>
		</Select>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#keyboard-select')
		if (!trigger) throw new Error('Keyboard select trigger was not rendered')

		trigger.focus()
		press(trigger, 'ArrowDown')
		await frame()

		const active = document.activeElement as HTMLElement | null
		if (trigger.getAttribute('aria-expanded') !== 'true' || active?.dataset.value !== 'dark') {
			throw new Error('ArrowDown did not open Select and move focus to the next option')
		}

		press(active, 'Enter')
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'false' || !trigger.textContent?.includes('Dark')) {
			throw new Error('Enter did not select the focused option')
		}

		if (document.activeElement !== trigger) {
			throw new Error('Focus did not return to the trigger after selection')
		}
	},
}

export const ClosedTypeahead: Story = {
	args: { defaultValue: 'light' },
	argTypes: {
		defaultValue: { control: 'select', options: ['light', 'dark', 'system'] },
	},
	render: args => (
		<Select {...args}>
			<SelectTrigger id="typeahead-select" class="w-[180px]">
				<SelectValue placeholder="Select theme" />
			</SelectTrigger>
			<SelectContent>
				<SelectList>
					<SelectItem value="light">Light</SelectItem>
					<SelectItem value="dark">Dark</SelectItem>
					<SelectItem value="system">System</SelectItem>
				</SelectList>
			</SelectContent>
		</Select>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#typeahead-select')
		if (!trigger) throw new Error('Typeahead select trigger was not rendered')

		trigger.focus()
		press(trigger, 'd')
		await frame()

		if (trigger.getAttribute('aria-expanded') !== 'false') {
			throw new Error('Closed typeahead opened the popup')
		}
		if (!trigger.textContent?.includes('Dark')) {
			throw new Error('Closed typeahead did not commit the matching option')
		}
	},
}

export const Controlled: Story = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('#controlled-select')
		const dark = canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="dark"]')
		if (!trigger || !dark) throw new Error('Controlled select trigger or item was not rendered')
		if (!trigger.textContent?.includes('System') || !canvas.textContent?.includes('Selected: system')) {
			throw new Error('Controlled select did not render its initial value')
		}

		trigger.click()
		await frame()
		dark.click()
		await frame()

		if (!trigger.textContent?.includes('Dark') || !canvas.textContent?.includes('Selected: dark')) {
			throw new Error('Controlled select did not update after choosing Dark')
		}
	},
}

export const Autocomplete: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => <AutocompleteExample />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="select-input"]')
		if (!input) throw new Error('Autocomplete input was not rendered')

		await typeInto(input, 'x')
		if (announced() !== '3 results') {
			throw new Error('Autocomplete did not announce its default plural result label')
		}

		await typeInto(input, 'sv')
		if (announced() !== '1 result') {
			throw new Error('Autocomplete did not announce its default singular result label')
		}

		const svelte = canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="SvelteKit"]')
		const next = canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="Next.js"]')
		if (!svelte || svelte.hidden || (next && !next.hidden)) {
			throw new Error('Autocomplete did not filter framework options')
		}

		svelte.click()
		await frame()

		if (input.value !== 'SvelteKit' || !canvas.textContent?.includes('Selected: SvelteKit')) {
			throw new Error('Autocomplete did not select SvelteKit')
		}

		// Escape on a closed input must stay closed (regression: it used to reopen).
		press(input, 'Escape')
		await frame()

		const content = canvas.querySelector<HTMLElement>('[data-slot="select-content"]')
		if (content?.dataset.state === 'open') {
			throw new Error('Escape on a closed input reopened the popup')
		}
		if (content && getComputedStyle(content).display !== 'none') {
			throw new Error('Select content stayed visible after closing')
		}
	},
}

export const MultipleChips: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => <ChipsExample />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="select-chips-input"]')
		if (!input) throw new Error('Select chips input was not rendered')

		await typeInto(input, 'rem')

		const remix = canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="Remix"]')
		if (!remix || remix.hidden) throw new Error('Chips select did not filter Remix')

		remix.click()
		await frame()

		if (!canvas.textContent?.includes('Selected: Next.js, Remix')) {
			throw new Error('Multiple selection did not add Remix')
		}

		// Chip roving: ArrowLeft from an empty input focuses the last chip.
		input.focus()
		press(input, 'ArrowLeft')
		await frame()

		const focused = document.activeElement as HTMLElement | null
		if (focused?.dataset.slot !== 'select-chip' || focused.dataset.value !== 'Remix') {
			throw new Error('ArrowLeft did not move focus to the last chip')
		}

		press(focused, 'Backspace')
		await frame()

		if (!canvas.textContent?.includes('Selected: Next.js') || canvas.textContent?.includes('Remix,')) {
			throw new Error('Backspace on a focused chip did not remove it')
		}

		const remove = canvas.querySelector<HTMLButtonElement>('[data-slot="select-chip-remove"]')
		if (!remove) throw new Error('Select chip remove button was not rendered')

		remove.click()
		await frame()

		if (!canvas.textContent?.includes('Selected: none')) {
			throw new Error('Chip remove did not clear the last value')
		}
	},
}

export const CustomItems: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => <CustomExample />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="select-input"]')
		if (!input) throw new Error('Custom select input was not rendered')

		await typeInto(input, 'uy')

		const uruguay = canvas.querySelector<HTMLElement>('[data-country="uruguay"]')
		if (!uruguay || uruguay.hidden) throw new Error('Custom item did not match keyword search')

		uruguay.click()
		await frame()

		if (!canvas.textContent?.includes('Selected: Uruguay')) {
			throw new Error('Custom item did not update the selected object')
		}
	},
}

export const PopupSearch: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => <PopupExample />,
	play: async ({ canvas }) => {
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]')
		if (!trigger) throw new Error('Popup search trigger was not rendered')

		trigger.click()
		await frame()

		const input = canvas.querySelector<HTMLInputElement>('[data-slot="select-input"]')
		if (!input || trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Popup did not open from trigger')
		}
		if (document.activeElement !== input) {
			throw new Error('Opening did not move focus into the in-popup search input')
		}

		await typeInto(input, 'jap')
		const japan = canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="Japan"]')
		if (!japan || japan.hidden) throw new Error('Popup search did not filter Japan')

		japan.click()
		await frame()

		if (!trigger.textContent?.includes('Japan')) {
			throw new Error('Popup search did not display the selected country')
		}
		if (document.activeElement !== trigger) {
			throw new Error('Closing did not return focus to the trigger')
		}
	},
}

export const GroupsFiltered: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => (
		<Select defaultValue="Docs" autoHighlight>
			<SelectInput class="w-[22rem]" placeholder="Search category" />
			<SelectContent>
				<SelectEmpty>No category found.</SelectEmpty>
				<SelectList>
					<SelectGroup>
						<SelectLabel>Content</SelectLabel>
						<SelectItem value="Docs">Docs</SelectItem>
						<SelectItem value="Blog">Blog</SelectItem>
					</SelectGroup>
					<SelectSeparator />
					<SelectGroup>
						<SelectLabel>Platform</SelectLabel>
						<SelectItem value="Dashboard">Dashboard</SelectItem>
						<SelectItem value="Settings">Settings</SelectItem>
					</SelectGroup>
				</SelectList>
			</SelectContent>
		</Select>
	),
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="select-input"]')
		if (!input) throw new Error('Groups select input was not rendered')
		const inputGroup = input.closest<HTMLElement>('[data-slot="input-group"]')
		if (!inputGroup) throw new Error('Groups select input-group wrapper was not rendered')
		const widthClasses = inputGroup.className.split(/\s+/).filter(token => token.startsWith('w-'))
		if (widthClasses.join(' ') !== 'w-[22rem]') {
			throw new Error(`SelectInput caller must own the only width utility, got ${widthClasses.join(' ')}`)
		}
		const idleShadow = getComputedStyle(inputGroup).boxShadow
		input.focus()
		await frame()
		if (getComputedStyle(inputGroup).boxShadow === idleShadow) {
			throw new Error('SelectInput focus did not activate the shared input-group ring')
		}

		const separator = () => canvas.querySelector<HTMLElement>('[data-slot="select-separator"]')

		await typeInto(input, 'do')
		if (!separator()?.hidden) throw new Error('Separator stayed visible after filtering emptied a group')

		await typeInto(input, 'dd')
		const groups = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="select-group"]'))
		if (!groups.every(group => group.hidden)) throw new Error('Empty groups stayed visible with no matches')
		if (!separator()?.hidden) throw new Error('Separator stayed visible with no matches')

		const list = canvas.querySelector<HTMLElement>('[data-slot="select-list"]')
		if (list && list.scrollWidth > list.clientWidth) throw new Error('Empty state overflows horizontally')

		await typeInto(input, '')
		if (separator()?.hidden) throw new Error('Separator did not restore after clearing the search')
	},
}

export const InvalidInput: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => (
		<Field invalid class="w-[22rem]">
			<FieldLabel for="invalid-input-select">Framework</FieldLabel>
			<Select items={frameworks}>
				<SelectInput id="invalid-input-select" aria-invalid="true" placeholder="Select framework" />
				<SelectContent>
					<SelectEmpty>No framework found.</SelectEmpty>
					<SelectList>{(item: string) => (
						<SelectItem key={item} value={item}>{item}</SelectItem>
					)}</SelectList>
				</SelectContent>
			</Select>
			<FieldDescription>Choose one framework from the filtered list.</FieldDescription>
			<FieldError>Please select a framework.</FieldError>
		</Field>
	),
	play: async ({ canvas }) => {
		await frame()

		const label = canvas.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="select-input"]')
		const description = canvas.querySelector<HTMLElement>('[data-slot="field-description"]')
		const error = canvas.querySelector<HTMLElement>('[data-slot="field-error"]')
		if (!label || !input || !description || !error) throw new Error('Invalid select field parts were not rendered')
		const inputGroup = input.closest<HTMLElement>('[data-slot="input-group"]')
		if (!inputGroup) throw new Error('Invalid SelectInput group was not rendered')

		const describedby = input.getAttribute('aria-describedby')?.split(/\s+/) ?? []
		if (input.id !== 'invalid-input-select') throw new Error('Select input did not preserve the manual id')
		if (label.getAttribute('for') !== input.id) throw new Error('Select input id did not match the FieldLabel for attribute')
		if (!describedby.includes(description.id) || !describedby.includes(error.id)) {
			throw new Error('Select input aria-describedby did not include description and error ids')
		}

		const invalidShadow = getComputedStyle(inputGroup).boxShadow
		input.removeAttribute('aria-invalid')
		await frame()
		if (getComputedStyle(inputGroup).boxShadow === invalidShadow) {
			throw new Error('SelectInput aria-invalid did not activate the shared input-group danger ring')
		}
		input.setAttribute('aria-invalid', 'true')
	},
}

export const DisabledInput: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => (
		<Field class="w-[22rem]">
			<FieldLabel>Framework</FieldLabel>
			<Select items={frameworks} disabled defaultValue="Next.js">
				<SelectInput placeholder="Select framework" />
				<SelectContent>
					<SelectList>{(item: string) => (
						<SelectItem key={item} value={item}>{item}</SelectItem>
					)}</SelectList>
				</SelectContent>
			</Select>
			<FieldDescription>Disabled select keeps the selected value visible.</FieldDescription>
		</Field>
	),
}

export const Tagging: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => <TaggingExample />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="select-chips-input"]')
		if (!input) throw new Error('Tagging input was not rendered')

		await typeInto(input, 'deno')

		const create = canvas.querySelector<HTMLElement>('[data-slot="select-create"]')
		if (!create || create.hidden) throw new Error('Create row did not appear for an unmatched search')

		create.click()
		await frame()

		if (!canvas.textContent?.includes('Tags: ajo, deno')) {
			throw new Error('Create row did not add the new tag')
		}

		const chip = canvas.querySelector<HTMLElement>('[data-slot="select-chip"][data-value="deno"]')
		if (!chip) throw new Error('Created tag did not render as a chip')

		// An exact match must hide the create row.
		await typeInto(input, 'vite')
		if (!canvas.querySelector<HTMLElement>('[data-slot="select-create"]')?.hidden) {
			throw new Error('Create row stayed visible for an exact match')
		}
	},
}

export const Async: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => <AsyncExample />,
	play: async ({ canvas }) => {
		const input = canvas.querySelector<HTMLInputElement>('[data-slot="select-input"]')
		const status = canvas.querySelector<HTMLElement>('[data-slot="select-status"]')
		if (!input || !status) throw new Error('Async select input or status was not rendered')

		// Opening with no query must not claim "not found": the empty state
		// is strictly a search result.
		input.focus()
		input.click()
		await frame()
		const initialEmpty = canvas.querySelector<HTMLElement>('[data-slot="select-empty"]')
		if (initialEmpty && !initialEmpty.hidden) {
			throw new Error('Empty state rendered before any query was typed')
		}
		if (!status.textContent?.includes('Type to search')) {
			throw new Error('Async status did not hint before any query')
		}

		// The server deliberately returns a label that does not match this query;
		// filter=null must treat that result set as authoritative.
		await typeInto(input, 'server-owned')

		if (!status.textContent?.includes('Loading')) {
			throw new Error('Async status did not announce loading')
		}
		if (canvas.querySelector<HTMLElement>('[data-slot="select-empty"]')) {
			throw new Error('Empty state rendered while loading')
		}

		await sleep(200)
		await frame()

		const nuxt = canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="Nuxt.js"]')
		if (!nuxt || nuxt.hidden) throw new Error('External Select filtering hid the server-owned Nuxt.js result')
		if (!status.textContent?.includes('1 result')) {
			throw new Error('Async status did not announce the result count')
		}

		// A query with no matches shows the empty state...
		await typeInto(input, 'zzz')
		await sleep(200)
		await frame()
		const empty = canvas.querySelector<HTMLElement>('[data-slot="select-empty"]')
		if (!empty || empty.hidden) throw new Error('Empty state did not render for a no-match query')

		// ...and clearing the query hides it again.
		await typeInto(input, '')
		await sleep(200)
		await frame()
		const cleared = canvas.querySelector<HTMLElement>('[data-slot="select-empty"]')
		if (cleared && !cleared.hidden) {
			throw new Error('Empty state should hide once the query is cleared')
		}
	},
}

export const FormMultiple: Story<typeof Select> = {
	argTypes: {
		defaultValue: { control: false },
		disabled: { control: false },
	},
	render: () => (
		<form id="select-form" class="grid w-[26rem] gap-3">
			<Select multiple name="stack" defaultValue={['Next.js', 'Astro']} items={frameworks}>
				<SelectChips>
					<SelectChipsInput placeholder="Add framework..." />
				</SelectChips>
				<SelectContent>
					<SelectList>{(item: string) => (
						<SelectItem key={item} value={item}>{item}</SelectItem>
					)}</SelectList>
				</SelectContent>
			</Select>
		</form>
	),
	play: async ({ canvas }) => {
		const form = canvas.querySelector<HTMLFormElement>('#select-form')
		if (!form) throw new Error('Select form was not rendered')

		const values = new FormData(form).getAll('stack')
		if (values.length !== 2 || values[0] !== 'Next.js' || values[1] !== 'Astro') {
			throw new Error('Multiple select did not serialize repeated-name hidden inputs')
		}
	},
}
