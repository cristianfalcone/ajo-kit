import { defineConfig } from 'unocss'
import presetWind4 from '@unocss/preset-wind4'
import presetIcons from '@unocss/preset-icons'
import { icons as lucide } from '@iconify-json/lucide'

const icons = [
  'i-lucide-alert-circle',
  'i-lucide-alert-triangle',
  'i-lucide-check',
  'i-lucide-check-circle',
  'i-lucide-chevron-down',
  'i-lucide-chevron-left',
  'i-lucide-chevron-right',
  'i-lucide-chevron-up',
  'i-lucide-code',
  'i-lucide-circle',
  'i-lucide-circle-check',
  'i-lucide-circle-help',
  'i-lucide-home',
  'i-lucide-key',
  'i-lucide-layout-dashboard',
  'i-lucide-log-out',
  'i-lucide-mail',
  'i-lucide-message-circle',
  'i-lucide-monitor',
  'i-lucide-moon',
  'i-lucide-more-vertical',
  'i-lucide-panel-left',
  'i-lucide-plus',
  'i-lucide-search',
  'i-lucide-search-x',
  'i-lucide-send',
  'i-lucide-send-horizontal',
  'i-lucide-settings',
  'i-lucide-shield',
  'i-lucide-shield-check',
  'i-lucide-sun',
  'i-lucide-trash-2',
  'i-lucide-user',
  'i-lucide-user-cog',
  'i-lucide-users',
  'i-lucide-x',
  'i-lucide-x-circle',
]

