// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { shared } from 'ajo-cloves'

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const must = (value: Host | null): Host => {
	if (value == null) throw new Error('missing value')
	return value
}

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	document.body.textContent = ''
})

test('subscribers share one source until the last host aborts, then restart after empty', () => {
	const key = 'shared-contract'
	const calls: string[] = []
	let hostA: Host | null = null
	let hostB: Host | null = null
	let notify: () => void = () => {}
	const stop = vi.fn()
	const start = vi.fn((next: () => void) => {
		notify = next
		return stop
	})

	function* Child(this: Host, args: { name: string }) {
		shared(key, start, () => calls.push(args.name), this.signal)
		yield jsx('span', { children: args.name })
	}

	function* Gen(this: Host) {
		yield [
			jsx(Child, { key: 'a', name: 'a', ref: (element: unknown) => hostA = element as Host | null }),
			jsx(Child, { key: 'b', name: 'b', ref: (element: unknown) => hostB = element as Host | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	expect(start).toHaveBeenCalledTimes(1)

	notify()
	expect(calls).toEqual(['a', 'b'])

	must(hostA).return()
	notify()

	expect(calls).toEqual(['a', 'b', 'b'])
	expect(stop).not.toHaveBeenCalled()

	must(hostB).return()
	notify()

	expect(calls).toEqual(['a', 'b', 'b'])
	expect(stop).toHaveBeenCalledTimes(1)

	render(null, document.body)
	render(jsx(Gen, {}), document.body)

	expect(start).toHaveBeenCalledTimes(2)

	notify()
	expect(calls).toEqual(['a', 'b', 'b', 'a', 'b'])
})

test('an already-aborted host signal never joins or starts the source', () => {
	const key = 'shared-aborted'
	let host: Host | null = null
	const fn = vi.fn()
	const start = vi.fn(() => () => {})

	function* Gen(this: Host) {
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	must(host).return()
	shared(key, start, fn, must(host).signal)

	expect(start).not.toHaveBeenCalled()
	expect(fn).not.toHaveBeenCalled()
})
