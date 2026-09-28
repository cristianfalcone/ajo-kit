import type { Preset } from 'unocss'

// Popup bodies and their arrows paint one surface behind the content: a
// rounded box, and where clip-path shape() is supported, the box and arrow
// cut from one path toward the side the popup opens on. Two paths draw the
// arrow at the bottom and at the right; the surface mirrors them for the top
// and the left. Each is inset by --popup-inset: the surface cuts it at 0 and
// its ::before, the 1 px edge, cuts it at 1 px out of its own box, so the
// hairline follows the arrow.
const surfaceSelector = '.playa-popup-content>[data-slot=popup-surface]'
const arrowed = '.playa-popup-content[data-arrow=true]'
const shapeProbe = 'shape(evenodd from 0 0,close,move to 0 0,close)'
const r = 'var(--popup-radius)'
const c = 'var(--popup-arrow-center)'
const i = 'var(--popup-inset)'
// Where the body starts and ends, inset, and the corner radii beside the
// arrow, which shrink as it nears the corner.
const bounds = `--popup-start:calc(${r} + ${i});--popup-end:calc(100% - ${i});--popup-body:calc(100% - 7px - ${i});--popup-near:min(${r},max(0px,calc(${c} - 7px)));--popup-far:min(${r},max(0px,calc(100% - ${c} - 7px)))`
const start = 'var(--popup-start)'
const end = 'var(--popup-end)'
const body = 'var(--popup-body)'
const near = 'var(--popup-near)'
const far = 'var(--popup-far)'
// An inset arrow keeps its slopes 1 px from the outer ones: the tip moves in
// by √2 times the inset and the base narrows by (√2 - 1) times it.
const tip = `calc(100% - 1.414*${i})`
const base = (sign: '+' | '-') => `calc(${c} ${sign} 7px ${sign === '+' ? '-' : '+'} 0.414*${i})`
// Arrow below the body, for a popup above its reference; mirrored below it.
const below = `${start} ${i},hline to calc(${end} - ${r}),arc to ${end} ${start} of ${r} cw,vline to calc(${body} - ${r}),arc to calc(${end} - ${far}) ${body} of ${far} ${r} cw,hline to ${base('+')},line to ${c} ${tip},line to ${base('-')} ${body},hline to calc(${near} + ${i}),arc to ${i} calc(${body} - ${r}) of ${near} ${r} cw,vline to ${start},arc to ${start} ${i} of ${r} cw,close`
// Arrow at the body's right, for a popup at the left; mirrored at the right.
const beside = `${start} ${i},hline to calc(${body} - ${r}),arc to ${body} calc(${near} + ${i}) of ${r} ${near} cw,vline to ${base('-')},line to ${tip} ${c},line to ${body} ${base('+')},vline to calc(${end} - ${far}),arc to calc(${body} - ${r}) ${end} of ${r} ${far} cw,hline to ${start},arc to ${i} calc(${end} - ${r}) of ${r} cw,vline to ${start},arc to ${start} ${i} of ${r} cw,close`
// Custom properties resolve the inset on the element that declares them, so
// the surface and its edge each declare the path.
const both = (sides = '') => `${arrowed}${sides}>[data-slot=popup-surface],${arrowed}${sides}>[data-slot=popup-surface]::before`
const shapes = `@supports (clip-path:${shapeProbe}){${both()}{${bounds}}${both(':is([data-side=top],[data-side=bottom])')}{--popup-path:${below}}${both(':is([data-side=left],[data-side=right])')}{--popup-path:${beside}}${arrowed}>[data-slot=popup-surface]{border-radius:0;box-shadow:none;clip-path:shape(from var(--popup-path))}${arrowed}[data-side=top]>[data-slot=popup-surface]{bottom:-7px}${arrowed}[data-side=bottom]>[data-slot=popup-surface]{top:-7px;scale:1 -1}${arrowed}[data-side=left]>[data-slot=popup-surface]{right:-7px}${arrowed}[data-side=right]>[data-slot=popup-surface]{left:-7px;scale:-1 1}${arrowed}>[data-slot=popup-surface]::before{content:"";position:absolute;inset:0;--popup-inset:1px;background-color:var(--border);clip-path:shape(evenodd from 0 0,hline to 100%,vline to 100%,hline to 0,close,move to var(--popup-path))}}`

