// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { restore } from 'ajo-cloves'

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const must = (value: Host | null): Host => {
	if (value == null) throw new Error('missing value')
	return value
}

const button = (value: HTMLButtonElement | null): HTMLButtonElement => {
	if (value == null) throw new Error('missing value')
	return value
}

const tick = () => new Promise<void>(resolve => queueMicrotask(resolve))

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	let view: ReturnType<typeof restore> | undefined

	function* Gen(this: Host) {
		view = restore(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(view!)).toEqual(['capture', 'restore'])
})

test('capture defaults to the active element and restores focus in a microtask', async () => {
	let view: ReturnType<typeof restore> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null

	function* Gen(this: Host) {
		view = restore(this)

		yield [
			jsx('button', { key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	button(a).focus()
	view!.capture()
	button(b).focus()
	view!.restore()

	expect(document.activeElement).toBe(button(b))

	await tick()

	expect(document.activeElement).toBe(button(a))
})

test('capture accepts an explicit element', async () => {
	let view: ReturnType<typeof restore> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null

	function* Gen(this: Host) {
		view = restore(this)

		yield [
			jsx('button', { key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	button(a).focus()
	view!.capture(button(b))
	view!.restore()

	await tick()

	expect(document.activeElement).toBe(button(b))
})

test('invalidate updates DOM text through host.next from restored focus', async () => {
	let view: ReturnType<typeof restore> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null
	let label = 'none'

	function* Gen(this: Host) {
		view = restore(this)

		while (true) yield [
			jsx('button', {
				key: 'a',
				ref: (element: unknown) => a = element as HTMLButtonElement | null,
				'set:onfocus': () => this.next(() => label = 'a'),
			}),
			jsx('button', {
				key: 'b',
				ref: (element: unknown) => b = element as HTMLButtonElement | null,
				'set:onfocus': () => this.next(() => label = 'b'),
			}),
			jsx('span', { key: 'label', children: label }),
		]
	}

	render(jsx(Gen, {}), document.body)

	button(a).focus()
	view!.capture()
	button(b).focus()
	view!.restore()
	await tick()

	expect(document.body.textContent).toBe('a')
})

test('does not focus a disconnected captured element', async () => {
	let view: ReturnType<typeof restore> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null

	function* Gen(this: Host) {
		view = restore(this)

		yield [
			jsx('button', { key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	const old = button(a)
	const focus = vi.spyOn(old, 'focus')
	view!.capture(old)
	old.remove()
	button(b).focus()
	view!.restore()

	await tick()

	expect(focus).not.toHaveBeenCalled()
	expect(document.activeElement).toBe(button(b))
})

test('restore clears the captured slot after one use', async () => {
	let view: ReturnType<typeof restore> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null

	function* Gen(this: Host) {
		view = restore(this)

		yield [
			jsx('button', { key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	button(a).focus()
	view!.capture()
	button(b).focus()
	view!.restore()
	await tick()
	expect(document.activeElement).toBe(button(a))

	button(b).focus()
	view!.restore()
	await tick()
	expect(document.activeElement).toBe(button(b))
})

test('capturing twice overwrites the previous element', async () => {
	let view: ReturnType<typeof restore> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null

	function* Gen(this: Host) {
		view = restore(this)

		yield [
			jsx('button', { key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	view!.capture(button(a))
	view!.capture(button(b))
	button(a).focus()
	view!.restore()
	await tick()

	expect(document.activeElement).toBe(button(b))
})

test('teardown leaves a captured disconnected element inert after unmount', async () => {
	let view: ReturnType<typeof restore> | undefined
	let a: HTMLButtonElement | null = null

	function* Gen(this: Host) {
		view = restore(this)
		yield jsx('button', { ref: (element: unknown) => a = element as HTMLButtonElement | null })
	}

	render(jsx(Gen, {}), document.body)

	const old = button(a)
	const focus = vi.spyOn(old, 'focus')
	view!.capture(old)
	render(null, document.body)
	view!.restore()
	await tick()

	expect(focus).not.toHaveBeenCalled()
	expect(document.body.textContent).toBe('')
})

test('reset recreates a fresh working view', async () => {
	let host: Host | null = null
	let view: ReturnType<typeof restore> | undefined
	let a: HTMLButtonElement | null = null
	let b: HTMLButtonElement | null = null
	let created = 0

	function* Gen(this: Host) {
		created++
		view = restore(this)

		yield [
			jsx('button', { key: 'a', ref: (element: unknown) => a = element as HTMLButtonElement | null }),
			jsx('button', { key: 'b', ref: (element: unknown) => b = element as HTMLButtonElement | null }),
		]
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	must(host).return()
	must(host).next()

	button(a).focus()
	view!.capture()
	button(b).focus()
	view!.restore()
	await tick()

	expect(created).toBe(2)
	expect(document.activeElement).toBe(button(a))
})

test('SSR inert view captures and restores as no-ops', () => {
	function* Gen(this: Host) {
		const view = restore(this)
		view.capture()
		view.restore()

		yield jsx('span', { children: 'server' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
})
