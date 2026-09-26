// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { media } from 'ajo-cloves'

type View = ReturnType<typeof media>

class Query extends EventTarget {
	matches = false

	constructor(readonly media: string) {
		super()
	}

	set(next: boolean) {
		this.matches = next
		this.dispatchEvent(new Event('change'))
	}
}

const installMatchMedia = () => {
	const queries: Query[] = []

	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: vi.fn((query: string) => {
			const item = new Query(query)
			queries.push(item)
			return item as unknown as MediaQueryList
		}),
	})

	return queries
}

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const missing = () => new Error('missing value')

const needHost = (value: Host | null): Host => {
	if (value == null) throw missing()
	return value
}

const needView = (value: View | undefined): View => {
	if (value == null) throw missing()
	return value
}

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	vi.restoreAllMocks()
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	installMatchMedia()
	let view: View | undefined

	function* Gen(this: Host) {
		view = media(this, { query: () => '(min-width: 1px)' })
		needView(view).sync()
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(needView(view))).toEqual(['matches', 'sync'])
})

test('a constant query reacts from setup without sync()', () => {
	const queries = installMatchMedia()

	function* Gen(this: Host) {
		const view = media(this, { query: () => '(prefers-color-scheme: dark)' })

		while (true) yield jsx('span', { children: view.matches ? 'dark' : 'light' })
	}

	render(jsx(Gen, {}), document.body)

	expect(queries).toHaveLength(1)
	expect(document.body.textContent).toBe('light')

	queries[0].set(true)

	expect(document.body.textContent).toBe('dark')
})

test('each host subscribes its own list and stops listening when it returns', () => {
	const queries = installMatchMedia()
	let hostA: Host | null = null
	const renders = { a: 0, b: 0 }

	function* Child(this: Host, args: { name: 'a' | 'b' }) {
		const view = media(this, { query: () => '(min-width: 700px)' })

		while (true) {
			renders[args.name]++
			yield jsx('span', { children: `${args.name}:${view.matches ? '1' : '0'};` })
		}
	}

	function* Gen(this: Host) {
		yield [
			jsx(Child, { key: 'a', name: 'a', ref: (element: unknown) => hostA = element as Host | null }),
			jsx(Child, { key: 'b', name: 'b' }),
		]
	}

	render(jsx(Gen, {}), document.body)

	expect(queries).toHaveLength(2)
	expect(document.body.textContent).toBe('a:0;b:0;')

	queries[0].set(true)
	queries[1].set(true)

	expect(document.body.textContent).toBe('a:1;b:1;')

	needHost(hostA).return()
	queries[0].set(false)
	queries[1].set(false)

	expect(renders).toEqual({ a: 2, b: 3 })
})

test('sync retargets a changed query string and old query changes no longer invalidate', () => {
	const queries = installMatchMedia()
	let host: Host | null = null
	let view: View | undefined
	let query = '(min-width: 700px)'
	let renders = 0

	function* Gen(this: Host) {
		view = media(this, { query: () => query })

		while (true) {
			needView(view).sync()
			renders++
			yield jsx('span', { children: needView(view).matches ? 'yes' : 'no' })
		}
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	expect(document.body.textContent).toBe('no')
	expect(queries).toHaveLength(1)

	query = '(min-width: 900px)'
	needHost(host).next()

	expect(queries).toHaveLength(2)

	queries[0].set(true)

	expect(document.body.textContent).toBe('no')
	expect(renders).toBe(2)

	queries[1].set(true)

	expect(document.body.textContent).toBe('yes')
	expect(renders).toBe(3)
})

test('reset recreates a fresh subscription', () => {
	const queries = installMatchMedia()
	let host: Host | null = null
	let created = 0

	function* Gen(this: Host) {
		created++
		const view = media(this, { query: () => '(orientation: portrait)' })

		while (true) {
			view.sync()
			yield jsx('span', { children: view.matches ? 'portrait' : 'landscape' })
		}
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	queries[0].set(true)
	expect(document.body.textContent).toBe('portrait')

	needHost(host).return()
	needHost(host).next()

	expect(created).toBe(2)
	expect(queries).toHaveLength(2)
	expect(document.body.textContent).toBe('landscape')

	queries[1].set(true)
	expect(document.body.textContent).toBe('portrait')
})

test('SSR does not match and does not evaluate the query', () => {
	function* Gen(this: Host) {
		const view = media(this, {
			query: () => {
				throw new Error('query should not run on the server')
			},
		})

		view.sync()
		yield jsx('span', { children: view.matches ? 'yes' : 'no' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>no</span></div>')
})
