import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { Calendar } from '../src/calendar'

const dateKeyOf = ([locale, options]: ConstructorParameters<typeof Intl.DateTimeFormat>) =>
	JSON.stringify([locale ?? null, Object.entries(options ?? {}).sort(([first], [second]) => first.localeCompare(second))])

test('Calendar reuses each date formatter across a zoned month render', () => {
	const DateTimeFormat = Intl.DateTimeFormat
	const formatters = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function DateTimeFormatMock(locale, options) {
		return new DateTimeFormat(locale, options)
	})
	const calendar = {
		defaultMonth: new Date('2026-05-01T12:00:00Z'),
		disabled: [
			new Date('2026-05-10T12:00:00Z'),
			new Date('2026-05-20T12:00:00Z'),
		],
		locale: 'en-US',
		timeZone: 'UTC',
	}
	const render = () => ssr(jsx('div', {
		children: [
			jsx(Calendar, calendar),
			jsx(Calendar, { ...calendar, captionLayout: 'dropdown' }),
			jsx(Calendar, { ...calendar, captionLayout: 'dropdown-years' }),
		],
	}))

	const html = render()
	const keys = formatters.mock.calls.map(dateKeyOf)
	expect(html).toContain('role="grid"')
	expect(keys.length).toBeGreaterThan(1)
	expect(keys).toHaveLength(new Set(keys).size)
	render()
	expect(formatters).toHaveBeenCalledTimes(keys.length)
	const customDay = ssr(jsx(Calendar, {
		...calendar,
		formatters: { day: () => 'D' },
	}))
	expect(customDay).toContain('>D</button>')
	expect(formatters).toHaveBeenCalledTimes(keys.length)
})
