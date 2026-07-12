/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { Field, FieldLabel } from '/src/ui/field'
import { InputTime } from '/src/ui/input-date'

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
	title: 'UI/Input Time',
	component: InputTime,
	parameters: {
		docs: { description: 'Segment-based time field: locale-ordered editable segments, canonical 24h values regardless of the display cycle.' },
		layout: 'centered',
	},
} satisfies Meta<typeof InputTime>

export const TwelveHour: Story<typeof InputTime> = {
	parameters: {
		docs: { description: 'en-US renders a dayPeriod segment; the display stays 12h while the hidden input holds canonical 24h.' },
	},
	render: () => (
		<Field class="w-72">
			<FieldLabel>Alarm</FieldLabel>
			<InputTime locale="en-US" name="alarm" />
		</Field>
	),
	play: async ({ canvas }) => {
		const hour = segment(canvas, 'hour')
		const dayPeriod = segment(canvas, 'dayPeriod')
		const value = hidden(canvas, 'alarm')
		if (val(value) !== '') throw new Error('Empty time field must hold an empty value')

		// 12 AM is the 12↔0 edge: the display reads 12:30 AM, the canonical value is 00:30.
		await typeKeys(hour, '1230a')
		if (text(hour) !== '12') throw new Error(`Hour segment showed "${text(hour)}" instead of 12`)
		if (text(dayPeriod) !== 'AM') throw new Error('Typing a did not set AM')
		if (val(value) !== '00:30') throw new Error(`12:30 AM must serialize as 00:30, got "${val(value)}"`)

		// p flips to PM: 12 PM stays 12 in canonical 24h.
		await typeKeys(dayPeriod, 'p')
		if (text(dayPeriod) !== 'PM') throw new Error('Typing p did not set PM')
		if (val(value) !== '12:30') throw new Error(`12:30 PM must serialize as 12:30, got "${val(value)}"`)

		await blur()
	},
}

export const TwentyFourHour: Story<typeof InputTime> = {
	parameters: {
		docs: { description: 'hourCycle={24} overrides an h12 locale: no dayPeriod segment and the hour segment accepts 23.' },
	},
	render: () => (
		<Field class="w-72">
			<FieldLabel>Departure</FieldLabel>
			<InputTime locale="en-US" hourCycle={24} name="departure" />
		</Field>
	),
	play: async ({ canvas }) => {
		if (canvas.querySelector('[data-segment="dayPeriod"]')) {
			throw new Error('hourCycle 24 must not render a dayPeriod segment')
		}

		await typeKeys(segment(canvas, 'hour'), '2345')
		const value = hidden(canvas, 'departure')
		if (val(value) !== '23:45') throw new Error(`24h entry must commit 23:45, got "${val(value)}"`)

		await blur()
	},
}

export const AvailabilityWindow: Story<typeof InputTime> = {
	parameters: {
		docs: { description: 'Time windows are half-open: values inside commit as invalid, while the closing boundary stays valid.' },
	},
	render: () => (
		<div class="grid w-80 gap-4">
			<div data-story-time="lunch">
				<InputTime
					defaultValue="12:30"
					hourCycle={24}
					name="lunch"
					unavailable={{ time: { from: '12:00', to: '13:00' } }}
				/>
			</div>
			<div data-story-time="after-lunch">
				<InputTime
					defaultValue="13:00"
					hourCycle={24}
					name="after-lunch"
					unavailable={{ time: { from: '12:00', to: '13:00' } }}
				/>
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const lunch = canvas.querySelector<HTMLElement>('[data-story-time="lunch"]')
		const afterLunch = canvas.querySelector<HTMLElement>('[data-story-time="after-lunch"]')
		if (!lunch || !afterLunch) throw new Error('Availability examples were not rendered')

		if (hidden(lunch, 'lunch').value !== '12:30') throw new Error('Unavailable time did not commit')
		if (lunch.querySelector('[data-slot="input-date-field"]')?.getAttribute('aria-invalid') !== 'true') {
			throw new Error('Unavailable time did not stamp invalid')
		}
		if (!lunch.textContent?.includes('This time is unavailable')) throw new Error('Unavailable time message was not exposed')
		if (hidden(afterLunch, 'after-lunch').value !== '13:00') throw new Error('Closing boundary did not commit')
		if (afterLunch.querySelector('[data-slot="input-date-field"]')?.getAttribute('aria-invalid') === 'true') {
			throw new Error('Half-open closing boundary was incorrectly invalid')
		}
	},
}

