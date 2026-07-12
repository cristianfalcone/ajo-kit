import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, controlled, dom, id, listen, restore, roving, spin, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { compile, type Availability, type AvailabilityMatcher } from './availability'
import type { FixedArgs, OmitArg } from './utils'
import { Calendar, type CalendarArgs, type CalendarCommonArgs, type CalendarDateRange, type CalendarMatcher } from './calendar'
import { FieldContext } from './field'
import { contentAttrs, datasetPlacement, floating, triggerAttrs, type FloatingAlign, type FloatingSide, type FloatingView } from './floating'
import {
	defaultMessage,
	field,
	formatValue,
	fromISO,
	isReversed,
	timeRun,
	unitLabel,
	type FieldOptions,
	type FieldView,
	type Granularity,
	type InputResult,
	type Reason,
	type Segment,
	type SegmentUnit,
	type SegmentsKind,
	type Units,
} from './segments'
import { flag } from './utils'

export type InputDateSide = 'from' | 'to'

export type InputDateRangeValue = {
	/** Range start in the family's own format; null while empty. */
	from: string | null
	/** Range end in the family's own format; null while empty. */
	to: string | null
}

export type InputDateValue<Range extends boolean = false> = Range extends true ? InputDateRangeValue : string

export type InputDatePreset<Range extends boolean = boolean> = {
	/** Preset button label. */
	label: string
	/** Committed on pick, in the family's own value format. */
	value: InputDateValue<Range>
}

type InputDateCalendarOwnedArgs = 'allowNonContiguous' | 'defaultSelected' | 'mode' | 'onSelect' | 'selected' | 'unavailable'

export type InputDateCalendarArgs = OmitArg<CalendarCommonArgs, InputDateCalendarOwnedArgs> & {
	/** Calendar implementation; the themed layer injects its Calendar here. */
	component?: Stateless<CalendarArgs>
} & FixedArgs<InputDateCalendarOwnedArgs>

type CommonArgs<Range extends boolean> = WithChildren<OmitArg<IntrinsicElements['div'], 'children' | 'defaultValue' | 'onchange'> & {
	/** Allow a range to span unavailable days without treating its interior gaps as selected. */
	allowNonContiguous?: boolean
	/** Range mode: two field groups, `{ from, to } | null` value. */
	range?: Range
	/** Controlled value; null means controlled-empty. */
	value?: InputDateValue<Range> | null
	/** Initial value for uncontrolled usage; what a form reset restores. */
	defaultValue?: InputDateValue<Range>
	/** Called on every commit; null when the field empties. */
	onValueChange?: (value: InputDateValue<Range> | null, event?: Event) => void
	/** BCP 47 tag or `{ code }`; falls back to `<html lang>`, then 'en-US'. Never navigator. */
	locale?: string | { code?: string }
	/** Lower bound in the family's format; stamps invalid, never blocks commits. */
	min?: string
	/** Upper bound in the family's format; stamps invalid, never blocks commits. */
	max?: string
	/** Unavailable dates or times; remain committable and stamp reason-coded invalid state. */
	unavailable?: AvailabilityMatcher | AvailabilityMatcher[]
	/** Seeds the first arrow press on an empty segment; never emitted by itself. */
	placeholderValue?: string
	/** Reason-coded message override; undefined falls back to the localized default. */
	errorMessage?: (reason: Reason) => string | undefined
	/** Screen-reader label for an empty editable segment. */
	emptyLabel?: string
	/** Hidden input name; range submits `name[from]` / `name[to]`. */
	name?: string
	/** Mirrors to aria-required only. */
	required?: boolean
	/** Unfocusable segments, no submission. */
	disabled?: boolean
	/** Focusable no-op segments. */
	readOnly?: boolean
	/** Additional classes. */
	class?: string
}> & FixedArgs<'onchange'>

type PopupArgs<Range extends boolean> = {
	/** Opt into the calendar popover; an object forwards args to InputDateCalendar. */
	calendar?: boolean | InputDateCalendarArgs
	/** Preset values rendered by InputDatePresets; a pick commits and closes. */
	presets?: InputDatePreset<Range>[]
	/** Close on a pick. Defaults to single/range-complete for dates, and false while a datetime time surface is composed. */
	closeOnSelect?: boolean
	/** Controlled popover state. */
	open?: boolean
	/** Initial popover state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Called when the popover opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
}

type TimeArgs = {
	/** Overrides the locale's resolved hour cycle. */
	hourCycle?: 12 | 24
	/** Segment shape for an empty field; values with seconds force the segment. */
	granularity?: 'minute' | 'second'
	/** Minute arrow step; typing and PageUp/Down are unaffected. */
	step?: number
}

export type InputDateArgs<Range extends boolean = false> = CommonArgs<Range> & PopupArgs<Range>

export type InputTimeArgs<Range extends boolean = false> = CommonArgs<Range> & TimeArgs

export type InputDateTimeArgs<Range extends boolean = false> = CommonArgs<Range> & PopupArgs<Range> & TimeArgs

export type InputDateFieldArgs = OmitArg<IntrinsicElements['div'], 'children'> & {
	/** Which range side this group edits; required in range mode, absent in single. */
	side?: InputDateSide
	/** Accessible group label; range sides default to Start/End date. */
	label?: string
	/** Class for each editable segment. */
	segmentClass?: string
	/** Class for literal separators. */
	literalClass?: string
	/** Additional classes. */
	class?: string
} & FixedArgs<'children'>

export type InputDateTimeFieldArgs = OmitArg<IntrinsicElements['div'], 'children'> & {
	/** Which range side this time surface edits; absent in single mode. */
	side?: InputDateSide
	/** Accessible group label; defaults to Time, Start time, or End time. */
	label?: string
	/** Class for each editable time segment. */
	segmentClass?: string
	/** Class for literal separators between time segments. */
	literalClass?: string
	/** Additional classes. */
	class?: string
} & FixedArgs<'children'>

export type InputDateTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional classes. */
	class?: string
	iconClass?: string
}>

export type InputDateContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Preferred side relative to the field group. */
	side?: FloatingSide
	/** Alignment relative to the field group. */
	align?: FloatingAlign
	/** Gap between anchor and content in pixels. */
	sideOffset?: number
	/** Pixel shift along the alignment axis. */
	alignOffset?: number
	/** Viewport padding used by fallback placement. */
	collisionPadding?: number
	/** Additional classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}>

export type InputDateClearArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional classes. */
	class?: string
	iconClass?: string
}>

export type InputDatePresetsArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional classes. */
	class?: string
	buttonClass?: string
}>

type PublicValue = string | InputDateRangeValue | null
type InputDateSurface = 'field' | 'popover'

