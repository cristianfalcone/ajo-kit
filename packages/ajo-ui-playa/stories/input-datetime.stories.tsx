/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { frame, press } from './play'
import { DirectionProvider } from 'ajo-ui-playa/direction'
import { Field, FieldLabel } from 'ajo-ui-playa/field'
import { InputDateTime } from 'ajo-ui-playa/input-date'

const july = new Date(2026, 6, 1)

const segment = (scope: Element, unit: string) => {
	const found = scope.querySelector<HTMLElement>(`[data-segment="${unit}"]`)
	if (!found) throw new Error(`Segment ${unit} was not rendered`)
	return found
}

const hidden = (scope: Element, name: string) => {
	const input = scope.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)
	if (!input) throw new Error(`Hidden input ${name} was not rendered`)
	return input
}

// Fresh reads per assertion: property narrowing would chain !== comparisons.
const val = (input: HTMLInputElement) => input.value
const text = (element: HTMLElement) => element.textContent ?? ''

const trigger = (scope: Element) => {
	const found = scope.querySelector<HTMLButtonElement>('[data-slot="input-date-trigger"]')
	if (!found) throw new Error('Calendar trigger was not rendered')
	return found
}

const content = (scope: Element) => {
	const found = scope.querySelector<HTMLElement>('[data-slot="input-date-content"]')
	if (!found) throw new Error('Calendar popover was not rendered')
	return found
}

const day = (scope: Element, iso: string) => {
	const button = scope.querySelector<HTMLButtonElement>(`[data-slot="calendar-day-button"][data-day="${iso}"]`)
	if (!button) throw new Error(`Calendar day ${iso} was not rendered`)
	return button
}

// The spec pins typing to synthetic beforeinput: KeyboardEvent dispatch never
// produces one, and a keydown-driven engine would pass plays but break mobile.
// Each key lands on the focused segment, so auto-advance is exercised too.
const typeKeys = async (start: HTMLElement, data: string) => {
	start.focus()
	for (const key of data) {
		const active = document.activeElement
		const target = active instanceof HTMLElement && active.dataset.segment ? active : start
		target.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: key, cancelable: true, bubbles: true }))
		await frame(2)
	}
}

// Hardware spin keys arrive as keydown (spin clove path).
const step = async (target: HTMLElement, key: string) => {
	target.focus()
	press(target, key)
	await frame(2)
}

const blur = async () => {
	const active = document.activeElement
	if (active instanceof HTMLElement) active.blur()
	await frame(2)
}

export default {
	title: 'UI/Input Datetime',
	component: InputDateTime,
	parameters: {
		docs: { description: 'Segment-based date-time field: one locale-ordered row of date and time segments; the calendar merges picked days with entered time.' },
		layout: 'centered',
	},
} satisfies Meta<typeof InputDateTime>

export const Basic: Story<typeof InputDateTime> = {
	parameters: {
		docs: { description: 'Full date+time segment row; the completing keystroke commits yyyy-mm-ddTHH:mm eagerly.' },
	},
	render: () => (
		<Field class="w-96">
			<FieldLabel>Meeting</FieldLabel>
			<InputDateTime locale="en-US" name="meeting" />
		</Field>
	),
	play: async ({ canvas }) => {
		const order = Array.from(canvas.querySelectorAll<HTMLElement>('[data-segment]')).map(item => item.dataset.segment)
		if (order.join(',') !== 'month,day,year,hour,minute,dayPeriod') {
			throw new Error(`en-US datetime segment order was ${order.join(' ')}`)
		}
		const value = hidden(canvas, 'meeting')

		// Everything but dayPeriod: the field must not commit until complete.
		await typeKeys(segment(canvas, 'month'), '3142026915')
		if (val(value) !== '') throw new Error('An incomplete field must not commit')

		await typeKeys(segment(canvas, 'dayPeriod'), 'a')
		if (val(value) !== '2026-03-14T09:15') {
			throw new Error(`Completing keystroke must commit 2026-03-14T09:15, got "${val(value)}"`)
		}

		await blur()
	},
}

