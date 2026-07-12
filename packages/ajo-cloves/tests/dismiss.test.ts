// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { dismiss } from 'ajo-cloves'

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const mustHost = (value: Host | null): Host => {
	if (value == null) throw new Error('missing value')
	return value
}

const button = (value: HTMLButtonElement | null): HTMLButtonElement => {
	if (value == null) throw new Error('missing value')
	return value
}

const escape = () => new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: 'Escape',
})

const pointer = () => new MouseEvent('pointerdown', {
	bubbles: true,
	cancelable: true,
})

const outsideButton = () => {
	const element = document.createElement('button')

	document.body.append(element)
	return element
}

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	document.body.textContent = ''
})

test('shape is a void wiring clove', () => {
	let result: void | undefined

	function* Gen(this: Host) {
		result = dismiss(this, {
			active: () => false,
			onDismiss: () => {},
		})
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(result).toBeUndefined()
})

test('defaults keep Escape enabled and outside pointerdown disabled', () => {
	let inside: HTMLButtonElement | null = null
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			inside: () => [inside],
			onDismiss: fn,
		})

		yield jsx('button', {
			ref: (element: unknown) => inside = element as HTMLButtonElement | null,
			children: 'inside',
		})
	}

	render(jsx(Gen, {}), document.body)

	outsideButton().dispatchEvent(pointer())

	expect(fn).not.toHaveBeenCalled()

	button(inside).dispatchEvent(escape())

	expect(fn).toHaveBeenCalledTimes(1)
})

test('reacts to Escape inside the resolved elements', () => {
	let inside: HTMLButtonElement | null = null
	let outside: HTMLButtonElement | null = null
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			inside: () => [inside],
			prevent: true,
			onDismiss: fn,
		})

		yield [
			jsx('button', { key: 'inside', ref: (element: unknown) => inside = element as HTMLButtonElement | null, children: 'inside' }),
			jsx('button', { key: 'outside', ref: (element: unknown) => outside = element as HTMLButtonElement | null, children: 'outside' }),
		]
	}

	render(jsx(Gen, {}), document.body)

	button(outside).dispatchEvent(escape())

	expect(fn).not.toHaveBeenCalled()

	const event = escape()
	button(inside).dispatchEvent(event)

	expect(fn).toHaveBeenCalledTimes(1)
	expect(event.defaultPrevented).toBe(true)
})

test('outside pointerdown dismisses outside the host and inside elements', () => {
	let portal: HTMLDivElement | null = null
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			inside: () => [portal],
			outside: true,
			onDismiss: fn,
		})

		yield jsx('button', { children: 'host child' })
	}

	render(jsx(Gen, {}), document.body)
	portal = document.createElement('div')
	document.body.append(portal)

	const event = pointer()
	outsideButton().dispatchEvent(event)

	expect(fn).toHaveBeenCalledTimes(1)
	expect(fn).toHaveBeenCalledWith(event)
	expect(event.defaultPrevented).toBe(false)
})

test('outside pointerdown inside the host does not dismiss', () => {
	let inside: HTMLButtonElement | null = null
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			outside: true,
			onDismiss: fn,
		})

		yield jsx('button', {
			ref: (element: unknown) => inside = element as HTMLButtonElement | null,
			children: 'inside',
		})
	}

	render(jsx(Gen, {}), document.body)
	button(inside).dispatchEvent(pointer())

	expect(fn).not.toHaveBeenCalled()
})

test('outside pointerdown inside an inside element does not dismiss', () => {
	let portal: HTMLDivElement | null = null
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			inside: () => [portal],
			outside: true,
			onDismiss: fn,
		})

		yield jsx('button', { children: 'host child' })
	}

	render(jsx(Gen, {}), document.body)
	portal = document.createElement('div')
	document.body.append(portal)
	portal.dispatchEvent(pointer())

	expect(fn).not.toHaveBeenCalled()
})

test('outside pointerdown while inactive does not dismiss', () => {
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => false,
			outside: true,
			onDismiss: fn,
		})

		yield jsx('button', { children: 'inside' })
	}

	render(jsx(Gen, {}), document.body)
	outsideButton().dispatchEvent(pointer())

	expect(fn).not.toHaveBeenCalled()
})

test('escape false disables the Escape channel', () => {
	let inside: HTMLButtonElement | null = null
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			escape: false,
			onDismiss: fn,
		})

		yield jsx('button', {
			ref: (element: unknown) => inside = element as HTMLButtonElement | null,
			children: 'inside',
		})
	}

	render(jsx(Gen, {}), document.body)
	button(inside).dispatchEvent(escape())

	expect(fn).not.toHaveBeenCalled()
})

test('invalidate updates DOM text through host.next from onDismiss', () => {
	let inside: HTMLButtonElement | null = null
	let count = 0

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			inside: () => [inside],
			onDismiss: () => this.next(() => count++),
		})

		while (true) yield jsx('button', {
			ref: (element: unknown) => inside = element as HTMLButtonElement | null,
			children: String(count),
		})
	}

	render(jsx(Gen, {}), document.body)

	button(inside).dispatchEvent(escape())

	expect(document.body.textContent).toBe('1')
})

test('teardown removes the Escape listener on unmount', () => {
	let inside: HTMLButtonElement | null = null
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			inside: () => [inside],
			onDismiss: fn,
		})

		yield jsx('button', {
			ref: (element: unknown) => inside = element as HTMLButtonElement | null,
			children: 'inside',
		})
	}

	render(jsx(Gen, {}), document.body)

	const old = button(inside)
	render(null, document.body)
	old.dispatchEvent(escape())

	expect(fn).not.toHaveBeenCalled()
})

test('teardown removes the outside listener on unmount', () => {
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			outside: true,
			onDismiss: fn,
		})

		yield jsx('button', { children: 'inside' })
	}

	render(jsx(Gen, {}), document.body)
	render(null, document.body)
	document.dispatchEvent(pointer())

	expect(fn).not.toHaveBeenCalled()
})

test('reset installs one fresh Escape listener', () => {
	let host: Host | null = null
	let inside: HTMLButtonElement | null = null
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			inside: () => [inside],
			onDismiss: fn,
		})

		yield jsx('button', {
			ref: (element: unknown) => inside = element as HTMLButtonElement | null,
			children: 'inside',
		})
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	button(inside).dispatchEvent(escape())

	expect(fn).toHaveBeenCalledTimes(1)

	mustHost(host).return()
	mustHost(host).next()
	button(inside).dispatchEvent(escape())

	expect(fn).toHaveBeenCalledTimes(2)
})

test('reset re-arms the outside listener', () => {
	let host: Host | null = null
	const fn = vi.fn()

	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			outside: true,
			onDismiss: fn,
		})

		yield jsx('button', { children: 'inside' })
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	const outside = outsideButton()
	outside.dispatchEvent(pointer())

	expect(fn).toHaveBeenCalledTimes(1)

	mustHost(host).return()
	mustHost(host).next()
	outside.dispatchEvent(pointer())

	expect(fn).toHaveBeenCalledTimes(2)
})

test('SSR renders without touching DOM APIs', () => {
	function* Gen(this: Host) {
		dismiss(this, {
			active: () => true,
			onDismiss: () => {},
		})

		yield jsx('span', { children: 'server' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
})