type InputDateRootArgs = WithChildren<{
	allowNonContiguous?: boolean
	calendar?: boolean | InputDateCalendarArgs
	closeOnSelect?: boolean
	defaultOpen?: boolean
	defaultValue?: string | InputDateRangeValue
	disabled?: boolean
	emptyLabel?: string
	errorMessage?: (reason: Reason) => string | undefined
	granularity?: Granularity
	hourCycle?: 12 | 24
	kind: SegmentsKind
	locale?: string | { code?: string }
	max?: string
	min?: string
	name?: string
	onOpenChange?: (open: boolean, event?: Event) => void
	onValueChange?: (value: PublicValue, event?: Event) => void
	open?: boolean
	placeholderValue?: string
	presets?: InputDatePreset[]
	range?: boolean
	readOnly?: boolean
	required?: boolean
	step?: number
	unavailable?: AvailabilityMatcher | AvailabilityMatcher[]
	value?: string | InputDateRangeValue | null
}>

type InputDateContextValue = {
	allowNonContiguous: boolean
	applyPreset: (value: string | InputDateRangeValue, event: Event) => void
	calendarDisabled: (user?: CalendarMatcher | CalendarMatcher[]) => CalendarMatcher[] | undefined
	calendarUnavailable: AvailabilityMatcher | AvailabilityMatcher[] | undefined
	clear: (event?: Event) => void
	contentId: string
	daySelected: () => Date | null
	disabled: boolean
	field: (side: InputDateSide) => FieldView
	groupAttrs: (side: InputDateSide, label?: string, surface?: InputDateSurface) => Record<string, unknown>
	hasValue: boolean
	kind: SegmentsKind
	locale: string
	message: string | null
	monthOf: () => Date | undefined
	onMonthChange: (month: Date, event?: Event) => void
	open: boolean
	pickDay: (next: Date | null, event: Event) => void
	pickRange: (next: CalendarDateRange | null, event: Event) => void
	popup: (part: string) => boolean
	presets: InputDatePreset[]
	range: boolean
	rangeSelected: () => CalendarDateRange | null
	readOnly: boolean
	segmentAttrs: (side: InputDateSide, segment: Segment, label?: string, surface?: InputDateSurface) => Record<string, unknown>
	segmentText: (side: InputDateSide, segment: Segment, surface?: InputDateSurface) => string
	setContent: (element: HTMLDivElement | null) => void
	setGroup: (side: InputDateSide, element: HTMLElement | null) => void
	registerTimeSurface: (element: HTMLDivElement) => void
	unregisterTimeSurface: (element: HTMLDivElement) => void
	setTrigger: (element: HTMLButtonElement | null) => void
	timeSurface: (part: string) => boolean
	toggleOpen: (event: Event) => void
	triggerId: string
}

const InputDateContext = context<InputDateContextValue | null>(null)

// Locale resolution is gated on document, NEVER navigator: Node ships a global
// navigator and the ambient machine locale is banned on both passes.
const resolveLocale = (locale: string | { code?: string } | undefined): string => {
	const code = typeof locale === 'string' ? locale : locale?.code
	if (code) return code
	if (typeof document !== 'undefined' && document.documentElement.lang) return document.documentElement.lang
	return 'en-US'
}

