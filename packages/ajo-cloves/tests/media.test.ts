// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { media } from 'ajo-cloves'
import { mount, must, serve } from './harness'

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

test('a constant query reacts from setup without sync()', () => {
	const queries = installMatchMedia()

	mount(host => media(host, { query: () => '(prefers-color-scheme: dark)' }), view => view.matches ? 'dark' : 'light')

	expect(queries).toHaveLength(1)
	expect(document.body.textContent).toBe('light')

	queries[0].set(true)

	expect(document.body.textContent).toBe('dark')
})

test('each host subscribes its own list and stops listening when it returns', () => {
	const queries = installMatchMedia()
	let hostA = null as Host | null
	const renders = { a: 0, b: 0 }

	function* Child(this: Host, args: { name: 'a' | 'b' }) {
		const view = media(this, { query: () => '(min-width: 700px)' })

		while (true) {
			renders[args.name]++
			yield `${args.name}:${view.matches ? '1' : '0'};`
		}
	}

	render([
		jsx(Child, { key: 'a', name: 'a', ref: (element: unknown) => hostA = element as Host | null }),
		jsx(Child, { key: 'b', name: 'b' }),
	], document.body)

	expect(queries).toHaveLength(2)
	expect(document.body.textContent).toBe('a:0;b:0;')

	queries[0].set(true)
	queries[1].set(true)

	expect(document.body.textContent).toBe('a:1;b:1;')

	must(hostA).return()
	queries[0].set(false)
	queries[1].set(false)

	expect(renders).toEqual({ a: 2, b: 3 })
})

test('sync retargets a changed query string and old query changes no longer invalidate', () => {
	const queries = installMatchMedia()
	let query = '(min-width: 700px)'
	let renders = 0

	const { host } = mount(host => media(host, { query: () => query }), view => {
		view.sync()
		renders++
		return view.matches ? 'yes' : 'no'
	})

	expect(document.body.textContent).toBe('no')
	expect(queries).toHaveLength(1)

	query = '(min-width: 900px)'
	host.next()

	expect(queries).toHaveLength(2)

	queries[0].set(true)

	expect(document.body.textContent).toBe('no')
	expect(renders).toBe(2)

	queries[1].set(true)

	expect(document.body.textContent).toBe('yes')
	expect(renders).toBe(3)
})

test('SSR does not match and does not evaluate the query', () => {
	expect(serve(host => media(host, {
		query: () => {
			throw new Error('query should not run on the server')
		},
	}), view => {
		view.sync()
		return view.matches ? 'yes' : 'no'
	})).toBe('<div>no</div>')
})
