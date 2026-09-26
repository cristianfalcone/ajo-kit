import type { Children, IntrinsicElements, Stateful, Stateless } from 'ajo'
import { controlled, dom, remember, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { calendarDate, compile, resolveLocale, type Availability, type AvailabilityMatcher, type CalendarMatcher } from './availability'
import { DirectionContext } from './direction'
import type { FixedArgs, OmitArg } from './utils'

export type { AvailabilityMatcher, CalendarMatcher, TimeWindow } from './availability'

/** Selection model supported by a Calendar root. */
export type CalendarMode =
	| 'multiple'
	| 'range'
	| 'single'

/** Calendar scale used for day navigation and whole-month/year picking. */
export type CalendarView =
	| 'day'
	| 'month'
	| 'year'

/** Inclusive date range selected by a range Calendar. */
export type CalendarDateRange = {
	from?: Date
	to?: Date
}

/** Built-in state flags resolved for one Calendar day. */
export type CalendarModifiers = {
	disabled: boolean
	outside: boolean
	range_end: boolean
	range_middle: boolean
	range_start: boolean
	selected: boolean
	today: boolean
	unavailable: boolean
}

/** Structural Calendar part names accepted by `classNames`. Day state is styled through `data-*` on the day button. */
export type CalendarClassName =
	| 'caption'
	| 'caption_label'
	| 'day'
	| 'day_button'
	| 'grid'
	| 'head'
	| 'month'
	| 'month_cell'
	| 'month_view'
	| 'months'
	| 'nav_button'
	| 'nav_icon'
	| 'nav_spacer'
	| 'week'
	| 'week_number'
	| 'weekday'
	| 'year_cell'
	| 'year_view'

/** Locale-aware formatting hooks used by Calendar views. */
export type CalendarFormatters = {
	fullDate: (date: Date, locale: string, timeZone?: string) => string
	monthCaption: (date: Date, locale: string, timeZone?: string) => string
	weekNumber: (week: number, locale: string) => Children
	weekday: (date: Date, locale: string, timeZone?: string) => Children
}

/** Arguments shared by every Calendar selection mode. */
export type CalendarCommonArgs = OmitArg<IntrinsicElements['div'], 'children' | 'defaultValue' | 'onSelect'> & {
	/** Allow range selection to span unavailable days without selecting or painting them. */
	allowNonContiguous?: boolean
	/** Class names for structural calendar parts. */
	classNames?: Partial<Record<CalendarClassName, string>>
	/** Initial visible month for uncontrolled usage. */
	defaultMonth?: Date
	/** Initial uncontrolled view. Defaults to `minView`. */
	defaultView?: CalendarView
	/** Disable dates by date, range, weekday, list, or predicate. */
	disabled?: CalendarMatcher | CalendarMatcher[]
	/** Last navigable month; bounds paging in every view. */
	endMonth?: Date
	/** Custom formatters for labels and visible date text. */
	formatters?: Partial<CalendarFormatters>
	/** BCP 47 tag; falls back to `<html lang>`, then 'en-US'. Never navigator. */
	locale?: string
	/** Controlled visible month. */
	month?: Date
	/** Lowest view that commits a value instead of drilling down. */
	minView?: CalendarView
	/** Extra date matchers exposed as `data-modifier-*` on day buttons. */
	modifiers?: Record<string, CalendarMatcher | CalendarMatcher[]>
	/** Number of visible months. */
	numberOfMonths?: number
	/** Called when the visible month changes. */
	onMonthChange?: (month: Date, event?: Event) => void
	/** Called when the calendar view changes. */
	onViewChange?: (view: CalendarView, event?: Event) => void
	/** Icon rendered in the next button. */
	nextIcon?: Children
	/** Accessible label for the next button; defaults to next month, year or 12 years by view. */
	nextMonthLabel?: string | ((view: CalendarView) => string)
	/** Accessible label for the previous button; defaults to previous month, year or 12 years by view. */
	previousMonthLabel?: string | ((view: CalendarView) => string)
	/** Icon rendered in the previous button. */
	previousIcon?: Children
	/** Render custom day content. */
	renderDay?: (date: Date, modifiers: CalendarModifiers) => Children
	/** Keep at least one selection. */
	required?: boolean
	/** Show ISO week numbers. */
	showWeekNumber?: boolean
	/** First navigable month; bounds paging in every view. */
	startMonth?: Date
	/** IANA time zone used to derive, format, and emit calendar dates. */
	timeZone?: string
	/** Dates that remain selectable but carry unavailable state. */
	unavailable?: AvailabilityMatcher | AvailabilityMatcher[]
	/** Controlled calendar view. Values below `minView` clamp to it. */
	view?: CalendarView
	/** First day of week. 0 is Sunday. */
	weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
	/** Additional classes for the calendar root. */
	class?: string
} & FixedArgs<'children' | 'defaultValue'>

/** Arguments for a Calendar that selects one date or period. */
export type CalendarSingleArgs = CalendarCommonArgs & {
	defaultSelected?: Date
	mode?: 'single'
	onSelect?: (date: Date | null, event: Event) => void
	selected?: Date | null
}

/** Arguments for a Calendar that selects multiple dates or periods. */
export type CalendarMultipleArgs = CalendarCommonArgs & {
	defaultSelected?: Date[]
	mode: 'multiple'
	onSelect?: (dates: Date[], event: Event) => void
	selected?: Date[]
}

/** Arguments for a Calendar that selects an inclusive range. */
export type CalendarRangeArgs = CalendarCommonArgs & {
	defaultSelected?: CalendarDateRange
	mode: 'range'
	onSelect?: (range: CalendarDateRange | null, event: Event) => void
	selected?: CalendarDateRange | null
}

/** Public discriminated arguments accepted by the Calendar root. */
export type CalendarArgs =
	| CalendarMultipleArgs
	| CalendarRangeArgs
	| CalendarSingleArgs

type PlainDate = {
	day: number
	month: number
	year: number
}

type MonthData = {
	month: PlainDate
	weeks: PlainDate[][]
}

const pad = (value: number) => String(value).padStart(2, '0')

const iso = ({ day, month, year }: PlainDate) =>
	`${year}-${pad(month)}-${pad(day)}`

const monthIso = ({ month, year }: PlainDate) =>
	`${year}-${pad(month)}`

const parseIso = (value: string): PlainDate | undefined => {
	const [year, month, day] = value.split('-').map(Number)
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined
	return normalize(year!, month!, day!)
}

const parseMonthIso = (value: string): PlainDate | undefined => {
	const [year, month] = value.split('-').map(Number)
	if (!Number.isFinite(year) || !Number.isFinite(month) || month! < 1 || month! > 12) return undefined
	return { day: 1, month: month!, year: year! }
}

const utcDate = (year: number, month: number, day: number) => {
	const date = new Date(0)
	date.setUTCFullYear(year, month - 1, day)
	date.setUTCHours(0, 0, 0, 0)
	return date
}

const normalize = (year: number, month: number, day: number): PlainDate => {
	const date = utcDate(year, month, day)
	return {
		day: date.getUTCDate(),
		month: date.getUTCMonth() + 1,
		year: date.getUTCFullYear(),
	}
}

const addDays = (date: PlainDate, days: number) =>
	normalize(date.year, date.month, date.day + days)

const addMonths = (date: PlainDate, monthCount: number) =>
	normalize(date.year, date.month + monthCount, Math.min(date.day, daysInMonth(normalize(date.year, date.month + monthCount, 1))))

const monthStart = (date: PlainDate) =>
	({ year: date.year, month: date.month, day: 1 })

const daysInMonth = (date: PlainDate) =>
	utcDate(date.year, date.month + 1, 0).getUTCDate()

const comparePlain = (first: PlainDate, second: PlainDate) =>
	iso(first).localeCompare(iso(second))

const samePlain = (first: PlainDate, second: PlainDate) =>
	first.year === second.year && first.month === second.month && first.day === second.day

type GridMove =
	| { cols: number }
	| { rows: number }
	| { edge: 'start' | 'end'; extent: 'row' | 'all' }
	| { page: number; large: boolean }

/** Grid keys: arrows move cells (columns flip in RTL), Home/End reach the row (Ctrl: all), pages move by period (Shift: large). */
const gridMove = (event: KeyboardEvent, rtl: boolean): GridMove | undefined => {
	if (event.key === 'ArrowLeft') return { cols: rtl ? 1 : -1 }
	if (event.key === 'ArrowRight') return { cols: rtl ? -1 : 1 }
	if (event.key === 'ArrowUp') return { rows: -1 }
	if (event.key === 'ArrowDown') return { rows: 1 }
	if (event.key === 'Home') return { edge: 'start', extent: event.ctrlKey ? 'all' : 'row' }
	if (event.key === 'End') return { edge: 'end', extent: event.ctrlKey ? 'all' : 'row' }
	if (event.key === 'PageUp') return { page: -1, large: event.shiftKey }
	if (event.key === 'PageDown') return { page: 1, large: event.shiftKey }
	return undefined
}

const viewRank: Record<CalendarView, number> = { day: 0, month: 1, year: 2 }

const minimumView = (view: CalendarView | undefined) => view ?? 'day'

const clampView = (view: CalendarView, minView: CalendarView | undefined) =>
	viewRank[view] < viewRank[minimumView(minView)] ? minimumView(minView) : view

const periodStart = (date: PlainDate, view: CalendarView): PlainDate => {
	if (view === 'year') return { day: 1, month: 1, year: date.year }
	if (view === 'month') return monthStart(date)
	return date
}

const periodEnd = (date: PlainDate, view: CalendarView): PlainDate => {
	if (view === 'year') return { day: 31, month: 12, year: date.year }
	if (view === 'month') {
		const start = monthStart(date)
		return { ...start, day: daysInMonth(start) }
	}
	return date
}

const samePeriod = (first: PlainDate, second: PlainDate, view: CalendarView) => {
	if (view === 'year') return first.year === second.year
	if (view === 'month') return first.year === second.year && first.month === second.month
	return samePlain(first, second)
}

const periodIntersects = (
	range: { from?: PlainDate; to?: PlainDate },
	date: PlainDate,
	view: CalendarView,
) => Boolean(range.from && range.to
	&& comparePlain(range.from, periodEnd(date, view)) <= 0
	&& comparePlain(periodStart(date, view), range.to) <= 0)

const weekday = (date: PlainDate) =>
	utcDate(date.year, date.month, date.day).getUTCDay()

const plainToDate = (date: PlainDate, timeZone?: string) =>
	calendarDate({ ...date, hour: 12, minute: 0, second: 0 }, timeZone)

const zonedDateFormatters = new Map<string, Intl.DateTimeFormat>()

const zonedDateFormatter = (timeZone: string) => {
	let format = zonedDateFormatters.get(timeZone)
	if (!format) {
		format = new Intl.DateTimeFormat('en-CA', {
			day: '2-digit',
			month: '2-digit',
			timeZone,
			year: 'numeric',
		})
		remember(zonedDateFormatters, timeZone, format)
	}
	return format
}

const dateToPlain = (date: Date, timeZone?: string): PlainDate => {
	if (timeZone) {
		const parts = zonedDateFormatter(timeZone).formatToParts(date)
		const value = (type: string) => Number(parts.find(part => part.type === type)?.value)
		return normalize(value('year'), value('month'), value('day'))
	}

	return normalize(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

const today = (timeZone?: string) =>
	dateToPlain(new Date(), timeZone)

const startOfWeek = (date: PlainDate, weekStartsOn: number) =>
	addDays(date, -((weekday(date) - weekStartsOn + 7) % 7))

const weeksForMonth = (month: PlainDate, weekStartsOn: number) => {
	const start = startOfWeek(month, weekStartsOn)
	const length = Math.ceil(((weekday(month) - weekStartsOn + 7) % 7 + daysInMonth(month)) / 7) * 7
	const weeks: PlainDate[][] = []

	for (let index = 0; index < length; index += 7) {
		weeks.push(Array.from({ length: 7 }, (_, day) => addDays(start, index + day)))
	}

	return weeks
}

const months = (start: PlainDate, count: number, weekStartsOn: number): MonthData[] =>
	Array.from({ length: Math.max(1, count) }, (_, index) => {
		const month = monthStart(addMonths(start, index))
		return { month, weeks: weeksForMonth(month, weekStartsOn) }
	})

const DATE_FORMAT_OPTIONS = {
	day: { day: 'numeric' },
	fullDate: { dateStyle: 'full' },
	monthCaption: { month: 'long', year: 'numeric' },
	monthLabel: { month: 'long' },
	weekday: { weekday: 'short' },
} satisfies Record<string, Intl.DateTimeFormatOptions>

type DateFormat = keyof typeof DATE_FORMAT_OPTIONS
const dateFormatters = new Map<string, Partial<Record<DateFormat, Intl.DateTimeFormat>>>()

const formatter = (
	locale: string,
	name: DateFormat,
	timeZone?: string,
) => {
	const key = `${locale}\0${timeZone ?? ''}`
	let formats = dateFormatters.get(key)
	if (!formats) {
		formats = {}
		remember(dateFormatters, key, formats)
	}
	return formats[name] ??= new Intl.DateTimeFormat(locale, { ...DATE_FORMAT_OPTIONS[name], timeZone })
}

const defaultFormatters: CalendarFormatters = {
	fullDate: (date, locale, timeZone) => formatter(locale, 'fullDate', timeZone).format(date),
	monthCaption: (date, locale, timeZone) => formatter(locale, 'monthCaption', timeZone).format(date),
	weekNumber: week => pad(week),
	weekday: (date, locale, timeZone) => formatter(locale, 'weekday', timeZone).format(date),
}

const toPlainArray = (dates: Date[] | undefined, timeZone?: string) =>
	(dates ?? []).map(date => dateToPlain(date, timeZone))

const toRangePlain = (range: CalendarDateRange | undefined, timeZone?: string) => ({
	from: range?.from ? dateToPlain(range.from, timeZone) : undefined,
	to: range?.to ? dateToPlain(range.to, timeZone) : undefined,
})

const plainIn = (date: PlainDate, dates: PlainDate[]) =>
	dates.some(item => samePlain(item, date))

const rangeContains = (range: { from?: PlainDate; to?: PlainDate }, date: PlainDate) =>
	Boolean(range.from && range.to && comparePlain(range.from, date) <= 0 && comparePlain(date, range.to) <= 0)

const rangeMiddle = (range: { from?: PlainDate; to?: PlainDate }, date: PlainDate) =>
	Boolean(range.from && range.to && comparePlain(range.from, date) < 0 && comparePlain(date, range.to) < 0)

const weekNumber = (date: PlainDate) => {
	const target = utcDate(date.year, date.month, date.day)
	const day = target.getUTCDay() || 7
	target.setUTCDate(target.getUTCDate() + 4 - day)
	const yearStart = utcDate(target.getUTCFullYear(), 1, 1)
	return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Day columns grow with the calendar width (a wide caption widens the month)
// while never dropping below the cell size.
const gridTemplate = (showWeekNumber: boolean) =>
	showWeekNumber
		? 'grid-template-columns:var(--cell-size) repeat(7,minmax(var(--cell-size),1fr))'
		: 'grid-template-columns:repeat(7,minmax(var(--cell-size),1fr))'

const monthOptions = (year: number) =>
	Array.from({ length: 12 }, (_, month) => ({ day: 1, month: month + 1, year }))

const bound = (month: Date | undefined, timeZone?: string) =>
	month && monthStart(dateToPlain(month, timeZone))

/** `startMonth` and `endMonth` are the one navigation bound of every view. */
const canNavigateTo = (month: PlainDate, args: CalendarArgs) => {
	const start = bound(args.startMonth, args.timeZone)
	const end = bound(args.endMonth, args.timeZone)
	if (start && comparePlain(monthStart(month), start) < 0) return false
	if (end && comparePlain(monthStart(month), end) > 0) return false
	return true
}

/** Twelve years around `year`: aligned to the first bound, or to multiples of 12 when unbounded. */
const yearPage = (year: number, args: CalendarArgs) => {
	const first = bound(args.startMonth, args.timeZone)?.year ?? 0
	const start = first + Math.floor((year - first) / 12) * 12
	return Array.from({ length: 12 }, (_, index) => start + index)
}

const modifierNames = (
	modifiers: Map<string, Availability>,
	date: Date,
) => Array.from(modifiers)
	.filter(([, availability]) => availability.day(date))
	.map(([name]) => name)

const modifierAttributes = (names: string[]) =>
	Object.fromEntries(names.map(name => [`data-modifier-${name}`, 'true']))

const defaultSelectedRange = (value: CalendarArgs['defaultSelected']) =>
	value && !Array.isArray(value) && !(value instanceof Date) ? value : undefined

const initialMonthDate = (
	month: Date | undefined,
	defaultMonth: Date | undefined,
	defaultSelected: CalendarArgs['defaultSelected'],
) => {
	if (month) return month
	if (defaultMonth) return defaultMonth
	if (defaultSelected instanceof Date) return defaultSelected
	if (Array.isArray(defaultSelected)) return defaultSelected[0] ?? new Date()
	return defaultSelectedRange(defaultSelected)?.from ?? new Date()
}

const CalendarRoot: Stateful<CalendarArgs> = function* ({
	defaultMonth,
	defaultSelected,
	defaultView,
	minView,
	month,
	timeZone,
	view,
}) {
	const initial = initialMonthDate(
		month as Date | undefined,
		defaultMonth as Date | undefined,
		defaultSelected as CalendarArgs['defaultSelected'],
	)

	const initialMonth = monthStart(dateToPlain(initial, timeZone))
	const initialView = clampView(view ?? defaultView ?? minimumView(minView), minView)
	const initialSingle = defaultSelected instanceof Date ? dateToPlain(defaultSelected, timeZone) : null
	const initialMultiple = Array.isArray(defaultSelected) ? toPlainArray(defaultSelected, timeZone) : []
	const initialRange = !Array.isArray(defaultSelected) && !(defaultSelected instanceof Date)
		? toRangePlain(defaultSelected as CalendarDateRange | undefined, timeZone)
		: {}
	let currentArgs = {} as CalendarArgs
	let currentView = initialView
	let renderedView = initialView
	// A view change the calendar made itself relocates focus even when the
	// clicked button never took it (Safari does not focus clicked buttons).
	let relocate = false
	let visible = initialMonth
	const domReady = dom(this)
	let disabledSource: CalendarCommonArgs['disabled']
	let disabledTimeZone: string | undefined
	let disabledAvailability: Availability | undefined
	let modifiersSource: CalendarCommonArgs['modifiers']
	let modifiersTimeZone: string | undefined
	let modifierAvailability = new Map<string, Availability>()
	let unavailableSource: CalendarCommonArgs['unavailable']
	let unavailableTimeZone: string | undefined
	let unavailableAvailability: Availability | undefined

	const syncAvailability = (args: CalendarArgs) => {
		if (args.disabled !== disabledSource || args.timeZone !== disabledTimeZone) {
			disabledSource = args.disabled
			disabledTimeZone = args.timeZone
			disabledAvailability = compile(args.disabled, { timeZone: args.timeZone })
		}
		if (args.modifiers !== modifiersSource || args.timeZone !== modifiersTimeZone) {
			modifiersSource = args.modifiers
			modifiersTimeZone = args.timeZone
			modifierAvailability = new Map(Object.entries(args.modifiers ?? {}).flatMap(([name, matcher]) => {
				const availability = compile(matcher, { timeZone: args.timeZone })
				return availability ? [[name, availability]] : []
			}))
		}
		if (args.unavailable !== unavailableSource || args.timeZone !== unavailableTimeZone) {
			unavailableSource = args.unavailable
			unavailableTimeZone = args.timeZone
			unavailableAvailability = compile(args.unavailable, { timeZone: args.timeZone })
		}
	}

	const monthState = controlled<PlainDate>(this, {
		fallback: initialMonth,
		onChange: (next, event) => currentArgs.onMonthChange?.(plainToDate(next, currentArgs.timeZone), event),
	})
	const viewState = controlled<CalendarView>(this, {
		fallback: initialView,
		onChange: (next, event) => currentArgs.onViewChange?.(next, event),
	})
	// Empty emissions: single and range emit null, multiple emits [] (never null).
	const singleState = controlled<PlainDate | null>(this, {
		fallback: initialSingle,
		onChange: (next, event) => {
			if (currentArgs.mode === 'multiple' || currentArgs.mode === 'range' || !event) return
			currentArgs.onSelect?.(next && plainToDate(next, currentArgs.timeZone), event)
		},
	})
	const multipleState = controlled<PlainDate[]>(this, {
		fallback: initialMultiple,
		onChange: (next, event) => {
			if (currentArgs.mode !== 'multiple' || !event) return
			currentArgs.onSelect?.(next.map(item => plainToDate(item, currentArgs.timeZone)), event)
		},
	})
	const rangeState = controlled<{ from?: PlainDate; to?: PlainDate }>(this, {
		fallback: initialRange,
		onChange: (next, event) => {
			if (currentArgs.mode !== 'range' || !event) return
			currentArgs.onSelect?.(next.from || next.to
				? {
					from: next.from ? plainToDate(next.from, currentArgs.timeZone) : undefined,
					to: next.to ? plainToDate(next.to, currentArgs.timeZone) : undefined,
				}
				: null, event)
		},
	})

	const focusDay = (date: PlainDate, args: CalendarArgs) => {
		queueMicrotask(() => {
			const find = () =>
				this.querySelector<HTMLButtonElement>(`button[data-day="${iso(date)}"]:not(:disabled)`)
			const target = find()

			if (target) {
				target.focus()
				return
			}

			const visible = args.month ? monthStart(dateToPlain(args.month, args.timeZone)) : monthState.value
			const count = Math.max(1, args.numberOfMonths ?? 1)
			const start = monthStart(date)

			if (comparePlain(start, visible) < 0) moveMonth(addMonths(visible, -1), args)
			else if (comparePlain(start, addMonths(visible, count - 1)) > 0) moveMonth(addMonths(visible, 1), args)
			else return

			queueMicrotask(() => find()?.focus())
		})
	}

	const focusMonthCell = (month: PlainDate, args: CalendarArgs, event?: Event) => {
		const target = monthStart(month)
		queueMicrotask(() => {
			const find = () => this.querySelector<HTMLButtonElement>(`button[data-month="${monthIso(target)}"]:not(:disabled)`)
			const found = find()
			if (found) {
				found.focus()
				return
			}
			if (!canNavigateTo(target, args)) return
			moveMonth(target, args, event)
			queueMicrotask(() => find()?.focus())
		})
	}

	const navigableMonth = (year: number, args: CalendarArgs) => {
		const options = monthOptions(year)
		return options.find(month => month.month === visible.month && canNavigateTo(month, args))
			?? options.find(month => canNavigateTo(month, args))
	}

	const canCommitYear = (year: number, args: CalendarArgs) =>
		canNavigateTo({ day: 1, month: 1, year }, args)
		&& canNavigateTo({ day: 1, month: 12, year }, args)

	const canUseYearCell = (year: number, args: CalendarArgs) =>
		minimumView(args.minView) === 'year'
			? canCommitYear(year, args)
			: Boolean(navigableMonth(year, args))

	const focusYearCell = (year: number, args: CalendarArgs, event?: Event) => {
		queueMicrotask(() => {
			const find = () => this.querySelector<HTMLButtonElement>(`button[data-year="${year}"]:not(:disabled)`)
			const found = find()
			if (found) {
				found.focus()
				return
			}
			if (!canUseYearCell(year, args)) return
			const month = navigableMonth(year, args)
			if (!month) return
			moveMonth(month, args, event)
			queueMicrotask(() => find()?.focus())
		})
	}

	const moveMonth = (next: PlainDate, args: CalendarArgs, event?: Event) => {
		const target = monthStart(next)
		if (!canNavigateTo(target, args)) return
		monthState.set(target, event)
	}

	const selectPeriod = (date: PlainDate, view: CalendarView, args: CalendarArgs, event: Event) => {
		const start = periodStart(date, view)
		const end = periodEnd(date, view)
		if (args.mode === 'multiple') {
			const current = multipleState.value
			const exists = current.some(item => samePeriod(item, start, view))
			const next = exists ? current.filter(item => !samePeriod(item, start, view)) : [...current, start]
			if (args.required && !next.length) return
			multipleState.set(next, event)
			return
		}

		if (args.mode === 'range') {
			const current = rangeState.value
			let next: { from?: PlainDate; to?: PlainDate }

			if (!current.from || current.to) next = { from: start }
			else if (comparePlain(start, periodStart(current.from, view)) < 0) next = { from: start, to: periodEnd(current.from, view) }
			else if (samePeriod(start, current.from, view) && !args.required) next = {}
			else next = { from: periodStart(current.from, view), to: end }

			rangeState.set(next, event)
			return
		}

		const current = singleState.value
		const next = current && samePeriod(current, start, view) && !args.required ? null : start
		singleState.set(next, event)
	}

	const selectDay = (date: PlainDate, args: CalendarArgs, event: Event) => {
		if (disabledAvailability?.day(plainToDate(date, args.timeZone))) return
		selectPeriod(date, 'day', args, event)
	}

	const changeView = (next: CalendarView, args: CalendarArgs, event?: Event) => {
		const target = clampView(next, args.minView)
		if (target === currentView) return
		relocate = true
		viewState.set(target, event)
	}

	const drillUp = (anchor: PlainDate, args: CalendarArgs, event: Event) => {
		if (currentView === 'day' && !samePeriod(anchor, visible, 'month')) moveMonth(anchor, args, event)
		changeView(currentView === 'day' ? 'month' : 'year', args, event)
	}

	const selectMonthCell = (month: PlainDate, args: CalendarArgs, event: Event) => {
		if (minimumView(args.minView) === 'month') {
			selectPeriod(month, 'month', args, event)
			return
		}
		moveMonth(month, args, event)
		changeView('day', args, event)
	}

	const selectYearCell = (year: number, args: CalendarArgs, event: Event) => {
		if (!canUseYearCell(year, args)) return
		const month = navigableMonth(year, args)
		if (!month) return
		if (minimumView(args.minView) === 'year') {
			selectPeriod(month, 'year', args, event)
			return
		}
		moveMonth(month, args, event)
		changeView('month', args, event)
	}

	const onMove = (move: GridMove, event: KeyboardEvent) => {
		const button = event.target instanceof Element
			? event.target.closest<HTMLButtonElement>('button[data-day],button[data-month],button[data-year]')
			: null
		const args = currentArgs
		const month = button?.dataset.month ? parseMonthIso(button.dataset.month) : undefined
		const year = button?.dataset.year ? Number(button.dataset.year) : undefined

		if (month) {
			if ('cols' in move) focusMonthCell(addMonths(month, move.cols), args, event)
			else if ('rows' in move) focusMonthCell(addMonths(month, move.rows * 3), args, event)
			else if ('page' in move) focusMonthCell(addMonths(month, move.page * 12), args, event)
			else {
				const rowStart = Math.floor((month.month - 1) / 3) * 3 + 1
				const candidates = monthOptions(month.year).filter(candidate =>
					canNavigateTo(candidate, args)
					&& (move.extent === 'all' || (rowStart <= candidate.month && candidate.month <= rowStart + 2)))
				const target = move.edge === 'start' ? candidates[0] : candidates[candidates.length - 1]
				if (target) focusMonthCell(target, args, event)
			}
			return
		}

		if (year != null && Number.isFinite(year)) {
			if ('cols' in move) focusYearCell(year + move.cols, args, event)
			else if ('rows' in move) focusYearCell(year + move.rows * 3, args, event)
			else if ('page' in move) focusYearCell(year + move.page * 12, args, event)
			else {
				const page = yearPage(visible.year, args)
				const rowStart = page[0]! + Math.floor((year - page[0]!) / 3) * 3
				const candidates = page.filter(candidate =>
					canUseYearCell(candidate, args)
					&& (move.extent === 'all' || (rowStart <= candidate && candidate <= rowStart + 2)))
				const target = move.edge === 'start' ? candidates[0] : candidates[candidates.length - 1]
				if (target != null) focusYearCell(target, args, event)
			}
			return
		}

		const day = button?.dataset.day ? parseIso(button.dataset.day) : undefined
		if (!day) return

		if ('cols' in move) {
			focusDay(addDays(day, move.cols), args)
			return
		}

		if ('rows' in move) {
			focusDay(addDays(day, move.rows * 7), args)
			return
		}

		if ('page' in move) {
			const count = move.page * (move.large ? 12 : 1)
			const target = addMonths(day, count)
			if (!canNavigateTo(monthStart(target), args)) return

			moveMonth(addMonths(visible, count), args, event)
			focusDay(target, args)
			return
		}

		if (move.extent === 'row') {
			const start = startOfWeek(day, args.weekStartsOn ?? 0)
			focusDay(move.edge === 'start' ? start : addDays(start, 6), args)
			return
		}

		const start = monthStart(day)
		focusDay(move.edge === 'start' ? start : { ...start, day: daysInMonth(start) }, args)
	}

	const onCellKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape' || viewRank[currentView] <= viewRank[minimumView(currentArgs.minView)]) {
			const move = gridMove(event, currentArgs.dir === 'rtl')
			if (!move) return
			event.preventDefault()
			onMove(move, event)
			return
		}
		event.preventDefault()
		changeView(currentView === 'year' ? 'month' : 'day', currentArgs, event)
	}

	for (const args of this) {
		currentArgs = args
		syncAvailability(args)
		monthState.sync(args.month ? monthStart(dateToPlain(args.month, args.timeZone)) : undefined)
		viewState.sync(args.view === undefined ? undefined : clampView(args.view, args.minView))
		const clampedView = clampView(viewState.value, args.minView)
		if (clampedView !== viewState.value) viewState.init(clampedView)
		// selected !== undefined binds; null (single, range) and [] (multiple) are controlled-empty.
		singleState.sync(args.mode === 'multiple' || args.mode === 'range' || args.selected === undefined
			? undefined
			: args.selected && dateToPlain(args.selected, args.timeZone))
		multipleState.sync(args.mode === 'multiple' && args.selected !== undefined
			? toPlainArray(args.selected, args.timeZone)
			: undefined)
		rangeState.sync(args.mode === 'range' && args.selected !== undefined
			? toRangePlain(args.selected ?? undefined, args.timeZone)
			: undefined)

		const now = today(args.timeZone)
		visible = monthState.value
		currentView = clampedView
		if (renderedView !== currentView && domReady && (relocate || this.contains(document.activeElement))) {
			if (currentView === 'day') focusDay(visible, args)
			else if (currentView === 'month') focusMonthCell(visible, args)
			else focusYearCell(visible.year, args)
		}
		relocate = false
		renderedView = currentView
		const weekStartsOn = args.weekStartsOn ?? 0
		const count = Math.max(1, args.numberOfMonths ?? 1)
		const locale = resolveLocale(args.locale)
		const formats = { ...defaultFormatters, ...(args.formatters ?? {}) }
		const shown = months(visible, count, weekStartsOn)
		const single = singleState.value
		const multiple = multipleState.value
		const range = rangeState.value
		const band = args.mode === 'range' && Boolean(range.from && range.to)
		const dayColumns = gridTemplate(Boolean(args.showWeekNumber))
		const page = yearPage(visible.year, args)
		const pageLabel = `${page[0]}–${page[11]}`
		const periodFlags = (date: PlainDate, view: CalendarView) => {
			const range_start = args.mode === 'range' && Boolean(range.from && samePeriod(range.from, date, view))
			const range_end = args.mode === 'range' && Boolean(range.to && samePeriod(range.to, date, view))
			const range_middle = args.mode === 'range' && periodIntersects(range, date, view) && !range_start && !range_end
			const selected = args.mode === 'multiple'
				? multiple.some(item => samePeriod(item, date, view))
				: args.mode === 'range'
					? range_start || range_end || range_middle
					: Boolean(single && samePeriod(single, date, view))
			return { range_end, range_middle, range_start, selected }
		}
		// Month and year pages are navigable while the neighbouring year holds a navigable month.
		const canPreviousView = currentView === 'day'
			? canNavigateTo(addMonths(visible, -1), args)
			: canNavigateTo({ day: 1, month: 12, year: (currentView === 'month' ? visible.year : page[0]!) - 1 }, args)
		const canNextView = currentView === 'day'
			? canNavigateTo(addMonths(visible, count), args)
			: canNavigateTo({ day: 1, month: 1, year: (currentView === 'month' ? visible.year : page[11]!) + 1 }, args)
		const navigateView = (direction: -1 | 1, event: Event) => {
			if (currentView === 'day') {
				moveMonth(addMonths(visible, direction < 0 ? -1 : count), args, event)
				return
			}
			// A partial edge page pages to its nearest navigable year.
			const target = visible.year + direction * (currentView === 'month' ? 1 : 12)
			const year = Math.min(bound(args.endMonth, args.timeZone)?.year ?? target, Math.max(bound(args.startMonth, args.timeZone)?.year ?? target, target))
			const month = navigableMonth(year, args)
			if (month) moveMonth(month, args, event)
		}
		const navButton = (direction: -1 | 1) => {
			const previous = direction < 0
			const enabled = previous ? canPreviousView : canNextView
			const slot = previous ? 'previous' : 'next'
			const label = previous ? args.previousMonthLabel : args.nextMonthLabel
			return (
				<button
					aria-disabled={enabled ? undefined : 'true'}
					aria-label={typeof label === 'function'
						? label(currentView)
						: label ?? `${previous ? 'Previous' : 'Next'} ${currentView === 'day' ? 'month' : currentView === 'month' ? 'year' : '12 years'}`}
					class={args.classNames?.nav_button}
					data-slot={`calendar-${slot}`}
					disabled={!enabled}
					type="button"
					set:onclick={(event: Event) => navigateView(direction, event)}
				>
					{(previous ? args.previousIcon : args.nextIcon) ?? (
						<span aria-hidden="true" class={args.classNames?.nav_icon} data-slot={`calendar-${slot}-icon`} />
					)}
				</button>
			)
		}
		const spacer = () => <span aria-hidden="true" class={args.classNames?.nav_spacer} data-slot="calendar-nav-spacer" />

		yield (
			<>
				<div class={args.classNames?.months} data-slot="calendar-months">
					{currentView === 'day' ? shown.map(({ month: item, weeks }, monthIndex) => {
						const caption = formats.monthCaption(plainToDate(item, args.timeZone), locale, args.timeZone)

						// Keyed by position so paging keeps the caption and its focused buttons.
						return (
							<div key={monthIndex} class={args.classNames?.month} data-month={iso(item)} data-slot="calendar-month">
								<div class={args.classNames?.caption} data-slot="calendar-caption">
									{monthIndex === 0 ? navButton(-1) : spacer()}
									<button
										class={args.classNames?.caption_label}
										data-slot="calendar-view-trigger"
										type="button"
										set:onclick={(event: Event) => drillUp(item, args, event)}
									>
										{caption}
									</button>
									{monthIndex === shown.length - 1 ? navButton(1) : spacer()}
								</div>
								<div class={args.classNames?.grid} data-slot="calendar-grid" role="grid" aria-label={caption}>
									<div class={args.classNames?.head} data-slot="calendar-weekdays" role="row" style={dayColumns}>
										{args.showWeekNumber && <div aria-hidden="true" class={args.classNames?.week_number} data-slot="calendar-week-number-header" />}
										{Array.from({ length: 7 }, (_, index) => addDays({ year: 2026, month: 7, day: 5 }, weekStartsOn + index)).map((day, index) => (
											<div key={index} class={args.classNames?.weekday} data-slot="calendar-weekday" role="columnheader">
												{formats.weekday(plainToDate(day, args.timeZone), locale, args.timeZone)}
											</div>
										))}
									</div>
									{weeks.map((week, row) => (
										<div key={row} class={args.classNames?.week} data-slot="calendar-week" role="row" style={dayColumns}>
											{args.showWeekNumber && (
												<div class={args.classNames?.week_number} data-slot="calendar-week-number" role="rowheader">
													{formats.weekNumber(weekNumber(week[0]!), locale)}
												</div>
											)}
											{week.map(day => {
												const value = iso(day)
												const outside = day.month !== item.month || day.year !== item.year
												const date = plainToDate(day, args.timeZone)
												const disabled = Boolean(disabledAvailability?.day(date))
												const unavailable = Boolean(unavailableAvailability?.day(date))
												const range_start = !outside && args.mode === 'range' && Boolean(range.from && samePlain(range.from, day))
												const range_end = !outside && args.mode === 'range' && Boolean(range.to && samePlain(range.to, day))
												const rawRangeMiddle = !outside && args.mode === 'range' && rangeMiddle(range, day)
												const rangeGap = rawRangeMiddle && unavailable && Boolean(args.allowNonContiguous)
												const selected = !rangeGap && !outside && (args.mode === 'multiple'
													? plainIn(day, multiple)
													: args.mode === 'range'
														? Boolean((range.from && samePlain(range.from, day)) || (range.to && samePlain(range.to, day)) || rangeContains(range, day))
														: Boolean(single && samePlain(single, day)))
												const range_middle = rawRangeMiddle && !rangeGap
												const modifiers: CalendarModifiers = {
													disabled,
													outside,
													range_end,
													range_middle,
													range_start,
													selected,
													today: samePlain(day, now),
													unavailable,
												}
												const ranged = range_start || range_middle || range_end

												return (
													<div key={value} class={args.classNames?.day} data-slot="calendar-day" role="gridcell">
														<button
															{...modifierAttributes(modifierNames(modifierAvailability, date))}
															aria-disabled={unavailable ? 'true' : undefined}
															aria-label={formats.fullDate(date, locale, args.timeZone)}
															class={args.classNames?.day_button}
															data-day={value}
															data-disabled={disabled ? 'true' : undefined}
															data-outside={outside ? 'true' : undefined}
															data-range-band={band && ranged ? 'true' : undefined}
															data-range-end={range_end ? 'true' : undefined}
															data-range-middle={range_middle ? 'true' : undefined}
															data-range-start={range_start ? 'true' : undefined}
															data-selected-single={selected && !ranged ? 'true' : undefined}
															data-slot="calendar-day-button"
															data-state={selected ? 'selected' : 'unselected'}
															data-today={modifiers.today ? 'true' : undefined}
															data-unavailable={unavailable ? 'true' : undefined}
															disabled={disabled || outside}
															type="button"
															set:onclick={(event: Event) => selectDay(day, args, event)}
															set:onkeydown={onCellKeydown}
														>
															{args.renderDay?.(date, modifiers) ?? formatter(locale, 'day', args.timeZone).format(date)}
														</button>
													</div>
												)
											})}
										</div>
									))}
								</div>
							</div>
						)
					}) : (
						// Keyed by view so paging keeps the caption and its focused buttons.
						<div key={currentView} class={args.classNames?.month}>
							<div class={args.classNames?.caption} data-slot="calendar-caption">
								{navButton(-1)}
								<button
									aria-disabled={currentView === 'year' ? 'true' : undefined}
									class={args.classNames?.caption_label}
									data-slot="calendar-view-trigger"
									disabled={currentView === 'year'}
									type="button"
									set:onclick={(event: Event) => drillUp(visible, args, event)}
								>
									{currentView === 'month' ? visible.year : pageLabel}
								</button>
								{navButton(1)}
							</div>
							{currentView === 'month' ? (
								<div
									aria-label={String(visible.year)}
									class={args.classNames?.month_view}
									data-slot="calendar-month-view"
									role="grid"
									style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr))"
								>
									{monthOptions(visible.year).map(month => {
										const disabled = !canNavigateTo(month, args)
										const flags = periodFlags(month, 'month')
										const current = samePeriod(month, now, 'month')
										const value = monthIso(month)
										return (
											<div key={value} role="gridcell">
												<button
													aria-disabled={disabled ? 'true' : undefined}
													aria-label={formats.monthCaption(plainToDate(month, args.timeZone), locale, args.timeZone)}
													class={args.classNames?.month_cell}
													data-disabled={disabled ? 'true' : undefined}
													data-month={value}
													data-range-end={flags.range_end ? 'true' : undefined}
													data-range-middle={flags.range_middle ? 'true' : undefined}
													data-range-start={flags.range_start ? 'true' : undefined}
													data-selected={flags.selected ? 'true' : undefined}
													data-slot="calendar-month-cell"
													data-today={current ? 'true' : undefined}
													disabled={disabled}
													type="button"
													set:onclick={(event: Event) => selectMonthCell(month, args, event)}
													set:onkeydown={onCellKeydown}
												>
													{formatter(locale, 'monthLabel', args.timeZone).format(plainToDate(month, args.timeZone))}
												</button>
											</div>
										)
									})}
								</div>
							) : (
								<div
									aria-label={pageLabel}
									class={args.classNames?.year_view}
									data-slot="calendar-year-view"
									role="grid"
									style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr))"
								>
									{page.map(year => {
										const disabled = !canUseYearCell(year, args)
										const flags = periodFlags({ day: 1, month: 1, year }, 'year')
										return (
											<div key={year} role="gridcell">
												<button
													aria-disabled={disabled ? 'true' : undefined}
													class={args.classNames?.year_cell}
													data-disabled={disabled ? 'true' : undefined}
													data-range-end={flags.range_end ? 'true' : undefined}
													data-range-middle={flags.range_middle ? 'true' : undefined}
													data-range-start={flags.range_start ? 'true' : undefined}
													data-selected={flags.selected ? 'true' : undefined}
													data-slot="calendar-year-cell"
													data-today={year === now.year ? 'true' : undefined}
													data-year={String(year)}
													disabled={disabled}
													type="button"
													set:onclick={(event: Event) => selectYearCell(year, args, event)}
													set:onkeydown={onCellKeydown}
												>
													{year}
												</button>
											</div>
										)
									})}
								</div>
							)}
						</div>
					)}
				</div>
			</>
		)
	}
}

