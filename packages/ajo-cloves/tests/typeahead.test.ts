// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { typeahead } from 'ajo-cloves'
import { key, mount, must, serve } from './harness'

type Item = { id: string, text: string, label?: string }

const item = (id: string) => must(document.getElementById(id))

/** Mounts a typeahead over the `items` and records matched ids. */
const setup = (items: Item[], source = () => items.map(({ id }) => item(id))) => {
	vi.useFakeTimers()
	const matches: string[] = []
	const { view } = mount(host => typeahead(host, {
		items: source,
		onMatch: target => matches.push(target.id),
	}), () => items.map(({ id, text, label }) => jsx('div', { id, key: id, 'data-label': label, children: text })))
	return { matches, view }
}

test('buffers printable keys, matches prefixes, and resets after 600 ms without preventing default', () => {
	const { matches, view } = setup([
		{ id: 'alpha', text: 'Alpha' },
		{ id: 'apricot', text: 'Apricot' },
		{ id: 'rose', text: 'Rose' },
	])

	const first = key('a')
	expect(view.handle(first)).toBe(true)
	expect(first.defaultPrevented).toBe(false)
	expect(matches).toEqual(['alpha'])

	expect(view.handle(key('p'))).toBe(true)
	expect(matches).toEqual(['alpha', 'apricot'])

	vi.advanceTimersByTime(600)
	expect(view.handle(key('r'))).toBe(true)
	expect(matches).toEqual(['alpha', 'apricot', 'rose'])
})

test('reacts to live item sources', () => {
	let betaEnabled = false
	const { matches, view } = setup([
		{ id: 'alpha', text: 'Alpha' },
		{ id: 'beta', text: 'Beta' },
	], () => [item(betaEnabled ? 'beta' : 'alpha')])

	expect(view.handle(key('a'))).toBe(true)
	betaEnabled = true
	vi.advanceTimersByTime(600)
	expect(view.handle(key('b'))).toBe(true)

	expect(matches).toEqual(['alpha', 'beta'])
})

test('uses data-label before textContent', () => {
	const { matches, view } = setup([{ id: 'option', text: 'Alpha', label: 'Zulu' }])

	expect(view.handle(key('z'))).toBe(true)
	expect(matches).toEqual(['option'])
})

test('ignores space and modifier combos without reading items', () => {
	const items = vi.fn(() => [] as HTMLElement[])
	const onMatch = vi.fn()
	const { view } = mount(host => typeahead(host, { items, onMatch }))

	expect(view.handle(key(' '))).toBe(false)
	expect(view.handle(key('a', { ctrlKey: true }))).toBe(false)
	expect(view.handle(key('a', { metaKey: true }))).toBe(false)
	expect(view.handle(key('a', { altKey: true }))).toBe(false)
	expect(items).not.toHaveBeenCalled()
	expect(onMatch).not.toHaveBeenCalled()
})

test('no-match keeps the buffer, returns true, and the buffer clears after 600 ms', () => {
	const { matches, view } = setup([{ id: 'alpha', text: 'Alpha' }])

	expect(view.handle(key('z'))).toBe(true)
	expect(view.handle(key('a'))).toBe(true)
	expect(matches).toEqual([])

	vi.advanceTimersByTime(600)
	expect(view.handle(key('a'))).toBe(true)
	expect(matches).toEqual(['alpha'])
})

test('teardown clears a pending reset timer on unmount', () => {
	const { matches, view } = setup([{ id: 'alpha', text: 'Alpha' }])

	view.handle(key('a'))
	render(null, document.body)

	expect(vi.getTimerCount()).toBe(0)

	vi.advanceTimersByTime(600)

	expect(matches).toEqual(['alpha'])
})

test('SSR inert view returns false', () => {
	expect(serve(host => typeahead(host, {
		items: () => {
			throw new Error('items should not run on the server')
		},
		onMatch: () => {},
	}), view => view.handle(key('a')) ? 'client' : 'server')).toBe('<div>server</div>')
})
