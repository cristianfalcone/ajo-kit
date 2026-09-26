// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { selection } from 'ajo-cloves'
import { mount, serve } from './harness'

type View = ReturnType<typeof selection>
type Options = Parameters<typeof selection>[1]

const event = () => new Event('select')

const shown = (view: View) => ['a', 'b', 'c', 'd', 'leak'].filter(value => view.has(value)).join(',')

/** Mounts a selection that renders its values. */
const setup = (opts: Options) => mount(host => selection(host, opts), shown).view

test('single toggle selects and clears a value', () => {
	const changes: string[][] = []
	const view = setup({ onChange: values => changes.push(values) })

	view.toggle('a', event())
	expect(view.has('a')).toBe(true)

	view.toggle('a', event())
	expect(view.has('a')).toBe(false)
	expect(changes).toEqual([['a'], []])
})

test('single required mode keeps the last value without change notification or invalidation', () => {
	const onChange = vi.fn()
	let renders = 0
	const { view } = mount(host => selection(host, {
		fallback: ['a'],
		required: () => true,
		onChange,
	}), view => `${++renders}:${shown(view)}`)

	view.toggle('a', event())

	expect(view.has('a')).toBe(true)
	expect(onChange).not.toHaveBeenCalled()
	expect(document.body.textContent).toBe('1:a')
})

test('multiple mode preserves order, appends and removes values', () => {
	const changes: string[][] = []
	const view = setup({
		fallback: ['a'],
		multiple: () => true,
		onChange: values => changes.push(values),
	})

	view.toggle('b')
	view.toggle('a')
	view.toggle('c')

	expect(changes).toEqual([['a', 'b'], ['b'], ['b', 'c']])
	expect(document.body.textContent).toBe('b,c')
})

test('multiple required mode keeps the last selected value', () => {
	const onChange = vi.fn()
	const view = setup({
		fallback: ['a'],
		multiple: () => true,
		required: () => true,
		onChange,
	})

	view.toggle('a')

	expect(view.has('a')).toBe(true)
	expect(onChange).not.toHaveBeenCalled()
})

test('controlled and uncontrolled sync follow controlled clove semantics', () => {
	let view: View | undefined

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
	const order: string[] = []
	const view: View = setup({
		fallback: ['a'],
		onChange: next => order.push(`${next.join(',')}:${shown(view)}`),
	})

	view.toggle('b')

	expect(order).toEqual(['b:a'])
	expect(document.body.textContent).toBe('b')
})

test('copy-on-write protects synced arrays from later mutation', () => {
	const synced = ['a']
	const view = setup({})

	view.sync(synced)
	synced.push('leak')
	expect(shown(view)).toBe('a')
})

test('SSR works as a state-only clove', () => {
	expect(serve(host => {
		const view = selection(host, { fallback: ['a'] })
		view.sync(undefined)
		return view
	}, shown)).toBe('<div>a</div>')
})
