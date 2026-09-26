// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'
import { InputDate } from '../src/input-date'

afterEach(() => render(null, document.body))

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