export const Seconds: Story<typeof InputTime> = {
	parameters: {
		docs: { description: 'granularity="second" shapes the empty field; a defaultValue carrying seconds infers the segment with no arg.' },
	},
	render: () => (
		<div class="grid w-80 gap-4">
			<Field>
				<FieldLabel>Explicit granularity</FieldLabel>
				<InputTime locale="en-US" granularity="second" name="explicit" />
			</Field>
			<Field>
				<FieldLabel>Inferred from defaultValue</FieldLabel>
				<InputTime locale="en-US" defaultValue="09:00:00" name="inferred" />
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		const roots = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="input-time"]'))
		if (roots.length !== 2) throw new Error('Seconds story did not render both time fields')
		const [explicit, inferred] = roots

		segment(explicit, 'second')
		if (val(hidden(explicit, 'explicit')) !== '') throw new Error('Empty seconds field must hold no value')

		// The commit includes the seconds unit.
		await typeKeys(segment(explicit, 'hour'), '90130a')
		if (val(hidden(explicit, 'explicit')) !== '09:01:30') {
			throw new Error(`Seconds entry must commit 09:01:30, got "${val(hidden(explicit, 'explicit'))}"`)
		}

		// No granularity arg: the seconds in defaultValue force the segment.
		segment(inferred, 'second')
		if (val(hidden(inferred, 'inferred')) !== '09:00:00') {
			throw new Error('Inferred seconds field did not adopt its defaultValue')
		}

		await blur()
	},
}

export const MinuteStep: Story<typeof InputTime> = {
	parameters: {
		docs: { description: 'step={15} rounds arrow increments on the minute segment; typing stays free-form.' },
	},
	render: () => (
		<Field class="w-72">
			<FieldLabel>Slot</FieldLabel>
			<InputTime locale="en-US" step={15} placeholderValue="09:00" name="slot" />
		</Field>
	),
	play: async ({ canvas }) => {
		const minute = segment(canvas, 'minute')

		// The first arrow seeds from placeholderValue, then rides the 15-minute grid.
		await press(minute, 'ArrowUp')
		if (text(minute) !== '00') throw new Error(`First ArrowUp must seed 00, got "${text(minute)}"`)
		await press(minute, 'ArrowUp')
		if (text(minute) !== '15') throw new Error(`ArrowUp must step to 15, got "${text(minute)}"`)
		await press(minute, 'ArrowUp')
		if (text(minute) !== '30') throw new Error(`ArrowUp must step to 30, got "${text(minute)}"`)
		await press(minute, 'ArrowDown')
		if (text(minute) !== '15') throw new Error(`ArrowDown must step back to 15, got "${text(minute)}"`)

		// A seeded minute never commits by itself.
		if (val(hidden(canvas, 'slot')) !== '') throw new Error('Spinning one segment must not commit an incomplete field')

		// Typing ignores the step grid.
		await typeKeys(minute, '07')
		if (text(minute) !== '07') throw new Error(`Free-form typing must set 07, got "${text(minute)}"`)

		await blur()
	},
}

export const Range: Story<typeof InputTime> = {
	parameters: {
		docs: { description: 'Business hours as {from,to}; a reversed pair stamps aria-invalid on both sides and never swaps (overnight is the recorded allowReversed extension).' },
	},
	render: () => (
		<div class="grid w-96 gap-4">
			<Field>
				<FieldLabel>Business hours</FieldLabel>
				<InputTime<true> range locale="en-US" name="hours" defaultValue={{ from: '09:00', to: '17:00' }} />
			</Field>
			<Field>
				<FieldLabel>Overnight (reversed)</FieldLabel>
				<InputTime<true> range locale="en-US" name="overnight" defaultValue={{ from: '22:00', to: '06:00' }} />
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		const roots = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="input-time"]'))
		if (roots.length !== 2) throw new Error('Range story did not render both time fields')
		const [hours, overnight] = roots
		const sides = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('[data-slot="input-date-field"]'))

		if (hidden(hours, 'hours[from]').value !== '09:00' || hidden(hours, 'hours[to]').value !== '17:00') {
			throw new Error('Range defaultValue did not reach the hidden inputs')
		}
		const ordered = sides(hours)
		if (ordered.length !== 2 || ordered[0].getAttribute('aria-label') !== 'Start time' || ordered[1].getAttribute('aria-label') !== 'End time') {
			throw new Error('Range sides did not label themselves Start/End time')
		}
		if (ordered.some(side => side.getAttribute('aria-invalid') === 'true')) {
			throw new Error('An ordered range must not stamp aria-invalid')
		}

		const reversed = sides(overnight)
		if (reversed.length !== 2 || !reversed.every(side => side.getAttribute('aria-invalid') === 'true')) {
			throw new Error('A reversed range must stamp aria-invalid on both sides')
		}
		if (hidden(overnight, 'overnight[from]').value !== '22:00' || hidden(overnight, 'overnight[to]').value !== '06:00') {
			throw new Error('A reversed range must submit the values as typed, never swapped')
		}
	},
}

