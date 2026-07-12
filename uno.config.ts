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
    ['scrollbar-gutter-stable', { 'scrollbar-gutter': 'stable' }],
    ['scrollbar-none', { 'scrollbar-width': 'none' }],
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
        ':root{--radius:0.625rem;--background:#f3f0e9;--foreground:#1b3c53;--card:#fefdfb;--card-foreground:#1b3c53;--popover:#fefdfb;--popover-foreground:#1b3c53;--primary:#234c6a;--primary-foreground:#f5fafc;--secondary:#dce7ec;--secondary-foreground:#1b3c53;--muted:#e9e6dc;--muted-foreground:#54687c;--accent:rgb(35 76 106 / 0.09);--accent-foreground:#1b3c53;--danger:#a94b4c;--danger-foreground:#fcf6f3;--success:#5f7238;--success-foreground:#f7faf0;--warning:#96650c;--warning-foreground:#fff9ec;--info:#276e7e;--info-foreground:#f0fafb;--border:rgb(27 60 83 / 0.14);--input:rgb(27 60 83 / 0.26);--ring:#3596ac}',
        '.dark{--background:#0f2334;--foreground:#eae4da;--card:#1b3c53;--card-foreground:#eae4da;--popover:#204359;--popover-foreground:#eae4da;--primary:#d2c1b6;--primary-foreground:#1b3c53;--secondary:#234c6a;--secondary-foreground:#eae4da;--muted:#173349;--muted-foreground:#9fb3c1;--accent:rgb(210 193 182 / 0.12);--accent-foreground:#f0ebe2;--danger:#d98e85;--danger-foreground:#0f2334;--success:#9db36a;--success-foreground:#0f2334;--warning:#fcb53b;--warning-foreground:#0f2334;--info:#6cc3d5;--info-foreground:#0f2334;--border:rgb(210 193 182 / 0.16);--input:rgb(210 193 182 / 0.26);--ring:#6cc3d5}',
        '@keyframes progress-slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}',
        '@keyframes enter{from{opacity:var(--un-enter-opacity,1);transform:translate3d(var(--un-enter-translate-x,0),var(--un-enter-translate-y,0),0) scale3d(var(--un-enter-scale,1),var(--un-enter-scale,1),var(--un-enter-scale,1))}}',
        '@keyframes exit{to{opacity:var(--un-exit-opacity,1);transform:translate3d(var(--un-exit-translate-x,0),var(--un-exit-translate-y,0),0) scale3d(var(--un-exit-scale,1),var(--un-exit-scale,1),var(--un-exit-scale,1))}}',
        '*,::before,::after{border-color:var(--border)}',
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
    // Near-solid glass surfaces: cards/panels and floating overlays.
    glass: 'bg-card/80 text-card-foreground backdrop-blur-md',
    'glass-overlay': 'bg-popover/90 text-popover-foreground backdrop-blur-xl',
    // Discreet themed scrollbar for scrollable lists and viewports. Chromium and
    // Safari take the fully custom webkit path (buttonless); Firefox gets the
    // standard thin scrollbar via the preflight `@supports` fallback below.
    'scrollbar-soft': '[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent',
  },
  theme: {
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
