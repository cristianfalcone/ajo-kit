import { describe, expect, test } from 'vitest'
import {
	constrain,
	daysInMonth,
	defaultMessage,
	derive,
	emptyUnits,
	eraseDigit,
	field,
	fromISO,
	inferGranularity,
	isReversed,
	matchName,
	reconciler,
	stepValue,
	timeRun,
	toISO,
	typeDigit,
	validate,
	type InputResult,
	type Units,
} from '../src/segments'

// Node must carry full-icu: without it every locale silently formats as English
// and the fixtures below would test nothing.
test('ICU sanity: es/de/ja locale data is present', () => {
	const noon = new Date(2224, 0, 4, 12)
	expect(new Intl.DateTimeFormat('es', { month: 'long' }).format(noon)).toBe('enero')
	expect(new Intl.DateTimeFormat('de', { month: 'long' }).format(noon)).toBe('Januar')
	expect(new Intl.DateTimeFormat('ja', { month: 'long' }).format(noon)).toBe('1月')
})

const shape = (kind: Parameters<typeof derive>[0]['kind'], locale: string, extra?: Partial<Parameters<typeof derive>[0]>) =>
	derive({ kind, locale, ...extra })

describe('derivation', () => {
	test('en-US date: m/d/y with numeric widths and native placeholders', () => {
		const d = shape('date', 'en-US')
		expect(d.units).toEqual(['month', 'day', 'year'])
		expect(d.segments.map(s => (s.editable ? s.type : s.text))).toEqual(['month', '/', 'day', '/', 'year'])
		const month = d.segments.find(s => s.type === 'month')!
		const year = d.segments.find(s => s.type === 'year')!
		expect(month).toMatchObject({ placeholder: 'mm', min: 1, max: 12, digits: 2, width: 1 })
		expect(year).toMatchObject({ placeholder: 'yyyy', min: 1, max: 9999, digits: 4, width: 4 })
		expect(d.segments.find(s => s.type === 'day')).toMatchObject({ placeholder: 'dd', min: 1, max: 31, digits: 2 })
	})

	test('es-AR date: d/m/y with aaaa year placeholder', () => {
		const d = shape('date', 'es-AR')
		expect(d.units).toEqual(['day', 'month', 'year'])
		expect(d.segments.find(s => s.type === 'year')!.placeholder).toBe('aaaa')
	})

	test('de-DE date: d.m.y with tt/jjjj vocabulary', () => {
		const d = shape('date', 'de-DE')
		expect(d.units).toEqual(['day', 'month', 'year'])
		expect(d.segments.filter(s => !s.editable).map(s => s.text)).toEqual(['.', '.'])
		expect(d.segments.find(s => s.type === 'day')!.placeholder).toBe('tt')
		expect(d.segments.find(s => s.type === 'year')!.placeholder).toBe('jjjj')
	})

	test('fr date: 2-digit probe widths and jj day placeholder', () => {
		const d = shape('date', 'fr')
		expect(d.segments.find(s => s.type === 'day')).toMatchObject({ width: 2, placeholder: 'jj' })
		expect(d.segments.find(s => s.type === 'month')!.width).toBe(2)
	})

	test('ja-JP date: y/m/d with kanji placeholders', () => {
		const d = shape('date', 'ja-JP')
		expect(d.units).toEqual(['year', 'month', 'day'])
		expect(d.segments.filter(s => s.editable).map(s => s.placeholder)).toEqual(['年', '月', '日'])
	})

	test('unknown vocabulary falls back to English', () => {
		const d = shape('date', 'pt-BR')
		expect(d.segments.find(s => s.type === 'year')!.placeholder).toBe('yyyy')
	})

	test('unmapped part types pass through as literals (era)', () => {
		const d = shape('date', 'ja-JP-u-ca-japanese')
		expect(d.segments[0].editable).toBe(false)
		expect(d.segments[0].type).toBe('literal')
		expect(d.segments[0].text.length).toBeGreaterThan(0)
	})

	test('hour cycle detection: en-US h12 with dayPeriod, de-DE/ja-JP h23 without', () => {
		const us = shape('time', 'en-US')
		expect(us.hourCycle).toBe('h12')
		expect(us.units).toEqual(['hour', 'minute', 'dayPeriod'])
		expect(us.segments.find(s => s.type === 'hour')).toMatchObject({ min: 1, max: 12, placeholder: '––' })
		expect(us.periods).toEqual(['AM', 'PM'])

		for (const locale of ['de-DE', 'ja-JP']) {
			const d = shape('time', locale)
			expect(d.hourCycle).toBe('h23')
			expect(d.units).toEqual(['hour', 'minute'])
			expect(d.segments.find(s => s.type === 'hour')).toMatchObject({ min: 0, max: 23 })
		}
	})

	test('hourCycle override clamps both ways', () => {
		expect(shape('time', 'en-US', { hourCycle: 24 }).units).toEqual(['hour', 'minute'])
		const de = shape('time', 'de-DE', { hourCycle: 12 })
		expect(de.hourCycle).toBe('h12')
		expect(de.units).toEqual(['hour', 'minute', 'dayPeriod'])
	})

	test('second granularity renders the seconds segment', () => {
		expect(shape('time', 'de-DE', { granularity: 'second' }).units).toEqual(['hour', 'minute', 'second'])
	})

	test('datetime composes date and time segments', () => {
		expect(shape('datetime', 'en-US').units).toEqual(['month', 'day', 'year', 'hour', 'minute', 'dayPeriod'])
	})

	test('timeRun isolates the complete time tail of a datetime shape', () => {
		expect(timeRun(shape('datetime', 'en-US').segments).map(segment => segment.type))
			.toEqual(['hour', 'literal', 'minute', 'literal', 'dayPeriod'])
	})

	test('timeRun honors a synthetic dayPeriod-leading time order', () => {
		const date = shape('date', 'en-US').segments
		const time = shape('time', 'en-US').segments
		const unit = (type: 'dayPeriod' | 'hour' | 'minute') => time.find(segment => segment.type === type)!
		const [separator, spacing] = time.filter(segment => !segment.editable)
		const synthetic = [
			...date.slice(0, 2),
			unit('dayPeriod'), spacing!, unit('hour'), separator!, unit('minute'),
			...date.slice(2),
		]

		expect(timeRun(synthetic).map(segment => segment.type))
			.toEqual(['dayPeriod', 'literal', 'hour', 'literal', 'minute'])
	})

	test('timeRun is empty for a date-only shape', () => {
		expect(timeRun(shape('date', 'en-US').segments)).toEqual([])
	})
})

