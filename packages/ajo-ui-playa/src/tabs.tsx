import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	Tabs as BaseTabs,
	TabsContent as BaseTabsContent,
	TabsList as BaseTabsList,
	TabsTrigger as BaseTabsTrigger,
	type TabsArgs as BaseTabsArgs,
	type TabsContentArgs as BaseTabsContentArgs,
	type TabsListArgs as BaseTabsListArgs,
	type TabsTriggerArgs as BaseTabsTriggerArgs,
} from 'ajo-ui/tabs'
export type { TabsActivationMode, TabsOrientation } from 'ajo-ui/tabs'

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
// points, fading ends): but the fade rides the data-overflow stamps from the
// base (ajo-cloves `overflow`), because the pill has no room for the
// padding-matches-fade trick and a static mask would dim its resting edges.
// No justify-center: with w-fit/h-fit it is a no-op while the list fits, and
// once the list overflows it shifts content across the scroll origin, leaving
// the leading tabs unreachable by scrolling.
const listBase = clx(
	'group/tabs-list inline-flex w-fit items-center rounded-lg p-1 text-muted-foreground data-[variant=line]:rounded-none',
	'max-w-full min-w-0 scrollbar-none scroll-smooth motion-reduce:scroll-auto',
	// Scroll padding matches the 1rem fade so a snapped or
	// scrolled-into-view tab rests clear of it (first/last clamp to the
	// pill's own end).
	'group-data-[orientation=horizontal]/tabs:h-control group-data-[orientation=horizontal]/tabs:overflow-x-auto group-data-[orientation=horizontal]/tabs:overscroll-x-contain group-data-[orientation=horizontal]/tabs:snap-x group-data-[orientation=horizontal]/tabs:snap-mandatory group-data-[orientation=horizontal]/tabs:scroll-px-4',
	'group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:max-h-full group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:overflow-y-auto group-data-[orientation=vertical]/tabs:overscroll-y-contain group-data-[orientation=vertical]/tabs:snap-y group-data-[orientation=vertical]/tabs:snap-mandatory group-data-[orientation=vertical]/tabs:scroll-py-4',
	// The sliding active marker: a single pseudo-element positioned by the
	// base's indicator variables glides between triggers. `isolate` keeps its
	// negative z above the track fill but below the trigger labels, and the
	// marker only shows once the base stamps data-indicator. The base measures
	// it from the physical left, so it is placed there in both directions.
	'relative isolate before:content-empty before:pointer-events-none before:absolute before:left-0 before:top-0 before:-z-1 before:opacity-0 data-[indicator]:before:opacity-100 before:translate-x-[var(--indicator-x)] before:translate-y-[var(--indicator-y)] before:w-[var(--indicator-w)] before:h-[var(--indicator-h)] before:transition-[translate,width,height,opacity] before:duration-200 before:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:before:transition-none',
)
// The marker covers the selected tab. The track is enamel and the selected
// tab wears the gold tint of a set's selection (D28). The line variant paints
// only a 2px gold bar on the tab's inner side, inside a clear border of one
// focus width, so the ring drawn outside a focused tab stays apart from it.
// The marker mirrors in RTL, where a vertical list sits on the panel's other
// side, so the bar keeps facing the panel.
const listVariants: Record<TabsListVariant, string> = {
	default: 'panel before:rounded-md before:bg-accent',
	line: clx(
		// The bar is gold at text strength, so it holds 3:1 on ivory.
		'gap-1 bg-transparent rtl:before:-scale-x-100 before:[border:var(--focus-width)_solid_transparent] before:bg-origin-content before:bg-clip-content',
		'group-data-[orientation=horizontal]/tabs:before:bg-[linear-gradient(to_top,var(--gold-text)_2px,transparent_0)] group-data-[orientation=vertical]/tabs:before:bg-[linear-gradient(to_left,var(--gold-text)_2px,transparent_0)]',
	),
}

const triggerBase = clx(
	'relative inline-flex h-full flex-1 snap-start items-center justify-center gap-2 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-[color]',
	'group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground playa-focus',
	'playa-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
	'data-[state=active]:text-foreground',
	// A line tab has no fill, so its ring can hug it: at the small radius the
	// bar's ends stay clear of the ring's corners.
	'group-data-[variant=line]/tabs-list:rounded-xs',
)
// A focusable panel takes the preflight's one ring.
const contentBase = 'flex-1'

/** Root provider for tab state. */
const Tabs: Stateless<TabsArgs> = ({ class: classes, ...attrs }) => (
	<BaseTabs {...attrs} class={clx(rootBase, classes)} />
)

/** Container for tab triggers. */
const TabsList: Stateless<TabsListArgs> = ({ class: classes, variant = 'default', ...attrs }) => (
	<BaseTabsList {...attrs} class={clx(listBase, listVariants[variant], classes)} data-variant={variant} />
)

/** Button that activates a tab panel. */
const TabsTrigger: Stateless<TabsTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseTabsTrigger {...attrs} class={clx(triggerBase, classes)} />
)

/** Panel displayed by its matching TabsTrigger. */
const TabsContent: Stateless<TabsContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseTabsContent {...attrs} class={clx(contentBase, classes)} />
)

export { Tabs, TabsContent, TabsList, TabsTrigger }
