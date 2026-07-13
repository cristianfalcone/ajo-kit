// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'
import { indicator } from 'ajo-cloves'

type View = ReturnType<typeof indicator>

const needDiv = (value: HTMLDivElement | null): HTMLDivElement => {
	if (value == null) throw new Error('missing value')
	return value
}

const needEl = (value: HTMLElement | null): HTMLElement => {
	if (value == null) throw new Error('missing value')
	return value
}

const needView = (value: View | null): View => {
	if (value == null) throw new Error('missing value')
	return value
}

const installRaf = () => {
	const callbacks = new Map<number, FrameRequestCallback>()
	const originalRaf = globalThis.requestAnimationFrame
	const originalCancel = globalThis.cancelAnimationFrame
	let next = 1

	Object.defineProperty(globalThis, 'requestAnimationFrame', {
		configurable: true,
		value: (callback: FrameRequestCallback) => {
			const handle = next++
			callbacks.set(handle, callback)
			return handle
		},
	})
	Object.defineProperty(globalThis, 'cancelAnimationFrame', {
		configurable: true,
		value: (handle: number) => callbacks.delete(handle),
	})

	return {
		flush() {
			const pending = [...callbacks]
			callbacks.clear()
			for (const [handle, callback] of pending) callback(handle)
		},
		restore() {
			Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: originalRaf })
			Object.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: originalCancel })
		},
	}
}

const rect = (element: HTMLElement, box: { left: number; top: number; width: number; height: number }) => {
	Object.defineProperty(element, 'getBoundingClientRect', {
		configurable: true,
		value: () => ({ ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top }),
	})
}

afterEach(() => {
	render(null, document.body)
	vi.restoreAllMocks()
	document.body.textContent = ''
})

test('stamps the marked child box as variables and reveals the marker a frame later', () => {
	const raf = installRaf()
	let container: HTMLDivElement | null = null
	let view: View | null = null

	function* Gen(this: Host) {
		view = indicator(this, {
			target: () => container,
			of: root => root.querySelector<HTMLElement>('[data-state="active"]'),
		})
		yield jsx('div', {
			ref: (element: unknown) => container = element as HTMLDivElement | null,
			children: [
				jsx('button', { key: 'a', 'data-state': 'active' }),
				jsx('button', { key: 'b' }),
			],
		})
	}

	try {
		render(jsx(Gen, {}), document.body)
		const list = needDiv(container)
		const mark = needEl(list.querySelector<HTMLElement>('[data-state="active"]'))
		rect(list, { left: 10, top: 20, width: 300, height: 40 })
		rect(mark, { left: 60, top: 24, width: 80, height: 32 })

		needView(view).sync()
		raf.flush()

		expect(list.style.getPropertyValue('--indicator-x')).toBe('50px')
		expect(list.style.getPropertyValue('--indicator-y')).toBe('4px')
		expect(list.style.getPropertyValue('--indicator-w')).toBe('80px')
		expect(list.style.getPropertyValue('--indicator-h')).toBe('32px')
		// Variables land first; the marker attribute waits one frame so themed
		// pseudo-elements first paint already in position.
		expect(list.hasAttribute('data-indicator')).toBe(false)
		raf.flush()
		expect(list.getAttribute('data-indicator')).toBe('true')
	} finally {
		raf.restore()
	}
})

test('drops the marker when no child matches and cleans up on abort', () => {
	const raf = installRaf()
	let container: HTMLDivElement | null = null
	let active = true
	let view: View | null = null

	function* Gen(this: Host) {
		view = indicator(this, {
			target: () => container,
			of: root => active ? root.querySelector<HTMLElement>('button') : null,
		})
		yield jsx('div', {
			ref: (element: unknown) => container = element as HTMLDivElement | null,
			children: jsx('button', {}),
		})
	}

	try {
		render(jsx(Gen, {}), document.body)
		const list = needDiv(container)
		rect(list, { left: 0, top: 0, width: 100, height: 20 })
		rect(needEl(list.querySelector<HTMLElement>('button')), { left: 5, top: 2, width: 40, height: 16 })

		needView(view).sync()
		raf.flush()
		raf.flush()
		expect(list.getAttribute('data-indicator')).toBe('true')

		active = false
		needView(view).sync()
		raf.flush()
		expect(list.hasAttribute('data-indicator')).toBe(false)
		// Variables stay for a seamless return, only the marker drops.
		expect(list.style.getPropertyValue('--indicator-w')).toBe('40px')

		active = true
		render(null, document.body)
		expect(list.style.getPropertyValue('--indicator-w')).toBe('')
	} finally {
		raf.restore()
	}
})

test('re-measures on configured container events without a re-render', () => {
	const raf = installRaf()
	let container: HTMLDivElement | null = null
	let view: View | null = null

	function* Gen(this: Host) {
		view = indicator(this, {
			target: () => container,
			of: root => root.querySelector<HTMLElement>('[data-highlighted="true"]'),
			on: ['focusin'],
		})
		yield jsx('div', {
			ref: (element: unknown) => container = element as HTMLDivElement | null,
			children: [
				jsx('button', { key: 'a', 'data-highlighted': 'true' }),
				jsx('button', { key: 'b' }),
			],
		})
	}

	try {
		render(jsx(Gen, {}), document.body)
		const list = needDiv(container)
		const [first, second] = Array.from(list.querySelectorAll('button'))
		rect(list, { left: 0, top: 0, width: 200, height: 60 })
		rect(first, { left: 0, top: 0, width: 200, height: 30 })
		rect(second, { left: 0, top: 30, width: 200, height: 30 })

		needView(view).sync()
		raf.flush()
		expect(list.style.getPropertyValue('--indicator-y')).toBe('0px')

		// The mark moves through direct DOM mutation plus focus, no re-render.
		first.removeAttribute('data-highlighted')
		second.setAttribute('data-highlighted', 'true')
		list.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
		raf.flush()
		expect(list.style.getPropertyValue('--indicator-y')).toBe('30px')
	} finally {
		raf.restore()
	}
})