const InputDateRoot: Stateful<InputDateRootArgs> = function* (initial) {
	let kind = initial.kind
	const rootId = id('input-date')
	const domReady = dom(this)
	// iOS VoiceOver cannot focus spinbuttons: role textbox, no aria-value*.
	// SSR emits spinbutton; the hydration attr rewrite is an accepted divergence.
	const ios = domReady && typeof navigator !== 'undefined' &&
		(/iP(ad|hone|od)/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1))
	const warned = new Set<string>()
	const groups: Record<InputDateSide, HTMLElement | null> = { from: null, to: null }
	const timeSurfaces = new Set<HTMLDivElement>()
	let closeOnSelect: boolean | undefined
	let composing: { side: InputDateSide; unit: SegmentUnit; element: HTMLElement; text: string } | null = null
	let controlId = `${rootId}-control`
	let availabilitySource = initial.unavailable
	let availability = compile(initial.unavailable)
	let boundsSource: string | undefined
	let boundsAvailability: Availability | undefined
	let calendarUserSource: CalendarMatcher | CalendarMatcher[] | undefined
	let calendarUserAvailability: Availability | undefined
	let allowNonContiguous = Boolean(initial.allowNonContiguous)
	let disabled = Boolean(initial.disabled)
	let isRange = Boolean(initial.range)
	let locale = resolveLocale(initial.locale)
	let onOpenChange: InputDateRootArgs['onOpenChange']
	let onValueChange: InputDateRootArgs['onValueChange']
	let pendingFocus = false
	let pop: FloatingView<HTMLButtonElement, HTMLDivElement>
	let presets: InputDatePreset[] = []
	let readOnly = Boolean(initial.readOnly)
	let required = Boolean(initial.required)
	let visibleMonth: Date | undefined

	const unavailableValue = (value: string) => availability?.value(kind, value) ?? false

	const sideDefault = (value: string | InputDateRangeValue | undefined, side: InputDateSide): string | undefined => {
		if (value == null) return undefined
		if (typeof value === 'string') return side === 'from' ? value : undefined
		return value[side] ?? undefined
	}

	const optionsFor = (side: InputDateSide, args: InputDateRootArgs): FieldOptions => ({
		kind,
		locale,
		granularity: args.granularity,
		hourCycle: args.hourCycle,
		step: args.step,
		placeholderValue: args.placeholderValue,
		defaultValue: sideDefault(args.defaultValue, side),
		min: args.min,
		max: args.max,
		unavailable: availability ? unavailableValue : undefined,
		errorMessage: args.errorMessage,
	})

	const fields: Record<InputDateSide, FieldView> = {
		from: field(optionsFor('from', initial)),
		to: field(optionsFor('to', initial)),
	}

	const composeValue = (): PublicValue => {
		const from = fields.from.value()
		if (!isRange) return from
		const to = fields.to.value()
		return from == null && to == null ? null : { from, to }
	}

	const valueState = controlled<PublicValue>(this, {
		fallback: initial.defaultValue ?? null,
		onChange: (next, event) => onValueChange?.(next, event),
	})

	const sideValue = (side: InputDateSide): string | null | undefined => {
		if (!valueState.controlled) return undefined
		const value = valueState.value
		if (value == null) return null
		if (typeof value === 'string') return side === 'from' ? value : null
		return value[side]
	}

	// Range emissions compose once: both sides may merge in one gesture.
	const emitIfChanged = (results: InputResult[], event?: Event) => {
		if (results.every(result => result.emit === undefined)) return
		valueState.set(composeValue(), event)
	}

	const segmentsOf = (surface: InputDateSurface = 'field', rendered = true): HTMLElement[] =>
		domReady
			? Array.from(this.querySelectorAll<HTMLElement>('[data-segment]'))
				.filter(item => item.dataset.surface === surface && (!rendered || item.offsetParent !== null))
			: []

	const segmentOf = (event: Event): HTMLElement | null =>
		event.target instanceof Element ? event.target.closest<HTMLElement>('[data-segment]') : null

	const sideOf = (segment: HTMLElement): InputDateSide =>
		(segment.dataset.side as InputDateSide) ?? 'from'

	const surfaceOf = (segment: HTMLElement): InputDateSurface =>
		segment.dataset.surface === 'popover' ? 'popover' : 'field'

	const unitOf = (segment: HTMLElement): SegmentUnit => segment.dataset.segment as SegmentUnit

	// Each rendered surface owns one flat list. Range sides stay adjacent within
	// the field or popover, but navigation never crosses between those surfaces.
	const moveFocus = (from: HTMLElement, step: number) => {
		const list = segmentsOf(surfaceOf(from))
		list[list.indexOf(from) + step]?.focus()
	}

	const apply = (result: InputResult, event: Event, segment: HTMLElement): boolean => {
		if (!result.handled) return false
		emitIfChanged([result], event)
		if (result.advance) moveFocus(segment, 1)
		if (result.retreat) moveFocus(segment, -1)
		this.next()
		return true
	}

	const focusMemory = restore(this)

	pop = floating<HTMLButtonElement, HTMLDivElement>(this, {
		prefix: 'input-date',
		initialOpen: Boolean(initial.open ?? initial.defaultOpen),
		disabled: () => disabled,
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		// The popover anchors to the field group, not the 28px icon trigger.
		reference: () => groups.from ?? groups.to,
		placement: datasetPlacement(() => pop.content, {
			side: 'bottom',
			align: 'start',
			sideOffset: 6,
			padding: 8,
			constrain: 'height',
		}),
		dismiss: {
			escape: false,
			outside: true,
			onDismiss: event => setOpen(false, event),
		},
		onSync: opened => {
			// onSync fires on every render pass while open: the autofocus is
			// consumed once per open transition (select/dropdown pendingFocus
			// pattern), so chevron paging and typing never lose focus.
			if (!opened || !pendingFocus) {
				pendingFocus = false
				return
			}
			pendingFocus = false
			if (!pop.content) return
			// The dialog autofocuses the calendar: selected day, today, first enabled.
			const target = pop.content.querySelector<HTMLElement>('[data-slot="calendar-day-button"][data-state="selected"]:not(:disabled)')
				?? pop.content.querySelector<HTMLElement>('[data-slot="calendar-day-button"][data-today]:not(:disabled)')
				?? pop.content.querySelector<HTMLElement>('[data-slot="calendar-day-button"]:not(:disabled)')
				?? pop.content
			target.focus()
		},
	})

	const setOpen = (next: boolean, event?: Event) => {
		if (disabled && next) return
		if (next === pop.open) return
		if (next) {
			// A fresh session follows the committed value again.
			visibleMonth = undefined
			pendingFocus = true
		} else {
			// Keyboard opens restore the opening segment, pointer opens the trigger;
			// a pointerdown landing back on our own field/segments (the root
			// pointerdown close path) keeps the click's own focus instead.
			const active = document.activeElement
			const clickedInside = event?.type === 'pointerdown' && event.target instanceof Node && this.contains(event.target)
			if (active instanceof HTMLElement && pop.content?.contains(active) && !clickedInside) focusMemory.restore()
			else focusMemory.capture(null)
		}
		pop.setOpen(next, event)
	}

	const toggleOpen = (event: Event) => {
		const next = !pop.open
		if (next) focusMemory.capture(pop.trigger)
		setOpen(next, event)
	}

	const setGroup = (side: InputDateSide, element: HTMLElement | null) => {
		groups[side] = element
		if (element && pop.open) pop.place()
	}

	const popup = (part: string) => {
		if (kind !== 'time') return true
		if (!warned.has(part)) {
			warned.add(part)
			console.warn(`[input-date] <${part}> has no effect under InputTime; popup parts require a date family root.`)
		}
		return false
	}

	const timeSurface = (part: string) => {
		if (kind === 'datetime') return true
		if (!warned.has(part)) {
			warned.add(part)
			console.warn(`[input-date] <${part}> has no effect outside InputDateTime.`)
		}
		return false
	}

	const hasTimeSurface = () => timeSurfaces.size > 0

	// Calendar wiring:

	const dateOfValue = (side: InputDateSide): Date | undefined => {
		const units = fields[side].units
		return units.year != null && units.month != null && units.day != null
			? new Date(units.year, units.month - 1, units.day, 12)
			: undefined
	}

	const daySelected = (): Date | null => dateOfValue('from') ?? null

	const rangeSelected = (): CalendarDateRange | null => {
		const from = dateOfValue('from')
		const to = dateOfValue('to')
		return from || to ? { from, to } : null
	}

	const monthOf = () => visibleMonth ?? dateOfValue('from')

	const onMonthChange = (month: Date, event?: Event) => {
		const slot = event?.target instanceof Element ? event.target.closest<HTMLElement>('[data-slot]')?.dataset.slot : undefined
		this.next(() => visibleMonth = month)
		// The Calendar re-creates its keyed month subtree (nav buttons included):
		// when paging drops focus with it, land on the equivalent control.
		if (!domReady || !slot) return
		const active = document.activeElement
		if (active && active !== document.body) return
		pop.content?.querySelector<HTMLElement>(`[data-slot="${slot}"]`)?.focus()
	}

	const dayOfBound = (value: string | undefined): Date | undefined => {
		if (!value) return undefined
		const units = fromISO(kind, value)
		return units && units.year != null && units.month != null && units.day != null
			? new Date(units.year, units.month - 1, units.day, 12)
			: undefined
	}

	const syncAvailability = (args: InputDateRootArgs) => {
		if (args.unavailable !== availabilitySource) {
			availabilitySource = args.unavailable
			availability = compile(args.unavailable)
		}
		const bounds = `${args.min ?? ''}\0${args.max ?? ''}`
		if (bounds !== boundsSource) {
			boundsSource = bounds
			const matcher: CalendarMatcher[] = []
			const before = dayOfBound(args.min)
			const after = dayOfBound(args.max)
			if (before) matcher.push({ before })
			if (after) matcher.push({ after })
			boundsAvailability = compile(matcher)
		}
	}

	const hardDisabled = (date: Date) =>
		Boolean(calendarUserAvailability?.day(date) || boundsAvailability?.day(date))
	const hardDisabledMatcher: CalendarMatcher[] = [hardDisabled]

	const calendarDisabled = (user?: CalendarMatcher | CalendarMatcher[]): CalendarMatcher[] | undefined => {
		if (user !== calendarUserSource) {
			calendarUserSource = user
			calendarUserAvailability = compile(user)
		}
		return calendarUserAvailability || boundsAvailability ? hardDisabledMatcher : undefined
	}

	const datePatch = (editor: FieldView, date: Date): Partial<Units> => {
		const patch: Partial<Units> = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
		if (kind === 'datetime') {
			// A picked day must commit: empty time units seed from the placeholder.
			const units = editor.units
			const seeded = editor.placeholder()
			if (units.hour == null) patch.hour = seeded.hour
			if (units.minute == null) patch.minute = seeded.minute
			if (units.second == null && editor.segments.some(segment => segment.type === 'second')) patch.second = seeded.second
			if (units.dayPeriod == null && editor.hourCycle === 'h12') patch.dayPeriod = seeded.dayPeriod
		}
		return patch
	}

	const emptyDate: Partial<Units> = { year: null, month: null, day: null }

	const pickDay = (next: Date | null, event: Event) => {
		if (disabled || readOnly) return
		const result = fields.from.merge(next ? datePatch(fields.from, next) : emptyDate)
		emitIfChanged([result], event)
		if (closeOnSelect ?? (Boolean(next) && !hasTimeSurface())) setOpen(false, event)
		this.next()
	}

	const pickRange = (next: CalendarDateRange | null, event: Event) => {
		if (disabled || readOnly) return
		const patchFor = (editor: FieldView, date: Date | undefined) => date ? datePatch(editor, date) : emptyDate
		emitIfChanged([
			fields.from.merge(patchFor(fields.from, next?.from)),
			fields.to.merge(patchFor(fields.to, next?.to)),
		], event)
		if (closeOnSelect ?? (Boolean(next?.from && next?.to) && !hasTimeSurface())) setOpen(false, event)
		this.next()
	}

	const applyPreset = (value: string | InputDateRangeValue, event: Event) => {
		if (disabled || readOnly) return
		const mergeSide = (side: InputDateSide, next: string | null): InputResult => {
			if (next == null) return fields[side].clear()
			const units = fromISO(kind, next, fields[side].hourCycle)
			if (!units) {
				console.warn(`[input-date] invalid ${kind} preset value: "${next}"`)
				return { handled: false }
			}
			return fields[side].merge(units)
		}
		const results = typeof value === 'string'
			? [mergeSide('from', value)]
			: [mergeSide('from', value.from), mergeSide('to', value.to)]
		emitIfChanged(results, event)
		setOpen(false, event)
		this.next()
	}

	const clearValue = (event?: Event) => {
		if (disabled || readOnly) return
		const results = [fields.from.clear()]
		if (isRange) results.push(fields.to.clear())
		emitIfChanged(results, event)
		// The clear button unmounts with the value (combobox precedent:
		// clearing refocuses the input): focus lands on the first segment.
		if (domReady) queueMicrotask(() => segmentsOf('field')[0]?.focus())
		this.next()
	}

	// A sync reshape (external narrower value, hourCycle flip) can drop the
	// focused segment: move focus to the nearest surviving one, preferring the
	// previous in display order, so it never falls to body.
	const relocateFocus = () => {
		const active = document.activeElement
		if (!(active instanceof HTMLElement) || !active.dataset.segment || !this.contains(active)) return
		const survives = (item: HTMLElement) =>
			fields[sideOf(item)].segments.some(segment => segment.type === unitOf(item))
		if (survives(active)) return
		const surface = surfaceOf(active)
		const list = segmentsOf(surface, false)
		const index = list.indexOf(active)
		const target = list.slice(0, Math.max(index, 0)).reverse().find(survives) ?? list.slice(index + 1).find(survives)
		if (!target) return
		const side = sideOf(target)
		const unit = unitOf(target)
		// After the render pass removes the segment, focus its surviving neighbor.
		queueMicrotask(() => {
			const current = document.activeElement
			if (current instanceof HTMLElement && current !== document.body && this.contains(current)) return
			segmentsOf(surface).find(item => sideOf(item) === side && unitOf(item) === unit)?.focus()
		})
	}

	// Keyboard: spin resolves the APG protocol, roving is Left/Right only.
	const stepper = spin(this, {
		onMove: (move, event) => {
			const segment = segmentOf(event)
			if (!segment || readOnly || disabled) return
			const side = sideOf(segment)
			apply(fields[side].spin(unitOf(segment), move), event, segment)
		},
	})

	const nav = roving(this, {
		items: () => {
			const active = document.activeElement
			return segmentsOf(active instanceof HTMLElement && active.dataset.segment ? surfaceOf(active) : 'field')
		},
		orientation: () => 'horizontal',
		dir: () => domReady && getComputedStyle(this).direction === 'rtl' ? 'rtl' : 'ltr',
		loop: () => false,
		onMove: target => target.focus(),
	})

	listen(this, 'keydown', event => {
		// Consumed only while open, so an ancestor Dialog does not also close;
		// Escape never clears the value.
		if (event.key === 'Escape') {
			if (!pop.open) return
			event.preventDefault()
			setOpen(false, event)
			return
		}
		const segment = segmentOf(event)
		if (!segment) return
		const side = sideOf(segment)
		const unit = unitOf(segment)
		// Pipeline contract: Alt+ArrowDown → spin.handle → roving Left/Right.
		// Alt-combos never reach spin: without popup parts composed,
		// Alt+ArrowDown is a pinned no-op, not a step.
		if (event.altKey && event.key.startsWith('Arrow')) {
			if (event.key === 'ArrowDown' && pop.content) {
				event.preventDefault()
				focusMemory.capture(segment)
				setOpen(true, event)
			}
			return
		}
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
			event.preventDefault()
			return
		}
		// Hardware delete acts here and preventDefaults, so the subsequent
		// beforeinput never double-fires; mobile deletion arrives there instead.
		if (event.key === 'Backspace' || event.key === 'Delete') {
			event.preventDefault()
			if (!readOnly && !disabled) apply(fields[side].erase(unit), event, segment)
			return
		}
		if (event.key === 'Enter') {
			event.preventDefault()
			moveFocus(segment, 1)
			return
		}
		if (!readOnly && stepper.handle(event)) return
		if (!readOnly && (event.key === '+' || event.key === '-')) {
			event.preventDefault()
			apply(fields[side].spin(unit, { step: event.key === '+' ? 1 : -1 }), event, segment)
			return
		}
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') nav.handle(event)
	})

	listen(this, 'beforeinput', event => {
		const segment = segmentOf(event)
		if (!segment) return
		// Every cancelable edit is ours (insertParagraph and paste included).
		if (event.cancelable) event.preventDefault()
		if (disabled || readOnly) return
		const side = sideOf(segment)
		const unit = unitOf(segment)
		if (event.inputType === 'insertCompositionText') {
			// Uncancelable: snapshot now, restore on input, feed the engine on
			// compositionend so reconciliation and the restore never double-write.
			composing ??= { side, unit, element: segment, text: segment.textContent ?? '' }
			return
		}
		if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward') {
			apply(fields[side].erase(unit), event, segment)
			return
		}
		if (event.inputType === 'insertText' && event.data) {
			for (const key of event.data) apply(fields[side].type(unit, key), event, segment)
		}
	})

	listen(this, 'input', event => {
		if (!composing) return
		const segment = segmentOf(event)
		if (segment !== composing.element) return
		segment.textContent = composing.text
		this.next()
	})

	listen(this, 'compositionend', event => {
		if (!composing) return
		const { side, unit, element } = composing
		composing = null
		if (!disabled && !readOnly && event.data) {
			for (const key of event.data) apply(fields[side].type(unit, key), event, element)
		}
		this.next()
	})

	listen(this, 'paste', event => {
		if (segmentOf(event)) event.preventDefault()
	})

	listen(this, 'pointerdown', event => {
		if (event.button) return
		const target = event.target instanceof Element ? event.target : null
		if (!target) return
		// Dismiss never sees clicks inside the root (its host containment covers
		// everything): clicking back into the field/chrome/segments while open
		// closes here, and setOpen skips the restore so the click's focus wins.
		if (pop.open && !pop.content?.contains(target) && !pop.trigger?.contains(target)) setOpen(false, event)
		const segment = target.closest<HTMLElement>('[data-segment]')
		if (segment) {
			// Focus is ours to place: never drop a caret into the contenteditable.
			event.preventDefault()
			if (!disabled) segment.focus()
			return
		}
		const group = target.closest<HTMLElement>('[data-slot="input-date-field"]')
		if (!group || !this.contains(group)) return
		// The trigger addon (and any interactive chrome) is exempt.
		if (target.closest('[data-slot="input-date-trigger"], a, button, input, select, textarea')) return
		event.preventDefault()
		if (disabled) return
		const list = Array.from(group.querySelectorAll<HTMLElement>('[data-segment]'))
		const filled = [...list].reverse().find(item => item.dataset.placeholder !== 'true')
		;(filled ?? list[0])?.focus()
	})

	listen(this, 'focusout', event => {
		const segment = segmentOf(event)
		if (!segment) return
		fields[sideOf(segment)].blur()
		this.next()
	})

	if (domReady) {
		// Segments never hold a selection: force-collapse anything that forms.
		document.addEventListener('selectionchange', () => {
			const selection = document.getSelection()
			if (!selection || selection.isCollapsed || !selection.anchorNode) return
			const anchor = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode.parentElement
			if (anchor?.closest('[data-segment]') && this.contains(anchor)) selection.collapseToEnd()
		}, { signal: this.signal })

		// No segment is labelable, so the label's `for` dangles: click focuses first.
		document.addEventListener('click', event => {
			const label = event.target instanceof Element ? event.target.closest('label') : null
			if (!label || label.getAttribute('for') !== controlId) return
			segmentsOf('field')[0]?.focus()
		}, { signal: this.signal })

		// type=hidden resets its own value silently; segment state must follow.
		document.addEventListener('reset', event => {
			if (!(event.target instanceof HTMLFormElement) || !event.target.contains(this)) return
			if (valueState.controlled) return
			fields.from.reset()
			if (isRange) fields.to.reset()
			valueState.init(composeValue())
			this.next()
		}, { signal: this.signal })
	}

	for (const args of this) {
		const kindChanged = args.kind !== kind
		kind = args.kind
		syncAvailability(args)
		allowNonContiguous = Boolean(args.allowNonContiguous)
		closeOnSelect = args.closeOnSelect
		disabled = Boolean(args.disabled)
		isRange = Boolean(args.range)
		locale = resolveLocale(args.locale)
		const emptyLabel = args.emptyLabel ?? 'Empty'
		onOpenChange = args.onOpenChange
		onValueChange = args.onValueChange
		presets = args.presets ?? []
		readOnly = Boolean(args.readOnly)
		required = Boolean(args.required)

		valueState.sync(args.value)
		pop.sync(args.open == null ? undefined : Boolean(args.open))
		if (kindChanged && args.value === undefined) {
			fields.from.sync(sideDefault(args.defaultValue, 'from') ?? null, optionsFor('from', args))
			fields.to.sync(sideDefault(args.defaultValue, 'to') ?? null, optionsFor('to', args))
			valueState.init(composeValue())
		} else {
			fields.from.sync(sideValue('from'), optionsFor('from', args))
			if (isRange) fields.to.sync(sideValue('to'), optionsFor('to', args))
		}
		if (domReady) relocateFocus()

		const fieldCtx = FieldContext()
		controlId = fieldCtx?.ids.control ?? `${rootId}-control`
		const externalDescribedby = fieldCtx?.groupAttrs['aria-describedby']

		const reasonFrom = fields.from.reason()
		const reasonTo = isRange ? fields.to.reason() : null
		const reversed = isRange && isReversed(fields.from.value(), fields.to.value())
		const rangeFrom = isRange ? dateOfValue('from') : undefined
		const rangeTo = isRange ? dateOfValue('to') : undefined
		const unavailableRange = !allowNonContiguous && Boolean(rangeFrom && rangeTo && availability?.crosses(rangeFrom, rangeTo))
		const rangeReason: Reason | null = reversed
			? { code: 'reversed' }
			: unavailableRange
				? { code: 'unavailableRange' }
				: null
		const invalidOf = (side: InputDateSide) => (side === 'from' ? reasonFrom : reasonTo) != null || rangeReason != null
		const hourCycle = fields.from.hourCycle
		const message = fields.from.message()
			?? (isRange ? fields.to.message() : null)
			?? (rangeReason
				? args.errorMessage?.(rangeReason) ?? defaultMessage(rangeReason, { kind, locale, hourCycle })
				: null)

		const descriptionId = `${rootId}-description`
		const messageId = `${rootId}-message`
		const human = (side: InputDateSide) => {
			const committed = fields[side].value()
			return committed == null ? null : formatValue(committed, { kind, locale, hourCycle })
		}
		const formatted = isRange ? [human('from'), human('to')].filter(Boolean).join(' – ') : human('from')
		const descriptionText = formatted ? `${kind === 'time' ? 'Selected time' : 'Selected date'}: ${formatted}` : null

		const value = composeValue()
		const firstUnit = fields.from.segments.find(segment => segment.editable)?.type

		const sideLabel = (side: InputDateSide, override?: string) =>
			override ?? (kind === 'time' ? (side === 'from' ? 'Start time' : 'End time') : side === 'from' ? 'Start date' : 'End date')

		// describedby rides the first segment only until invalid stamps every one.
		const describedbyOf = (side: InputDateSide, first: boolean): string | undefined => {
			const parts: string[] = []
			if ((first || invalidOf(side)) && typeof externalDescribedby === 'string') parts.push(externalDescribedby)
			if (first && descriptionText) parts.push(descriptionId)
			if (invalidOf(side) && message) parts.push(messageId)
			return parts.join(' ') || undefined
		}

		const valuetextOf = (side: InputDateSide, unit: SegmentUnit): string => {
			const editor = fields[side]
			const current = editor.units[unit]
			if (current == null) return emptyLabel
			if (unit === 'month' && editor.monthNames.length) return `${current} – ${editor.monthNames[current - 1]}`
			if (unit === 'hour' && editor.hourCycle === 'h12' && editor.units.dayPeriod != null) return `${current} ${editor.periods[editor.units.dayPeriod]}`
			return editor.text(unit)
		}

		const groupAttrs = (side: InputDateSide, label?: string, surface: InputDateSurface = 'field'): Record<string, unknown> => {
			const invalid = invalidOf(side)
			const record: Record<string, unknown> = {
				'aria-disabled': flag(disabled),
				'aria-invalid': flag(invalid),
				'data-disabled': flag(disabled),
				'data-invalid': flag(invalid),
				'data-readonly': flag(readOnly),
				'data-side': side,
				'data-slot': surface === 'field' ? 'input-date-field' : 'input-date-time-field',
				'data-surface': surface,
				role: 'group',
			}
			if (surface === 'popover') {
				record['aria-label'] = label
			} else if (isRange) {
				// Each side is its own labelled group; the root carries the field label.
				record['aria-label'] = sideLabel(side, label)
			} else {
				if (label) record['aria-label'] = label
				if (fieldCtx) {
					record['aria-labelledby'] = fieldCtx.groupAttrs['aria-labelledby']
					record['aria-describedby'] = fieldCtx.groupAttrs['aria-describedby']
				}
			}
			return record
		}

		const segmentAttrs = (side: InputDateSide, segment: Segment, label?: string, surface: InputDateSurface = 'field'): Record<string, unknown> => {
			const unit = segment.type as SegmentUnit
			const editor = fields[side]
			const first = surface === 'field' && side === 'from' && unit === firstUnit
			const filled = editor.units[unit] != null
			const bounds = editor.bounds(unit)
			const unitName = unitLabel(locale, unit)
			const segmentId = first ? controlId : `${rootId}-${surface}-${side}-${unit}`
			// Self-reference technique: aria-labelledby chains the segment itself
			// (contributing its unit-name aria-label) with the field label, so
			// every segment announces "month, Date of birth" — iOS VoiceOver
			// does not announce groups. Range chains the outer label the same way.
			const labelId = fieldCtx?.ids.label
			const surfaceLabel = surface === 'popover'
				? label
				: isRange
					? sideLabel(side, label)
					: label
			const record: Record<string, unknown> = {
				'aria-describedby': describedbyOf(side, first),
				'aria-invalid': flag(invalidOf(side)),
				'aria-label': surfaceLabel ? `${unitName}, ${surfaceLabel}` : unitName,
				'aria-labelledby': surface === 'field' && labelId ? `${segmentId} ${labelId}` : undefined,
				'aria-readonly': readOnly ? 'true' : undefined,
				'aria-required': first && required ? 'true' : undefined,
				autocapitalize: 'off',
				autocorrect: 'off',
				'data-placeholder': flag(!editor.text(unit)),
				'data-side': side,
				'data-segment': unit,
				'data-slot': 'input-date-segment',
				'data-surface': surface,
				enterkeyhint: 'next',
				id: segmentId,
				role: ios ? 'textbox' : 'spinbutton',
				spellcheck: 'false',
				style: 'caret-color:transparent',
				tabindex: disabled ? undefined : '0',
			}
			if (!ios) {
				// dayPeriod carries no numeric value; empty units announce no valuenow.
				if (unit === 'dayPeriod') {
					record['aria-valuetext'] = filled ? editor.text(unit) : emptyLabel
				} else {
					record['aria-valuemin'] = bounds.min
					record['aria-valuemax'] = bounds.max
					if (filled) record['aria-valuenow'] = editor.units[unit]
					record['aria-valuetext'] = valuetextOf(side, unit)
				}
			}
			// Editability is stamped client-side only: server-rendered contenteditable
			// divs would be freely editable before hydration.
			if (domReady && !disabled && !readOnly) {
				record.contenteditable = 'true'
				if (unit !== 'dayPeriod') record.inputmode = 'numeric'
			}
			return record
		}

		const segmentText = (side: InputDateSide, segment: Segment, surface: InputDateSurface = 'field'): string => {
			const unit = segment.type as SegmentUnit
			// The focused segment holds its snapshot until compositionend.
			if (composing && composing.side === side && composing.unit === unit && surfaceOf(composing.element) === surface) return composing.text
			return fields[side].text(unit) || segment.placeholder
		}

		InputDateContext({
			allowNonContiguous,
			applyPreset,
			calendarDisabled,
			calendarUnavailable: availabilitySource,
			clear: clearValue,
			contentId: pop.contentId,
			daySelected,
			disabled,
			field: side => fields[side],
			groupAttrs,
			hasValue: value != null,
			kind,
			locale,
			message,
			monthOf,
			onMonthChange,
			open: pop.open,
			pickDay,
			pickRange,
			popup,
			presets,
			range: isRange,
			rangeSelected,
			readOnly,
			registerTimeSurface: element => timeSurfaces.add(element),
			segmentAttrs,
			segmentText,
			setContent: pop.setContent,
			setGroup,
			setTrigger: pop.setTrigger,
			timeSurface,
			toggleOpen,
			triggerId: pop.triggerId,
			unregisterTimeSurface: element => timeSurfaces.delete(element),
		})

		yield (
			<>
				{args.name && !isRange
					? <input data-slot="input-date-hidden" disabled={disabled} name={args.name} set:value={fields.from.value() ?? ''} type="hidden" value={fields.from.value() ?? ''} />
					: null}
				{args.name && isRange
					? <>
						<input data-slot="input-date-hidden" disabled={disabled} name={`${args.name}[from]`} set:value={fields.from.value() ?? ''} type="hidden" value={fields.from.value() ?? ''} />
						<input data-slot="input-date-hidden" disabled={disabled} name={`${args.name}[to]`} set:value={fields.to.value() ?? ''} type="hidden" value={fields.to.value() ?? ''} />
					</>
					: null}
				{args.children ?? (
					<>
						{isRange ? <><InputDateField side="from" /><InputDateField side="to" /></> : <InputDateField />}
						{args.calendar && kind !== 'time' ? (
							<>
								<InputDateTrigger />
								<InputDateContent>
									<InputDateCalendar {...(typeof args.calendar === 'object' ? args.calendar : {})} />
									{kind === 'datetime'
										? isRange
											? <><InputDateTimeField side="from" /><InputDateTimeField side="to" /></>
											: <InputDateTimeField />
										: null}
									{presets.length ? <InputDatePresets /> : null}
								</InputDateContent>
							</>
						) : null}
					</>
				)}
				{descriptionText ? <span data-slot="input-date-description" hidden id={descriptionId}>{descriptionText}</span> : null}
				{message ? <span data-slot="input-date-message" hidden id={messageId}>{message}</span> : null}
			</>
		)
	}
}