export const CalendarMerge: Story<typeof InputDateTime> = {
	parameters: {
		docs: { description: 'A picked day merges with the time entered in the field, or seeds it from the placeholder, commits and closes the calendar.' },
	},
	render: () => (
		<div class="grid w-96 gap-4">
			<Field>
				<FieldLabel>Pickup (typed time)</FieldLabel>
				<InputDateTime locale="en-US" name="pickup" placeholderValue="2026-07-15T08:00" calendar={{ defaultMonth: july }} />
			</Field>
			<Field>
				<FieldLabel>Dropoff (seeded time)</FieldLabel>
				<InputDateTime locale="en-US" name="dropoff" placeholderValue="2026-07-15T08:00" calendar={{ defaultMonth: july }} />
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		const roots = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="input-datetime"]'))
		if (roots.length !== 2) throw new Error('CalendarMerge story did not render both fields')
		const [pickup, dropoff] = roots
		if (roots.some(root => root.querySelectorAll('[data-segment="hour"]').length !== 1)) {
			throw new Error('Each field must render exactly one hour segment')
		}

		// Staged time first: no commit yet, the pick merges the date and keeps 2:30 PM.
		await typeKeys(segment(pickup, 'hour'), '230p')
		if (val(hidden(pickup, 'pickup')) !== '') throw new Error('Time without a date must not commit')
		trigger(pickup).click()
		await frame(2)
		if (trigger(pickup).getAttribute('aria-expanded') !== 'true') throw new Error('Trigger did not open the calendar popover')
		day(pickup, '2026-07-15').click()
		await frame(2)
		if (val(hidden(pickup, 'pickup')) !== '2026-07-15T14:30') {
			throw new Error(`Pick must merge the typed 2:30 PM into 2026-07-15T14:30, got "${val(hidden(pickup, 'pickup'))}"`)
		}
		if (trigger(pickup).getAttribute('aria-expanded') !== 'false') throw new Error('A completed pick must close the popover')

		// No time entered: the pick seeds placeholder-value time.
		trigger(dropoff).click()
		await frame(2)
		day(dropoff, '2026-07-20').click()
		await frame(2)
		if (val(hidden(dropoff, 'dropoff')) !== '2026-07-20T08:00') {
			throw new Error(`Pick must seed placeholder time into 2026-07-20T08:00, got "${val(hidden(dropoff, 'dropoff'))}"`)
		}
		if (getComputedStyle(content(dropoff)).display !== 'none') throw new Error('A completed pick left the popover visible')

		await blur()
	},
}

export const Seconds: Story<typeof InputDateTime> = {
	parameters: {
		docs: { description: 'Seconds in the defaultValue force the segment with no granularity arg; a complete field commits every mutation eagerly.' },
	},
	render: () => (
		<Field class="w-96">
			<FieldLabel>Backup</FieldLabel>
			<InputDateTime calendar={{ defaultMonth: july }} locale="en-US" defaultValue="2026-07-10T09:00:30" name="backup" />
		</Field>
	),
	play: async ({ canvas }) => {
		const second = segment(canvas, 'second')
		const value = hidden(canvas, 'backup')
		if (text(second) !== '30') throw new Error('Seconds did not latch from the defaultValue')
		if (val(value) !== '2026-07-10T09:00:30') throw new Error('Seconds field did not adopt its defaultValue')

		await step(second, 'ArrowUp')
		if (val(value) !== '2026-07-10T09:00:31') throw new Error(`Spinning a complete field must commit eagerly, got "${val(value)}"`)
		await step(second, 'ArrowDown')
		if (val(value) !== '2026-07-10T09:00:30') throw new Error('ArrowDown did not step the seconds back')

		await blur()
	},
}

export const CyclesAndStep: Story<typeof InputDateTime> = {
	parameters: {
		docs: { description: 'The time segments follow the 12h/24h option and the minute step.' },
	},
	render: () => (
		<div class="grid w-96 gap-4">
			<div data-datetime-example="twelve">
				<InputDateTime calendar={{ defaultMonth: july }} defaultValue="2026-07-10T09:00" hourCycle={12} locale="en-US" name="twelve" />
			</div>
			<div data-datetime-example="twenty-four">
				<InputDateTime calendar={{ defaultMonth: july }} defaultValue="2026-07-10T09:00" hourCycle={24} locale="en-US" name="twenty-four" step={15} />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const twelve = canvas.querySelector<HTMLElement>('[data-datetime-example="twelve"]')
		const twentyFour = canvas.querySelector<HTMLElement>('[data-datetime-example="twenty-four"]')
		if (!twelve || !twentyFour) throw new Error('Cycle examples were not rendered')
		if (!twelve.querySelector('[data-segment="dayPeriod"]')) throw new Error('12h field did not render dayPeriod')
		if (twentyFour.querySelector('[data-segment="dayPeriod"]')) throw new Error('24h field rendered dayPeriod')

		await step(segment(twentyFour, 'minute'), 'ArrowUp')
		if (val(hidden(twentyFour, 'twenty-four')) !== '2026-07-10T09:15') {
			throw new Error('The minute segment did not inherit step={15}')
		}

		await blur()
	},
}

