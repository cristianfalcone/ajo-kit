/**
 * segments.ts — the pure engine behind the InputDate family (ai/ui.md).
 *
 * No JSX, no DOM; Intl is the only platform dependency. `input-date.tsx`
 * owns rendering, focus, and events, and consumes this surface:
 *
 * - `derive(opts)` — fixed-probe Intl derivation → ordered `Segment`
 *   descriptors (editable units + verbatim literals), resolved hour cycle,
 *   dayPeriod display strings, and localized month names.
 * - `fromISO` / `toISO` — strict parse/serialize of the native normalized
 *   forms (zero-padded, no milliseconds, no 24:00); year 1–9999.
 * - `typeDigit` / `matchName` / `eraseDigit` / `stepValue` — one pure
 *   segment mutation each (digit buffer, name prefix match, backspace,
 *   spin protocol).
 * - `validate` / `defaultMessage` / `constrain` / `isReversed` — reason-coded
 *   validation with localized default messages, the day clamp, and the range
 *   cross-check (`reversed` is a consumer-raised reason: validate never
 *   returns it).
 * - `formatValue` — human formatting of a committed value (message bounds,
 *   the field's hidden value description).
 * - `inferGranularity` — value → defaultValue → placeholderValue →
 *   granularity arg → 'minute'.
 * - `reconciler()` — lastEmitted/lastObserved external-change detection, so
 *   echoes of self-emitted values never clobber edits.
 * - `field(options)` — the stateful editing record wiring all of the above:
 *   independently nullable units (hour kept in the display cycle, dayPeriod
 *   its own 0/1 unit), the typing buffer, and the eager-constrain commit
 *   pipeline. Every mutation returns an `InputResult` telling the consumer
 *   whether to move focus and what to emit; `emit` is `undefined` when the
 *   public value did not change.
 */

// Types:

import { clamp, remember } from 'ajo-cloves'

export type SegmentsKind = 'date' | 'datetime' | 'time'

export type Granularity = 'day' | 'minute' | 'second'

export type HourCycle = 'h12' | 'h23'

export type SegmentUnit = 'day' | 'dayPeriod' | 'hour' | 'minute' | 'month' | 'second' | 'year'

export type Segment = {
	/** Editable unit name, or 'literal' for verbatim passthrough (separators, era). */
	type: SegmentUnit | 'literal'
	/** Literal text; empty on editable segments. */
	text: string
	editable: boolean
	/** Shown while the unit is empty; native-input vocabulary. */
	placeholder: string
	/** Static bounds; the day max is the static 31 — `field.bounds` carries the dynamic cap. */
	min: number
	max: number
	/** Maximum digits the unit accepts (auto-advance limit); 0 = non-numeric. */
	digits: number
	/** Zero-pad width, from the probe's formatted length. */
	width: number
}

export type Units = {
	year: number | null
	month: number | null
	day: number | null
	/** Kept in the display cycle: 1–12 under h12 (with dayPeriod), 0–23 under h23. */
	hour: number | null
	minute: number | null
	second: number | null
	/** 0 = AM, 1 = PM; null under h23. */
	dayPeriod: number | null
}

export type Derivation = {
	segments: Segment[]
	/** Editable units actually rendered, in display order. */
	units: SegmentUnit[]
	hourCycle: HourCycle
	/** [AM, PM] display strings, derived by formatting hours 0 and 12. */
	periods: [string, string]
	/** Localized long month names, January first; empty for time fields. */
	monthNames: string[]
	withSeconds: boolean
}

export type DeriveOptions = {
	kind: SegmentsKind
	locale: string
	granularity?: Granularity
	/** Overrides the locale's resolved cycle. */
	hourCycle?: 12 | 24
}

export type Reason =
	| { code: 'impossible' }
	| { code: 'incomplete'; unit: SegmentUnit }
	| { code: 'rangeOverflow'; max: string }
	| { code: 'rangeUnderflow'; min: string }
	| { code: 'reversed' }
	| { code: 'unavailable' }
	| { code: 'unavailableRange' }

export type SpinAction = { step: 1 | -1 } | { page: 1 | -1 } | { edge: 'max' | 'min' }

export type InputResult = {
	/** The key produced a mutation: consumer preventDefaults and invalidates. */
	handled: boolean
	/** Move focus to the next editable segment. */
	advance?: boolean
	/** Move focus to the previous editable segment (backspace on an empty segment). */
	retreat?: boolean
	/** Commit decision: undefined = no emission; string or null = call onValueChange. */
	emit?: string | null
}

