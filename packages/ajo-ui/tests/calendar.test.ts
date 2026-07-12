// @vitest-environment happy-dom
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'
import { Calendar } from '../src/calendar'

const dayButton = (html: string, day: string) =>
	html.match(new RegExp(`<button(?=[^>]*data-day="${day}")[^>]*>`))?.[0] ?? ''

const date = (year: number, month: number, day = 1) => new Date(year, month - 1, day, 12)

const button = (selector: string) => {
	const found = document.querySelector<HTMLButtonElement>(selector)
	if (!found) throw new Error(`missing button: ${selector}`)
	return found
}

const flush = async () => {
	await Promise.resolve()
	await Promise.resolve()
}

const key = async (target: HTMLElement, value: string, init: KeyboardEventInit = {}) => {
	const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value, ...init })
	target.dispatchEvent(event)
	await flush()
	return event
}

afterEach(() => render(null, document.body))

test('Calendar evaluates matcher fields as one expression', () => {
	const html = ssr(jsx(Calendar, {
		defaultMonth: new Date(2026, 6, 1, 12),
		disabled: {
			after: new Date(2026, 6, 20, 12),
			dayOfWeek: [1],
		},
	}))

	expect(dayButton(html, '2026-07-13')).not.toContain(' disabled')
	expect(dayButton(html, '2026-07-21')).not.toContain(' disabled')
	expect(dayButton(html, '2026-07-27')).toContain(' disabled')
})

test('timeZone owns captions, accessible text, and data-day independently of the host zone', () => {
	const html = ssr(jsx(Calendar, {
		defaultMonth: new Date('2026-01-01T00:00:00.000Z'),
		locale: 'en-US',
		timeZone: 'Pacific/Kiritimati',
	}))
	const first = dayButton(html, '2026-01-01')

	expect(html).toContain('January 2026')
	expect(first).not.toBe('')
	expect(first).toContain('aria-label="Thursday, January 1, 2026"')
	expect(dayButton(html, '2025-12-31')).toContain('data-outside="true"')
})

test('unavailable days stay focusable and selectable while disabled days remain hard blocked', () => {
	const onSelect = vi.fn()
	render(jsx(Calendar, {
		defaultMonth: new Date(2026, 6, 1, 12),
		disabled: new Date(2026, 6, 10, 12),
		onSelect,
		unavailable: new Date(2026, 6, 11, 12),
	}), document.body)
	const disabled = document.querySelector<HTMLButtonElement>('[data-day="2026-07-10"]')!
	const unavailable = document.querySelector<HTMLButtonElement>('[data-day="2026-07-11"]')!

	expect(disabled.disabled).toBe(true)
	expect(disabled.dataset.disabled).toBe('true')
	expect(unavailable.disabled).toBe(false)
	expect(unavailable.dataset.unavailable).toBe('true')
	expect(unavailable.getAttribute('aria-disabled')).toBe('true')

	disabled.click()
	expect(onSelect).not.toHaveBeenCalled()
	unavailable.focus()
	unavailable.click()
	expect(document.activeElement).toBe(unavailable)
	expect(onSelect).toHaveBeenCalledOnce()
	expect(onSelect.mock.calls[0]?.[0]).toEqual(new Date(2026, 6, 11, 12))
})

test('non-contiguous ranges omit unavailable interior days from selection and its band', () => {
	render(jsx(Calendar, {
		allowNonContiguous: true,
		defaultMonth: new Date(2026, 6, 1, 12),
		mode: 'range',
		selected: {
			from: new Date(2026, 6, 10, 12),
			to: new Date(2026, 6, 12, 12),
		},
		unavailable: new Date(2026, 6, 11, 12),
	}), document.body)

	const from = document.querySelector<HTMLButtonElement>('[data-day="2026-07-10"]')!
	const gap = document.querySelector<HTMLButtonElement>('[data-day="2026-07-11"]')!
	const to = document.querySelector<HTMLButtonElement>('[data-day="2026-07-12"]')!

	expect(from.dataset.rangeStart).toBe('true')
	expect(to.dataset.rangeEnd).toBe('true')
	expect(gap.dataset.unavailable).toBe('true')
	expect(gap.dataset.rangeMiddle).toBeUndefined()
	expect(gap.dataset.selectedSingle).toBeUndefined()
	expect(gap.dataset.state).toBe('unselected')
})

