import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { InputDate, InputDateTime, InputTime } from '../../src/ui/input-date'

const segmentValueText = (html: string, segment: string) => {
	const tag = html.match(new RegExp(`<div\\b[^>]*data-segment="${segment}"[^>]*>`))?.[0]
	return tag?.match(/aria-valuetext="([^"]*)"/)?.[1]
}

// ajo/html renders with no document, so the locale chain's <html lang> link
// is unreachable on the server pass: output must be the fixed en-US shape
// regardless of the machine locale (never navigator, never ambient ICU).
// Non-English SSR requires the explicit locale arg (recorded in ai/date.md).
test('SSR renders the machine-locale-independent en-US segment shape', () => {
	const html = ssr(jsx(InputDate, { name: 'dob' }))

	const order = [...html.matchAll(/data-segment="(\w+)"/g)].map(match => match[1])
	expect(order).toEqual(['month', 'day', 'year'])
	expect(html).toContain('>mm</div>')
	expect(html).toContain('>dd</div>')
	expect(html).toContain('>yyyy</div>')
	expect(html).toContain('name="dob"')
})

test('SSR renders the explicit locale arg shape (the non-English SSR rule)', () => {
	const html = ssr(jsx(InputDate, { locale: 'es-AR', name: 'nacimiento' }))

	const order = [...html.matchAll(/data-segment="(\w+)"/g)].map(match => match[1])
	expect(order).toEqual(['day', 'month', 'year'])
	expect(html).toContain('>aaaa</div>')
})

test('SSR segments are hydration-safe: spinbutton role, never editable before hydration', () => {
	const html = ssr(jsx(InputDate, { name: 'dob' }))

	expect(html).toContain('role="spinbutton"')
	expect(html).not.toContain('contenteditable')
	expect(html).toContain('data-placeholder="true"')
})

test('SSR empty segment labels have family-wide defaults and overrides', () => {
	expect(segmentValueText(ssr(jsx(InputDate, {})), 'month')).toBe('Empty')
	const date = ssr(jsx(InputDate, { emptyLabel: 'No date' }))
	expect(segmentValueText(date, 'month')).toBe('No date')

	const time = ssr(jsx(InputTime, { emptyLabel: 'No time', hourCycle: 12, locale: 'en-US' }))
	expect(segmentValueText(time, 'hour')).toBe('No time')
	expect(segmentValueText(time, 'dayPeriod')).toBe('No time')

	const dateTime = ssr(jsx(InputDateTime, { emptyLabel: 'No date and time' }))
	expect(segmentValueText(dateTime, 'month')).toBe('No date and time')
	expect([date, time, dateTime].join('')).not.toMatch(/emptylabel=/i)
})

test('InputDate shares Calendar matcher intersection semantics', () => {
	const html = ssr(jsx(InputDate, {
		defaultValue: '2026-07-13',
		unavailable: {
			after: new Date(2026, 6, 20, 12),
			dayOfWeek: [1],
		},
	}))

	expect(html).not.toContain('This date is unavailable')
	expect(html).not.toContain('data-invalid="true"')
})
