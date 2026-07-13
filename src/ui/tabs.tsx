import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Tabs as BaseTabs,
	TabsContent as BaseTabsContent,
	TabsList as BaseTabsList,
	TabsTrigger as BaseTabsTrigger,
	type TabsActivationMode as BaseTabsActivationMode,
	type TabsArgs as BaseTabsArgs,
	type TabsContentArgs as BaseTabsContentArgs,
	type TabsListArgs as BaseTabsListArgs,
	type TabsOrientation as BaseTabsOrientation,
	type TabsTriggerArgs as BaseTabsTriggerArgs,
} from 'ajo-ui/tabs'

export type TabsOrientation = BaseTabsOrientation
export type TabsActivationMode = BaseTabsActivationMode
export type TabsListVariant = 'default' | 'line'

export type TabsArgs = BaseTabsArgs & { class?: string }
export type TabsListArgs = BaseTabsListArgs & {
	class?: string
	/** Visual style for the tab list. */
	variant?: TabsListVariant
}
export type TabsTriggerArgs = BaseTabsTriggerArgs & { class?: string }
export type TabsContentArgs = BaseTabsContentArgs & { class?: string }

const rootBase = 'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col'

// Overflowing lists scroll like AttachmentGroup (hidden scrollbar, snap
// points, edge fade) — but the fade rides the data-overflow stamps from the
// base (ajo-cloves `overflow`), because the pill has no room for the
// padding-matches-fade trick and a static mask would dim its resting edges.
// No justify-center: with w-fit/h-fit it is a no-op while the list fits, and
// once the list overflows it shifts content across the scroll origin, leaving
// the leading tabs unreachable by scrolling.
const listBase = clsx(
	'group/tabs-list inline-flex w-fit items-center rounded-lg p-[3px] text-muted-foreground data-[variant=line]:rounded-none',
	'max-w-full min-w-0 scrollbar-none scroll-smooth motion-reduce:scroll-auto',
	// Scroll padding matches the 1rem edge fade so a snapped or
	// scrolled-into-view tab rests clear of it (first/last clamp to the
	// pill's own edge).
	'group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=horizontal]/tabs:overflow-x-auto group-data-[orientation=horizontal]/tabs:overscroll-x-contain group-data-[orientation=horizontal]/tabs:snap-x group-data-[orientation=horizontal]/tabs:snap-mandatory group-data-[orientation=horizontal]/tabs:scroll-px-4',
	'group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:max-h-full group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:overflow-y-auto group-data-[orientation=vertical]/tabs:overscroll-y-contain group-data-[orientation=vertical]/tabs:snap-y group-data-[orientation=vertical]/tabs:snap-mandatory group-data-[orientation=vertical]/tabs:scroll-py-4',
	// The sliding active marker: a single pseudo-element positioned by the
	// base's indicator variables glides between triggers. `isolate` keeps its
	// negative z above the track fill but below the trigger labels, and the
	// marker only shows once the base stamps data-indicator.
	'relative isolate before:content-empty before:pointer-events-none before:absolute before:left-0 before:top-0 before:-z-1 before:opacity-0 data-[indicator]:before:opacity-100 before:transition-[translate,width,height,opacity] before:duration-200 before:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:before:transition-none',
)
// The track is a tint, not glass: tab lists usually rest on glass cards, and
// stacking a second backdrop-filter there hurts both legibility and paint.
// Geometry single-owner rule: each variant owns the marker's translate/size
// completely (the line variant hugs the trigger's inner edge so the bar stays
// inside the scroll clip).
const listVariants: Record<TabsListVariant, string> = {
	default: clsx(
		'bg-muted/60 edge',
		'before:translate-x-[var(--indicator-x)] before:translate-y-[var(--indicator-y)] before:w-[var(--indicator-w)] before:h-[var(--indicator-h)] before:rounded-md before:bg-card',
	),
	line: clsx(
		'gap-1 bg-transparent before:bg-primary before:rounded-full',
		'group-data-[orientation=horizontal]/tabs:before:translate-x-[var(--indicator-x)] group-data-[orientation=horizontal]/tabs:before:translate-y-[calc(var(--indicator-y)+var(--indicator-h)-2px)] group-data-[orientation=horizontal]/tabs:before:w-[var(--indicator-w)] group-data-[orientation=horizontal]/tabs:before:h-0.5',
		'group-data-[orientation=vertical]/tabs:before:translate-x-[calc(var(--indicator-x)+var(--indicator-w)-2px)] group-data-[orientation=vertical]/tabs:before:translate-y-[var(--indicator-y)] group-data-[orientation=vertical]/tabs:before:w-0.5 group-data-[orientation=vertical]/tabs:before:h-[var(--indicator-h)]',
	),
}

const triggerBase = clsx(
	'relative inline-flex h-[calc(100%-1px)] flex-1 snap-start items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-[color]',
	'group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
	'disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
	'data-[state=active]:text-foreground',
)
const contentBase = 'flex-1 outline-none'

/** Root provider for tab state. */
const Tabs: Stateless<TabsArgs> = ({
	activationMode = 'automatic',
	children,
	class: classes,
	defaultValue,
	dir,
	loop = true,
	onValueChange,
	orientation = 'horizontal',
	value,
	...attrs
}) => (
	<BaseTabs
		{...attrs}
		activationMode={activationMode}
		class={clsx(rootBase, classes)}
		defaultValue={defaultValue}
		dir={dir}
		loop={loop}
		onValueChange={onValueChange}
		orientation={orientation}
		value={value}
	>
		{children}
	</BaseTabs>
)

/** Returns the UnoCSS class list for a tabs list. */
export const tabsListVariants = ({
	class: classes,
	variant = 'default',
}: {
	class?: TabsListArgs['class']
	variant?: TabsListVariant
} = {}) => clsx(listBase, listVariants[variant], classes)

/** Container for tab triggers. */
const TabsList: Stateless<TabsListArgs> = ({
	children,
	class: classes,
	role = 'tablist',
	variant = 'default',
	...attrs
}) => (
	<BaseTabsList
		{...attrs}
		class={tabsListVariants({ class: classes, variant })}
		data-variant={variant}
		role={role}
	>
		{children}
	</BaseTabsList>
)

/** Button that activates a tab panel. */
const TabsTrigger: Stateless<TabsTriggerArgs> = ({
	children,
	class: classes,
	disabled,
	id,
	'set:onclick': onClick,
	'set:onfocus': onFocus,
	type = 'button',
	value,
	...attrs
}) => (
	<BaseTabsTrigger
		{...attrs}
		class={clsx(triggerBase, classes)}
		disabled={disabled}
		id={id}
		set:onclick={onClick}
		set:onfocus={onFocus}
		type={type}
		value={String(value)}
	>
		{children}
	</BaseTabsTrigger>
)

/** Panel displayed by its matching TabsTrigger. */
const TabsContent: Stateless<TabsContentArgs> = ({
	children,
	class: classes,
	forceMount,
	value,
	...attrs
}) => (
	<BaseTabsContent
		{...attrs}
		class={clsx(contentBase, classes)}
		forceMount={forceMount}
		value={String(value)}
	>
		{children}
	</BaseTabsContent>
)

export { Tabs, TabsContent, TabsList, TabsTrigger }
