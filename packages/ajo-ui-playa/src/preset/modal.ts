import type { Preset } from 'unocss'

// Drawer slide motion by side, with its backdrop fade.
const motion = [
  '@media (prefers-reduced-motion:no-preference){[data-slot=drawer-content]{opacity:1;transition:transform 350ms cubic-bezier(0.32,0.72,0,1),opacity 350ms ease,display 350ms allow-discrete,overlay 350ms allow-discrete}[data-slot=drawer-content][open]{opacity:1;transform:none}[data-slot=drawer-content][data-side=bottom]:not([open]){transform:translateY(100%)}[data-slot=drawer-content][data-side=top]:not([open]){transform:translateY(-100%)}[data-slot=drawer-content][data-side=right]:not([open]){transform:translateX(100%)}[data-slot=drawer-content][data-side=left]:not([open]){transform:translateX(-100%)}[data-slot=drawer-content]::backdrop{opacity:0;transition:opacity 350ms ease,display 350ms allow-discrete,overlay 350ms allow-discrete}[data-slot=drawer-content][open]::backdrop{opacity:1}@starting-style{[data-slot=drawer-content][open][data-side=bottom]{transform:translateY(100%)}[data-slot=drawer-content][open][data-side=top]{transform:translateY(-100%)}[data-slot=drawer-content][open][data-side=right]{transform:translateX(100%)}[data-slot=drawer-content][open][data-side=left]{transform:translateX(-100%)}[data-slot=drawer-content][open]::backdrop{opacity:0}}}',
].join('')

// Toast placement, stacking and hover continuity; without backdrop-filter
// the toast surfaces fall back to solid fills.
const stack = [
  '[data-slot=toast]{position:absolute;left:1rem;right:1rem;width:auto;transform:translateY(var(--toast-y,0)) scale(var(--toast-scale,1))}',
  '[data-slot=toast][data-side=bottom]{bottom:1rem}',
  '[data-slot=toast][data-side=top]{top:1rem}',
  '[data-slot=toast-title]:has(>[data-slot=toast-icon]){display:flex;align-items:flex-start;gap:.5rem}',
  '[data-slot=toast-icon]{display:inline-flex;flex-shrink:0;margin-top:.125rem}',
  // The viewport is pointer-events-none, so hover continuity is carried
  // entirely by the toasts' own hit areas: each toast grows an invisible
  // bridge over the gap toward its next-older sibling, and a closing
  // toast keeps its hit area while the stack is expanded. Without both,
  // crossing a gap (or the front toast fading under the pointer) drops
  // the hit test to the page and fires spurious pointerleave/enter pairs
  // that collapse and re-expand the stack.
  '[data-slot=toast]::after{content:"";position:absolute;left:0;right:0;height:calc(var(--toast-gap,8px) + 1px)}',
  '[data-slot=toast][data-side=bottom]::after{bottom:100%}',
  '[data-slot=toast][data-side=top]::after{top:100%}',
  '[data-slot=toast][data-expanded=false]:not([data-front=true]){height:var(--front-toast-height,auto)}',
  '[data-slot=toast][data-expanded=false]:not([data-front=true])>*{opacity:0}',
  '[data-slot=toast][data-expanded=false]:not([data-front=true]) [data-slot=toast-close]{visibility:hidden}',
  '[data-slot=toast][data-closing=true]{opacity:0}',
  '[data-slot=toast][data-closing=true][data-expanded=false]{pointer-events:none}',
  '@starting-style{[data-slot=toast][data-state=open]{opacity:0;transform:translateY(1rem) scale(.96)}}',
  '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){[data-slot=toast][data-slot=toast]{background-color:var(--popover)}[data-slot=toast][data-variant=danger]{background-color:color-mix(in srgb,var(--danger) 12%,var(--popover))}[data-rich-colors]>[data-slot=toast][data-variant=info]{background-color:color-mix(in srgb,var(--info) 12%,var(--popover))}[data-rich-colors]>[data-slot=toast][data-variant=success]{background-color:color-mix(in srgb,var(--success) 12%,var(--popover))}[data-rich-colors]>[data-slot=toast][data-variant=warning]{background-color:color-mix(in srgb,var(--warning) 12%,var(--popover))}}',
].join('')

