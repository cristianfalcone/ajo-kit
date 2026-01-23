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

    const HMR = `Symbol.for('ajo.hmr')`
    const path = '/' + id.replace(/^.*?(src\/)/, '$1')

    const tagged = code.match(/export\s+default\s+(\w+)\s*[\n;]/)
      ? code.replace(/export\s+default\s+(\w+)/, `export default $1;$1[${HMR}]=${JSON.stringify(path)}`)
      : code

    const accept = `
if(import.meta.hot)import.meta.hot.accept(m=>{
  if(m?.default)m.default[${HMR}]=${JSON.stringify(path)};
  if(m)(globalThis.__MODULES__??=new Map).set(${JSON.stringify(path)},m),globalThis.__HMR__?.(${JSON.stringify(path)});
})`

    return { code: tagged + accept, map: null }
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
