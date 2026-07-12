// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { typeahead } from 'ajo-cloves'

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const must = (value: Host | null): Host => {
	if (value == null) throw new Error('missing value')
	return value
}

const key = (value: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: value,
	...init,
})

const item = (value: HTMLDivElement | null): HTMLDivElement => {
	if (value == null) throw new Error('missing value')
	return value
}

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	vi.useRealTimers()
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	let view: ReturnType<typeof typeahead> | undefined

	function* Gen(this: Host) {
		view = typeahead(this, {
			items: () => [],
			onMatch: () => {},
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(view!)).toEqual(['handle', 'reset'])
})

test('buffers printable keys, matches prefixes, and resets after 600 ms without preventing default', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof typeahead> | undefined
	let alpha: HTMLDivElement | null = null
	let apricot: HTMLDivElement | null = null
	let rose: HTMLDivElement | null = null
	const matches: string[] = []

	function* Gen(this: Host) {
		view = typeahead(this, {
			items: () => [item(alpha), item(apricot), item(rose)],
			onMatch: target => matches.push(target.id),
		})

		yield [
			jsx('div', { id: 'alpha', key: 'alpha', ref: (element: unknown) => alpha = element as HTMLDivElement | null, children: 'Alpha' }),
			jsx('div', { id: 'apricot', key: 'apricot', ref: (element: unknown) => apricot = element as HTMLDivElement | null, children: 'Apricot' }),
			jsx('div', { id: 'rose', key: 'rose', ref: (element: unknown) => rose = element as HTMLDivElement | null, children: 'Rose' }),
		]
	}

	render(jsx(Gen, {}), document.body)

	const first = key('a')
	expect(view!.handle(first)).toBe(true)
	expect(first.defaultPrevented).toBe(false)
	expect(matches).toEqual(['alpha'])

	expect(view!.handle(key('p'))).toBe(true)
	expect(matches).toEqual(['alpha', 'apricot'])

	vi.advanceTimersByTime(600)
	expect(view!.handle(key('r'))).toBe(true)
	expect(matches).toEqual(['alpha', 'apricot', 'rose'])
})