describe('ISO parse/serialize', () => {
	test('accepts exactly the native normalized forms', () => {
		expect(fromISO('date', '2026-07-10')).toMatchObject({ year: 2026, month: 7, day: 10 })
		expect(fromISO('date', '0042-03-04')).toMatchObject({ year: 42, month: 3, day: 4 })
		expect(fromISO('date', '2024-02-29')).toMatchObject({ day: 29 })
		expect(fromISO('time', '14:05')).toMatchObject({ hour: 14, minute: 5, second: null })
		expect(fromISO('time', '14:05:30')).toMatchObject({ hour: 14, minute: 5, second: 30 })
		expect(fromISO('datetime', '2026-07-10T14:05')).toMatchObject({ year: 2026, hour: 14, minute: 5 })
	})

	test('rejects everything else', () => {
		for (const value of ['2026-7-10', '2026-07-1', '26-07-10', '0000-01-01', '2026-13-01', '2026-02-30', '2026-02-29']) {
			expect(fromISO('date', value)).toBeNull()
		}
		for (const value of ['24:00', '14:60', '14:05:60', '14:05:30.500', '9:05']) {
			expect(fromISO('time', value)).toBeNull()
		}
		for (const value of ['2026-07-10 14:05', '2026-07-10T14:05Z', '2026-07-10', '14:05']) {
			expect(fromISO('datetime', value)).toBeNull()
		}
	})

	test('h12 storage: hour in display cycle with its own dayPeriod', () => {
		expect(fromISO('time', '00:30', 'h12')).toMatchObject({ hour: 12, dayPeriod: 0 })
		expect(fromISO('time', '13:05', 'h12')).toMatchObject({ hour: 1, dayPeriod: 1 })
		expect(fromISO('time', '12:00', 'h12')).toMatchObject({ hour: 12, dayPeriod: 1 })
	})

	test('serializes with manual padding, never Date', () => {
		expect(toISO('date', { ...emptyUnits(), year: 42, month: 3, day: 4 })).toBe('0042-03-04')
		expect(toISO('time', { ...emptyUnits(), hour: 9, minute: 5 })).toBe('09:05')
		expect(toISO('time', { ...emptyUnits(), hour: 9, minute: 5, second: 7 }, { seconds: true })).toBe('09:05:07')
	})

	test('h12 serialization converts back to 24h', () => {
		expect(toISO('time', { ...emptyUnits(), hour: 12, minute: 0, dayPeriod: 0 }, { hourCycle: 'h12' })).toBe('00:00')
		expect(toISO('time', { ...emptyUnits(), hour: 12, minute: 0, dayPeriod: 1 }, { hourCycle: 'h12' })).toBe('12:00')
		expect(toISO('time', { ...emptyUnits(), hour: 1, minute: 30, dayPeriod: 1 }, { hourCycle: 'h12' })).toBe('13:30')
	})

	test('incomplete units serialize to null', () => {
		expect(toISO('date', { ...emptyUnits(), year: 2026, month: 7 })).toBeNull()
		expect(toISO('time', { ...emptyUnits(), hour: 9, minute: 5 }, { hourCycle: 'h12' })).toBeNull()
		expect(toISO('time', { ...emptyUnits(), hour: 9, minute: 5 }, { seconds: true })).toBeNull()
	})

	test('daysInMonth: dynamic cap with leap fallback while the year is unknown', () => {
		expect(daysInMonth(null, null)).toBe(31)
		expect(daysInMonth(null, 2)).toBe(29)
		expect(daysInMonth(2025, 2)).toBe(28)
		expect(daysInMonth(2024, 2)).toBe(29)
		expect(daysInMonth(2, 2)).toBe(28)
		expect(daysInMonth(2026, 4)).toBe(30)
	})
})