const softScrollbar = [
  '.scrollbar-soft',
  '.playa-menu-content',
  '.playa-select-list',
  '.playa-data-table :where([data-menu-content=true],[data-slot=select-list])',
]
const softScrollbarSelector = (pseudo = '') =>
  softScrollbar.map(selector => `${selector}${pseudo}`).join(',')

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      collections: {
        lucide: () => lucide,
      },
    }),
  ],
  safelist: icons,
  variants: [
    matcher => matcher.startsWith('aria-invalid:')
      ? {
        matcher: matcher.slice('aria-invalid:'.length),
        selector: selector => `${selector}[aria-invalid="true"]`,
      }
      : undefined,
    matcher => matcher.startsWith('has-aria-invalid:')
      ? {
        matcher: matcher.slice('has-aria-invalid:'.length),
        selector: selector => `${selector}:has([aria-invalid="true"])`,
      }
      : undefined,
    matcher => matcher.startsWith('pointer-coarse:')
      ? {
        matcher: matcher.slice('pointer-coarse:'.length),
        parent: '@media (pointer:coarse)',
      }
      : undefined,
  ],
  rules: [
    [/^(group|peer)(?:\/.+)?$/, () => ({ '--un-marker': 'initial' })],
    [/^@container(?:\/(.+))?$/, ([, name]) => name
      ? { 'container-name': name, 'container-type': 'inline-size' }
      : { 'container-type': 'inline-size' }],
    ['scroll-fade-x', {
      '-webkit-mask-image': 'linear-gradient(to right,transparent,black 1rem,black calc(100% - 1rem),transparent)',
      'mask-image': 'linear-gradient(to right,transparent,black 1rem,black calc(100% - 1rem),transparent)',
    }],
    ['scrollbar-gutter-stable', { 'scrollbar-gutter': 'stable' }],
    ['scrollbar-none', { 'scrollbar-width': 'none' }],
    ['shimmer', {
      '-webkit-background-clip': 'text',
      animation: 'shimmer 1.8s linear infinite',
      background: 'linear-gradient(90deg,var(--foreground) 0%,var(--muted-foreground) 35%,var(--foreground) 70%)',
      'background-clip': 'text',
      'background-size': '200% 100%',
      color: 'transparent',
    }],
    ['animate-in', {
      '--un-enter-opacity': '1',
      '--un-enter-scale': '1',
      '--un-enter-translate-x': '0',
      '--un-enter-translate-y': '0',
      'animation-duration': '150ms',
      'animation-name': 'enter',
    }],
    ['animate-dialog-in', {
      '--un-enter-opacity': '1',
      '--un-enter-scale': '1',
      '--un-enter-translate-x': '0',
      '--un-enter-translate-y': '0',
      'animation-duration': '200ms',
      'animation-name': 'enter',
    }],
    ['animate-out', {
      '--un-exit-opacity': '1',
      '--un-exit-scale': '1',
      '--un-exit-translate-x': '0',
      '--un-exit-translate-y': '0',
      'animation-duration': '150ms',
      'animation-name': 'exit',
    }],
    [/^fade-in-(\d+)$/, ([, value]) => ({ '--un-enter-opacity': `${Number(value) / 100}` })],
    [/^fade-out-(\d+)$/, ([, value]) => ({ '--un-exit-opacity': `${Number(value) / 100}` })],
    [/^zoom-in-(\d+)$/, ([, value]) => ({ '--un-enter-scale': `${Number(value) / 100}` })],
    [/^zoom-out-(\d+)$/, ([, value]) => ({ '--un-exit-scale': `${Number(value) / 100}` })],
    [/^slide-in-from-(top|bottom|left|right)-(\d+)$/, ([, side, amount]) => {
      const distance = `calc(var(--spacing) * ${amount})`
      const sign = side === 'top' || side === 'left' ? '-' : ''
      return side === 'top' || side === 'bottom'
        ? { '--un-enter-translate-y': `${sign}${distance}` }
        : { '--un-enter-translate-x': `${sign}${distance}` }
    }],
  ],
  preflights: [
    {
      getCSS: () => [
        // Playa palette, "deep ocean" tuning: structural blues sit at OKLCH hue
        // 250-256 and accents at 230-240 so nothing drifts teal, while the warm
        // sand neutrals keep the beach identity. Every body-text pair holds
        // WCAG >= 7:1 and every on-color foreground >= 4.5:1.
        ':root{--radius:0.75rem;--background:#f3f0e9;--foreground:#1e3957;--card:#fafdff;--card-foreground:#1e3957;--popover:#fafdff;--popover-foreground:#1e3957;--primary:#284971;--primary-foreground:#f5fafd;--secondary:#dbe7f0;--secondary-foreground:#1e3957;--muted:#e9e6dc;--muted-foreground:#4f657e;--accent:rgb(40 73 113 / 0.09);--accent-foreground:#1e3957;--danger:#a94b4c;--danger-foreground:#fcf6f3;--success:#45764c;--success-foreground:#f2fbf5;--warning:#96650c;--warning-foreground:#fff9ec;--info:#276b8c;--info-foreground:#f1f9fd;--border:rgb(30 57 87 / 0.14);--input:rgb(30 57 87 / 0.26);--ring:#3e8ec1;--chart-1:#284971;--chart-2:#3e8ec1;--chart-3:#63a06c;--chart-4:#fcb53b;--chart-5:#b45253;--glass-highlight:rgb(255 255 255 / 0.35);--shadow-xs:0 1px 2px rgb(30 57 87 / 0.06),0 2px 8px -2px rgb(30 57 87 / 0.04);--shadow-lg:0 4px 12px -4px rgb(30 57 87 / 0.1),0 16px 40px -8px rgb(30 57 87 / 0.18)}',
        // Dark mode is near-black desaturated charcoal (OKLCH C 0.010-0.020 at
        // hue 252 — a whisper of ocean, not navy) so translucent surfaces
        // composite naturally over the page; the warm sand accents carry the
        // beach identity.
        '.dark{--background:#101317;--foreground:#eae4da;--card:#1c2127;--card-foreground:#eae4da;--popover:#22282f;--popover-foreground:#eae4da;--primary:#d2c1b6;--primary-foreground:#14191e;--secondary:#29313a;--secondary-foreground:#eae4da;--muted:#181c21;--muted-foreground:#9da6b0;--accent:rgb(210 193 182 / 0.12);--accent-foreground:#f0ebe2;--danger:#d98e85;--danger-foreground:#101317;--success:#76ba89;--success-foreground:#101317;--warning:#fcb53b;--warning-foreground:#101317;--info:#75bfe3;--info-foreground:#101317;--border:rgb(210 193 182 / 0.16);--input:rgb(210 193 182 / 0.26);--ring:#75bfe3;--chart-1:#75bfe3;--chart-2:#d2c1b6;--chart-3:#76ba89;--chart-4:#fcb53b;--chart-5:#d98e85;--glass-highlight:rgb(255 255 255 / 0.07);--shadow-xs:0 1px 2px rgb(0 0 0 / 0.35),0 2px 8px -2px rgb(0 0 0 / 0.25);--shadow-lg:0 4px 12px -4px rgb(0 0 0 / 0.4),0 16px 40px -8px rgb(0 0 0 / 0.55)}',
        // Opt in to animating block-size to `auto`: details-backed disclosures
        // (Collapsible, Accordion) transition ::details-content open/close in
        // engines that support keyword interpolation; others keep the snap.
        ':root{interpolate-size:allow-keywords}',
        // Glass is part of the theme's identity, so it does NOT bow to
        // prefers-reduced-transparency (Windows reports it whenever the OS
        // "transparency effects" toggle is off, which would silently flatten
        // the whole theme). Only a genuinely missing backdrop-filter gets a
        // solid fallback; doubled selectors outrank the single-class shortcut
        // and utility rules without depending on layer order.
        '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.glass.glass,.glass-chrome.glass-chrome{background-color:var(--card)}.glass-overlay.glass-overlay{background-color:var(--popover)}[data-slot=toast][data-slot=toast]{background-color:var(--popover)}[data-slot=toast][data-variant=danger]{background-color:color-mix(in srgb,var(--danger) 12%,var(--popover))}[data-slot=toast][data-variant=info]{background-color:color-mix(in srgb,var(--info) 12%,var(--popover))}[data-slot=toast][data-variant=success]{background-color:color-mix(in srgb,var(--success) 12%,var(--popover))}[data-slot=toast][data-variant=warning]{background-color:color-mix(in srgb,var(--warning) 12%,var(--popover))}}',
        // Pressed buttons inside connected groups skip the press scale: group
        // segments overlap by -1px to merge their hairlines, and shrinking one
        // opens a visible seam on both sides.
        '[data-slot=button-group][data-slot=button-group]>:active{scale:none}',
        '@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
        '@keyframes progress-slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}',
        '@keyframes enter{from{opacity:var(--un-enter-opacity,1);transform:translate3d(var(--un-enter-translate-x,0),var(--un-enter-translate-y,0),0) scale3d(var(--un-enter-scale,1),var(--un-enter-scale,1),var(--un-enter-scale,1))}}',
        '@keyframes exit{to{opacity:var(--un-exit-opacity,1);transform:translate3d(var(--un-exit-translate-x,0),var(--un-exit-translate-y,0),0) scale3d(var(--un-exit-scale,1),var(--un-exit-scale,1),var(--un-exit-scale,1))}}',
        '*,::before,::after{border-color:var(--border)}',
        '[data-slot=chart] [data-slot=chart-bar] rect[data-chart-index],[data-slot=chart] [data-slot=chart-pie] path[data-chart-index]{transition:opacity 150ms ease,stroke-width 150ms ease}[data-slot=chart] [data-slot=chart-line] circle[data-chart-index],[data-slot=chart] [data-slot=chart-area] circle[data-chart-index]{transition:opacity 150ms ease,stroke-width 150ms ease,r 150ms ease}[data-slot=chart]:has([data-active]) [data-slot=chart-bar] rect[data-chart-index]:not([data-active]),[data-slot=chart]:has([data-active]) [data-slot=chart-pie] path[data-chart-index]:not([data-active]),[data-slot=chart]:has([data-active]) [data-slot=chart-line] circle[data-chart-index]:not([data-active]),[data-slot=chart]:has([data-active]) [data-slot=chart-area] circle[data-chart-index]:not([data-active]){opacity:.45}[data-slot=chart] [data-active]{opacity:1}[data-slot=chart] circle[data-active]{r:5.6px}',
        '@media (prefers-reduced-motion:no-preference){@keyframes chart-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes chart-undash{to{stroke-dasharray:initial}}@keyframes chart-grow{from{transform:scaleY(0)}}@keyframes chart-settle{from{opacity:0;transform:translateY(4px)}}@keyframes chart-pop{from{opacity:0;transform:scale(0)}}[data-slot=chart] [data-slot=chart-bar] rect[data-chart-series]{transform-box:fill-box;transform-origin:bottom center;animation:chart-grow 450ms cubic-bezier(0.22,1,0.36,1) both;animation-delay:calc(var(--chart-index,0) * 30ms);transition:x 300ms ease-out,y 300ms ease-out,width 300ms ease-out,height 300ms ease-out,opacity 150ms ease,stroke-width 150ms ease}[data-slot=chart] [data-slot=chart-line] path[fill=none],[data-slot=chart] [data-slot=chart-area] path[fill=none]{stroke-dasharray:1;animation:chart-draw 600ms ease-out both,chart-undash 1ms 600ms step-end forwards;transition:d 300ms ease-out}[data-slot=chart] [data-slot=chart-area] path[fill-opacity]{transform-box:fill-box;animation:chart-settle 500ms ease-out both;transition:d 300ms ease-out}[data-slot=chart] [data-slot=chart-line] circle[data-chart-index],[data-slot=chart] [data-slot=chart-area] circle[data-chart-index]{transform-box:fill-box;transform-origin:center;animation:chart-pop 300ms ease-out both;animation-delay:calc(200ms + var(--chart-index,0) * 20ms);transition:cx 300ms ease-out,cy 300ms ease-out,opacity 150ms ease,stroke-width 150ms ease,r 150ms ease}[data-slot=chart] [data-slot=chart-pie] path[data-chart-index]{transform-box:view-box;transform-origin:center;animation:chart-pop 400ms ease-out both;animation-delay:calc(var(--chart-index,0) * 60ms);transition:d 300ms ease-out,opacity 150ms ease,stroke-width 150ms ease}}',
        '@media (prefers-reduced-motion:no-preference){[data-slot=drawer-content]{opacity:1;transition:transform 350ms cubic-bezier(0.32,0.72,0,1),opacity 350ms ease,display 350ms allow-discrete,overlay 350ms allow-discrete}[data-slot=drawer-content][open]{opacity:1;transform:none}[data-slot=drawer-content][data-side=bottom]:not([open]){transform:translateY(100%)}[data-slot=drawer-content][data-side=top]:not([open]){transform:translateY(-100%)}[data-slot=drawer-content][data-side=right]:not([open]){transform:translateX(100%)}[data-slot=drawer-content][data-side=left]:not([open]){transform:translateX(-100%)}[data-slot=drawer-content]::backdrop{opacity:0;transition:opacity 350ms ease,display 350ms allow-discrete,overlay 350ms allow-discrete}[data-slot=drawer-content][open]::backdrop{opacity:1}@starting-style{[data-slot=drawer-content][open][data-side=bottom]{transform:translateY(100%)}[data-slot=drawer-content][open][data-side=top]{transform:translateY(-100%)}[data-slot=drawer-content][open][data-side=right]{transform:translateX(100%)}[data-slot=drawer-content][open][data-side=left]{transform:translateX(-100%)}[data-slot=drawer-content][open]::backdrop{opacity:0}}}',
        '[data-slot=toast]{position:absolute;left:1rem;right:1rem;width:auto;transform:translateY(var(--toast-y,0)) scale(var(--toast-scale,1))}',
        '[data-slot=toast][data-side=bottom]{bottom:1rem}',
        '[data-slot=toast][data-side=top]{top:1rem}',
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
        '[data-slot=attachment][data-state=uploading] [data-slot=attachment-title],[data-slot=attachment][data-state=processing] [data-slot=attachment-title]{color:transparent;background:linear-gradient(90deg,var(--foreground) 0%,var(--muted-foreground) 35%,var(--foreground) 70%);background-size:200% 100%;background-clip:text;-webkit-background-clip:text;animation:shimmer 1.8s linear infinite}',
        // Edge fades pair with ajo-cloves overflow stamps. They activate only
        // while content overflows, so a resting edge never stays dimmed.
        '[data-overflow-x=start]{-webkit-mask-image:linear-gradient(to right,transparent,black 1rem);mask-image:linear-gradient(to right,transparent,black 1rem)}',
        '[data-overflow-x=end]{-webkit-mask-image:linear-gradient(to right,black calc(100% - 1rem),transparent);mask-image:linear-gradient(to right,black calc(100% - 1rem),transparent)}',
        '[data-overflow-x=both]{-webkit-mask-image:linear-gradient(to right,transparent,black 1rem,black calc(100% - 1rem),transparent);mask-image:linear-gradient(to right,transparent,black 1rem,black calc(100% - 1rem),transparent)}',
        '[data-overflow-y=start]{-webkit-mask-image:linear-gradient(to bottom,transparent,black 1rem);mask-image:linear-gradient(to bottom,transparent,black 1rem)}',
        '[data-overflow-y=end]{-webkit-mask-image:linear-gradient(to bottom,black calc(100% - 1rem),transparent);mask-image:linear-gradient(to bottom,black calc(100% - 1rem),transparent)}',
        '[data-overflow-y=both]{-webkit-mask-image:linear-gradient(to bottom,transparent,black 1rem,black calc(100% - 1rem),transparent);mask-image:linear-gradient(to bottom,transparent,black 1rem,black calc(100% - 1rem),transparent)}',
        '.scrollbar-none::-webkit-scrollbar{display:none}',
        `${softScrollbarSelector('::-webkit-scrollbar')}{height:.625rem;width:.625rem}`,
        `${softScrollbarSelector('::-webkit-scrollbar-button')}{display:none}`,
        `${softScrollbarSelector('::-webkit-scrollbar-thumb')}{border:2px solid transparent;border-radius:9999px;background-clip:padding-box;background-color:var(--border)}`,
        `${softScrollbarSelector('::-webkit-scrollbar-track')}{background-color:transparent}`,
        `@supports not selector(::-webkit-scrollbar){${softScrollbarSelector()}{scrollbar-color:var(--border) transparent;scrollbar-width:thin}}`,
        '@media (prefers-reduced-motion:reduce){.shimmer,[data-slot=attachment][data-state=uploading] [data-slot=attachment-title],[data-slot=attachment][data-state=processing] [data-slot=attachment-title]{animation:none}}',
        'button{cursor:pointer}',
        'input:focus,select:focus,textarea:focus{outline:none}',
      ].join('')
    }
  ],
  shortcuts: {
    'site-container': 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
    // Hairline inner border drawn with an inset ring: crisper than `border`
    // over stacked translucent surfaces and composes with ring/shadow slots.
    edge: 'inset-ring inset-ring-border',
    'edge-input': 'inset-ring inset-ring-input',
    // Glass tiers, one per elevation: persistent chrome, resting panels and
    // floating overlays. Depth reads as more blur plus more opacity, saturate
    // keeps the blurred backdrop vivid, and the inset hairline draws the
    // specular top edge (--glass-highlight flips per scheme). Content layered
    // on these surfaces stays solid or tint-only: glass never stacks on glass.
    'glass-chrome': 'bg-card/50 text-card-foreground backdrop-blur-md backdrop-saturate-150',
    glass: 'bg-card/60 text-card-foreground backdrop-blur-md backdrop-saturate-150 inset-shadow-[inset_0_1px_0_var(--glass-highlight)]',
    'glass-overlay': 'bg-popover/55 text-popover-foreground backdrop-blur-xl backdrop-saturate-150 inset-shadow-[inset_0_1px_0_var(--glass-highlight)]',
    // Discreet themed scrollbar for scrollable lists and viewports. Chromium and
    // Safari take the fully custom webkit path (buttonless); Firefox gets the
    // standard thin scrollbar via the preflight `@supports` fallback below.
    // The transparent thumb border keeps overlay paint inside rounded corners.
    // Menu and Select are rendered both through their Playa adapters and as
    // base descendants of composite families such as DataTable. Keep their
    // complete visual recipes here so both paths consume the same source.
    'playa-menu-root': 'relative inline-block',
    'playa-menu-content-open': [{ 'transition-property': 'opacity' }],
    'playa-menu-content-visible': 'opacity-100',
    'playa-menu-content-hidden': 'opacity-0',
    'playa-menu-content-reduced': 'transition-none',
    'playa-menu-content': [
      'z-50 m-0 max-h-[max(96px,min(320px,var(--available-height)))] overflow-y-auto overflow-x-hidden overscroll-contain rounded-md glass-overlay edge p-1 shadow-lg outline-none playa-menu-content-hidden transition-discrete duration-150 ease-out motion-reduce:playa-menu-content-reduced data-[state=open]:playa-menu-content-open data-[state=open]:data-[side]:playa-menu-content-visible starting:data-[state=open]:data-[side]:playa-menu-content-hidden',
      { 'transition-property': 'opacity,display,overlay' },
    ],
    'playa-menu-item': 'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[inset]:pl-8 data-[variant=danger]:text-danger data-[variant=danger]:focus:bg-danger/10 data-[variant=danger]:focus:text-danger data-[variant=danger]:data-[highlighted=true]:bg-danger/10 data-[variant=danger]:data-[highlighted=true]:text-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground data-[variant=danger]:[&_svg]:text-danger',
    'playa-menu-choice-focus': 'bg-accent text-accent-foreground',
    'playa-menu-choice-disabled': 'pointer-events-none opacity-50',
    'playa-menu-choice-row': 'relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:playa-menu-choice-focus data-[highlighted=true]:playa-menu-choice-focus data-[disabled=true]:playa-menu-choice-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    'playa-menu-indicator': 'pointer-events-none absolute left-2 flex size-3.5 items-center justify-center',
    'playa-menu-label': 'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8',
    'playa-menu-separator': '-mx-1 my-1 h-px bg-border',
    'playa-menu-shortcut': 'ml-auto text-xs tracking-widest text-muted-foreground tabular-nums',
    'playa-menu-check-icon': 'i-lucide-check size-4',
    'playa-menu-radio-icon': 'i-lucide-circle size-2 fill-current',
    'playa-menu-sub-trigger-icon': 'i-lucide-chevron-right ml-auto size-4',
    'playa-menu-sub-trigger-open': 'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
    'playa-select-root': 'relative inline-block',
    'playa-select-trigger-focus': 'inset-ring-ring ring-3 ring-ring/25',
    'playa-select-trigger-disabled': 'cursor-not-allowed opacity-50',
    'playa-select-trigger-invalid': 'inset-ring-danger ring-danger/20',
    'playa-select-trigger-placeholder': 'text-muted-foreground',
    'playa-select-value': 'line-clamp-1 flex items-center gap-2',
    'playa-select-trigger': 'flex w-fit items-center justify-between gap-2 rounded-md edge-input bg-transparent px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:playa-select-trigger-focus disabled:playa-select-trigger-disabled aria-invalid:playa-select-trigger-invalid data-[placeholder]:playa-select-trigger-placeholder data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:playa-select-value [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground',
    'playa-select-trigger-icon': 'i-lucide-chevron-down size-4 opacity-50',
    'playa-select-content-layout': 'flex',
    'playa-select-content-open': 'animate-in fade-in-0 zoom-in-95',
    'playa-select-content-closed': 'animate-out fade-out-0 zoom-out-95',
    'playa-select-content': 'isolate z-50 m-0 [&:popover-open]:playa-select-content-layout max-h-[max(96px,var(--available-height,24rem))] min-w-[var(--anchor-width,8rem)] flex-col overflow-hidden rounded-md glass-overlay edge shadow-lg outline-none data-[state=open]:playa-select-content-open data-[state=closed]:playa-select-content-closed',
    'playa-select-list-empty': 'p-0',
    'playa-select-list': 'overflow-y-auto overflow-x-hidden overscroll-contain min-h-0 scroll-py-1 p-1 [[data-slot=select-content][data-empty]_&]:playa-select-list-empty',
    'playa-select-row-highlighted': 'bg-accent text-accent-foreground',
    'playa-select-row-disabled': 'pointer-events-none opacity-50',
    'playa-select-row': 'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pl-2 text-sm outline-none select-none data-[highlighted=true]:playa-select-row-highlighted data-[disabled=true]:playa-select-row-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground',
    'playa-select-item': 'playa-select-row pr-9',
    'playa-select-create': 'playa-select-row pr-2 text-muted-foreground data-[highlighted=true]:text-accent-foreground',
    'playa-select-indicator-coarse': 'size-5',
    'playa-select-indicator-selected': 'opacity-100',
    'playa-select-indicator-empty': 'opacity-0',
    'playa-select-indicator': 'pointer-events-none absolute right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground pointer-coarse:playa-select-indicator-coarse data-[selected=true]:playa-select-indicator-selected data-[selected=false]:playa-select-indicator-empty',
    'playa-select-indicator-icon-coarse': 'size-3.5',
    'playa-select-indicator-icon': 'i-lucide-check pointer-events-none size-3 pointer-coarse:playa-select-indicator-icon-coarse',
    'playa-select-label': 'px-2 py-1.5 text-xs text-muted-foreground pointer-coarse:px-3 pointer-coarse:py-2 pointer-coarse:text-sm',
    'playa-select-separator': 'pointer-events-none -mx-1 my-1 h-px bg-border',
    'playa-select-empty': 'hidden w-full justify-center py-2 text-center text-sm text-muted-foreground [[data-slot=select-content][data-empty]_&]:flex',
    'playa-select-status': 'flex w-full items-center justify-center gap-2 py-2 text-center text-sm text-muted-foreground empty:hidden',
    'playa-select-chips': 'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md edge-input bg-transparent px-2.5 py-1.5 text-sm transition-[color,box-shadow] focus-within:inset-ring-ring focus-within:ring-3 focus-within:ring-ring/25 has-aria-invalid:inset-ring-danger has-aria-invalid:ring-danger/20',
    'playa-select-chips-input': 'min-w-16 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
    'playa-select-scroll-button': 'flex w-full cursor-default items-center justify-center py-1',
    'playa-checkbox-box': 'relative inline-flex size-4 shrink-0 items-center justify-center rounded-xs edge-input bg-transparent outline-none transition-[background-color,box-shadow] duration-150 motion-reduce:transition-none has-[:focus-visible]:inset-ring-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[[aria-invalid=true]]:inset-ring-danger has-[[aria-invalid=true]]:ring-danger/20',
    'playa-table-container': 'relative w-full overflow-x-auto',
    'playa-table': 'w-full caption-bottom text-sm',
    'playa-table-header': '[&_tr]:border-b',
    'playa-table-body': '[&_tr:last-child]:border-0',
    'playa-table-footer': 'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
    'playa-table-row': 'border-b transition-colors hover:bg-accent has-aria-expanded:bg-accent data-[state=selected]:bg-muted',
    'playa-table-head': 'h-11 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
    'playa-table-cell': 'px-4 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
    'playa-table-caption': 'mt-4 text-sm text-muted-foreground',
    'playa-data-table': [
      'flex w-full flex-col gap-4',
      '[&_:where([data-slot=data-table-toolbar])]:flex [&_:where([data-slot=data-table-toolbar])]:flex-col [&_:where([data-slot=data-table-toolbar])]:gap-2 sm:[&_:where([data-slot=data-table-toolbar])]:flex-row sm:[&_:where([data-slot=data-table-toolbar])]:items-center sm:[&_:where([data-slot=data-table-toolbar])]:justify-between',
      '[&_:where([data-slot=data-table-toolbar-controls])]:flex [&_:where([data-slot=data-table-toolbar-controls])]:flex-1 [&_:where([data-slot=data-table-toolbar-controls])]:flex-wrap [&_:where([data-slot=data-table-toolbar-controls])]:items-center [&_:where([data-slot=data-table-toolbar-controls])]:gap-2',
      '[&_:where([data-slot=data-table-search])]:h-8 [&_:where([data-slot=data-table-search])]:w-[180px] [&_:where([data-slot=data-table-search])]:rounded-md [&_:where([data-slot=data-table-search])]:edge-input [&_:where([data-slot=data-table-search])]:bg-transparent [&_:where([data-slot=data-table-search])]:px-3 [&_:where([data-slot=data-table-search])]:text-sm [&_:where([data-slot=data-table-search])]:outline-none [&_:where([data-slot=data-table-search])]:placeholder:text-muted-foreground focus-visible:[&_:where([data-slot=data-table-search])]:inset-ring-ring focus-visible:[&_:where([data-slot=data-table-search])]:ring-3 focus-visible:[&_:where([data-slot=data-table-search])]:ring-ring/25 lg:[&_:where([data-slot=data-table-search])]:w-[260px]',
      '[&_:where([data-slot=data-table-facet])]:inline-flex [&_:where([data-slot=data-table-facet])]:h-8 [&_:where([data-slot=data-table-facet])]:items-center [&_:where([data-slot=data-table-facet])]:gap-2 [&_:where([data-slot=data-table-facet])]:rounded-md [&_:where([data-slot=data-table-facet])]:border [&_:where([data-slot=data-table-facet])]:border-dashed [&_:where([data-slot=data-table-facet])]:px-3 [&_:where([data-slot=data-table-facet])]:text-sm [&_:where([data-slot=data-table-facet])]:font-medium [&_:where([data-slot=data-table-facet])]:outline-none hover:[&_:where([data-slot=data-table-facet])]:bg-accent focus-visible:[&_:where([data-slot=data-table-facet])]:ring-3 focus-visible:[&_:where([data-slot=data-table-facet])]:ring-ring/50',
      '[&_:where([data-slot=data-table-facet-icon])]:i-lucide-list-filter [&_:where([data-slot=data-table-facet-icon])]:size-4 [&_:where([data-slot=data-table-facet-count])]:rounded-xs [&_:where([data-slot=data-table-facet-count])]:bg-muted [&_:where([data-slot=data-table-facet-count])]:px-1.5 [&_:where([data-slot=data-table-facet-count])]:py-0.5 [&_:where([data-slot=data-table-facet-count])]:text-xs [&_:where([data-slot=data-table-facet-count])]:tabular-nums',
      '[&_:where([data-slot=data-table-columns])]:inline-flex [&_:where([data-slot=data-table-columns])]:h-8 [&_:where([data-slot=data-table-columns])]:items-center [&_:where([data-slot=data-table-columns])]:gap-2 [&_:where([data-slot=data-table-columns])]:rounded-md [&_:where([data-slot=data-table-columns])]:edge [&_:where([data-slot=data-table-columns])]:px-3 [&_:where([data-slot=data-table-columns])]:text-sm [&_:where([data-slot=data-table-columns])]:font-medium [&_:where([data-slot=data-table-columns])]:outline-none hover:[&_:where([data-slot=data-table-columns])]:bg-accent focus-visible:[&_:where([data-slot=data-table-columns])]:ring-3 focus-visible:[&_:where([data-slot=data-table-columns])]:ring-ring/50 [&_:where([data-slot=data-table-columns-icon])]:i-lucide-chevron-down [&_:where([data-slot=data-table-columns-icon])]:size-4',
      '[&_:where([data-slot=data-table-reset])]:inline-flex [&_:where([data-slot=data-table-reset])]:h-8 [&_:where([data-slot=data-table-reset])]:items-center [&_:where([data-slot=data-table-reset])]:gap-2 [&_:where([data-slot=data-table-reset])]:rounded-md [&_:where([data-slot=data-table-reset])]:px-3 [&_:where([data-slot=data-table-reset])]:text-sm [&_:where([data-slot=data-table-reset])]:font-medium hover:[&_:where([data-slot=data-table-reset])]:bg-accent [&_:where([data-slot=data-table-reset-icon])]:i-lucide-x [&_:where([data-slot=data-table-reset-icon])]:size-4',
      '[&_:where([data-slot=menu])]:playa-menu-root',
      '[&_:where([data-slot=data-table-facet-content],[data-slot=data-table-columns-content])]:playa-menu-content [&_:where([data-slot=data-table-facet-content],[data-slot=data-table-columns-content])]:min-w-[8rem]',
      'motion-reduce:[&_:where([data-slot=data-table-facet-content],[data-slot=data-table-columns-content])]:playa-menu-content-reduced data-[state=open]:[&_:where([data-slot=data-table-facet-content],[data-slot=data-table-columns-content])]:playa-menu-content-open data-[state=open]:data-[side]:[&_:where([data-slot=data-table-facet-content],[data-slot=data-table-columns-content])]:playa-menu-content-visible starting:data-[state=open]:data-[side]:[&_:where([data-slot=data-table-facet-content],[data-slot=data-table-columns-content])]:playa-menu-content-hidden',
      '[&_:where([data-slot=menu-label])]:playa-menu-label [&_:where([data-slot=menu-separator])]:playa-menu-separator',
      '[&_:where([data-slot=menu-checkbox-item])]:playa-menu-choice-row',
      'focus:[&_:where([data-slot=menu-checkbox-item])]:playa-menu-choice-focus data-[highlighted=true]:[&_:where([data-slot=menu-checkbox-item])]:playa-menu-choice-focus data-[disabled=true]:[&_:where([data-slot=menu-checkbox-item])]:playa-menu-choice-disabled',
      '[&_:where([data-slot=menu-checkbox-item]>span:first-child)]:playa-menu-indicator [&_:where([data-slot=menu-checkbox-item]>span:first-child>span)]:playa-menu-check-icon [&_:where([data-slot=data-table-facet-option-icon])]:size-4',
      '[&_:where([data-slot=data-table-container])]:playa-table-container [&_:where([data-slot=data-table-container])]:rounded-lg [&_:where([data-slot=data-table-container])]:edge',
      '[&_:where([data-slot=table])]:playa-table [&_:where([data-slot=table-header])]:playa-table-header [&_:where([data-slot=table-body])]:playa-table-body [&_:where([data-slot=table-row])]:playa-table-row [&_:where([data-slot=table-head])]:playa-table-head [&_:where([data-slot=table-cell])]:playa-table-cell',
      '[&_:where([data-align=center])]:text-center [&_:where([data-align=right])]:text-right',
      '[&_:where([data-slot=data-table-sort-trigger])]:flex [&_:where([data-slot=data-table-sort-trigger])]:h-8 [&_:where([data-slot=data-table-sort-trigger])]:w-full [&_:where([data-slot=data-table-sort-trigger])]:items-center [&_:where([data-slot=data-table-sort-trigger])]:justify-start [&_:where([data-slot=data-table-sort-trigger])]:gap-2 [&_:where([data-slot=data-table-sort-trigger])]:rounded-md [&_:where([data-slot=data-table-sort-trigger])]:px-0 [&_:where([data-slot=data-table-sort-trigger])]:text-sm [&_:where([data-slot=data-table-sort-trigger])]:font-medium hover:[&_:where([data-slot=data-table-sort-trigger])]:bg-accent focus-visible:[&_:where([data-slot=data-table-sort-trigger])]:ring-3 focus-visible:[&_:where([data-slot=data-table-sort-trigger])]:ring-ring/50 [&_:where([data-slot=table-head][data-align=center])>[data-slot=data-table-sort-trigger]]:justify-center [&_:where([data-slot=table-head][data-align=right])>[data-slot=data-table-sort-trigger]]:justify-end [&_:where([data-slot=data-table-sort-icon])]:size-4 [&_:where([data-slot=data-table-sort-icon][data-sort=none])]:i-lucide-arrow-up-down [&_:where([data-slot=data-table-sort-icon][data-sort=asc])]:i-lucide-arrow-up [&_:where([data-slot=data-table-sort-icon][data-sort=desc])]:i-lucide-arrow-down',
      // Stateful checkbox colors must outrank the neutral `:where` base regardless of Uno emission order.
      '[&_:where([data-slot=checkbox])]:playa-checkbox-box [&_:is([data-slot=checkbox][data-state=checked],[data-slot=checkbox][data-state=indeterminate])]:inset-ring-transparent [&_:is([data-slot=checkbox][data-state=checked],[data-slot=checkbox][data-state=indeterminate])]:bg-primary [&_:is([data-slot=checkbox][data-state=checked],[data-slot=checkbox][data-state=indeterminate])]:text-primary-foreground [&_:where([data-slot=checkbox-input])]:absolute [&_:where([data-slot=checkbox-input])]:inset-0 [&_:where([data-slot=checkbox-input])]:m-0 [&_:where([data-slot=checkbox-input])]:size-full [&_:where([data-slot=checkbox-input])]:cursor-pointer [&_:where([data-slot=checkbox-input])]:opacity-0 disabled:[&_:where([data-slot=checkbox-input])]:cursor-not-allowed',
      '[&_:where([data-slot=checkbox-indicator])]:pointer-events-none [&_:where([data-slot=checkbox-indicator])]:absolute [&_:where([data-slot=checkbox-indicator])]:size-3.5 [&_:where([data-slot=checkbox-indicator])]:opacity-0 [&_:where([data-slot=checkbox-indicator][data-state=checked])]:i-lucide-check [&_:where([data-slot=checkbox-indicator][data-state=indeterminate])]:i-lucide-minus [&_:where([data-slot=checkbox][data-state=checked]>[data-slot=checkbox-indicator][data-state=checked])]:opacity-100 [&_:where([data-slot=checkbox][data-state=indeterminate]>[data-slot=checkbox-indicator][data-state=indeterminate])]:opacity-100',
      '[&_:where([data-slot=data-table-empty])]:h-24 [&_:where([data-slot=data-table-empty])]:text-center [&_:where([data-slot=data-table-empty])]:text-muted-foreground',
      '[&_:where([data-slot=data-table-footer])]:flex [&_:where([data-slot=data-table-footer])]:flex-col [&_:where([data-slot=data-table-footer])]:gap-2 sm:[&_:where([data-slot=data-table-footer])]:flex-row sm:[&_:where([data-slot=data-table-footer])]:items-center sm:[&_:where([data-slot=data-table-footer])]:justify-between [&_:where([data-slot=data-table-selection-summary])]:text-sm [&_:where([data-slot=data-table-selection-summary])]:text-muted-foreground [&_:where([data-slot=data-table-selection-summary])]:tabular-nums',
      '[&_:where([data-slot=data-table-pagination])]:flex [&_:where([data-slot=data-table-pagination])]:flex-wrap [&_:where([data-slot=data-table-pagination])]:items-center [&_:where([data-slot=data-table-pagination])]:gap-4 [&_:where([data-slot=data-table-page-size])]:flex [&_:where([data-slot=data-table-page-size])]:items-center [&_:where([data-slot=data-table-page-size])]:gap-2 [&_:where([data-slot=data-table-page-size])]:text-sm [&_:where([data-slot=data-table-page-size])]:font-medium [&_:where([data-slot=data-table-page-indicator])]:w-[100px] [&_:where([data-slot=data-table-page-indicator])]:text-center [&_:where([data-slot=data-table-page-indicator])]:text-sm [&_:where([data-slot=data-table-page-indicator])]:font-medium [&_:where([data-slot=data-table-page-indicator])]:tabular-nums [&_:where([data-slot=data-table-pagination-actions])]:flex [&_:where([data-slot=data-table-pagination-actions])]:items-center [&_:where([data-slot=data-table-pagination-actions])]:gap-2',
      '[&_:where([data-slot=select])]:playa-select-root [&_:where([data-slot=select-trigger])]:playa-select-trigger [&_:where([data-slot=select-trigger])]:!h-8 [&_:where([data-slot=select-trigger])]:!w-[74px] [&_:where([data-slot=select-icon])]:playa-select-trigger-icon',
      'focus-visible:[&_:where([data-slot=select-trigger])]:playa-select-trigger-focus disabled:[&_:where([data-slot=select-trigger])]:playa-select-trigger-disabled aria-invalid:[&_:where([data-slot=select-trigger])]:playa-select-trigger-invalid data-[placeholder]:[&_:where([data-slot=select-trigger])]:playa-select-trigger-placeholder [&_:where([data-slot=select-trigger])>[data-slot=select-value]]:playa-select-value',
      '[&_:where([data-slot=select-content])]:playa-select-content [&_:where([data-slot=select-list])]:playa-select-list [&_:where([data-slot=select-item])]:playa-select-item',
      '[&_:where([data-slot=select-content]:popover-open)]:playa-select-content-layout data-[state=open]:[&_:where([data-slot=select-content])]:playa-select-content-open data-[state=closed]:[&_:where([data-slot=select-content])]:playa-select-content-closed [&_:where([data-slot=select-content][data-empty])_[data-slot=select-list]]:playa-select-list-empty data-[highlighted=true]:[&_:where([data-slot=select-item])]:playa-select-row-highlighted data-[disabled=true]:[&_:where([data-slot=select-item])]:playa-select-row-disabled',
      '[&_:where([data-slot=select-item-indicator])]:playa-select-indicator [&_:where([data-slot=select-item-indicator]>span)]:playa-select-indicator-icon',
      'pointer-coarse:[&_:where([data-slot=select-item-indicator])]:playa-select-indicator-coarse data-[selected=true]:[&_:where([data-slot=select-item-indicator])]:playa-select-indicator-selected data-[selected=false]:[&_:where([data-slot=select-item-indicator])]:playa-select-indicator-empty pointer-coarse:[&_:where([data-slot=select-item-indicator]>span)]:playa-select-indicator-icon-coarse',
      '[&_:where([data-slot=data-table-pagination-action])]:inline-flex [&_:where([data-slot=data-table-pagination-action])]:size-8 [&_:where([data-slot=data-table-pagination-action])]:items-center [&_:where([data-slot=data-table-pagination-action])]:justify-center [&_:where([data-slot=data-table-pagination-action])]:rounded-md [&_:where([data-slot=data-table-pagination-action])]:edge [&_:where([data-slot=data-table-pagination-action])]:outline-none disabled:[&_:where([data-slot=data-table-pagination-action])]:opacity-50 hover:[&_:where([data-slot=data-table-pagination-action])]:bg-accent focus-visible:[&_:where([data-slot=data-table-pagination-action])]:ring-3 focus-visible:[&_:where([data-slot=data-table-pagination-action])]:ring-ring/50 [&_:where([data-action=first]>span)]:i-lucide-chevrons-left [&_:where([data-action=previous]>span)]:i-lucide-chevron-left [&_:where([data-action=next]>span)]:i-lucide-chevron-right [&_:where([data-action=last]>span)]:i-lucide-chevrons-right [&_:where([data-slot=data-table-pagination-action]>span)]:size-4',
    ].join(' '),
  },
  theme: {
    // Single-knob radius scale: every rounded-* token derives from --radius
    // (0.75rem), so controls land at 12px, panels at 16px, cards and dialogs
    // at 20px, and chat bubbles at 24px. Nested rows stay concentric: an 8px
    // item inside 4px padding meets its 12px container edge exactly.
    radius: {
      DEFAULT: 'var(--radius)',
      xs: 'calc(var(--radius) - 0.5rem)',
      sm: 'calc(var(--radius) - 0.25rem)',
      md: 'var(--radius)',
      lg: 'calc(var(--radius) + 0.25rem)',
      xl: 'calc(var(--radius) + 0.5rem)',
      '2xl': 'calc(var(--radius) + 0.75rem)',
    },
    // Scheme-aware elevation: the values live in the preflight so dark mode
    // deepens shadows without extra utilities. xs rests, lg floats.
    shadow: {
      xs: 'var(--shadow-xs)',
      lg: 'var(--shadow-lg)',
    },
    colors: {
      background: 'var(--background)',
      foreground: 'var(--foreground)',
      card: 'var(--card)',
      'card-foreground': 'var(--card-foreground)',
      popover: 'var(--popover)',
      'popover-foreground': 'var(--popover-foreground)',
      primary: 'var(--primary)',
      'primary-foreground': 'var(--primary-foreground)',
      secondary: 'var(--secondary)',
      'secondary-foreground': 'var(--secondary-foreground)',
      muted: 'var(--muted)',
      'muted-foreground': 'var(--muted-foreground)',
      accent: 'var(--accent)',
      'accent-foreground': 'var(--accent-foreground)',
      danger: 'var(--danger)',
      'danger-foreground': 'var(--danger-foreground)',
      success: 'var(--success)',
      'success-foreground': 'var(--success-foreground)',
      warning: 'var(--warning)',
      'warning-foreground': 'var(--warning-foreground)',
      info: 'var(--info)',
      'info-foreground': 'var(--info-foreground)',
      border: 'var(--border)',
      input: 'var(--input)',
      ring: 'var(--ring)',
    },
    animation: {
      keyframes: {
        'caret-blink': '{0%,70%,100%{opacity:1}20%,50%{opacity:0}}',
        'fade-in': '{from{opacity:0}to{opacity:1}}',
      },
    },
  },
})
