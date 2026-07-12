// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { resize } from 'ajo-cloves'

type View = ReturnType<typeof resize>

type RafStub = {
	flush(): number
	restore(): void
}

type Instance = {
	callback: ResizeObserverCallback
	disconnect: ReturnType<typeof vi.fn>
	observe: ReturnType<typeof vi.fn>
	trigger: (el: Element) => void
	unobserve: ReturnType<typeof vi.fn>
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

const installObserver = ({ failFirstObserve = false } = {}) => {
	const instances: Instance[] = []
	const Original = globalThis.ResizeObserver
	let failed = false

	class FakeResizeObserver {
		callback: ResizeObserverCallback
		disconnect = vi.fn()
		observe = vi.fn(() => {
			if (failFirstObserve && !failed) {
				failed = true
				throw new Error('observe failed')
			}
		})
		unobserve = vi.fn()

		constructor(callback: ResizeObserverCallback) {
			this.callback = callback
			instances.push({
				callback,
				disconnect: this.disconnect,
				observe: this.observe,
				trigger: (el: Element) => callback([{ target: el } as ResizeObserverEntry], this as unknown as ResizeObserver),
				unobserve: this.unobserve,
			})
		}
	}

	Object.defineProperty(globalThis, 'ResizeObserver', {
		configurable: true,
		value: FakeResizeObserver,
	})

	return {
		instances,
		restore() {
			Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: Original })
		},
	}
}

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const missing = () => new Error('missing value')

const needView = (value: View | undefined): View => {
	if (value == null) throw missing()
	return value
}

const needHost = (value: Host | null): Host => {
	if (value == null) throw missing()
	return value
}

const needDiv = (value: HTMLDivElement | null): HTMLDivElement => {
	if (value == null) throw missing()
	return value
}

