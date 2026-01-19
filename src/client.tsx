import 'virtual:uno.css'
import { render } from 'ajo'
import App, { cache, type Data } from '/src/app'

const ssr = (globalThis as { __SSR__?: Data }).__SSR__

if (ssr) cache.set(ssr.url, ssr)

const root = document.getElementById('root')

if (root) render(<App />, root)
