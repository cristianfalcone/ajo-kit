import type { Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'
import { FieldContext } from 'ajo-ui/field'
import {
	InputDate as BaseInputDate,
	InputDateCalendar as BaseInputDateCalendar,
	InputDateClear as BaseInputDateClear,
	InputDateContent as BaseInputDateContent,
	InputDateField as BaseInputDateField,
	InputDatePresets as BaseInputDatePresets,
	InputDateTime as BaseInputDateTime,
	InputDateTimeField as BaseInputDateTimeField,
	InputDateTrigger as BaseInputDateTrigger,
	InputTime as BaseInputTime,
	type InputDateArgs as BaseInputDateArgs,
	type InputDateCalendarArgs as BaseInputDateCalendarArgs,
	type InputDateClearArgs as BaseInputDateClearArgs,
	type InputDateContentArgs as BaseInputDateContentArgs,
	type InputDateFieldArgs as BaseInputDateFieldArgs,
	type InputDatePreset,
	type InputDatePresetsArgs as BaseInputDatePresetsArgs,
	type InputDateTimeArgs as BaseInputDateTimeArgs,
	type InputDateTimeFieldArgs as BaseInputDateTimeFieldArgs,
	type InputDateTriggerArgs as BaseInputDateTriggerArgs,
	type InputTimeArgs as BaseInputTimeArgs,
} from 'ajo-ui/input-date'
import type { CalendarArgs as BaseCalendarArgs } from 'ajo-ui/calendar'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { buttonVariants } from './button'
import { Calendar } from './calendar'
import { InputGroupAddon } from './input-group'
import { inputGroupVariants, popupAnimation, popupSlide } from './internal/recipes'
export type { InputDatePreset, InputDateRangeValue, InputDateSide, InputDateValue, PopupPlacement, PopupPosition } from 'ajo-ui/input-date'

export type InputDateCalendarArgs = OmitArg<BaseInputDateCalendarArgs, 'component'> & FixedArgs<'component'>

export type InputDateArgs<Range extends boolean = false> = OmitArg<BaseInputDateArgs<Range>, 'calendar'> & {
	/** Opt into the calendar popover; an object forwards args to InputDateCalendar. */
	calendar?: boolean | InputDateCalendarArgs
	/** Render a clear button in the trailing addon while a value exists. */
	clearable?: boolean
}

export type InputTimeArgs<Range extends boolean = false> = BaseInputTimeArgs<Range> & {
	/** Render a clear button in the trailing addon while a value exists. */
	clearable?: boolean
}

export type InputDateTimeArgs<Range extends boolean = false> = OmitArg<BaseInputDateTimeArgs<Range>, 'calendar'> & {
	/** Opt into the calendar popover; an object forwards args to InputDateCalendar. */
	calendar?: boolean | InputDateCalendarArgs
	/** Render a clear button in the trailing addon while a value exists. */
	clearable?: boolean
}

export type InputDateFieldArgs = OmitArg<BaseInputDateFieldArgs, 'literalClass' | 'segmentClass'> & FixedArgs<'literalClass' | 'segmentClass'>
export type InputDateTimeFieldArgs = OmitArg<BaseInputDateTimeFieldArgs, 'literalClass' | 'segmentClass'> & FixedArgs<'literalClass' | 'segmentClass'>
export type InputDateTriggerArgs = OmitArg<BaseInputDateTriggerArgs, 'iconClass'> & FixedArgs<'iconClass'>
export type InputDateContentArgs = BaseInputDateContentArgs
export type InputDateClearArgs = OmitArg<BaseInputDateClearArgs, 'iconClass'> & FixedArgs<'iconClass'>
export type InputDatePresetsArgs = OmitArg<BaseInputDatePresetsArgs, 'buttonClass'> & FixedArgs<'buttonClass'>

const rootClasses = (classes: string | undefined) => inputGroupVariants({
	class: clsx('data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50', classes),
	width: 'full',
})
const controlBase = 'flex h-full min-w-0 flex-1 cursor-text items-center overflow-hidden px-3 py-1 text-base whitespace-nowrap md:text-sm'
const fieldBase = 'flex items-center'
const segmentBase = 'rounded-sm px-0.5 tabular-nums outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder=true]:text-muted-foreground [&:not([data-segment=dayPeriod])]:[direction:ltr] [&:not([data-segment=dayPeriod])]:[unicode-bidi:embed]'
const literalBase = 'whitespace-pre text-muted-foreground'
const separatorBase = 'px-1 text-muted-foreground'
const timeFieldBase = 'flex items-center justify-center border-t px-3 py-2'
const addonButtonBase = clsx(buttonVariants({ size: 'none', variant: 'muted-ghost' }), 'size-6 rounded-[calc(var(--radius)-5px)]')
// No w-72/p-4 here: clsx does not resolve conflicting utilities, so the
// calendar-sized content declares its own w-auto/p-0 without a competitor.
const contentBase = 'z-50 m-0 w-auto rounded-lg glass-overlay edge p-0 shadow-lg outline-none'
const presetsBase = 'flex gap-1 p-2'
const presetsButtonBase = clsx(buttonVariants({ size: 'sm', variant: 'ghost' }), 'justify-start font-normal')

const focusSegments = (control: HTMLElement) => {
	const segments = Array.from(control.querySelectorAll<HTMLElement>('[data-segment]'))
	const filled = [...segments].reverse().find(segment => segment.dataset.placeholder !== 'true')
	;(filled ?? segments[0])?.focus()
}

// The addon click-forwarding calls focus() on the control slot: shadow the
// method so delegation walks back to the last filled segment.
function delegateFocus(this: HTMLElement) {
	focusSegments(this)
}

/** Segments container: the input-group control slot with delegated focus. */
const InputDateControl: Stateless<WithChildren<{ disabled?: boolean }>> = ({ children, disabled }) => (
	<div
		class={controlBase}
		data-slot="input-group-control"
		set:focus={delegateFocus}
		set:onpointerdown={(event: PointerEvent) => {
			// Field-group clicks are the base root's own walk-back; this covers
			// the wrapper's whitespace and the range separator literal.
			if (event.button || disabled) return
			if (event.target instanceof Element && event.target.closest('[data-slot="input-date-field"]')) return
			event.preventDefault()
			focusSegments(event.currentTarget as HTMLElement)
		}}
	>
		{children}
	</div>
)

type DefaultsArgs = {
	calendar?: boolean | InputDateCalendarArgs
	clearable?: boolean
	disabled?: boolean
	presets?: InputDatePreset[]
	range?: boolean
	time?: boolean
}

const defaultChildren = ({ calendar, clearable, disabled, presets, range, time }: DefaultsArgs) => (
	<>
		<InputDateControl disabled={disabled}>
			{range ? (
				<>
					<InputDateField side="from" />
					<div aria-hidden="true" class={separatorBase} data-slot="input-date-separator">–</div>
					<InputDateField side="to" />
				</>
			) : (
				<InputDateField />
			)}
		</InputDateControl>
		{clearable || calendar ? (
			<InputGroupAddon align="inline-end">
				{clearable ? <InputDateClear /> : null}
				{calendar ? <InputDateTrigger /> : null}
			</InputGroupAddon>
		) : null}
		{calendar ? (
			<InputDateContent class={range && presets?.length ? '[&:popover-open]:flex' : undefined}>
				<div class="flex flex-col" data-slot="input-date-picker">
					<InputDateCalendar {...(typeof calendar === 'object' ? calendar : {})} />
					{time ? range ? <><InputDateTimeField side="from" /><InputDateTimeField side="to" /></> : <InputDateTimeField /> : null}
				</div>
				{presets?.length ? <InputDatePresets class={range ? 'flex-col border-l' : 'flex-wrap border-t'} /> : null}
			</InputDateContent>
		) : null}
	</>
)

/** Segment-based date field over the InputGroup chrome; the calendar is opt-in. */
const InputDate = <Range extends boolean = false>({
	calendar,
	children,
	class: classes,
	clearable,
	presets,
	range,
	...attrs
}: InputDateArgs<Range>) => {
	const field = FieldContext()

	return (
		<BaseInputDate<Range>
			{...attrs as BaseInputDateArgs<Range>}
			aria-invalid={attrs['aria-invalid'] ?? field?.controlAttrs['aria-invalid']}
			class={rootClasses(classes)}
			data-disabled={attrs.disabled ? 'true' : undefined}
			presets={presets}
			range={range}
		>
			{children ?? defaultChildren({ calendar, clearable, disabled: attrs.disabled, presets: presets as InputDatePreset[] | undefined, range })}
		</BaseInputDate>
	)
}

/** Segment-based time field over the InputGroup chrome. */
const InputTime = <Range extends boolean = false>({
	children,
	class: classes,
	clearable,
	range,
	...attrs
}: InputTimeArgs<Range>) => {
	const field = FieldContext()

	return (
		<BaseInputTime<Range>
			{...attrs as BaseInputTimeArgs<Range>}
			aria-invalid={attrs['aria-invalid'] ?? field?.controlAttrs['aria-invalid']}
			class={rootClasses(classes)}
			data-disabled={attrs.disabled ? 'true' : undefined}
			range={range}
		>
			{children ?? defaultChildren({ clearable, disabled: attrs.disabled, range })}
		</BaseInputTime>
	)
}

/** Segment-based date-time field over the InputGroup chrome; the calendar is opt-in. */
const InputDateTime = <Range extends boolean = false>({
	calendar,
	children,
	class: classes,
	clearable,
	presets,
	range,
	...attrs
}: InputDateTimeArgs<Range>) => {
	const field = FieldContext()

	return (
		<BaseInputDateTime<Range>
			{...attrs as BaseInputDateTimeArgs<Range>}
			aria-invalid={attrs['aria-invalid'] ?? field?.controlAttrs['aria-invalid']}
			class={rootClasses(classes)}
			data-disabled={attrs.disabled ? 'true' : undefined}
			presets={presets}
			range={range}
		>
			{children ?? defaultChildren({ calendar, clearable, disabled: attrs.disabled, presets: presets as InputDatePreset[] | undefined, range, time: true })}
		</BaseInputDateTime>
	)
}

/** Segmented field group styled to read like a themed Input. */
const InputDateField: Stateless<InputDateFieldArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateField
		{...attrs}
		class={clsx(fieldBase, classes)}
		literalClass={literalBase}
		segmentClass={segmentBase}
	/>
)