test('reacts to live item sources and custom text readers', () => {
	let view: ReturnType<typeof typeahead> | undefined
	let alpha: HTMLDivElement | null = null
	let beta: HTMLDivElement | null = null
	let betaEnabled = false
	const matches: string[] = []

	function* Gen(this: Host) {
		view = typeahead(this, {
			items: () => betaEnabled ? [item(beta)] : [item(alpha)],
			text: target => target.getAttribute('aria-label') ?? '',
			onMatch: target => matches.push(target.id),
		})

		yield [
			jsx('div', { 'aria-label': 'alpha', id: 'alpha', key: 'alpha', ref: (element: unknown) => alpha = element as HTMLDivElement | null }),
			jsx('div', { 'aria-label': 'beta', id: 'beta', key: 'beta', ref: (element: unknown) => beta = element as HTMLDivElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	expect(view!.handle(key('a'))).toBe(true)
	betaEnabled = true
	view!.reset()
	expect(view!.handle(key('b'))).toBe(true)

	expect(matches).toEqual(['alpha', 'beta'])
})

test('honors custom delay values', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof typeahead> | undefined
	let alpha: HTMLDivElement | null = null
	let beta: HTMLDivElement | null = null
	const matches: string[] = []

	function* Gen(this: Host) {
		view = typeahead(this, {
			items: () => [item(alpha), item(beta)],
			delay: () => 50,
			onMatch: target => matches.push(target.id),
		})

		yield [
			jsx('div', { id: 'alpha', key: 'alpha', ref: (element: unknown) => alpha = element as HTMLDivElement | null, children: 'Alpha' }),
			jsx('div', { id: 'beta', key: 'beta', ref: (element: unknown) => beta = element as HTMLDivElement | null, children: 'Beta' }),
		]
	}

	render(jsx(Gen, {}), document.body)

	view!.handle(key('a'))
	vi.advanceTimersByTime(50)
	view!.handle(key('b'))

	expect(matches).toEqual(['alpha', 'beta'])
})

test('uses data-label before textContent', () => {
	let view: ReturnType<typeof typeahead> | undefined
	let option: HTMLDivElement | null = null
	const matches: string[] = []

	function* Gen(this: Host) {
		view = typeahead(this, {
			items: () => [item(option)],
			onMatch: target => matches.push(target.id),
		})

		yield jsx('div', {
			'data-label': 'Zulu',
			id: 'option',
			ref: (element: unknown) => option = element as HTMLDivElement | null,
			children: 'Alpha',
		})
	}

	render(jsx(Gen, {}), document.body)

	expect(view!.handle(key('z'))).toBe(true)
	expect(matches).toEqual(['option'])
})

test('ignores space and modifier combos without reading items', () => {
	let view: ReturnType<typeof typeahead> | undefined
	const items = vi.fn(() => [] as HTMLElement[])
	const onMatch = vi.fn()

	function* Gen(this: Host) {
		view = typeahead(this, { items, onMatch })
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(view!.handle(key(' '))).toBe(false)
	expect(view!.handle(key('a', { ctrlKey: true }))).toBe(false)
	expect(view!.handle(key('a', { metaKey: true }))).toBe(false)
	expect(view!.handle(key('a', { altKey: true }))).toBe(false)
	expect(items).not.toHaveBeenCalled()
	expect(onMatch).not.toHaveBeenCalled()
})

test('no-match keeps the buffer, returns true, and reset clears it', () => {
	let view: ReturnType<typeof typeahead> | undefined
	let alpha: HTMLDivElement | null = null
	const matches: string[] = []

	function* Gen(this: Host) {
		view = typeahead(this, {
			items: () => [item(alpha)],
			onMatch: target => matches.push(target.id),
		})

		yield jsx('div', { id: 'alpha', ref: (element: unknown) => alpha = element as HTMLDivElement | null, children: 'Alpha' })
	}

	render(jsx(Gen, {}), document.body)

	expect(view!.handle(key('z'))).toBe(true)
	expect(view!.handle(key('a'))).toBe(true)
	expect(matches).toEqual([])

	view!.reset()
	expect(view!.handle(key('a'))).toBe(true)
	expect(matches).toEqual(['alpha'])
})

test('invalidate updates DOM text through host.next from onMatch', () => {
	let view: ReturnType<typeof typeahead> | undefined
	let alpha: HTMLDivElement | null = null
	let label = 'none'

	function* Gen(this: Host) {
		view = typeahead(this, {
			items: () => [item(alpha)],
			onMatch: target => this.next(() => label = target.id),
		})

		while (true) yield [
			jsx('div', { id: 'alpha', key: 'alpha', ref: (element: unknown) => alpha = element as HTMLDivElement | null, children: 'Alpha' }),
			jsx('span', { key: 'label', children: label }),
		]
	}

	render(jsx(Gen, {}), document.body)
	view!.handle(key('a'))

	expect(document.body.textContent).toBe('Alphaalpha')
})

test('teardown clears a pending reset timer on unmount', () => {
	vi.useFakeTimers()

	let view: ReturnType<typeof typeahead> | undefined
	let alpha: HTMLDivElement | null = null
	const matches: string[] = []

	function* Gen(this: Host) {
		view = typeahead(this, {
			items: () => [item(alpha)],
			onMatch: target => matches.push(target.id),
		})

		yield jsx('div', { id: 'alpha', ref: (element: unknown) => alpha = element as HTMLDivElement | null, children: 'Alpha' })
	}

	render(jsx(Gen, {}), document.body)
	view!.handle(key('a'))
	render(null, document.body)

	expect(vi.getTimerCount()).toBe(0)

	vi.advanceTimersByTime(600)

	expect(matches).toEqual(['alpha'])
})

test('reset clears old pending work and recreates a searchable view', () => {
	vi.useFakeTimers()

	let host: Host | null = null
	let view: ReturnType<typeof typeahead> | undefined
	let alpha: HTMLDivElement | null = null
	const matches: string[] = []

	function* Gen(this: Host) {
		view = typeahead(this, {
			items: () => [item(alpha)],
			onMatch: target => matches.push(target.id),
		})

		yield jsx('div', { id: 'alpha', ref: (element: unknown) => alpha = element as HTMLDivElement | null, children: 'Alpha' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)
	view!.handle(key('a'))
	must(host).return()
	must(host).next()

	vi.advanceTimersByTime(600)
	view!.handle(key('a'))

	expect(matches).toEqual(['alpha', 'alpha'])
})

test('SSR inert view returns false and reset no-ops', () => {
	function* Gen(this: Host) {
		const view = typeahead(this, {
			items: () => {
				throw new Error('items should not run on the server')
			},
			onMatch: () => {},
		})

		const consumed = view.handle(key('a'))
		view.reset()
		yield jsx('span', { children: consumed ? 'client' : 'server' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
})
