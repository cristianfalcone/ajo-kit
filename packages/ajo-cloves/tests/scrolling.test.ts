// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { scrolling } from 'ajo-cloves'

type View = ReturnType<typeof scrolling>

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

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const missing = () => new Error('missing value')

const needView = (value: View | undefined): View => {
	if (value == null) throw missing()
	return value
}

const needDiv = (value: HTMLDivElement | null): HTMLDivElement => {
	if (value == null) throw missing()
	return value
}

const mount = (opts: {
	onScroll?: (el: HTMLElement) => void
	onEnd?: (el: HTMLElement) => void
} = {}) => {
	let view: View | undefined
	let a: HTMLDivElement | null = null
	let b: HTMLDivElement | null = null
	let target: HTMLElement | null = null
	const scrolled: string[] = []
	const ended: string[] = []

	function* Gen(this: Host) {
		view = scrolling(this, {
			target: () => target,
			onScroll: el => {
				scrolled.push(el.dataset.name ?? '')
				opts.onScroll?.(el)
			},
			onEnd: opts.onEnd
				? el => {
					ended.push(el.dataset.name ?? '')
					opts.onEnd?.(el)
				}
				: undefined,
		})

		yield [
			jsx('div', { key: 'a', 'data-name': 'a', ref: (element: unknown) => a = element as HTMLDivElement | null }),
			jsx('div', { key: 'b', 'data-name': 'b', ref: (element: unknown) => b = element as HTMLDivElement | null }),
		]
	}

	render(jsx(Gen, {}), document.body)

	return {
		ended,
		scrolled,
		set target(next: HTMLElement | null) {
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
	const ctx = mount()

	expect(Object.keys(ctx.view)).toEqual(['sync'])
})

test('initial sync and many scroll events coalesce into one frame callback', () => {
	const raf = installRaf()
	const ctx = mount()

	try {
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
	} finally {
		raf.restore()
	}
})

test('retargeting aborts the old listeners and leaves only the new target live', () => {
	const raf = installRaf()
	const ctx = mount({ onEnd: () => {} })

	try {
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
	} finally {
		raf.restore()
	}
})

test('SSR sync is inert and does not resolve the target', () => {
	function* Gen(this: Host) {
		const view = scrolling(this, {
			target: () => {
				throw new Error('target should not run on the server')
			},
			onScroll: () => {
				throw new Error('onScroll should not run on the server')
			},
		})

		view.sync()
		yield jsx('span', { children: 'server' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
})
