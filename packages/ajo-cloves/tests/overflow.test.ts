// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { overflow } from 'ajo-cloves'
import { frames, mount, must, serve } from './harness'

const metrics = (element: HTMLElement) => {
	Object.defineProperties(element, {
		clientHeight: { configurable: true, value: 100 },
		clientWidth: { configurable: true, value: 100 },
		scrollHeight: { configurable: true, value: 300 },
		scrollLeft: { configurable: true, value: 50 },
		scrollTop: { configurable: true, value: 50 },
		scrollWidth: { configurable: true, value: 300 },
	})
}

/** Mounts two overflowing scrollers, `a` and `b`, and a view that follows `target`. */
const setup = () => {
	let target: HTMLElement | null = null
	const { view } = mount(host => overflow(host, { target: () => target }), () => [
		jsx('div', { key: 'a', id: 'a' }),
		jsx('div', { key: 'b', id: 'b' }),
	])
	const a = must(document.getElementById('a'))
	const b = must(document.getElementById('b'))
	metrics(a)
	metrics(b)
	return {
		a,
		b,
		view,
		set target(next: HTMLElement | null) {
			target = next
		},
	}
}

test('clears owned overflow stamps on retarget, null, and host abort', () => {
	const raf = frames()
	const ctx = setup()
	const { a: first, b: second } = ctx

	ctx.target = first
	ctx.view.sync()
	raf.flush()
	expect(first.getAttribute('data-overflow-x')).toBe('both')
	expect(first.getAttribute('data-overflow-y')).toBe('both')

	ctx.target = second
	ctx.view.sync()
	expect(first.hasAttribute('data-overflow-x')).toBe(false)
	expect(first.hasAttribute('data-overflow-y')).toBe(false)
	raf.flush()
	expect(second.getAttribute('data-overflow-x')).toBe('both')
	expect(second.getAttribute('data-overflow-y')).toBe('both')

	ctx.target = null
	ctx.view.sync()
	expect(second.hasAttribute('data-overflow-x')).toBe(false)
	expect(second.hasAttribute('data-overflow-y')).toBe(false)

	ctx.target = second
	ctx.view.sync()
	raf.flush()
	expect(second.getAttribute('data-overflow-y')).toBe('both')
	render(null, document.body)
	expect(second.hasAttribute('data-overflow-x')).toBe(false)
	expect(second.hasAttribute('data-overflow-y')).toBe(false)
})

test('scroll, resize and re-render share one measure per frame', () => {
	const raf = frames()
	const ctx = setup()

	ctx.target = ctx.a
	ctx.view.sync()
	expect(raf.flush()).toBe(1)
	expect(ctx.a.getAttribute('data-overflow-y')).toBe('both')

	ctx.view.sync()
	ctx.a.dispatchEvent(new Event('scroll'))
	expect(raf.flush()).toBe(1)
})

test('SSR sync is inert and does not resolve the target', () => {
	expect(serve(host => overflow(host, {
		target: () => {
			throw new Error('target should not run on the server')
		},
	}).sync())).toBe('<div>server</div>')
})