/** Unstyled calendar with single, multiple, and range selection. */
const Calendar: Stateless<CalendarArgs> = ({
	allowNonContiguous,
	class: classes,
	classNames,
	defaultMonth,
	defaultSelected,
	defaultView,
	disabled,
	endMonth,
	formatters,
	locale,
	minView,
	month,
	nextMonthLabel,
	previousMonthLabel,
	modifiers,
	nextIcon,
	numberOfMonths,
	onMonthChange,
	onViewChange,
	previousIcon,
	renderDay,
	required,
	showWeekNumber,
	startMonth,
	timeZone,
	unavailable,
	view,
	weekStartsOn,
	...attrs
}) => {
	const {
		dir,
		mode,
		onSelect,
		selected,
		...rest
	} = attrs as CalendarArgs & Record<string, unknown>
	const resolvedDir = (dir as 'ltr' | 'rtl' | undefined) ?? DirectionContext()
	const rootArgs = {
		allowNonContiguous,
		classNames,
		defaultMonth,
		defaultSelected,
		defaultView,
		disabled,
		dir: resolvedDir,
		endMonth,
		formatters,
		locale,
		minView,
		mode,
		month,
		nextMonthLabel,
		previousMonthLabel,
		modifiers,
		nextIcon,
		numberOfMonths,
		onMonthChange,
		onSelect,
		onViewChange,
		previousIcon,
		renderDay,
		required,
		selected,
		showWeekNumber,
		startMonth,
		timeZone,
		unavailable,
		view,
		weekStartsOn,
	} as CalendarArgs

	return (
		<CalendarRoot
			{...rootArgs}
			{...rootAttrs(rest)}
			attr:class={classes}
			attr:data-slot="calendar"
			attr:dir={resolvedDir}
		/>
	)
}

export { Calendar }
