// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { id } from 'ajo-cloves'

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

test('shape is a plain id factory', () => {
	expect(typeof id).toBe('function')
	expect(id.length).toBe(1)
})

test('reacts with monotonic independent prefixes', () => {
	expect(id('clove-id-a')).toBe('clove-id-a-1')
	expect(id('clove-id-a')).toBe('clove-id-a-2')
	expect(id('clove-id-b')).toBe('clove-id-b-1')
	expect(id('clove-id-a')).toBe('clove-id-a-3')
})

test('invalidate keeps a stable setup id while host.next re-renders', () => {
	let host: Host | null = null
	let count = 0

	function* Gen(this: Host) {
		const value = id('clove-id-invalidate')

		while (true) yield jsx('span', { children: `${value}:${count}` })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	expect(document.body.textContent).toBe('clove-id-invalidate-1:0')

	must(host).next(() => count = 1)

	expect(document.body.textContent).toBe('clove-id-invalidate-1:1')
})

test('teardown leaves generated ids as inert strings', () => {
	let value = ''

	function* Gen(this: Host) {
		value = id('clove-id-teardown')
		yield jsx('span', { children: value })
	}

	render(jsx(Gen, {}), document.body)
	render(null, document.body)

	expect(value).toBe('clove-id-teardown-1')
	expect(document.body.textContent).toBe('')
})

test('reset recreates setup and gets the next deterministic id', () => {
	let host: Host | null = null

	function* Gen(this: Host) {
		const value = id('clove-id-reset')

		while (true) yield jsx('span', { children: value })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	expect(document.body.textContent).toBe('clove-id-reset-1')

	must(host).return()
	must(host).next()

	expect(document.body.textContent).toBe('clove-id-reset-2')
})

test('SSR renders ids without DOM lifecycle work', () => {
	function* Gen(this: Host) {
		const value = id('clove-id-ssr')

		yield jsx('span', { children: value })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>clove-id-ssr-1</span></div>')
})
