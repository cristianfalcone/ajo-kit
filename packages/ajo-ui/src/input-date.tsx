import type { Children, Host, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, controlled, dom, id, listen, roving, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { calendarDate, compile, compiler, resolveLocale, type Availability, type AvailabilityMatcher } from './availability'
import { flag } from './shared'
import type { FixedArgs, OmitArg } from './utils'
import { Calendar, type CalendarArgs, type CalendarCommonArgs, type CalendarDateRange, type CalendarMatcher } from './calendar'
import { FieldContext } from './field'
import { contentAttrs, popup, type PopupOptions, type PopupPosition, type PopupView, triggerAttrs } from './popup'
import {
	defaultMessage,
	field,
	formatValue,
	fromISO,
	spinMove,
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
export type { PopupPlacement, PopupPosition } from './popup'

/** Range endpoint edited by a segmented date or time field. */
export type InputDateSide = 'from' | 'to'

/** Serialized start and end values emitted by a range field. */
export type InputDateRangeValue = {
	/** Range start in the family's own format; null while empty. */
	from: string | null
	/** Range end in the family's own format; null while empty. */
	to: string | null
}

/** Public value shape selected by a field's range mode. */
export type InputDateValue<Range extends boolean = false> = Range extends true ? InputDateRangeValue : string

// Family values are zone-free wall dates, so the root also owns the Calendar zone.
type InputDateCalendarOwnedArgs = 'allowNonContiguous' | 'defaultSelected' | 'mode' | 'onSelect' | 'selected' | 'timeZone' | 'unavailable'

/** Calendar presentation arguments that remain consumer-configurable inside InputDate. */
export type InputDateCalendarArgs = OmitArg<CalendarCommonArgs, InputDateCalendarOwnedArgs> & {
	/** Calendar implementation; the themed layer injects its Calendar here. */
	component?: Stateless<CalendarArgs>
} & FixedArgs<InputDateCalendarOwnedArgs>

/** Parts themed by a root's `classNames`: the default composition and the nodes no caller composes. */
export type InputDateClassName =
	| 'addon'
	| 'clear'
	| 'clear_icon'
	| 'content'
	| 'control'
	| 'field'
	| 'literal'
	| 'segment'
	| 'separator'
	| 'trigger'
	| 'trigger_icon'

type ClassNames = Partial<Record<InputDateClassName, string>>

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
	/** BCP 47 tag; falls back to `<html lang>`, then 'en-US'. Never navigator. */
	locale?: string
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
	/** Render a clear button while a value exists. */
	clearable?: boolean
	/** Classes for the default composition's parts, segments, literals and icons. */
	classNames?: ClassNames
	/** Additional classes. */
	class?: string
}> & FixedArgs<'onchange'>

type PopupArgs = {
	/** Opt into the calendar popover; an object forwards args to InputDateCalendar. A completed pick closes it. */
	calendar?: boolean | InputDateCalendarArgs
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

/** Arguments for a segmented date field with optional Calendar composition. */
export type InputDateArgs<Range extends boolean = false> = CommonArgs<Range> & PopupArgs & PopupPosition

/** Arguments for a segmented wall-time field. */
export type InputTimeArgs<Range extends boolean = false> = CommonArgs<Range> & TimeArgs & FixedArgs<'gap' | 'placement'>

/** Arguments for a segmented date-time field with optional Calendar composition. */
export type InputDateTimeArgs<Range extends boolean = false> = CommonArgs<Range> & PopupArgs & TimeArgs & PopupPosition

/** Arguments for the segment group of an InputDate family root. */
export type InputDateFieldArgs = OmitArg<IntrinsicElements['div'], 'children'> & {
	/** Which range side this group edits; required in range mode, absent in single. */
	side?: InputDateSide
	/** Accessible group label; range sides default to Start/End date. */
	label?: string
	/** Additional classes. */
	class?: string
} & FixedArgs<'children'>

/** Arguments for the button that toggles an InputDate Calendar popover. */
export type InputDateTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional classes. */
	class?: string
}>

/** Arguments for positioned InputDate popover content. */
export type InputDateContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'hidden' | 'id' | 'popover' | 'role' | 'tabindex' | 'tabIndex'> & {
	/** Additional classes. */
	class?: string
	/** Inline CSS declarations composed with live positioning styles. */
	style?: string
}> & FixedArgs<'gap' | 'hidden' | 'id' | 'placement' | 'popover' | 'role' | 'tabindex' | 'tabIndex'>

/** Arguments for the button that clears an InputDate family value. */
export type InputDateClearArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional classes. */
	class?: string
}>

