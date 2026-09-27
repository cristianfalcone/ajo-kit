import { readFileSync } from 'node:fs'
import { definePreset, presetIcons, presetWind4 } from 'unocss'
import { icons as lucide } from '@iconify-json/lucide'
import { actions } from './preset/actions'
import { choices } from './preset/choices'
import { data } from './preset/data'
import { fields } from './preset/fields'
import { floating } from './preset/floating'
import { modal } from './preset/modal'
import { navigation } from './preset/navigation'
import { pickers } from './preset/pickers'
import { surfaces } from './preset/surfaces'

// The tokens are a plain stylesheet that apps without UnoCSS import too; the
// preset emits them, without comments or layout whitespace, as its first
// preflight. The package build copies the file beside the built module;
// `@vite-ignore` keeps that build from inlining it as a data URL.
const tokens = readFileSync(new URL(/* @vite-ignore */ './tokens.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s*([{};,])\s*|(:)\s+/g, '$1$2')
  .replace(/;}/g, '}')
  .trim()

// Wind4's box-shadow slots, with fallbacks for pages where no shadow utility
// registered them: a material fills its own slots and rings still stack.
const shadowSlots = 'var(--un-inset-shadow,0 0 #0000),var(--un-inset-ring-shadow,0 0 #0000),var(--un-ring-offset-shadow,0 0 #0000),var(--un-ring-shadow,0 0 #0000),var(--un-shadow,0 0 #0000)'

// Edge fades for scroll-fade-x and the [data-overflow-*] stamps: one gradient per faded edge set.
const fadeStops = {
  start: 'transparent,black 1rem',
  end: 'black calc(100% - 1rem),transparent',
  both: 'transparent,black 1rem,black calc(100% - 1rem),transparent',
}
const fade = (side: 'bottom' | 'right', edges: keyof typeof fadeStops) => `linear-gradient(to ${side},${fadeStops[edges]})`
const overflowFades = ([['x', 'right'], ['y', 'bottom']] as const).flatMap(([axis, side]) =>
  (['start', 'end', 'both'] as const).map(edges =>
    `[data-overflow-${axis}=${edges}]{-webkit-mask-image:${fade(side, edges)};mask-image:${fade(side, edges)}}`)).join('')

/**
 * Returns Playa's complete build-time UnoCSS preset.
 * The host must activate its matching UnoCSS plugin and load `virtual:uno.css`.
 */
export const playa = definePreset(() => ({
  name: 'ajo-ui-playa',
  presets: [
    presetWind4(),
    presetIcons({
      collections: {
        lucide: () => lucide,
      },
      // Masked icons paint on their own box; without a display an empty
      // inline span collapses to zero width and the icon vanishes anywhere
      // outside a flex parent.
      extraProperties: { display: 'inline-block' },
    }),
    // Family shortcuts and rules, one module per lane; the shared ones stay below.
    actions,
    fields,
    choices,
    pickers,
    floating,
    modal,
    surfaces,
    data,
    navigation,
  ],
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
      '-webkit-mask-image': fade('right', 'both'),
      'mask-image': fade('right', 'both'),
    }],
    // The one metal: brushed champagne under a specular top and a bronze
    // hairline, with a small tight shadow, all in Wind4's shadow slots.
    ['gilt-plate', {
      'background-color': 'var(--primary)',
      'background-image': 'var(--brush),var(--gilt-plate)',
      'background-blend-mode': 'soft-light,normal',
      color: 'var(--primary-foreground)',
      '--un-inset-shadow': 'var(--gilt-plate-edge)',
      '--un-shadow': 'var(--gilt-plate-shadow)',
      'box-shadow': shadowSlots,
    }],
    // Frost: persistent bars over the page, and floating layers above it.
    ['glass-chrome', {
      'background-color': 'var(--glass-chrome)',
      color: 'var(--card-foreground)',
      '-webkit-backdrop-filter': 'var(--glass-filter)',
      'backdrop-filter': 'var(--glass-filter)',
    }],
    ['glass-overlay', {
      'background-color': 'var(--glass-overlay)',
      color: 'var(--popover-foreground)',
      '-webkit-backdrop-filter': 'var(--glass-filter)',
      'backdrop-filter': 'var(--glass-filter)',
    }],
    ['scrollbar-gutter-stable', { 'scrollbar-gutter': 'stable' }],
    ['scrollbar-none', { 'scrollbar-width': 'none' }],
    // Working text that sweeps; it carries its own keyframes, and without
    // them under reduced motion it stays a still gradient.
    ['shimmer', [{
      '-webkit-background-clip': 'text',
      animation: 'shimmer 1.8s linear infinite',
      background: 'linear-gradient(90deg,var(--foreground) 0%,var(--muted-foreground) 35%,var(--foreground) 70%)',
      'background-clip': 'text',
      'background-size': '200% 100%',
      color: 'transparent',
    }, '@media (prefers-reduced-motion:no-preference){@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}}']],
    ['animate-in', {
      '--un-enter-opacity': '1',
      '--un-enter-scale': '1',
      '--un-enter-translate-x': '0',
      '--un-enter-translate-y': '0',
      'animation-duration': 'var(--un-animate-duration,150ms)',
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
        tokens,
        // Selection in gold, readable over both suits.
        '::selection{background-color:color-mix(in oklab,var(--gold-4) 35%,transparent)}',
        // The default focus ring, for anything a family does not ring itself.
        ':where(:focus-visible){outline:var(--focus-width) solid var(--ring);outline-offset:0}',
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
        '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.glass.glass,.glass-chrome.glass-chrome{background-color:var(--card)}.glass-overlay.glass-overlay{background-color:var(--popover)}}',
        '@keyframes enter{from{opacity:var(--un-enter-opacity,1);transform:translate3d(var(--un-enter-translate-x,0),var(--un-enter-translate-y,0),0) scale3d(var(--un-enter-scale,1),var(--un-enter-scale,1),var(--un-enter-scale,1))}}',
        '@keyframes exit{to{opacity:var(--un-exit-opacity,1);transform:translate3d(var(--un-exit-translate-x,0),var(--un-exit-translate-y,0),0) scale3d(var(--un-exit-scale,1),var(--un-exit-scale,1),var(--un-exit-scale,1))}}',
        '*,::before,::after{border-color:var(--border)}',
        // Edge fades pair with ajo-cloves overflow stamps. They activate only
        // while content overflows, so a resting edge never stays dimmed.
        overflowFades,
        '.scrollbar-none::-webkit-scrollbar{display:none}',
        // Discreet themed scrollbar for scrollable lists and viewports. Chromium and
        // Safari take the fully custom webkit path (buttonless); Firefox gets the
        // standard thin scrollbar via the `@supports` fallback below. Unframed
        // scroll owners retain an inset thumb so rounded popup roots stay safe.
        // ScrollAreaFrame viewports opt into the full-width `scrollbar-framed`
        // override; their hard clip contains paint without shrinking the handle.
        '.scrollbar-soft::-webkit-scrollbar{height:.625rem;width:.625rem}',
        '.scrollbar-soft::-webkit-scrollbar-button{display:none}',
        '.scrollbar-soft::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:9999px;background-clip:padding-box;background-color:var(--border)}',
        '.scrollbar-framed::-webkit-scrollbar-thumb{border:0;background-clip:border-box}',
        '.scrollbar-soft::-webkit-scrollbar-track{background-color:transparent}',
        '@supports not selector(::-webkit-scrollbar){.scrollbar-soft{scrollbar-color:var(--border) transparent;scrollbar-width:thin}}',
        'button{cursor:pointer}',
        'input:focus,select:focus,textarea:focus{outline:none}',
      ].join('')
    }
  ],
  shortcuts: {
    // Hairline inner border drawn with an inset ring: crisper than `border`
    // over stacked translucent surfaces and composes with ring/shadow slots.
    edge: 'inset-ring inset-ring-border',
    'edge-input': 'inset-ring inset-ring-input',
    // Enamel: a flat surface fill with a hairline, never a bevel.
    panel: 'bg-card text-card-foreground edge',
    // Resting translucent panels; frost for bars and floating layers is the
    // glass-chrome and glass-overlay rules. Content layered on these surfaces
    // stays solid or tint-only: glass never stacks on glass.
    glass: 'bg-card/60 text-card-foreground backdrop-blur-md backdrop-saturate-150',
    // The carpet under code, logs and dense data: tokens inside resolve dark.
    navy: [{ 'background-color': 'var(--navy)', color: 'var(--foreground)', 'color-scheme': 'dark' }, 'edge'],
    // Behind modal layers: a tinted, blurred page.
    scrim: 'backdrop:bg-[var(--scrim)] backdrop:[backdrop-filter:var(--scrim-filter)]',
    // Form-field chrome shared by inputs, textareas, select triggers and grouped fields.
    'playa-field': 'rounded-md edge-input bg-transparent transition-[color,box-shadow] outline-none focus-visible:inset-ring-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:inset-ring-danger aria-invalid:ring-danger/20',
  },
  // Wind4's theme merges after this preset's own `theme`, so every key Wind4
  // also defines (radius, shadow, font) is set here instead.
  extendTheme: base => {
    const theme = base as Record<string, Record<string, string>>
    // Single-knob radius scale: every rounded-* token derives from --radius
    // (0.75rem), so controls land at 12px, panels at 16px, cards and dialogs
    // at 20px, and chat bubbles at 24px. Nested rows stay concentric: an 8px
    // item inside 4px padding meets its 12px container edge exactly.
    theme.radius = {
      ...theme.radius,
      DEFAULT: 'var(--radius)',
      xs: 'calc(var(--radius) - 0.5rem)',
      sm: 'calc(var(--radius) - 0.25rem)',
      md: 'var(--radius)',
      lg: 'calc(var(--radius) + 0.25rem)',
      xl: 'calc(var(--radius) + 0.5rem)',
      '2xl': 'calc(var(--radius) + 0.75rem)',
    }
    // Scheme-aware elevation from the tokens: xs rests, lg floats, xl is modal.
    theme.shadow = { ...theme.shadow, xs: 'var(--shadow-xs)', lg: 'var(--shadow-lg)', xl: 'var(--shadow-xl)' }
    // DM Sans is the interface, JetBrains Mono is data, and `font-title` is
    // the one Fraunces line on a page.
    theme.font = { ...theme.font, sans: 'var(--font-body)', mono: 'var(--font-data)', title: 'var(--font-display)' }
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
      'faint-foreground': 'var(--faint-foreground)',
      accent: 'var(--accent)',
      'accent-foreground': 'var(--accent-foreground)',
      link: 'var(--link)',
      'gold-text': 'var(--gold-text)',
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
}))
