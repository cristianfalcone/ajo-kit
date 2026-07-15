import { playa } from 'ajo-ui-playa'
import { defineConfig } from 'unocss'

export default defineConfig({
  presets: [playa()],
  shortcuts: {
    'site-container': 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
  },
})