test('default caption drills through one focused month and year grid, then Escape drills down', async () => {
	const onViewChange = vi.fn()
	render(jsx(Calendar, {
		defaultMonth: date(2026, 7),
		fromYear: 2020,
		locale: 'en-US',
		numberOfMonths: 2,
		onViewChange,
		toYear: 2030,
	}), document.body)

	const dayTrigger = button('[data-slot="calendar-view-trigger"]')
	expect(dayTrigger.textContent).toMatch(/July 2026/i)
	dayTrigger.click()
	await flush()

	expect(document.querySelectorAll('[data-slot="calendar-month-view"]')).toHaveLength(1)
	expect(document.querySelectorAll('[data-slot="calendar-month-cell"]')).toHaveLength(12)
	expect(document.activeElement).toBe(button('[data-month="2026-07"]'))

	button('[data-slot="calendar-view-trigger"]').click()
	await flush()

	expect(document.querySelectorAll('[data-slot="calendar-year-view"]')).toHaveLength(1)
	expect(document.querySelectorAll('[data-slot="calendar-year-cell"]')).toHaveLength(12)
	expect(button('[data-slot="calendar-view-trigger"]').disabled).toBe(true)
	expect(document.activeElement).toBe(button('[data-year="2026"]'))

	const yearEscape = await key(document.activeElement as HTMLElement, 'Escape')
	expect(yearEscape.defaultPrevented).toBe(true)
	expect(document.querySelector('[data-slot="calendar-month-view"]')).not.toBeNull()
	expect(document.activeElement).toBe(button('[data-month="2026-07"]'))

	const monthEscape = await key(document.activeElement as HTMLElement, 'Escape')
	expect(monthEscape.defaultPrevented).toBe(true)
	expect(document.querySelector('[data-slot="calendar-grid"]')).not.toBeNull()
	expect(document.activeElement).toBe(button('[data-day="2026-07-01"]'))
	expect(onViewChange.mock.calls.map(call => call[0])).toEqual(['month', 'year', 'month', 'day'])
})

test('minView clamps controlled and default views while label and dropdown captions opt out of drill-up', async () => {
	const onViewChange = vi.fn()
	render(jsx(Calendar, {
		captionLayout: 'label',
		defaultMonth: date(2026, 7),
		defaultView: 'day',
		minView: 'month',
	}), document.body)

	expect(document.querySelector('[data-slot="calendar-month-view"]')).not.toBeNull()
	expect(document.querySelector('[data-slot="calendar-view-trigger"]')).toBeNull()
	expect(onViewChange).not.toHaveBeenCalled()

	render(null, document.body)
	render(jsx(Calendar, {
		defaultMonth: date(2026, 7),
		minView: 'month',
		onViewChange,
		view: 'day',
	}), document.body)
	expect(document.querySelector('[data-slot="calendar-month-view"]')).not.toBeNull()
	button('[data-slot="calendar-view-trigger"]').click()
	await flush()
	expect(onViewChange).toHaveBeenLastCalledWith('year', expect.any(Event))
	expect(document.querySelector('[data-slot="calendar-month-view"]')).not.toBeNull()

	render(null, document.body)
	render(jsx(Calendar, {
		captionLayout: 'dropdown',
		defaultMonth: date(2026, 7),
	}), document.body)

	expect(document.querySelector('[data-slot="calendar-dropdowns"]')).not.toBeNull()
	expect(document.querySelector('[data-slot="calendar-view-trigger"]')).toBeNull()
	const escape = await key(button('[data-day="2026-07-01"]'), 'Escape')
	expect(escape.defaultPrevented).toBe(false)
})