// Popovers are frost and tooltips solid: navy on ivory, the raised surface at
// night. Both wear the hairline edge; a popover floats on the layered shadow,
// which the arrow's clip would cut, so a tooltip, always arrowed and never
// frosted, casts it as a filter of its whole body instead. Without
// backdrop-filter the popover surface falls back to a solid fill.
const surface = [
  `${surfaceSelector}{position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;--popup-inset:0px;box-shadow:inset 0 0 0 1px var(--border)}`,
  '.playa-popover-content>[data-slot=popup-surface]{background-color:var(--glass-overlay);-webkit-backdrop-filter:var(--glass-filter);backdrop-filter:var(--glass-filter);box-shadow:inset 0 0 0 1px var(--border),var(--shadow-lg)}',
  '.playa-tooltip-content{filter:drop-shadow(0 1px 1px var(--shadow-color)) drop-shadow(0 6px 12px var(--shadow-color))}.playa-tooltip-content>[data-slot=popup-surface]{background-color:light-dark(var(--navy),var(--popover))}',
  shapes,
  '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.playa-popover-content>[data-slot=popup-surface]{background-color:var(--popover)}}',
].join('')

// Menu rows share one recipe: a 32 px row of body text, highlighted by the
// gold tint; items, choice rows and the Command items differ only in their
// start inset and colour. The svg rules size inline SVG a consumer passes;
// Playa's own icons are masked spans that carry their size.
const row = 'relative flex min-h-control-sm cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-[var(--disabled-opacity)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'

/** Shortcuts and rules of Popover, Tooltip, Menu, ContextMenu, Menubar and NavigationMenu. */
export const floating: Preset = {
  name: 'ajo-ui-playa-floating',
  // Global rules for base-owned parts, emitted only when the family's
  // shortcut is used. They join the preflight layer, before every utility,
  // so the family's own classes still override them.
  rules: [['playa-popup-surface', [surface], { layer: 'preflights' }]],
  shortcuts: {
    // One radius for every floating layer, the arrowed surface included, and
    // a transparent outline that forced colours paint where they drop the edge.
    'playa-popup-content': 'playa-popup-surface isolate bg-transparent [--popup-radius:var(--radius)] rounded-[var(--popup-radius)] [outline:1px_solid_transparent]',
    'playa-popover-content': 'text-popover-foreground',
    // Tooltip text is light on navy and on the night's raised surface alike;
    // whatever it holds reads the dark tokens.
    'playa-tooltip-content': '[color:light-dark(var(--background),var(--foreground))] *:not-[[data-slot=popup-surface]]:[color-scheme:dark]',
    'playa-menu-root': 'relative inline-block',
    'playa-menu-content-open': [{ 'transition-property': 'opacity,scale' }],
    'playa-menu-content-visible': ['opacity-100', { scale: '1' }],
    'playa-menu-content-hidden': ['opacity-0', { scale: '.98' }],
    'playa-menu-content-reduced': 'transition-none',
    'playa-menu-content': [
      'z-50 m-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-md glass-overlay edge p-1 shadow-lg [outline:1px_solid_transparent] playa-menu-content-hidden transition-discrete duration-150 motion-reduce:playa-menu-content-reduced data-[state=open]:playa-menu-content-open data-[state=open]:data-[side]:playa-menu-content-visible starting:data-[state=open]:data-[side]:playa-menu-content-hidden',
      {
        // The Adapter writes the general available-height limit inline.
        // Playa refines that same output with its denser menu cap; important
        // composes the visual policy without creating a second measurement.
        'max-height': 'max(96px,min(320px,var(--available-height))) !important',
        'transition-property': 'opacity,scale,display,overlay',
        'transition-timing-function': 'var(--ease)',
      },
    ],
    'playa-menu-item': `${row} data-[inset]:ps-8 data-[variant=danger]:text-danger data-[variant=danger]:focus:bg-danger/10 data-[variant=danger]:focus:text-danger data-[variant=danger]:data-[highlighted=true]:bg-danger/10 data-[variant=danger]:data-[highlighted=true]:text-danger`,
    'playa-menu-choice-row': `${row} ps-8`,
    'playa-menu-indicator': 'pointer-events-none absolute start-2 flex size-4 items-center justify-center',
    // A group label steps back from the rows it names: caption size, faint, no caps.
    'playa-menu-label': 'px-2 py-1 text-xs font-medium text-faint-foreground data-[inset]:ps-8',
    'playa-menu-separator': 'mx-2 my-1 h-px bg-border',
    'playa-menu-shortcut': 'ms-auto font-mono text-xs text-faint-foreground tabular-nums',
    'playa-menu-check-icon': 'i-lucide-check size-4',
    'playa-menu-sub-trigger-icon': 'i-lucide-chevron-right ms-auto size-4 rtl:-scale-x-100',
    'playa-menu-sub-trigger-open': 'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
  },
}