describe('typing', () => {
	test('digit protocol: accumulate, restart on overflow, advance when full', () => {
		expect(typeDigit('', '1', 1, 12, 2)).toEqual({ value: 1, buffer: '1', advance: false })
		expect(typeDigit('1', '2', 1, 12, 2)).toEqual({ value: 12, buffer: '', advance: true })
		expect(typeDigit('1', '3', 1, 12, 2)).toEqual({ value: 3, buffer: '', advance: true })
		expect(typeDigit('', '3', 1, 12, 2)).toEqual({ value: 3, buffer: '', advance: true })
	})

	test('zero waits in the buffer on min-1 units, sets on min-0 units', () => {
		expect(typeDigit('', '0', 1, 12, 2)).toEqual({ value: null, buffer: '0', advance: false })
		expect(typeDigit('0', '4', 1, 12, 2)).toEqual({ value: 4, buffer: '', advance: true })
		expect(typeDigit('', '0', 0, 23, 2)).toEqual({ value: 0, buffer: '0', advance: false })
	})

	const advances = (f: ReturnType<typeof field>, unit: Parameters<ReturnType<typeof field>['type']>[0], key: string) =>
		f.type(unit, key).advance ?? false

	test('auto-advance table: month/day/hour/minute/year', () => {
		expect(advances(field({ kind: 'date', locale: 'en-US' }), 'month', '3')).toBe(true)
		expect(advances(field({ kind: 'date', locale: 'en-US' }), 'month', '1')).toBe(false)
		expect(advances(field({ kind: 'date', locale: 'en-US' }), 'day', '4')).toBe(true)
		expect(advances(field({ kind: 'date', locale: 'en-US' }), 'day', '1')).toBe(false)
		expect(advances(field({ kind: 'time', locale: 'en-US', hourCycle: 24 }), 'hour', '3')).toBe(true)
		expect(advances(field({ kind: 'time', locale: 'en-US', hourCycle: 24 }), 'hour', '2')).toBe(false)
		expect(advances(field({ kind: 'time', locale: 'en-US' }), 'hour', '2')).toBe(true)
		expect(advances(field({ kind: 'time', locale: 'en-US' }), 'minute', '6')).toBe(true)

		const f = field({ kind: 'date', locale: 'en-US' })
		expect(advances(f, 'year', '2')).toBe(false)
		expect(advances(f, 'year', '0')).toBe(false)
		expect(advances(f, 'year', '2')).toBe(false)
		expect(advances(f, 'year', '6')).toBe(true)
		expect(f.units.year).toBe(2026)
	})

	test('dynamic day max: Feb caps typing at 28/29', () => {
		const f = field({ kind: 'date', locale: 'en-US' })
		f.type('month', '2')
		f.type('year', '2')
		f.type('year', '0')
		f.type('year', '2')
		f.type('year', '5')
		// 2025 Feb: '29' overflows 28, restarts from the last key.
		f.type('day', '2')
		const result = f.type('day', '9')
		expect(f.units.day).toBe(9)
		expect(result.advance).toBe(true)
	})

	test('month-name prefix matcher: unique advances, repeated letter cycles', () => {
		const f = field({ kind: 'date', locale: 'es-AR' })
		expect(f.type('month', 'f')).toMatchObject({ handled: true, advance: true })
		expect(f.units.month).toBe(2)

		expect(f.type('month', 'j').advance).toBe(false)
		expect(f.units.month).toBe(6)
		f.type('month', 'j')
		expect(f.units.month).toBe(7)
		f.type('month', 'j')
		expect(f.units.month).toBe(6)
	})

	test('matchName is accent- and case-insensitive (Collator base)', () => {
		expect(matchName('es', ['ábril', 'agosto'], null, '', 'A')).toMatchObject({ index: 0, unique: false })
		expect(matchName('es', ['enero', 'febrero'], null, '', 'x')).toBeNull()
	})

	test('dayPeriod first-letter matcher', () => {
		const f = field({ kind: 'time', locale: 'en-US' })
		expect(f.type('dayPeriod', 'p')).toMatchObject({ handled: true, advance: true })
		expect(f.units.dayPeriod).toBe(1)
		expect(f.text('dayPeriod')).toBe('PM')
		f.type('dayPeriod', 'a')
		expect(f.units.dayPeriod).toBe(0)
		expect(f.type('dayPeriod', 'x').handled).toBe(false)
		expect(f.type('dayPeriod', '1').handled).toBe(false)
	})

	test('buffer resets when the focused unit changes and on blur', () => {
		const f = field({ kind: 'date', locale: 'en-US' })
		f.type('month', '1')
		f.type('day', '2')
		expect(f.units.day).toBe(2)
		expect(f.units.month).toBe(1)

		f.type('month', '1')
		f.blur()
		f.type('month', '2')
		expect(f.units.month).toBe(2)
	})
})