test('month view commits canonical single, multiple, and inclusive range values', async () => {
	const single = vi.fn()
	render(jsx(Calendar, {
		defaultMonth: date(2024, 1),
		minView: 'month',
		onSelect: single,
	}), document.body)

	button('[data-month="2024-02"]').click()
	expect(single.mock.calls.at(-1)?.[0]).toEqual(date(2024, 2))
	button('[data-month="2024-02"]').click()
	expect(single.mock.calls.at(-1)?.[0]).toBeNull()

	const multiple = vi.fn()
	render(jsx(Calendar, {
		defaultMonth: date(2024, 1),
		minView: 'month',
		mode: 'multiple',
		onSelect: multiple,
	}), document.body)
	button('[data-month="2024-02"]').click()
	button('[data-month="2024-04"]').click()
	expect(multiple.mock.calls.at(-1)?.[0]).toEqual([date(2024, 2), date(2024, 4)])
	button('[data-month="2024-02"]').click()
	expect(multiple.mock.calls.at(-1)?.[0]).toEqual([date(2024, 4)])

	const range = vi.fn()
	render(jsx(Calendar, {
		defaultMonth: date(2024, 1),
		minView: 'month',
		mode: 'range',
		onSelect: range,
	}), document.body)
	button('[data-month="2024-04"]').click()
	button('[data-month="2024-02"]').click()
	expect(range.mock.calls.at(-1)?.[0]).toEqual({ from: date(2024, 2), to: date(2024, 4, 30) })
	expect(button('[data-month="2024-02"]').dataset.rangeStart).toBe('true')
	expect(button('[data-month="2024-03"]').dataset.rangeMiddle).toBe('true')
	expect(button('[data-month="2024-04"]').dataset.rangeEnd).toBe('true')
})

test('month grid reuses semantic grid navigation, RTL, paging, and minView Escape propagation', async () => {
	render(jsx(Calendar, {
		defaultMonth: date(2026, 7),
		dir: 'rtl',
		fromYear: 2025,
		minView: 'month',
		toYear: 2028,
	}), document.body)

	const july = button('[data-month="2026-07"]')
	july.focus()
	await key(july, 'ArrowRight')
	expect(document.activeElement).toBe(button('[data-month="2026-06"]'))
	await key(document.activeElement as HTMLElement, 'ArrowDown')
	expect(document.activeElement).toBe(button('[data-month="2026-09"]'))
	await key(document.activeElement as HTMLElement, 'Home')
	expect(document.activeElement).toBe(button('[data-month="2026-07"]'))
	await key(document.activeElement as HTMLElement, 'End', { ctrlKey: true })
	expect(document.activeElement).toBe(button('[data-month="2026-12"]'))
	await key(button('[data-month="2026-07"]'), 'PageDown')
	expect(document.activeElement).toBe(button('[data-month="2027-07"]'))

	const escape = await key(document.activeElement as HTMLElement, 'Escape')
	expect(escape.defaultPrevented).toBe(false)

	render(null, document.body)
	render(jsx(Calendar, {
		defaultMonth: date(2026, 7),
		endMonth: date(2026, 10),
		minView: 'month',
		startMonth: date(2026, 3),
	}), document.body)
	expect(button('[data-month="2026-02"]').disabled).toBe(true)
	expect(button('[data-month="2026-03"]').disabled).toBe(false)
	expect(button('[data-month="2026-10"]').disabled).toBe(false)
	expect(button('[data-month="2026-11"]').disabled).toBe(true)
})

test('year view pages by twelve, stamps bounds, and commits full-year values', async () => {
	const onSelect = vi.fn()
	render(jsx(Calendar, {
		defaultMonth: date(2024, 7),
		fromYear: 2020,
		minView: 'year',
		onSelect,
		toYear: 2025,
	}), document.body)

	expect(document.querySelectorAll('[data-slot="calendar-year-cell"]')).toHaveLength(12)
	expect(button('[data-year="2020"]').disabled).toBe(false)
	expect(button('[data-year="2025"]').disabled).toBe(false)
	expect(button('[data-year="2026"]').disabled).toBe(true)

	button('[data-year="2024"]').click()
	expect(onSelect.mock.calls.at(-1)?.[0]).toEqual(date(2024, 1))
	button('[data-year="2024"]').click()
	expect(onSelect.mock.calls.at(-1)?.[0]).toBeNull()

	const focused = button('[data-year="2024"]')
	focused.focus()
	await key(focused, 'ArrowDown')
	expect(document.activeElement).toBe(focused)

	render(null, document.body)
	render(jsx(Calendar, {
		defaultMonth: date(2012, 7),
		fromYear: 2000,
		minView: 'year',
		toYear: 2040,
	}), document.body)
	const start = button('[data-year="2012"]')
	start.focus()
	await key(start, 'PageDown')
	expect(document.activeElement).toBe(button('[data-year="2024"]'))
})

