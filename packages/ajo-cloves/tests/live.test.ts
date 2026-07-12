// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { live, type Host } from '../src/core'

type View = ReturnType<typeof live<HTMLElement>>

type Binding = {
	element: HTMLElement
	notify: () => void
	signal: AbortSignal
}

type RafStub = {
	flush(): number
	restore(): void
}

const installRaf = (): RafStub => {
	const callbacks = new Map<number, FrameRequestCallback>()
	const originalRaf = globalThis.requestAnimationFrame
	const originalCancel = globalThis.cancelAnimationFrame
	let next = 1

	Object.defineProperty(globalThis, 'requestAnimationFrame', {
		configurable: true,
		value: (callback: FrameRequestCallback) => {
			const id = next++
			callbacks.set(id, callback)
			return id
		},
	})

	Object.defineProperty(globalThis, 'cancelAnimationFrame', {
		configurable: true,
		value: (id: number) => callbacks.delete(id),
	})

	return {
		flush() {
			const pending = [...callbacks]
			callbacks.clear()
			for (const [id, callback] of pending) callback(id)
			return pending.length
		},
		restore() {
			Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: originalRaf })
			Object.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: originalCancel })
		},
	}
}

const missing = () => new Error('missing value')

const need = <T,>(value: T | null | undefined): T => {
	if (value == null) throw missing()
	return value
}

const mount = (onBind?: (binding: Binding) => void) => {
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
				onBind?.(binding)
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
			return need(a)
		},
		get b() {
			return need(b)
		},
		get host() {
			return need(host)
		},
		get resolved() {
			return resolved
		},
		get view() {
			return need(views.at(-1))
		},
		set target(element: HTMLElement | null) {
			target = element
		},
	}
}

beforeEach(() => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
})

afterEach(() => {
	render(null, document.body)
	vi.restoreAllMocks()
	document.body.textContent = ''
})

test('same target does not rebind and initial plus repeated notifications share one frame', () => {
	const raf = installRaf()
	const ctx = mount()

	try {
		ctx.target = ctx.a
		ctx.view.sync()

		const binding = need(ctx.bindings[0])
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
	} finally {
		raf.restore()
	}
})

test('retargeting and null cancel pending work, old listeners, and captured notifications', () => {
	const raf = installRaf()
	const ctx = mount()

	try {
		ctx.target = ctx.a
		ctx.view.sync()
		const old = need(ctx.bindings[0])

		ctx.target = ctx.b
		ctx.view.sync()
		const current = need(ctx.bindings[1])

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
	} finally {
		raf.restore()
	}
})

test('host reset cancels pending work and leaves the old view inert while a fresh helper works', () => {
	const raf = installRaf()
	const ctx = mount()

	try {
		ctx.target = ctx.a
		ctx.view.sync()
		const oldView = ctx.view
		const oldBinding = need(ctx.bindings[0])
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
	} finally {
		raf.restore()
	}
})

test('a failed partial bind rolls back and can retry the same target', () => {
	const raf = installRaf()
	let attempts = 0
	const ctx = mount(binding => {
		if (attempts++ === 0) {
			binding.notify()
			throw new Error('bind failed')
		}
	})

	try {
		ctx.target = ctx.a
		expect(() => ctx.view.sync()).toThrow('bind failed')

		const failed = need(ctx.bindings[0])
		expect(failed.signal.aborted).toBe(true)
		ctx.a.dispatchEvent(new Event('unit-live'))
		failed.notify()
		expect(raf.flush()).toBe(0)
		expect(ctx.changes).toEqual([])

		ctx.view.sync()
		expect(ctx.bindings).toHaveLength(2)
		expect(raf.flush()).toBe(1)
		expect(ctx.changes).toEqual(['a'])
	} finally {
		raf.restore()
	}
})