/** Segment-based date field; the calendar popover is an optional part. */
const InputDate = <Range extends boolean = false>({
	allowNonContiguous,
	calendar,
	children,
	class: classes,
	closeOnSelect,
	defaultOpen,
	defaultValue,
	disabled,
	emptyLabel,
	errorMessage,
	locale,
	max,
	min,
	name,
	onOpenChange,
	onValueChange,
	open,
	placeholderValue,
	presets,
	range,
	readOnly,
	required,
	unavailable,
	value,
	...attrs
}: InputDateArgs<Range>) => {
	// In range mode the root is the labelled outer group; the sides label themselves.
	const fieldCtx = FieldContext()

	return (
		<InputDateRoot
			{...rootAttrs(attrs as Record<string, unknown>)}
			{...(range ? { 'attr:role': 'group', 'attr:aria-describedby': fieldCtx?.groupAttrs['aria-describedby'], 'attr:aria-labelledby': fieldCtx?.groupAttrs['aria-labelledby'] } : {})}
			allowNonContiguous={allowNonContiguous}
			calendar={calendar}
			closeOnSelect={closeOnSelect}
			defaultOpen={defaultOpen}
			defaultValue={defaultValue as string | InputDateRangeValue | undefined}
			disabled={disabled}
			emptyLabel={emptyLabel}
			errorMessage={errorMessage}
			kind="date"
			locale={locale}
			max={max}
			min={min}
			name={name}
			onOpenChange={onOpenChange}
			onValueChange={onValueChange as ((value: PublicValue, event?: Event) => void) | undefined}
			open={open}
			placeholderValue={placeholderValue}
			presets={presets as InputDatePreset[] | undefined}
			range={range}
			readOnly={readOnly}
			required={required}
			unavailable={unavailable}
			value={value as PublicValue | undefined}
			attr:class={classes}
			attr:data-slot="input-date"
		>
			{children}
		</InputDateRoot>
	)
}

