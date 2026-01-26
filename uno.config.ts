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
      getCSS: () => 'button{cursor:pointer}'
    }
  ],
  shortcuts: {
    'site-container': 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
    'panel': 'rounded-xl ring-1 ring-slate-200 bg-white shadow-sm dark:bg-white/5 dark:ring-white/10 dark:shadow-none',
  },
  theme: {
    animation: {
      keyframes: {
        'fade-in': '{from{opacity:0}to{opacity:1}}',
      },
    },
  },
})
