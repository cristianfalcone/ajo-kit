import type { Preset } from 'unocss'

// Chart marks: hover dimming, bar corners, and the draw and grow motion.
const marks = [
  '[data-slot=chart] [data-slot=chart-bar] rect[data-chart-index],[data-slot=chart] [data-slot=chart-pie] path[data-chart-index]{transition:opacity 150ms ease,stroke-width 150ms ease}[data-slot=chart] [data-slot=chart-line] circle[data-chart-index],[data-slot=chart] [data-slot=chart-area] circle[data-chart-index]{transition:opacity 150ms ease,stroke-width 150ms ease,r 150ms ease}[data-slot=chart]:has([data-active]) [data-slot=chart-bar] rect[data-chart-index]:not([data-active]),[data-slot=chart]:has([data-active]) [data-slot=chart-pie] path[data-chart-index]:not([data-active]),[data-slot=chart]:has([data-active]) [data-slot=chart-line] circle[data-chart-index]:not([data-active]),[data-slot=chart]:has([data-active]) [data-slot=chart-area] circle[data-chart-index]:not([data-active]){opacity:.45}[data-slot=chart] [data-active]{opacity:1}[data-slot=chart] circle[data-active]{r:5.6px}',
  '[data-slot=chart] [data-slot=chart-bar] rect[data-chart-sign=positive]{clip-path:inset(0 round 4px 4px 0 0) fill-box}[data-slot=chart] [data-slot=chart-bar] rect[data-chart-sign=negative]{clip-path:inset(0 round 0 0 4px 4px) fill-box}',
  '@media (prefers-reduced-motion:no-preference){@keyframes chart-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes chart-undash{to{stroke-dasharray:initial}}@keyframes chart-grow{from{transform:scaleY(0)}}@keyframes chart-settle{from{opacity:0;transform:translateY(4px)}}@keyframes chart-pop{from{opacity:0;transform:scale(0)}}[data-slot=chart] [data-slot=chart-bar] rect[data-chart-series]{transform-box:fill-box;transform-origin:bottom center;animation:chart-grow 450ms cubic-bezier(0.22,1,0.36,1) both;animation-delay:calc(var(--chart-index,0) * 30ms)}[data-slot=chart] [data-slot=chart-line] path[fill=none],[data-slot=chart] [data-slot=chart-area] path[fill=none]{stroke-dasharray:1;animation:chart-draw 600ms ease-out both,chart-undash 1ms 600ms step-end forwards}[data-slot=chart] [data-slot=chart-fill]>path{transform-box:fill-box;animation:chart-settle 500ms ease-out both}[data-slot=chart] [data-slot=chart-line] circle[data-chart-index],[data-slot=chart] [data-slot=chart-area] circle[data-chart-index]{transform-box:fill-box;transform-origin:center;animation:chart-pop 300ms ease-out both;animation-delay:calc(200ms + var(--chart-index,0) * 20ms)}[data-slot=chart] [data-slot=chart-pie] path[data-chart-index]{transform-box:view-box;transform-origin:center;animation:chart-pop 400ms ease-out both;animation-delay:calc(var(--chart-index,0) * 60ms)}'
    // Marks move to new data only once the plot drew at its measured size, so
    // nothing slides from the default size on load.
    + '[data-slot=chart][data-measured] [data-slot=chart-bar] rect[data-chart-series]{transition:x 300ms ease-out,y 300ms ease-out,width 300ms ease-out,height 300ms ease-out,opacity 150ms ease,stroke-width 150ms ease}[data-slot=chart][data-measured] [data-slot=chart-line] path[fill=none],[data-slot=chart][data-measured] [data-slot=chart-area] path[fill=none],[data-slot=chart][data-measured] [data-slot=chart-fill]>path{transition:d 300ms ease-out}[data-slot=chart][data-measured] [data-slot=chart-line] circle[data-chart-index],[data-slot=chart][data-measured] [data-slot=chart-area] circle[data-chart-index]{transition:cx 300ms ease-out,cy 300ms ease-out,opacity 150ms ease,stroke-width 150ms ease,r 150ms ease}[data-slot=chart][data-measured] [data-slot=chart-pie] path[data-chart-index]{transition:d 300ms ease-out,opacity 150ms ease,stroke-width 150ms ease}}',
  '@media (prefers-reduced-motion:no-preference){[data-slot=chart] [data-slot=chart-bar] rect[data-chart-sign=negative]{transform-origin:top center}[data-slot=chart] [data-slot=chart-bar] rect[data-chart-sign=zero]{transform-origin:center}}',
  '@media (prefers-reduced-motion:no-preference){[data-slot=chart] [data-slot=chart-tooltip][data-positioned=true]{transition:transform 200ms ease-out}}',
].join('')