/** Segment-based time field; canonical 24h values regardless of display cycle. */
const InputTime = <Range extends boolean = false>({
	allowNonContiguous,
	children,
	class: classes,
	defaultValue,
	disabled,
	emptyLabel,
	errorMessage,
	granularity,
	hourCycle,
	locale,
	max,
	min,
	name,
	onValueChange,
	placeholderValue,
	range,
	readOnly,
	required,
	step,
	unavailable,
	value,
	...attrs
}: InputTimeArgs<Range>) => {
	const fieldCtx = FieldContext()

	return (
		<InputDateRoot
			{...rootAttrs(attrs as Record<string, unknown>)}
			{...(range ? { 'attr:role': 'group', 'attr:aria-describedby': fieldCtx?.groupAttrs['aria-describedby'], 'attr:aria-labelledby': fieldCtx?.groupAttrs['aria-labelledby'] } : {})}
			allowNonContiguous={allowNonContiguous}
			defaultValue={defaultValue as string | InputDateRangeValue | undefined}
			disabled={disabled}
			emptyLabel={emptyLabel}
			errorMessage={errorMessage}
			granularity={granularity}
			hourCycle={hourCycle}
			kind="time"
			locale={locale}
			max={max}
			min={min}
			name={name}
			onValueChange={onValueChange as ((value: PublicValue, event?: Event) => void) | undefined}
			placeholderValue={placeholderValue}
			range={range}
			readOnly={readOnly}
			required={required}
			step={step}
			unavailable={unavailable}
			value={value as PublicValue | undefined}
			attr:class={classes}
			attr:data-slot="input-time"
		>
			{children}
		</InputDateRoot>
	)
}

