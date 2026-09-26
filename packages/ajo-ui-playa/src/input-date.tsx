import type { Stateless } from 'ajo'
import clsx from 'clsx'
import { FieldContext } from 'ajo-ui/field'
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
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { buttonVariants } from './button'
import { Calendar } from './calendar'
import { inputGroupAddon, inputGroupAddonAlign, inputGroupVariants, popupAnimation, popupSlide } from './internal/recipes'
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

const fieldBase = 'flex items-center'
const addonButtonBase = clsx(buttonVariants({ size: 'none', variant: 'muted-ghost' }), 'size-6 rounded-[calc(var(--radius)-5px)]')
// No w-72/p-4 here: clsx does not resolve conflicting utilities, so the
// calendar-sized content declares its own w-auto/p-0 without a competitor.
const contentBase = clsx('z-50 m-0 w-auto rounded-lg glass-overlay edge p-0 shadow-lg outline-none', popupAnimation, popupSlide)

const classNames: Record<InputDateClassName, string> = {
	addon: clsx(inputGroupAddon, inputGroupAddonAlign['inline-end']),
	clear: addonButtonBase,
	clear_icon: 'i-lucide-x pointer-events-none size-4',
	content: contentBase,
	control: 'flex h-full min-w-0 flex-1 cursor-text items-center overflow-hidden px-3 py-1 text-base whitespace-nowrap md:text-sm',
	field: fieldBase,
	literal: 'whitespace-pre text-muted-foreground',
	segment: 'rounded-sm px-0.5 tabular-nums outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder=true]:text-muted-foreground [&:not([data-segment=dayPeriod])]:[direction:ltr] [&:not([data-segment=dayPeriod])]:[unicode-bidi:embed]',
	separator: 'px-1 text-muted-foreground',
	trigger: addonButtonBase,
	trigger_icon: 'i-lucide-calendar pointer-events-none size-4',
}

// The one Playa root wrapper: InputGroup chrome, the theme map and Field invalid state.
const theme = ({ class: classes, disabled, 'aria-invalid': invalid }: { class?: string; disabled?: boolean; 'aria-invalid'?: unknown }) => ({
	'aria-invalid': invalid ?? FieldContext()?.controlAttrs['aria-invalid'],
	class: inputGroupVariants({
		class: clsx('data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50', classes),
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
	<BaseInputDateField {...attrs} class={clsx(fieldBase, classes)} />
)

/** Ghost calendar icon button for the trailing addon. */
const InputDateTrigger: Stateless<InputDateTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateTrigger {...attrs} class={clsx(addonButtonBase, classes)} />
)

/** Popover surface sized by the calendar. */
const InputDateContent: Stateless<InputDateContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateContent {...attrs} class={clsx(contentBase, classes)} />
)

/** Calendar wired to the field; pins the themed Calendar implementation. */
const InputDateCalendar: Stateless<InputDateCalendarArgs> = attrs => (
	<BaseInputDateCalendar {...attrs as BaseInputDateCalendarArgs} component={Calendar as Stateless<BaseCalendarArgs>} />
)

/** Ghost clear button; renders only while a value exists and emits null. */
const InputDateClear: Stateless<InputDateClearArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateClear {...attrs} class={clsx(addonButtonBase, classes)} />
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
