// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { scheme } from 'ajo-cloves'

type View = ReturnType<typeof scheme>

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
		view = scheme(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(needView(view))).toEqual(['dark'])
})

test('two hosts share the preferred-dark media source', () => {
	const queries = installMatchMedia()
	let hostA: Host | null = null
	let hostB: Host | null = null

	function* Child(this: Host, args: { name: string }) {
		const view = scheme(this)

		while (true) yield jsx('span', { children: `${args.name}:${view.dark ? 'dark' : 'light'};` })
	}

	function* Gen(this: Host) {
		yield [
			jsx(Child, { key: 'a', name: 'a', ref: (element: unknown) => hostA = element as Host | null }),
			jsx(Child, { key: 'b', name: 'b', ref: (element: unknown) => hostB = element as Host | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	expect(window.matchMedia).toHaveBeenCalledTimes(1)
	expect(queries[0].media).toBe('(prefers-color-scheme: dark)')
	expect(document.body.textContent).toBe('a:light;b:light;')

	queries[0].set(true)

	expect(document.body.textContent).toBe('a:dark;b:dark;')

	needHost(hostA).return()
	needHost(hostB).return()

	expect(queries[0].removes).toBe(1)
})

test('reset recreates a fresh preferred-dark subscription', () => {
	const queries = installMatchMedia()
	let host: Host | null = null
	let created = 0

	function* Gen(this: Host) {
		created++
		const view = scheme(this)

		while (true) yield jsx('span', { children: view.dark ? 'dark' : 'light' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	queries[0].set(true)
	expect(document.body.textContent).toBe('dark')

	needHost(host).return()
	needHost(host).next()

	expect(created).toBe(2)
	expect(queries).toHaveLength(2)
	expect(document.body.textContent).toBe('light')
})

test('SSR is deterministically light', () => {
	function* Gen(this: Host) {
		const view = scheme(this)
		yield jsx('span', { children: view.dark ? 'dark' : 'light' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>light</span></div>')
})