export const Range: Story<typeof InputDateTime> = {
	parameters: {
		docs: { description: 'Check-in/check-out over one shared calendar: each end takes the seeded time and the popover closes once both ends are picked.' },
	},
	render: () => (
		<Field class="w-[36rem]">
			<FieldLabel>Stay</FieldLabel>
			<InputDateTime<true> range locale="en-US" name="stay" placeholderValue="2026-07-01T15:00" calendar={{ defaultMonth: july }} />
		</Field>
	),
	play: async ({ canvas }) => {
		const sides = canvas.querySelectorAll('[data-slot="input-date-field"]')
		if (sides.length !== 2) throw new Error('Range story did not render both field groups')
		const from = hidden(canvas, 'stay[from]')
		const to = hidden(canvas, 'stay[to]')

		trigger(canvas).click()
		await frame(2)
		day(canvas, '2026-07-20').click()
		await frame(2)
		// Progressive emission: from commits with seeded 15:00, to stays empty.
		if (val(from) !== '2026-07-20T15:00' || val(to) !== '') {
			throw new Error(`First pick must fill from only, got from "${val(from)}" to "${val(to)}"`)
		}
		if (trigger(canvas).getAttribute('aria-expanded') !== 'true') {
			throw new Error('Popover must stay open while the range is incomplete')
		}

		day(canvas, '2026-07-25').click()
		await frame(2)
		if (val(from) !== '2026-07-20T15:00' || val(to) !== '2026-07-25T15:00') {
			throw new Error(`Second pick must complete the range, got from "${val(from)}" to "${val(to)}"`)
		}
		if (getComputedStyle(content(canvas)).display !== 'none') throw new Error('Completing the range must close the popover')
	},
}

const stay = { from: '2026-07-20T15:00', to: '2026-07-25T15:00' }

export const RightToLeft: Story<typeof InputDateTime> = {
	name: 'Right to Left',
	parameters: {
		docs: { description: 'A right-to-left page at phone width: each group reads in its locale\'s direction (English stays "3:00 PM", Arabic keeps the day on the right) and a long range keeps its start in view.' },
		viewport: { height: 900, width: 390 },
	},
	render: () => (
		<DirectionProvider dir="rtl">
			<div class="grid w-[358px] grid-cols-[minmax(0,1fr)] gap-4">
				<Field data-story-field="en">
					<FieldLabel>Stay</FieldLabel>
					<InputDateTime<true> range locale="en-US" defaultValue={stay} />
				</Field>
				<Field data-story-field="ar">
					<FieldLabel>الإقامة</FieldLabel>
					<InputDateTime<true> range locale="ar" defaultValue={stay} />
				</Field>
			</div>
		</DirectionProvider>
	),
	play: async ({ canvas }) => {
		const box = (element: Element) => element.getBoundingClientRect()
		const orderOf = (group: Element) => Array.from(group.querySelectorAll<HTMLElement>('[data-segment]'))
			.map(item => ({ left: box(item).left, unit: item.dataset.segment }))
			.sort((a, b) => a.left - b.left).map(item => item.unit).join(' ')
		const reading = {
			ar: 'dayPeriod hour minute year month day',
			en: 'month day year hour minute dayPeriod',
		}
		for (const [name, dir] of [['en', 'ltr'], ['ar', 'rtl']] as const) {
			const scope = canvas.querySelector(`[data-story-field="${name}"]`)
			const control = scope?.querySelector('[data-slot="input-date-control"]')
			const from = scope?.querySelector('[data-slot="input-date-field"][data-side="from"]')
			if (!control || !from) throw new Error(`The ${name} range was not rendered`)
			if (from.getAttribute('dir') !== dir) throw new Error(`The ${name} group must read ${dir}, got ${from.getAttribute('dir')}`)

			// Overflow goes to the inline end: the start date is never clipped.
			const edges = box(control)
			for (const item of from.querySelectorAll('[data-segment]')) {
				const { left, right } = box(item)
				if (left < edges.left - 0.5 || right > edges.right + 0.5) {
					throw new Error(`The ${name} start ${(item as HTMLElement).dataset.segment} is clipped outside the control`)
				}
			}

			// On screen, left to right, the group reads like its formatted
			// string: Arabic puts the day on the right and keeps "3:00" whole.
			const order = orderOf(from)
			const expected = reading[name]
			if (order !== expected) throw new Error(`The ${name} start must read ${expected} from the left, got ${order}`)
		}

		// Arrows move on screen, across groups: walking left from the rightmost
		// segment, every step lands on the nearest segment to its left.
		for (const name of ['ar', 'en']) {
			const control = canvas.querySelector(`[data-story-field="${name}"] [data-slot="input-date-control"]`)
			if (!control) throw new Error(`The ${name} control was not rendered`)
			const items = () => Array.from(control.querySelectorAll<HTMLElement>('[data-segment]'))
			const sides = new Set<string>()
			let current = items().reduce((right, item) => box(item).left > box(right).left ? item : right)
			current.focus()
			while (true) {
				sides.add(current.dataset.side ?? '')
				const edge = box(current).left
				const next = items().filter(item => box(item).left < edge).sort((a, b) => box(b).left - box(a).left)[0]
				press(current, 'ArrowLeft')
				await frame()
				if (document.activeElement !== (next ?? current)) {
					throw new Error(`ArrowLeft from the ${name} ${current.dataset.side} ${current.dataset.segment} must reach ${next ? `the ${next.dataset.side} ${next.dataset.segment}` : 'nothing'}`)
				}
				if (!next) break
				current = next
			}
			if (!sides.has('from') || !sides.has('to')) throw new Error(`ArrowLeft must walk both ${name} groups`)
			control.scrollLeft = 0
		}

		// A neutral or Latin placeholder must not move an Arabic unit across
		// its neighbours: the group reads the same in every fill state.
		const from = canvas.querySelector<HTMLElement>('[data-story-field="ar"] [data-slot="input-date-field"][data-side="from"]')
		if (!from) throw new Error('The Arabic start group was not rendered')
		const hour = segment(from, 'hour')
		const minute = segment(from, 'minute')
		const filled = text(from)
		const still = (state: string) => {
			const order = orderOf(from)
			if (order !== reading.ar) throw new Error(`The Arabic start must read ${reading.ar} from the left when ${state}, got ${order}`)
		}
		const clear = async (target: HTMLElement) => {
			for (let tries = 0; target.dataset.placeholder !== 'true'; tries++) {
				if (tries > 3) throw new Error(`The Arabic ${target.dataset.segment} did not clear`)
				await step(target, 'Backspace')
			}
		}
		still('filled')
		await clear(minute)
		still('its minute is empty')
		await clear(hour)
		still('both are empty')
		await typeKeys(hour, '3')
		still('half typed')
		await typeKeys(minute, '00')
		await blur()
		still('its time is refilled')
		await clear(segment(from, 'year'))
		still('its year is empty')
		const period = text(segment(from, 'dayPeriod'))
		for (const unit of ['month', 'day', 'dayPeriod', 'hour', 'minute']) await clear(segment(from, unit))
		still('every unit is empty')
		for (const [unit, keys] of [['year', '2026'], ['month', '7'], ['day', '20'], ['hour', '3'], ['minute', '00'], ['dayPeriod', period]]) {
			await typeKeys(segment(from, unit), keys)
		}
		await blur()
		if (text(from) !== filled) throw new Error(`The Arabic start did not refill: ${text(from)}`)
		still('refilled')
	},
}

