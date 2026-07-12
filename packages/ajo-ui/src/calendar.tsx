import type { Children, IntrinsicElements, Stateful, Stateless } from 'ajo'
import { controlled, dom, grid, remember, statefulRootAttrs as rootAttrs, type GridMove } from 'ajo-cloves'
import { calendarDate, compile, type Availability, type AvailabilityMatcher, type CalendarMatcher } from './availability'
import { useDirection } from './direction'
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

/** Available navigation controls for a Calendar caption. */
export type CalendarCaptionLayout =
	| 'button'
	| 'dropdown'
	| 'dropdown-months'
	| 'dropdown-years'
	| 'label'

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

/** Structural Calendar part names accepted by `classNames`. */
export type CalendarClassName =
	| 'caption'
	| 'day'
	| 'day_button'
	| 'dropdowns'
	| 'grid'
	| 'head'
	| 'month'
	| 'month_cell'
	| 'month_view'
	| 'months'
	| 'outside'
	| 'range_end'
	| 'range_middle'
	| 'range_start'
	| 'selected'
	| 'today'
	| 'week'
	| 'week_number'
	| 'weekday'
	| 'year_cell'
	| 'year_view'

/** Locale-aware formatting hooks used by Calendar views. */
export type CalendarFormatters = {
	day: (date: Date, locale: string | undefined, timeZone?: string) => Children
	fullDate: (date: Date, locale: string | undefined, timeZone?: string) => string
	monthCaption: (date: Date, locale: string | undefined, timeZone?: string) => string
	monthDropdown: (date: Date, locale: string | undefined, timeZone?: string) => string
	weekNumber: (week: number, locale: string | undefined) => Children
	weekday: (date: Date, locale: string | undefined, timeZone?: string) => Children
}

/** One value and label rendered by a Calendar caption dropdown. */
export type CalendarDropdownOption = {
	label: Children
	value: string
}

/** Arguments supplied to a custom Calendar caption dropdown. */
export type CalendarDropdownArgs = {
	label: string
	onValueChange: (value: string, event?: Event) => void
	options: CalendarDropdownOption[]
	value: string
}

/** Date and resolved state supplied to day styling callbacks. */
export type CalendarDayState = {
	date: Date
	hidden: boolean
	modifierNames: string[]
	modifiers: CalendarModifiers
	range: boolean
}

