import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Calendar as BaseCalendar,
	CalendarDayButton as BaseCalendarDayButton,
	type CalendarCommonArgs as BaseCalendarCommonArgs,
	type CalendarDayState as BaseCalendarDayState,
	type CalendarDropdownArgs as BaseCalendarDropdownArgs,
	type CalendarClassName,
	type CalendarDayButtonArgs,
	type CalendarMultipleArgs as BaseCalendarMultipleArgs,
	type CalendarRangeArgs as BaseCalendarRangeArgs,
	type CalendarSingleArgs as BaseCalendarSingleArgs,
} from 'ajo-ui/calendar'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { buttonVariants, type ButtonVariant } from './button'
import { Select, SelectContent, SelectItem, SelectList, SelectTrigger, SelectValue } from './select'
export type { AvailabilityMatcher, CalendarCaptionLayout, CalendarClassName, CalendarDateRange, CalendarDayButtonArgs, CalendarFormatters, CalendarMatcher, CalendarMode, CalendarModifiers, CalendarView, TimeWindow } from 'ajo-ui/calendar'

type CalendarClassNames = Partial<Record<CalendarClassName, string>>
type CalendarFixedArgs =
	| 'captionLabelClass'
	| 'children'
	| 'dayButtonClass'
	| 'dayClassName'
	| 'defaultValue'
	| 'hiddenDayClass'
	| 'monthDropdown'
	| 'monthLabelClass'
	| 'navButtonClass'
	| 'navSpacerClass'
	| 'nextIconClass'
	| 'previousIconClass'
	| 'yearDropdown'
	| 'yearLabelClass'

type CalendarBaseArgs<Base extends BaseCalendarCommonArgs> = OmitArg<Base, CalendarFixedArgs> & FixedArgs<CalendarFixedArgs> & {
	/** Visual variant for calendar navigation buttons. */
	buttonVariant?: ButtonVariant
	/** Extra date matchers exposed as `data-modifier-*` on day cells. */
	modifiersClassNames?: Record<string, string>
}

export type CalendarSingleArgs = CalendarBaseArgs<BaseCalendarSingleArgs>
export type CalendarMultipleArgs = CalendarBaseArgs<BaseCalendarMultipleArgs>
export type CalendarRangeArgs = CalendarBaseArgs<BaseCalendarRangeArgs>

export type CalendarArgs =
	| CalendarMultipleArgs
	| CalendarRangeArgs
	| CalendarSingleArgs

const rootBase = 'group/calendar bg-background p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent'
const monthsBase = 'flex flex-col gap-4 md:flex-row'
const monthBase = 'flex w-full flex-col gap-4'
const navButtonBase = 'size-[var(--cell-size)] rounded-md p-0 select-none aria-disabled:opacity-50'
const captionBase = 'flex h-[var(--cell-size)] w-full items-center gap-1'
const dropdownsBase = 'flex h-[var(--cell-size)] min-w-0 flex-1 items-center justify-center gap-1.5 text-sm font-medium'
const gridBase = 'grid w-full gap-1'
const weekdaysBase = 'grid w-full gap-0'
const weekdayBase = 'flex h-6 items-center justify-center rounded-md text-xs font-normal text-muted-foreground select-none'
const weekBase = 'grid w-full gap-0'
const weekNumberBase = 'flex size-[var(--cell-size)] items-center justify-center text-xs tabular-nums text-muted-foreground select-none'
const dayCellBase = 'group/day relative flex h-[var(--cell-size)] w-full min-w-[var(--cell-size)] items-center justify-center p-0 text-center select-none'
const dayButtonBase = 'flex h-[var(--cell-size)] w-full min-w-[var(--cell-size)] flex-col items-center justify-center gap-1 rounded-md leading-none font-normal outline-none transition-[color,box-shadow,background-color] focus-visible:ring-3 focus-visible:ring-ring/50 data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:hover:bg-primary data-[selected-single=true]:hover:text-primary-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-start=true]:hover:bg-primary data-[range-start=true]:hover:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-end=true]:hover:bg-primary data-[range-end=true]:hover:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-transparent data-[range-middle=true]:text-accent-foreground data-[outside=true]:text-muted-foreground data-[today=true]:font-medium data-[unavailable=true]:line-through data-[unavailable=true]:decoration-danger/70 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&>span]:text-xs [&>span]:opacity-70'
const labelBase = 'select-none text-sm font-medium'
const viewBase = 'grid w-full gap-1 py-1'
const viewCellBase = clsx(
	buttonVariants({ size: 'none', transition: false, variant: 'ghost' }),
	'h-10 w-full rounded-md px-2 text-sm font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[today=true]:font-medium data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
)
const viewTriggerBase = 'data-[slot=calendar-view-trigger]:rounded-md data-[slot=calendar-view-trigger]:px-2 data-[slot=calendar-view-trigger]:outline-none data-[slot=calendar-view-trigger]:hover:bg-accent data-[slot=calendar-view-trigger]:focus-visible:ring-3 data-[slot=calendar-view-trigger]:focus-visible:ring-ring/50 data-[slot=calendar-view-trigger]:disabled:pointer-events-none data-[slot=calendar-view-trigger]:disabled:opacity-50'

