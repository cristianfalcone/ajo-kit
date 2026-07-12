import { remember } from 'ajo-cloves'
import { fromISO, type SegmentsKind } from './segments'

/** Half-open wall-time interval used by availability expressions. */
export type TimeWindow = {
	/** Inclusive wall-time start, `HH:MM[:SS]`. */
	from?: string
	/** Exclusive wall-time end, `HH:MM[:SS]`. */
	to?: string
}

type DateMatcher = {
	after?: Date
	before?: Date
	dayOfWeek?: number[]
	from?: Date
	to?: Date
}

/** Day-granular matcher grammar shared by Calendar and date fields. */
export type CalendarMatcher =
	| ((date: Date) => boolean)
	| DateMatcher
	| Date
	| Date[]

/** Calendar matcher with an optional half-open wall-time dimension. */
export type AvailabilityMatcher =
	| CalendarMatcher
	| (DateMatcher & { time: TimeWindow })

type DateParts = {
	day: number
	hour: number
	minute: number
	month: number
	second: number
	year: number
}

/** Stable compiled availability view. */
export type Availability = {
	day(date: Date): boolean
	at(date: Date): boolean
	value(kind: SegmentsKind, value: string): boolean
	crosses(from: Date, to: Date): boolean
}

export type AvailabilityCompileOptions = {
	/** Calendar time zone used for matcher and candidate date parts. */
	timeZone?: string
}

const clock = (value: string | undefined, fallback: number) => {
	if (value == null) return fallback
	const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
	if (!match) return Number.NaN
	const hour = Number(match[1])
	const minute = Number(match[2])
	const second = Number(match[3] ?? 0)
	if (hour > 23 || minute > 59 || second > 59) return Number.NaN
	return hour * 3600 + minute * 60 + second
}

const timeMatches = (window: TimeWindow, parts: DateParts) => {
	const from = clock(window.from, 0)
	const to = clock(window.to, 24 * 3600)
	const value = parts.hour * 3600 + parts.minute * 60 + parts.second
	return Number.isFinite(from) && Number.isFinite(to) && from < to && from <= value && value < to
}

const partFormatters = new Map<string, Intl.DateTimeFormat>()

const partFormatter = (timeZone: string) => {
	let formatter = partFormatters.get(timeZone)
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-CA', {
			day: '2-digit',
			hour: '2-digit',
			hourCycle: 'h23',
			minute: '2-digit',
			month: '2-digit',
			second: '2-digit',
			timeZone,
			year: 'numeric',
		})
		remember(partFormatters, timeZone, formatter)
	}
	return formatter
}

const partsOf = (date: Date, timeZone?: string): DateParts => {
	if (!timeZone) return {
		day: date.getDate(),
		hour: date.getHours(),
		minute: date.getMinutes(),
		month: date.getMonth() + 1,
		second: date.getSeconds(),
		year: date.getFullYear(),
	}
	const parts = partFormatter(timeZone).formatToParts(date)
	const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value)
	return {
		day: value('day'),
		hour: value('hour'),
		minute: value('minute'),
		month: value('month'),
		second: value('second'),
		year: value('year'),
	}
}

const dayValue = (parts: Pick<DateParts, 'day' | 'month' | 'year'>) =>
	parts.year * 10000 + parts.month * 100 + parts.day

const exactUtcDate = (parts: Pick<DateParts, 'day' | 'month' | 'year'> & Partial<Pick<DateParts, 'hour' | 'minute' | 'second'>>) => {
	const date = new Date(0)
	date.setUTCFullYear(parts.year, parts.month - 1, parts.day)
	date.setUTCHours(parts.hour ?? 0, parts.minute ?? 0, parts.second ?? 0, 0)
	return date
}

const exactLocalDate = (parts: DateParts) => {
	const date = new Date(0)
	date.setFullYear(parts.year, parts.month - 1, parts.day)
	date.setHours(parts.hour, parts.minute, parts.second, 0)
	return date
}

const weekday = (parts: Pick<DateParts, 'day' | 'month' | 'year'>) =>
	exactUtcDate(parts).getUTCDay()