describe('stepping', () => {
	test('±1 wraps at bounds without carry', () => {
		expect(stepValue('month', 12, { step: 1 }, 1, 12)).toBe(1)
		expect(stepValue('month', 1, { step: -1 }, 1, 12)).toBe(12)
		expect(stepValue('hour', 12, { step: 1 }, 1, 12)).toBe(1)
		expect(stepValue('hour', 23, { step: 1 }, 0, 23)).toBe(0)
		expect(stepValue('dayPeriod', 1, { step: 1 }, 0, 1)).toBe(0)
	})

	test('page steps round to their grid', () => {
		expect(stepValue('year', 2026, { page: 1 }, 1, 9999)).toBe(2030)
		expect(stepValue('minute', 7, { page: 1 }, 0, 59)).toBe(15)
		expect(stepValue('minute', 7, { page: -1 }, 0, 59)).toBe(0)
		expect(stepValue('minute', 0, { page: -1 }, 0, 59)).toBe(45)
		expect(stepValue('day', 3, { page: -1 }, 1, 31)).toBe(1)
		expect(stepValue('day', 25, { page: 1 }, 1, 28)).toBe(28)
		expect(stepValue('day', 28, { page: 1 }, 1, 28)).toBe(1)
	})

	test('edges land on min/max', () => {
		expect(stepValue('hour', 5, { edge: 'max' }, 1, 12)).toBe(12)
		expect(stepValue('hour', 5, { edge: 'min' }, 1, 12)).toBe(1)
	})

	test('minute step arg: arrows ride the grid, wrap included', () => {
		expect(stepValue('minute', 7, { step: 1 }, 0, 59, 15)).toBe(15)
		expect(stepValue('minute', 45, { step: 1 }, 0, 59, 15)).toBe(0)
		expect(stepValue('minute', 30, { step: -1 }, 0, 59, 15)).toBe(15)
	})

	test('field spin: Feb wraps 28→1 under a known non-leap year', () => {
		const f = field({ kind: 'date', locale: 'en-US', defaultValue: '2026-02-28' })
		expect(f.spin('day', { step: 1 }).emit).toBe('2026-02-01')
		expect(f.bounds('day')).toEqual({ min: 1, max: 28 })
	})

	test('field spin: h12 hour wrap never flips dayPeriod', () => {
		const f = field({ kind: 'time', locale: 'en-US', defaultValue: '12:30' })
		expect(f.units).toMatchObject({ hour: 12, dayPeriod: 1 })
		expect(f.spin('hour', { step: 1 }).emit).toBe('13:30')
		expect(f.units.dayPeriod).toBe(1)
	})

	test('field spin: dayPeriod toggles and recommits', () => {
		const f = field({ kind: 'time', locale: 'en-US', defaultValue: '09:30' })
		expect(f.spin('dayPeriod', { step: 1 }).emit).toBe('21:30')
	})

	test('empty segment: first press seeds from placeholderValue, edges from bounds', () => {
		const f = field({ kind: 'date', locale: 'en-US', placeholderValue: '2026-07-10' })
		expect(f.spin('month', { step: 1 }).emit).toBeUndefined()
		expect(f.units.month).toBe(7)
		f.spin('day', { step: -1 })
		expect(f.units.day).toBe(10)
		f.spin('year', { edge: 'max' })
		expect(f.units.year).toBe(9999)
	})

	test('minute step option applies through the field', () => {
		const f = field({ kind: 'time', locale: 'en-US', hourCycle: 24, step: 15, defaultValue: '09:00' })
		expect(f.spin('minute', { step: 1 }).emit).toBe('09:15')
		expect(f.spin('minute', { page: 1 }).emit).toBe('09:30')
	})
})

