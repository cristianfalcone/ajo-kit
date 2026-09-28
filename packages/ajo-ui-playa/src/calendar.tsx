import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	Calendar as BaseCalendar,
	type CalendarMultipleArgs as BaseCalendarMultipleArgs,
	type CalendarRangeArgs as BaseCalendarRangeArgs,
	type CalendarSingleArgs as BaseCalendarSingleArgs,
} from 'ajo-ui/calendar'
import { buttonVariants, type ButtonVariant } from './button'
export type { AvailabilityMatcher, CalendarClassName, CalendarDateRange, CalendarFormatters, CalendarMatcher, CalendarMode, CalendarModifiers, CalendarView, TimeWindow } from 'ajo-ui/calendar'

type ThemeArgs = {
	/** Visual variant for calendar navigation buttons. */
	buttonVariant?: ButtonVariant
}

export type CalendarSingleArgs = BaseCalendarSingleArgs & ThemeArgs
export type CalendarMultipleArgs = BaseCalendarMultipleArgs & ThemeArgs
export type CalendarRangeArgs = BaseCalendarRangeArgs & ThemeArgs

export type CalendarArgs =
	| CalendarMultipleArgs
	| CalendarRangeArgs
	| CalendarSingleArgs

const rootBase = 'group/calendar bg-background p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent'
const monthsBase = 'flex flex-col gap-4 md:flex-row'
const monthBase = 'flex w-full flex-col gap-4'
const navButtonBase = 'size-[var(--cell-size)] rounded-md p-0 select-none aria-disabled:opacity-50'
const navIconBase = 'block size-4 rtl:rotate-180 data-[slot=calendar-previous-icon]:i-lucide-chevron-left data-[slot=calendar-next-icon]:i-lucide-chevron-right'
const captionBase = 'flex h-[var(--cell-size)] w-full items-center gap-1'
const captionLabelBase = 'min-w-0 flex-1 rounded-md px-2 text-center text-sm font-medium outline-none select-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'
const gridBase = 'grid w-full gap-1'
const weekdaysBase = 'grid w-full gap-0'
const weekdayBase = 'flex h-6 items-center justify-center rounded-md text-xs font-normal text-muted-foreground select-none'
const weekBase = 'grid w-full gap-0'
const weekNumberBase = 'flex size-[var(--cell-size)] items-center justify-center text-xs tabular-nums text-muted-foreground select-none'
// Day state lives on the button; the cell paints the range band and today from it.
const dayCellBase = 'group/day relative flex h-[var(--cell-size)] w-full min-w-[var(--cell-size)] items-center justify-center p-0 text-center select-none has-[[data-range-band]]:bg-accent has-[[data-range-band][data-range-start]]:rounded-s-md has-[[data-range-band][data-range-end]]:rounded-e-md has-[[data-today]:not([data-range-band]):not([data-outside])]:rounded-md has-[[data-today]:not([data-range-band]):not([data-outside])]:bg-accent'
const dayButtonBase = 'flex h-[var(--cell-size)] w-full min-w-[var(--cell-size)] flex-col items-center justify-center gap-1 rounded-md leading-none font-normal transition-[color,box-shadow,background-color] data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:hover:bg-primary data-[selected-single=true]:hover:text-primary-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-start=true]:hover:bg-primary data-[range-start=true]:hover:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-end=true]:hover:bg-primary data-[range-end=true]:hover:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-transparent data-[range-middle=true]:text-accent-foreground data-[outside=true]:text-muted-foreground data-[today=true]:font-medium data-[unavailable=true]:line-through data-[unavailable=true]:decoration-danger/70 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&>span]:text-xs [&>span]:opacity-70'
const viewBase = 'grid w-full gap-1 py-1'
const viewCellBase = clx(
	buttonVariants({ size: 'none', transition: false, variant: 'ghost' }),
	'h-10 w-full rounded-md px-2 text-sm font-normal data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[today=true]:font-medium data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
)

/** Ajo-native calendar with single, multiple, and range selection. */
const Calendar: Stateless<CalendarArgs> = ({
	buttonVariant = 'ghost',
	class: classes,
	classNames,
	...attrs
}) => (
	<BaseCalendar
		{...attrs}
		class={clx(rootBase, classes)}
		classNames={{
			caption: clx(captionBase, classNames?.caption),
			caption_label: clx(captionLabelBase, classNames?.caption_label),
			day: clx(dayCellBase, classNames?.day),
			day_button: clx(buttonVariants({ size: 'none', transition: false, variant: 'ghost' }), dayButtonBase, classNames?.day_button),
			grid: clx(gridBase, classNames?.grid),
			head: clx(weekdaysBase, classNames?.head),
			month: clx(monthBase, classNames?.month),
			month_cell: clx(viewCellBase, classNames?.month_cell),
			month_view: clx(viewBase, classNames?.month_view),
			months: clx(monthsBase, classNames?.months),
			nav_button: clx(buttonVariants({ size: 'none', variant: buttonVariant }), navButtonBase, classNames?.nav_button),
			nav_icon: clx(navIconBase, classNames?.nav_icon),
			nav_spacer: clx('size-[var(--cell-size)] shrink-0', classNames?.nav_spacer),
			week: clx(weekBase, classNames?.week),
			week_number: clx(weekNumberBase, classNames?.week_number),
			weekday: clx(weekdayBase, classNames?.weekday),
			year_cell: clx(viewCellBase, classNames?.year_cell),
			year_view: clx(viewBase, classNames?.year_view),
		}}
	/>
)

export { Calendar }
