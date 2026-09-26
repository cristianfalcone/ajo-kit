// @vitest-environment happy-dom
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'
import { Calendar, type CalendarView } from '../src/calendar'

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
		endMonth: date(2030, 12),
		locale: 'en-US',
		numberOfMonths: 2,
		onViewChange,
		startMonth: date(2020, 1),
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

test('minView clamps controlled and default views', async () => {
	const onViewChange = vi.fn()
	render(jsx(Calendar, {
		defaultMonth: date(2026, 7),
		defaultView: 'day',
		minView: 'month',
		onViewChange,
	}), document.body)

	expect(document.querySelector('[data-slot="calendar-month-view"]')).not.toBeNull()
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

test('day grid maps every navigation key to a prevented move, with RTL columns', async () => {
	render(jsx(Calendar, { defaultMonth: date(2026, 7) }), document.body)

	button('[data-day="2026-07-15"]').focus()
	for (const [value, day, init] of [
		['ArrowRight', '2026-07-16'],
		['ArrowLeft', '2026-07-15'],
		['ArrowDown', '2026-07-22'],
		['ArrowUp', '2026-07-15'],
		['Home', '2026-07-12'],
		['End', '2026-07-18'],
		['Home', '2026-07-01', { ctrlKey: true }],
		['End', '2026-07-31', { ctrlKey: true }],
		['PageDown', '2026-08-31'],
		['PageUp', '2026-07-31'],
		['PageDown', '2027-07-31', { shiftKey: true }],
		['PageUp', '2026-07-31', { shiftKey: true }],
	] as const satisfies ReadonlyArray<readonly [string, string, KeyboardEventInit?]>) {
		const event = await key(document.activeElement as HTMLElement, value, init)
		expect(event.defaultPrevented).toBe(true)
		expect((document.activeElement as HTMLElement).dataset.day).toBe(day)
	}

	const tab = await key(document.activeElement as HTMLElement, 'Tab')
	expect(tab.defaultPrevented).toBe(false)

	render(null, document.body)
	render(jsx(Calendar, { defaultMonth: date(2026, 7), dir: 'rtl' }), document.body)
	button('[data-day="2026-07-15"]').focus()
	await key(document.activeElement as HTMLElement, 'ArrowLeft')
	expect((document.activeElement as HTMLElement).dataset.day).toBe('2026-07-16')
	await key(document.activeElement as HTMLElement, 'ArrowRight')
	expect((document.activeElement as HTMLElement).dataset.day).toBe('2026-07-15')
})

test('month grid reuses semantic grid navigation, RTL, paging, and minView Escape propagation', async () => {
	render(jsx(Calendar, {
		defaultMonth: date(2026, 7),
		dir: 'rtl',
		endMonth: date(2028, 12),
		minView: 'month',
		startMonth: date(2025, 1),
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
		endMonth: date(2025, 12),
		minView: 'year',
		onSelect,
		startMonth: date(2020, 1),
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
		endMonth: date(2040, 12),
		minView: 'year',
		startMonth: date(2000, 1),
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
		endMonth: date(2040, 12),
		minView: 'year',
		mode: 'range',
		onSelect,
		startMonth: date(2000, 1),
	}), document.body)
	button('[data-year="2026"]').click()
	button('[data-year="2024"]').click()
	expect(onSelect.mock.calls.at(-1)?.[0]).toEqual({ from: date(2024, 1), to: date(2026, 12, 31) })

	render(jsx(Calendar, {
		defaultMonth: date(2024, 7),
		defaultView: 'year',
		endMonth: date(2040, 12),
		startMonth: date(2000, 1),
	}), document.body)
	button('[data-year="2026"]').click()
	await flush()
	expect(document.activeElement).toBe(button('[data-month="2026-07"]'))
	button('[data-month="2026-03"]').click()
	await flush()
	expect(document.activeElement).toBe(button('[data-day="2026-03-01"]'))
})

test('external view changes relocate owned focus and dynamic minView clamps uncontrolled state persistently', async () => {
	const args = { defaultMonth: date(2026, 7), endMonth: date(2030, 12), startMonth: date(2020, 1) }
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
		endMonth: date(2025, 12),
		minView: 'year',
		startMonth: date(2020, 1),
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
		endMonth: date(2030, 12),
		minView: 'year',
		startMonth: date(2020, 1),
	}))

	expect(month).toContain('data-slot="calendar-month-view"')
	expect(month.match(/data-slot="calendar-month-cell"/g)).toHaveLength(12)
	expect(year).toContain('data-slot="calendar-year-view"')
	expect(year.match(/data-slot="calendar-year-cell"/g)).toHaveLength(12)
})

