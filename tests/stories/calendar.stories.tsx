/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story, StoryContext } from './app'
import { Calendar, type CalendarCaptionLayout, type CalendarDateRange, type CalendarModifiers } from 'ajo-ui-playa/calendar'

export default {
	title: 'UI/Calendar',
	component: Calendar,
	parameters: {
		docs: { description: 'Ajo-native calendar with single, multiple, and range selection.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Calendar>

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
const pad = (value: number) => String(value).padStart(2, '0')
const iso = (value: Date) => `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
const parse = (value: unknown) => typeof value === 'string' && value ? new Date(`${value}T12:00:00`) : undefined
const dates = (values: unknown) => (Array.isArray(values) ? values : [])
	.map(parse)
	.filter((value): value is Date => Boolean(value))
const label = (date: Date | undefined) => date
	? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
	: 'none'

const day = (canvas: HTMLElement, iso: string) => {
	const button = canvas.querySelector<HTMLButtonElement>(`[data-slot="calendar-day-button"][data-day="${iso}"]`)
	if (!button) throw new Error(`Calendar day ${iso} was not rendered`)
	return button
}
const monthCell = (canvas: HTMLElement, value: string) => {
	const button = canvas.querySelector<HTMLButtonElement>(`[data-slot="calendar-month-cell"][data-month="${value}"]`)
	if (!button) throw new Error(`Calendar month ${value} was not rendered`)
	return button
}
const yearCell = (canvas: HTMLElement, value: number) => {
	const button = canvas.querySelector<HTMLButtonElement>(`[data-slot="calendar-year-cell"][data-year="${value}"]`)
	if (!button) throw new Error(`Calendar year ${value} was not rendered`)
	return button
}
const key = async (button: HTMLButtonElement, value: string, init: KeyboardEventInit = {}) => {
	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key: value,
		...init,
	})

	button.dispatchEvent(event)
	await nextFrame()
	return event
}
const focusedDay = () => (document.activeElement as HTMLElement | null)?.dataset.day

type SingleArgs = {
	captionLayout?: CalendarCaptionLayout
	month?: string
	selected?: string
	setArg: StoryContext['setArg']
}

const SingleExample: Stateful<SingleArgs> = function* ({ captionLayout, month, selected: initial, setArg }) {
	let selected = parse(initial)

	// Update local state first so the mounted story reflects the selection, then
	// mirror it into the controls panel (which remounts the story).
	const select = (next: Date | null) => {
		this.next(() => selected = next ?? undefined)
		setArg('selected', selected ? iso(selected) : '')
	}

	while (true) yield (
		<div class="grid gap-3">
			<Calendar
				mode="single"
				selected={selected}
				onSelect={select}
				defaultMonth={parse(month)}
				captionLayout={captionLayout}
				class="rounded-lg edge shadow-xs"
			/>
			<p class="text-center text-sm text-muted-foreground">Selected: {label(selected)}</p>
		</div>
	)
}

type RangeArgs = {
	from?: string
	month?: string
	months?: number
	setArg: StoryContext['setArg']
	to?: string
}

const RangeExample: Stateful<RangeArgs> = function* ({ from, month, months, setArg, to }) {
	let selected: CalendarDateRange = { from: parse(from), to: parse(to) }

	const select = (next: CalendarDateRange | null) => {
		this.next(() => selected = next ?? {})
		setArg('from', selected.from ? iso(selected.from) : '')
		setArg('to', selected.to ? iso(selected.to) : '')
	}

	while (true) yield (
		<div class="grid gap-3">
			<Calendar
				mode="range"
				selected={selected}
				onSelect={select}
				defaultMonth={parse(month)}
				numberOfMonths={months}
				class="rounded-lg edge shadow-xs"
			/>
			<p class="text-center text-sm text-muted-foreground">
				Range: {label(selected.from)} - {label(selected.to)}
			</p>
		</div>
	)
}

type MultipleArgs = {
	dates?: string[]
	month?: string
	setArg: StoryContext['setArg']
}

const MultipleExample: Stateful<MultipleArgs> = function* ({ dates: initial, month, setArg }) {
	let selected = dates(initial)

	const select = (next: Date[]) => {
		this.next(() => selected = next)
		setArg('dates', selected.map(iso))
	}

	while (true) yield (
		<div class="grid gap-3">
			<Calendar
				mode="multiple"
				selected={selected}
				onSelect={select}
				defaultMonth={parse(month)}
				class="rounded-lg edge shadow-xs"
			/>
			<p class="text-center text-sm text-muted-foreground">Selected count: {selected.length}</p>
		</div>
	)
}

// Owner state mirrors every emission verbatim, so the plays observe the exact
// empty values: null for single and range, [] for multiple.
const ControlledExample: Stateful = function* () {
	let single: Date | null = parse('2026-07-15') ?? null
	let singleEmit = 'none'
	let multiple: Date[] = dates(['2026-07-08'])
	let multipleEmit = 'none'
	let range: CalendarDateRange | null = { from: parse('2026-07-06') }
	let rangeEmit = 'none'

	const onSingle = (next: Date | null) => this.next(() => {
		single = next
		singleEmit = next === null ? 'null' : iso(next)
	})
	const onMultiple = (next: Date[]) => this.next(() => {
		multiple = next
		multipleEmit = Array.isArray(next) ? `[${next.map(iso).join(',')}]` : 'not-an-array'
	})
	const onRange = (next: CalendarDateRange | null) => this.next(() => {
		range = next
		rangeEmit = next === null ? 'null' : `${next.from ? iso(next.from) : ''}..${next.to ? iso(next.to) : ''}`
	})

	while (true) yield (
		<div class="grid gap-4 lg:grid-cols-3">
			<div class="grid gap-2" data-testid="controlled-single">
				<Calendar mode="single" selected={single} onSelect={onSingle} defaultMonth={parse('2026-07-01')} class="rounded-lg edge shadow-xs" />
				<p class="text-center text-sm text-muted-foreground">Single emit: <span data-testid="single-emit">{singleEmit}</span></p>
			</div>
			<div class="grid gap-2" data-testid="controlled-multiple">
				<Calendar mode="multiple" selected={multiple} onSelect={onMultiple} defaultMonth={parse('2026-07-01')} class="rounded-lg edge shadow-xs" />
				<p class="text-center text-sm text-muted-foreground">Multiple emit: <span data-testid="multiple-emit">{multipleEmit}</span></p>
			</div>
			<div class="grid gap-2" data-testid="controlled-range">
				<Calendar mode="range" selected={range} onSelect={onRange} defaultMonth={parse('2026-07-01')} class="rounded-lg edge shadow-xs" />
				<p class="text-center text-sm text-muted-foreground">Range emit: <span data-testid="range-emit">{rangeEmit}</span></p>
			</div>
		</div>
	)
}

const AvailabilityExample: Stateful = function* () {
	let selected: Date | null = null

	const select = (next: Date | null) => this.next(() => selected = next)

	while (true) yield (
		<div class="grid gap-3">
			<Calendar
				mode="single"
				selected={selected}
				onSelect={select}
				defaultMonth={parse('2026-07-01')}
				disabled={parse('2026-07-10')}
				unavailable={parse('2026-07-11')}
				class="rounded-lg edge shadow-xs"
			/>
			<p class="text-center text-sm text-muted-foreground">
				Selected: <span data-testid="availability-selection">{selected ? iso(selected) : 'none'}</span>
			</p>
		</div>
	)
}

const MonthPickerExample: Stateful = function* () {
	let selected: Date | null = null
	const select = (next: Date | null) => this.next(() => selected = next)

	while (true) yield (
		<div class="grid gap-3">
			<Calendar defaultMonth={parse('2026-01-01')} minView="month" selected={selected} onSelect={select} class="rounded-lg edge shadow-xs" />
			<p class="text-center text-sm text-muted-foreground">Selected: <span data-testid="month-selection">{selected ? iso(selected) : 'none'}</span></p>
		</div>
	)
}

const MonthRangeExample: Stateful = function* () {
	let selected: CalendarDateRange = {}
	const select = (next: CalendarDateRange | null) => this.next(() => selected = next ?? {})

	while (true) yield (
		<div class="grid gap-3">
			<Calendar mode="range" defaultMonth={parse('2026-01-01')} minView="month" selected={selected} onSelect={select} class="rounded-lg edge shadow-xs" />
			<p class="text-center text-sm text-muted-foreground">
				Range: <span data-testid="month-range-selection">{selected?.from ? iso(selected.from) : ''}..{selected?.to ? iso(selected.to) : ''}</span>
			</p>
		</div>
	)
}

const PresetCalendarExample: Stateful = function* () {
	let selected: CalendarDateRange = { from: parse('2026-01-01'), to: parse('2026-03-31') }
	const preset = (from: string, to: string) => this.next(() => selected = { from: parse(from), to: parse(to) })

	while (true) yield (
		<div class="grid gap-3">
			<div class="flex justify-center gap-2">
				<button class="rounded-md edge px-3 py-1.5 text-sm" data-testid="preset-q1" type="button" set:onclick={() => preset('2026-01-01', '2026-03-31')}>Q1</button>
				<button class="rounded-md edge px-3 py-1.5 text-sm" data-testid="preset-q2" type="button" set:onclick={() => preset('2026-04-01', '2026-06-30')}>Q2</button>
			</div>
			<Calendar mode="range" defaultMonth={parse('2026-01-01')} minView="month" selected={selected} onSelect={next => this.next(() => selected = next ?? {})} class="rounded-lg edge shadow-xs" />
			<output class="text-center text-sm text-muted-foreground" data-testid="preset-selection">{selected.from ? iso(selected.from) : ''}..{selected.to ? iso(selected.to) : ''}</output>
		</div>
	)
}

export const Basic: Story = {
	args: {
		selected: '2026-07-01',
		month: '2026-07-01',
		captionLayout: 'dropdown',
	},
	argTypes: {
		captionLayout: { control: 'select', options: ['button', 'label', 'dropdown', 'dropdown-months', 'dropdown-years'] },
		month: { description: 'Initial visible month (ISO date)' },
		selected: { description: 'Selected day (ISO date)' },
	},
	render: (args, { setArg }) => (
		<SingleExample
			captionLayout={args.captionLayout}
			month={args.month}
			selected={args.selected}
			setArg={setArg}
		/>
	),
	play: async ({ canvas }) => {
		const first = day(canvas, '2026-07-01')
		const second = day(canvas, '2026-07-02')
		const transitions = getComputedStyle(first).transitionProperty.split(',').map(value => value.trim())
		const firstCell = first.closest<HTMLElement>('[data-slot="calendar-day"]')
		const secondCell = second.closest<HTMLElement>('[data-slot="calendar-day"]')
		if (!firstCell || !secondCell) throw new Error('Calendar day cells were not rendered')
		if (first.getAttribute('data-selected-single') !== 'true') {
			throw new Error('Calendar did not render initial single selection')
		}
		if (first.dataset.state !== 'selected' || second.dataset.state !== 'unselected') {
			throw new Error('Calendar day buttons lost their whole-selection state')
		}
		if (firstCell.dataset.selected !== 'true' || secondCell.hasAttribute('data-selected')) {
			throw new Error('Calendar day cells did not expose their boolean selection flag')
		}
		if (firstCell.hasAttribute('data-state') || secondCell.hasAttribute('data-state')) {
			throw new Error('Calendar day cells duplicated selection through data-state')
		}
		if (transitions.includes('all') || !['background-color', 'box-shadow', 'color'].every(value => transitions.includes(value))) {
			throw new Error('Calendar day button lost its narrow transition ownership')
		}

		day(canvas, '2026-07-15').click()
		await nextFrame()

		if (!canvas.textContent?.includes('Selected: Jul 15, 2026')) {
			throw new Error('Calendar single selection did not update')
		}

		if (!day(canvas, '2026-06-28').disabled) {
			throw new Error('Calendar outside day should not be selectable')
		}
	},
}

export const DrillUpNavigation: Story = {
	parameters: {
		docs: { description: 'The default caption is a drill trigger: day → month → year, while Escape walks back down and relocates focus at each scale.' },
	},
	render: () => <Calendar defaultMonth={parse('2026-07-01')} fromYear={2000} toYear={2030} class="rounded-lg edge shadow-xs" />,
	play: async ({ canvas }) => {
		const trigger = () => canvas.querySelector<HTMLButtonElement>('[data-slot="calendar-view-trigger"]')
		if (!trigger()) throw new Error('Default caption did not render as a view trigger')
		trigger()!.click()
		await nextFrame()
		if (!canvas.querySelector('[data-slot="calendar-month-view"]') || document.activeElement !== monthCell(canvas, '2026-07')) {
			throw new Error('Day → month drill did not relocate focus to the anchored month')
		}
		trigger()!.click()
		await nextFrame()
		if (!canvas.querySelector('[data-slot="calendar-year-view"]') || document.activeElement !== yearCell(canvas, 2026)) {
			throw new Error('Month → year drill did not relocate focus to the anchored year')
		}
		await key(yearCell(canvas, 2026), 'Escape')
		if (!canvas.querySelector('[data-slot="calendar-month-view"]') || document.activeElement !== monthCell(canvas, '2026-07')) {
			throw new Error('Escape did not drill back to the anchored month')
		}
		await key(monthCell(canvas, '2026-07'), 'Escape')
		if (!canvas.querySelector('[data-slot="calendar-grid"]') || focusedDay() !== '2026-07-01') {
			throw new Error('Escape did not return to the anchored day grid')
		}
	},
}

export const MonthPicker: Story = {
	parameters: {
		docs: { description: 'minView="month" turns the same Calendar into a whole-month picker; values are first-of-month Dates and the normal null clear convention remains.' },
	},
	render: () => <MonthPickerExample />,
	play: async ({ canvas }) => {
		monthCell(canvas, '2026-02').click()
		await nextFrame()
		if (canvas.querySelector('[data-testid="month-selection"]')?.textContent !== '2026-02-01') {
			throw new Error('Month picker did not emit the first day of the month')
		}
		if (monthCell(canvas, '2026-02').dataset.selected !== 'true') throw new Error('Picked month was not selected')
		monthCell(canvas, '2026-02').click()
		await nextFrame()
		if (canvas.querySelector('[data-testid="month-selection"]')?.textContent !== 'none') throw new Error('Month picker did not clear to null')
	},
}

export const MonthRangePicker: Story = {
	parameters: {
		docs: { description: 'Month ranges preserve the day-granular inclusive model: from is the first day and to is the final day of the ending month.' },
	},
	render: () => <MonthRangeExample />,
	play: async ({ canvas }) => {
		monthCell(canvas, '2026-04').click()
		monthCell(canvas, '2026-02').click()
		await nextFrame()
		if (canvas.querySelector('[data-testid="month-range-selection"]')?.textContent !== '2026-02-01..2026-04-30') {
			throw new Error('Month range did not emit inclusive canonical endpoints')
		}
		if (monthCell(canvas, '2026-02').dataset.rangeStart !== 'true' || monthCell(canvas, '2026-03').dataset.rangeMiddle !== 'true' || monthCell(canvas, '2026-04').dataset.rangeEnd !== 'true') {
			throw new Error('Month range selection states were not painted')
		}
	},
}

export const DOBViaDrill: Story = {
	parameters: {
		docs: { description: 'Distant dates use the default drill chain instead of requiring dropdown caption chrome.' },
	},
	render: () => <Calendar defaultMonth={parse('2026-07-01')} fromYear={1900} toYear={2026} class="rounded-lg edge shadow-xs" />,
	play: async ({ canvas }) => {
		canvas.querySelector<HTMLButtonElement>('[data-slot="calendar-view-trigger"]')!.click()
		await nextFrame()
		canvas.querySelector<HTMLButtonElement>('[data-slot="calendar-view-trigger"]')!.click()
		await nextFrame()
		yearCell(canvas, 2020).click()
		await nextFrame()
		monthCell(canvas, '2020-06').click()
		await nextFrame()
		day(canvas, '2020-06-15').click()
		await nextFrame()
		if (day(canvas, '2020-06-15').dataset.state !== 'selected') throw new Error('DOB drill did not commit the final day')
	},
}

export const PresetComposition: Story = {
	parameters: {
		docs: { description: 'Standalone Calendar needs no preset API: ordinary application buttons set the same controlled range as onSelect; quarters remain presets, not a mode.' },
	},
	render: () => <PresetCalendarExample />,
	play: async ({ canvas }) => {
		canvas.querySelector<HTMLButtonElement>('[data-testid="preset-q2"]')!.click()
		await nextFrame()
		if (canvas.querySelector('[data-testid="preset-selection"]')?.textContent !== '2026-04-01..2026-06-30') {
			throw new Error('Application-owned preset did not update Calendar')
		}
		if (monthCell(canvas, '2026-04').dataset.rangeStart !== 'true' || monthCell(canvas, '2026-06').dataset.rangeEnd !== 'true') {
			throw new Error('Preset-controlled quarter did not paint its month range')
		}
	},
}

export const KeyboardNavigation: Story = {
	args: {
		endMonth: '2026-07-01',
		month: '2026-06-01',
		weekStartsOn: 1,
	},
	argTypes: {
		endMonth: { description: 'Last navigable month (ISO date)' },
		month: { description: 'Initial visible month (ISO date)' },
		weekStartsOn: { control: 'select', options: [0, 1, 2, 3, 4, 5, 6] },
	},
	render: args => (
		<Calendar
			mode="single"
			defaultMonth={parse(args.month)}
			endMonth={parse(args.endMonth)}
			numberOfMonths={2}
			weekStartsOn={args.weekStartsOn}
			class="rounded-lg edge shadow-xs"
		/>
	),
	play: async ({ canvas }) => {
		const previous = canvas.querySelector<HTMLButtonElement>('[data-slot="calendar-previous"]')
		const next = canvas.querySelector<HTMLButtonElement>('[data-slot="calendar-next"]')
		if (!previous || !next) throw new Error('Calendar navigation buttons were not rendered')
		if (previous.disabled || previous.hasAttribute('aria-disabled')) {
			throw new Error('Calendar previous navigation should remain enabled')
		}
		if (!next.disabled || next.getAttribute('aria-disabled') !== 'true') {
			throw new Error('Calendar next navigation lost native or accessible disabled state')
		}
		if (previous.hasAttribute('data-state') || next.hasAttribute('data-state')) {
			throw new Error('Calendar navigation duplicated disabled state through data-state')
		}

		const start = day(canvas, '2026-07-15')
		start.focus()

		const right = await key(start, 'ArrowRight')
		if (!right.defaultPrevented || focusedDay() !== '2026-07-16') {
			throw new Error('Calendar ArrowRight did not focus the next day')
		}

		const left = await key(document.activeElement as HTMLButtonElement, 'ArrowLeft')
		if (!left.defaultPrevented || focusedDay() !== '2026-07-15') {
			throw new Error('Calendar ArrowLeft did not focus the previous day')
		}

		const down = await key(day(canvas, '2026-07-15'), 'ArrowDown')
		if (!down.defaultPrevented || focusedDay() !== '2026-07-22') {
			throw new Error('Calendar ArrowDown did not cross into the next visible week')
		}

		day(canvas, '2026-07-16').focus()
		const home = await key(day(canvas, '2026-07-16'), 'Home')
		if (!home.defaultPrevented || focusedDay() !== '2026-07-13') {
			throw new Error('Calendar Home did not focus the configured week start')
		}

		day(canvas, '2026-07-15').focus()
		const page = await key(day(canvas, '2026-07-15'), 'PageDown')
		if (!page.defaultPrevented || focusedDay() !== '2026-07-15' || canvas.querySelector('[data-month="2026-08-01"]')) {
			throw new Error('Calendar PageDown moved focus past the last allowed month')
		}
	},
}

export const Range: Story = {
	args: {
		from: '2026-01-12',
		to: '2026-02-06',
		month: '2026-01-01',
		months: 2,
	},
	argTypes: {
		from: { description: 'Range start (ISO date)' },
		month: { description: 'Initial visible month (ISO date)' },
		months: { control: 'number', min: 1, max: 3 },
		to: { description: 'Range end (ISO date)' },
	},
	render: (args, { setArg }) => (
		<RangeExample
			from={args.from}
			to={args.to}
			month={args.month}
			months={args.months}
			setArg={setArg}
		/>
	),
	play: async ({ canvas }) => {
		if (day(canvas, '2026-01-12').getAttribute('data-range-start') !== 'true') {
			throw new Error('Calendar range start was not rendered')
		}
		if (day(canvas, '2026-01-20').getAttribute('data-range-middle') !== 'true') {
			throw new Error('Calendar range middle was not rendered')
		}
		if (day(canvas, '2026-02-06').getAttribute('data-range-end') !== 'true') {
			throw new Error('Calendar range end was not rendered')
		}

		day(canvas, '2026-02-10').click()
		await nextFrame()

		if (!canvas.textContent?.includes('Range: Feb 10, 2026 - none')) {
			throw new Error('Calendar range restart did not update')
		}

		if (!canvas.querySelector('[data-month="2026-01-01"]')) {
			throw new Error('Calendar view should not shift when selecting in the second month')
		}
	},
}

export const Multiple: Story = {
	args: {
		dates: ['2026-07-06', '2026-07-08'],
		month: '2026-07-01',
	},
	argTypes: {
		dates: { description: 'Selected days (ISO dates)' },
		month: { description: 'Initial visible month (ISO date)' },
	},
	render: (args, { setArg }) => (
		<MultipleExample dates={args.dates} month={args.month} setArg={setArg} />
	),
	play: async ({ canvas }) => {
		if (day(canvas, '2026-07-06').getAttribute('data-selected-single') !== 'true') {
			throw new Error('Calendar multiple selection did not mark selected dates')
		}

		day(canvas, '2026-07-10').click()
		await nextFrame()

		if (!canvas.textContent?.includes('Selected count: 3')) {
			throw new Error('Calendar multiple selection did not add a date')
		}
	},
}

export const Controlled: Story = {
	parameters: {
		docs: { description: 'Controlled per-mode empty emissions: single and range emit null, multiple emits [].' },
	},
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const pane = (id: string) => {
			const found = canvas.querySelector<HTMLElement>(`[data-testid="${id}"]`)
			if (!found) throw new Error(`Controlled pane ${id} was not rendered`)
			return found
		}
		const emit = (id: string) => canvas.querySelector(`[data-testid="${id}"]`)?.textContent

		// Single: toggling the selected day off echoes null through the owner.
		const single = pane('controlled-single')
		day(single, '2026-07-15').click()
		await nextFrame()
		if (emit('single-emit') !== 'null') throw new Error('Controlled single did not emit null on clear')
		if (day(single, '2026-07-15').getAttribute('data-selected-single') === 'true') {
			throw new Error('Controlled single kept the cleared selection (controlled clearing echo)')
		}

		// Still controlled after the null round-trip.
		day(single, '2026-07-20').click()
		await nextFrame()
		if (emit('single-emit') !== '2026-07-20' || day(single, '2026-07-20').getAttribute('data-selected-single') !== 'true') {
			throw new Error('Controlled single did not stay controlled after clearing')
		}

		// Multiple: toggling the last date off emits [] and never null.
		const multiple = pane('controlled-multiple')
		day(multiple, '2026-07-08').click()
		await nextFrame()
		if (emit('multiple-emit') !== '[]') throw new Error('Controlled multiple did not emit [] on last toggle-off')
		if (day(multiple, '2026-07-08').getAttribute('data-selected-single') === 'true') {
			throw new Error('Controlled multiple kept the cleared selection')
		}

		// Range: clicking the lone start emits null and clears both ends.
		const range = pane('controlled-range')
		day(range, '2026-07-06').click()
		await nextFrame()
		if (emit('range-emit') !== 'null') throw new Error('Controlled range did not emit null on clear')
		if (day(range, '2026-07-06').getAttribute('data-range-start') === 'true') {
			throw new Error('Controlled range kept the cleared selection')
		}
	},
}

export const WeekNumbers: Story = {
	args: {
		month: '2026-02-01',
		showWeekNumber: true,
	},
	argTypes: {
		month: { description: 'Initial visible month (ISO date)' },
	},
	render: args => (
		<Calendar
			mode="single"
			defaultMonth={parse(args.month)}
			showWeekNumber={Boolean(args.showWeekNumber)}
			class="rounded-lg edge shadow-xs"
		/>
	),
	play: async ({ canvas }) => {
		const numbers = canvas.querySelectorAll('[data-slot="calendar-week-number"]')
		const header = canvas.querySelector('[data-slot="calendar-week-number-header"]')
		if (!header || numbers.length < 4) {
			throw new Error('Calendar week numbers were not rendered')
		}
	},
}

export const DisabledAndModifiers: Story = {
	args: {
		booked: ['2026-07-14', '2026-07-15'],
		month: '2026-07-01',
		weekends: true,
	},
	argTypes: {
		booked: { description: 'Booked days (ISO dates)' },
		month: { description: 'Initial visible month (ISO date)' },
		weekends: { control: 'boolean', label: 'Disable weekends' },
	},
	render: args => (
		<Calendar
			mode="single"
			defaultMonth={parse(args.month)}
			disabled={args.weekends ? { dayOfWeek: [0, 6] } : undefined}
			modifiers={{ booked: dates(args.booked) }}
			modifiersClassNames={{ booked: 'after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-danger' }}
			renderDay={(date: Date, modifiers: CalendarModifiers) => (
				<>
					{date.getDate()}
					{modifiers.disabled ? <span>closed</span> : null}
				</>
			)}
			class="rounded-lg edge shadow-xs [--cell-size:2.75rem]"
		/>
	),
	play: async ({ canvas }) => {
		if (!day(canvas, '2026-07-04').disabled) {
			throw new Error('Calendar disabled matcher did not disable weekend')
		}
		const booked = canvas.querySelector('[data-slot="calendar-day"][data-modifier-booked="true"]')
		if (!booked) throw new Error('Calendar custom modifier was not rendered')
	},
}

export const UnavailableVsDisabled: Story = {
	render: () => <AvailabilityExample />,
	play: async ({ canvas }) => {
		const disabled = day(canvas, '2026-07-10')
		const unavailable = day(canvas, '2026-07-11')
		const selected = () => canvas.querySelector('[data-testid="availability-selection"]')?.textContent

		if (!disabled.disabled || disabled.dataset.disabled !== 'true') {
			throw new Error('Calendar disabled day was not a native hard block')
		}
		if (unavailable.disabled || unavailable.dataset.unavailable !== 'true') {
			throw new Error('Calendar unavailable day was not independently exposed')
		}
		if (unavailable.getAttribute('aria-disabled') !== 'true') {
			throw new Error('Calendar unavailable day was not announced')
		}
		if (!getComputedStyle(unavailable).textDecorationLine.includes('line-through')) {
			throw new Error('Calendar unavailable theme did not use a strikethrough')
		}

		unavailable.focus()
		unavailable.click()
		await nextFrame()
		if (document.activeElement !== unavailable || selected() !== '2026-07-11') {
			throw new Error('Calendar unavailable day was not focusable and selectable')
		}

		disabled.click()
		await nextFrame()
		if (selected() !== '2026-07-11') {
			throw new Error('Calendar disabled day emitted a selection')
		}
	},
}

export const LocaleRtl: Story = {
	args: {
		dir: 'rtl',
		locale: 'ar-SA',
		month: '2026-07-01',
		weekStartsOn: 6,
	},
	argTypes: {
		dir: { control: 'radio', options: ['ltr', 'rtl'] },
		month: { description: 'Initial visible month (ISO date)' },
		weekStartsOn: { control: 'select', options: [0, 1, 2, 3, 4, 5, 6] },
	},
	render: args => (
		<Calendar
			mode="single"
			defaultMonth={parse(args.month)}
			locale={args.locale}
			dir={args.dir}
			weekStartsOn={args.weekStartsOn}
			class="rounded-lg edge shadow-xs"
		/>
	),
	play: async ({ canvas }) => {
		const calendar = canvas.querySelector<HTMLElement>('[data-slot="calendar"]')
		if (calendar?.getAttribute('dir') !== 'rtl') {
			throw new Error('Calendar did not preserve RTL direction')
		}
		if (!day(canvas, '2026-07-01').textContent?.trim()) {
			throw new Error('Calendar localized day did not render')
		}

		const start = day(canvas, '2026-07-15')
		start.focus()

		const right = await key(start, 'ArrowRight')
		if (!right.defaultPrevented || focusedDay() !== '2026-07-14') {
			throw new Error('Calendar RTL ArrowRight did not focus the previous date')
		}

		const left = await key(document.activeElement as HTMLButtonElement, 'ArrowLeft')
		if (!left.defaultPrevented || focusedDay() !== '2026-07-15') {
			throw new Error('Calendar RTL ArrowLeft did not focus the next date')
		}
	},
}

export const TimeZone: Story = {
	args: {
		selected: '2026-07-20T03:00:00.000Z',
		month: '2026-07-01',
		timeZone: 'America/Argentina/Buenos_Aires',
	},
	argTypes: {
		month: { description: 'Initial visible month (ISO date)' },
		selected: { description: 'Selected instant (ISO timestamp)' },
	},
	render: args => (
		<Calendar
			mode="single"
			selected={args.selected ? new Date(args.selected) : undefined}
			defaultMonth={parse(args.month)}
			timeZone={args.timeZone}
			class="rounded-lg edge shadow-xs"
		/>
	),
	play: async ({ canvas }) => {
		if (day(canvas, '2026-07-20').getAttribute('data-selected-single') !== 'true') {
			throw new Error('Calendar timezone selected date was not stable')
		}
	},
}