const mount = () => {
	let view: View | undefined
	let a: HTMLDivElement | null = null
	let b: HTMLDivElement | null = null
	let target: Element | null = null
	const calls: string[] = []

	function* Gen(this: Host) {
		view = resize(this, {
			target: () => target,
			onResize: el => calls.push((el as HTMLElement).dataset.name ?? ''),
		})

		yield [
			jsx('div', { key: 'a', 'data-name': 'a', ref: (element: unknown) => a = element as HTMLDivElement | null }),
			jsx('div', { key: 'b', 'data-name': 'b', ref: (element: unknown) => b = element as HTMLDivElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	return {
		calls,
		set target(next: Element | null) {
			target = next
		},
		get a() {
			return needDiv(a)
		},
		get b() {
			return needDiv(b)
		},
		get view() {
			return needView(view)
		},
	}
}

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	vi.restoreAllMocks()
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	const observer = installObserver()
	const ctx = mount()

	try {
		expect(Object.keys(ctx.view)).toEqual(['sync'])
	} finally {
		observer.restore()
	}
})

test('two hosts share one ResizeObserver entry and disconnect after the last unsubscribe', () => {
	const observer = installObserver()
	const raf = installRaf()
	let target: HTMLDivElement | null = null
	let hostA: Host | null = null
	let hostB: Host | null = null
	let viewA: View | undefined
	let viewB: View | undefined
	const calls: string[] = []

	function* Child(this: Host, args: { name: string }) {
		const view = resize(this, {
			target: () => target,
			onResize: () => calls.push(args.name),
		})

		if (args.name === 'a') viewA = view
		else viewB = view

		yield jsx('span', { children: args.name })
	}

	function* Gen(this: Host) {
		yield [
			jsx('div', { key: 'target', ref: (element: unknown) => target = element as HTMLDivElement | null }),
			jsx(Child, { key: 'a', name: 'a', ref: (element: unknown) => hostA = element as Host | null }),
			jsx(Child, { key: 'b', name: 'b', ref: (element: unknown) => hostB = element as Host | null }),
		]
	}

	try {
		render(jsx(Gen, {}), document.body)

		needView(viewA).sync()
		needView(viewB).sync()

		expect(observer.instances).toHaveLength(1)
		expect(observer.instances[0].observe).toHaveBeenCalledTimes(1)
		expect(observer.instances[0].observe).toHaveBeenCalledWith(needDiv(target))

		observer.instances[0].trigger(needDiv(target))
		raf.flush()

		expect(calls).toEqual(['a', 'b'])

		needHost(hostA).return()
		observer.instances[0].trigger(needDiv(target))
		raf.flush()

		expect(calls).toEqual(['a', 'b', 'b'])
		expect(observer.instances[0].unobserve).not.toHaveBeenCalled()
		expect(observer.instances[0].disconnect).not.toHaveBeenCalled()

		needHost(hostB).return()

		expect(observer.instances[0].unobserve).toHaveBeenCalledWith(needDiv(target))
		expect(observer.instances[0].disconnect).toHaveBeenCalledTimes(1)
		observer.instances[0].trigger(needDiv(target))
		expect(raf.flush()).toBe(0)
		expect(calls).toEqual(['a', 'b', 'b'])

		needHost(hostB).next()
		needView(viewB).sync()
		expect(observer.instances).toHaveLength(2)
		expect(observer.instances[1].observe).toHaveBeenCalledWith(needDiv(target))
		expect(raf.flush()).toBe(1)
		expect(calls).toEqual(['a', 'b', 'b', 'b'])
		observer.instances[0].trigger(needDiv(target))
		expect(raf.flush()).toBe(0)
		expect(calls).toEqual(['a', 'b', 'b', 'b'])
		observer.instances[1].trigger(needDiv(target))
		raf.flush()
		expect(calls).toEqual(['a', 'b', 'b', 'b', 'b'])
	} finally {
		raf.restore()
		observer.restore()
	}
})

test('initial sync and many observer notifications coalesce into one frame callback', () => {
	const observer = installObserver()
	const raf = installRaf()
	const ctx = mount()

	try {
		ctx.target = ctx.a
		ctx.view.sync()
		observer.instances[0].trigger(ctx.a)
		observer.instances[0].trigger(ctx.a)
		observer.instances[0].trigger(ctx.a)

		expect(ctx.calls).toEqual([])
		expect(raf.flush()).toBe(1)
		expect(ctx.calls).toEqual(['a'])

		observer.instances[0].trigger(ctx.a)
		raf.flush()

		expect(ctx.calls).toEqual(['a', 'a'])
	} finally {
		raf.restore()
		observer.restore()
	}
})

test('retargeting unregisters the old element and leaves only the new target live', () => {
	const observer = installObserver()
	const raf = installRaf()
	const ctx = mount()

	try {
		ctx.target = ctx.a
		ctx.view.sync()
		raf.flush()

		ctx.target = ctx.b
		ctx.view.sync()
		raf.flush()

		observer.instances[0].trigger(ctx.a)
		raf.flush()

		expect(ctx.calls).toEqual(['a', 'b'])
		expect(observer.instances).toHaveLength(2)
		expect(observer.instances[1].observe).toHaveBeenCalledWith(ctx.b)

		observer.instances[1].trigger(ctx.b)
		raf.flush()

		expect(ctx.calls).toEqual(['a', 'b', 'b'])
		expect(observer.instances[0].unobserve).toHaveBeenCalledWith(ctx.a)
	} finally {
		raf.restore()
		observer.restore()
	}
})

test('a failed first observe rolls back so the same target can retry', () => {
	const observer = installObserver({ failFirstObserve: true })
	const raf = installRaf()
	const ctx = mount()

	try {
		ctx.target = ctx.a
		expect(() => ctx.view.sync()).toThrow('observe failed')
		expect(observer.instances).toHaveLength(1)
		expect(observer.instances[0].observe).toHaveBeenCalledTimes(1)
		expect(observer.instances[0].unobserve).toHaveBeenCalledWith(ctx.a)
		expect(observer.instances[0].disconnect).toHaveBeenCalledTimes(1)

		ctx.view.sync()
		expect(observer.instances).toHaveLength(2)
		expect(observer.instances[1].observe).toHaveBeenCalledWith(ctx.a)
		expect(raf.flush()).toBe(1)
		expect(ctx.calls).toEqual(['a'])
	} finally {
		raf.restore()
		observer.restore()
	}
})

test('SSR and missing ResizeObserver are inert', () => {
	const Original = globalThis.ResizeObserver

	Object.defineProperty(globalThis, 'ResizeObserver', {
		configurable: true,
		value: undefined,
	})

	function* Gen(this: Host) {
		const view = resize(this, {
			target: () => {
				throw new Error('target should not run')
			},
			onResize: () => {
				throw new Error('onResize should not run')
			},
		})

		view.sync()
		yield jsx('span', { children: 'server' })
	}

	try {
		render(jsx(Gen, {}), document.body)
		expect(document.body.textContent).toBe('server')
		expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
	} finally {
		Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: Original })
	}
})