const ControlledExample: Stateful = function* () {
	let value: string | null = '12:30'
	const change = (next: string | null) => this.next(() => value = next)

	while (true) yield (
		<div class="grid w-72 gap-3">
			<InputTime locale="en-US" clearable value={value} onValueChange={change} />
			<p class="text-sm text-muted-foreground">Selected: {value ?? 'none'}</p>
		</div>
	)
}

export const Controlled: Story = {
	parameters: {
		docs: { description: 'Controlled null round-trip: the clear button emits null, the owner echoes it, and typing re-commits.' },
	},
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const hour = segment(canvas, 'hour')
		const clear = canvas.querySelector<HTMLButtonElement>('[data-slot="input-date-clear"]')
		if (!clear) throw new Error('Clear button was not rendered while a value exists')
		if (!canvas.textContent?.includes('Selected: 12:30')) throw new Error('Controlled time did not render its initial value')
		if (text(hour) !== '12') throw new Error('Controlled 12:30 must display hour 12 (PM)')

		clear.click()
		await frame()
		if (!canvas.textContent?.includes('Selected: none')) throw new Error('Clear did not emit null through the owner')
		if (hour.dataset.placeholder !== 'true') throw new Error('Cleared segments did not return to placeholders')
		if (canvas.querySelector('[data-slot="input-date-clear"]')) throw new Error('Clear button must unrender without a value')

		// Round-trip: typing after the null echo re-commits.
		await typeKeys(hour, '905a')
		if (!canvas.textContent?.includes('Selected: 09:05')) throw new Error('Typing after a null round-trip did not commit 09:05')

		await blur()
	},
}

const RelocationExample: Stateful = function* () {
	let value: string | null = '09:00:30'
	let hourCycle: 12 | 24 = 12
	const change = (next: string | null) => this.next(() => value = next)

	while (true) yield (
		<div class="grid w-80 gap-2">
			<InputTime locale="en-US" hourCycle={hourCycle} value={value} onValueChange={change} />
			<div class="flex gap-3">
				<button class="text-sm underline" data-story-action="narrow" type="button" set:onclick={() => this.next(() => value = '14:05')}>Push 14:05</button>
				<button class="text-sm underline" data-story-action="h24" type="button" set:onclick={() => this.next(() => hourCycle = 24)}>24h</button>
			</div>
		</div>
	)
}

export const FocusRelocation: Story = {
	parameters: {
		docs: { description: 'A reshape that drops the focused segment (narrower external value, hourCycle flip) moves focus to the nearest surviving segment instead of dropping it to body.' },
	},
	render: () => <RelocationExample />,
	play: async ({ canvas }) => {
		// External push without seconds while the seconds segment is focused.
		const second = segment(canvas, 'second')
		second.focus()
		const narrow = canvas.querySelector<HTMLButtonElement>('[data-story-action="narrow"]')
		if (!narrow) throw new Error('Push button was not rendered')
		narrow.click()
		await frame()
		if (canvas.querySelector('[data-segment="second"]')) throw new Error('The narrower external value must drop the seconds segment')
		let focused = document.activeElement
		if (!(focused instanceof HTMLElement) || focused.dataset.segment !== 'minute') {
			throw new Error('Focus must relocate to the nearest surviving segment (minute)')
		}

		// hourCycle flip while dayPeriod is focused: the segment disappears.
		const dayPeriod = segment(canvas, 'dayPeriod')
		dayPeriod.focus()
		const h24 = canvas.querySelector<HTMLButtonElement>('[data-story-action="h24"]')
		if (!h24) throw new Error('24h button was not rendered')
		h24.click()
		await frame()
		if (canvas.querySelector('[data-segment="dayPeriod"]')) throw new Error('hourCycle 24 must drop the dayPeriod segment')
		focused = document.activeElement
		if (!(focused instanceof HTMLElement) || focused.dataset.segment !== 'minute') {
			throw new Error('Focus must relocate from the dropped dayPeriod to the minute segment')
		}

		await blur()
	},
}

export const InForm: Story = {
	parameters: {
		docs: { description: 'The hidden input submits canonical HH:mm; an empty field submits an empty string.' },
	},
	render: () => (
		<form id="time-form" class="grid w-72 gap-3">
			<Field>
				<FieldLabel>Opens at</FieldLabel>
				<InputTime locale="en-US" name="opens" />
			</Field>
		</form>
	),
	play: async ({ canvas }) => {
		const form = canvas.querySelector<HTMLFormElement>('#time-form')
		if (!form) throw new Error('Time form was not rendered')
		if (new FormData(form).get('opens') !== '') throw new Error('Empty time field must submit an empty string')

		// A single-digit hour pads on commit: canonical HH:mm.
		await typeKeys(segment(canvas, 'hour'), '930a')
		if (new FormData(form).get('opens') !== '09:30') {
			throw new Error(`Time field must submit canonical 09:30, got "${new FormData(form).get('opens')}"`)
		}

		await blur()
	},
}
