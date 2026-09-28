import type { Preset } from 'unocss'

// Chart marks: hover dimming, bar corners, and the draw and grow motion.
const marks = [
  '[data-slot=chart] [data-slot=chart-bar] rect[data-chart-index],[data-slot=chart] [data-slot=chart-pie] path[data-chart-index]{transition:opacity 150ms ease,stroke-width 150ms ease}[data-slot=chart] [data-slot=chart-line] circle[data-chart-index],[data-slot=chart] [data-slot=chart-area] circle[data-chart-index]{transition:opacity 150ms ease,stroke-width 150ms ease,r 150ms ease}[data-slot=chart]:has([data-active]) [data-slot=chart-bar] rect[data-chart-index]:not([data-active]),[data-slot=chart]:has([data-active]) [data-slot=chart-pie] path[data-chart-index]:not([data-active]),[data-slot=chart]:has([data-active]) [data-slot=chart-line] circle[data-chart-index]:not([data-active]),[data-slot=chart]:has([data-active]) [data-slot=chart-area] circle[data-chart-index]:not([data-active]){opacity:.45}[data-slot=chart] [data-active]{opacity:1}[data-slot=chart] circle[data-active]{r:5.6px}',
  '[data-slot=chart] [data-slot=chart-bar] rect[data-chart-sign=positive]{clip-path:inset(0 round 4px 4px 0 0) fill-box}[data-slot=chart] [data-slot=chart-bar] rect[data-chart-sign=negative]{clip-path:inset(0 round 0 0 4px 4px) fill-box}',
  '@media (prefers-reduced-motion:no-preference){@keyframes chart-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes chart-undash{to{stroke-dasharray:initial}}@keyframes chart-grow{from{transform:scaleY(0)}}@keyframes chart-settle{from{opacity:0;transform:translateY(4px)}}@keyframes chart-pop{from{opacity:0;transform:scale(0)}}[data-slot=chart] [data-slot=chart-bar] rect[data-chart-series]{transform-box:fill-box;transform-origin:bottom center;animation:chart-grow 450ms cubic-bezier(0.22,1,0.36,1) both;animation-delay:calc(var(--chart-index,0) * 30ms);transition:x 300ms ease-out,y 300ms ease-out,width 300ms ease-out,height 300ms ease-out,opacity 150ms ease,stroke-width 150ms ease}[data-slot=chart] [data-slot=chart-line] path[fill=none],[data-slot=chart] [data-slot=chart-area] path[fill=none]{stroke-dasharray:1;animation:chart-draw 600ms ease-out both,chart-undash 1ms 600ms step-end forwards;transition:d 300ms ease-out}[data-slot=chart] [data-slot=chart-area] path[fill-opacity]{transform-box:fill-box;animation:chart-settle 500ms ease-out both;transition:d 300ms ease-out}[data-slot=chart] [data-slot=chart-line] circle[data-chart-index],[data-slot=chart] [data-slot=chart-area] circle[data-chart-index]{transform-box:fill-box;transform-origin:center;animation:chart-pop 300ms ease-out both;animation-delay:calc(200ms + var(--chart-index,0) * 20ms);transition:cx 300ms ease-out,cy 300ms ease-out,opacity 150ms ease,stroke-width 150ms ease,r 150ms ease}[data-slot=chart] [data-slot=chart-pie] path[data-chart-index]{transform-box:view-box;transform-origin:center;animation:chart-pop 400ms ease-out both;animation-delay:calc(var(--chart-index,0) * 60ms);transition:d 300ms ease-out,opacity 150ms ease,stroke-width 150ms ease}}',
  '@media (prefers-reduced-motion:no-preference){[data-slot=chart] [data-slot=chart-bar] rect[data-chart-sign=negative]{transform-origin:top center}[data-slot=chart] [data-slot=chart-bar] rect[data-chart-sign=zero]{transform-origin:center}}',
  '@media (prefers-reduced-motion:no-preference){[data-slot=chart] [data-slot=chart-tooltip][data-positioned=true]{transition:transform 200ms ease-out}}',
].join('')