const calendarClassNames = (classNames: CalendarClassNames | undefined) => ({
	caption: clsx(captionBase, classNames?.caption),
	day: classNames?.day,
	day_button: clsx(buttonVariants({ size: 'none', transition: false, variant: 'ghost' }), dayButtonBase, classNames?.day_button),
	dropdowns: clsx(dropdownsBase, classNames?.dropdowns),
	grid: clsx(gridBase, classNames?.grid),
	head: clsx(weekdaysBase, classNames?.head),
	month: clsx(monthBase, classNames?.month),
	month_cell: clsx(viewCellBase, classNames?.month_cell),
	month_view: clsx(viewBase, classNames?.month_view),
	months: clsx(monthsBase, classNames?.months),
	week: clsx(weekBase, classNames?.week),
	week_number: clsx(weekNumberBase, classNames?.week_number),
	weekday: clsx(weekdayBase, classNames?.weekday),
	year_cell: clsx(viewCellBase, classNames?.year_cell),
	year_view: clsx(viewBase, classNames?.year_view),
})

const dayClassName = (
	classNames: CalendarClassNames | undefined,
	modifiersClassNames: Record<string, string> | undefined,
) => ({ modifierNames, modifiers, range }: BaseCalendarDayState) => {
	const modifierClass = modifierNames.map(name => modifiersClassNames?.[name]).filter(Boolean).join(' ')

	return clsx(
		dayCellBase,
		range && modifiers.range_start && 'rounded-s-md bg-accent',
		range && modifiers.range_middle && 'bg-accent',
		range && modifiers.range_end && 'rounded-e-md bg-accent',
		modifiers.today && !range && !modifiers.outside && 'rounded-md bg-accent',
		modifiers.selected && classNames?.selected,
		modifiers.outside && classNames?.outside,
		modifiers.today && classNames?.today,
		modifiers.range_start && classNames?.range_start,
		modifiers.range_middle && classNames?.range_middle,
		modifiers.range_end && classNames?.range_end,
		modifierClass,
		classNames?.day,
	)
}

const CalendarDropdown: Stateless<BaseCalendarDropdownArgs & { triggerClass: string }> = ({
	label,
	onValueChange,
	options,
	triggerClass,
	value,
}) => (
	<Select
		value={value}
		// Select emits null when the current option is reselected; a caption
		// dropdown is never empty, so clears are ignored.
		onValueChange={(next, event) => next == null || onValueChange(String(next), event)}
	>
		<SelectTrigger aria-label={label} class={triggerClass} size="sm">
			<SelectValue />
		</SelectTrigger>
		<SelectContent>
			<SelectList>
				{options.map(option => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectList>
		</SelectContent>
	</Select>
)

const CalendarMonthDropdown: Stateless<BaseCalendarDropdownArgs> = attrs => (
	<CalendarDropdown {...attrs} triggerClass="h-8 w-[6.75rem]" />
)

const CalendarYearDropdown: Stateless<BaseCalendarDropdownArgs> = attrs => (
	<CalendarDropdown {...attrs} triggerClass="h-8 w-[5.5rem]" />
)

/** Ajo-native calendar with single, multiple, and range selection. */
const Calendar: Stateless<CalendarArgs> = ({
	buttonVariant = 'ghost',
	class: classes,
	classNames,
	modifiersClassNames,
	...attrs
}) => {
	const styles = calendarClassNames(classNames)

	return (
		<BaseCalendar
			{...attrs}
			captionLabelClass={clsx(labelBase, viewTriggerBase, 'min-w-0 flex-1 text-center')}
			class={clsx(rootBase, classes)}
			classNames={styles}
			dayButtonClass={styles.day_button}
			dayClassName={dayClassName(classNames, modifiersClassNames)}
			hiddenDayClass="invisible"
			monthDropdown={CalendarMonthDropdown}
			monthLabelClass={labelBase}
			navButtonClass={clsx(buttonVariants({ size: 'none', variant: buttonVariant }), navButtonBase)}
			navSpacerClass="size-[var(--cell-size)] shrink-0"
			nextIconClass="i-lucide-chevron-right block size-4 rtl:rotate-180"
			previousIconClass="i-lucide-chevron-left block size-4 rtl:rotate-180"
			yearDropdown={CalendarYearDropdown}
			yearLabelClass={labelBase}
		/>
	)
}

/** Day button used by Calendar. Exported for advanced composition and testing. */
const CalendarDayButton: Stateless<CalendarDayButtonArgs> = ({
	class: classes,
	...attrs
}) => (
	<BaseCalendarDayButton
		{...attrs}
		class={clsx(buttonVariants({ size: 'none', transition: false, variant: 'ghost' }), dayButtonBase, classes)}
	/>
)

export { Calendar, CalendarDayButton }
