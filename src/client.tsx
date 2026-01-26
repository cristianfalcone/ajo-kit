import 'virtual:uno.css'
import { render } from 'ajo'
import App, { ssr, cache } from '/src/app'
import type { State, Entry } from '/src/constants'
import type { Head } from '/src/head'
import { unpack } from '/src/constants'

type SSR = State & { keys?: string[]; sums?: string[] }

const packed = (globalThis as { __SSR__?: string }).__SSR__
const data = packed ? unpack(packed) as SSR : undefined

if (data) {

	ssr.set(data.url, data)

	// Populate cache for hash-based navigation optimization

	if (data.keys && data.sums) {

		const values = [data.head, ...data.data] as (Head | Entry)[]

		data.keys.forEach((key, i) => {
			if (values[i]) cache.set(key, { value: values[i], sum: data.sums![i] })
		})
	}
}

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