describe('deletion', () => {
	test('strips the last digit, empties to placeholder, retreats when already empty', () => {
		expect(eraseDigit(28, '')).toEqual({ value: 2, buffer: '2', retreat: false })
		expect(eraseDigit(2, '2')).toEqual({ value: null, buffer: '', retreat: false })
		expect(eraseDigit(10, '')).toEqual({ value: 1, buffer: '1', retreat: false })
		expect(eraseDigit(null, '')).toEqual({ value: null, buffer: '', retreat: true })
	})

	test('field erase: complete → incomplete emits null, empty retreats', () => {
		const f = field({ kind: 'date', locale: 'en-US', defaultValue: '2026-01-28' })
		expect(f.erase('day').emit).toBe('2026-01-02')
		expect(f.erase('day').emit).toBeNull()
		expect(f.value()).toBeNull()
		expect(f.erase('day')).toMatchObject({ handled: true, retreat: true })
	})

	test('dayPeriod clears whole', () => {
		const f = field({ kind: 'time', locale: 'en-US', defaultValue: '13:05' })
		expect(f.units.dayPeriod).toBe(1)
		expect(f.erase('dayPeriod').emit).toBeNull()
		expect(f.units.dayPeriod).toBeNull()
		expect(f.erase('dayPeriod').retreat).toBe(true)
	})

	test('eraseDigit guards NaN: a non-numeric remainder clears instead of committing NaN', () => {
		expect(eraseDigit(3, 'ma')).toEqual({ value: null, buffer: '', retreat: false })
	})

	test('toISO never serializes NaN units', () => {
		expect(toISO('date', { ...emptyUnits(), year: 2026, month: NaN, day: 4 })).toBeNull()
		expect(toISO('time', { ...emptyUnits(), hour: NaN, minute: 5 })).toBeNull()
		expect(toISO('time', { ...emptyUnits(), hour: 9, minute: 5, second: NaN }, { seconds: true })).toBeNull()
		expect(toISO('time', { ...emptyUnits(), hour: 9, minute: 5, dayPeriod: NaN }, { hourCycle: 'h12' })).toBeNull()
	})

	test("backspace after month-name letters erases by letter, never NaN ('m','a' repro)", () => {
		// The live repro: 'm','a' buffers a non-unique name prefix; Backspace
		// used to Number('m') the remainder into a committed '2026-NaN-NaN'.
		const f = field({ kind: 'date', locale: 'en-US', defaultValue: '2026-01-04' })
		f.type('month', 'm')
		f.type('month', 'a')
		expect(f.units.month).toBe(3)
		expect(f.value()).toBe('2026-03-04')

		const first = f.erase('month')
		expect(first.emit).toBeUndefined()
		expect(f.text('month')).toBe('m')
		expect(f.units.month).toBe(3)
		expect(f.value()).toBe('2026-03-04')

		const second = f.erase('month')
		expect(second.emit).toBeNull()
		expect(f.units.month).toBeNull()
		expect(f.text('month')).toBe('')

		expect(f.erase('month')).toMatchObject({ handled: true, retreat: true })
	})

	test('name-buffer erase walk re-matches the shrinking prefix', () => {
		// es 'jul' → julio; erasing walks jul → ju → j, re-matching each prefix.
		const f = field({ kind: 'date', locale: 'es-AR' })
		f.type('month', 'j')
		f.type('month', 'u')
		f.type('month', 'l')
		expect(f.units.month).toBe(7)
		f.erase('month')
		expect(f.text('month')).toBe('ju')
		expect(f.units.month).toBe(6)
		f.erase('month')
		expect(f.text('month')).toBe('j')
		expect(f.units.month).toBe(6)
		f.erase('month')
		expect(f.units.month).toBeNull()
	})
})