type PublicValue = string | InputDateRangeValue | null

type InputDateRootArgs = WithChildren<{
	allowNonContiguous?: boolean
	classNames?: ClassNames
	defaultOpen?: boolean
	defaultValue?: string | InputDateRangeValue
	disabled?: boolean
	emptyLabel?: string
	errorMessage?: (reason: Reason) => string | undefined
	granularity?: Granularity
	hourCycle?: 12 | 24
	kind: SegmentsKind
	locale?: string
	max?: string
	min?: string
	name?: string
	onOpenChange?: (open: boolean, event?: Event) => void
	onValueChange?: (value: PublicValue, event?: Event) => void
	open?: boolean
	placeholderValue?: string
	popupFactory?: InputDatePopupFactory
	range?: boolean
	readOnly?: boolean
	required?: boolean
	step?: number
	unavailable?: AvailabilityMatcher | AvailabilityMatcher[]
	value?: string | InputDateRangeValue | null
}> & PopupPosition

type InputDateContextValue = {
	allowNonContiguous: boolean
	calendarDisabled: (user?: CalendarMatcher | CalendarMatcher[]) => CalendarMatcher[] | undefined
	calendarUnavailable: AvailabilityMatcher | AvailabilityMatcher[] | undefined
	classNames: ClassNames | undefined
	clear: (event?: Event) => void
	contentId: string
	contentStyle: PopupView['contentStyle']
	daySelected: () => Date | null
	disabled: boolean
	field: (side: InputDateSide) => FieldView
	groupAttrs: (side: InputDateSide, label?: string) => Record<string, unknown>
	hasValue: boolean
	kind: SegmentsKind
	locale: string
	message: string | null
	monthOf: () => Date | undefined
	onMonthChange: (month: Date) => void
	open: boolean
	pickDay: (next: Date | null, event: Event) => void
	pickRange: (next: CalendarDateRange | null, event: Event) => void
	range: boolean
	rangeSelected: () => CalendarDateRange | null
	readOnly: boolean
	segmentAttrs: (side: InputDateSide, segment: Segment, label?: string) => Record<string, unknown>
	segmentText: (side: InputDateSide, segment: Segment) => string
	setContent: (element: HTMLDivElement | null) => void
	setTrigger: (element: HTMLButtonElement | null) => void
	toggleOpen: (event: Event) => void
	triggerId: string
}

const InputDateContext = context<InputDateContextValue | null>(null)

type InputDatePopup = PopupView<HTMLButtonElement, HTMLDivElement>
type InputDatePopupFactory = (host: Host, options: PopupOptions<InputDatePopup>) => InputDatePopup

// InputTime shares the segmented-field engine but owns no popup surface. Its
// inert adapter keeps that static graph independent from Calendar/positioning.
const inputTimePopup: InputDatePopupFactory = (_host, options) => {
	const rootId = id(options.prefix)
	const triggerId = `${rootId}-trigger`
	const contentId = `${rootId}-content`
	return {
		open: false,
		trigger: null,
		content: null,
		reference: null,
		triggerId,
		contentId,
		adoptTriggerId: () => triggerId,
		contentStyle: style => typeof style === 'string' ? style : '',
		arrowAttrs: () => ({ ref: () => undefined }),
		sync: () => false,
		setOpen: () => undefined,
		init: () => undefined,
		close: () => undefined,
		focusAfterReveal: () => undefined,
		hold: () => undefined,
		release: () => undefined,
		cancelHover: () => undefined,
		setTrigger: () => undefined,
		setContent: () => undefined,
		setReference: () => undefined,
		update: () => undefined,
	}
}

const positionedInputDatePopup: InputDatePopupFactory = (host, options) => popup(host, options)

const sides: InputDateSide[] = ['from', 'to']

