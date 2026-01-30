import { defineConfig } from 'unocss'
import presetWind4 from '@unocss/preset-wind4'
import presetIcons from '@unocss/preset-icons'

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons(),
  ],
  preflights: [
    {
      getCSS: () => [
        'button{cursor:pointer}',
        'input:focus,select:focus,textarea:focus{outline:none}',
        'thead{background:oklch(from #1f3255 l c h / 10%)}',
        'th{padding:.75rem 1rem;text-align:left;font-weight:500;font-size:.875rem;color:oklch(44.6% 0.043 257.281)}',
        'tbody tr{background:oklch(98.5% 0.002 247.858)}',
        'tbody tr:hover{background:oklch(96% 0.007 255)!important}',
        '.dark tbody tr{background:transparent}',
        '.dark thead{background:oklch(37.2% 0.044 257.287 / 50%)}',
        '.dark th{color:oklch(86.9% 0.022 252.894)}',
        '.dark tbody tr:hover{background:oklch(100% 0 0 / 8%)!important}',
      ].join('')
    }
  ],
  shortcuts: {
    'site-container': 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
    'panel': 'rounded-xl ring-1 ring-border bg-white shadow-sm dark:bg-white/5 dark:ring-white/10 dark:shadow-none',
    'glass': 'bg-gradient-to-br from-slate-100/80 via-slate-50/60 to-slate-100/70 backdrop-blur ring-1 ring-slate-200/50 dark:from-white/10 dark:via-white/5 dark:to-white/8 dark:ring-white/10',
    'input': 'px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-accent focus:border-transparent',
    'btn': 'py-2 px-4 bg-primary hover:bg-primary/85 disabled:bg-primary/60 dark:bg-accent dark:hover:bg-accent/85 dark:disabled:bg-accent/60 dark:text-primary text-white text-sm font-medium rounded-lg transition',
    'btn-danger': 'py-2 px-4 bg-red-600 hover:bg-red-500 disabled:bg-red-400 text-white font-medium rounded-lg transition',
  },
  theme: {
    colors: {
      primary: '#1f3255',
      accent: '#39a3e1',
      muted: '#8c8c8c',
      border: '#e1e1e1',
    },
    animation: {
      keyframes: {
        'fade-in': '{from{opacity:0}to{opacity:1}}',
      },
    },
  },
})
