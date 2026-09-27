import type { Preset } from 'unocss'

// Popup bodies and their arrows paint one surface behind the content: a
// rounded box, and where clip-path shape() is supported, the box and arrow
// cut from one path toward the side the popup opens on.
const popupSurfaceSelector = '.playa-popup-content>[data-slot=popup-surface]'
const popupShapeProbe = 'shape(from 0 0,line to 100% 0,close)'
const popupRadius = 'var(--popup-radius)'
const popupCenter = 'var(--popup-arrow-center)'
const popupNearRadius = `min(${popupRadius},max(0px,calc(${popupCenter} - 7px)))`
const popupFarRadius = `min(${popupRadius},max(0px,calc(100% - ${popupCenter} - 7px)))`
const popupTopShape = `shape(from ${popupRadius} 0,hline to calc(100% - ${popupRadius}),arc to 100% ${popupRadius} of ${popupRadius} cw,vline to calc(100% - 7px - ${popupRadius}),arc to calc(100% - ${popupFarRadius}) calc(100% - 7px) of ${popupFarRadius} ${popupRadius} cw,hline to calc(${popupCenter} + 7px),line to ${popupCenter} 100%,line to calc(${popupCenter} - 7px) calc(100% - 7px),hline to ${popupNearRadius},arc to 0 calc(100% - 7px - ${popupRadius}) of ${popupNearRadius} ${popupRadius} cw,vline to ${popupRadius},arc to ${popupRadius} 0 of ${popupRadius} cw,close)`
const popupBottomShape = `shape(from ${popupCenter} 0,line to calc(${popupCenter} + 7px) 7px,hline to calc(100% - ${popupFarRadius}),arc to 100% calc(7px + ${popupRadius}) of ${popupFarRadius} ${popupRadius} cw,vline to calc(100% - ${popupRadius}),arc to calc(100% - ${popupRadius}) 100% of ${popupRadius} cw,hline to ${popupRadius},arc to 0 calc(100% - ${popupRadius}) of ${popupRadius} cw,vline to calc(7px + ${popupRadius}),arc to ${popupNearRadius} 7px of ${popupNearRadius} ${popupRadius} cw,hline to calc(${popupCenter} - 7px),close)`
const popupLeftShape = `shape(from ${popupRadius} 0,hline to calc(100% - 7px - ${popupRadius}),arc to calc(100% - 7px) ${popupNearRadius} of ${popupRadius} ${popupNearRadius} cw,vline to calc(${popupCenter} - 7px),line to 100% ${popupCenter},line to calc(100% - 7px) calc(${popupCenter} + 7px),vline to calc(100% - ${popupFarRadius}),arc to calc(100% - 7px - ${popupRadius}) 100% of ${popupRadius} ${popupFarRadius} cw,hline to ${popupRadius},arc to 0 calc(100% - ${popupRadius}) of ${popupRadius} cw,vline to ${popupRadius},arc to ${popupRadius} 0 of ${popupRadius} cw,close)`
const popupRightShape = `shape(from calc(7px + ${popupRadius}) 0,hline to calc(100% - ${popupRadius}),arc to 100% ${popupRadius} of ${popupRadius} cw,vline to calc(100% - ${popupRadius}),arc to calc(100% - ${popupRadius}) 100% of ${popupRadius} cw,hline to calc(7px + ${popupRadius}),arc to 7px calc(100% - ${popupFarRadius}) of ${popupRadius} ${popupFarRadius} cw,vline to calc(${popupCenter} + 7px),line to 0 ${popupCenter},line to 7px calc(${popupCenter} - 7px),vline to ${popupNearRadius},arc to calc(7px + ${popupRadius}) 0 of ${popupRadius} ${popupNearRadius} cw,close)`
const popupSurfaceShape = `@supports (clip-path:${popupShapeProbe}){.playa-popup-content[data-arrow=true][data-side=top]>[data-slot=popup-surface]{bottom:-7px;border-radius:0;clip-path:${popupTopShape}}.playa-popup-content[data-arrow=true][data-side=bottom]>[data-slot=popup-surface]{top:-7px;border-radius:0;clip-path:${popupBottomShape}}.playa-popup-content[data-arrow=true][data-side=left]>[data-slot=popup-surface]{right:-7px;border-radius:0;clip-path:${popupLeftShape}}.playa-popup-content[data-arrow=true][data-side=right]>[data-slot=popup-surface]{left:-7px;border-radius:0;clip-path:${popupRightShape}}}`