// DataTable's base-owned controls and its script-focused table take the one
// focus ring here: `playa-focus` and state variants cannot ride a slot prefix
// (they would land on the recipe root).
const controls = ['search', 'facet', 'columns', 'reset', 'sort-trigger', 'pagination-action'].map(slot => `[data-slot=data-table-${slot}]`).join()
const focus = [
  `.playa-data-table :where(${controls}){outline:1px solid transparent;outline-offset:var(--focus-offset)}`,
  `.playa-data-table :where(${controls}):focus-visible{outline:var(--focus-width) solid var(--ring)}`,
  '.playa-data-table :where([data-slot=table]){outline:none}',
  '.playa-data-table :where([data-slot=data-table-container]:has(>[data-slot=table]:focus-visible)){outline:var(--focus-width) solid var(--ring);outline-offset:calc(var(--focus-width)/-2)}',
].join('')

// A wide table fades the edge it scrolls toward inside its frame: a mask on
// the table itself, pinned to the frame's visible box by the scroll offset
// the container stamps, so rows and their tints fade into the card while the
// border, the corners and the focus ring (all the frame's) stay whole. The
// frame measures the mask only while it overflows, when its width comes from
// its parent, not from the table. Three costs come with it: an overflowing
// frame no longer lends the table's width to a fit-content ancestor (a popover
// or card holding a table narrows once it overflows); the inherited offset
// restyles the table's subtree on every scroll frame (not measured, cheap for
// a page of rows, less so for a long list); and on touch, where the compositor
// scrolls before the main thread, the mask trails the scroll by a frame.
const table = ':is([data-slot=table-container],[data-slot=data-table-container])'
const fade = 'linear-gradient(to var(--fade-x,right),transparent,#000 var(--fade-start,0),#000 calc(100% - var(--fade-end,0)),transparent)'
const edges = [
  `${table}[data-overflow-x]{container-type:inline-size;mask-image:none}`,
  `${table}:is([data-overflow-x=start],[data-overflow-x=both]){--fade-start:1rem}${table}:is([data-overflow-x=end],[data-overflow-x=both]){--fade-end:1rem}`,
  `${table}[data-overflow-x]>[data-slot=table]{mask:${fade} var(--overflow-x-offset,0) 0/100cqi 100% no-repeat}`,
  `${table}[data-overflow-x]:dir(rtl)>[data-slot=table]{mask-position:right var(--overflow-x-offset,0) top 0}`,
].join('')

