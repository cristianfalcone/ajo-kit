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

const hmr = (pattern: RegExp): Plugin => ({
  name: 'ajo-hmr',
  apply: 'serve',
  transform(code, id) {
    if (!pattern.test(id)) return null
    const path = '/' + id.replace(/^.*?(src\/)/, '$1')
    return {
      code: code + `\nif(import.meta.hot)import.meta.hot.accept(module=>module&&((globalThis.__MODULES__??=new Map).set(${JSON.stringify(path)},module),globalThis.__HMR__?.()))`,
      map: null
    }
  }
})

export default defineConfig({
  plugins: [
    serverOnly(/(handler|wares)\.[jt]sx?$/),
    hmr(/(page|layout)\.[jt]sx?$/),
    unocss(),
  ],
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import { h, Fragment } from 'ajo'`,
  }
})