// Family values are zone-free wall dates: local noon, years 0 to 99 kept literal.
const unitsToDate = (units: Units | null) =>
	units?.year != null && units.month != null && units.day != null
		? calendarDate({ day: units.day, hour: 12, minute: 0, month: units.month, second: 0, year: units.year })
		: undefined

const InputDateRoot: Stateful<InputDateRootArgs> = function* (initial) {
	let kind = initial.kind
	const rootId = id('input-date')
	const domReady = dom(this)
	const ownerDocument = domReady ? this.ownerDocument : null
	const node = (value: unknown): value is Node => {
		const view = ownerDocument?.defaultView
		return Boolean(view && value instanceof view.Node)
	}
	// iOS VoiceOver cannot focus spinbuttons: role textbox, no aria-value*.
	// SSR emits spinbutton; the hydration attr rewrite is an accepted divergence.
	const ios = domReady && typeof navigator !== 'undefined' &&
		(/iP(ad|hone|od)/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1))
	let composing: { side: InputDateSide; unit: SegmentUnit; element: HTMLElement; text: string } | null = null
	let controlId = `${rootId}-control`
	const unavailableOf = compiler()
	const calendarUserOf = compiler()
	let availability = unavailableOf(initial.unavailable)
	let boundsSource: string | undefined
	let boundsAvailability: Availability | undefined
	let calendarUserAvailability: Availability | undefined
	let allowNonContiguous = Boolean(initial.allowNonContiguous)
	let disabled = Boolean(initial.disabled)
	let isRange = Boolean(initial.range)
	let locale = resolveLocale(initial.locale)
	let onOpenChange: InputDateRootArgs['onOpenChange']
	let onValueChange: InputDateRootArgs['onValueChange']
	let closingInside = false
	let pop: PopupView<HTMLButtonElement, HTMLDivElement>
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

	const segmentsOf = (scope?: ParentNode): HTMLElement[] =>
		domReady ? Array.from((scope ?? this).querySelectorAll<HTMLElement>('[data-segment]')) : []

	const segmentOf = (event: Event): HTMLElement | null =>
		event.target instanceof Element ? event.target.closest<HTMLElement>('[data-segment]') : null

	const sideOf = (segment: HTMLElement): InputDateSide =>
		(segment.dataset.side as InputDateSide) ?? 'from'

	const unitOf = (segment: HTMLElement): SegmentUnit => segment.dataset.segment as SegmentUnit

	// One flat list: range sides stay adjacent in display order.
	const moveFocus = (from: HTMLElement, step: number) => {
		const list = segmentsOf()
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

	// The element that opened the calendar (trigger or segment) gets focus back
	// when it closes from inside, unless a click back into the field placed it.
	let returnFocus: HTMLElement | null = null

	const restoreAfterClose = () => {
		const active = ownerDocument?.activeElement
		const target = returnFocus
		returnFocus = null
		if (target && dom(active) && pop.content?.contains(active) && !closingInside) {
			queueMicrotask(() => target.isConnected && target.focus())
		}
		closingInside = false
	}

	pop = (initial.popupFactory ?? inputTimePopup)(this, {
		prefix: 'input-date',
		profile: 'date',
		initialOpen: Boolean(initial.open ?? initial.defaultOpen),
		disabled: () => disabled,
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		referenceHidden: 'close',
		dismiss: {
			escape: false,
			outside: true,
			inside: view => [
				dom(view.reference) ? view.reference : null,
				view.trigger,
				view.content,
			],
			onDismiss: event => setOpen(false, event),
		},
		onSync: opened => {
			if (!opened) restoreAfterClose()
		},
	})
	// The popover anchors to the complete field root, not a segment group or the
	// 28px icon trigger; native invoker semantics stay with the calendar button.
	pop.setReference(this)

	const setOpen = (next: boolean, event?: Event) => {
		if (disabled && next) return
		if (next === pop.open) return
		if (!next) {
			// A pointerdown landing back on our field keeps the click's own focus.
			closingInside = event?.type === 'pointerdown' && node(event.target) && this.contains(event.target)
			pop.setOpen(false, event)
			return
		}
		// A fresh session follows the committed value again.
		visibleMonth = undefined
		pop.setOpen(true, event)
		// The dialog autofocuses the calendar: selected day, today, first enabled.
		pop.focusAfterReveal(() => {
			const content = pop.content
			if (!content) return
			const target = content.querySelector<HTMLElement>('[data-slot="calendar-day-button"][data-state="selected"]:not(:disabled)')
				?? content.querySelector<HTMLElement>('[data-slot="calendar-day-button"][data-today]:not(:disabled)')
				?? content.querySelector<HTMLElement>('[data-slot="calendar-day-button"]:not(:disabled)')
				?? content
			target.focus()
		})
	}

	const toggleOpen = (event: Event) => {
		const next = !pop.open
		if (next) returnFocus = pop.trigger
		setOpen(next, event)
	}

	// Calendar wiring:

	const dateOfValue = (side: InputDateSide) => unitsToDate(fields[side].units)

	const daySelected = (): Date | null => dateOfValue('from') ?? null

	const rangeSelected = (): CalendarDateRange | null => {
		const from = dateOfValue('from')
		const to = dateOfValue('to')
		return from || to ? { from, to } : null
	}

	const monthOf = () => visibleMonth ?? dateOfValue('from')

	const onMonthChange = (month: Date) => this.next(() => visibleMonth = month)

	const dayOfBound = (value: string | undefined) => value ? unitsToDate(fromISO(kind, value)) : undefined

	const syncAvailability = (args: InputDateRootArgs) => {
		availability = unavailableOf(args.unavailable)
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
		calendarUserAvailability = calendarUserOf(user)
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
		if (next) setOpen(false, event)
		this.next()
	}

	const pickRange = (next: CalendarDateRange | null, event: Event) => {
		if (disabled || readOnly) return
		const patchFor = (editor: FieldView, date: Date | undefined) => date ? datePatch(editor, date) : emptyDate
		emitIfChanged([
			fields.from.merge(patchFor(fields.from, next?.from)),
			fields.to.merge(patchFor(fields.to, next?.to)),
		], event)
		if (next?.from && next.to) setOpen(false, event)
		this.next()
	}

	const clearValue = (event?: Event) => {
		if (disabled || readOnly) return
		const results = [fields.from.clear()]
		if (isRange) results.push(fields.to.clear())
		emitIfChanged(results, event)
		// The clear button unmounts with the value (combobox precedent:
		// clearing refocuses the input): focus lands on the first segment.
		if (domReady) queueMicrotask(() => segmentsOf()[0]?.focus())
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
		const list = segmentsOf()
		const index = list.indexOf(active)
		const target = list.slice(0, Math.max(index, 0)).reverse().find(survives) ?? list.slice(index + 1).find(survives)
		if (!target) return
		const side = sideOf(target)
		const unit = unitOf(target)
		// After the render pass removes the segment, focus its surviving neighbor.
		queueMicrotask(() => {
			const current = document.activeElement
			if (current instanceof HTMLElement && current !== document.body && this.contains(current)) return
			segmentsOf().find(item => sideOf(item) === side && unitOf(item) === unit)?.focus()
		})
	}

	const nav = roving(this, {
		items: () => segmentsOf(),
		orientation: () => 'horizontal',
		dir: () => domReady && getComputedStyle(this).direction === 'rtl' ? 'rtl' : 'ltr',
		loop: () => false,
		onMove: target => target.focus(),
	})

	listen(this, 'keydown', event => {
		// Consumed only while open, so an ancestor Dialog does not also close;
		// Escape never clears the value.
		if (event.key === 'Escape') {
			if (!pop.open || event.defaultPrevented) return
			event.preventDefault()
			setOpen(false, event)
			return
		}
		const segment = segmentOf(event)
		if (!segment) return
		const side = sideOf(segment)
		const unit = unitOf(segment)
		// Pipeline contract: Alt+ArrowDown → spinMove (APG protocol) → roving Left/Right.
		// Alt-combos never reach spin: without popup parts composed,
		// Alt+ArrowDown is a pinned no-op, not a step.
		if (event.altKey && event.key.startsWith('Arrow')) {
			if (event.key === 'ArrowDown' && pop.content) {
				event.preventDefault()
				returnFocus = segment
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
		const move = readOnly ? undefined : spinMove(event)
		if (move) {
			event.preventDefault()
			if (!disabled) apply(fields[side].spin(unit, move), event, segment)
			return
		}
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
		// Interactive chrome and the popover keep their own pointer behavior.
		if (pop.content?.contains(target) || target.closest('a, button, input, select, textarea')) return
		// Whitespace, separators and addons walk back to the last filled segment
		// of the clicked group, else of the whole field.
		event.preventDefault()
		if (disabled) return
		const list = segmentsOf(target.closest('[data-slot="input-date-field"]') ?? this)
		;([...list].reverse().find(item => item.dataset.placeholder !== 'true') ?? list[0])?.focus()
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
			segmentsOf()[0]?.focus()
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
		disabled = Boolean(args.disabled)
		isRange = Boolean(args.range)
		locale = resolveLocale(args.locale)
		const emptyLabel = args.emptyLabel ?? 'Empty'
		onOpenChange = args.onOpenChange
		onValueChange = args.onValueChange
		readOnly = Boolean(args.readOnly)
		required = Boolean(args.required)

		valueState.sync(args.value)
		const opened = pop.sync(args.open == null ? undefined : Boolean(args.open), {
			placement: args.placement,
			gap: args.gap,
		})
		if (opened) closingInside = false
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
		// Values compare in the family's own zero-padded string format.
		const from = fields.from.value()
		const to = fields.to.value()
		const reversed = isRange && from != null && to != null && from > to
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

		const groupAttrs = (side: InputDateSide, label?: string): Record<string, unknown> => {
			const invalid = invalidOf(side)
			const record: Record<string, unknown> = {
				'aria-disabled': flag(disabled),
				'aria-invalid': flag(invalid),
				'data-disabled': flag(disabled),
				'data-invalid': flag(invalid),
				'data-readonly': flag(readOnly),
				'data-side': side,
				'data-slot': 'input-date-field',
				role: 'group',
			}
			if (isRange) {
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

		const segmentAttrs = (side: InputDateSide, segment: Segment, label?: string): Record<string, unknown> => {
			const unit = segment.type as SegmentUnit
			const editor = fields[side]
			const first = side === 'from' && unit === firstUnit
			const filled = editor.units[unit] != null
			const bounds = editor.bounds(unit)
			const unitName = unitLabel(locale, unit)
			const segmentId = first ? controlId : `${rootId}-${side}-${unit}`
			// Self-reference technique: aria-labelledby chains the segment itself
			// (contributing its unit-name aria-label) with the field label, so
			// every segment announces "month, Date of birth" — iOS VoiceOver
			// does not announce groups. Range chains the outer label the same way.
			const labelId = fieldCtx?.ids.label
			const groupLabel = isRange ? sideLabel(side, label) : label
			const record: Record<string, unknown> = {
				'aria-describedby': describedbyOf(side, first),
				'aria-invalid': flag(invalidOf(side)),
				'aria-label': groupLabel ? `${unitName}, ${groupLabel}` : unitName,
				'aria-labelledby': labelId ? `${segmentId} ${labelId}` : undefined,
				'aria-readonly': readOnly ? 'true' : undefined,
				'aria-required': first && required ? 'true' : undefined,
				autocapitalize: 'off',
				autocorrect: 'off',
				'data-placeholder': flag(!editor.text(unit)),
				'data-side': side,
				'data-segment': unit,
				'data-slot': 'input-date-segment',
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

		const segmentText = (side: InputDateSide, segment: Segment): string => {
			const unit = segment.type as SegmentUnit
			// The focused segment holds its snapshot until compositionend.
			if (composing && composing.side === side && composing.unit === unit) return composing.text
			return fields[side].text(unit) || segment.placeholder
		}

		InputDateContext({
			allowNonContiguous,
			calendarDisabled,
			calendarUnavailable: args.unavailable,
			classNames: args.classNames,
			clear: clearValue,
			contentId: pop.contentId,
			contentStyle: pop.contentStyle,
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
			range: isRange,
			rangeSelected,
			readOnly,
			segmentAttrs,
			segmentText,
			setContent: pop.setContent,
			setTrigger: pop.setTrigger,
			toggleOpen,
			triggerId: pop.triggerId,
		})

		yield (
			<>
				{args.name ? sides.slice(0, isRange ? 2 : 1).map(side => (
					<input
						data-slot="input-date-hidden"
						disabled={disabled}
						key={side}
						name={isRange ? `${args.name}[${side}]` : args.name}
						set:value={fields[side].value() ?? ''}
						type="hidden"
						value={fields[side].value() ?? ''}
					/>
				)) : null}
				{args.children}
				{descriptionText ? <span data-slot="input-date-description" hidden id={descriptionId}>{descriptionText}</span> : null}
				{message ? <span data-slot="input-date-message" hidden id={messageId}>{message}</span> : null}
			</>
		)
	}
}


// The default composition: the segment control, an addon with the clear
// button and any calendar trigger, then any calendar popover.
const defaults = (
	range: boolean | undefined,
	clearable: boolean | undefined,
	classNames: ClassNames | undefined,
	trigger?: Children,
	content?: Children,
) => (
	<>
		<div class={classNames?.control} data-slot="input-date-control">
			{range ? (
				<>
					<InputDateField class={classNames?.field} side="from" />
					<div aria-hidden="true" class={classNames?.separator} data-slot="input-date-separator">–</div>
					<InputDateField class={classNames?.field} side="to" />
				</>
			) : <InputDateField class={classNames?.field} />}
		</div>
		{clearable || trigger ? (
			<div class={classNames?.addon} data-slot="input-date-addon">
				{clearable ? <InputDateClear class={classNames?.clear} /> : null}
				{trigger}
			</div>
		) : null}
		{content}
	</>
)

// Only the date roots reach the calendar parts, so InputTime never bundles
// Calendar or positioning.
const calendarDefaults = (
	range: boolean | undefined,
	clearable: boolean | undefined,
	classNames: ClassNames | undefined,
	calendar: boolean | InputDateCalendarArgs | undefined,
) => calendar
	? defaults(range, clearable, classNames, <InputDateTrigger class={classNames?.trigger} />, (
		<InputDateContent class={classNames?.content}>
			<InputDateCalendar {...(calendar === true ? {} : calendar)} />
		</InputDateContent>
	))
	: defaults(range, clearable, classNames)

/** Segment-based date field; the calendar popover is an optional part. */
const InputDate = <Range extends boolean = false>({
	allowNonContiguous,
	calendar,
	children,
	class: classes,
	classNames,
	clearable,
	defaultOpen,
	defaultValue,
	disabled,
	emptyLabel,
	errorMessage,
	gap,
	locale,
	max,
	min,
	name,
	onOpenChange,
	onValueChange,
	open,
	placement,
	placeholderValue,
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
			classNames={classNames}
			defaultOpen={defaultOpen}
			defaultValue={defaultValue as string | InputDateRangeValue | undefined}
			disabled={disabled}
			emptyLabel={emptyLabel}
			errorMessage={errorMessage}
			gap={gap}
			kind="date"
			locale={locale}
			max={max}
			min={min}
			name={name}
			onOpenChange={onOpenChange}
			onValueChange={onValueChange as ((value: PublicValue, event?: Event) => void) | undefined}
			open={open}
			placement={placement}
			placeholderValue={placeholderValue}
			popupFactory={positionedInputDatePopup}
			range={range}
			readOnly={readOnly}
			required={required}
			unavailable={unavailable}
			value={value as PublicValue | undefined}
			attr:class={classes}
			attr:data-slot="input-date"
		>
			{children ?? calendarDefaults(range, clearable, classNames, calendar)}
		</InputDateRoot>
	)
}

/** Segment-based time field; canonical 24h values regardless of display cycle. */
const InputTime = <Range extends boolean = false>({
	allowNonContiguous,
	children,
	class: classes,
	classNames,
	clearable,
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
			classNames={classNames}
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
			{children ?? defaults(range, clearable, classNames)}
		</InputDateRoot>
	)
}

/** Segment-based date-time field; a picked day merges with the entered time. */
const InputDateTime = <Range extends boolean = false>({
	allowNonContiguous,
	calendar,
	children,
	class: classes,
	classNames,
	clearable,
	defaultOpen,
	defaultValue,
	disabled,
	emptyLabel,
	errorMessage,
	gap,
	granularity,
	hourCycle,
	locale,
	max,
	min,
	name,
	onOpenChange,
	onValueChange,
	open,
	placement,
	placeholderValue,
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
			classNames={classNames}
			defaultOpen={defaultOpen}
			defaultValue={defaultValue as string | InputDateRangeValue | undefined}
			disabled={disabled}
			emptyLabel={emptyLabel}
			errorMessage={errorMessage}
			gap={gap}
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
			placement={placement}
			placeholderValue={placeholderValue}
			popupFactory={positionedInputDatePopup}
			range={range}
			readOnly={readOnly}
			required={required}
			step={step}
			unavailable={unavailable}
			value={value as PublicValue | undefined}
			attr:class={classes}
			attr:data-slot="input-datetime"
		>
			{children ?? calendarDefaults(range, clearable, classNames, calendar)}
		</InputDateRoot>
	)
}

/** One segment group: the root's derived segments and literals for one side. */
const InputDateField: Stateless<InputDateFieldArgs> = ({ class: classes, label, ref, side, ...attrs }) => {
	const ctx = InputDateContext()
	if (!ctx) return null
	const current: InputDateSide = ctx.range ? side ?? 'from' : 'from'

	return (
		<div {...attrs} {...ctx.groupAttrs(current, label)} class={classes} ref={ref}>
			{ctx.field(current).segments.map((segment, index) => segment.editable ? (
				// Keyed by unit type: a locale flip reorders through ajo's
				// focus-preserving keyed path instead of repurposing the focused div.
				<div key={segment.type} {...ctx.segmentAttrs(current, segment, label)} class={ctx.classNames?.segment}>
					{ctx.segmentText(current, segment)}
				</div>
			) : (
				<div aria-hidden="true" class={ctx.classNames?.literal} data-slot="input-date-literal" key={`literal-${index}`}>
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
	id: idArg,
	ref,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const ctx = InputDateContext()
	if (ctx?.kind === 'time') return null
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
			{children ?? <span aria-hidden="true" class={ctx?.classNames?.trigger_icon} data-slot="input-date-trigger-icon" />}
		</button>
	)
}

/** Popover panel for the calendar; a dialog anchored to the field group. */
const InputDateContent: Stateless<InputDateContentArgs> = ({ children, class: classes, ref, style, ...attrs }) => {
	const ctx = InputDateContext()
	if (ctx?.kind === 'time') return null

	return (
		<div
			{...attrs}
			{...contentAttrs({
				id: ctx?.contentId,
				open: Boolean(ctx?.open),
				ref,
				setContent: ctx?.setContent,
				style: ctx?.contentStyle(style),
				tabindex: '-1',
			})}
			aria-label={attrs['aria-label'] ?? 'Calendar'}
			class={classes}
			data-slot="input-date-content"
			role="dialog"
		>
			{children}
		</div>
	)
}

/** Calendar wired to the field: picked days fill the date units and commit. */
const InputDateCalendar: Stateless<InputDateCalendarArgs> = ({ component, ...attrs }) => {
	const ctx = InputDateContext()
	if (!ctx || ctx.kind === 'time') return null
	const CurrentCalendar = component ?? Calendar

	const common = {
		...attrs,
		allowNonContiguous: ctx.allowNonContiguous,
		disabled: ctx.calendarDisabled(attrs.disabled),
		locale: attrs.locale ?? ctx.locale,
		month: attrs.month ?? ctx.monthOf(),
		onMonthChange: (month: Date, event?: Event) => {
			attrs.onMonthChange?.(month, event)
			ctx.onMonthChange(month)
		},
		timeZone: undefined,
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
			{children ?? <span aria-hidden="true" class={ctx?.classNames?.clear_icon} data-slot="input-date-clear-icon" />}
		</button>
	)
}

export {
	InputDate,
	InputDateCalendar,
	InputDateClear,
	InputDateContent,
	InputDateField,
	InputDateTime,
	InputDateTrigger,
	InputTime,
}