// Derivation:

// Fixed probe with single-digit units: distinguishes numeric from 2-digit
// widths and keeps SSR/client output identical across midnight. 2224 is a
// leap year, so Feb 29 stays reachable while the year is unknown.
const PROBE_YEAR = 2224
const PROBE = new Date(PROBE_YEAR, 2, 4, 5, 6, 7)

const EDITABLE: readonly SegmentUnit[] = ['year', 'month', 'day', 'hour', 'minute', 'second', 'dayPeriod']

// Native-input placeholder vocabulary [year, month, day]; English fallback.
const VOCABULARY: Record<string, [string, string, string]> = {
	de: ['jjjj', 'mm', 'tt'],
	en: ['yyyy', 'mm', 'dd'],
	es: ['aaaa', 'mm', 'dd'],
	fr: ['aaaa', 'mm', 'jj'],
	ja: ['年', '月', '日'],
}

const TIME_PLACEHOLDER = '––'

const boundsOf = (unit: SegmentUnit, hourCycle: HourCycle): [number, number] => {
	switch (unit) {
		case 'year': return [1, 9999]
		case 'month': return [1, 12]
		case 'day': return [1, 31]
		case 'hour': return hourCycle === 'h12' ? [1, 12] : [0, 23]
		case 'dayPeriod': return [0, 1]
		default: return [0, 59]
	}
}

// h11 renders "0:00 AM" and h24 "24:00": clamp to the two sane cycles.
const resolveHourCycle = (locale: string, override?: 12 | 24): HourCycle => {
	if (override) return override === 12 ? 'h12' : 'h23'
	const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle
	return cycle === 'h11' || cycle === 'h12' ? 'h12' : 'h23'
}

/** Derives ordered segment descriptors for a locale via a fixed-probe formatToParts. */
export const derive = (opts: DeriveOptions): Derivation => {
	const { kind, locale } = opts
	const hourCycle = kind === 'date' ? 'h23' : resolveHourCycle(locale, opts.hourCycle)
	const withSeconds = kind !== 'date' && opts.granularity === 'second'

	let format: Intl.DateTimeFormatOptions | undefined
	if (kind !== 'date') {
		format = { hour: 'numeric', minute: 'numeric', hourCycle }
		if (withSeconds) format.second = 'numeric'
		if (kind === 'datetime') Object.assign(format, { year: 'numeric', month: 'numeric', day: 'numeric' })
	}

	const language = locale.split('-')[0].toLowerCase()
	const vocabulary = VOCABULARY[language] ?? VOCABULARY.en
	const placeholderOf = (unit: SegmentUnit) =>
		unit === 'year' ? vocabulary[0] : unit === 'month' ? vocabulary[1] : unit === 'day' ? vocabulary[2] : TIME_PLACEHOLDER

	const segments: Segment[] = []
	for (const part of new Intl.DateTimeFormat(locale, format).formatToParts(PROBE)) {
		if ((EDITABLE as readonly string[]).includes(part.type)) {
			const unit = part.type as SegmentUnit
			const [min, max] = boundsOf(unit, hourCycle)
			segments.push({
				type: unit,
				text: '',
				editable: true,
				placeholder: placeholderOf(unit),
				min,
				max,
				digits: unit === 'dayPeriod' ? 0 : String(max).length,
				width: part.value.length,
			})
		} else {
			// Passthrough: unmapped part types (era, yearName, …) render verbatim.
			segments.push({ type: 'literal', text: part.value, editable: false, placeholder: '', min: 0, max: 0, digits: 0, width: part.value.length })
		}
	}

	// The dayPeriod OPTION is a trap (flexible day periods, broken Safari):
	// derive the two strings by formatting hours 0 and 12.
	let periods: [string, string] = ['', '']
	if (kind !== 'date' && hourCycle === 'h12') {
		const formatter = new Intl.DateTimeFormat(locale, { hour: 'numeric', hourCycle: 'h12' })
		const periodOf = (hour: number) =>
			formatter.formatToParts(new Date(PROBE_YEAR, 2, 4, hour)).find(part => part.type === 'dayPeriod')?.value ?? (hour ? 'PM' : 'AM')
		periods = [periodOf(0), periodOf(12)]
	}

	let monthNames: string[] = []
	if (kind !== 'time') {
		const formatter = new Intl.DateTimeFormat(locale, { month: 'long' })
		monthNames = Array.from({ length: 12 }, (_, month) => formatter.format(new Date(PROBE_YEAR, month, 4, 12)))
	}

	return {
		segments,
		units: segments.filter(segment => segment.editable).map(segment => segment.type as SegmentUnit),
		hourCycle,
		periods,
		monthNames,
		withSeconds,
	}
}