const ControlledExample: Stateful = function* () {
	let value: string | null = '2026-07-10T09:00'
	const change = (next: string | null) => this.next(() => value = next)

	while (true) yield (
		<div class="grid w-96 gap-3">
			<InputDateTime locale="en-US" clearable value={value} onValueChange={change} />
			<p class="text-sm text-muted-foreground">Selected: {value ?? 'none'}</p>
		</div>
	)
}

export const Controlled: Story = {
	parameters: {
		docs: { description: 'Owner echoes every commit; echoes never clobber the typing buffer, and clear round-trips null.' },
	},
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const minute = segment(canvas, 'minute')
		if (!canvas.textContent?.includes('Selected: 2026-07-10T09:00')) {
			throw new Error('Controlled datetime did not render its initial value')
		}

		// Echo mid-typing: '4' commits 09:04 and echoes back; the intact buffer
		// makes the next '5' produce 45 — a clobbered buffer would produce 05.
		await typeKeys(minute, '4')
		if (!canvas.textContent?.includes('Selected: 2026-07-10T09:04')) {
			throw new Error('First buffered digit did not commit 09:04')
		}
		if (text(minute) !== '4') throw new Error('The controlled echo clobbered the typing buffer')
		await typeKeys(minute, '5')
		if (!canvas.textContent?.includes('Selected: 2026-07-10T09:45')) {
			throw new Error('Buffered typing did not produce 09:45 after the echo')
		}

		const clear = canvas.querySelector<HTMLButtonElement>('[data-slot="input-date-clear"]')
		if (!clear) throw new Error('Clear button was not rendered while a value exists')
		clear.click()
		await frame(2)
		if (!canvas.textContent?.includes('Selected: none')) throw new Error('Clear did not emit null through the owner')
		if (minute.dataset.placeholder !== 'true') throw new Error('Cleared segments did not return to placeholders')

		await blur()
	},
}
