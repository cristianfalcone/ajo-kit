/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { Field, FieldLabel } from '/src/ui/field'
import { InputDateTime } from '/src/ui/input-date'

const july = new Date(2026, 6, 1)

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

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
		await frame()
	}
}

// Hardware spin keys arrive as keydown (spin clove path).
const press = async (target: HTMLElement, key: string) => {
	target.focus()
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	await frame()
}

const blur = async () => {
	const active = document.activeElement
	if (active instanceof HTMLElement) active.blur()
	await frame()
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
		docs: { description: 'The popover time footer edits the same field view: staged time survives a day pick, and Escape closes without acting as a commit gate.' },
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

		trigger(pickup).click()
		await frame()
		if (trigger(pickup).getAttribute('aria-expanded') !== 'true') throw new Error('Trigger did not open the calendar popover')
		const pickupTime = pickup.querySelector<HTMLElement>('[data-surface="popover"][data-segment="hour"]')
		if (!pickupTime) throw new Error('Popover time surface was not rendered')
		// Staged time first: no commit yet, the pick merges the date and keeps 2:30 PM.
		await typeKeys(pickupTime, '230p')
		if (val(hidden(pickup, 'pickup')) !== '') throw new Error('Time without a date must not commit')

		day(pickup, '2026-07-15').click()
		await frame()
		if (val(hidden(pickup, 'pickup')) !== '2026-07-15T14:30') {
			throw new Error(`Pick must merge the typed 2:30 PM into 2026-07-15T14:30, got "${val(hidden(pickup, 'pickup'))}"`)
		}
		if (trigger(pickup).getAttribute('aria-expanded') !== 'true') throw new Error('A time-enabled pick must keep the popover open')
		const pickupMinute = pickup.querySelector<HTMLElement>('[data-surface="popover"][data-segment="minute"]')
		if (!pickupMinute) throw new Error('Popover minute segment was not rendered')
		pickupMinute.focus()
		await press(pickupMinute, 'Escape')
		if (trigger(pickup).getAttribute('aria-expanded') !== 'false') throw new Error('Escape did not close the time-enabled popover')
		if (document.activeElement !== trigger(pickup)) throw new Error('Escape did not restore focus to the trigger')

		// No time entered: the pick seeds placeholder-value time.
		trigger(dropoff).click()
		await frame()
		day(dropoff, '2026-07-20').click()
		await frame()
		if (val(hidden(dropoff, 'dropoff')) !== '2026-07-20T08:00') {
			throw new Error(`Pick must seed placeholder time into 2026-07-20T08:00, got "${val(hidden(dropoff, 'dropoff'))}"`)
		}
		if (trigger(dropoff).getAttribute('aria-expanded') !== 'true') throw new Error('Seeded time surface must keep the popover open')
		await press(day(dropoff, '2026-07-20'), 'Escape')
		if (getComputedStyle(content(dropoff)).display !== 'none') throw new Error('Escape left the seeded-time popover visible')

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
		const popupSecond = canvas.querySelector<HTMLElement>('[data-surface="popover"][data-segment="second"]')
		if (!popupSecond) throw new Error('Latched seconds were missing from the popover surface')
		const value = hidden(canvas, 'backup')
		if (text(second) !== '30' || text(popupSecond) !== '30') throw new Error('Seconds did not latch across both surfaces')
		if (val(value) !== '2026-07-10T09:00:30') throw new Error('Seconds field did not adopt its defaultValue')

		await press(second, 'ArrowUp')
		if (val(value) !== '2026-07-10T09:00:31') throw new Error(`Spinning a complete field must commit eagerly, got "${val(value)}"`)
		if (text(popupSecond) !== '31') throw new Error('Popover seconds did not reflect the shared edit')
		await press(second, 'ArrowDown')
		if (val(value) !== '2026-07-10T09:00:30') throw new Error('ArrowDown did not step the seconds back')

		await blur()
	},
}

export const PopoverCyclesAndStep: Story<typeof InputDateTime> = {
	parameters: {
		docs: { description: 'The popover inherits 12h/24h shape and minute step from the same field options.' },
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
		trigger(twelve).click()
		await frame()
		if (!twelve.querySelector('[data-surface="popover"][data-segment="dayPeriod"]')) {
			throw new Error('12h popover did not render dayPeriod')
		}
		await press(twelve.querySelector<HTMLElement>('[data-surface="popover"][data-segment="hour"]')!, 'Escape')

		trigger(twentyFour).click()
		await frame()
		if (twentyFour.querySelector('[data-surface="popover"][data-segment="dayPeriod"]')) {
			throw new Error('24h popover rendered dayPeriod')
		}
		const minute = twentyFour.querySelector<HTMLElement>('[data-surface="popover"][data-segment="minute"]')
		if (!minute) throw new Error('24h popover minute was not rendered')
		await press(minute, 'ArrowUp')
		if (val(hidden(twentyFour, 'twenty-four')) !== '2026-07-10T09:15') {
			throw new Error('Popover minute did not inherit step={15}')
		}
	},
}

export const Range: Story<typeof InputDateTime> = {
	parameters: {
		docs: { description: 'Check-in/check-out over one shared calendar with Start time and End time surfaces that keep the popover open after the range completes.' },
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
		await frame()
		day(canvas, '2026-07-20').click()
		await frame()
		// Progressive emission: from commits with seeded 15:00, to stays empty.
		if (val(from) !== '2026-07-20T15:00' || val(to) !== '') {
			throw new Error(`First pick must fill from only, got from "${val(from)}" to "${val(to)}"`)
		}
		if (trigger(canvas).getAttribute('aria-expanded') !== 'true') {
			throw new Error('Popover must stay open while the range is incomplete')
		}

		day(canvas, '2026-07-25').click()
		await frame()
		if (val(from) !== '2026-07-20T15:00' || val(to) !== '2026-07-25T15:00') {
			throw new Error(`Second pick must complete the range, got from "${val(from)}" to "${val(to)}"`)
		}
		if (trigger(canvas).getAttribute('aria-expanded') !== 'true') {
			throw new Error('Completing a time-enabled range must keep the popover open')
		}
		const timeFields = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="input-date-time-field"]'))
		if (timeFields.length !== 2 || timeFields[0]?.getAttribute('aria-label') !== 'Start time' || timeFields[1]?.getAttribute('aria-label') !== 'End time') {
			throw new Error('Range did not expose labelled Start time and End time surfaces')
		}
		await press(timeFields[1]!.querySelector<HTMLElement>('[data-segment="minute"]')!, 'Escape')
		if (getComputedStyle(content(canvas)).display !== 'none') throw new Error('Escape left the range popover visible')
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
		await frame()
		if (!canvas.textContent?.includes('Selected: none')) throw new Error('Clear did not emit null through the owner')
		if (minute.dataset.placeholder !== 'true') throw new Error('Cleared segments did not return to placeholders')

		await blur()
	},
}