const TIME_UNITS = new Set<Segment['type']>(['dayPeriod', 'hour', 'minute', 'second'])

/** Returns the contiguous time portion of a derived segment sequence. */
export const timeRun = (segments: readonly Segment[]): Segment[] => {
	let first = -1
	let last = -1

	for (let index = 0; index < segments.length; index++) {
		if (!TIME_UNITS.has(segments[index]!.type)) continue
		if (first < 0) first = index
		last = index
	}

	return first < 0 ? [] : segments.slice(first, last + 1)
}

// ISO value model:

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/

/** Month length; unknown month falls back to 31, unknown year keeps Feb 29 typable. */
export const daysInMonth = (year: number | null, month: number | null): number => {
	if (month == null) return 31
	const date = new Date(PROBE_YEAR, month, 0)
	// setFullYear, not the constructor: years 0–99 must not map to 1900+.
	if (year != null) date.setFullYear(year, month, 0)
	return date.getDate()
}

const parseDate = (text: string) => {
	const match = DATE_RE.exec(text)
	if (!match) return null
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
	return { year, month, day }
}

const parseTime = (text: string) => {
	const match = TIME_RE.exec(text)
	if (!match) return null
	const hour = Number(match[1])
	const minute = Number(match[2])
	const second = match[3] == null ? null : Number(match[3])
	if (hour > 23 || minute > 59 || (second != null && second > 59)) return null
	return { hour, minute, second }
}

/** A fresh editing record: every unit independently empty. */
export const emptyUnits = (): Units => ({ year: null, month: null, day: null, hour: null, minute: null, second: null, dayPeriod: null })

/** Strict parse of the native normalized forms into the editing record; null on anything else. */
export const fromISO = (kind: SegmentsKind, value: string, hourCycle: HourCycle = 'h23'): Units | null => {
	let date: ReturnType<typeof parseDate> = null
	let time: ReturnType<typeof parseTime> = null

	if (kind === 'date') {
		date = parseDate(value)
		if (!date) return null
	} else if (kind === 'time') {
		time = parseTime(value)
		if (!time) return null
	} else {
		const at = value.indexOf('T')
		if (at < 0) return null
		date = parseDate(value.slice(0, at))
		time = parseTime(value.slice(at + 1))
		if (!date || !time) return null
	}

	const units = emptyUnits()
	if (date) Object.assign(units, date)
	if (time) {
		units.minute = time.minute
		units.second = time.second
		if (hourCycle === 'h12') {
			units.dayPeriod = time.hour < 12 ? 0 : 1
			units.hour = time.hour % 12 || 12
		} else {
			units.hour = time.hour
		}
	}
	return units
}

const pad = (value: number, width: number) => String(value).padStart(width, '0')

// NaN is as missing as null: a serialized NaN would commit as a real value.
const filled = (value: number | null): value is number => value != null && !Number.isNaN(value)

/** Serializes complete units to the family's normalized form; null while a required unit is missing. */
export const toISO = (kind: SegmentsKind, units: Units, opts: { hourCycle?: HourCycle; seconds?: boolean } = {}): string | null => {
	const parts: string[] = []
	if (kind !== 'time') {
		if (!filled(units.year) || !filled(units.month) || !filled(units.day)) return null
		parts.push(`${pad(units.year, 4)}-${pad(units.month, 2)}-${pad(units.day, 2)}`)
	}
	if (kind !== 'date') {
		if (!filled(units.hour) || !filled(units.minute)) return null
		if (opts.seconds && !filled(units.second)) return null
		const h12 = (opts.hourCycle ?? 'h23') === 'h12'
		if (h12 && !filled(units.dayPeriod)) return null
		const hour = h12
			? units.dayPeriod === 1 ? (units.hour === 12 ? 12 : units.hour + 12) : units.hour % 12
			: units.hour
		parts.push(`${pad(hour, 2)}:${pad(units.minute, 2)}${opts.seconds ? `:${pad(units.second!, 2)}` : ''}`)
	}
	return parts.join('T')
}