/** Shortcuts and rules of Table, DataTable, Pagination, VirtualList and Chart. */
export const data: Preset = {
  name: 'ajo-ui-playa-data',
  // Global rules for base-owned parts, emitted only when the family's
  // shortcut is used. They join the preflight layer, before every utility,
  // so the family's own classes still override them.
  rules: [['playa-chart-marks', [marks], { layer: 'preflights' }]],
  shortcuts: {
    // The frame is an outline, not an inset ring: outlines paint after all
    // descendants, so opaque row fills (a selected row's bg-muted) cannot
    // cover the table's edges the way they cover an inset box-shadow. Offset
    // 0 keeps the line just outside the box, clear of row tints entirely.
    'playa-table-container': 'relative w-full overflow-x-auto rounded-lg outline outline-solid outline-border',
    // One slot recipe owns the whole table family. The manual Table wrapper
    // and the DataTable root both carry `playa-table`, so header/cell
    // geometry, typography, and row states have a single source and render
    // identically. Stateful rules are written variant-first
    // (`hover:[&_...]`) or as one literal selector: expanding a
    // variant-bearing shortcut under a slot prefix hangs the inner variant on
    // the recipe root (`.x:hover :where(row)` highlights every row at once).
    'playa-table': [
      // Row hairlines are plain --border, same as every other hairline in
      // the theme: one uniform line weight everywhere, adapting to the
      // surface. The table is border-separate and the lines live on the
      // CELLS: collapsed tr borders paint straddling the row boundary (the
      // pixel lands over the next row's background), which makes tint
      // compensation land on the wrong line; a cell border always paints
      // inside its own row, over its own row's fill.
      '[&_:where([data-slot=table])]:w-full [&_:where([data-slot=table])]:border-separate [&_:where([data-slot=table])]:border-spacing-0 [&_:where([data-slot=table])]:caption-bottom [&_:where([data-slot=table])]:text-sm',
      // Every row owns its bottom hairline (the footer's top line is the last
      // body row's border, painted over plain background instead of the muted
      // footer fill). Only the true visual end drops it: the last row of the
      // last row group, and only when no caption renders below — a DOM
      // :last-child check alone lies under caption-side bottom.
      '[&_:where([data-slot=table]):not(:has([data-slot=table-caption]))_:where([data-slot=table-body],[data-slot=table-footer]):last-child_tr:last-child>*]:border-b-0',
      '[&_:where([data-slot=table-footer])]:bg-muted/50 [&_:where([data-slot=table-footer])]:font-medium',
      // Hover only means something on data rows; header and footer stay
      // quiet. The translucent hairline keeps its weight over the tint.
      '[&_:where([data-slot=table-row])>*]:border-b [&_:where([data-slot=table-row])>*]:transition-colors [&_:where([data-slot=table-row])]:transition-colors [&_:where([data-slot=table-body])_:where([data-slot=table-row]):hover]:bg-accent has-aria-expanded:[&_:where([data-slot=table-row])]:bg-accent data-[state=selected]:[&_:where([data-slot=table-row])]:bg-muted',
      '[&_:where([data-slot=table-head])]:h-11 [&_:where([data-slot=table-head])]:px-4 [&_:where([data-slot=table-head])]:text-left [&_:where([data-slot=table-head])]:align-middle [&_:where([data-slot=table-head])]:text-xs [&_:where([data-slot=table-head])]:font-medium [&_:where([data-slot=table-head])]:uppercase [&_:where([data-slot=table-head])]:tracking-wider [&_:where([data-slot=table-head])]:whitespace-nowrap [&_:where([data-slot=table-head])]:text-muted-foreground',
      '[&_:where([data-slot=table-cell])]:px-4 [&_:where([data-slot=table-cell])]:py-3 [&_:where([data-slot=table-cell])]:align-middle [&_:where([data-slot=table-cell])]:whitespace-nowrap',
      '[&_:where([data-slot=table-head],[data-slot=table-cell]):has([data-slot=checkbox])]:pr-0 [&_:where([data-slot=table-head],[data-slot=table-cell])>[data-slot=checkbox]]:translate-y-[2px]',
      '[&_:where([data-slot=table-caption])]:my-4 [&_:where([data-slot=table-caption])]:text-sm [&_:where([data-slot=table-caption])]:text-muted-foreground',
      '[&_:where([data-align=center])]:text-center [&_:where([data-align=right])]:text-right',
    ].join(' '),
    // Chart paints the base parts by data-slot and state attributes: SVG
    // strokes and fills, the tooltip rows by indicator shape and nesting, and
    // the legend entries. State rules use `:is` to outrank the `:where` base.
    'playa-chart': [
      'playa-chart-marks relative flex aspect-video min-h-[200px] w-full flex-col justify-center text-xs text-muted-foreground',
      '[&_:where([data-slot=chart-grid]>line)]:[stroke:var(--border)] [&_:where([data-slot=chart-axis]>line)]:[stroke:var(--muted-foreground)] [&_:where([data-slot=chart-axis]>line)]:[stroke-opacity:0.5]',
      '[&_:where([data-chart-index])]:outline-none [&_:is(rect[data-chart-index]:focus-visible)]:opacity-80 [&_:where(circle[data-chart-index])]:[fill:var(--background)] [&_:where([data-slot=chart-pie]>path)]:[stroke:var(--background)]',
      '[&_:where([data-slot=chart-pie-total])]:[fill:var(--foreground)] [&_:where([data-slot=chart-pie-total])]:text-sm [&_:where([data-slot=chart-pie-total])]:font-medium',
      '[&_:where([data-slot=chart-tooltip-label])]:font-medium [&_:is([data-nested]_[data-slot=chart-tooltip-label])]:text-foreground',
      '[&_:where([data-slot=chart-tooltip-items],[data-slot=chart-tooltip-names])]:grid [&_:where([data-slot=chart-tooltip-items],[data-slot=chart-tooltip-names])]:gap-1.5',
      '[&_:where([data-slot=chart-tooltip-item])]:flex [&_:where([data-slot=chart-tooltip-item])]:w-full [&_:where([data-slot=chart-tooltip-item])]:items-stretch [&_:where([data-slot=chart-tooltip-item])]:gap-2 [&_:is([data-slot=chart-tooltip-item][data-indicator=dot])]:items-center',
      '[&_:where([data-slot=chart-tooltip-indicator])]:shrink-0 [&_:where([data-slot=chart-tooltip-indicator])]:rounded-[2px] [&_:where([data-slot=chart-tooltip-indicator])]:border-[--chart-indicator] [&_:where([data-slot=chart-tooltip-indicator])]:bg-[--chart-indicator]',
      '[&_:is([data-indicator=dot]>[data-slot=chart-tooltip-indicator])]:size-2.5 [&_:is([data-indicator=line]>[data-slot=chart-tooltip-indicator])]:w-1',
      '[&_:is([data-indicator=dashed]>[data-slot=chart-tooltip-indicator])]:w-0 [&_:is([data-indicator=dashed]>[data-slot=chart-tooltip-indicator])]:[border-width:1.5px] [&_:is([data-indicator=dashed]>[data-slot=chart-tooltip-indicator])]:border-dashed [&_:is([data-indicator=dashed]>[data-slot=chart-tooltip-indicator])]:bg-transparent [&_:is([data-indicator=dashed][data-nested]>[data-slot=chart-tooltip-indicator])]:my-0.5',
      '[&_:where([data-slot=chart-tooltip-row])]:flex [&_:where([data-slot=chart-tooltip-row])]:flex-1 [&_:where([data-slot=chart-tooltip-row])]:items-center [&_:where([data-slot=chart-tooltip-row])]:justify-between [&_:where([data-slot=chart-tooltip-row])]:gap-4 [&_:where([data-slot=chart-tooltip-row])]:leading-none [&_:is([data-nested]>[data-slot=chart-tooltip-row])]:items-end',
      '[&_:where([data-slot=chart-tooltip-name])]:text-muted-foreground [&_:where([data-slot=chart-tooltip-value])]:font-mono [&_:where([data-slot=chart-tooltip-value])]:font-medium [&_:where([data-slot=chart-tooltip-value])]:text-foreground [&_:where([data-slot=chart-tooltip-value])]:tabular-nums',
      '[&_:where([data-slot=chart-tooltip-icon],[data-slot=chart-legend-icon])]:text-muted-foreground [&_:where([data-slot=chart-tooltip-icon]>svg,[data-slot=chart-legend-icon]>svg)]:size-3',
      '[&_:where([data-slot=chart-legend-item])]:flex [&_:where([data-slot=chart-legend-item])]:items-center [&_:where([data-slot=chart-legend-item])]:gap-1.5 [&_:where([data-slot=chart-legend-swatch])]:size-2 [&_:where([data-slot=chart-legend-swatch])]:shrink-0 [&_:where([data-slot=chart-legend-swatch])]:rounded-[2px]',
    ].join(' '),
    'playa-data-table': [
      'flex w-full flex-col gap-4',
      '[&_:where([data-slot=data-table-toolbar])]:flex [&_:where([data-slot=data-table-toolbar])]:flex-col [&_:where([data-slot=data-table-toolbar])]:gap-2 sm:[&_:where([data-slot=data-table-toolbar])]:flex-row sm:[&_:where([data-slot=data-table-toolbar])]:items-center sm:[&_:where([data-slot=data-table-toolbar])]:justify-between',
      '[&_:where([data-slot=data-table-toolbar-controls])]:flex [&_:where([data-slot=data-table-toolbar-controls])]:flex-1 [&_:where([data-slot=data-table-toolbar-controls])]:flex-wrap [&_:where([data-slot=data-table-toolbar-controls])]:items-center [&_:where([data-slot=data-table-toolbar-controls])]:gap-2',
      '[&_:where([data-slot=data-table-search])]:h-8 [&_:where([data-slot=data-table-search])]:w-[180px] [&_:where([data-slot=data-table-search])]:rounded-md [&_:where([data-slot=data-table-search])]:edge-input [&_:where([data-slot=data-table-search])]:bg-transparent [&_:where([data-slot=data-table-search])]:px-3 [&_:where([data-slot=data-table-search])]:text-sm [&_:where([data-slot=data-table-search])]:outline-none [&_:where([data-slot=data-table-search])]:placeholder:text-muted-foreground focus-visible:[&_:where([data-slot=data-table-search])]:inset-ring-ring focus-visible:[&_:where([data-slot=data-table-search])]:ring-3 focus-visible:[&_:where([data-slot=data-table-search])]:ring-ring/25 lg:[&_:where([data-slot=data-table-search])]:w-[260px]',
      '[&_:where([data-slot=data-table-facet])]:inline-flex [&_:where([data-slot=data-table-facet])]:h-8 [&_:where([data-slot=data-table-facet])]:items-center [&_:where([data-slot=data-table-facet])]:gap-2 [&_:where([data-slot=data-table-facet])]:rounded-md [&_:where([data-slot=data-table-facet])]:border [&_:where([data-slot=data-table-facet])]:border-dashed [&_:where([data-slot=data-table-facet])]:px-3 [&_:where([data-slot=data-table-facet])]:text-sm [&_:where([data-slot=data-table-facet])]:font-medium [&_:where([data-slot=data-table-facet])]:outline-none hover:[&_:where([data-slot=data-table-facet])]:bg-accent focus-visible:[&_:where([data-slot=data-table-facet])]:ring-3 focus-visible:[&_:where([data-slot=data-table-facet])]:ring-ring/50',
      '[&_:where([data-slot=data-table-facet-icon])]:i-lucide-list-filter [&_:where([data-slot=data-table-facet-icon])]:size-4 [&_:where([data-slot=data-table-facet-count])]:rounded-xs [&_:where([data-slot=data-table-facet-count])]:bg-muted [&_:where([data-slot=data-table-facet-count])]:px-1.5 [&_:where([data-slot=data-table-facet-count])]:py-0.5 [&_:where([data-slot=data-table-facet-count])]:text-xs [&_:where([data-slot=data-table-facet-count])]:tabular-nums',
      '[&_:where([data-slot=data-table-columns])]:inline-flex [&_:where([data-slot=data-table-columns])]:h-8 [&_:where([data-slot=data-table-columns])]:items-center [&_:where([data-slot=data-table-columns])]:gap-2 [&_:where([data-slot=data-table-columns])]:rounded-md [&_:where([data-slot=data-table-columns])]:edge [&_:where([data-slot=data-table-columns])]:px-3 [&_:where([data-slot=data-table-columns])]:text-sm [&_:where([data-slot=data-table-columns])]:font-medium [&_:where([data-slot=data-table-columns])]:outline-none hover:[&_:where([data-slot=data-table-columns])]:bg-accent focus-visible:[&_:where([data-slot=data-table-columns])]:ring-3 focus-visible:[&_:where([data-slot=data-table-columns])]:ring-ring/50 [&_:where([data-slot=data-table-columns-icon])]:i-lucide-chevron-down [&_:where([data-slot=data-table-columns-icon])]:size-4',
      '[&_:where([data-slot=data-table-reset])]:inline-flex [&_:where([data-slot=data-table-reset])]:h-8 [&_:where([data-slot=data-table-reset])]:items-center [&_:where([data-slot=data-table-reset])]:gap-2 [&_:where([data-slot=data-table-reset])]:rounded-md [&_:where([data-slot=data-table-reset])]:px-3 [&_:where([data-slot=data-table-reset])]:text-sm [&_:where([data-slot=data-table-reset])]:font-medium hover:[&_:where([data-slot=data-table-reset])]:bg-accent [&_:where([data-slot=data-table-reset-icon])]:i-lucide-x [&_:where([data-slot=data-table-reset-icon])]:size-4',
      '[&_:where([data-slot=data-table-facet-option-icon])]:flex [&_:where([data-slot=data-table-facet-option-icon])]:size-4 [&_:where([data-slot=data-table-facet-option-icon]>*)]:size-4',
      '[&_:where([data-slot=data-table-container])]:playa-table-container',
      // The sort trigger is an inline pill: symmetric px-2/-mx-2 keeps its
      // label and icon exactly where static header text sits (the th's px-4
      // and text-align own the geometry), while the hover surface gains
      // breathing room around the text instead of clipping it. The button
      // inherits the th typography except text-transform, which the preflight
      // resets on form controls, so uppercase is restated.
      '[&_:where([data-slot=data-table-sort-trigger])]:-mx-2 [&_:where([data-slot=data-table-sort-trigger])]:inline-flex [&_:where([data-slot=data-table-sort-trigger])]:h-8 [&_:where([data-slot=data-table-sort-trigger])]:items-center [&_:where([data-slot=data-table-sort-trigger])]:gap-2 [&_:where([data-slot=data-table-sort-trigger])]:rounded-md [&_:where([data-slot=data-table-sort-trigger])]:px-2 [&_:where([data-slot=data-table-sort-trigger])]:align-middle [&_:where([data-slot=data-table-sort-trigger])]:uppercase hover:[&_:where([data-slot=data-table-sort-trigger])]:bg-accent [&_:where([data-slot=data-table-sort-icon])]:size-4 [&_:where([data-slot=data-table-sort-icon][data-sort=none])]:i-lucide-arrow-up-down [&_:where([data-slot=data-table-sort-icon][data-sort=asc])]:i-lucide-arrow-up [&_:where([data-slot=data-table-sort-icon][data-sort=desc])]:i-lucide-arrow-down',
      '[&_:where([data-slot=data-table-empty])]:h-24 [&_:where([data-slot=data-table-empty])]:text-center [&_:where([data-slot=data-table-empty])]:text-muted-foreground',
      '[&_:where([data-slot=data-table-footer])]:flex [&_:where([data-slot=data-table-footer])]:flex-col [&_:where([data-slot=data-table-footer])]:gap-2 sm:[&_:where([data-slot=data-table-footer])]:flex-row sm:[&_:where([data-slot=data-table-footer])]:items-center sm:[&_:where([data-slot=data-table-footer])]:justify-between [&_:where([data-slot=data-table-selection-summary])]:text-sm [&_:where([data-slot=data-table-selection-summary])]:text-muted-foreground [&_:where([data-slot=data-table-selection-summary])]:tabular-nums',
      '[&_:where([data-slot=data-table-pagination])]:flex [&_:where([data-slot=data-table-pagination])]:flex-wrap [&_:where([data-slot=data-table-pagination])]:items-center [&_:where([data-slot=data-table-pagination])]:gap-4 [&_:where([data-slot=data-table-page-size])]:flex [&_:where([data-slot=data-table-page-size])]:items-center [&_:where([data-slot=data-table-page-size])]:gap-2 [&_:where([data-slot=data-table-page-size])]:text-sm [&_:where([data-slot=data-table-page-size])]:font-medium [&_:where([data-slot=data-table-page-indicator])]:w-[100px] [&_:where([data-slot=data-table-page-indicator])]:text-center [&_:where([data-slot=data-table-page-indicator])]:text-sm [&_:where([data-slot=data-table-page-indicator])]:font-medium [&_:where([data-slot=data-table-page-indicator])]:tabular-nums [&_:where([data-slot=data-table-pagination-actions])]:flex [&_:where([data-slot=data-table-pagination-actions])]:items-center [&_:where([data-slot=data-table-pagination-actions])]:gap-2',
      '[&_:where([data-slot=data-table-pagination-action])]:inline-flex [&_:where([data-slot=data-table-pagination-action])]:size-8 [&_:where([data-slot=data-table-pagination-action])]:items-center [&_:where([data-slot=data-table-pagination-action])]:justify-center [&_:where([data-slot=data-table-pagination-action])]:rounded-md [&_:where([data-slot=data-table-pagination-action])]:edge [&_:where([data-slot=data-table-pagination-action])]:outline-none disabled:[&_:where([data-slot=data-table-pagination-action])]:opacity-50 hover:[&_:where([data-slot=data-table-pagination-action])]:bg-accent focus-visible:[&_:where([data-slot=data-table-pagination-action])]:ring-3 focus-visible:[&_:where([data-slot=data-table-pagination-action])]:ring-ring/50 [&_:where([data-action=first]>span)]:i-lucide-chevrons-left [&_:where([data-action=previous]>span)]:i-lucide-chevron-left [&_:where([data-action=next]>span)]:i-lucide-chevron-right [&_:where([data-action=last]>span)]:i-lucide-chevrons-right [&_:where([data-slot=data-table-pagination-action]>span)]:size-4',
    ].join(' '),
  },
}
