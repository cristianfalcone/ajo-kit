import { defineConfig } from 'vite'
import unocss from 'unocss/vite'

export default defineConfig({
  plugins: [
    unocss(),
  ],
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import { h, Fragment } from 'ajo'`,
  }
})