/** Constructs a stable instant for one wall-clock value in a calendar time zone. */
export const calendarDate = (parts: DateParts, timeZone?: string) => {
	if (!timeZone) return exactLocalDate(parts)
	const wanted = exactUtcDate(parts).getTime()
	let instant = wanted
	for (let pass = 0; pass < 2; pass++) {
		const observed = partsOf(new Date(instant), timeZone)
		const actual = exactUtcDate(observed).getTime()
		instant += wanted - actual
	}
	return new Date(instant)
}

const addDay = (parts: DateParts): DateParts => {
	const next = exactUtcDate({ ...parts, day: parts.day + 1, hour: 12 })
	return {
		day: next.getUTCDate(),
		hour: 12,
		minute: 0,
		month: next.getUTCMonth() + 1,
		second: 0,
		year: next.getUTCFullYear(),
	}
}

/** Compiles date/time expressions into stable day- and instant-granular predicates. */
export const compile = (
	matcher: AvailabilityMatcher | AvailabilityMatcher[] | undefined,
	options: AvailabilityCompileOptions = {},
): Availability | undefined => {
	if (matcher == null) return undefined
	const matchers = (Array.isArray(matcher) ? matcher : [matcher]) as AvailabilityMatcher[]
	if (!matchers.length) return undefined
	const parts = (date: Date) => partsOf(date, options.timeZone)
	const sameDay = (first: Date, second: Date) => dayValue(parts(first)) === dayValue(parts(second))
	const object = (value: AvailabilityMatcher): value is DateMatcher & { time?: TimeWindow } =>
		typeof value === 'object' && value != null && !(value instanceof Date) && !Array.isArray(value)
	const dateMatches = (item: DateMatcher, value: Date) => {
		const current = parts(value)
		const currentDay = dayValue(current)
		const tests: boolean[] = []
		if (item.dayOfWeek != null) tests.push(item.dayOfWeek.includes(weekday(current)))
		if (item.before != null) tests.push(currentDay < dayValue(parts(item.before)))
		if (item.after != null) tests.push(currentDay > dayValue(parts(item.after)))
		if (item.from != null && item.to != null) {
			tests.push(dayValue(parts(item.from)) <= currentDay && currentDay <= dayValue(parts(item.to)))
		} else if (item.from != null) {
			tests.push(sameDay(item.from, value))
		} else if (item.to != null) {
			tests.push(sameDay(item.to, value))
		}
		return tests.every(Boolean)
	}
	const matchesDate = (item: AvailabilityMatcher, value: Date): boolean => {
		if (item instanceof Date) return sameDay(item, value)
		if (Array.isArray(item)) return item.some(entry => sameDay(entry, value))
		if (typeof item === 'function') return item(value)
		const hasConstraint = item.after != null || item.before != null || item.dayOfWeek != null || item.from != null || item.to != null || 'time' in item
		return hasConstraint && dateMatches(item, value)
	}
	const day = (date: Date) =>
		matchers.some(item => (!object(item) || item.time == null) && matchesDate(item, date))
	const at = (date: Date) =>
		matchers.some(item => matchesDate(item, date) && (!object(item) || item.time == null || timeMatches(item.time, parts(date))))

	return {
		day,
		at,
		value(kind: SegmentsKind, value: string) {
			const units = fromISO(kind, value)
			if (!units) return false
			const now = parts(new Date())
			const date = kind === 'time'
				? calendarDate({ ...now, hour: units.hour ?? 0, minute: units.minute ?? 0, second: units.second ?? 0 }, options.timeZone)
				: calendarDate({ day: units.day!, hour: units.hour ?? 12, minute: units.minute ?? 0, month: units.month!, second: units.second ?? 0, year: units.year! }, options.timeZone)
			return kind === 'date' ? day(date) : at(date)
		},
		crosses(from: Date, to: Date) {
			const end = dayValue(parts(to))
			let current = parts(from)
			if (dayValue(current) >= end) return false
			for (current = addDay(current); dayValue(current) < end; current = addDay(current)) {
				if (day(calendarDate(current, options.timeZone))) return true
			}
			return false
		},
	}
}
