import { defineConfig } from 'unocss'
import presetWind4 from '@unocss/preset-wind4'
import presetIcons from '@unocss/preset-icons'
import { icons as lucide } from '@iconify-json/lucide'

const icons = [
  'i-lucide-alert-circle',
  'i-lucide-alert-triangle',
  'i-lucide-check',
  'i-lucide-check-circle',
  'i-lucide-chevron-left',
  'i-lucide-chevron-right',
  'i-lucide-code',
  'i-lucide-home',
  'i-lucide-key',
  'i-lucide-layout-dashboard',
  'i-lucide-log-out',
  'i-lucide-mail',
  'i-lucide-message-circle',
  'i-lucide-monitor',
  'i-lucide-moon',
  'i-lucide-more-vertical',
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
  preflights: [
    {
      getCSS: () => [
        'button{cursor:pointer}',
        'input:focus,select:focus,textarea:focus{outline:none}',
      ].join('')
    }
  ],
  shortcuts: {
    'site-container': 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
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
