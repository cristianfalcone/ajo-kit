import 'virtual:uno.css'
import { render } from 'ajo'
import App, { cache, type State } from '/src/app'

const ssr = (globalThis as { __SSR__?: State }).__SSR__

if (ssr) cache.set(ssr.url, ssr)

const root = document.getElementById('root')

if (root) render(<App />, root)

if (import.meta.hot) (globalThis as { __HMR__?: () => void }).__HMR__ = () => dispatchEvent(new PopStateEvent('popstate'))
