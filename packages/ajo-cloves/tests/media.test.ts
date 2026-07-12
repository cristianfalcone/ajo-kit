// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { media } from 'ajo-cloves'

type View = ReturnType<typeof media>

class Query extends EventTarget {
	adds = 0
	matches = false
	removes = 0

	constructor(readonly media: string) {
		super()
	}

	addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
		if (type === 'change') this.adds++
		super.addEventListener(type, listener, options)
	}

	removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void {
		if (type === 'change') this.removes++
		super.removeEventListener(type, listener, options)
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
		view = media(this, () => '(min-width: 1px)')
		needView(view).sync()
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(needView(view))).toEqual(['matches', 'sync'])
})

test('two hosts share one MediaQueryList and stop it after the last unsubscribe', () => {
	const queries = installMatchMedia()
	let hostA: Host | null = null
	let hostB: Host | null = null

	function* Child(this: Host, args: { name: string }) {
		const view = media(this, () => '(min-width: 700px)')

		while (true) {
			view.sync()
			yield jsx('span', { children: `${args.name}:${view.matches ? '1' : '0'};` })
		}
	}

	function* Gen(this: Host) {
		yield [
			jsx(Child, { key: 'a', name: 'a', ref: (element: unknown) => hostA = element as Host | null }),
			jsx(Child, { key: 'b', name: 'b', ref: (element: unknown) => hostB = element as Host | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	expect(window.matchMedia).toHaveBeenCalledTimes(1)
	expect(queries[0].adds).toBe(1)
	expect(document.body.textContent).toBe('a:0;b:0;')

	queries[0].set(true)

	expect(document.body.textContent).toBe('a:1;b:1;')

	needHost(hostA).return()
	queries[0].set(false)

	expect(document.body.textContent).toBe('a:1;b:0;')
	expect(queries[0].removes).toBe(0)

	needHost(hostB).return()

	expect(queries[0].removes).toBe(1)
})

test('sync retargets a changed query string and old query changes no longer invalidate', () => {
	const queries = installMatchMedia()
	let host: Host | null = null
	let view: View | undefined
	let query = '(min-width: 700px)'
	let renders = 0

	function* Gen(this: Host) {
		view = media(this, () => query)

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
	expect(queries[0].removes).toBe(1)

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
		const view = media(this, () => '(orientation: portrait)')

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

test('SSR uses fallback and does not evaluate the query', () => {
	function* Gen(this: Host) {
		const view = media(this, () => {
			throw new Error('query should not run on the server')
		}, {
			fallback: () => true,
		})

		view.sync()
		yield jsx('span', { children: view.matches ? 'yes' : 'no' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>yes</span></div>')
})