// Typing:

export type TypeState = {
	/** New unit value; null = leave the unit untouched (a buffered zero). */
	value: number | null
	buffer: string
	/** No further digit could fit: focus moves on. */
	advance: boolean
}

/** Digit protocol: the buffer accumulates, overflow restarts from the last key, full advances. */
export const typeDigit = (buffer: string, key: string, min: number, max: number, digits: number): TypeState => {
	const typed = buffer + key
	let value = Number(typed)
	if (Number.isNaN(value) || value > max) value = Number(key)
	// A zero only sets units whose range starts at 0; otherwise it waits in the buffer.
	const set = value !== 0 || min === 0
	const full = Number(typed) * 10 > max || typed.length >= digits
	return {
		value: set ? value : null,
		buffer: full ? '' : typed,
		advance: full && set,
	}
}

export type NameMatch = {
	index: number
	buffer: string
	/** The prefix identifies exactly one name: focus can move on. */
	unique: boolean
}

const nameCollators = new Map<string, Intl.Collator>()

/** Prefix-matches locale names (Collator sensitivity 'base'); a repeated first letter cycles its matches. */
export const matchName = (locale: string, names: string[], current: number | null, buffer: string, key: string): NameMatch | null => {
	let collator = nameCollators.get(locale)
	if (!collator) {
		collator = new Intl.Collator(locale, { sensitivity: 'base', usage: 'search' })
		remember(nameCollators, locale, collator)
	}
	const starts = (name: string, query: string) => collator.compare(name.slice(0, query.length), query) === 0

	for (const query of buffer ? [buffer + key, key] : [key]) {
		const matches: number[] = []
		for (let index = 0; index < names.length; index++) {
			if (starts(names[index], query)) matches.push(index)
		}
		if (!matches.length) continue
		const cycle = query.length === 1 && current != null && matches.includes(current)
		return {
			index: cycle ? matches[(matches.indexOf(current!) + 1) % matches.length] : matches[0],
			buffer: query,
			unique: matches.length === 1,
		}
	}
	return null
}

// Stepping:

// Rounded page grids (react-aria parity; hour rides its 2-step).
const PAGE_STEP: Record<SegmentUnit, number> = { year: 5, month: 2, day: 7, hour: 2, minute: 15, second: 15, dayPeriod: 1 }

const cycle = (value: number, amount: number, min: number, max: number, round: boolean): number => {
	if (!round) {
		value += amount
		return value < min ? max - (min - value - 1) : value > max ? min + (value - max - 1) : value
	}
	value += Math.sign(amount)
	if (value < min) value = max
	const grid = Math.abs(amount)
	value = amount > 0 ? Math.ceil(value / grid) * grid : Math.floor(value / grid) * grid
	if (value > max) value = min
	return clamp(value, min, max)
}

/** Spin protocol: ±1 wraps at the bounds without carrying, pages round to their grid, edges land on min/max. */
export const stepValue = (unit: SegmentUnit, value: number, action: SpinAction, min: number, max: number, minuteStep = 1): number => {
	if ('edge' in action) return action.edge === 'min' ? min : max
	if ('page' in action) return cycle(value, PAGE_STEP[unit] * action.page, min, max, true)
	const step = unit === 'minute' ? minuteStep : 1
	return cycle(value, action.step * step, min, max, step > 1)
}

// Deletion:

export type EraseState = {
	value: number | null
	buffer: string
	/** The segment was already empty: focus moves to the previous segment. */
	retreat: boolean
}

/** Backspace semantics: strip the last digit, empty shows the placeholder, empty again retreats. */
export const eraseDigit = (value: number | null, buffer: string): EraseState => {
	const text = buffer || (value == null ? '' : String(value))
	if (!text) return { value: null, buffer: '', retreat: true }
	const stripped = text.slice(0, -1)
	const parsed = Number(stripped)
	// A non-numeric remainder (a letter buffer that fell through) clears:
	// NaN must never reach the unit record.
	if (Number.isNaN(parsed)) return { value: null, buffer: '', retreat: false }
	return { value: stripped && parsed !== 0 ? parsed : null, buffer: stripped, retreat: false }
}

// Validation:

export type ValidateOptions = {
	min?: string
	max?: string
	unavailable?: (value: string) => boolean
	hourCycle?: HourCycle
	seconds?: boolean
}

