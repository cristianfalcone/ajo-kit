import type { Stateless } from 'ajo'
import {
	InputDate as BaseInputDate,
	InputDateCalendar as BaseInputDateCalendar,
	InputDateClear as BaseInputDateClear,
	InputDateContent as BaseInputDateContent,
	InputDateField as BaseInputDateField,
	InputDateTime as BaseInputDateTime,
	InputDateTrigger as BaseInputDateTrigger,
	InputTime as BaseInputTime,
	type InputDateArgs as BaseInputDateArgs,
	type InputDateCalendarArgs as BaseInputDateCalendarArgs,
	type InputDateClassName,
	type InputDateClearArgs,
	type InputDateContentArgs,
	type InputDateFieldArgs,
	type InputDateTimeArgs as BaseInputDateTimeArgs,
	type InputDateTriggerArgs,
	type InputTimeArgs as BaseInputTimeArgs,
} from 'ajo-ui/input-date'
import type { CalendarArgs as BaseCalendarArgs } from 'ajo-ui/calendar'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import { buttonVariants } from './button'
import { Calendar } from './calendar'
import { inputGroupAddon, inputGroupAddonAlign, inputGroupVariants } from './internal/input-group'
import { popupAnimation, popupSlide } from './internal/recipes'
export type { InputDateClearArgs, InputDateContentArgs, InputDateFieldArgs, InputDateRangeValue, InputDateSide, InputDateTriggerArgs, InputDateValue, PopupPlacement, PopupPosition } from 'ajo-ui/input-date'

export type InputDateCalendarArgs = OmitArg<BaseInputDateCalendarArgs, 'component'> & FixedArgs<'component'>

export type InputDateArgs<Range extends boolean = false> = OmitArg<BaseInputDateArgs<Range>, 'calendar' | 'classNames'> & {
	/** Opt into the calendar popover; an object forwards args to InputDateCalendar. */
	calendar?: boolean | InputDateCalendarArgs
} & FixedArgs<'classNames'>

export type InputTimeArgs<Range extends boolean = false> = OmitArg<BaseInputTimeArgs<Range>, 'classNames'> & FixedArgs<'classNames'>

export type InputDateTimeArgs<Range extends boolean = false> = OmitArg<BaseInputDateTimeArgs<Range>, 'calendar' | 'classNames'> & {
	/** Opt into the calendar popover; an object forwards args to InputDateCalendar. */
	calendar?: boolean | InputDateCalendarArgs
} & FixedArgs<'classNames'>

// Segments stay inline (never flex items or inline-blocks) so bidi reorders
// them like text: an Arabic time reads "ص 9:30", not "ص 30:9".
const fieldBase = 'whitespace-nowrap'
// A hand-composed field and trigger sit straight in the group, so they take
// the control's inset, text size and end gap themselves.
const composedField = 'min-w-0 flex-1 cursor-text overflow-hidden px-3 text-base sm:text-sm'
const addonButtonBase = clx(buttonVariants({ size: 'none', variant: 'muted-ghost' }), 'size-6 rounded-[calc(var(--radius)-5px)]')
// No w-72/p-4 here: clx does not resolve conflicting utilities, so the
// calendar-sized content declares its own w-auto/p-0 without a competitor.
const contentBase = clx('z-50 m-0 w-auto rounded-lg glass-overlay edge p-0 shadow-lg outline-none', popupAnimation, popupSlide)

const classNames: Record<InputDateClassName, string> = {
	addon: clx(inputGroupAddon, inputGroupAddonAlign['inline-end']),
	clear: addonButtonBase,
	clear_icon: 'i-lucide-x pointer-events-none size-4',
	content: contentBase,
	// Control text is Input's: 16 px below sm, so a phone does not zoom, and 14 px from sm.
	control: 'flex h-full min-w-0 flex-1 cursor-text items-center overflow-hidden px-3 text-base whitespace-nowrap sm:text-sm',
	field: fieldBase,
	literal: 'whitespace-pre text-muted-foreground',
	// The focused segment's tint reaches 2 px past its digits as a spread, so it
	// takes no room. Forced colours drop both, so there the focus is an outline.
	segment: 'rounded-xs tabular-nums outline-none focus:bg-accent focus:text-accent-foreground focus:shadow-[0_0_0_2px_var(--accent)] forced-colors:focus:[outline:var(--focus-width)_solid_Highlight] data-[placeholder=true]:text-faint-foreground',
	separator: 'px-1 text-muted-foreground',
	trigger: addonButtonBase,
	trigger_icon: 'i-lucide-calendar pointer-events-none size-4',
}

// The one Playa root wrapper: InputGroup chrome and the theme map.
const theme = ({ class: classes, disabled }: { class?: string; disabled?: boolean }) => ({
	class: inputGroupVariants({
		class: clx('data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50', classes),
		width: 'full',
	}),
	classNames,
	'data-disabled': disabled ? 'true' : undefined,
})

const themedCalendar = (calendar: boolean | InputDateCalendarArgs | undefined) =>
	calendar ? { ...(calendar === true ? {} : calendar), component: Calendar as Stateless<BaseCalendarArgs> } : undefined

/** Segment-based date field over the InputGroup chrome; the calendar is opt-in. */
const InputDate = <Range extends boolean = false>({ calendar, ...attrs }: InputDateArgs<Range>) => (
	<BaseInputDate<Range> {...attrs as BaseInputDateArgs<Range>} {...theme(attrs)} calendar={themedCalendar(calendar)} />
)

/** Segment-based time field over the InputGroup chrome. */
const InputTime = <Range extends boolean = false>(attrs: InputTimeArgs<Range>) => (
	<BaseInputTime<Range> {...attrs as BaseInputTimeArgs<Range>} {...theme(attrs)} />
)

/** Segment-based date-time field over the InputGroup chrome; the calendar is opt-in. */
const InputDateTime = <Range extends boolean = false>({ calendar, ...attrs }: InputDateTimeArgs<Range>) => (
	<BaseInputDateTime<Range> {...attrs as BaseInputDateTimeArgs<Range>} {...theme(attrs)} calendar={themedCalendar(calendar)} />
)

/** Segmented field group styled to read like a themed Input. */
const InputDateField: Stateless<InputDateFieldArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateField {...attrs} class={clx(fieldBase, composedField, classes)} />
)

/** Ghost calendar icon button for the trailing addon. */
const InputDateTrigger: Stateless<InputDateTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateTrigger {...attrs} class={clx(addonButtonBase, 'me-2', classes)} />
)

/** Popover surface sized by the calendar. */
const InputDateContent: Stateless<InputDateContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateContent {...attrs} class={clx(contentBase, classes)} />
)

/** Calendar wired to the field; pins the themed Calendar implementation. */
const InputDateCalendar: Stateless<InputDateCalendarArgs> = attrs => (
	<BaseInputDateCalendar {...attrs as BaseInputDateCalendarArgs} component={Calendar as Stateless<BaseCalendarArgs>} />
)

/** Ghost clear button; renders only while a value exists and emits null. */
const InputDateClear: Stateless<InputDateClearArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateClear {...attrs} class={clx(addonButtonBase, classes)} />
)

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
