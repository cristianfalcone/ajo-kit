// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { resize } from 'ajo-cloves'
import { frames, mount, must, observers, serve } from './harness'

/** Mounts two elements, `a` and `b`, and a view that follows `target` and records callbacks by id. */
const setup = () => {
	let target: Element | null = null
	const calls: string[] = []
	const { view } = mount(host => resize(host, {
		target: () => target,
		onResize: el => calls.push(el.id),
	}), () => [
		jsx('div', { key: 'a', id: 'a' }),
		jsx('div', { key: 'b', id: 'b' }),
	])

	return {
		a: must(document.getElementById('a')),
		b: must(document.getElementById('b')),
		calls,
		view,
		set target(next: Element | null) {
			target = next
		},
	}
}

test('two hosts share one ResizeObserver entry and disconnect after the last unsubscribe', () => {
	const observer = observers()
	const raf = frames()
	const hosts: Host[] = []
	const views: ReturnType<typeof resize>[] = []
	const calls: string[] = []

	function* Child(this: Host, args: { name: string }) {
		hosts.push(this)
		views.push(resize(this, {
			target: () => document.getElementById('target'),
			onResize: () => calls.push(args.name),
		}))
		yield null
	}

	render([
		jsx('div', { key: 'target', id: 'target' }),
		jsx(Child, { key: 'a', name: 'a' }),
		jsx(Child, { key: 'b', name: 'b' }),
	], document.body)

	const target = must(document.getElementById('target'))
	const [hostA, hostB] = hosts
	const [viewA, viewB] = views

	viewA.sync()
	viewB.sync()

	expect(observer).toHaveLength(1)
	expect(observer[0].observe).toHaveBeenCalledTimes(1)
	expect(observer[0].observe).toHaveBeenCalledWith(target)

	observer[0].trigger(target)
	raf.flush()

	expect(calls).toEqual(['a', 'b'])

	hostA.return()
	observer[0].trigger(target)
	raf.flush()

	expect(calls).toEqual(['a', 'b', 'b'])
	expect(observer[0].unobserve).not.toHaveBeenCalled()
	expect(observer[0].disconnect).not.toHaveBeenCalled()

	hostB.return()

	expect(observer[0].unobserve).toHaveBeenCalledWith(target)
	expect(observer[0].disconnect).toHaveBeenCalledTimes(1)
	observer[0].trigger(target)
	expect(raf.flush()).toBe(0)
	expect(calls).toEqual(['a', 'b', 'b'])

	hostB.next()
	must(views.at(-1)).sync()
	expect(observer).toHaveLength(2)
	expect(observer[1].observe).toHaveBeenCalledWith(target)
	expect(raf.flush()).toBe(1)
	expect(calls).toEqual(['a', 'b', 'b', 'b'])
	observer[1].trigger(target)
	raf.flush()
	expect(calls).toEqual(['a', 'b', 'b', 'b', 'b'])
})

test('initial sync and many observer notifications coalesce into one frame callback', () => {
	const observer = observers()
	const raf = frames()
	const ctx = setup()

	ctx.target = ctx.a
	ctx.view.sync()
	observer[0].trigger(ctx.a)
	observer[0].trigger(ctx.a)
	observer[0].trigger(ctx.a)

	expect(ctx.calls).toEqual([])
	expect(raf.flush()).toBe(1)
	expect(ctx.calls).toEqual(['a'])

	observer[0].trigger(ctx.a)
	raf.flush()

	expect(ctx.calls).toEqual(['a', 'a'])
})

test('retargeting unregisters the old element and leaves only the new target live', () => {
	const observer = observers()
	const raf = frames()
	const ctx = setup()

	ctx.target = ctx.a
	ctx.view.sync()
	raf.flush()

	ctx.target = ctx.b
	ctx.view.sync()
	raf.flush()

	observer[0].trigger(ctx.a)
	raf.flush()

	expect(ctx.calls).toEqual(['a', 'b'])
	expect(observer).toHaveLength(2)
	expect(observer[1].observe).toHaveBeenCalledWith(ctx.b)

	observer[1].trigger(ctx.b)
	raf.flush()

	expect(ctx.calls).toEqual(['a', 'b', 'b'])
	expect(observer[0].unobserve).toHaveBeenCalledWith(ctx.a)
})

test('SSR and missing ResizeObserver are inert', () => {
	const inert = (host: Host) => resize(host, {
		target: () => {
			throw new Error('target should not run')
		},
		onResize: () => {
			throw new Error('onResize should not run')
		},
	}).sync()

	expect(serve(inert)).toBe('<div>server</div>')

	vi.stubGlobal('ResizeObserver', undefined)
	mount(inert, () => 'client')
	expect(document.body.textContent).toBe('client')
})