// Popovers are frost and tooltips sit on the carpet. Without backdrop-filter
// the popover surface falls back to a solid fill.
const surface = [
  `${popupSurfaceSelector}{position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit}`,
  '.playa-popover-content>[data-slot=popup-surface]{background-color:var(--glass-overlay);-webkit-backdrop-filter:var(--glass-filter);backdrop-filter:var(--glass-filter);box-shadow:var(--shadow-lg);filter:drop-shadow(0 0 1px var(--border))}.playa-tooltip-content>[data-slot=popup-surface]{background-color:var(--navy);box-shadow:var(--shadow-xs);filter:drop-shadow(0 0 1px var(--border))}',
  popupSurfaceShape,
  '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.playa-popover-content>[data-slot=popup-surface]{background-color:var(--popover)}}',
].join('')

/** Shortcuts and rules of Popover, Tooltip, Menu, ContextMenu, Menubar and NavigationMenu. */
export const floating: Preset = {
  name: 'ajo-ui-playa-floating',
  // Global rules for base-owned parts, emitted only when the family's
  // shortcut is used. They join the preflight layer, before every utility,
  // so the family's own classes still override them.
  rules: [['playa-popup-surface', [surface], { layer: 'preflights' }]],
  shortcuts: {
    'playa-popup-content': 'playa-popup-surface isolate bg-transparent',
    'playa-popover-content': 'text-popover-foreground',
    // The carpet is a dark island in both themes: tokens inside it resolve dark.
    'playa-tooltip-content': 'text-foreground [color-scheme:dark]',
    'playa-menu-root': 'relative inline-block',
    'playa-menu-content-open': [{ 'transition-property': 'opacity' }],
    'playa-menu-content-visible': 'opacity-100',
    'playa-menu-content-hidden': 'opacity-0',
    'playa-menu-content-reduced': 'transition-none',
    'playa-menu-content': [
      'z-50 m-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-md glass-overlay edge p-1 shadow-lg outline-none playa-menu-content-hidden transition-discrete duration-150 ease-out motion-reduce:playa-menu-content-reduced data-[state=open]:playa-menu-content-open data-[state=open]:data-[side]:playa-menu-content-visible starting:data-[state=open]:data-[side]:playa-menu-content-hidden',
      {
        // The Adapter writes the general available-height limit inline.
        // Playa refines that same output with its denser menu cap; important
        // composes the visual policy without creating a second measurement.
        'max-height': 'max(96px,min(320px,var(--available-height))) !important',
        'transition-property': 'opacity,display,overlay',
      },
    ],
    'playa-menu-item': 'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[inset]:pl-8 data-[variant=danger]:text-danger data-[variant=danger]:focus:bg-danger/10 data-[variant=danger]:focus:text-danger data-[variant=danger]:data-[highlighted=true]:bg-danger/10 data-[variant=danger]:data-[highlighted=true]:text-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground data-[variant=danger]:[&_svg]:text-danger',
    'playa-menu-choice-row': 'relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    'playa-menu-indicator': 'pointer-events-none absolute left-2 flex size-3.5 items-center justify-center',
    'playa-menu-label': 'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8',
    'playa-menu-separator': '-mx-1 my-1 h-px bg-border',
    'playa-menu-shortcut': 'ml-auto text-xs tracking-widest text-muted-foreground tabular-nums',
    'playa-menu-check-icon': 'i-lucide-check size-4',
    'playa-menu-radio-icon': 'i-lucide-circle size-2 fill-current',
    'playa-menu-sub-trigger-icon': 'i-lucide-chevron-right ml-auto size-4',
    'playa-menu-sub-trigger-open': 'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
  },
}
