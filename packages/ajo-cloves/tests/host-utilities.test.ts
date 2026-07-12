// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { callHandler, callRef, dom, listen, statefulRootAttrs } from '../src'

const must = (value: Host | null): Host => {
	if (value == null) throw new Error('missing host')
	return value
}

const mount = (handler: () => void, signal?: AbortSignal) => {
	let host: Host | null = null

	function* Gen(this: Host) {
		listen(this, 'click', handler, signal ? { signal } : undefined)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)
	return () => must(host)
}

beforeEach(() => document.body.textContent = '')

afterEach(() => {
	render(null, document.body)
	document.body.textContent = ''
})

test('statefulRootAttrs keeps host protocol args and prefixes DOM attrs', () => {
	const ref = () => undefined
	expect(statefulRootAttrs({
		class: 'root',
		id: 'example',
		key: 'key',
		memo: 1,
		ref,
		skip: true,
		'set:onclick': ref,
	})).toEqual({
		'attr:class': 'root',
		'attr:id': 'example',
		key: 'key',
		memo: 1,
		ref,
		skip: true,
		'set:onclick': ref,
	})
})

test('callHandler and callRef compose optional callbacks without assuming their presence', () => {
	const handler = vi.fn()
	const ref = vi.fn()
	const event = new Event('click')
	const element = document.createElement('button')

	callHandler(handler, event)
	callHandler(undefined, event)
	callRef(ref, element)
	callRef(ref, null)
	callRef(undefined, element)

	expect(handler).toHaveBeenCalledOnce()
	expect(handler).toHaveBeenCalledWith(event)
	expect(ref.mock.calls).toEqual([[element], [null]])
})

test('dom distinguishes DOM elements from SSR-like protocol hosts', () => {
	const element = document.createElement('div')
	expect(dom(element)).toBe(true)
	expect(dom(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))).toBe(true)
	expect(dom(document.createDocumentFragment())).toBe(false)
	expect(dom({ signal: new AbortController().signal })).toBe(false)
	expect(dom(null)).toBe(false)
})

test('listen is inert for an SSR-like protocol host', () => {
	const host = {
		addEventListener: vi.fn(),
		signal: new AbortController().signal,
	} as unknown as Host

	expect(() => listen(host, 'click', vi.fn())).not.toThrow()
	expect(host.addEventListener).not.toHaveBeenCalled()
})

test('listen releases the listener when the caller signal aborts', () => {
	const caller = new AbortController()
	const handler = vi.fn()
	const host = mount(handler, caller.signal)()

	host.click()
	caller.abort()
	host.click()

	expect(handler).toHaveBeenCalledTimes(1)
})

test('listen releases the listener when the host lifecycle aborts', () => {
	const caller = new AbortController()
	const handler = vi.fn()
	const host = mount(handler, caller.signal)()

	host.click()
	host.return()
	host.click()

	expect(caller.signal.aborted).toBe(false)
	expect(handler).toHaveBeenCalledTimes(1)
})

test('listen defaults cleanup to the host lifecycle without a caller signal', () => {
	const handler = vi.fn()
	const host = mount(handler)()

	host.click()
	host.return()
	host.click()

	expect(handler).toHaveBeenCalledTimes(1)
})
