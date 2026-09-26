// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { beforeEach, expect, test } from 'vitest'
import { visibility } from 'ajo-cloves'
import { must, serve } from './harness'

const state = (value: DocumentVisibilityState) => {
	Object.defineProperty(document, 'visibilityState', { configurable: true, value })
	document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
	Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
})

test('each host listens until it returns', () => {
	let hostA = null as Host | null
	const renders = { a: 0, b: 0 }

	function* Child(this: Host, args: { name: 'a' | 'b' }) {
		const view = visibility(this)

		while (true) {
			renders[args.name]++
			yield `${args.name}:${view.visible ? 'visible' : 'hidden'};`
		}
	}

	render([
		jsx(Child, { key: 'a', name: 'a', ref: (element: unknown) => hostA = element as Host | null }),
		jsx(Child, { key: 'b', name: 'b' }),
	], document.body)

	expect(document.body.textContent).toBe('a:visible;b:visible;')

	state('hidden')

	expect(document.body.textContent).toBe('a:hidden;b:hidden;')

	must(hostA).return()
	state('visible')

	expect(document.body.textContent).toBe('a:hidden;b:visible;')
	expect(renders).toEqual({ a: 2, b: 3 })
})

test('SSR is visible by default', () => {
	expect(serve(visibility, view => view.visible ? 'visible' : 'hidden')).toBe('<div>visible</div>')
})
