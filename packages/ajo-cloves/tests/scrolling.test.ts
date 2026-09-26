// @vitest-environment happy-dom
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { scrolling } from 'ajo-cloves'
import { frames, mount, must, serve } from './harness'

/** Mounts two scrollers, `a` and `b`, and a view that follows `target` and records callbacks by id. */
const setup = (end = false) => {
	let target: HTMLElement | null = null
	const scrolled: string[] = []
	const ended: string[] = []
	const { view } = mount(host => scrolling(host, {
		target: () => target,
		onScroll: el => scrolled.push(el.id),
		onEnd: end ? el => ended.push(el.id) : undefined,
	}), () => [
		jsx('div', { key: 'a', id: 'a' }),
		jsx('div', { key: 'b', id: 'b' }),
	])

	return {
		a: must(document.getElementById('a')),
		b: must(document.getElementById('b')),
		ended,
		scrolled,
		view,
		set target(next: HTMLElement | null) {
			target = next
		},
	}
}

test('initial sync and many scroll events coalesce into one frame callback', () => {
	const raf = frames()
	const ctx = setup()

	ctx.target = ctx.a
	ctx.view.sync()

	ctx.a.dispatchEvent(new Event('scroll'))
	ctx.a.dispatchEvent(new Event('scroll'))
	ctx.a.dispatchEvent(new Event('scroll'))

	expect(ctx.scrolled).toEqual([])
	expect(raf.flush()).toBe(1)
	expect(ctx.scrolled).toEqual(['a'])

	ctx.a.dispatchEvent(new Event('scroll'))
	raf.flush()

	expect(ctx.scrolled).toEqual(['a', 'a'])
})

test('retargeting aborts the old listeners and leaves only the new target live', () => {
	const raf = frames()
	const ctx = setup(true)

	ctx.target = ctx.a
	ctx.view.sync()
	raf.flush()

	ctx.target = ctx.b
	ctx.view.sync()
	raf.flush()

	ctx.a.dispatchEvent(new Event('scroll'))
	ctx.a.dispatchEvent(new Event('scrollend'))
	raf.flush()

	expect(ctx.scrolled).toEqual(['a', 'b'])
	expect(ctx.ended).toEqual([])

	ctx.b.dispatchEvent(new Event('scroll'))
	ctx.b.dispatchEvent(new Event('scrollend'))
	expect(ctx.ended).toEqual(['b'])
	raf.flush()

	expect(ctx.scrolled).toEqual(['a', 'b', 'b'])
})

test('SSR sync is inert and does not resolve the target', () => {
	expect(serve(host => scrolling(host, {
		target: () => {
			throw new Error('target should not run on the server')
		},
		onScroll: () => {
			throw new Error('onScroll should not run on the server')
		},
	}).sync())).toBe('<div>server</div>')
})
