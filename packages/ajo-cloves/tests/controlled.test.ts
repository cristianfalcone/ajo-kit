// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { controlled } from 'ajo-cloves'

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

test('shape has exactly the documented fields', () => {
	let view: ReturnType<typeof controlled<boolean>> | undefined

	function* Gen(this: Host) {
		view = controlled(this, { fallback: false })
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(view!)).toEqual(['value', 'controlled', 'sync', 'set', 'accept', 'init'])
})

test('reacts to uncontrolled set and controlled sync truth', () => {
	let view: ReturnType<typeof controlled<boolean>> | undefined

	function* Gen(this: Host) {
		view = controlled(this, { fallback: false })

		for (const args of this) {
			view.sync(args.open as boolean | undefined)
			yield jsx('span', { children: view.value ? 'open' : 'closed' })
		}
	}

	render(jsx(Gen, {}), document.body)

	expect(view!.controlled).toBe(false)
	expect(document.body.textContent).toBe('closed')

	view!.set(true)

	expect(view!.value).toBe(true)
	expect(document.body.textContent).toBe('open')

	render(jsx(Gen, { open: false }), document.body)

	expect(view!.controlled).toBe(true)
	expect(view!.value).toBe(false)
	expect(document.body.textContent).toBe('closed')
})

test('invalidate updates DOM text through host.next', () => {
	let view: ReturnType<typeof controlled<boolean>> | undefined

	function* Gen(this: Host) {
		view = controlled(this, { fallback: false })

		while (true) yield jsx('span', { children: view.value ? 'yes' : 'no' })
	}

	render(jsx(Gen, {}), document.body)

	expect(document.body.textContent).toBe('no')

	view!.set(true)

	expect(document.body.textContent).toBe('yes')
})

test('init seeds uncontrolled value, invalidates, and ignores controlled views without notifying', () => {
	let view: ReturnType<typeof controlled<string>> | undefined
	let renders = 0
	const onChange = vi.fn()

	function* Gen(this: Host) {
		view = controlled(this, { fallback: 'a', onChange })

		for (const args of this) {
			view.sync(args.value as string | undefined)
			renders++
			yield jsx('span', { children: `${renders}:${view.value}` })
		}
	}

	render(jsx(Gen, {}), document.body)

	view!.init('b')

	expect(view!.value).toBe('b')
	expect(document.body.textContent).toBe('2:b')
	expect(onChange).not.toHaveBeenCalled()

	render(jsx(Gen, { value: 'c' }), document.body)
	view!.init('d')

	expect(view!.value).toBe('c')
	expect(document.body.textContent).toBe('3:c')
	expect(onChange).not.toHaveBeenCalled()
})

test('teardown makes later set calls unable to render', () => {
	let view: ReturnType<typeof controlled<boolean>> | undefined

	function* Gen(this: Host) {
		view = controlled(this, { fallback: false })

		while (true) yield jsx('span', { children: view.value ? 'on' : 'off' })
	}

	render(jsx(Gen, {}), document.body)
	render(null, document.body)

	view!.set(true)

	expect(document.body.textContent).toBe('')
})

test('reset recreates local state with a fresh view', () => {
	let host: Host | null = null
	let view: ReturnType<typeof controlled<boolean>> | undefined
	let created = 0

	function* Gen(this: Host) {
		created++
		view = controlled(this, { fallback: false })

		while (true) yield jsx('span', { children: view.value ? 'on' : 'off' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)
	view!.set(true)

	expect(document.body.textContent).toBe('on')

	must(host).return()
	must(host).next()

	expect(created).toBe(2)
	expect(document.body.textContent).toBe('off')

	view!.set(true)

	expect(document.body.textContent).toBe('on')
})

test('sync binds null as controlled-empty and undefined as uncontrolled', () => {
	let view: ReturnType<typeof controlled<string | null>> | undefined

	function* Gen(this: Host) {
		view = controlled(this, { fallback: 'local' })

		for (const args of this) {
			view.sync(args.value as string | null | undefined)
			yield jsx('span', { children: view.value ?? 'empty' })
		}
	}

	render(jsx(Gen, {}), document.body)

	expect(view!.controlled).toBe(false)
	expect(document.body.textContent).toBe('local')

	render(jsx(Gen, { value: null }), document.body)

	expect(view!.controlled).toBe(true)
	expect(view!.value).toBe(null)
	expect(document.body.textContent).toBe('empty')

	render(jsx(Gen, {}), document.body)

	expect(view!.controlled).toBe(false)
	expect(document.body.textContent).toBe('local')
})

test('SSR renders without DOM access', () => {
	function* Gen(this: Host) {
		const view = controlled(this, { fallback: 'server' })
		view.sync(undefined)

		yield jsx('span', { children: view.value })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
})

test('set calls onChange before the live value updates', () => {
	let view: ReturnType<typeof controlled<boolean>> | undefined
	const order: string[] = []

	function* Gen(this: Host) {
		view = controlled(this, {
			fallback: false,
			onChange: next => order.push(`set:${next}:${view!.value}`),
		})

		while (true) yield jsx('span', { children: view.value ? 'on' : 'off' })
	}

	render(jsx(Gen, {}), document.body)

	view!.set(true)

	expect(order).toEqual(['set:true:false'])
	expect(view!.value).toBe(true)
})

test('accept calls onChange after the live value updates', () => {
	let view: ReturnType<typeof controlled<boolean>> | undefined
	const order: string[] = []

	function* Gen(this: Host) {
		view = controlled(this, {
			fallback: false,
			onChange: next => order.push(`accept:${next}:${view!.value}`),
		})

		while (true) yield jsx('span', { children: view.value ? 'on' : 'off' })
	}

	render(jsx(Gen, {}), document.body)

	view!.accept(true)

	expect(order).toEqual(['accept:true:true'])
	expect(view!.value).toBe(true)
})