/** Segment-based date-time field; the calendar merges picked days with entered time. */
const InputDateTime = <Range extends boolean = false>({
	allowNonContiguous,
	calendar,
	children,
	class: classes,
	closeOnSelect,
	defaultOpen,
	defaultValue,
	disabled,
	emptyLabel,
	errorMessage,
	granularity,
	hourCycle,
	locale,
	max,
	min,
	name,
	onOpenChange,
	onValueChange,
	open,
	placeholderValue,
	presets,
	range,
	readOnly,
	required,
	step,
	unavailable,
	value,
	...attrs
}: InputDateTimeArgs<Range>) => {
	const fieldCtx = FieldContext()

	return (
		<InputDateRoot
			{...rootAttrs(attrs as Record<string, unknown>)}
			{...(range ? { 'attr:role': 'group', 'attr:aria-describedby': fieldCtx?.groupAttrs['aria-describedby'], 'attr:aria-labelledby': fieldCtx?.groupAttrs['aria-labelledby'] } : {})}
			allowNonContiguous={allowNonContiguous}
			calendar={calendar}
			closeOnSelect={closeOnSelect}
			defaultOpen={defaultOpen}
			defaultValue={defaultValue as string | InputDateRangeValue | undefined}
			disabled={disabled}
			emptyLabel={emptyLabel}
			errorMessage={errorMessage}
			granularity={granularity}
			hourCycle={hourCycle}
			kind="datetime"
			locale={locale}
			max={max}
			min={min}
			name={name}
			onOpenChange={onOpenChange}
			onValueChange={onValueChange as ((value: PublicValue, event?: Event) => void) | undefined}
			open={open}
			placeholderValue={placeholderValue}
			presets={presets as InputDatePreset[] | undefined}
			range={range}
			readOnly={readOnly}
			required={required}
			step={step}
			unavailable={unavailable}
			value={value as PublicValue | undefined}
			attr:class={classes}
			attr:data-slot="input-datetime"
		>
			{children}
		</InputDateRoot>
	)
}

