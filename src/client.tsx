import 'virtual:uno.css'
import { render } from 'ajo'
import App, { cache, type Cache } from '/src/app'

const ssr = (globalThis as { __SSR__?: Cache }).__SSR__

if (ssr) cache.set(ssr.url, ssr)

const root = document.getElementById('root')

if (root) render(<App />, root)
