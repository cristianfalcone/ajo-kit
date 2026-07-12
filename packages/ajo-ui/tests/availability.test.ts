import { describe, expect, test } from 'vitest'
import { compile } from '../src/availability'

describe('compiled availability', () => {
	test('time windows are half-open, combine with day fields, and never cover the whole day', () => {
		const availability = compile({
			dayOfWeek: [1],
			time: { from: '12:00', to: '13:00' },
		})
		const mondayAtNoon = new Date(2026, 6, 13, 12)

		expect(availability?.day(mondayAtNoon)).toBe(false)
		expect(availability?.at(mondayAtNoon)).toBe(true)
		expect(availability?.at(new Date(2026, 6, 13, 12, 59, 59))).toBe(true)
		expect(availability?.at(new Date(2026, 6, 13, 13))).toBe(false)
		expect(availability?.at(new Date(2026, 6, 14, 12))).toBe(false)
	})

	test('fields within one expression intersect while top-level expressions form alternatives', () => {
		const availability = compile([
			{ after: new Date(2026, 6, 1), dayOfWeek: [1] },
			date => date.getDate() === 15,
		])

		expect(availability?.day(new Date(2026, 6, 13))).toBe(true)
		expect(availability?.day(new Date(2026, 5, 29))).toBe(false)
		expect(availability?.day(new Date(2026, 6, 14))).toBe(false)
		expect(availability?.day(new Date(2026, 6, 15))).toBe(true)
	})

	test('serialized date values stay day-granular while datetime and time values honor windows', () => {
		const weekdaysAtLunch = compile({
			dayOfWeek: [1, 2, 3, 4, 5],
			time: { from: '12:00', to: '13:00' },
		})
		const everyLunch = compile({ time: { from: '12:00', to: '13:00' } })

		expect(weekdaysAtLunch?.value('date', '2026-07-13')).toBe(false)
		expect(weekdaysAtLunch?.value('datetime', '2026-07-13T12:30')).toBe(true)
		expect(weekdaysAtLunch?.value('datetime', '2026-07-13T13:00')).toBe(false)
		expect(weekdaysAtLunch?.value('datetime', 'not-a-value')).toBe(false)
		expect(everyLunch?.value('time', '12:30')).toBe(true)
		expect(everyLunch?.value('time', '13:00')).toBe(false)
	})

	test('range crossing inspects only whole unavailable days between the endpoints', () => {
		const wednesdays = compile({ dayOfWeek: [3] })
		const mondays = compile({ dayOfWeek: [1] })
		const lunch = compile({ time: { from: '12:00', to: '13:00' } })
		const monday = new Date(2026, 6, 13, 12)
		const friday = new Date(2026, 6, 17, 12)

		expect(wednesdays?.crosses(monday, friday)).toBe(true)
		expect(mondays?.crosses(monday, friday)).toBe(false)
		expect(lunch?.crosses(monday, friday)).toBe(false)
		expect(wednesdays?.crosses(friday, monday)).toBe(false)
	})

	test('date expressions and candidates share the requested calendar time zone', () => {
		const availability = compile(new Date('2026-07-20T23:30:00.000Z'), {
			timeZone: 'Pacific/Kiritimati',
		})

		expect(availability?.day(new Date('2026-07-21T09:00:00.000Z'))).toBe(true)
		expect(availability?.day(new Date('2026-07-20T01:00:00.000Z'))).toBe(false)
	})

	test('date bounds are strict while ranges and lone endpoints are inclusive', () => {
		const before = compile({ before: new Date(2026, 6, 10, 12) })
		const after = compile({ after: new Date(2026, 6, 20, 12) })
		const range = compile({ from: new Date(2026, 6, 12, 12), to: new Date(2026, 6, 14, 12) })
		const loneTo = compile({ to: new Date(2026, 6, 16, 12) })

		expect(before?.day(new Date(2026, 6, 9, 12))).toBe(true)
		expect(before?.day(new Date(2026, 6, 10, 12))).toBe(false)
		expect(after?.day(new Date(2026, 6, 20, 12))).toBe(false)
		expect(after?.day(new Date(2026, 6, 21, 12))).toBe(true)
		expect(range?.day(new Date(2026, 6, 12, 12))).toBe(true)
		expect(range?.day(new Date(2026, 6, 14, 12))).toBe(true)
		expect(loneTo?.day(new Date(2026, 6, 16, 12))).toBe(true)
		expect(loneTo?.day(new Date(2026, 6, 15, 12))).toBe(false)
	})

	test('open time bounds work and inverted or empty intervals never match', () => {
		const afterNoon = compile({ time: { from: '12:00' } })
		const beforeNoon = compile({ time: { to: '12:00' } })
		const equal = compile({ time: { from: '12:00', to: '12:00' } })
		const inverted = compile({ time: { from: '13:00', to: '12:00' } })

		expect(afterNoon?.at(new Date(2026, 6, 13, 12))).toBe(true)
		expect(afterNoon?.at(new Date(2026, 6, 13, 11, 59, 59))).toBe(false)
		expect(beforeNoon?.at(new Date(2026, 6, 13, 11, 59, 59))).toBe(true)
		expect(beforeNoon?.at(new Date(2026, 6, 13, 12))).toBe(false)
		expect(equal?.at(new Date(2026, 6, 13, 12))).toBe(false)
		expect(inverted?.at(new Date(2026, 6, 13, 23))).toBe(false)
	})

	test('serialized years 0001 through 0099 keep their literal year', () => {
		const year42 = new Date(0)
		year42.setFullYear(42, 2, 4)
		year42.setHours(12, 0, 0, 0)
		const availability = compile(year42)

		expect(availability?.value('date', '0042-03-04')).toBe(true)
		expect(availability?.value('date', '1942-03-04')).toBe(false)
	})
})