/** Reason-coded validation; null = valid. An all-empty record is valid — required is the consumer's. */
export const validate = (kind: SegmentsKind, units: Units, order: SegmentUnit[], opts: ValidateOptions = {}): Reason | null => {
	if (order.every(unit => units[unit] == null)) return null
	for (const unit of order) {
		if (units[unit] == null) return { code: 'incomplete', unit }
	}
	if (units.day != null && units.day > daysInMonth(units.year, units.month)) return { code: 'impossible' }
	const value = toISO(kind, units, { hourCycle: opts.hourCycle, seconds: opts.seconds })
	if (value == null) return { code: 'impossible' }
	if (opts.min != null && value < opts.min) return { code: 'rangeUnderflow', min: opts.min }
	if (opts.max != null && value > opts.max) return { code: 'rangeOverflow', max: opts.max }
	if (opts.unavailable?.(value)) return { code: 'unavailable' }
	return null
}

/** Eager constrain: clamps the day into the real month length, in place. */
export const constrain = (units: Units): Units => {
	if (units.day != null) units.day = Math.min(units.day, daysInMonth(units.year, units.month))
	return units
}

/** Range cross-check: from > to, in the family's own string format. */
export const isReversed = (from: string | null | undefined, to: string | null | undefined): boolean =>
	from != null && to != null && from > to

export type MessageOptions = {
	kind: SegmentsKind
	locale: string
	hourCycle?: HourCycle
}

const displayNames = new Map<string, Intl.DisplayNames>()

/** Localized date/time segment label, shared by field ARIA and validation messages. */
export const unitLabel = (locale: string, unit: SegmentUnit): string => {
	let names = displayNames.get(locale)
	if (!names) {
		names = new Intl.DisplayNames([locale], { type: 'dateTimeField' })
		remember(displayNames, locale, names)
	}
	return names.of(unit) ?? unit
}

const valueFormatters = new Map<string, Intl.DateTimeFormat>()

const valueFormatter = (opts: MessageOptions, seconds: boolean) => {
	const key = [opts.locale, opts.kind, seconds ? 'second' : '', opts.kind === 'date' ? '' : opts.hourCycle ?? ''].join('\0')
	let formatter = valueFormatters.get(key)
	if (!formatter) {
		const format: Intl.DateTimeFormatOptions = {}
		if (opts.kind !== 'time') format.dateStyle = 'medium'
		if (opts.kind !== 'date') {
			format.timeStyle = seconds ? 'medium' : 'short'
			if (opts.hourCycle) format.hourCycle = opts.hourCycle
		}
		formatter = new Intl.DateTimeFormat(opts.locale, format)
		remember(valueFormatters, key, formatter)
	}
	return formatter
}

/** Formats a committed value for humans: message bounds, the hidden value description. */
export const formatValue = (value: string, opts: MessageOptions): string => {
	const units = fromISO(opts.kind, value)
	if (!units) return value
	const date = new Date(PROBE_YEAR, (units.month ?? 3) - 1, units.day ?? 4, units.hour ?? 12, units.minute ?? 0, units.second ?? 0)
	date.setFullYear(units.year ?? PROBE_YEAR)
	return valueFormatter(opts, units.second != null).format(date)
}

/** Default message builders (GOV.UK hierarchy): localized unit names and bounds, overridable per field. */
export const defaultMessage = (reason: Reason, opts: MessageOptions): string => {
	switch (reason.code) {
		case 'incomplete': {
			return `Must include a ${unitLabel(opts.locale, reason.unit)}`
		}
		case 'impossible':
			return opts.kind === 'time' ? 'Must be a real time' : 'Must be a real date'
		case 'rangeUnderflow':
			return `Must be ${formatValue(reason.min, opts)} or later`
		case 'rangeOverflow':
			return `Must be ${formatValue(reason.max, opts)} or earlier`
		case 'reversed':
			return opts.kind === 'time' ? 'Start time must be before end time' : 'Start date must be before end date'
		case 'unavailable':
			return opts.kind === 'time' ? 'This time is unavailable' : 'This date is unavailable'
		case 'unavailableRange':
			return 'Range includes unavailable dates'
	}
}

// Reconciliation:

export type Reconciler = {
	/** True when the synced value is an external change: re-derive units, drop the buffer. */
	observe(value: string | null | undefined): boolean
	/** Records an emission so the matching echo never re-derives. */
	emit(value: string | null): void
}