describe('commit machinery', () => {
	const emitsOf = (results: InputResult[]) => results.filter(r => r.emit !== undefined).map(r => r.emit)

	test('initial entry: transient Feb 30 survives until the completing keystroke clamps', () => {
		const f = field({ kind: 'date', locale: 'es-AR' })
		const results = [
			f.type('day', '3'),
			f.type('day', '0'),
			f.type('month', '2'),
			f.type('year', '2'),
			f.type('year', '0'),
			f.type('year', '2'),
			f.type('year', '5'),
		]
		expect(f.units.day).toBe(28)
		expect(emitsOf(results)).toEqual(['0002-02-28', '0020-02-28', '0202-02-28', '2025-02-28'])
	})

	test('complete field: every mutation constrains eagerly (Jan 31 + month step → Feb 28)', () => {
		const f = field({ kind: 'date', locale: 'en-US', defaultValue: '2026-01-31' })
		expect(f.spin('month', { step: 1 }).emit).toBe('2026-02-28')
		expect(f.units.day).toBe(28)
	})

	test('no carry: day step at month end stays in the month', () => {
		const f = field({ kind: 'date', locale: 'en-US', defaultValue: '2026-01-31' })
		expect(f.spin('day', { step: 1 }).emit).toBe('2026-01-01')
		expect(f.units.month).toBe(1)
	})

	test('incomplete mutations never emit; blur cannot invent units', () => {
		const f = field({ kind: 'date', locale: 'en-US' })
		expect(f.type('month', '7').emit).toBeUndefined()
		f.blur()
		expect(f.value()).toBeNull()
		expect(f.complete()).toBe(false)
	})

	test('min/max never block commit', () => {
		const f = field({ kind: 'date', locale: 'en-US', min: '2026-01-05', defaultValue: '2026-01-05' })
		expect(f.spin('day', { step: -1 }).emit).toBe('2026-01-04')
		expect(f.reason()).toEqual({ code: 'rangeUnderflow', min: '2026-01-05' })
	})

	test('merge commits like a calendar pick', () => {
		const f = field({ kind: 'date', locale: 'en-US' })
		expect(f.merge({ year: 2026, month: 7, day: 10 }).emit).toBe('2026-07-10')
	})

	test('clear empties and emits null exactly once', () => {
		const f = field({ kind: 'date', locale: 'en-US', defaultValue: '2026-07-10' })
		expect(f.clear().emit).toBeNull()
		expect(f.clear().emit).toBeUndefined()
	})

	test('reset restores defaultValue without emitting', () => {
		const f = field({ kind: 'date', locale: 'en-US', defaultValue: '2026-07-10' })
		f.clear()
		f.reset()
		expect(f.value()).toBe('2026-07-10')
		expect(f.units.day).toBe(10)
	})

	test('datetime end-to-end: typed units serialize through the display cycle', () => {
		const f = field({ kind: 'datetime', locale: 'en-US' })
		f.type('month', '7')
		f.type('day', '1')
		f.type('day', '0')
		f.type('year', '2')
		f.type('year', '0')
		f.type('year', '2')
		f.type('year', '6')
		f.type('hour', '2')
		f.type('minute', '3')
		f.type('minute', '0')
		const result = f.type('dayPeriod', 'p')
		expect(result.emit).toBe('2026-07-10T14:30')
	})
})

