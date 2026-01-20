import { defineConfig, type Plugin } from 'vite'
import unocss from 'unocss/vite'

const serverOnly = (pattern: RegExp): Plugin => ({
  name: 'server-only',
  load(id) {
    if (pattern.test(id) && this.environment.name === 'client') {
      throw new Error(`Cannot import server module into client code: ${id.replace(/^.*\/src\//, '')}`)
    }
  }
})

export default defineConfig({
  plugins: [
    serverOnly(/(handler|wares)\.[jt]sx?$/),
    unocss(),
  ],
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import { h, Fragment } from 'ajo'`,
  }
})