/** Segmented group surface; renders the derived segments and literals closed. */
const InputDateField: Stateless<InputDateFieldArgs> = ({
	class: classes,
	label,
	literalClass,
	ref,
	segmentClass,
	side,
	...attrs
}) => {
	const ctx = InputDateContext()
	if (!ctx) throw new Error('InputDateField must be used within an InputDate family root.')
	if (ctx.range && !side) console.warn('[input-date] <InputDateField side> is required in range mode.')
	const current: InputDateSide = ctx.range ? side ?? 'from' : 'from'
	const editor = ctx.field(current)
	const reference = (element: HTMLDivElement | null) => {
		ctx.setGroup(current, element)
		callRef(ref, element)
	}

	return (
		<div {...attrs} {...ctx.groupAttrs(current, label)} class={classes} ref={reference}>
			{editor.segments.map((segment, index) => segment.editable ? (
				// Keyed by unit type: a locale flip reorders through ajo's
				// focus-preserving keyed path instead of repurposing the focused div.
				<div key={segment.type} {...ctx.segmentAttrs(current, segment, label)} class={segmentClass}>
					{ctx.segmentText(current, segment)}
				</div>
			) : (
				<div aria-hidden="true" class={literalClass} data-slot="input-date-literal" key={`literal-${index}`}>
					{segment.text}
				</div>
			))}
		</div>
	)
}

