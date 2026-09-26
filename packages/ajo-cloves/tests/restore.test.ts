// @vitest-environment happy-dom
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { restore } from 'ajo-cloves'
import { mount, must, serve, tick } from './harness'

/** Mounts two buttons, `a` and `b`, beside a restore view. */
const setup = () => {
	const { view } = mount(restore, () => [
		jsx('button', { key: 'a', id: 'a' }),
		jsx('button', { key: 'b', id: 'b' }),
	])

	return {
		a: must(document.getElementById('a')),
		b: must(document.getElementById('b')),
		view,
	}
}

test('capture defaults to the active element and restores focus in a microtask', async () => {
	const { a, b, view } = setup()

	a.focus()
	view.capture()
	b.focus()
	view.restore()

	expect(document.activeElement).toBe(b)

	await tick()

	expect(document.activeElement).toBe(a)
})

test('capture accepts an explicit element', async () => {
	const { a, b, view } = setup()

	a.focus()
	view.capture(b)
	view.restore()

	await tick()

	expect(document.activeElement).toBe(b)
})

test('does not focus a disconnected captured element', async () => {
	const { a, b, view } = setup()

	const focus = vi.spyOn(a, 'focus')
	view.capture(a)
	a.remove()
	b.focus()
	view.restore()

	await tick()

	expect(focus).not.toHaveBeenCalled()
	expect(document.activeElement).toBe(b)
})

test('restore clears the captured slot after one use', async () => {
	const { a, b, view } = setup()

	a.focus()
	view.capture()
	b.focus()
	view.restore()
	await tick()
	expect(document.activeElement).toBe(a)

	b.focus()
	view.restore()
	await tick()
	expect(document.activeElement).toBe(b)
})

test('capturing twice overwrites the previous element', async () => {
	const { a, b, view } = setup()

	view.capture(a)
	view.capture(b)
	a.focus()
	view.restore()
	await tick()

	expect(document.activeElement).toBe(b)
})

test('SSR inert view captures and restores as no-ops', () => {
	expect(serve(host => {
		const view = restore(host)
		view.capture()
		view.restore()
	})).toBe('<div>server</div>')
})
