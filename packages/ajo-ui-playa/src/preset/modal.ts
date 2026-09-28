import type { Preset } from 'unocss'

// Dialogs fade and rise 8 px; under reduced motion they only fade. The rise
// reuses the preset's `enter` keyframes, the fade has its own, with no transform.
const enter = [
  '.playa-modal-enter[data-state=open]{--un-enter-opacity:0;--un-enter-translate-y:.5rem;animation:enter var(--duration-layer) var(--ease)}',
  '@media (prefers-reduced-motion:reduce){.playa-modal-enter[data-state=open]{animation-name:playa-modal-fade}}',
  '@keyframes playa-modal-fade{from{opacity:0}}',
].join('')

// A drawer slides from its edge while its backdrop fades; under reduced
// motion the panel fades with it instead. Top and bottom sheets keep their
// parts to the form measure, in :where() so a part's own width (the handle,
// the close control) still wins.
const drawer = '[data-slot=drawer-content]'
const offsets = { bottom: 'translateY(100%)', top: 'translateY(-100%)', right: 'translateX(100%)', left: 'translateX(-100%)' }
const sheet = [
  `${drawer},${drawer}::backdrop{transition:opacity var(--duration-layer) var(--ease),display var(--duration-layer) allow-discrete,overlay var(--duration-layer) allow-discrete}`,
  `${drawer}:not([open]),${drawer}:not([open])::backdrop{opacity:0}`,
  `@starting-style{${drawer}[open],${drawer}[open]::backdrop{opacity:0}}`,
  '@media (prefers-reduced-motion:no-preference){',
  `${drawer}{transition:transform 350ms var(--ease),display 350ms allow-discrete,overlay 350ms allow-discrete}`,
  `${drawer}:not([open]){opacity:1}${drawer}[open]{transform:none}@starting-style{${drawer}[open]{opacity:1}}`,
  ...Object.entries(offsets).map(([side, offset]) =>
    `${drawer}[data-side=${side}]:not([open]){transform:${offset}}@starting-style{${drawer}[open][data-side=${side}]{transform:${offset}}}`),
  '}',
  `:where(${drawer}:is([data-side=top],[data-side=bottom]))>*{width:100%;max-width:40rem;margin-inline:auto}`,
].join('')

// The corner X centres on the title line of the panel it sits in, and on a
// sheet it keeps to the end of the column. A header beside it, even inside a
// form, keeps its text 4 px clear of it (the drawer's rule outranks its p-4).
// Rules on the close stay at one class, so the close's own classes win.
const close = [
  '.playa-modal-close{top:1rem;inset-inline-end:1rem}',
  ':where([data-slot=dialog-content])>.playa-modal-close{top:1.25rem;inset-inline-end:1.25rem}',
  ':where([data-slot=dialog-content]:has(>.playa-modal-close)) [data-slot=dialog-header]{padding-inline-end:2rem}',
  `:where(${drawer})>.playa-modal-close{top:.75rem;inset-inline-end:.75rem}`,
  `:where(${drawer}:is([data-side=top],[data-side=bottom]))>.playa-modal-close{inset-inline-end:max(.75rem,calc((100% - 40rem)/2 + .75rem))}`,
  `${drawer}:has(>.playa-modal-close) [data-slot=drawer-header]{padding-inline-end:3rem}`,
].join('')