/** Time run of the bound datetime field, rendered as a second popover surface. */
const InputDateTimeField: Stateless<InputDateTimeFieldArgs> = ({
	class: classes,
	label,
	literalClass,
	ref,
	segmentClass,
	side,
	...attrs
}) => {
	const ctx = InputDateContext()
	if (!ctx || !ctx.timeSurface('InputDateTimeField')) return null
	if (ctx.range && !side) console.warn('[input-date] <InputDateTimeField side> is required in range mode.')
	const current: InputDateSide = ctx.range ? side ?? 'from' : 'from'
	const resolvedLabel = label ?? (ctx.range ? current === 'from' ? 'Start time' : 'End time' : 'Time')
	const editor = ctx.field(current)
	let registered: HTMLDivElement | null = null
	const reference = (element: HTMLDivElement | null) => {
		if (registered && registered !== element) ctx.unregisterTimeSurface(registered)
		if (element && registered !== element) ctx.registerTimeSurface(element)
		registered = element
		callRef(ref, element)
	}

	return (
		<div {...attrs} {...ctx.groupAttrs(current, resolvedLabel, 'popover')} class={classes} ref={reference}>
			{timeRun(editor.segments).map((segment, index) => segment.editable ? (
				<div key={segment.type} {...ctx.segmentAttrs(current, segment, resolvedLabel, 'popover')} class={segmentClass}>
					{ctx.segmentText(current, segment, 'popover')}
				</div>
			) : (
				<div aria-hidden="true" class={literalClass} data-slot="input-date-time-literal" key={`literal-${index}`}>
					{segment.text}
				</div>
			))}
		</div>
	)
}

/** Optional calendar button; the popover still anchors to the field group. */
const InputDateTrigger: Stateless<InputDateTriggerArgs> = ({
	children,
	class: classes,
	disabled,
	iconClass,
	id: idArg,
	ref,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const ctx = InputDateContext()
	if (ctx && !ctx.popup('InputDateTrigger')) return null
	const disabledFlag = Boolean(disabled ?? ctx?.disabled)

	return (
		<button
			{...attrs}
			{...triggerAttrs({
				controls: ctx?.contentId,
				expanded: Boolean(ctx?.open),
				haspopup: 'dialog',
				id: idArg,
				open: Boolean(ctx?.open),
				ref,
				setTrigger: ctx?.setTrigger,
				triggerId: ctx?.triggerId,
			})}
			aria-label={attrs['aria-label'] ?? 'Show calendar'}
			class={classes}
			data-slot="input-date-trigger"
			disabled={disabledFlag}
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented) return
				ctx?.toggleOpen(event)
			}}
			type={type}
		>
			{children ?? <span aria-hidden="true" class={iconClass} data-slot="input-date-trigger-icon" />}
		</button>
	)
}

/** Popover panel for the calendar; a dialog anchored to the field group. */
const InputDateContent: Stateless<InputDateContentArgs> = ({
	align = 'start',
	alignOffset = 0,
	children,
	class: classes,
	collisionPadding = 8,
	id: idArg,
	ref,
	role = 'dialog',
	side = 'bottom',
	sideOffset = 6,
	style,
	...attrs
}) => {
	const ctx = InputDateContext()
	if (ctx && !ctx.popup('InputDateContent')) return null

	return (
		<div
			{...attrs}
			{...contentAttrs({
				align,
				alignOffset,
				collisionPadding,
				id: idArg ?? ctx?.contentId,
				open: Boolean(ctx?.open),
				popover: 'manual',
				ref,
				setContent: ctx?.setContent,
				side,
				sideOffset,
				style,
				tabindex: '-1',
			})}
			aria-label={attrs['aria-label'] ?? 'Calendar'}
			class={classes}
			data-slot="input-date-content"
			role={role}
		>
			{children}
		</div>
	)
}

/** Calendar wired to the field: picked days fill the date units and commit. */
const InputDateCalendar: Stateless<InputDateCalendarArgs> = ({ component, ...attrs }) => {
	const ctx = InputDateContext()
	const CurrentCalendar = component ?? Calendar
	if (!ctx) return <CurrentCalendar {...attrs as CalendarArgs} />
	if (!ctx.popup('InputDateCalendar')) return null

	const common = {
		...attrs,
		allowNonContiguous: ctx.allowNonContiguous,
		disabled: ctx.calendarDisabled(attrs.disabled),
		locale: attrs.locale ?? ctx.locale,
		month: attrs.month ?? ctx.monthOf(),
			onMonthChange: (month: Date, event?: Event) => {
			attrs.onMonthChange?.(month, event)
			ctx.onMonthChange(month, event)
		},
		unavailable: ctx.calendarUnavailable,
	}

	if (ctx.range) {
		return (
			<CurrentCalendar {...{
				...common,
				mode: 'range',
				selected: ctx.rangeSelected(),
				onSelect: (next: CalendarDateRange | null, event: Event) => ctx.pickRange(next, event),
			} as CalendarArgs} />
		)
	}

	return (
		<CurrentCalendar {...{
			...common,
			mode: 'single',
			selected: ctx.daySelected(),
			onSelect: (next: Date | null, event: Event) => ctx.pickDay(next, event),
		} as CalendarArgs} />
	)
}

/** Clear button; renders only while a value exists and emits null. */
const InputDateClear: Stateless<InputDateClearArgs> = ({
	children,
	class: classes,
	disabled,
	iconClass,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const ctx = InputDateContext()
	if (ctx && !ctx.hasValue) return null
	const disabledFlag = Boolean(disabled ?? ctx?.disabled)

	return (
		<button
			{...attrs}
			aria-label={attrs['aria-label'] ?? 'Clear'}
			class={classes}
			data-slot="input-date-clear"
			disabled={disabledFlag}
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented) return
				ctx?.clear(event)
			}}
			type={type}
		>
			{children ?? <span aria-hidden="true" class={iconClass} data-slot="input-date-clear-icon" />}
		</button>
	)
}

/** Preset value buttons for the popover; a pick commits and closes. */
const InputDatePresets: Stateless<InputDatePresetsArgs> = ({
	buttonClass,
	children,
	class: classes,
	...attrs
}) => {
	const ctx = InputDateContext()
	if (!ctx || !ctx.popup('InputDatePresets')) return null
	if (!children && !ctx.presets.length) return null

	return (
		<div {...attrs} class={classes} data-slot="input-date-presets">
			{children ?? ctx.presets.map(preset => (
				<button
					class={buttonClass}
					data-slot="input-date-preset"
					disabled={ctx.disabled}
					key={preset.label}
					set:onclick={(event: Event) => ctx.applyPreset(preset.value, event)}
					type="button"
				>
					{preset.label}
				</button>
			))}
		</div>
	)
}

export {
	InputDate,
	InputDateCalendar,
	InputDateClear,
	InputDateContent,
	InputDateField,
	InputDatePresets,
	InputDateTime,
	InputDateTimeField,
	InputDateTrigger,
	InputTime,
}