describe('reconciliation', () => {
	test('reconciler: echoes suppressed, rejections and pushes re-derive', () => {
		const r = reconciler()
		expect(r.observe(undefined)).toBe(false)
		expect(r.observe('a')).toBe(true)
		expect(r.observe('a')).toBe(false)
		r.emit('b')
		expect(r.observe('b')).toBe(false)
		expect(r.observe('a')).toBe(true)
		expect(r.observe(null)).toBe(true)
		expect(r.observe(null)).toBe(false)
	})

	test('echo mid-typing keeps the buffer intact', () => {
		const f = field({ kind: 'date', locale: 'en-US' })
		f.sync('2026-03-04')
		expect(f.type('month', '1').emit).toBe('2026-01-04')
		f.sync('2026-01-04')
		expect(f.type('month', '2').emit).toBe('2026-12-04')
		expect(f.units.month).toBe(12)
	})

	test('owner rejection reverts units and drops the buffer', () => {
		const f = field({ kind: 'date', locale: 'en-US' })
		f.sync('2026-03-04')
		f.type('month', '1')
		f.sync('2026-03-04')
		expect(f.units.month).toBe(3)
		f.type('month', '2')
		expect(f.units.month).toBe(2)
	})

	test('external push mid-edit re-derives everything', () => {
		const f = field({ kind: 'date', locale: 'en-US' })
		f.type('month', '1')
		f.sync('2030-05-06')
		expect(f.units).toMatchObject({ year: 2030, month: 5, day: 6 })
		expect(f.text('month')).toBe('5')
	})

	test('controlled null clears; uncontrolled sync never touches', () => {
		const f = field({ kind: 'date', locale: 'en-US' })
		f.sync('2026-07-10')
		f.sync(null)
		expect(f.units.year).toBeNull()
		expect(f.value()).toBeNull()

		const u = field({ kind: 'date', locale: 'en-US', defaultValue: '2026-07-10' })
		u.sync(undefined)
		expect(u.units.day).toBe(10)
	})

	test('locale flip re-derives segments, keeps units, drops the buffer', () => {
		const f = field({ kind: 'date', locale: 'en-US' })
		f.sync('2026-12-04')
		f.type('month', '1')
		f.sync('2026-12-04', { kind: 'date', locale: 'es-AR' })
		expect(f.segments[0].type).toBe('day')
		expect(f.units.month).toBe(12)
		f.type('month', '2')
		expect(f.units.month).toBe(2)
	})

	test('hourCycle flip converts the stored hour in place', () => {
		const f = field({ kind: 'time', locale: 'en-US', defaultValue: '13:30' })
		expect(f.units).toMatchObject({ hour: 1, dayPeriod: 1 })
		f.sync(undefined, { kind: 'time', locale: 'en-US', hourCycle: 24 })
		expect(f.units).toMatchObject({ hour: 13, dayPeriod: null })
		f.sync(undefined, { kind: 'time', locale: 'en-US', hourCycle: 12 })
		expect(f.units).toMatchObject({ hour: 1, dayPeriod: 1 })
	})
})

describe('granularity inference', () => {
	test('value → defaultValue → placeholderValue → arg → minute', () => {
		expect(inferGranularity('time', { value: '14:05:30' })).toBe('second')
		expect(inferGranularity('time', { value: '14:05', granularity: 'second' })).toBe('minute')
		expect(inferGranularity('time', { defaultValue: '09:00:00' })).toBe('second')
		expect(inferGranularity('time', { placeholderValue: '00:00:00' })).toBe('second')
		expect(inferGranularity('time', { granularity: 'second' })).toBe('second')
		expect(inferGranularity('time', {})).toBe('minute')
		expect(inferGranularity('datetime', { value: '2026-07-10T14:05:30' })).toBe('second')
		expect(inferGranularity('datetime', { value: '2026-07-10' })).toBe('minute')
		expect(inferGranularity('date', { granularity: 'second' })).toBe('day')
	})

	test('a value with seconds forces the seconds segment on the field', () => {
		const f = field({ kind: 'time', locale: 'de-DE', defaultValue: '09:00:00' })
		expect(f.segments.filter(s => s.editable).map(s => s.type)).toEqual(['hour', 'minute', 'second'])
		expect(f.value()).toBe('09:00:00')
	})

	const shapeOf = (f: ReturnType<typeof field>) => f.segments.filter(s => s.editable).map(s => s.type)

	test('controlled echo never narrows an inferred seconds shape', () => {
		// Mirrors input-date's sync sequence: adopt a controlled value, edit to
		// incomplete (emit null), owner echoes null. The echo used to re-infer
		// minute, drop the seconds segment (stranding second=30), and truncate
		// the next commit to '09:45'.
		const f = field({ kind: 'time', locale: 'en-US' })
		f.sync('09:00:30')
		expect(shapeOf(f)).toContain('second')

		expect(f.erase('minute').emit).toBeNull()
		f.sync(null)
		expect(shapeOf(f)).toContain('second')
		expect(f.units.second).toBe(30)

		expect(f.type('minute', '4').emit).toBe('09:04:30')
		f.sync('09:04:30')
		expect(f.type('minute', '5').emit).toBe('09:45:30')
	})

	test('an external narrower value legitimately re-derives the shape', () => {
		const f = field({ kind: 'time', locale: 'en-US' })
		f.sync('09:00:30')
		f.sync('14:05')
		expect(shapeOf(f)).not.toContain('second')
		expect(f.units).toMatchObject({ hour: 2, minute: 5, second: null, dayPeriod: 1 })
		expect(f.value()).toBe('14:05')
	})

	test('uncontrolled seconds shape survives undefined syncs and a null emission', () => {
		const f = field({ kind: 'time', locale: 'en-US', defaultValue: '09:00:00' })
		f.sync(undefined)
		expect(shapeOf(f)).toContain('second')

		expect(f.erase('second').emit).toBeNull()
		f.sync(undefined)
		expect(shapeOf(f)).toContain('second')
	})

	test('changed inference inputs re-infer, but never below a still-held unit', () => {
		// Dropping the granularity arg while second holds a value keeps the latch…
		const f = field({ kind: 'time', locale: 'en-US', granularity: 'second' })
		f.merge({ hour: 9, minute: 0, second: 30, dayPeriod: 0 })
		f.erase('minute')
		f.sync(undefined, { kind: 'time', locale: 'en-US' })
		expect(shapeOf(f)).toContain('second')
		expect(f.units.second).toBe(30)

		// …while an empty field legitimately narrows on the same change.
		const g = field({ kind: 'time', locale: 'en-US', granularity: 'second' })
		g.sync(undefined, { kind: 'time', locale: 'en-US' })
		expect(shapeOf(g)).not.toContain('second')
	})
})

