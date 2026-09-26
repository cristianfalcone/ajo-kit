import type { Children, IntrinsicElements, Stateful, Stateless } from 'ajo'
import { controlled, dom, remember, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { calendarDate, compile, compiler, dayValue, exactUtcDate, partsOf, resolveLocale, weekday, type Availability, type AvailabilityMatcher, type CalendarMatcher } from './availability'
import { DirectionContext } from './direction'
import { daysInMonth } from './segments'
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

type PlainRange = {
	from?: PlainDate
	to?: PlainDate
}

/** One selection store: a day (single), days (multiple) or a range, by mode. */
type Selection = PlainDate | PlainDate[] | PlainRange | null

type PeriodView = Exclude<CalendarView, 'day'>

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

const normalize = (year: number, month: number, day: number): PlainDate => {
	const date = exactUtcDate({ day, month, year })
	return {
		day: date.getUTCDate(),
		month: date.getUTCMonth() + 1,
		year: date.getUTCFullYear(),
	}
}

const addDays = (date: PlainDate, days: number) =>
	normalize(date.year, date.month, date.day + days)

const addMonths = (date: PlainDate, monthCount: number) => {
	const month = normalize(date.year, date.month + monthCount, 1)
	return { ...month, day: Math.min(date.day, daysInMonth(month.year, month.month)) }
}

const monthStart = (date: PlainDate) =>
	({ year: date.year, month: date.month, day: 1 })

const comparePlain = (first: PlainDate, second: PlainDate) =>
	dayValue(first) - dayValue(second)

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
		return { ...monthStart(date), day: daysInMonth(date.year, date.month) }
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

const plainToDate = (date: PlainDate, timeZone?: string) =>
	calendarDate({ ...date, hour: 12, minute: 0, second: 0 }, timeZone)

const dateToPlain = (date: Date, timeZone?: string): PlainDate => {
	const { day, month, year } = partsOf(date, timeZone)
	return { day, month, year }
}

const today = (timeZone?: string) =>
	dateToPlain(new Date(), timeZone)

const startOfWeek = (date: PlainDate, weekStartsOn: number) =>
	addDays(date, -((weekday(date) - weekStartsOn + 7) % 7))

const weeksForMonth = (month: PlainDate, weekStartsOn: number) => {
	const start = startOfWeek(month, weekStartsOn)
	const length = Math.ceil(((weekday(month) - weekStartsOn + 7) % 7 + daysInMonth(month.year, month.month)) / 7) * 7
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

/** The mode's selection in plain dates; empty when `value` is undefined. */
const plainSelection = (value: CalendarArgs['selected'], mode: CalendarMode | undefined, timeZone?: string): Selection => {
	const plain = (date: Date) => dateToPlain(date, timeZone)
	if (mode === 'multiple') return ((value ?? []) as Date[]).map(plain)
	if (mode === 'range') {
		const { from, to } = (value ?? {}) as CalendarDateRange
		return { from: from && plain(from), to: to && plain(to) }
	}
	return value ? plain(value as Date) : null
}

const weekNumber = (date: PlainDate) => {
	const target = exactUtcDate(date)
	const day = target.getUTCDay() || 7
	target.setUTCDate(target.getUTCDate() + 4 - day)
	const yearStart = exactUtcDate({ day: 1, month: 1, year: target.getUTCFullYear() })
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

const initialMonthDate = (
	month: Date | undefined,
	defaultMonth: Date | undefined,
	defaultSelected: CalendarArgs['defaultSelected'],
) => {
	if (month) return month
	if (defaultMonth) return defaultMonth
	if (defaultSelected instanceof Date) return defaultSelected
	if (Array.isArray(defaultSelected)) return defaultSelected[0] ?? new Date()
	return defaultSelected?.from ?? new Date()
}

const CalendarRoot: Stateful<CalendarArgs> = function* ({
	defaultMonth,
	defaultSelected,
	defaultView,
	minView,
	mode,
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
	let currentArgs = {} as CalendarArgs
	let currentView = initialView
	let renderedView = initialView
	let selectionMode = mode
	// A view change the calendar made itself relocates focus even when the
	// clicked button never took it (Safari does not focus clicked buttons).
	let relocate = false
	let visible = initialMonth
	const domReady = dom(this)
	const disabledOf = compiler()
	const unavailableOf = compiler()
	let modifiersSource: CalendarCommonArgs['modifiers']
	let modifiersTimeZone: string | undefined
	let modifierAvailability = new Map<string, Availability>()

	const monthState = controlled<PlainDate>(this, {
		fallback: initialMonth,
		onChange: (next, event) => currentArgs.onMonthChange?.(plainToDate(next, currentArgs.timeZone), event),
	})
	const viewState = controlled<CalendarView>(this, {
		fallback: initialView,
		onChange: (next, event) => currentArgs.onViewChange?.(next, event),
	})
	// Empty emissions: single and range emit null, multiple emits [] (never null).
	const selection = controlled<Selection>(this, {
		fallback: plainSelection(defaultSelected as CalendarArgs['selected'], mode, timeZone),
		onChange: (next, event) => {
			const args = currentArgs
			const date = (day: PlainDate) => plainToDate(day, args.timeZone)
			if (args.mode === 'multiple') args.onSelect?.((next as PlainDate[]).map(date), event!)
			else if (args.mode === 'range') {
				const { from, to } = next as PlainRange
				args.onSelect?.(from || to ? { from: from && date(from), to: to && date(to) } : null, event!)
			} else args.onSelect?.(next && date(next as PlainDate), event!)
		},
	})

	/** Focuses the enabled cell `selector`, paging to `month()` first when it is not shown. */
	const focusCell = (selector: string, month: () => PlainDate | undefined, args: CalendarArgs, event?: Event) => {
		queueMicrotask(() => {
			const find = () => this.querySelector<HTMLButtonElement>(`${selector}:not(:disabled)`)
			const found = find()
			if (found) return found.focus()
			const target = month()
			if (!target) return
			moveMonth(target, args, event)
			queueMicrotask(() => find()?.focus())
		})
	}

	const focusDay = (date: PlainDate, args: CalendarArgs) => focusCell(`button[data-day="${iso(date)}"]`, () => {
		const visible = args.month ? monthStart(dateToPlain(args.month, args.timeZone)) : monthState.value
		const start = monthStart(date)
		if (comparePlain(start, visible) < 0) return addMonths(visible, -1)
		if (comparePlain(start, addMonths(visible, Math.max(1, args.numberOfMonths ?? 1) - 1)) > 0) return addMonths(visible, 1)
		return undefined
	}, args)

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

	const focusPeriod = (view: PeriodView, date: PlainDate, args: CalendarArgs, event?: Event) => view === 'month'
		? focusCell(`button[data-month="${monthIso(date)}"]`, () => monthStart(date), args, event)
		: focusCell(`button[data-year="${date.year}"]`, () => canUseYearCell(date.year, args) ? navigableMonth(date.year, args) : undefined, args, event)

	const moveMonth = (next: PlainDate, args: CalendarArgs, event?: Event) => {
		const target = monthStart(next)
		if (!canNavigateTo(target, args)) return
		monthState.set(target, event)
	}

	const selectPeriod = (date: PlainDate, view: CalendarView, args: CalendarArgs, event: Event) => {
		const start = periodStart(date, view)
		if (args.mode === 'multiple') {
			const current = selection.value as PlainDate[]
			const exists = current.some(item => samePeriod(item, start, view))
			const next = exists ? current.filter(item => !samePeriod(item, start, view)) : [...current, start]
			if (args.required && !next.length) return
			selection.set(next, event)
			return
		}

		if (args.mode === 'range') {
			const { from, to } = selection.value as PlainRange
			let next: PlainRange

			if (!from || to) next = { from: start }
			else if (comparePlain(start, periodStart(from, view)) < 0) next = { from: start, to: periodEnd(from, view) }
			else if (samePeriod(start, from, view) && !args.required) next = {}
			else next = { from: periodStart(from, view), to: periodEnd(date, view) }

			selection.set(next, event)
			return
		}

		const current = selection.value as PlainDate | null
		selection.set(current && samePeriod(current, start, view) && !args.required ? null : start, event)
	}

	const selectDay = (date: PlainDate, args: CalendarArgs, event: Event) => {
		if (disabledOf(args.disabled, args.timeZone)?.day(plainToDate(date, args.timeZone))) return
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
		const { day, month, year } = (event.currentTarget as HTMLButtonElement).dataset
		const args = currentArgs

		if (!day) {
			// One period step: month and year grids are three columns of a twelve-cell page.
			const view: PeriodView = month ? 'month' : 'year'
			const anchor = month ? parseMonthIso(month)! : { day: 1, month: 1, year: Number(year) }
			const first = view === 'month' ? anchor.year : yearPage(visible.year, args)[0]!
			const index = view === 'month' ? anchor.month - 1 : anchor.year - first
			const cell = (offset: number): PlainDate => view === 'month'
				? addMonths({ day: 1, month: 1, year: first }, offset)
				: { day: 1, month: 1, year: first + offset }
			let target: PlainDate | undefined
			if ('edge' in move) {
				const row = Math.floor(index / 3) * 3
				const cells = Array.from({ length: 12 }, (_, offset) => offset)
					.filter(offset => move.extent === 'all' || (row <= offset && offset < row + 3))
					.map(cell)
					.filter(date => view === 'month' ? canNavigateTo(date, args) : canUseYearCell(date.year, args))
				target = move.edge === 'start' ? cells[0] : cells[cells.length - 1]
			} else {
				target = cell(index + ('cols' in move ? move.cols : 'rows' in move ? move.rows * 3 : move.page * 12))
			}
			if (target) focusPeriod(view, target, args, event)
			return
		}

		const date = parseIso(day)!

		if ('cols' in move) {
			focusDay(addDays(date, move.cols), args)
			return
		}

		if ('rows' in move) {
			focusDay(addDays(date, move.rows * 7), args)
			return
		}

		if ('page' in move) {
			const count = move.page * (move.large ? 12 : 1)
			const target = addMonths(date, count)
			if (!canNavigateTo(monthStart(target), args)) return

			moveMonth(addMonths(visible, count), args, event)
			focusDay(target, args)
			return
		}

		if (move.extent === 'row') {
			const start = startOfWeek(date, args.weekStartsOn ?? 0)
			focusDay(move.edge === 'start' ? start : addDays(start, 6), args)
			return
		}

		focusDay(move.edge === 'start' ? monthStart(date) : periodEnd(date, 'month'), args)
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
		if (args.modifiers !== modifiersSource || args.timeZone !== modifiersTimeZone) {
			modifiersSource = args.modifiers
			modifiersTimeZone = args.timeZone
			modifierAvailability = new Map(Object.entries(args.modifiers ?? {}).flatMap(([name, matcher]) => {
				const availability = compile(matcher, { timeZone: args.timeZone })
				return availability ? [[name, availability]] : []
			}))
		}
		const disabledAvailability = disabledOf(args.disabled, args.timeZone)
		const unavailableAvailability = unavailableOf(args.unavailable, args.timeZone)
		monthState.sync(args.month ? monthStart(dateToPlain(args.month, args.timeZone)) : undefined)
		viewState.sync(args.view === undefined ? undefined : clampView(args.view, args.minView))
		const clampedView = clampView(viewState.value, args.minView)
		if (clampedView !== viewState.value) viewState.init(clampedView)
		// A mode change resets the uncontrolled selection to the new mode's empty value;
		// unbinding first lets init reach it after a controlled render.
		if (args.mode !== selectionMode) {
			selectionMode = args.mode
			selection.sync(undefined)
			selection.init(plainSelection(undefined, args.mode))
		}
		// selected !== undefined binds; null (single, range) and [] (multiple) are controlled-empty.
		const selected = selection.sync(args.selected === undefined ? undefined : plainSelection(args.selected, args.mode, args.timeZone))

		const now = today(args.timeZone)
		visible = monthState.value
		currentView = clampedView
		if (renderedView !== currentView && domReady && (relocate || this.contains(document.activeElement))) {
			if (currentView === 'day') focusDay(visible, args)
			else focusPeriod(currentView, visible, args)
		}
		relocate = false
		renderedView = currentView
		const weekStartsOn = args.weekStartsOn ?? 0
		const count = Math.max(1, args.numberOfMonths ?? 1)
		const locale = resolveLocale(args.locale)
		const formats = { ...defaultFormatters, ...(args.formatters ?? {}) }
		const shown = months(visible, count, weekStartsOn)
		const range = (args.mode === 'range' ? selected : {}) as PlainRange
		const band = Boolean(range.from && range.to)
		const dayColumns = gridTemplate(Boolean(args.showWeekNumber))
		const page = yearPage(visible.year, args)
		const pageLabel = `${page[0]}–${page[11]}`
		const periodFlags = (date: PlainDate, view: CalendarView) => {
			const range_start = Boolean(range.from && samePeriod(range.from, date, view))
			const range_end = Boolean(range.to && samePeriod(range.to, date, view))
			const range_middle = periodIntersects(range, date, view) && !range_start && !range_end
			const picked = args.mode === 'multiple'
				? (selected as PlainDate[]).some(item => samePeriod(item, date, view))
				: args.mode === 'range'
					? range_start || range_end || range_middle
					: Boolean(selected && samePeriod(selected as PlainDate, date, view))
			return { range_end, range_middle, range_start, selected: picked }
		}
		const periodCell = (view: PeriodView, date: PlainDate, disabled: boolean, label: string | undefined, text: Children, select: (event: Event) => void) => {
			const flags = periodFlags(date, view)
			const value = view === 'month' ? monthIso(date) : String(date.year)
			return (
				<div key={value} role="gridcell">
					<button
						aria-disabled={disabled ? 'true' : undefined}
						aria-label={label}
						class={args.classNames?.[`${view}_cell`]}
						data-disabled={disabled ? 'true' : undefined}
						data-month={view === 'month' ? value : undefined}
						data-range-end={flags.range_end ? 'true' : undefined}
						data-range-middle={flags.range_middle ? 'true' : undefined}
						data-range-start={flags.range_start ? 'true' : undefined}
						data-selected={flags.selected ? 'true' : undefined}
						data-slot={`calendar-${view}-cell`}
						data-today={samePeriod(date, now, view) ? 'true' : undefined}
						data-year={view === 'year' ? value : undefined}
						disabled={disabled}
						type="button"
						set:onclick={select}
						set:onkeydown={onCellKeydown}
					>
						{text}
					</button>
				</div>
			)
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
												const flags = periodFlags(day, 'day')
												// Outside days carry no selection; unavailable interior days of a non-contiguous range are gaps.
												const gap = outside || (flags.range_middle && unavailable && Boolean(args.allowNonContiguous))
												const range_start = !outside && flags.range_start
												const range_end = !outside && flags.range_end
												const range_middle = !gap && flags.range_middle
												const selected = !gap && flags.selected
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
							<div
								aria-label={currentView === 'month' ? String(visible.year) : pageLabel}
								class={args.classNames?.[`${currentView}_view`]}
								data-slot={`calendar-${currentView}-view`}
								role="grid"
								style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr))"
							>
								{currentView === 'month'
									? monthOptions(visible.year).map(month => periodCell(
										'month',
										month,
										!canNavigateTo(month, args),
										formats.monthCaption(plainToDate(month, args.timeZone), locale, args.timeZone),
										formatter(locale, 'monthLabel', args.timeZone).format(plainToDate(month, args.timeZone)),
										event => selectMonthCell(month, args, event),
									))
									: page.map(year => periodCell(
										'year',
										{ day: 1, month: 1, year },
										!canUseYearCell(year, args),
										undefined,
										year,
										event => selectYearCell(year, args, event),
									))}
							</div>
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
