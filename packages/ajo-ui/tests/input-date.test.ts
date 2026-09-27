// @vitest-environment happy-dom
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'
import { InputDate, InputTime, type InputDateCalendarArgs } from '../src/input-date'
import './user-agent-dir'

afterEach(() => render(null, document.body))

const pointerdown = (element: Element) => {
	const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
	element.dispatchEvent(event)
	return event
}

test('Escape in the calendar month view drills back to the day view and leaves the InputDate open', () => {
	const onOpenChange = vi.fn()
	render(jsx(InputDate, {
		calendar: { defaultMonth: new Date(2026, 6, 1, 12), defaultView: 'month' },
		onOpenChange,
	}), document.body)
	document.querySelector<HTMLButtonElement>('[data-slot="input-date-trigger"]')!.click()
	const month = document.querySelector<HTMLButtonElement>('[data-slot="calendar-month-cell"]')!

	const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
	month.dispatchEvent(event)

	expect(event.defaultPrevented).toBe(true)
	expect(document.querySelector('[data-slot="calendar-month-cell"]')).toBeNull()
	expect(document.querySelector('[data-slot="calendar-day-button"]')).not.toBeNull()
	expect(onOpenChange.mock.calls.map(([open]) => open)).toEqual([true])
})

test('a value in years 0 to 99 selects its literal calendar day, not one in the 1900s', () => {
	render(jsx(InputDate, { calendar: true, value: '0050-05-15' }), document.body)

	expect(document.querySelector('[data-day="50-05-15"]')?.getAttribute('data-state')).toBe('selected')
	expect(document.querySelector('[data-day="1950-05-15"]')).toBeNull()
})

test('a picked day round-trips to its ISO value under a non-UTC host zone, whatever zone reaches the calendar', () => {
	const zone = process.env.TZ
	process.env.TZ = 'America/Los_Angeles'
	try {
		render(jsx(InputDate, {
			// A plain JavaScript caller can still pass a zone the types reject.
			calendar: { defaultMonth: new Date(2026, 6, 1, 12), timeZone: 'Pacific/Kiritimati' } as unknown as InputDateCalendarArgs,
			name: 'visit',
		}), document.body)
		document.querySelector<HTMLButtonElement>('[data-slot="input-date-trigger"]')!.click()
		document.querySelector<HTMLButtonElement>('[data-day="2026-07-11"]')!.click()

		expect(document.querySelector<HTMLInputElement>('input[name="visit"]')?.value).toBe('2026-07-11')
	} finally {
		if (zone === undefined) delete process.env.TZ
		else process.env.TZ = zone
	}
})

test('pointerdown on whitespace, the separator or the addon walks back to the last filled segment', () => {
	render(jsx(InputDate, { clearable: true, defaultValue: { from: '2026-07-10', to: null }, range: true }), document.body)
	const lastFilled = document.querySelector('[data-side="from"] [data-segment="year"]')

	for (const slot of ['input-date-control', 'input-date-separator', 'input-date-addon']) {
		;(document.activeElement as HTMLElement | null)?.blur()
		expect(pointerdown(document.querySelector(`[data-slot="${slot}"]`)!).defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(lastFilled)
	}

	// Inside one group, the walk stays in that group: an empty side focuses its first segment.
	pointerdown(document.querySelector('[data-slot="input-date-field"][data-side="to"]')!)
	expect(document.activeElement).toBe(document.querySelector('[data-side="to"] [data-segment]'))

	// Interactive chrome keeps its own pointer behavior.
	expect(pointerdown(document.querySelector('[data-slot="input-date-clear"]')!).defaultPrevented).toBe(false)
})

test('a range whose start follows its end is reversed; equal ends are not', () => {
	const date = (from: string, to: string) => ssr(jsx(InputDate, { defaultValue: { from, to }, range: true }))

	expect(date('2026-07-11', '2026-07-10')).toContain('Start date must be before end date')
	expect(date('2026-07-10', '2026-07-10')).not.toContain('data-invalid="true"')
	expect(ssr(jsx(InputTime, { defaultValue: { from: '22:00', to: '06:00' }, range: true })))
		.toContain('Start time must be before end time')
})

test.each([
	['en-US', 'ltr', ['month', 'day', 'year'], ['hour', 'minute', 'dayPeriod']],
	['ar', 'rtl', ['day', 'month', 'year'], ['hour', 'minute', 'dayPeriod']],
	['he', 'ltr', ['day', 'month', 'year'], ['hour', 'minute']],
	['fa', 'ltr', ['year', 'month', 'day'], ['hour', 'minute']],
])('%s segment groups take the %s direction of the locale pattern inside a right-to-left document', (locale, dir, date, time) => {
	document.documentElement.dir = 'rtl'
	try {
		render(jsx('div', {
			children: [
				jsx(InputDate, { key: 'date', locale, range: true }),
				jsx(InputTime, { key: 'time', locale }),
			],
		}), document.body)
		const [from, to, clock] = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="input-date-field"]'))
		const units = (field: HTMLElement) => Array.from(field.querySelectorAll<HTMLElement>('[data-segment]'), segment => segment.dataset.segment)

		// "9:30 AM" stays LTR in a right-to-left page; Arabic keeps the RTL
		// order its pattern's RLM marks ask for, with the day on the right.
		expect([from, to, clock].map(field => field.dir)).toEqual([dir, dir, dir])
		// The control follows the page, so a range runs from its inline start.
		expect(document.querySelector('[data-slot="input-date-control"]')?.hasAttribute('dir')).toBe(false)
		expect([units(from), units(to), units(clock)]).toEqual([date, date, time])
		// Every numeric unit is one LTR embed in every state; the day period is not.
		const embedded = (field: HTMLElement) => Array.from(field.querySelectorAll<HTMLElement>('[data-segment]'))
			.filter(segment => segment.style.unicodeBidi === 'embed' && segment.style.direction === 'ltr')
			.map(segment => segment.dataset.segment)
		expect([embedded(from), embedded(clock)]).toEqual([date, ['hour', 'minute']])

		// Arrows move on screen, and without layout the DOM order stands:
		// ArrowRight steps forward in every locale and page direction.
		const [first, second] = from.querySelectorAll<HTMLElement>('[data-segment]')
		first.focus()
		first.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
		expect(document.activeElement).toBe(second)
	} finally {
		document.documentElement.removeAttribute('dir')
	}
})

test('arrow keys move to the nearest segment on screen, not in the DOM', () => {
	render(jsx(InputTime, { defaultValue: '09:30', locale: 'ar' }), document.body)
	const segments = Array.from(document.querySelectorAll<HTMLElement>('[data-segment]'))
	const unit = (name: string) => segments.find(segment => segment.dataset.segment === name)!
	// Measured in Chrome: a right-to-left group puts the day period left of
	// the hour, and the hour left of the minute.
	const left = { dayPeriod: 661, hour: 678, minute: 695 } as Record<string, number>
	for (const segment of segments) {
		vi.spyOn(segment, 'getBoundingClientRect').mockReturnValue({ left: left[segment.dataset.segment!] } as DOMRect)
	}
	const press = (key: string) => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))

	unit('minute').focus()
	press('ArrowLeft')
	expect(document.activeElement).toBe(unit('hour'))
	press('ArrowLeft')
	expect(document.activeElement).toBe(unit('dayPeriod'))
	press('ArrowRight')
	expect(document.activeElement).toBe(unit('hour'))
})