// Toasts are base-owned nodes, themed by slot from the viewport. Parts but
// the buttons sit in :where() so a toast's own classes override them. A
// toast is frost with a hairline and the floating shadow; an error is always
// tinted, and `data-rich-colors` tints every other kind but the default one.
// The close control keeps the top end corner and the action reads after the
// text, so the two never sit side by side.
const toast = ':where([data-slot=toast])'
const rich = ':where([data-slot=toast][data-variant=danger],[data-rich-colors]>[data-slot=toast]:not([data-variant=default]))'
const stack = [
  '[data-slot=toast]{position:absolute;inset-inline:1rem;width:auto;transform:translateY(var(--toast-y,0)) scale(var(--toast-scale,1))}',
  '[data-slot=toast][data-side=bottom]{bottom:1rem}',
  '[data-slot=toast][data-side=top]{top:1rem}',
  `${toast}{pointer-events:auto;display:grid;gap:.75rem;transform-origin:top;border-radius:calc(var(--radius) + .25rem);padding-block:1rem;padding-inline:1rem 3rem;background-color:var(--glass-overlay);-webkit-backdrop-filter:var(--glass-filter);backdrop-filter:var(--glass-filter);color:var(--popover-foreground);box-shadow:inset 0 0 0 1px var(--toast-edge,var(--border)),var(--shadow-lg);outline:1px solid transparent;outline-offset:-1px;font-size:.875rem;line-height:1.25rem;text-wrap:pretty;transition:opacity var(--duration-layer) var(--ease)}`,
  ':where([data-slot=toast][data-variant=danger]){--toast-tint:var(--danger)}',
  ...['info', 'success', 'warning'].map(kind => `:where([data-rich-colors]>[data-slot=toast][data-variant=${kind}]){--toast-tint:var(--${kind})}`),
  `${rich}{background-color:color-mix(in oklab,var(--toast-tint) 12%,var(--glass-overlay));color:var(--toast-tint);--toast-edge:color-mix(in oklab,var(--toast-tint) 30%,transparent)}`,
  ':where([data-slot=toast-content]){display:grid;gap:.25rem;transition:opacity var(--duration-layer) var(--ease)}',
  ':where([data-slot=toast-title]){font-weight:500}',
  '[data-slot=toast-title]:has(>[data-slot=toast-icon]){display:flex;align-items:flex-start;gap:.5rem}',
  '[data-slot=toast-icon]{display:inline-flex;flex-shrink:0;margin-top:.125rem}',
  ':where([data-slot=toast-description]){color:var(--muted-foreground)}',
  // With an icon, the description and the action line up with the title's text.
  `${toast}:has([data-slot=toast-icon]) :where([data-slot=toast-description],[data-slot=toast-action-wrapper]){padding-inline-start:1.5rem}`,
  ':where([data-slot=toast-action-wrapper]){display:flex;transition:opacity var(--duration-layer) var(--ease)}',
  // The two controls are buttons: plain attribute selectors outrank the
  // element reset, and the family's utilities, emitted later, still win.
  ':is([data-slot=toast-action],[data-slot=toast-close]){display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius);background-color:transparent;transition:color var(--duration-state) var(--ease),background-color var(--duration-state) var(--ease)}',
  ':is([data-slot=toast-action],[data-slot=toast-close]):hover{background-color:var(--accent)}',
  // The action's ring straddles its hairline, as on every bounded control.
  '[data-slot=toast-action]{height:var(--control-sm);padding-inline:.75rem;font-weight:500;box-shadow:inset 0 0 0 1px var(--toast-edge,var(--border));outline:1px solid transparent;outline-offset:calc(var(--focus-width)/-2)}',
  '[data-slot=toast-action]:focus-visible{outline:var(--focus-width) solid var(--ring)}',
  '[data-slot=toast-action]:disabled{pointer-events:none;opacity:var(--disabled-opacity)}',
  '[data-slot=toast-close]{position:absolute;top:.75rem;inset-inline-end:.75rem;width:2rem;height:2rem;color:var(--muted-foreground)}',
  '[data-slot=toast-close]:hover{color:var(--foreground)}',
  `${rich} :is([data-slot=toast-description],[data-slot=toast-close]){color:inherit}`,
  // The viewport is pointer-events-none, so hover continuity is carried
  // entirely by the toasts' own hit areas: each toast grows an invisible
  // bridge over the gap toward its next-older sibling, and a closing
  // toast keeps its hit area while the stack is expanded. Without both,
  // crossing a gap (or the front toast fading under the pointer) drops
  // the hit test to the page and fires spurious pointerleave/enter pairs
  // that collapse and re-expand the stack.
  '[data-slot=toast]::after{content:"";position:absolute;inset-inline:0;height:calc(var(--toast-gap,8px) + 1px)}',
  '[data-slot=toast][data-side=bottom]::after{bottom:100%}',
  '[data-slot=toast][data-side=top]::after{top:100%}',
  '[data-slot=toast][data-expanded=false]:not([data-front=true]){height:var(--front-toast-height,auto)}',
  '[data-slot=toast][data-expanded=false]:not([data-front=true])>*{opacity:0}',
  '[data-slot=toast][data-expanded=false]:not([data-front=true]) [data-slot=toast-close]{visibility:hidden}',
  '[data-slot=toast][data-closing=true]{opacity:0}',
  '[data-slot=toast][data-closing=true][data-expanded=false]{pointer-events:none}',
  '@starting-style{[data-slot=toast][data-state=open]{opacity:0}}',
  // A toast enters from its edge and the stack moves, unless motion is reduced.
  '@media (prefers-reduced-motion:no-preference){',
  `${toast}{transition:opacity var(--duration-layer) var(--ease),transform var(--duration-layer) var(--ease)}`,
  '@starting-style{[data-slot=toast][data-state=open][data-side=bottom]{transform:translateY(1rem) scale(.96)}[data-slot=toast][data-state=open][data-side=top]{transform:translateY(-1rem) scale(.96)}}',
  '}',
  // Without backdrop-filter the frost is the solid raised surface.
  `@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){${toast}{--glass-overlay:var(--popover)}}`,
].join('')

/** Shortcuts and rules of Dialog, AlertDialog, Drawer and Toast. */
export const modal: Preset = {
  name: 'ajo-ui-playa-modal',
  // Global rules for base-owned parts, emitted only when the family's
  // shortcut is used. They join the preflight layer, before every utility,
  // so the family's own classes still override them.
  rules: [
    ['playa-modal-enter', [enter], { layer: 'preflights' }],
    ['playa-drawer-sheet', [sheet], { layer: 'preflights' }],
    ['playa-modal-close', [close], { layer: 'preflights' }],
    ['playa-toast-stack', [stack], { layer: 'preflights' }],
  ],
  shortcuts: {
    'playa-toaster': 'playa-toast-stack pointer-events-none fixed w-full p-4 outline-none sm:max-w-[420px]',
    'playa-drawer': 'playa-drawer-sheet m-0 flex flex-col gap-2',
  },
}
