import 'virtual:uno.css'
import { render } from 'ajo'
import { type Params } from 'navaid'
import App, { set } from '/src/app'

interface SSR {
	url: string
	params: Params
	page: Record<string, unknown>
	layout: Record<string, unknown>[]
}

const ssr = (globalThis as { __SSR__?: SSR }).__SSR__

if (ssr) set(ssr)

const root = document.getElementById('root')

if (root) render(<App />, root)