describe('validation reasons and messages', () => {
	test('all-empty is valid; partial names the first missing unit in display order', () => {
		const f = field({ kind: 'date', locale: 'es-AR' })
		expect(f.reason()).toBeNull()
		f.type('day', '4')
		expect(f.reason()).toEqual({ code: 'incomplete', unit: 'month' })
		expect(f.message()).toContain('mes')
	})

	test('impossible dates are reason-coded; constrain clamps them real', () => {
		const units: Units = { ...emptyUnits(), year: 2025, month: 2, day: 30 }
		expect(validate('date', units, ['day', 'month', 'year'])).toEqual({ code: 'impossible' })
		expect(defaultMessage({ code: 'impossible' }, { kind: 'date', locale: 'en-US' })).toBe('Must be a real date')
		expect(constrain(units).day).toBe(28)
		expect(validate('date', units, ['day', 'month', 'year'])).toBeNull()
	})

	test('range reasons carry the bound; messages format it', () => {
		const f = field({ kind: 'date', locale: 'en-US', max: '2026-01-05', defaultValue: '2026-01-06' })
		expect(f.reason()).toEqual({ code: 'rangeOverflow', max: '2026-01-05' })
		expect(f.message()).toBe('Must be Jan 5, 2026 or earlier')
	})

	test('unavailable consults the matcher with the committed ISO', () => {
		const f = field({ kind: 'date', locale: 'en-US', unavailable: value => value === '2026-07-10', defaultValue: '2026-07-10' })
		expect(f.reason()).toEqual({ code: 'unavailable' })
		expect(f.message()).toBe('This date is unavailable')
	})

	test('unavailable ranges have a range-level default message', () => {
		expect(defaultMessage({ code: 'unavailableRange' }, { kind: 'date', locale: 'en-US' }))
			.toBe('Range includes unavailable dates')
	})

	test('errorMessage overrides per reason, undefined falls back', () => {
		const f = field({
			kind: 'date',
			locale: 'en-US',
			min: '2026-01-05',
			errorMessage: reason => (reason.code === 'incomplete' ? 'faltan datos' : undefined),
		})
		f.type('month', '7')
		expect(f.message()).toBe('faltan datos')
		f.merge({ year: 2026, month: 1, day: 1 })
		expect(f.message()).toBe('Must be Jan 5, 2026 or later')
	})

	test('range cross-check: from > to as plain string compare', () => {
		expect(isReversed('2026-07-11', '2026-07-10')).toBe(true)
		expect(isReversed('2026-07-10', '2026-07-10')).toBe(false)
		expect(isReversed('22:00', '06:00')).toBe(true)
		expect(isReversed(null, '06:00')).toBe(false)
	})
})

describe('display text', () => {
	test('pads to the probe width per locale', () => {
		const us = field({ kind: 'date', locale: 'en-US', defaultValue: '2026-04-02' })
		expect(us.text('month')).toBe('4')
		expect(us.text('year')).toBe('2026')

		const fr = field({ kind: 'date', locale: 'fr' })
		fr.merge({ year: 42, month: 4, day: 2 })
		expect(fr.text('month')).toBe('04')
		expect(fr.text('day')).toBe('02')
		expect(fr.text('year')).toBe('0042')
		expect(fr.value()).toBe('0042-04-02')
	})

	test('buffer wins while typing; empty units yield the empty string', () => {
		const f = field({ kind: 'date', locale: 'en-US' })
		expect(f.text('month')).toBe('')
		f.type('month', '0')
		expect(f.text('month')).toBe('0')
		expect(f.units.month).toBeNull()
		f.type('month', '4')
		expect(f.units.month).toBe(4)
	})
})
