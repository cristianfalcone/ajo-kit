import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	Calendar as BaseCalendar,
	type CalendarMultipleArgs as BaseCalendarMultipleArgs,
	type CalendarRangeArgs as BaseCalendarRangeArgs,
	type CalendarFormatters,
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

// Cells are --cell-size square. The 2rem default has no specificity, so a
// caller's size wins (days that carry a label need taller rows, all alike).
const rootBase = 'group/calendar bg-background p-3 [:where(&)]:[--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent [[data-slot=input-date-content]_&]:bg-transparent'
const monthsBase = 'flex flex-col gap-4 md:flex-row'
const monthBase = 'flex w-full flex-col gap-4'
const navButtonBase = 'size-[var(--cell-size)] rounded-md p-0 select-none aria-disabled:opacity-50'
const navIconBase = 'block size-4 rtl:rotate-180 data-[slot=calendar-previous-icon]:i-lucide-chevron-left data-[slot=calendar-next-icon]:i-lucide-chevron-right'
const captionBase = 'flex h-[var(--cell-size)] w-full items-center gap-1'
const captionLabelBase = 'min-w-0 flex-1 rounded-md px-2 text-center text-sm font-medium select-none playa-focus hover:bg-accent disabled:pointer-events-none disabled:opacity-50'
const gridBase = 'grid w-full gap-1'
const weekdaysBase = 'grid w-full gap-0'
const weekdayBase = 'flex h-6 items-center justify-center text-xs font-normal whitespace-nowrap text-muted-foreground select-none'
const weekBase = 'grid w-full gap-0'
const weekNumberBase = 'flex size-[var(--cell-size)] items-center justify-center text-xs tabular-nums text-muted-foreground select-none'
// Day state lives on the button; the cell paints the range band from it.
const dayCellBase = 'group/day relative flex h-[var(--cell-size)] w-full min-w-[var(--cell-size)] items-center justify-center p-0 text-center select-none has-[[data-range-band]]:bg-accent has-[[data-range-band][data-range-start]]:rounded-s-md has-[[data-range-band][data-range-end]]:rounded-e-md'
// The selected day, month or year is the one gold plate of the grid (the
// ends of a range, with the tint between them); today is a dot under its
// number, which a selection keeps in its own ink. The dot is ::before, so a
// caller's modifier mark keeps ::after.
const dayButtonBase = [
	'relative flex h-[var(--cell-size)] w-full min-w-[var(--cell-size)] flex-col items-center justify-center gap-1 rounded-md leading-none font-normal transition-[color,box-shadow,background-color]',
	'[&:is([data-selected-single],[data-range-start],[data-range-end])]:gilt-plate [&:is([data-selected-single],[data-range-start],[data-range-end])]:hover:text-primary-foreground',
	'data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-transparent data-[range-middle=true]:text-accent-foreground data-[outside=true]:text-muted-foreground',
	'data-[today=true]:font-medium data-[today=true]:before:absolute data-[today=true]:before:bottom-0.5 data-[today=true]:before:size-1 data-[today=true]:before:rounded-full data-[today=true]:before:bg-current data-[today=true]:before:content-[""]',
	'data-[unavailable=true]:line-through data-[unavailable=true]:decoration-danger/70 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&>span]:text-xs [&>span]:opacity-70',
].join(' ')
const viewBase = 'grid w-full gap-1 py-1'
const viewCellBase = clx(
	buttonVariants({ size: 'none', transition: false, variant: 'ghost' }),
	'h-10 w-full rounded-md px-2 text-sm font-normal data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&[data-selected]:not([data-range-middle])]:gilt-plate data-[today=true]:font-medium data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
)

// A weekday column is one cell wide. Where a locale's short names run past
// four characters (Arabic and Hebrew spell them out) the header shows the
// narrow name and keeps the full one for assistive technology.
const spelledOut = new Map<string, boolean>()
const weekday: CalendarFormatters['weekday'] = (date, locale, timeZone) => {
	let long = spelledOut.get(locale)
	if (long === undefined) {
		const short = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' })
		long = Array.from({ length: 7 }, (_, day) => short.format(Date.UTC(2026, 0, 4 + day))).some(name => [...name].length > 4)
		spelledOut.set(locale, long)
	}
	const name = (style: 'long' | 'narrow' | 'short') => date.toLocaleDateString(locale, { timeZone, weekday: style })
	return long ? <><span aria-hidden="true">{name('narrow')}</span><span class="sr-only">{name('long')}</span></> : name('short')
}

/** Ajo-native calendar with single, multiple, and range selection. */
const Calendar: Stateless<CalendarArgs> = ({
	buttonVariant = 'ghost',
	class: classes,
	classNames,
	formatters,
	...attrs
}) => (
	<BaseCalendar
		{...attrs}
		class={clx(rootBase, classes)}
		formatters={{ weekday, ...formatters }}
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
