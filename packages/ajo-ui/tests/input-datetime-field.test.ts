// @vitest-environment happy-dom
import { render, type Stateful } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import {
	InputDateCalendar,
	InputDateContent,
	InputDate,
	InputDateField,
	InputDateTime,
	InputDateTimeField,
	InputDateTrigger,
	InputTime,
} from '../src/input-date'

afterEach(() => render(null, document.body))

const segment = (surface: 'field' | 'popover', unit: string) =>
	document.querySelector<HTMLElement>(`[data-surface="${surface}"][data-segment="${unit}"]`)!

const DuplicateTimeSurfaces: Stateful = function* () {
	let duplicate = true

	while (true) yield jsx(InputDateTime, {
		calendar: true,
		children: [
			jsx(InputDateField, {}),
			jsx(InputDateTrigger, {}),
			jsx(InputDateContent, {
				children: [
					jsx(InputDateCalendar, { defaultMonth: new Date(2026, 6, 1, 12) }),
					jsx(InputDateTimeField, { id: 'time-one' }),
					duplicate ? jsx(InputDateTimeField, { id: 'time-two' }) : null,
				],
			}),
			jsx('button', {
				children: 'Remove duplicate',
				'data-testid': 'remove-time',
				'set:onclick': () => this.next(() => duplicate = false),
				type: 'button',
			}),
		],
	})
}

const FamilySwitch: Stateful = function* () {
	let time = false

	while (true) yield jsx('div', {
		children: [
			jsx('button', {
				children: 'Switch family',
				'data-testid': 'switch-family',
				'set:onclick': () => this.next(() => time = true),
				type: 'button',
			}),
			time
				? jsx(InputTime, { defaultValue: '09:30', hourCycle: 24, name: 'family-value' })
				: jsx(InputDate, { defaultValue: '2026-07-10', name: 'family-value' }),
		],
	})
}

test('default datetime composition renders one engine through uniquely identified field and popover surfaces', () => {
	const html = ssr(jsx(InputDateTime, {
		calendar: true,
		defaultValue: '2026-07-10T12:30',
		hourCycle: 24,
	}))
	const tags = Array.from(html.matchAll(/<div\b[^>]*data-segment="[^"]+"[^>]*>/g), match => match[0])
	const field = tags.filter(tag => tag.includes('data-surface="field"'))
	const popover = tags.filter(tag => tag.includes('data-surface="popover"'))
	const ids = tags.map(tag => tag.match(/\bid="([^"]+)"/)?.[1]).filter(Boolean)

	expect(field.some(tag => tag.includes('data-segment="year"'))).toBe(true)
	expect(popover.some(tag => tag.includes('data-segment="hour"'))).toBe(true)
	expect(popover.some(tag => tag.includes('data-segment="minute"'))).toBe(true)
	expect(popover.some(tag => tag.includes('data-segment="day"'))).toBe(false)
	expect(new Set(ids).size).toBe(ids.length)
})

test('popover time edits update the same field view and keep day picks open by default', () => {
	render(jsx(InputDateTime, {
		calendar: { defaultMonth: new Date(2026, 6, 1, 12) },
		defaultValue: '2026-07-10T12:30',
		hourCycle: 24,
		name: 'meeting',
	}), document.body)

	const outerHour = segment('field', 'hour')
	const popupHour = segment('popover', 'hour')
	const popupMinute = segment('popover', 'minute')
	for (const item of [outerHour, popupHour, popupMinute]) {
		Object.defineProperty(item, 'offsetParent', { configurable: true, get: () => document.body })
	}

	expect(outerHour.textContent).toBe('12')
	expect(popupHour.textContent).toBe('12')
	popupHour.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowUp' }))
	expect(document.querySelector<HTMLInputElement>('input[name="meeting"]')?.value).toBe('2026-07-10T13:30')
	expect(outerHour.textContent).toBe('13')
	expect(popupHour.textContent).toBe('13')

	popupHour.focus()
	popupHour.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }))
	expect(document.activeElement).toBe(popupMinute)

	const trigger = document.querySelector<HTMLButtonElement>('[data-slot="input-date-trigger"]')!
	const content = document.querySelector<HTMLElement>('[data-slot="input-date-content"]')!
	trigger.click()
	expect(content.dataset.state).toBe('open')
	document.querySelector<HTMLButtonElement>('[data-day="2026-07-11"]')!.click()
	expect(content.dataset.state).toBe('open')
	expect(document.querySelector<HTMLInputElement>('input[name="meeting"]')?.value).toBe('2026-07-11T13:30')
})

test('a datetime composition without a time surface keeps the calendar close default', () => {
	render(jsx(InputDateTime, {
		calendar: true,
		children: [
			jsx(InputDateField, {}),
			jsx(InputDateTrigger, {}),
			jsx(InputDateContent, {
				children: jsx(InputDateCalendar, { defaultMonth: new Date(2026, 6, 1, 12) }),
			}),
		],
	}), document.body)

	const trigger = document.querySelector<HTMLButtonElement>('[data-slot="input-date-trigger"]')!
	const content = document.querySelector<HTMLElement>('[data-slot="input-date-content"]')!
	trigger.click()
	expect(content.dataset.state).toBe('open')
	document.querySelector<HTMLButtonElement>('[data-day="2026-07-11"]')!.click()
	expect(content.dataset.state).toBe('closed')
})

test('removing one explicit duplicate keeps the remaining time surface registered', () => {
	render(jsx(DuplicateTimeSurfaces, {}), document.body)
	expect(document.querySelectorAll('[data-slot="input-date-time-field"]')).toHaveLength(2)
	document.querySelector<HTMLButtonElement>('[data-testid="remove-time"]')!.click()
	expect(document.querySelectorAll('[data-slot="input-date-time-field"]')).toHaveLength(1)

	document.querySelector<HTMLButtonElement>('[data-slot="input-date-trigger"]')!.click()
	const content = document.querySelector<HTMLElement>('[data-slot="input-date-content"]')!
	document.querySelector<HTMLButtonElement>('[data-day="2026-07-11"]')!.click()
	expect(content.dataset.state).toBe('open')
})

test('switching public field families replaces the kind-specific editing root', () => {
	render(jsx(FamilySwitch, {}), document.body)
	expect(document.querySelector('[data-segment="year"]')).not.toBeNull()
	document.querySelector<HTMLButtonElement>('[data-testid="switch-family"]')!.click()

	expect(document.querySelector('[data-segment="year"]')).toBeNull()
	expect(document.querySelector('[data-segment="hour"]')).not.toBeNull()
	expect(document.querySelector<HTMLInputElement>('input[name="family-value"]')?.value).toBe('09:30')
})