/** Arguments shared by every Calendar selection mode. */
export type CalendarCommonArgs = OmitArg<IntrinsicElements['div'], 'children' | 'defaultValue' | 'onSelect'> & {
	/** Allow range selection to span unavailable days without selecting or painting them. */
	allowNonContiguous?: boolean
	/** Caption layout. `dropdown` shows month and year selectors. */
	captionLayout?: CalendarCaptionLayout
	/** Class names for structural calendar parts. */
	classNames?: Partial<Record<CalendarClassName, string>>
	/** Class for the visible caption label. */
	captionLabelClass?: string
	/** Initial visible month for uncontrolled usage. */
	defaultMonth?: Date
	/** Initial uncontrolled view. Defaults to `minView`. */
	defaultView?: CalendarView
	/** Disable dates by date, range, weekday, list, or predicate. */
	disabled?: CalendarMatcher | CalendarMatcher[]
	/** Last navigable month. */
	endMonth?: Date
	/** Custom formatters for labels and visible date text. */
	formatters?: Partial<CalendarFormatters>
	/** Always render six weeks per month. */
	fixedWeeks?: boolean
	/** First navigable year. */
	fromYear?: number
	/** Class for hidden outside-day placeholders. */
	hiddenDayClass?: string
	/** Locale code or DayPicker-like locale object with `code`. */
	locale?: string | { code?: string }
	/** Controlled visible month. */
	month?: Date
	/** Lowest view that commits a value instead of drilling down. */
	minView?: CalendarView
	/** Month dropdown component. */
	monthDropdown?: Stateless<CalendarDropdownArgs>
	/** Class for the month label when month dropdown is hidden. */
	monthLabelClass?: string
	/** Extra date matchers exposed as `data-modifier-*` on day cells. */
	modifiers?: Record<string, CalendarMatcher | CalendarMatcher[]>
	/** Class for previous and next buttons. */
	navButtonClass?: string
	/** Class for caption spacers standing in for the nav buttons on middle months. */
	navSpacerClass?: string
	/** Number of visible months. */
	numberOfMonths?: number
	/** Called when the visible month changes. */
	onMonthChange?: (month: Date, event?: Event) => void
	/** Called when the calendar view changes. */
	onViewChange?: (view: CalendarView, event?: Event) => void
	/** Icon rendered in the next-month button. */
	nextIcon?: Children
	/** Icon class for the next-month button icon span. */
	nextIconClass?: string
	/** Accessible label for the next-month button. */
	nextMonthLabel?: string
	/** Accessible label for the previous-month button. */
	previousMonthLabel?: string
	/** Accessible label for the month dropdown. */
	monthSelectLabel?: string
	/** Accessible label for the year dropdown. */
	yearSelectLabel?: string
	/** Icon rendered in the previous-month button. */
	previousIcon?: Children
	/** Icon class for the previous-month button icon span. */
	previousIconClass?: string
	/** Render custom day content. */
	renderDay?: (date: Date, modifiers: CalendarModifiers) => Children
	/** Keep at least one selection. */
	required?: boolean
	/** Returns the class for a day grid cell from its state. */
	dayClassName?: (state: CalendarDayState) => string | undefined
	/** Class for each day button. */
	dayButtonClass?: string
	/** Show days from adjacent months. */
	showOutsideDays?: boolean
	/** Show ISO week numbers. */
	showWeekNumber?: boolean
	/** First navigable month. */
	startMonth?: Date
	/** IANA time zone used to derive, format, and emit calendar dates. */
	timeZone?: string
	/** Dates that remain selectable but carry unavailable state. */
	unavailable?: AvailabilityMatcher | AvailabilityMatcher[]
	/** Controlled calendar view. Values below `minView` clamp to it. */
	view?: CalendarView
	/** Last navigable year. */
	toYear?: number
	/** First day of week. 0 is Sunday. */
	weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
	/** Year dropdown component. */
	yearDropdown?: Stateless<CalendarDropdownArgs>
	/** Class for the year label when year dropdown is hidden. */
	yearLabelClass?: string
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

/** Arguments supplied to the Calendar day-button renderer. */
export type CalendarDayButtonArgs = OmitArg<IntrinsicElements['button'], 'children'> & {
	date: Date
	day: Children
	modifiers: CalendarModifiers
	/** IANA time zone used to derive the button's `data-day`. */
	timeZone?: string
	/** Additional classes. */
	class?: string
} & FixedArgs<'children'>

type PlainDate = {
	day: number
	month: number
	year: number
}

type MonthData = {
	month: PlainDate
	weeks: PlainDate[][]
}

const localeCode = (locale: CalendarCommonArgs['locale']) =>
	typeof locale === 'string' ? locale : locale?.code

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

const startOfGrid = (month: PlainDate, weekStartsOn: number) => {
	return startOfWeek(month, weekStartsOn)
}

const weeksForMonth = (
	month: PlainDate,
	fixedWeeks: boolean,
	weekStartsOn: number,
) => {
	const start = startOfGrid(month, weekStartsOn)
	const length = fixedWeeks ? 42 : Math.ceil(((weekday(month) - weekStartsOn + 7) % 7 + daysInMonth(month)) / 7) * 7
	const weeks: PlainDate[][] = []

	for (let index = 0; index < length; index += 7) {
		weeks.push(Array.from({ length: 7 }, (_, day) => addDays(start, index + day)))
	}

	return weeks
}

const months = (start: PlainDate, count: number, fixedWeeks: boolean, weekStartsOn: number): MonthData[] =>
	Array.from({ length: Math.max(1, count) }, (_, index) => {
		const month = monthStart(addMonths(start, index))
		return { month, weeks: weeksForMonth(month, fixedWeeks, weekStartsOn) }
	})

const DATE_FORMAT_OPTIONS = {
	day: { day: 'numeric' },
	fullDate: { dateStyle: 'full' },
	monthCaption: { month: 'long', year: 'numeric' },
	monthDropdown: { month: 'short' },
	monthLabel: { month: 'long' },
	weekday: { weekday: 'short' },
} satisfies Record<string, Intl.DateTimeFormatOptions>

type DateFormat = keyof typeof DATE_FORMAT_OPTIONS
const dateFormatters = new Map<string, Partial<Record<DateFormat, Intl.DateTimeFormat>>>()

const formatter = (
	locale: string | undefined,
	name: DateFormat,
	timeZone?: string,
) => {
	const key = `${locale ?? ''}\0${timeZone ?? ''}`
	let formats = dateFormatters.get(key)
	if (!formats) {
		formats = {}
		remember(dateFormatters, key, formats)
	}
	return formats[name] ??= new Intl.DateTimeFormat(locale, { ...DATE_FORMAT_OPTIONS[name], timeZone })
}

const defaultFormatters: CalendarFormatters = {
	day: (date, locale, timeZone) => formatter(locale, 'day', timeZone).format(date),
	fullDate: (date, locale, timeZone) => formatter(locale, 'fullDate', timeZone).format(date),
	monthCaption: (date, locale, timeZone) => formatter(locale, 'monthCaption', timeZone).format(date),
	monthDropdown: (date, locale, timeZone) => formatter(locale, 'monthDropdown', timeZone).format(date),
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

const yearBounds = (current: PlainDate, args: CalendarArgs, now: PlainDate) => {
	const first = args.startMonth ? dateToPlain(args.startMonth, args.timeZone).year : args.fromYear ?? now.year - 100
	const last = args.endMonth ? dateToPlain(args.endMonth, args.timeZone).year : args.toYear ?? Math.max(now.year, current.year)
	return { first, last: Math.max(first, last) }
}

const yearRange = (current: PlainDate, args: CalendarArgs, now: PlainDate) => {
	const { first, last } = yearBounds(current, args, now)
	return Array.from({ length: last - first + 1 }, (_, index) => first + index)
}

const yearPage = (current: PlainDate, args: CalendarArgs, now: PlainDate) => {
	const allowed = yearRange(current, args, now)
	const first = allowed[0]!
	const last = allowed[allowed.length - 1]!
	const anchor = Math.min(last, Math.max(first, current.year))
	const start = first + Math.floor((anchor - first) / 12) * 12
	return {
		allowed,
		start,
		years: Array.from({ length: 12 }, (_, index) => start + index),
	}
}

const canNavigateYear = (year: number, current: PlainDate, args: CalendarArgs, now: PlainDate) => {
	const { first, last } = yearBounds(current, args, now)
	return first <= year && year <= last
}

const canNavigateTo = (month: PlainDate, args: CalendarArgs) => {
	const start = args.startMonth ? monthStart(dateToPlain(args.startMonth, args.timeZone)) : args.fromYear ? { day: 1, month: 1, year: args.fromYear } : undefined
	const end = args.endMonth ? monthStart(dateToPlain(args.endMonth, args.timeZone)) : args.toYear ? { day: 1, month: 12, year: args.toYear } : undefined
	if (start && comparePlain(monthStart(month), start) < 0) return false
	if (end && comparePlain(monthStart(month), end) > 0) return false
	return true
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

/** Unstyled native month or year picker used when no custom dropdown is supplied. */
const CalendarDropdown: Stateless<CalendarDropdownArgs> = ({
	label,
	onValueChange,
	options,
	value,
}) => (
	<select
		aria-label={label}
		data-slot="calendar-dropdown"
		set:onchange={(event: Event) => onValueChange((event.currentTarget as HTMLSelectElement).value, event)}
		set:value={value}
	>
		{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
	</select>
)

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
			: canNavigateYear(year, visible, args, today(args.timeZone))

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
		viewState.set(target, event)
	}

	const drillUp = (anchor: PlainDate, args: CalendarArgs, event: Event) => {
		if (currentView === 'day') {
			if (!samePeriod(anchor, visible, 'month')) moveMonth(anchor, args, event)
			changeView('month', args, event)
			focusMonthCell(anchor, args)
			return
		}
		if (currentView === 'month') {
			changeView('year', args, event)
			focusYearCell(anchor.year, args)
		}
	}

	const selectMonthCell = (month: PlainDate, args: CalendarArgs, event: Event) => {
		if (minimumView(args.minView) === 'month') {
			selectPeriod(month, 'month', args, event)
			return
		}
		moveMonth(month, args, event)
		changeView('day', args, event)
		focusDay(monthStart(month), args)
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
		focusMonthCell(month, args)
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
				const page = yearPage(visible, args, today(args.timeZone))
				const rowStart = page.start + Math.floor((year - page.start) / 3) * 3
				const candidates = page.years.filter(candidate =>
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

	const nav = grid(this, {
		rtl: () => currentArgs.dir === 'rtl',
		onMove,
	})

	const onCellKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape' || viewRank[currentView] <= viewRank[minimumView(currentArgs.minView)]) {
			nav.handle(event)
			return
		}
		event.preventDefault()
		event.stopPropagation()
		if (currentView === 'year') {
			changeView('month', currentArgs, event)
			focusMonthCell(visible, currentArgs)
			return
		}
		changeView('day', currentArgs, event)
		focusDay(visible, currentArgs)
	}

	for (const args of this) {
		currentArgs = args
		syncAvailability(args)
		monthState.sync(args.month ? monthStart(dateToPlain(args.month, args.timeZone)) : undefined)
		viewState.sync(args.view === undefined ? undefined : clampView(args.view, args.minView))
		const clampedView = clampView(viewState.value, args.minView)
		if (!viewState.controlled && clampedView !== viewState.value) viewState.init(clampedView)
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
		if (renderedView !== currentView && domReady) {
			const active = document.activeElement
			if (active instanceof HTMLElement && this.contains(active)) {
				if (currentView === 'day') focusDay(visible, args)
				else if (currentView === 'month') focusMonthCell(visible, args)
				else focusYearCell(visible.year, args)
			}
		}
		renderedView = currentView
		const weekStartsOn = args.weekStartsOn ?? 0
		const count = Math.max(1, args.numberOfMonths ?? 1)
		const locale = localeCode(args.locale)
		const formats = { ...defaultFormatters, ...(args.formatters ?? {}) }
		const shown = months(visible, count, Boolean(args.fixedWeeks), weekStartsOn)
		const single = singleState.value
		const multiple = multipleState.value
		const range = rangeState.value
		const years = yearRange(visible, args, now)
		const dayColumns = gridTemplate(Boolean(args.showWeekNumber))
		const captionLayout = args.captionLayout ?? 'button'
		const MonthDropdown = args.monthDropdown ?? CalendarDropdown
		const YearDropdown = args.yearDropdown ?? CalendarDropdown
		const page = yearPage(visible, args, now)
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
		const canPreviousView = currentView === 'day'
			? canNavigateTo(addMonths(visible, -1), args)
			: currentView === 'month'
				? canNavigateYear(visible.year - 1, visible, args, now)
				: page.start > page.allowed[0]!
		const canNextView = currentView === 'day'
			? canNavigateTo(addMonths(visible, count), args)
			: currentView === 'month'
				? canNavigateYear(visible.year + 1, visible, args, now)
				: page.start + 12 <= page.allowed[page.allowed.length - 1]!
		const navigateView = (direction: -1 | 1, event: Event) => {
			if (currentView === 'day') {
				moveMonth(addMonths(visible, direction < 0 ? -1 : count), args, event)
				return
			}
			const year = visible.year + direction * (currentView === 'month' ? 1 : 12)
			const month = navigableMonth(year, args)
			if (month) moveMonth(month, args, event)
		}
		const previousLabel = args.previousMonthLabel ?? (currentView === 'day'
			? 'Previous month'
			: currentView === 'month' ? 'Previous year' : 'Previous 12 years')
		const nextLabel = args.nextMonthLabel ?? (currentView === 'day'
			? 'Next month'
			: currentView === 'month' ? 'Next year' : 'Next 12 years')

		yield (
			<>
				<div class={args.classNames?.months} data-slot="calendar-months">
					{currentView === 'day' ? shown.map(({ month: item, weeks }, monthIndex) => {
						const monthDate = plainToDate(item, args.timeZone)
						const showMonthDropdown = captionLayout === 'dropdown' || captionLayout === 'dropdown-months'
						const showYearDropdown = captionLayout === 'dropdown' || captionLayout === 'dropdown-years'
						const firstMonth = monthIndex === 0
						const lastMonth = monthIndex === shown.length - 1

						return (
							<div key={iso(item)} class={args.classNames?.month} data-month={iso(item)} data-slot="calendar-month">
								{/* Nav buttons are caption-row siblings, so a wide month or year
								    select grows the calendar instead of colliding with them. */}
								<div class={args.classNames?.caption} data-slot="calendar-caption">
									{firstMonth ? (
										<button
											aria-disabled={canPreviousView ? undefined : 'true'}
											aria-label={previousLabel}
											class={args.navButtonClass}
											data-slot="calendar-previous"
											disabled={!canPreviousView}
											type="button"
											set:onclick={(event: Event) => navigateView(-1, event)}
										>
											{args.previousIcon ?? <span aria-hidden="true" class={args.previousIconClass} data-slot="calendar-previous-icon" />}
										</button>
									) : (
										<span aria-hidden="true" class={args.navSpacerClass} data-slot="calendar-nav-spacer" />
									)}
									{captionLayout === 'button' ? (
										<button
											class={args.captionLabelClass}
											data-slot="calendar-view-trigger"
											type="button"
											set:onclick={(event: Event) => drillUp(item, args, event)}
										>
											{formats.monthCaption(monthDate, locale, args.timeZone)}
										</button>
									) : captionLayout === 'label' ? (
										<div class={args.captionLabelClass} data-slot="calendar-caption-label">
											{formats.monthCaption(monthDate, locale, args.timeZone)}
										</div>
									) : (
										<div class={args.classNames?.dropdowns} data-slot="calendar-dropdowns">
										{showMonthDropdown ? (
											<MonthDropdown
												label={args.monthSelectLabel ?? 'Month'}
												options={monthOptions(item.year).map(option => ({
													label: formats.monthDropdown(plainToDate(option, args.timeZone), locale, args.timeZone),
													value: String(option.month),
												}))}
												onValueChange={(value, event) => moveMonth({ ...item, month: Number(value) }, args, event)}
												value={String(item.month)}
											/>
										) : (
											<div class={args.monthLabelClass} data-slot="calendar-month-label">{formatter(locale, 'monthLabel', args.timeZone).format(monthDate)}</div>
										)}
										{showYearDropdown ? (
											<YearDropdown
												label={args.yearSelectLabel ?? 'Year'}
												onValueChange={(value, event) => moveMonth({ ...item, year: Number(value) }, args, event)}
												options={years.map(year => ({ label: year, value: String(year) }))}
												value={String(item.year)}
											/>
											) : (
												<div class={args.yearLabelClass} data-slot="calendar-year-label">{item.year}</div>
											)}
										</div>
									)}
									{lastMonth ? (
										<button
											aria-disabled={canNextView ? undefined : 'true'}
											aria-label={nextLabel}
											class={args.navButtonClass}
											data-slot="calendar-next"
											disabled={!canNextView}
											type="button"
											set:onclick={(event: Event) => navigateView(1, event)}
										>
											{args.nextIcon ?? <span aria-hidden="true" class={args.nextIconClass} data-slot="calendar-next-icon" />}
										</button>
									) : (
										<span aria-hidden="true" class={args.navSpacerClass} data-slot="calendar-nav-spacer" />
									)}
								</div>
								<div class={args.classNames?.grid} data-slot="calendar-grid" role="grid" aria-label={formats.monthCaption(monthDate, locale, args.timeZone)}>
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
												const outside = day.month !== item.month || day.year !== item.year
												const date = plainToDate(day, args.timeZone)
												const disabled = outside && args.showOutsideDays === false
													? true
													: Boolean(disabledAvailability?.day(date))
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
												const current = samePlain(day, now)
												const modifierList = modifierNames(modifierAvailability, date)
												const modifiers: CalendarModifiers = {
													disabled,
													outside,
													range_end,
													range_middle,
													range_start,
													selected,
													today: current,
													unavailable,
												}
												const hidden = outside && args.showOutsideDays === false
												const band = args.mode === 'range' && Boolean(range.from && range.to)
												const state: CalendarDayState = {
													date,
													hidden,
													modifierNames: modifierList,
													modifiers,
													range: band,
												}

												return (
													<div
														key={iso(day)}
												class={args.dayClassName?.(state) ?? args.classNames?.day}
												data-disabled={disabled ? 'true' : undefined}
												data-outside={outside ? 'true' : undefined}
												data-selected={selected ? 'true' : undefined}
												data-slot="calendar-day"
												data-today={current ? 'true' : undefined}
												data-unavailable={unavailable ? 'true' : undefined}
														role="gridcell"
														{...modifierAttributes(modifierList)}
													>
														{hidden ? (
															<span aria-hidden="true" class={args.hiddenDayClass}>{day.day}</span>
														) : (
															<CalendarDayButton
														aria-label={formats.fullDate(date, locale, args.timeZone)}
																class={args.dayButtonClass}
																date={date}
														day={args.renderDay?.(date, modifiers) ?? formats.day(date, locale, args.timeZone)}
														timeZone={args.timeZone}
																disabled={disabled || outside}
														modifiers={modifiers}
														set:onclick={(event: Event) => selectDay(day, args, event)}
														set:onkeydown={onCellKeydown}
															/>
														)}
													</div>
												)
											})}
										</div>
									))}
								</div>
							</div>
						)
					}) : (
						<div key={`${currentView}-${currentView === 'year' ? page.start : visible.year}`} class={args.classNames?.month}>
							<div class={args.classNames?.caption} data-slot="calendar-caption">
								<button
									aria-disabled={canPreviousView ? undefined : 'true'}
									aria-label={previousLabel}
									class={args.navButtonClass}
									data-slot="calendar-previous"
									disabled={!canPreviousView}
									type="button"
									set:onclick={(event: Event) => navigateView(-1, event)}
								>
									{args.previousIcon ?? <span aria-hidden="true" class={args.previousIconClass} data-slot="calendar-previous-icon" />}
								</button>
								{captionLayout === 'button' ? (
									<button
										aria-disabled={currentView === 'year' ? 'true' : undefined}
										class={args.captionLabelClass}
										data-slot="calendar-view-trigger"
										disabled={currentView === 'year'}
										type="button"
										set:onclick={(event: Event) => drillUp(visible, args, event)}
									>
										{currentView === 'month' ? visible.year : `${page.start}–${page.start + 11}`}
									</button>
								) : (
									<div class={args.captionLabelClass} data-slot="calendar-caption-label">
										{currentView === 'month' ? visible.year : `${page.start}–${page.start + 11}`}
									</div>
								)}
								<button
									aria-disabled={canNextView ? undefined : 'true'}
									aria-label={nextLabel}
									class={args.navButtonClass}
									data-slot="calendar-next"
									disabled={!canNextView}
									type="button"
									set:onclick={(event: Event) => navigateView(1, event)}
								>
									{args.nextIcon ?? <span aria-hidden="true" class={args.nextIconClass} data-slot="calendar-next-icon" />}
								</button>
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
									aria-label={`${page.start}–${page.start + 11}`}
									class={args.classNames?.year_view}
									data-slot="calendar-year-view"
									role="grid"
									style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr))"
								>
									{page.years.map(year => {
										const disabled = !canUseYearCell(year, args)
										const target = { day: 1, month: 1, year }
										const flags = periodFlags(target, 'year')
										const current = year === now.year
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
													data-today={current ? 'true' : undefined}
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
	captionLabelClass,
	captionLayout,
	class: classes,
	classNames,
	dayButtonClass,
	dayClassName,
	defaultMonth,
	defaultSelected,
	defaultView,
	disabled,
	endMonth,
	fixedWeeks,
	formatters,
	fromYear,
	hiddenDayClass,
	locale,
	minView,
	month,
	monthDropdown,
	monthLabelClass,
	monthSelectLabel,
	nextMonthLabel,
	previousMonthLabel,
	yearSelectLabel,
	modifiers,
	navButtonClass,
	navSpacerClass,
	nextIcon,
	nextIconClass,
	numberOfMonths,
	onMonthChange,
	onViewChange,
	previousIcon,
	previousIconClass,
	renderDay,
	required,
	showOutsideDays = true,
	showWeekNumber,
	startMonth,
	timeZone,
	toYear,
	unavailable,
	view,
	weekStartsOn,
	yearDropdown,
	yearLabelClass,
	...attrs
}) => {
	const {
		dir,
		mode,
		onSelect,
		selected,
		...rest
	} = attrs as CalendarArgs & Record<string, unknown>
	const resolvedDir = (dir as 'ltr' | 'rtl' | undefined) ?? useDirection()
	const rootArgs = {
		allowNonContiguous,
		captionLabelClass,
		captionLayout,
		classNames,
		dayButtonClass,
		dayClassName,
		defaultMonth,
		defaultSelected,
		defaultView,
		disabled,
		dir: resolvedDir,
		endMonth,
		fixedWeeks,
		formatters,
		fromYear,
		hiddenDayClass,
		locale,
		minView,
		mode,
		month,
		monthDropdown,
		monthLabelClass,
		monthSelectLabel,
		nextMonthLabel,
		previousMonthLabel,
		yearSelectLabel,
		modifiers,
		navButtonClass,
		navSpacerClass,
		nextIcon,
		nextIconClass,
		numberOfMonths,
		onMonthChange,
		onSelect,
		onViewChange,
		previousIcon,
		previousIconClass,
		renderDay,
		required,
		selected,
		showOutsideDays,
		showWeekNumber,
		startMonth,
		timeZone,
		toYear,
		unavailable,
		view,
		weekStartsOn,
		yearDropdown,
		yearLabelClass,
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

/** Unstyled day button used by Calendar. */
const CalendarDayButton: Stateless<CalendarDayButtonArgs> = ({
	class: classes,
	date,
	day,
	modifiers,
	timeZone,
	type = 'button',
	...attrs
}) => {
	const value = dateToPlain(date, timeZone)
	const single = modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle

	return (
		<button
			{...attrs}
			aria-disabled={modifiers.unavailable ? 'true' : attrs['aria-disabled']}
			class={classes}
			data-day={iso(value)}
			data-disabled={modifiers.disabled ? 'true' : undefined}
			data-outside={modifiers.outside ? 'true' : undefined}
			data-range-end={modifiers.range_end ? 'true' : undefined}
			data-range-middle={modifiers.range_middle ? 'true' : undefined}
			data-range-start={modifiers.range_start ? 'true' : undefined}
			data-selected-single={single ? 'true' : undefined}
			data-slot="calendar-day-button"
			data-state={modifiers.selected ? 'selected' : 'unselected'}
			data-today={modifiers.today ? 'true' : undefined}
			data-unavailable={modifiers.unavailable ? 'true' : undefined}
			type={type}
		>
			{day}
		</button>
	)
}

export { Calendar, CalendarDayButton }