/** Shortcuts and rules of Dialog, AlertDialog, Drawer and Toast. */
export const modal: Preset = {
  name: 'ajo-ui-playa-modal',
  // Global rules for base-owned parts, emitted only when the family's
  // shortcut is used. They join the preflight layer, before every utility,
  // so the family's own classes still override them.
  rules: [
    ['playa-drawer-motion', [motion], { layer: 'preflights' }],
    ['playa-toast-stack', [stack], { layer: 'preflights' }],
  ],
  shortcuts: {
    // Toasts and their parts are base-owned nodes, themed by slot from each
    // viewport. Surfaces key off `data-variant`; info, success and warning
    // toasts take their tone only under `data-rich-colors`.
    'playa-toaster': [
      'playa-toast-stack pointer-events-none fixed w-full p-4 outline-none sm:max-w-[420px]',
      '[&>:where([data-slot=toast])]:pointer-events-auto [&>:where([data-slot=toast])]:grid [&>:where([data-slot=toast])]:origin-top [&>:where([data-slot=toast])]:grid-cols-[1fr_auto] [&>:where([data-slot=toast])]:items-start [&>:where([data-slot=toast])]:gap-x-4 [&>:where([data-slot=toast])]:gap-y-1 [&>:where([data-slot=toast])]:rounded-lg [&>:where([data-slot=toast])]:p-4 [&>:where([data-slot=toast])]:pr-10 [&>:where([data-slot=toast])]:shadow-lg [&>:where([data-slot=toast])]:transition-[margin,opacity,transform,box-shadow] [&>:where([data-slot=toast])]:duration-200 [&>:where([data-slot=toast])]:ease-out motion-reduce:[&>:where([data-slot=toast])]:transition-none',
      '[&:not([data-rich-colors])>:where([data-slot=toast]:not([data-variant=danger]))]:glass-overlay [&:not([data-rich-colors])>:where([data-slot=toast]:not([data-variant=danger]))]:edge [&[data-rich-colors]>:where([data-slot=toast][data-variant=default])]:glass-overlay [&[data-rich-colors]>:where([data-slot=toast][data-variant=default])]:edge',
      '[&>:where([data-slot=toast][data-variant=danger])]:bg-danger/10 [&>:where([data-slot=toast][data-variant=danger])]:text-danger [&>:where([data-slot=toast][data-variant=danger])]:inset-ring [&>:where([data-slot=toast][data-variant=danger])]:inset-ring-danger/25 [&>:where([data-slot=toast][data-variant=danger])]:backdrop-blur-xl [&>:where([data-slot=toast][data-variant=danger])]:backdrop-saturate-150',
      '[&[data-rich-colors]>:where([data-slot=toast][data-variant=info])]:bg-info/10 [&[data-rich-colors]>:where([data-slot=toast][data-variant=info])]:text-info [&[data-rich-colors]>:where([data-slot=toast][data-variant=info])]:inset-ring [&[data-rich-colors]>:where([data-slot=toast][data-variant=info])]:inset-ring-info/25 [&[data-rich-colors]>:where([data-slot=toast][data-variant=info])]:backdrop-blur-xl [&[data-rich-colors]>:where([data-slot=toast][data-variant=info])]:backdrop-saturate-150',
      '[&[data-rich-colors]>:where([data-slot=toast][data-variant=success])]:bg-success/10 [&[data-rich-colors]>:where([data-slot=toast][data-variant=success])]:text-success [&[data-rich-colors]>:where([data-slot=toast][data-variant=success])]:inset-ring [&[data-rich-colors]>:where([data-slot=toast][data-variant=success])]:inset-ring-success/25 [&[data-rich-colors]>:where([data-slot=toast][data-variant=success])]:backdrop-blur-xl [&[data-rich-colors]>:where([data-slot=toast][data-variant=success])]:backdrop-saturate-150',
      '[&[data-rich-colors]>:where([data-slot=toast][data-variant=warning])]:bg-warning/10 [&[data-rich-colors]>:where([data-slot=toast][data-variant=warning])]:text-warning [&[data-rich-colors]>:where([data-slot=toast][data-variant=warning])]:inset-ring [&[data-rich-colors]>:where([data-slot=toast][data-variant=warning])]:inset-ring-warning/25 [&[data-rich-colors]>:where([data-slot=toast][data-variant=warning])]:backdrop-blur-xl [&[data-rich-colors]>:where([data-slot=toast][data-variant=warning])]:backdrop-saturate-150',
      '[&_:where([data-slot=toast-content])]:grid [&_:where([data-slot=toast-content])]:gap-1 [&_:where([data-slot=toast-content])]:transition-opacity [&_:where([data-slot=toast-content])]:duration-200 motion-reduce:[&_:where([data-slot=toast-content])]:transition-none [&_:where([data-slot=toast-title])]:text-sm [&_:where([data-slot=toast-title])]:font-semibold [&_:where([data-slot=toast-description])]:text-sm [&_:where([data-slot=toast-description])]:opacity-90',
      '[&_:where([data-slot=toast-action-wrapper])]:col-start-2 [&_:where([data-slot=toast-action-wrapper])]:row-span-2 [&_:where([data-slot=toast-action-wrapper])]:row-start-1 [&_:where([data-slot=toast-action-wrapper])]:self-center [&_:where([data-slot=toast-action-wrapper])]:transition-opacity [&_:where([data-slot=toast-action-wrapper])]:duration-200 motion-reduce:[&_:where([data-slot=toast-action-wrapper])]:transition-none',
      '[&_:where([data-slot=toast-action])]:inline-flex [&_:where([data-slot=toast-action])]:h-8 [&_:where([data-slot=toast-action])]:shrink-0 [&_:where([data-slot=toast-action])]:items-center [&_:where([data-slot=toast-action])]:justify-center [&_:where([data-slot=toast-action])]:rounded-md [&_:where([data-slot=toast-action])]:edge [&_:where([data-slot=toast-action])]:bg-transparent [&_:where([data-slot=toast-action])]:px-3 [&_:where([data-slot=toast-action])]:text-sm [&_:where([data-slot=toast-action])]:font-medium [&_:where([data-slot=toast-action])]:transition-colors [&_:where([data-slot=toast-action])]:outline-none hover:[&_:where([data-slot=toast-action])]:bg-accent hover:[&_:where([data-slot=toast-action])]:text-accent-foreground focus-visible:[&_:where([data-slot=toast-action])]:ring-3 focus-visible:[&_:where([data-slot=toast-action])]:ring-ring/50 disabled:[&_:where([data-slot=toast-action])]:pointer-events-none disabled:[&_:where([data-slot=toast-action])]:opacity-50 [&_:is([data-variant=danger]_[data-slot=toast-action])]:inset-ring-danger/40 hover:[&_:is([data-variant=danger]_[data-slot=toast-action])]:bg-danger/10 hover:[&_:is([data-variant=danger]_[data-slot=toast-action])]:inset-ring-danger/33 hover:[&_:is([data-variant=danger]_[data-slot=toast-action])]:text-danger',
      '[&_:where([data-slot=toast-close])]:absolute [&_:where([data-slot=toast-close])]:right-2 [&_:where([data-slot=toast-close])]:top-2 [&_:where([data-slot=toast-close])]:inline-flex [&_:where([data-slot=toast-close])]:size-8 [&_:where([data-slot=toast-close])]:items-center [&_:where([data-slot=toast-close])]:justify-center [&_:where([data-slot=toast-close])]:rounded-md [&_:where([data-slot=toast-close])]:text-foreground/60 [&_:where([data-slot=toast-close])]:opacity-70 [&_:where([data-slot=toast-close])]:outline-none [&_:where([data-slot=toast-close])]:transition-opacity hover:[&_:where([data-slot=toast-close])]:text-foreground hover:[&_:where([data-slot=toast-close])]:opacity-100 focus-visible:[&_:where([data-slot=toast-close])]:opacity-100 focus-visible:[&_:where([data-slot=toast-close])]:ring-2 focus-visible:[&_:where([data-slot=toast-close])]:ring-ring/50 disabled:[&_:where([data-slot=toast-close])]:pointer-events-none [&_:is([data-variant=danger]_[data-slot=toast-close])]:text-danger/70 hover:[&_:is([data-variant=danger]_[data-slot=toast-close])]:text-danger',
    ].join(' '),
    'playa-drawer': 'playa-drawer-motion m-0 flex flex-col gap-4',
  },
}