test('year ranges emit January through December and drill to the anchored day above minView', async () => {
	const onSelect = vi.fn()
	render(jsx(Calendar, {
		defaultMonth: date(2024, 7),
		fromYear: 2000,
		minView: 'year',
		mode: 'range',
		onSelect,
		toYear: 2040,
	}), document.body)
	button('[data-year="2026"]').click()
	button('[data-year="2024"]').click()
	expect(onSelect.mock.calls.at(-1)?.[0]).toEqual({ from: date(2024, 1), to: date(2026, 12, 31) })

	render(jsx(Calendar, {
		defaultMonth: date(2024, 7),
		defaultView: 'year',
		fromYear: 2000,
		toYear: 2040,
	}), document.body)
	button('[data-year="2026"]').click()
	await flush()
	expect(document.activeElement).toBe(button('[data-month="2026-07"]'))
	button('[data-month="2026-03"]').click()
	await flush()
	expect(document.activeElement).toBe(button('[data-day="2026-03-01"]'))
})

test('external view changes relocate owned focus and dynamic minView clamps uncontrolled state persistently', async () => {
	const args = { defaultMonth: date(2026, 7), fromYear: 2020, toYear: 2030 }
	render(jsx(Calendar, { ...args, view: 'day' }), document.body)
	button('[data-day="2026-07-15"]').focus()
	render(jsx(Calendar, { ...args, view: 'month' }), document.body)
	await flush()
	expect(document.activeElement).toBe(button('[data-month="2026-07"]'))

	render(null, document.body)
	render(jsx(Calendar, { ...args, defaultView: 'day', minView: 'day' }), document.body)
	expect(document.querySelector('[data-slot="calendar-grid"]')).not.toBeNull()
	render(jsx(Calendar, { ...args, defaultView: 'day', minView: 'month' }), document.body)
	expect(document.querySelector('[data-slot="calendar-month-view"]')).not.toBeNull()
	render(jsx(Calendar, { ...args, defaultView: 'day', minView: 'day' }), document.body)
	expect(document.querySelector('[data-slot="calendar-month-view"]')).not.toBeNull()
})

test('whole-year commits reject partial month bounds and bounded grid edges focus the nearest usable cell', async () => {
	const onSelect = vi.fn()
	render(jsx(Calendar, {
		defaultMonth: date(2024, 7),
		endMonth: date(2025, 6),
		minView: 'year',
		onSelect,
		startMonth: date(2024, 7),
	}), document.body)
	expect(button('[data-year="2024"]').disabled).toBe(true)
	expect(button('[data-year="2025"]').disabled).toBe(true)
	button('[data-year="2024"]').click()
	expect(onSelect).not.toHaveBeenCalled()

	render(null, document.body)
	render(jsx(Calendar, {
		defaultMonth: date(2026, 9),
		endMonth: date(2026, 10),
		minView: 'month',
		startMonth: date(2026, 7),
	}), document.body)
	const september = button('[data-month="2026-09"]')
	september.focus()
	await key(september, 'Home', { ctrlKey: true })
	expect(document.activeElement).toBe(button('[data-month="2026-07"]'))
	await key(document.activeElement as HTMLElement, 'End', { ctrlKey: true })
	expect(document.activeElement).toBe(button('[data-month="2026-10"]'))

	render(null, document.body)
	render(jsx(Calendar, {
		defaultMonth: date(2024, 7),
		fromYear: 2020,
		minView: 'year',
		toYear: 2025,
	}), document.body)
	const year = button('[data-year="2024"]')
	year.focus()
	await key(year, 'End', { ctrlKey: true })
	expect(document.activeElement).toBe(button('[data-year="2025"]'))
})

test('month and year views preserve their public structure during SSR', () => {
	const month = ssr(jsx(Calendar, {
		defaultMonth: date(2026, 7),
		minView: 'month',
	}))
	const year = ssr(jsx(Calendar, {
		defaultMonth: date(2026, 7),
		fromYear: 2020,
		minView: 'year',
		toYear: 2030,
	}))

	expect(month).toContain('data-slot="calendar-month-view"')
	expect(month.match(/data-slot="calendar-month-cell"/g)).toHaveLength(12)
	expect(year).toContain('data-slot="calendar-year-view"')
	expect(year.match(/data-slot="calendar-year-cell"/g)).toHaveLength(12)
})
