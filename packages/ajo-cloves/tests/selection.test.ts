// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { selection } from 'ajo-cloves'

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const must = (value: Host | null): Host => {
	if (value == null) throw new Error('missing value')
	return value
}

const event = () => new Event('select')

type View = ReturnType<typeof selection>

const shown = (view: View) => ['a', 'b', 'c', 'd', 'leak'].filter(value => view.has(value)).join(',')

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	let view: ReturnType<typeof selection> | undefined

	function* Gen(this: Host) {
		view = selection(this, {})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(view!)).toEqual(['has', 'toggle', 'sync'])
})

test('single toggle selects and clears a value', () => {
	let view: ReturnType<typeof selection> | undefined
	const changes: string[][] = []

	function* Gen(this: Host) {
		view = selection(this, {
			onChange: values => changes.push(values),
		})

		while (true) yield jsx('span', { children: shown(view) })
	}

	render(jsx(Gen, {}), document.body)

	view!.toggle('a', event())
	expect(view!.has('a')).toBe(true)

	view!.toggle('a', event())
	expect(view!.has('a')).toBe(false)
	expect(changes).toEqual([['a'], []])
})

test('single required mode keeps the last value without change notification or invalidation', () => {
	let view: ReturnType<typeof selection> | undefined
	const onChange = vi.fn()
	let renders = 0

	function* Gen(this: Host) {
		view = selection(this, {
			fallback: ['a'],
			required: () => true,
			onChange,
		})

		while (true) {
			renders++
			yield jsx('span', { children: `${renders}:${shown(view)}` })
		}
	}

	render(jsx(Gen, {}), document.body)

	view!.toggle('a', event())

	expect(view!.has('a')).toBe(true)
	expect(onChange).not.toHaveBeenCalled()
	expect(document.body.textContent).toBe('1:a')
})

test('multiple mode preserves order, appends and removes values', () => {
	let view: ReturnType<typeof selection> | undefined
	const changes: string[][] = []

	function* Gen(this: Host) {
		view = selection(this, {
			fallback: ['a'],
			multiple: () => true,
			onChange: values => changes.push(values),
		})

		while (true) yield jsx('span', { children: shown(view) })
	}

	render(jsx(Gen, {}), document.body)

	view!.toggle('b')
	view!.toggle('a')
	view!.toggle('c')

	expect(changes).toEqual([['a', 'b'], ['b'], ['b', 'c']])
	expect(document.body.textContent).toBe('b,c')
})

test('multiple required mode keeps the last selected value', () => {
	let view: ReturnType<typeof selection> | undefined
	const onChange = vi.fn()

	function* Gen(this: Host) {
		view = selection(this, {
			fallback: ['a'],
			multiple: () => true,
			required: () => true,
			onChange,
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	view!.toggle('a')

	expect(view!.has('a')).toBe(true)
	expect(onChange).not.toHaveBeenCalled()
})

test('controlled and uncontrolled sync follow controlled clove semantics', () => {
	let view: ReturnType<typeof selection> | undefined

	function* Gen(this: Host) {
		view = selection(this, { fallback: ['a'] })

		for (const args of this) {
			view.sync(args.values as string[] | undefined)
			yield jsx('span', { children: shown(view) })
		}
	}

	render(jsx(Gen, {}), document.body)

	expect(document.body.textContent).toBe('a')

	view!.toggle('b')
	expect(document.body.textContent).toBe('b')

	render(jsx(Gen, { values: ['c'] }), document.body)
	expect(document.body.textContent).toBe('c')

	view!.toggle('d')
	expect(view!.has('d')).toBe(false)

	render(jsx(Gen, { values: ['c'] }), document.body)
	expect(document.body.textContent).toBe('c')
})

test('toggle delegates to controlled ordering by notifying before the live value updates', () => {
	let view: ReturnType<typeof selection> | undefined
	const order: string[] = []

	function* Gen(this: Host) {
		view = selection(this, {
			fallback: ['a'],
			onChange: next => order.push(`${next.join(',')}:${shown(view!)}`),
		})

		while (true) yield jsx('span', { children: shown(view) })
	}

	render(jsx(Gen, {}), document.body)

	view!.toggle('b')

	expect(order).toEqual(['b:a'])
	expect(document.body.textContent).toBe('b')
})

test('copy-on-write protects synced arrays from later mutation', () => {
	let view: ReturnType<typeof selection> | undefined
	const synced = ['a']

	function* Gen(this: Host) {
		view = selection(this, {})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	view!.sync(synced)
	synced.push('leak')
	expect(shown(view!)).toBe('a')
})

test('invalidate updates DOM text through host.next from toggle', () => {
	let view: ReturnType<typeof selection> | undefined

	function* Gen(this: Host) {
		view = selection(this, {})

		while (true) yield jsx('span', { children: shown(view) || 'empty' })
	}

	render(jsx(Gen, {}), document.body)

	view!.toggle('a')

	expect(document.body.textContent).toBe('a')
})

test('teardown makes later toggle calls unable to render', () => {
	let view: ReturnType<typeof selection> | undefined

	function* Gen(this: Host) {
		view = selection(this, {})

		while (true) yield jsx('span', { children: shown(view) || 'empty' })
	}

	render(jsx(Gen, {}), document.body)
	render(null, document.body)

	view!.toggle('a')

	expect(document.body.textContent).toBe('')
})

test('reset recreates local state with a fresh view', () => {
	let host: Host | null = null
	let view: ReturnType<typeof selection> | undefined
	let created = 0

	function* Gen(this: Host) {
		created++
		view = selection(this, { fallback: ['a'] })

		while (true) yield jsx('span', { children: shown(view) })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)
	view!.toggle('b')
	expect(document.body.textContent).toBe('b')

	must(host).return()
	must(host).next()

	expect(created).toBe(2)
	expect(document.body.textContent).toBe('a')
})

test('SSR works as a state-only clove', () => {
	function* Gen(this: Host) {
		const view = selection(this, { fallback: ['a'] })
		view.sync(undefined)

		yield jsx('span', { children: shown(view) })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>a</span></div>')
})