/** Shortcuts and rules of Table, DataTable, Pagination, VirtualList and Chart. */
export const data: Preset = {
  name: 'ajo-ui-playa-data',
  // Global rules for base-owned parts, emitted only when the family's
  // shortcut is used. They join the preflight layer, before every utility,
  // so the family's own classes still override them.
  rules: [
    ['playa-chart-marks', [marks], { layer: 'preflights' }],
    ['playa-data-table-focus', [focus], { layer: 'preflights' }],
    ['playa-table-edges', [edges], { layer: 'preflights' }],
  ],
  shortcuts: {
    // Enamel: the flat card fill inside a real border. A border paints
    // outside the padding box the rows scroll in, so no opaque row fill
    // covers it.
    'playa-table-container': 'playa-table-edges relative w-full overflow-x-auto rounded-lg border bg-card text-card-foreground',
    // One slot recipe owns the whole table family. The manual Table wrapper
    // and the DataTable root both carry `playa-table`, so header/cell
    // geometry, typography, and row states have a single source and render
    // identically. Stateful rules are written variant-first
    // (`hover:[&_...]`) or as one literal selector: expanding a
    // variant-bearing shortcut under a slot prefix hangs the inner variant on
    // the recipe root (`.x:hover :where(row)` highlights every row at once).
    'playa-table': [
      // Lines live on the CELLS of a separated table: collapsed row borders
      // straddle the row boundary, so a tint would land on the wrong line; a
      // cell border always paints inside its own row, over its own fill.
      '[&_:where([data-slot=table])]:w-full [&_:where([data-slot=table])]:border-separate [&_:where([data-slot=table])]:border-spacing-0 [&_:where([data-slot=table])]:caption-bottom [&_:where([data-slot=table])]:text-sm',
      // Every row owns its bottom hairline (the footer's top line is the last
      // body row's border, painted over plain background instead of the muted
      // footer fill). Only the true visual end drops it: the last row of the
      // last row group, and only when no caption renders below: a DOM
      // :last-child check alone lies under caption-side bottom.
      '[&_:where([data-slot=table]):not(:has([data-slot=table-caption]))_:where([data-slot=table-body],[data-slot=table-footer]):last-child_tr:last-child>*]:border-b-0',
      '[&_:where([data-slot=table-footer])]:bg-muted/50 [&_:where([data-slot=table-footer])]:font-medium',
      // Hover only means something on data rows; header and footer stay
      // quiet. Selection is the gold tint; hover and an open row menu take
      // half of it by day and the muted fill at night, where half the night
      // gold reads as selected. The translucent hairline keeps its weight
      // over both.
      '[&_:where([data-slot=table-row])>*]:border-b [&_:where([data-slot=table-row])>*]:transition-colors [&_:where([data-slot=table-row])]:transition-colors [&_:where([data-slot=table-body])_:where([data-slot=table-row]):is(:hover,:has([aria-expanded=true]))]:bg-[light-dark(color-mix(in_srgb,var(--accent)_50%,transparent),var(--muted))] [&_:where([data-slot=table-row])[data-state=selected]]:bg-accent',
      // Headers are sentence case at the body size, start-aligned like their
      // cells in either direction.
      '[&_:where([data-slot=table-head])]:h-10 [&_:where([data-slot=table-head])]:px-4 [&_:where([data-slot=table-head])]:text-start [&_:where([data-slot=table-head])]:align-middle [&_:where([data-slot=table-head])]:font-medium [&_:where([data-slot=table-head])]:whitespace-nowrap [&_:where([data-slot=table-head])]:text-muted-foreground',
      // One row pitch, 44 px, whether a row holds text or a small control.
      '[&_:where([data-slot=table-cell])]:h-11 [&_:where([data-slot=table-cell])]:px-4 [&_:where([data-slot=table-cell])]:py-1 [&_:where([data-slot=table-cell])]:align-middle [&_:where([data-slot=table-cell])]:whitespace-nowrap',
      // A selection box is a block the cell centres, not a glyph on the baseline.
      '[&_:where([data-slot=table-head],[data-slot=table-cell]):has(>[data-slot=checkbox])]:pe-0 [&_:where([data-slot=table-head],[data-slot=table-cell])>[data-slot=checkbox]]:flex',
      '[&_:where([data-slot=table-caption])]:p-4 [&_:where([data-slot=table-caption])]:text-start [&_:where([data-slot=table-caption])]:text-sm [&_:where([data-slot=table-caption])]:text-muted-foreground',
      // Alignment is logical, so a column keeps its side mirrored; numbers sit
      // at the end with tabular figures.
      '[&_:where([data-align=center])]:text-center [&_:where([data-align=right])]:text-end [&_:where([data-align=right])]:tabular-nums',
    ].join(' '),
    // A DataTable menu picks several values (facets, visible columns), so each
    // row shows a checkbox, empty until chosen: the input boundary, then the
    // ink with the check in the page colour, as a Checkbox draws it.
    'playa-data-table-choice': [
      'playa-menu-choice-row *:data-[slot=menu-item-indicator]:playa-menu-indicator *:data-[slot=menu-item-indicator]:rounded-xs *:data-[slot=menu-item-indicator]:edge-input *:data-[slot=menu-item-indicator]:[outline:1px_solid_transparent] *:data-[slot=menu-item-indicator]:[outline-offset:-1px]',
      '[&[data-checked=true]>[data-slot=menu-item-indicator]]:bg-foreground **:data-[slot=menu-item-indicator-icon]:i-lucide-check **:data-[slot=menu-item-indicator-icon]:size-3.5 **:data-[slot=menu-item-indicator-icon]:text-background **:data-[slot=menu-item-indicator-icon]:playa-choice-glyph',
    ].join(' '),
    // Chart paints the base parts by data-slot and state attributes: SVG
    // strokes and fills, the tooltip rows by indicator shape and nesting, and
    // the legend entries. State rules use `:is` to outrank the `:where` base.
    // The plot keeps its physical axes in either direction; marks take the
    // one focus ring like any focusable element.
    'playa-chart': [
      'playa-chart-marks relative flex aspect-video min-h-[200px] w-full flex-col justify-center text-xs text-muted-foreground',
      '[&_:where(svg[role=group])]:[direction:ltr] [&_:where([data-slot=chart-grid]>line)]:[stroke:var(--border)] [&_:where([data-slot=chart-axis]>line)]:[stroke:var(--muted-foreground)] [&_:where([data-slot=chart-axis]>line)]:[stroke-opacity:0.5]',
      '[&_:where(circle[data-chart-index])]:[fill:var(--background)] [&_:where([data-slot=chart-pie]>path)]:[stroke:var(--background)]',
      '[&_:where([data-slot=chart-pie-total])]:[fill:var(--foreground)] [&_:where([data-slot=chart-pie-total])]:text-sm [&_:where([data-slot=chart-pie-total])]:font-medium',
      '[&_:where([data-slot=chart-tooltip-label])]:font-medium [&_:is([data-nested]_[data-slot=chart-tooltip-label])]:text-foreground',
      '[&_:where([data-slot=chart-tooltip-items],[data-slot=chart-tooltip-names])]:grid [&_:where([data-slot=chart-tooltip-items],[data-slot=chart-tooltip-names])]:gap-1',
      '[&_:where([data-slot=chart-tooltip-item])]:flex [&_:where([data-slot=chart-tooltip-item])]:w-full [&_:where([data-slot=chart-tooltip-item])]:items-stretch [&_:where([data-slot=chart-tooltip-item])]:gap-2 [&_:is([data-slot=chart-tooltip-item][data-indicator=dot])]:items-center',
      '[&_:where([data-slot=chart-tooltip-indicator])]:shrink-0 [&_:where([data-slot=chart-tooltip-indicator])]:rounded-[2px] [&_:where([data-slot=chart-tooltip-indicator])]:border-[--chart-indicator] [&_:where([data-slot=chart-tooltip-indicator])]:bg-[--chart-indicator]',
      '[&_:is([data-indicator=dot]>[data-slot=chart-tooltip-indicator])]:size-2.5 [&_:is([data-indicator=line]>[data-slot=chart-tooltip-indicator])]:w-1',
      '[&_:is([data-indicator=dashed]>[data-slot=chart-tooltip-indicator])]:w-0 [&_:is([data-indicator=dashed]>[data-slot=chart-tooltip-indicator])]:[border-width:1.5px] [&_:is([data-indicator=dashed]>[data-slot=chart-tooltip-indicator])]:border-dashed [&_:is([data-indicator=dashed]>[data-slot=chart-tooltip-indicator])]:bg-transparent [&_:is([data-indicator=dashed][data-nested]>[data-slot=chart-tooltip-indicator])]:my-1',
      '[&_:where([data-slot=chart-tooltip-row])]:flex [&_:where([data-slot=chart-tooltip-row])]:flex-1 [&_:where([data-slot=chart-tooltip-row])]:items-center [&_:where([data-slot=chart-tooltip-row])]:justify-between [&_:where([data-slot=chart-tooltip-row])]:gap-4 [&_:where([data-slot=chart-tooltip-row])]:leading-none [&_:is([data-nested]>[data-slot=chart-tooltip-row])]:items-end',
      '[&_:where([data-slot=chart-tooltip-name])]:text-muted-foreground [&_:where([data-slot=chart-tooltip-value])]:font-mono [&_:where([data-slot=chart-tooltip-value])]:font-medium [&_:where([data-slot=chart-tooltip-value])]:text-foreground [&_:where([data-slot=chart-tooltip-value])]:tabular-nums',
      '[&_:where([data-slot=chart-tooltip-icon],[data-slot=chart-legend-icon])]:text-muted-foreground [&_:where([data-slot=chart-tooltip-icon]>svg,[data-slot=chart-legend-icon]>svg)]:size-3',
      '[&_:where([data-slot=chart-legend-item])]:flex [&_:where([data-slot=chart-legend-item])]:items-center [&_:where([data-slot=chart-legend-item])]:gap-2 [&_:where([data-slot=chart-legend-swatch])]:size-2 [&_:where([data-slot=chart-legend-swatch])]:shrink-0 [&_:where([data-slot=chart-legend-swatch])]:rounded-[2px]',
    ].join(' '),
    'playa-data-table': [
      'playa-data-table-focus flex w-full flex-col gap-4',
      // The bar: one control height, search then facets, the column menu at the end.
      // On a phone the controls group steps aside so the bar holds two rows: the
      // search and the column menu first, the facets and reset under them. The
      // search leaves 8rem, room for the column menu and none for a facet, so its
      // placeholder is never cut. Tab still follows the source (search, facets,
      // reset, columns), which ends on the column menu as the wide bar does.
      '[&_:where([data-slot=data-table-toolbar])]:flex [&_:where([data-slot=data-table-toolbar])]:flex-wrap [&_:where([data-slot=data-table-toolbar])]:items-center [&_:where([data-slot=data-table-toolbar])]:gap-2 sm:[&_:where([data-slot=data-table-toolbar])]:flex-nowrap sm:[&_:where([data-slot=data-table-toolbar])]:justify-between',
      'max-sm:[&_:where([data-slot=data-table-toolbar-controls])]:contents [&_:where([data-slot=data-table-toolbar-controls])]:flex [&_:where([data-slot=data-table-toolbar-controls])]:flex-1 [&_:where([data-slot=data-table-toolbar-controls])]:flex-wrap [&_:where([data-slot=data-table-toolbar-controls])]:items-center [&_:where([data-slot=data-table-toolbar-controls])]:gap-2',
      'max-sm:[&_:where([data-slot=data-table-search])]:-order-1 max-sm:[&_:where([data-slot=data-table-search])]:min-w-0 max-sm:[&_:where([data-slot=data-table-search])]:flex-[1_1_calc(100%-8rem)] max-sm:[&_:where([data-slot=data-table-toolbar])>:has(>[data-slot=data-table-columns])]:-order-1 [&_:where([data-slot=data-table-search])]:h-control-sm sm:[&_:where([data-slot=data-table-search])]:w-45 [&_:where([data-slot=data-table-search])]:rounded-md [&_:where([data-slot=data-table-search])]:edge-input [&_:where([data-slot=data-table-search])]:bg-transparent [&_:where([data-slot=data-table-search])]:px-3 [&_:where([data-slot=data-table-search])]:text-base sm:[&_:where([data-slot=data-table-search])]:text-sm lg:[&_:where([data-slot=data-table-search])]:w-65',
      // Facets, reset and the column menu are Button's outline and ghost at
      // its sm size (base-owned parts take no classes, so the tokens are restated).
      '[&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset])]:inline-flex [&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset])]:h-control-sm [&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset])]:items-center [&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset])]:gap-2 [&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset])]:rounded-md [&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset])]:px-3 [&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset])]:text-sm [&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset])]:font-medium [&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset])]:whitespace-nowrap [&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset])]:text-foreground',
      // Gold is for selection: an open menu's trigger takes the raised fill,
      // hovered or not.
      '[&_:where([data-slot=data-table-facet],[data-slot=data-table-columns])]:edge hover:[&_:where([data-slot=data-table-facet],[data-slot=data-table-columns],[data-slot=data-table-reset]):not([aria-expanded=true])]:bg-accent [&_:where([data-slot=data-table-facet],[data-slot=data-table-columns])[aria-expanded=true]]:bg-secondary',
      '[&_:where([data-slot=data-table-facet-icon])]:i-lucide-list-filter [&_:where([data-slot=data-table-facet-icon])]:size-4 [&_:where([data-slot=data-table-facet-icon],[data-slot=data-table-columns-icon])]:text-muted-foreground',
      '[&_:where([data-slot=data-table-facet-count])]:min-w-5 [&_:where([data-slot=data-table-facet-count])]:rounded-sm [&_:where([data-slot=data-table-facet-count])]:bg-accent [&_:where([data-slot=data-table-facet-count])]:px-1 [&_:where([data-slot=data-table-facet-count])]:text-center [&_:where([data-slot=data-table-facet-count])]:text-xs [&_:where([data-slot=data-table-facet-count])]:tabular-nums',
      '[&_:where([data-slot=data-table-columns-icon])]:i-lucide-chevron-down [&_:where([data-slot=data-table-columns-icon])]:size-4 [&_:where([data-slot=data-table-reset-icon])]:i-lucide-x [&_:where([data-slot=data-table-reset-icon])]:size-4',
      '[&_:where([data-slot=data-table-facet-option-icon])]:flex [&_:where([data-slot=data-table-facet-option-icon])]:size-4 [&_:where([data-slot=data-table-facet-option-icon]>*)]:size-4',
      '[&_:where([data-slot=data-table-container])]:playa-table-container',
      // The sort trigger is a pill in a header with half the padding, so its
      // label sits where the cells' text starts (or, at the end, where it ends).
      '[&_:where([data-slot=table-head]):has(>[data-slot=data-table-sort-trigger])]:px-2',
      '[&_:where([data-slot=data-table-sort-trigger])]:inline-flex [&_:where([data-slot=data-table-sort-trigger])]:h-control-sm [&_:where([data-slot=data-table-sort-trigger])]:items-center [&_:where([data-slot=data-table-sort-trigger])]:gap-2 [&_:where([data-slot=data-table-sort-trigger])]:rounded-md [&_:where([data-slot=data-table-sort-trigger])]:px-2 [&_:where([data-slot=data-table-sort-trigger])]:align-middle hover:[&_:where([data-slot=data-table-sort-trigger])]:bg-accent/50 hover:[&_:where([data-slot=data-table-sort-trigger])]:text-foreground',
      '[&_:where([data-slot=data-table-sort-icon])]:size-4 [&_:where([data-slot=data-table-sort-icon][data-sort=none])]:i-lucide-arrow-up-down [&_:where([data-slot=data-table-sort-icon][data-sort=none])]:opacity-50 [&_:where([data-slot=data-table-sort-icon][data-sort=asc])]:i-lucide-arrow-up [&_:where([data-slot=data-table-sort-icon][data-sort=desc])]:i-lucide-arrow-down',
      // The empty row: its content spans the visible frame, not the scrolled
      // width, and stays there, so a narrow screen never cuts it off.
      '[&_:where([data-slot=data-table-container]):has([data-slot=data-table-empty])]:[container-type:inline-size]',
      '[&_:where([data-slot=data-table-empty])]:p-0 [&_:where([data-slot=data-table-empty])]:text-center [&_:where([data-slot=data-table-empty])]:text-muted-foreground [&_:where([data-slot=data-table-empty])]:whitespace-normal [&_:where([data-slot=data-table-empty])>*]:sticky [&_:where([data-slot=data-table-empty])>*]:start-0 [&_:where([data-slot=data-table-empty])>*]:w-[100cqi]',
      '[&_:where([data-slot=data-table-footer])]:flex [&_:where([data-slot=data-table-footer])]:flex-col [&_:where([data-slot=data-table-footer])]:gap-2 sm:[&_:where([data-slot=data-table-footer])]:flex-row sm:[&_:where([data-slot=data-table-footer])]:items-center sm:[&_:where([data-slot=data-table-footer])]:justify-between [&_:where([data-slot=data-table-selection-summary])]:text-sm [&_:where([data-slot=data-table-selection-summary])]:text-muted-foreground [&_:where([data-slot=data-table-selection-summary])]:tabular-nums',
      '[&_:where([data-slot=data-table-pagination])]:flex [&_:where([data-slot=data-table-pagination])]:flex-wrap [&_:where([data-slot=data-table-pagination])]:items-center [&_:where([data-slot=data-table-pagination])]:gap-4 [&_:where([data-slot=data-table-page-indicator])]:w-25 [&_:where([data-slot=data-table-page-indicator])]:text-center [&_:where([data-slot=data-table-page-indicator])]:text-sm [&_:where([data-slot=data-table-page-indicator])]:font-medium [&_:where([data-slot=data-table-page-indicator])]:tabular-nums [&_:where([data-slot=data-table-pagination-actions])]:flex [&_:where([data-slot=data-table-pagination-actions])]:items-center [&_:where([data-slot=data-table-pagination-actions])]:gap-2',
      // Rows per page is the native select in Select's trigger, with its chevron.
      '[&_:where([data-slot=data-table-page-size])]:relative [&_:where([data-slot=data-table-page-size])]:flex [&_:where([data-slot=data-table-page-size])]:items-center [&_:where([data-slot=data-table-page-size])]:gap-2 [&_:where([data-slot=data-table-page-size])]:text-sm [&_:where([data-slot=data-table-page-size])]:font-medium',
      '[&_:where([data-slot=data-table-page-size])]:after:content-empty [&_:where([data-slot=data-table-page-size])]:after:i-lucide-chevron-down [&_:where([data-slot=data-table-page-size])]:after:pointer-events-none [&_:where([data-slot=data-table-page-size])]:after:absolute [&_:where([data-slot=data-table-page-size])]:after:end-2 [&_:where([data-slot=data-table-page-size])]:after:size-4 [&_:where([data-slot=data-table-page-size])]:after:opacity-50',
      // Pagination actions are outline icon buttons at the sm size; the chevrons point where the pages go.
      '[&_:where([data-slot=data-table-pagination-action])]:inline-flex [&_:where([data-slot=data-table-pagination-action])]:size-control-sm [&_:where([data-slot=data-table-pagination-action])]:items-center [&_:where([data-slot=data-table-pagination-action])]:justify-center [&_:where([data-slot=data-table-pagination-action])]:rounded-md [&_:where([data-slot=data-table-pagination-action])]:edge [&_:where([data-slot=data-table-pagination-action])]:text-foreground hover:[&_:where([data-slot=data-table-pagination-action])]:bg-accent disabled:[&_:where([data-slot=data-table-pagination-action])]:pointer-events-none disabled:[&_:where([data-slot=data-table-pagination-action])]:opacity-[var(--disabled-opacity)]',
      '[&_:where([data-action=first]>span)]:i-lucide-chevrons-left [&_:where([data-action=previous]>span)]:i-lucide-chevron-left [&_:where([data-action=next]>span)]:i-lucide-chevron-right [&_:where([data-action=last]>span)]:i-lucide-chevrons-right [&_:where([data-slot=data-table-pagination-action]>span)]:size-4 rtl:[&_:where([data-slot=data-table-pagination-action]>span)]:-scale-x-100',
    ].join(' '),
  },
}
