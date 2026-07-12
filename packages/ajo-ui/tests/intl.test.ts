import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { Calendar } from '../src/calendar'
import { ChartBar, ChartContainer } from '../src/chart'
import { InputDate } from '../src/input-date'
import { defaultMessage, formatValue, matchName } from '../src/segments'

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

test('Chart reuses its default number formatter across labels', () => {
	const NumberFormat = Intl.NumberFormat
	const formats = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function NumberFormatMock(locale, options) {
		return new NumberFormat(locale, options)
	})
	const chart = {
		chartId: 'revenue',
		children: jsx(ChartBar, {}),
		config: { revenue: { label: 'Revenue' } },
		data: [
			{ month: 'Jan', revenue: 1_000 },
			{ month: 'Feb', revenue: 2_000 },
			{ month: 'Mar', revenue: 3_000 },
		],
		palette: ['blue'],
		xKey: 'month',
	}

	const custom = ssr(jsx(ChartContainer, {
		...chart,
		formatValue: (value: number) => `USD ${value}`,
	}))
	expect(custom).toContain('USD 1000')
	expect(formats).not.toHaveBeenCalled()

	const html = ssr(jsx(ChartContainer, {
		...chart,
	}))

	expect(html).toContain('data-slot="chart-bar"')
	expect(formats).toHaveBeenCalledTimes(1)
	ssr(jsx(ChartContainer, { ...chart }))
	expect(formats).toHaveBeenCalledTimes(1)
})

test('date-field labels share display names by locale across InputDate and messages', () => {
	const DisplayNames = Intl.DisplayNames
	const names = vi.spyOn(Intl, 'DisplayNames').mockImplementation(function DisplayNamesMock(locale, options) {
		return new DisplayNames(locale, options)
	})
	expect(defaultMessage({ code: 'incomplete', unit: 'day' }, { kind: 'date', locale: 'en-US' })).toContain('day')
	expect(defaultMessage({ code: 'incomplete', unit: 'month' }, { kind: 'date', locale: 'en-US' })).toContain('month')

	const html = ssr(jsx('div', {
		children: [
			jsx(InputDate, { locale: 'en-US' }),
			jsx(InputDate, { locale: 'en-US' }),
			jsx(InputDate, { locale: 'es-AR' }),
		],
	}))

	expect(html.match(/data-slot="input-date"/g)).toHaveLength(3)
	expect(names).toHaveBeenCalledTimes(2)
})

test('segment name matching reuses one collator per locale', () => {
	const Collator = Intl.Collator
	const collators = vi.spyOn(Intl, 'Collator').mockImplementation(function CollatorMock(locale, options) {
		return new Collator(locale, options)
	})

	expect(matchName('es', ['ábril', 'agosto'], null, '', 'A')).toMatchObject({ index: 0, unique: false })
	expect(matchName('es', ['enero', 'febrero'], null, '', 'x')).toBeNull()
	expect(matchName('de', ['März', 'Mai'], null, '', 'm')).toMatchObject({ index: 0, unique: false })
	expect(collators).toHaveBeenCalledTimes(2)
})

test('committed segment values reuse formatters by locale, kind, precision, and hour cycle', () => {
	const DateTimeFormat = Intl.DateTimeFormat
	const formatters = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function DateTimeFormatMock(locale, options) {
		return new DateTimeFormat(locale, options)
	})

	formatValue('2026-05-10', { kind: 'date', locale: 'en-US' })
	formatValue('2026-06-11', { kind: 'date', locale: 'en-US' })
	formatValue('10:15', { hourCycle: 'h12', kind: 'time', locale: 'en-US' })
	formatValue('11:20', { hourCycle: 'h12', kind: 'time', locale: 'en-US' })
	formatValue('10:15:30', { hourCycle: 'h12', kind: 'time', locale: 'en-US' })
	formatValue('10:15', { hourCycle: 'h23', kind: 'time', locale: 'en-US' })
	formatValue('10:15', { kind: 'time', locale: 'en-US' })
	formatValue('11:20', { kind: 'time', locale: 'en-US' })
	formatValue('2026-05-10T10:15', { kind: 'datetime', locale: 'en-US' })
	formatValue('2026-06-11T11:20', { kind: 'datetime', locale: 'en-US' })
	formatValue('2026-05-10T10:15:30', { hourCycle: 'h12', kind: 'datetime', locale: 'en-US' })
	formatValue('2026-05-10', { kind: 'date', locale: 'es-AR' })

	expect(formatters).toHaveBeenCalledTimes(8)
})
