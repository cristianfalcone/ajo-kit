// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { live } from '../src/core'
import { frames, must } from './harness'

type View = ReturnType<typeof live<HTMLElement>>

type Binding = {
	element: HTMLElement
	notify: () => void
	signal: AbortSignal
}

const mount = () => {
	let host: Host | null = null
	let target: HTMLElement | null = null
	let a: HTMLDivElement | null = null
	let b: HTMLDivElement | null = null
	let resolved = 0
	const bindings: Binding[] = []
	const changes: string[] = []
	const views: View[] = []

	function* Gen(this: Host) {
		const view = live<HTMLElement>(this, {
			target: () => {
				resolved++
				return target
			},
			onChange: element => changes.push(element.dataset.name ?? ''),
			bind: (element, notify, signal) => {
				const binding = { element, notify, signal }
				bindings.push(binding)
				element.addEventListener('unit-live', notify, { signal })
			},
		})

		views.push(view)

		yield [
			jsx('div', { key: 'a', 'data-name': 'a', ref: (element: unknown) => a = element as HTMLDivElement | null }),
			jsx('div', { key: 'b', 'data-name': 'b', ref: (element: unknown) => b = element as HTMLDivElement | null }),
		]
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	return {
		bindings,
		changes,
		views,
		get a() {
			return must(a)
		},
		get b() {
			return must(b)
		},
		get host() {
			return must(host)
		},
		get resolved() {
			return resolved
		},
		get view() {
			return must(views.at(-1))
		},
		set target(element: HTMLElement | null) {
			target = element
		},
	}
}

test('same target does not rebind and initial plus repeated notifications share one frame', () => {
	const raf = frames()
	const ctx = mount()

	ctx.target = ctx.a
	ctx.view.sync()

	const binding = must(ctx.bindings[0])
	binding.notify()
	binding.notify()
	ctx.a.dispatchEvent(new Event('unit-live'))
	ctx.view.sync()

	expect(ctx.bindings.map(item => item.element.dataset.name)).toEqual(['a'])
	expect(ctx.changes).toEqual([])
	expect(raf.flush()).toBe(1)
	expect(ctx.changes).toEqual(['a'])

	binding.notify()
	binding.notify()
	expect(raf.flush()).toBe(1)
	expect(ctx.changes).toEqual(['a', 'a'])
})

test('retargeting and null cancel pending work, old listeners, and captured notifications', () => {
	const raf = frames()
	const ctx = mount()

	ctx.target = ctx.a
	ctx.view.sync()
	const old = must(ctx.bindings[0])

	ctx.target = ctx.b
	ctx.view.sync()
	const current = must(ctx.bindings[1])

	expect(old.signal.aborted).toBe(true)
	expect(raf.flush()).toBe(1)
	expect(ctx.changes).toEqual(['b'])

	ctx.a.dispatchEvent(new Event('unit-live'))
	old.notify()
	expect(raf.flush()).toBe(0)
	expect(ctx.changes).toEqual(['b'])

	ctx.b.dispatchEvent(new Event('unit-live'))
	ctx.target = null
	ctx.view.sync()
	expect(current.signal.aborted).toBe(true)
	current.notify()
	expect(raf.flush()).toBe(0)
	expect(ctx.changes).toEqual(['b'])

	ctx.view.sync()
	expect(ctx.bindings).toHaveLength(2)

	ctx.target = ctx.b
	ctx.view.sync()
	expect(ctx.bindings).toHaveLength(3)
	expect(raf.flush()).toBe(1)
	expect(ctx.changes).toEqual(['b', 'b'])

	ctx.target = ctx.a
	ctx.view.sync()
	expect(ctx.bindings).toHaveLength(4)
	expect(raf.flush()).toBe(1)
	expect(ctx.changes).toEqual(['b', 'b', 'a'])

	old.notify()
	expect(raf.flush()).toBe(0)
	expect(ctx.changes).toEqual(['b', 'b', 'a'])
})

test('host reset cancels pending work and leaves the old view inert while a fresh helper works', () => {
	const raf = frames()
	const ctx = mount()

	ctx.target = ctx.a
	ctx.view.sync()
	const oldView = ctx.view
	const oldBinding = must(ctx.bindings[0])
	const resolvedBeforeReset = ctx.resolved

	ctx.host.return()
	ctx.host.next()

	expect(oldBinding.signal.aborted).toBe(true)
	expect(ctx.views).toHaveLength(2)
	expect(raf.flush()).toBe(0)

	const bindingsAfterReset = ctx.bindings.length
	oldView.sync()
	expect(ctx.resolved).toBe(resolvedBeforeReset)
	expect(ctx.bindings).toHaveLength(bindingsAfterReset)
	expect(raf.flush()).toBe(0)

	ctx.target = ctx.b
	ctx.view.sync()
	expect(ctx.resolved).toBe(resolvedBeforeReset + 1)
	expect(raf.flush()).toBe(1)
	expect(ctx.changes).toEqual(['b'])
})

test('refresh schedules the current target once per frame and is inert without one', () => {
	const raf = frames()
	const ctx = mount()

	ctx.view.refresh()
	expect(raf.flush()).toBe(0)

	ctx.target = ctx.a
	ctx.view.sync()
	ctx.view.refresh()
	expect(raf.flush()).toBe(1)
	expect(ctx.changes).toEqual(['a'])

	ctx.view.sync()
	ctx.view.refresh()
	must(ctx.bindings[0]).notify()
	ctx.view.refresh()
	expect(raf.flush()).toBe(1)
	expect(ctx.changes).toEqual(['a', 'a'])

	ctx.target = null
	ctx.view.sync()
	ctx.view.refresh()
	expect(raf.flush()).toBe(0)

	ctx.target = ctx.b
	ctx.view.sync()
	ctx.host.return()
	ctx.view.refresh()
	expect(raf.flush()).toBe(0)
	expect(ctx.changes).toEqual(['a', 'a'])
})