/** Popover time surface sharing the root field's live segment engine. */
const InputDateTimeField: Stateless<InputDateTimeFieldArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateTimeField
		{...attrs}
		class={clsx(timeFieldBase, classes)}
		literalClass={literalBase}
		segmentClass={segmentBase}
	/>
)

/** Ghost calendar icon button for the trailing addon. */
const InputDateTrigger: Stateless<InputDateTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateTrigger
		{...attrs}
		class={clsx(addonButtonBase, classes)}
		iconClass="i-lucide-calendar pointer-events-none size-4"
	/>
)

/** Popover surface sized by the calendar. */
const InputDateContent: Stateless<InputDateContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateContent {...attrs} class={clsx(contentBase, popupAnimation, popupSlide, classes)} />
)

/** Calendar wired to the field; pins the themed Calendar implementation. */
const InputDateCalendar: Stateless<InputDateCalendarArgs> = attrs => (
	<BaseInputDateCalendar {...attrs as BaseInputDateCalendarArgs} component={Calendar as Stateless<BaseCalendarArgs>} />
)

/** Ghost clear button; renders only while a value exists and emits null. */
const InputDateClear: Stateless<InputDateClearArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDateClear
		{...attrs}
		class={clsx(addonButtonBase, classes)}
		iconClass="i-lucide-x pointer-events-none size-4"
	/>
)

/** Ghost preset button list for the popover footer (single) or sidebar (range). */
const InputDatePresets: Stateless<InputDatePresetsArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputDatePresets
		{...attrs}
		buttonClass={presetsButtonBase}
		class={clsx(presetsBase, classes)}
	/>
)

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