/** Controlled ↔ editing-state reconciliation: only genuinely external values clobber edits. */
export const reconciler = (): Reconciler => {
	let lastEmitted: string | null | undefined
	let lastObserved: string | null | undefined
	return {
		emit(value) {
			// The owner is expected to hold this value now: an acceptance echo
			// matches, a rejection or external push differs and re-derives.
			lastEmitted = lastObserved = value
		},
		observe(value) {
			if (value === undefined) return false
			if (value === lastEmitted || value === lastObserved) {
				lastObserved = value
				return false
			}
			lastEmitted = lastObserved = value
			return true
		},
	}
}

// Granularity:

export type InferOptions = {
	value?: string | null
	defaultValue?: string | null
	placeholderValue?: string | null
	granularity?: Granularity
}

/** value → defaultValue → placeholderValue → granularity arg → 'minute'; seconds in a value force the segment. */
export const inferGranularity = (kind: SegmentsKind, opts: InferOptions): Granularity => {
	if (kind === 'date') return 'day'
	for (const source of [opts.value, opts.defaultValue, opts.placeholderValue]) {
		if (typeof source !== 'string') continue
		const time = kind === 'time' ? source : source.indexOf('T') < 0 ? '' : source.slice(source.indexOf('T') + 1)
		if (TIME_RE.test(time)) return time.length > 5 ? 'second' : 'minute'
	}
	return opts.granularity ?? 'minute'
}

// Field:

export type FieldOptions = {
	kind: SegmentsKind
	/** BCP 47 tag; the consumer resolves it (locale arg → <html lang> → 'en-US'). */
	locale?: string
	granularity?: Granularity
	hourCycle?: 12 | 24
	/** Minute arrow step (booking granularity); typing and PageUp/Down are unaffected. */
	step?: number
	/** Seeds the first spin on an empty segment; never emitted by itself. Default today/now. */
	placeholderValue?: string
	/** Uncontrolled initial value; what a form reset restores. */
	defaultValue?: string
	min?: string
	max?: string
	unavailable?: (value: string) => boolean
	/** Reason-coded message override; undefined falls back to the localized default. */
	errorMessage?: (reason: Reason) => string | undefined
}

export type FieldView = {
	/** Ordered descriptors for rendering; rebuilt when locale or shape options change. */
	readonly segments: Segment[]
	/** The live editing record. */
	readonly units: Units
	readonly hourCycle: HourCycle
	readonly periods: [string, string]
	readonly monthNames: string[]
	/** Per-render reconcile: re-derives on option changes, adopts external values only. */
	sync(value: string | null | undefined, opts?: FieldOptions): void
	/** Display text for one unit: typing buffer, else the padded value, else '' (placeholder). */
	text(unit: SegmentUnit): string
	/** Live bounds: the day max follows known month/year (Feb 28/29), 31 otherwise. */
	bounds(unit: SegmentUnit): { min: number; max: number }
	/** Digit or letter key on a segment. */
	type(unit: SegmentUnit, key: string): InputResult
	/** Backspace/Delete on a segment. */
	erase(unit: SegmentUnit): InputResult
	/** Spin protocol (±1, page, edge); an empty segment seeds from placeholderValue. */
	spin(unit: SegmentUnit, action: SpinAction): InputResult
	/** Seed units (placeholderValue, else now): what empty units adopt on first spin or a calendar merge. */
	placeholder(): Units
	/** Calendar pick / preset merge: assigns the given units through the commit pipeline. */
	merge(next: Partial<Units>): InputResult
	/** Empties every unit (clear button). */
	clear(): InputResult
	/** Restores defaultValue (form reset); never emits. */
	reset(): void
	/** Drops the typing buffer (segment blur). */
	blur(): void
	/** The field's current public value. */
	value(): string | null
	complete(): boolean
	reason(): Reason | null
	/** Message for the current reason; null while valid. */
	message(): string | null
}

// Hour is stored in the display cycle, so a cycle flip converts in place.
const convertHour = (units: Units, hourCycle: HourCycle) => {
	if (units.hour == null) {
		units.dayPeriod = null
		return
	}
	if (hourCycle === 'h12') {
		units.dayPeriod = units.hour < 12 ? 0 : 1
		units.hour = units.hour % 12 || 12
	} else {
		units.hour = units.dayPeriod === 1 ? (units.hour === 12 ? 12 : units.hour + 12) : units.hour % 12
		units.dayPeriod = null
	}
}

