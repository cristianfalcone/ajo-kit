import 'virtual:uno.css'
import { render } from 'ajo'
import App, { cache, type State } from '/src/app'

const ssr = (globalThis as { __SSR__?: State }).__SSR__

if (ssr) cache.set(ssr.url, ssr)

const root = document.getElementById('root')

if (root) render(<App />, root)

if (import.meta.hot) {

  const HMR = Symbol.for('ajo.hmr')
  const Generator = Symbol.for('ajo.generator')
  const Iterator = Symbol.for('ajo.iterator')
  const Memo = Symbol.for('ajo.memo')

  type HMRElement = Element & {
    [Generator]?: { [HMR]?: string }
    [Iterator]?: unknown
    [Memo]?: unknown
  }

  const clear = (el: HMRElement): void => {
    delete el[Memo]
    Array.from(el.children).forEach(clear)
  }

  const walk = (el: HMRElement, path?: string): void => {

    if (el[Generator]?.[HMR] === path || (!path && el[Generator])) {
      el[Iterator] = null
      delete el[Generator]
      clear(el)
    }

    Array.from(el.children).forEach(child => walk(child, path))
  }

  (globalThis as { __HMR__?: (path?: string) => void }).__HMR__ = path => {
    if (root) walk(root, path)
    dispatchEvent(new CustomEvent('hmr'))
  }
}