test('startMonth and endMonth bound previous, next and the year grid in every view', async () => {
	const bounds = { endMonth: date(2030, 12), startMonth: date(2000, 1) }
	const previous = () => button('[data-slot="calendar-previous"]')
	const next = () => button('[data-slot="calendar-next"]')

	render(jsx(Calendar, { ...bounds, defaultMonth: date(2000, 1) }), document.body)
	expect(previous().disabled).toBe(true)
	expect(next().disabled).toBe(false)
	render(null, document.body)
	render(jsx(Calendar, { ...bounds, defaultMonth: date(2030, 12) }), document.body)
	expect(previous().disabled).toBe(false)
	expect(next().disabled).toBe(true)

	render(null, document.body)
	render(jsx(Calendar, { ...bounds, defaultMonth: date(2000, 6), defaultView: 'month' }), document.body)
	expect(previous().disabled).toBe(true)
	render(null, document.body)
	render(jsx(Calendar, { ...bounds, defaultMonth: date(2030, 6), defaultView: 'month' }), document.body)
	expect(next().disabled).toBe(true)

	render(null, document.body)
	render(jsx(Calendar, { ...bounds, defaultMonth: date(2020, 7), defaultView: 'year' }), document.body)
	expect(button('[data-year="2012"]').disabled).toBe(false)
	next().click()
	await flush()
	expect(button('[data-year="2024"]').disabled).toBe(false)
	expect(button('[data-year="2030"]').disabled).toBe(false)
	expect(button('[data-year="2031"]').disabled).toBe(true)
	expect(next().disabled).toBe(true)
	previous().click()
	await flush()
	previous().click()
	await flush()
	expect(button('[data-year="2000"]').disabled).toBe(false)
	expect(previous().disabled).toBe(true)
})

test('unbounded month and year views page into the future from twelve-year pages', () => {
	const year = new Date().getFullYear()
	const start = Math.floor(year / 12) * 12
	render(jsx(Calendar, { defaultMonth: date(year, 7), defaultView: 'month' }), document.body)
	expect(button('[data-slot="calendar-next"]').disabled).toBe(false)

	render(null, document.body)
	render(jsx(Calendar, { defaultMonth: date(year, 7), defaultView: 'year' }), document.body)
	expect(button('[data-slot="calendar-view-trigger"]').textContent).toBe(`${start}–${start + 11}`)
	expect(button(`[data-year="${start + 11}"]`).disabled).toBe(false)
	expect(button('[data-slot="calendar-next"]').disabled).toBe(false)
})

test('paging keeps focus on the navigation button in the day and month views', async () => {
	render(jsx(Calendar, { defaultMonth: date(2026, 7), locale: 'en-US', numberOfMonths: 2 }), document.body)
	const next = button('[data-slot="calendar-next"]')
	next.focus()
	next.click()
	await flush()
	expect(button('[data-slot="calendar-view-trigger"]').textContent).toBe('September 2026')
	expect(document.activeElement).toBe(next)

	render(null, document.body)
	render(jsx(Calendar, { defaultMonth: date(2026, 7), defaultView: 'month' }), document.body)
	const previous = button('[data-slot="calendar-previous"]')
	previous.focus()
	previous.click()
	await flush()
	expect(button('[data-slot="calendar-view-trigger"]').textContent).toBe('2025')
	expect(document.activeElement).toBe(previous)
})

test('navigation labels follow the view', async () => {
	render(jsx(Calendar, {
		defaultMonth: date(2026, 7),
		nextMonthLabel: 'Next',
		previousMonthLabel: (view: CalendarView) => `Back one ${view}`,
	}), document.body)
	expect(button('[data-slot="calendar-previous"]').getAttribute('aria-label')).toBe('Back one day')
	expect(button('[data-slot="calendar-next"]').getAttribute('aria-label')).toBe('Next')
	button('[data-slot="calendar-view-trigger"]').click()
	await flush()
	expect(button('[data-slot="calendar-previous"]').getAttribute('aria-label')).toBe('Back one month')

	render(null, document.body)
	render(jsx(Calendar, { defaultMonth: date(2026, 7), defaultView: 'year' }), document.body)
	expect(button('[data-slot="calendar-previous"]').getAttribute('aria-label')).toBe('Previous 12 years')
})

test('day state, custom modifiers and the range band live on the day button', () => {
	const html = ssr(jsx(Calendar, {
		defaultMonth: date(2026, 7),
		mode: 'range',
		modifiers: { booked: date(2026, 7, 11) },
		selected: { from: date(2026, 7, 10), to: date(2026, 7, 12) },
	}))
	const cell = html.match(/<div[^>]*data-slot="calendar-day"[^>]*>/)?.[0] ?? ''

	expect(cell).toBe('<div data-slot="calendar-day" role="gridcell">')
	expect(dayButton(html, '2026-07-10')).toContain('data-range-band="true"')
	expect(dayButton(html, '2026-07-11')).toContain('data-modifier-booked="true"')
	expect(dayButton(html, '2026-07-11')).toContain('data-range-band="true"')
	expect(dayButton(html, '2026-07-13')).not.toContain('data-range-band')

	const open = ssr(jsx(Calendar, { defaultMonth: date(2026, 7), mode: 'range', selected: { from: date(2026, 7, 10) } }))
	expect(dayButton(open, '2026-07-10')).toContain('data-range-start="true"')
	expect(dayButton(open, '2026-07-10')).not.toContain('data-range-band')
})

test('a missing locale falls back to <html lang>, never the machine locale', () => {
	document.documentElement.lang = 'de-DE'
	try {
		render(jsx(Calendar, { defaultMonth: date(2026, 7) }), document.body)
		expect(button('[data-slot="calendar-view-trigger"]').textContent).toBe('Juli 2026')
	} finally {
		document.documentElement.lang = ''
	}
})
