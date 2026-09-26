// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { Window } from 'happy-dom'
import { expect, test, vi } from 'vitest'
import { dismiss } from 'ajo-cloves'
import { key, mount, must, serve } from './harness'

type Options = Parameters<typeof dismiss>[1]

const escape = () => key('Escape')

const pointer = () => new MouseEvent('pointerdown', {
	bubbles: true,
	cancelable: true,
})

const outside = () => {
	const element = document.createElement('button')

	document.body.append(element)
	return element
}

/** Mounts a host whose only child is the `inside` button. */
const setup = (opts: Omit<Options, 'active'> & { active?: () => boolean }) => {
	mount(host => dismiss(host, { active: () => true, ...opts }), () => jsx('button', { id: 'inside', children: 'inside' }))
	return must(document.getElementById('inside'))
}

const portal = () => {
	const element = document.createElement('div')

	document.body.append(element)
	return element
}

const realmHost = () => {
	const realm = new Window()
	const controller = new realm.AbortController()
	const element = realm.document.createElement('div')
	const host = element as unknown as Host
	Object.assign(host, {
		next: (fn?: () => unknown) => fn?.(),
		signal: controller.signal,
		throw: (error: unknown) => { throw error },
	})
	realm.document.body.append(element)
	return {
		close() {
			controller.abort()
			realm.close()
		},
		host,
		realm,
	}
}

test('defaults keep Escape enabled and outside pointerdown disabled', () => {
	const fn = vi.fn()
	const inside = setup({ onDismiss: fn })

	outside().dispatchEvent(pointer())

	expect(fn).not.toHaveBeenCalled()

	inside.dispatchEvent(escape())

	expect(fn).toHaveBeenCalledTimes(1)
})

test('prevent marks the dismissing Escape as handled', () => {
	const fn = vi.fn()
	setup({ prevent: true, onDismiss: fn })

	const event = escape()
	outside().dispatchEvent(event)

	expect(fn).toHaveBeenCalledOnce()
	expect(event.defaultPrevented).toBe(true)
})

test('an Escape a descendant already prevented is consumed and does not dismiss', () => {
	const fn = vi.fn()
	const inside = setup({ prevent: true, onDismiss: fn })
	inside.addEventListener('keydown', event => event.preventDefault())

	inside.dispatchEvent(escape())

	expect(fn).not.toHaveBeenCalled()
})

test('outside pointerdown dismisses outside the host and inside elements', () => {
	let extra: HTMLDivElement | null = null
	const fn = vi.fn()
	setup({ inside: () => [extra], outside: true, onDismiss: fn })
	extra = portal()

	const event = pointer()
	outside().dispatchEvent(event)

	expect(fn).toHaveBeenCalledTimes(1)
	expect(fn).toHaveBeenCalledWith(event)
	expect(event.defaultPrevented).toBe(false)
})

test('outside pointerdown inside the host does not dismiss', () => {
	const fn = vi.fn()
	setup({ outside: true, onDismiss: fn }).dispatchEvent(pointer())

	expect(fn).not.toHaveBeenCalled()
})

test('outside pointerdown inside an inside element does not dismiss', () => {
	let extra: HTMLDivElement | null = null
	const fn = vi.fn()
	setup({ inside: () => [extra], outside: true, onDismiss: fn })
	extra = portal()
	extra.dispatchEvent(pointer())

	expect(fn).not.toHaveBeenCalled()
})

test('outside pointerdown while inactive does not dismiss', () => {
	const fn = vi.fn()
	setup({ active: () => false, outside: true, onDismiss: fn })
	outside().dispatchEvent(pointer())

	expect(fn).not.toHaveBeenCalled()
})

test('escape false disables the Escape channel', () => {
	const fn = vi.fn()
	setup({ escape: false, onDismiss: fn }).dispatchEvent(escape())

	expect(fn).not.toHaveBeenCalled()
})

test('Escape dismisses even when focus has moved outside the host', () => {
	const fn = vi.fn()
	setup({ onDismiss: fn })
	const event = escape()
	outside().dispatchEvent(event)

	expect(fn).toHaveBeenCalledOnce()
	expect(fn).toHaveBeenCalledWith(event)
})

test('Escape belongs to the host owner document', () => {
	const { close, host, realm } = realmHost()
	const fn = vi.fn()
	try {
		dismiss(host, {
			active: () => true,
			onDismiss: fn,
		})

		const ownerEvent = new realm.KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })
		realm.document.body.dispatchEvent(ownerEvent)
		expect(fn).toHaveBeenCalledOnce()
		expect(fn).toHaveBeenCalledWith(ownerEvent)

		document.dispatchEvent(escape())
		expect(fn).toHaveBeenCalledOnce()
	} finally {
		close()
	}
})

test('outside dismissal uses the host realm Node constructor', () => {
	const { close, host, realm } = realmHost()
	const fn = vi.fn()
	try {
		dismiss(host, {
			active: () => true,
			outside: true,
			onDismiss: fn,
		})

		vi.stubGlobal('Node', class ForeignNode {})
		const event = new realm.MouseEvent('pointerdown', { bubbles: true })
		realm.document.documentElement.dispatchEvent(event)
		expect(fn).toHaveBeenCalledOnce()
		expect(fn).toHaveBeenCalledWith(event)
	} finally {
		vi.unstubAllGlobals()
		close()
	}
})

test('unmount removes the Escape and outside listeners', () => {
	const fn = vi.fn()
	setup({ outside: true, onDismiss: fn })

	render(null, document.body)
	document.dispatchEvent(escape())
	outside().dispatchEvent(pointer())

	expect(fn).not.toHaveBeenCalled()
})

test('SSR renders without touching DOM APIs', () => {
	expect(serve(host => dismiss(host, {
		active: () => true,
		onDismiss: () => {},
	}))).toBe('<div>server</div>')
})