/** The stateful editing record consumed by the InputDate family; one per field side. */
export const field = (options: FieldOptions): FieldView => {
	const units = emptyUnits()
	const rec = reconciler()
	let opts = options
	let derivation!: Derivation
	let buffer = ''
	let bufferUnit: SegmentUnit | null = null
	let committed: string | null = null
	let cacheKey = ''
	let granularity: Granularity

	const locale = () => opts.locale ?? 'en-US'

	const inferFor = (next: FieldOptions, value?: string | null) => inferGranularity(next.kind, {
		value,
		defaultValue: next.defaultValue,
		placeholderValue: next.placeholderValue,
		granularity: next.granularity,
	})

	// The inference inputs the consumer controls; a changed key legitimizes re-inference.
	const inferKey = (next: FieldOptions) =>
		[next.granularity ?? '', next.defaultValue ?? '', next.placeholderValue ?? ''].join('|')

	const configure = (next: FieldOptions) => {
		opts = next
		const key = [next.kind, locale(), granularity, next.hourCycle ?? 0].join('|')
		if (key === cacheKey) return
		cacheKey = key
		const previous = derivation?.hourCycle
		derivation = derive({ kind: next.kind, locale: locale(), granularity, hourCycle: next.hourCycle })
		if (previous && previous !== derivation.hourCycle) convertHour(units, derivation.hourCycle)
		buffer = ''
		bufferUnit = null
	}

	const adopt = (value: string | null) => {
		const parsed = value == null ? null : fromISO(opts.kind, value, derivation.hourCycle)
		if (value != null && !parsed) console.warn(`[segments] invalid ${opts.kind} value: "${value}"`)
		Object.assign(units, parsed ?? emptyUnits())
		buffer = ''
		bufferUnit = null
		committed = parsed ? value : null
	}

	granularity = inferFor(options)
	configure(options)
	if (options.defaultValue != null) adopt(options.defaultValue)
	// Prime with the initial value so a controlled sync that merely agrees with
	// the pristine state (a range echo syncing the untouched side) never clobbers.
	rec.emit(committed)

	const segmentOf = (unit: SegmentUnit) => derivation.segments.find(segment => segment.type === unit)

	const boundsFor = (unit: SegmentUnit) => {
		const segment = segmentOf(unit)
		return {
			min: segment?.min ?? 0,
			max: unit === 'day' ? daysInMonth(units.year, units.month) : segment?.max ?? 0,
		}
	}

	const complete = () => derivation.units.every(unit => units[unit] != null)

	// Commit machinery: transient invalids stay representable while entering;
	// the completing keystroke — and every mutation of a complete field —
	// constrains eagerly, so screen, value, and hidden input never diverge.
	// Complete → incomplete emits null. min/max/unavailable never block.
	const resolve = (advance?: boolean, retreat?: boolean): InputResult => {
		let emit: string | null | undefined
		if (complete()) {
			constrain(units)
			const value = toISO(opts.kind, units, { hourCycle: derivation.hourCycle, seconds: derivation.withSeconds })
			if (value != null && value !== committed) {
				committed = value
				rec.emit(value)
				emit = value
			}
		} else if (committed != null) {
			committed = null
			rec.emit(null)
			emit = null
		}
		return { handled: true, advance, retreat, emit }
	}

	const seed = (): Units => {
		if (opts.placeholderValue != null) {
			const parsed = fromISO(opts.kind, opts.placeholderValue, derivation.hourCycle)
			if (parsed) return parsed
		}
		// Default today/now, client-resolved (the local clock is an Intl edge).
		const now = new Date()
		const values: Units = {
			year: now.getFullYear(),
			month: now.getMonth() + 1,
			day: now.getDate(),
			hour: now.getHours(),
			minute: now.getMinutes(),
			second: now.getSeconds(),
			dayPeriod: null,
		}
		if (derivation.hourCycle === 'h12') convertHour(values, 'h12')
		return values
	}

	const retarget = (unit: SegmentUnit) => {
		if (bufferUnit !== unit) {
			buffer = ''
			bufferUnit = unit
		}
	}

	const reason = () => validate(opts.kind, units, derivation.units, {
		min: opts.min,
		max: opts.max,
		unavailable: opts.unavailable,
		hourCycle: derivation.hourCycle,
		seconds: derivation.withSeconds,
	})

	return {
		get segments() { return derivation.segments },
		get units() { return units },
		get hourCycle() { return derivation.hourCycle },
		get periods() { return derivation.periods },
		get monthNames() { return derivation.monthNames },

		sync(value, next) {
			const target = next ?? opts
			// Granularity is latched: only a genuinely EXTERNAL value (after the
			// reconciler check) or changed inference inputs re-infer it. A null
			// echo of complete→incomplete must not narrow the shape — that
			// strands units (seconds) and silently truncates the next commit.
			const external = rec.observe(value)
			if (external) granularity = inferFor(target, value as string | null)
			else if (inferKey(target) !== inferKey(opts)) {
				granularity = inferFor(target, committed)
				// The latch holds while the would-be-dropped segment has a value.
				if (granularity !== 'second' && units.second != null) granularity = 'second'
			}
			configure(target)
			if (external) adopt(value as string | null)
		},

		text(unit) {
			if (bufferUnit === unit && buffer) return buffer
			const value = units[unit]
			if (value == null) return ''
			if (unit === 'dayPeriod') return derivation.periods[value] ?? ''
			return pad(value, segmentOf(unit)?.width ?? 1)
		},

		bounds: boundsFor,

		type(unit, key) {
			if (!derivation.units.includes(unit)) return { handled: false }
			retarget(unit)
			if (/^\d$/.test(key) && unit !== 'dayPeriod') {
				if (!/^\d*$/.test(buffer)) buffer = ''
				const { min, max } = boundsFor(unit)
				const state = typeDigit(buffer, key, min, max, segmentOf(unit)?.digits ?? 2)
				buffer = state.buffer
				if (state.value == null) return { handled: true }
				units[unit] = state.value
				return resolve(state.advance)
			}
			if (unit === 'month' && derivation.monthNames.length) {
				const match = matchName(locale(), derivation.monthNames, units.month == null ? null : units.month - 1, buffer, key)
				if (!match) return { handled: false }
				buffer = match.buffer
				units.month = match.index + 1
				return resolve(match.unique)
			}
			if (unit === 'dayPeriod') {
				const match = matchName(locale(), derivation.periods, units.dayPeriod, '', key)
				if (!match) return { handled: false }
				units.dayPeriod = match.index
				return resolve(match.unique)
			}
			return { handled: false }
		},

		erase(unit) {
			if (!derivation.units.includes(unit)) return { handled: false }
			retarget(unit)
			if (unit === 'dayPeriod') {
				buffer = ''
				if (units.dayPeriod == null) return { handled: true, retreat: true }
				units.dayPeriod = null
				return resolve()
			}
			// An active letter buffer (month-name typing) erases by letter:
			// strip one, re-match the names, placeholder when it empties.
			if (unit === 'month' && buffer && !/^\d*$/.test(buffer)) {
				buffer = buffer.slice(0, -1)
				const match = buffer ? matchName(locale(), derivation.monthNames, null, '', buffer) : null
				units.month = match ? match.index + 1 : null
				return resolve()
			}
			const state = eraseDigit(units[unit], buffer)
			if (state.retreat) return { handled: true, retreat: true }
			buffer = state.buffer
			units[unit] = state.value
			return resolve()
		},

		spin(unit, action) {
			if (!derivation.units.includes(unit)) return { handled: false }
			buffer = ''
			bufferUnit = unit
			const { min, max } = boundsFor(unit)
			const current = units[unit]
			if ('edge' in action) units[unit] = action.edge === 'min' ? min : max
			else if (current == null) units[unit] = clamp(seed()[unit] ?? min, min, max)
			else units[unit] = stepValue(unit, current, action, min, max, opts.step ?? 1)
			return resolve()
		},

		merge(next) {
			buffer = ''
			bufferUnit = null
			for (const unit of EDITABLE) {
				const value = next[unit]
				if (value !== undefined) units[unit] = value
			}
			return resolve()
		},

		placeholder: () => seed(),

		clear() {
			buffer = ''
			bufferUnit = null
			Object.assign(units, emptyUnits())
			return resolve()
		},

		reset() {
			adopt(opts.defaultValue ?? null)
		},

		blur() {
			buffer = ''
			bufferUnit = null
		},

		value: () => committed,
		complete,
		reason,

		message() {
			const why = reason()
			if (!why) return null
			return opts.errorMessage?.(why) ?? defaultMessage(why, { kind: opts.kind, locale: locale(), hourCycle: derivation.hourCycle })
		},
	}
}
