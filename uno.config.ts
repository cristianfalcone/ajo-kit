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
        '@supports not selector(::-webkit-scrollbar){.scrollbar-soft{scrollbar-color:var(--border) transparent;scrollbar-width:thin}}',
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
    'scrollbar-soft': '[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent',
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
