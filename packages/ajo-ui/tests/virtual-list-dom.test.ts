// @vitest-environment happy-dom
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'
import { VirtualList, type VirtualListApi } from '../src/virtual-list'

afterEach(() => render(null, document.body))

type Item = { id: string; label: string }

const settle = async () => {
	for (let turn = 0; turn < 8; turn++) await new Promise<void>(resolve => queueMicrotask(resolve))
	await new Promise<void>(resolve => {
		if (window.requestAnimationFrame) window.requestAnimationFrame(() => resolve())
		else setTimeout(resolve, 0)
	})
	for (let turn = 0; turn < 4; turn++) await new Promise<void>(resolve => queueMicrotask(resolve))
}

const installResizeObserver = () => {
	const Original = window.ResizeObserver
	const instances: Array<{
		callback: ResizeObserverCallback
		disconnect: ReturnType<typeof vi.fn>
		observed: Set<Element>
		unobserve: ReturnType<typeof vi.fn>
	}> = []

	class FakeResizeObserver {
		callback: ResizeObserverCallback
		observed = new Set<Element>()
		disconnect = vi.fn(() => this.observed.clear())
		observe = vi.fn((target: Element) => this.observed.add(target))
		unobserve = vi.fn((target: Element) => this.observed.delete(target))

		constructor(callback: ResizeObserverCallback) {
			this.callback = callback
			instances.push(this)
		}
	}

	Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: FakeResizeObserver })

	return {
		instances,
		restore: () => Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: Original }),
		trigger(target: Element, blockSize: number) {
			const entry = {
				borderBoxSize: [{ blockSize, inlineSize: 320 }],
				target,
			} as unknown as ResizeObserverEntry
			for (const observer of instances) {
				if (observer.observed.has(target)) observer.callback([entry], observer as unknown as ResizeObserver)
			}
		},
	}
}

const view = (items: readonly Item[], ref: (element: HTMLUListElement | null) => void) => jsx(VirtualList, {
	estimateSize: 40,
	getItemKey: (item: Item) => item.id,
	items,
	prerender: 1,
	ref,
	renderItem: (item: Item) => item.label,
})

test('SSR stays inert in a DOM realm and never publishes a controller', async () => {
	let api: VirtualListApi<string> | undefined
	const html = ssr(jsx(VirtualList, {
		estimateSize: 20,
		getItemKey: (item: Item) => item.id,
		items: [
			{ id: 'first', label: 'First' },
			{ id: 'second', label: 'Second' },
		],
		prerender: 1,
		renderItem: (item: Item) => item.label,
		setApi: (next: VirtualListApi<string>) => api = next,
	}))

	expect(html.match(/data-slot="virtual-list-item"/g)).toHaveLength(1)
	await settle()
	expect(api).toBeUndefined()
})

test('the list host consumes fresh snapshots and forwards its lifecycle ref', () => {
	const refs: Array<HTMLUListElement | null> = []
	const capture = (element: HTMLUListElement | null) => refs.push(element)

	render(view([{ id: 'first', label: 'First' }], capture), document.body)
	const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	const row = root?.querySelector('[data-slot="virtual-list-item"]')
	expect(root).toBe(refs.at(-1))
	expect(root?.textContent).toContain('First')

	render(view([{ id: 'first', label: 'Updated' }], capture), document.body)
	expect(root?.querySelector('[data-slot="virtual-list-item"]')).toBe(row)
	expect(root?.textContent).toContain('Updated')

	render(view([{ id: 'second', label: 'Second' }], capture), document.body)
	expect(document.querySelector('[data-slot="virtual-list"]')).toBe(root)
	expect(root?.textContent).toContain('Second')
	expect(root?.textContent).not.toContain('First')

	render(null, document.body)
	expect(refs.at(-1)).toBeNull()
})

test('membership changes require a new items snapshot', () => {
	const items = [{ id: 'first', label: 'First' }]
	const capture = () => undefined
	render(view(items, capture), document.body)
	items.push({ id: 'second', label: 'Second' })

	expect(() => render(view(items, capture), document.body)).toThrowError(
		'VirtualList mutated items',
	)
})

test('a connected list replaces prerender rows with a bounded viewport range', async () => {
	const items = Array.from({ length: 100 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }))
	render(jsx(VirtualList, {
		estimateSize: 20,
		getItemKey: (item: Item) => item.id,
		items,
		overscan: 1,
		prerender: 20,
		renderItem: (item: Item) => item.label,
	}), document.body)

	const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	if (!root) throw new Error('VirtualList root did not render')
	expect(root.querySelectorAll('[data-slot="virtual-list-item"]')).toHaveLength(20)
	Object.defineProperties(root, {
		clientHeight: { configurable: true, value: 100 },
		offsetHeight: { configurable: true, value: 100 },
		offsetWidth: { configurable: true, value: 320 },
		scrollHeight: { configurable: true, value: 2000 },
		scrollTo: {
			configurable: true,
			value: ({ top = 0 }: ScrollToOptions) => root.scrollTop = top,
		},
	})

	await settle()

	const rows = root.querySelectorAll('[data-slot="virtual-list-item"]')
	expect(rows).toHaveLength(6)
	expect(Array.from(rows, row => row.textContent)).toEqual([
		'Item 0',
		'Item 1',
		'Item 2',
		'Item 3',
		'Item 4',
		'Item 5',
	])
})

test('scroll geometry changes coalesce into one render frame', async () => {
	const items = Array.from({ length: 100 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }))
	render(jsx(VirtualList, {
		estimateSize: 20,
		getItemKey: (item: Item) => item.id,
		items,
		overscan: 1,
		prerender: 4,
		renderItem: (item: Item) => item.label,
	}), document.body)

	const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	if (!root) throw new Error('VirtualList root did not render')
	Object.defineProperties(root, {
		clientHeight: { configurable: true, value: 100 },
		offsetHeight: { configurable: true, value: 100 },
		offsetWidth: { configurable: true, value: 320 },
		scrollHeight: { configurable: true, value: 2000 },
	})
	await settle()

	const original = window.requestAnimationFrame
	const frames: FrameRequestCallback[] = []
	Object.defineProperty(window, 'requestAnimationFrame', {
		configurable: true,
		value: (callback: FrameRequestCallback) => {
			frames.push(callback)
			return frames.length
		},
	})
	try {
		root.scrollTop = 500
		root.dispatchEvent(new Event('scroll'))
		await new Promise<void>(resolve => queueMicrotask(resolve))
		root.scrollTop = 1000
		root.dispatchEvent(new Event('scroll'))
		await new Promise<void>(resolve => queueMicrotask(resolve))
		expect(frames).toHaveLength(1)

		frames[0]!(performance.now())
		for (let turn = 0; turn < 4; turn++) await new Promise<void>(resolve => queueMicrotask(resolve))
		expect(Array.from(root.querySelectorAll('[data-slot="virtual-list-item"]'), row => row.textContent))
			.toContain('Item 50')
	} finally {
		Object.defineProperty(window, 'requestAnimationFrame', { configurable: true, value: original })
	}
})

test('returning to rendered geometry cancels a stale pending frame', async () => {
	const items = Array.from({ length: 100 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }))
	render(jsx(VirtualList, {
		estimateSize: 20,
		getItemKey: (item: Item) => item.id,
		items,
		overscan: 1,
		prerender: 4,
		renderItem: (item: Item) => item.label,
	}), document.body)

	const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	if (!root) throw new Error('VirtualList root did not render')
	Object.defineProperties(root, {
		clientHeight: { configurable: true, value: 100 },
		offsetHeight: { configurable: true, value: 100 },
		offsetWidth: { configurable: true, value: 320 },
		scrollHeight: { configurable: true, value: 2000 },
	})
	await settle()

	const originalRequest = window.requestAnimationFrame
	const originalCancel = window.cancelAnimationFrame
	const frames = new Map<number, FrameRequestCallback>()
	let nextFrame = 0
	Object.defineProperties(window, {
		cancelAnimationFrame: {
			configurable: true,
			value: (handle: number) => frames.delete(handle),
		},
		requestAnimationFrame: {
			configurable: true,
			value: (callback: FrameRequestCallback) => {
				const handle = ++nextFrame
				frames.set(handle, callback)
				return handle
			},
		},
	})
	try {
		root.scrollTop = 500
		root.dispatchEvent(new Event('scroll'))
		await new Promise<void>(resolve => queueMicrotask(resolve))
		expect(frames.size).toBe(1)

		root.scrollTop = 0
		root.dispatchEvent(new Event('scroll'))
		await new Promise<void>(resolve => queueMicrotask(resolve))
		expect(frames.size).toBe(0)
		expect(Array.from(root.querySelectorAll('[data-slot="virtual-list-item"]'), row => row.textContent))
			.toContain('Item 0')
	} finally {
		Object.defineProperties(window, {
			cancelAnimationFrame: { configurable: true, value: originalCancel },
			requestAnimationFrame: { configurable: true, value: originalRequest },
		})
	}
})

test('fixed-size virtualization works without ResizeObserver', async () => {
	const Original = window.ResizeObserver
	Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: undefined })
	try {
		const items = Array.from({ length: 100 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }))
		render(jsx(VirtualList, {
			estimateSize: 20,
			getItemKey: (item: Item) => item.id,
			items,
			overscan: 1,
			prerender: 20,
			renderItem: (item: Item) => item.label,
		}), document.body)

		const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
		if (!root) throw new Error('VirtualList root did not render')
		Object.defineProperties(root, {
			clientHeight: { configurable: true, value: 100 },
			offsetHeight: { configurable: true, value: 100 },
			offsetWidth: { configurable: true, value: 320 },
			scrollHeight: { configurable: true, value: 2000 },
		})
		await settle()
		expect(root.querySelectorAll('[data-slot="virtual-list-item"]')).toHaveLength(6)
	} finally {
		render(null, document.body)
		Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: Original })
	}
})

test('an interior reorder keeps each DOM row attached to its logical key', async () => {
	const original = window.ResizeObserver
	Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: undefined })
	try {
		const a = { id: 'a', label: 'A' }
		const b = { id: 'b', label: 'B' }
		const c = { id: 'c', label: 'C' }
		const d = { id: 'd', label: 'D' }
		const renderItems = (items: readonly Item[]) => render(jsx(VirtualList, {
			estimateSize: 20,
			getItemKey: (item: Item) => item.id,
			items,
			prerender: 4,
			renderItem: (item: Item) => item.label,
		}), document.body)

		renderItems([a, b, c, d])
		const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
		if (!root) throw new Error('VirtualList root did not render')
		Object.defineProperties(root, {
			clientHeight: { configurable: true, value: 100 },
			offsetHeight: { configurable: true, value: 100 },
			offsetWidth: { configurable: true, value: 320 },
			scrollHeight: { configurable: true, value: 100 },
		})
		await settle()

		const row = (label: string) => Array.from(root.querySelectorAll<HTMLElement>('[data-slot="virtual-list-item"]'))
			.find(element => element.textContent === label)
		const bRow = row('B')
		const cRow = row('C')
		if (!bRow || !cRow) throw new Error('Expected rows did not render')

		renderItems([a, c, b, d])
		await settle()
		expect(row('B')).toBe(bRow)
		expect(row('C')).toBe(cRow)
		expect(row('B')?.style.top).toBe('40px')
		expect(row('C')?.style.top).toBe('20px')
	} finally {
		render(null, document.body)
		Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: original })
	}
})

test('changing an estimate recomputes unmeasured geometry', async () => {
	const items = [
		{ id: 'a', label: 'A' },
		{ id: 'b', label: 'B' },
		{ id: 'c', label: 'C' },
		{ id: 'd', label: 'D' },
	]
	const renderEstimate = (estimateSize: number) => render(jsx(VirtualList, {
		estimateSize,
		getItemKey: (item: Item) => item.id,
		items,
		prerender: 4,
		renderItem: (item: Item) => item.label,
	}), document.body)

	renderEstimate(20)
	const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	if (!root) throw new Error('VirtualList root did not render')
	Object.defineProperties(root, {
		clientHeight: { configurable: true, value: 100 },
		offsetHeight: { configurable: true, value: 100 },
		offsetWidth: { configurable: true, value: 320 },
		scrollHeight: { configurable: true, value: 160 },
	})
	await settle()
	expect(root.querySelector<HTMLElement>('[data-slot="virtual-list-sizer"]')?.style.height).toBe('80px')

	renderEstimate(40)
	await settle()
	expect(root.querySelector<HTMLElement>('[data-slot="virtual-list-sizer"]')?.style.height).toBe('160px')
})

test('an item-derived estimate follows a new content snapshot with stable keys', async () => {
	type SizedItem = Item & { size: number }
	const estimateSize = (item: SizedItem) => item.size
	const renderItems = (items: readonly SizedItem[]) => render(jsx(VirtualList, {
		estimateSize,
		getItemKey: (item: SizedItem) => item.id,
		items,
		prerender: 2,
		renderItem: (item: SizedItem) => item.label,
	}), document.body)

	renderItems([
		{ id: 'a', label: 'A', size: 20 },
		{ id: 'b', label: 'B', size: 20 },
	])
	const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	if (!root) throw new Error('VirtualList root did not render')
	await settle()
	expect(root.querySelector<HTMLElement>('[data-slot="virtual-list-sizer"]')?.style.height).toBe('40px')

	renderItems([
		{ id: 'a', label: 'A updated', size: 40 },
		{ id: 'b', label: 'B', size: 20 },
	])
	await settle()
	expect(root.querySelector<HTMLElement>('[data-slot="virtual-list-sizer"]')?.style.height).toBe('60px')
})

test('stable rows do not repeat synchronous layout reads on a parent render', async () => {
	const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
	let rowReads = 0
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
		configurable: true,
		get() {
			if ((this as HTMLElement).dataset.slot === 'virtual-list-item') {
				rowReads += 1
				return 20
			}
			return descriptor?.get?.call(this) ?? 0
		},
	})

	try {
		const items = Array.from({ length: 20 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }))
		const renderList = (label: string) => render(jsx(VirtualList, {
			'aria-label': label,
			estimateSize: 20,
			getItemKey: (item: Item) => item.id,
			items,
			prerender: 4,
			renderItem: (item: Item) => item.label,
		}), document.body)

		renderList('First label')
		const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
		if (!root) throw new Error('VirtualList root did not render')
		Object.defineProperties(root, {
			clientHeight: { configurable: true, value: 100 },
			offsetHeight: { configurable: true, value: 100 },
			offsetWidth: { configurable: true, value: 320 },
			scrollHeight: { configurable: true, value: 400 },
		})
		await settle()
		const readsAfterMount = rowReads
		expect(readsAfterMount).toBeGreaterThan(0)

		renderList('Updated label')
		await settle()
		expect(root.getAttribute('aria-label')).toBe('Updated label')
		expect(rowReads).toBe(readsAfterMount)
	} finally {
		if (descriptor) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', descriptor)
		else delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight
	}
})

test('measured row heights replace estimates and reposition following rows', async () => {
	const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
		configurable: true,
		get() {
			if ((this as HTMLElement).dataset.slot === 'virtual-list-item') {
				return (this as HTMLElement).getAttribute('aria-posinset') === '1' ? 40 : 20
			}
			return original?.get?.call(this) ?? 0
		},
	})

	try {
		const items = Array.from({ length: 100 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }))
		render(jsx(VirtualList, {
			estimateSize: 20,
			getItemKey: (item: Item) => item.id,
			items,
			overscan: 1,
			prerender: 4,
			renderItem: (item: Item) => item.label,
		}), document.body)

		const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
		if (!root) throw new Error('VirtualList root did not render')
		Object.defineProperties(root, {
			clientHeight: { configurable: true, value: 100 },
			offsetHeight: { configurable: true, value: 100 },
			offsetWidth: { configurable: true, value: 320 },
			scrollHeight: { configurable: true, value: 2020 },
		})
		await settle()

		const rows = root.querySelectorAll<HTMLElement>('[data-slot="virtual-list-item"]')
		expect(rows[1]?.style.top).toBe('40px')
		expect(root.querySelector<HTMLElement>('[data-slot="virtual-list-sizer"]')?.style.height).toBe('2020px')
	} finally {
		if (original) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', original)
		else delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight
	}
})

test('zero measurements retain the estimate or last positive keyed size', async () => {
	const observer = installResizeObserver()
	try {
		const items = Array.from({ length: 10 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }))
		render(jsx(VirtualList, {
			estimateSize: 20,
			getItemKey: (item: Item) => item.id,
			items,
			overscan: 1,
			prerender: 4,
			renderItem: (item: Item) => item.label,
		}), document.body)

		const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
		if (!root) throw new Error('VirtualList root did not render')
		Object.defineProperties(root, {
			clientHeight: { configurable: true, value: 100 },
			offsetHeight: { configurable: true, value: 100 },
			offsetWidth: { configurable: true, value: 320 },
			scrollHeight: { configurable: true, value: 220 },
		})
		await settle()

		const first = root.querySelector<HTMLElement>('[data-slot="virtual-list-item"]')
		const sizer = root.querySelector<HTMLElement>('[data-slot="virtual-list-sizer"]')
		if (!first || !sizer) throw new Error('VirtualList rows did not render')
		const height = () => root.querySelector<HTMLElement>('[data-slot="virtual-list-sizer"]')?.style.height
		expect(height()).toBe('200px')
		expect(observer.instances.some(instance => instance.observed.has(first))).toBe(true)

		observer.trigger(first, 40)
		await settle()
		expect(height()).toBe('220px')
		expect(root.querySelector('[data-slot="virtual-list-sizer"]')).toBe(sizer)

		observer.trigger(first, 0)
		await settle()
		expect(height()).toBe('220px')
	} finally {
		render(null, document.body)
		observer.restore()
	}
})

test('reordering a new snapshot keeps measurements attached to item keys', async () => {
	const observer = installResizeObserver()
	try {
		const renderItems = (items: readonly Item[]) => render(jsx(VirtualList, {
			estimateSize: 20,
			getItemKey: (item: Item) => item.id,
			items,
			overscan: 1,
			prerender: 3,
			renderItem: (item: Item) => item.label,
		}), document.body)
		const a = { id: 'a', label: 'A' }
		const b = { id: 'b', label: 'B' }
		const c = { id: 'c', label: 'C' }
		renderItems([a, b, c])

		const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
		if (!root) throw new Error('VirtualList root did not render')
		Object.defineProperties(root, {
			clientHeight: { configurable: true, value: 100 },
			offsetHeight: { configurable: true, value: 100 },
			offsetWidth: { configurable: true, value: 320 },
			scrollHeight: { configurable: true, value: 80 },
		})
		await settle()

		const row = (label: string) => Array.from(root.querySelectorAll<HTMLElement>('[data-slot="virtual-list-item"]'))
			.find(element => element.textContent === label)
		const aRow = row('A')
		const bRow = row('B')
		if (!aRow || !bRow) throw new Error('Measured rows did not render')
		observer.trigger(aRow, 40)
		observer.trigger(bRow, 30)
		await settle()
		expect(root.querySelector<HTMLElement>('[data-slot="virtual-list-sizer"]')?.style.height).toBe('90px')

		renderItems([b, a, c])
		await settle()
		expect(row('A')).toBe(aRow)
		expect(row('B')).toBe(bRow)
		expect(row('A')?.style.top).toBe('30px')
		expect(row('C')?.style.top).toBe('70px')
		expect(root.querySelector<HTMLElement>('[data-slot="virtual-list-sizer"]')?.style.height).toBe('90px')
	} finally {
		render(null, document.body)
		observer.restore()
	}
})

test('append, prepend, delete, and content replacement converge from new snapshots', async () => {
	const renderItems = (items: readonly Item[]) => render(jsx(VirtualList, {
		estimateSize: 20,
		getItemKey: (item: Item) => item.id,
		items,
		overscan: 1,
		prerender: 4,
		renderItem: (item: Item) => item.label,
	}), document.body)
	const labels = () => Array.from(
		document.querySelectorAll('[data-slot="virtual-list-item"]'),
		row => row.textContent,
	)
	const a = { id: 'a', label: 'A' }
	const b = { id: 'b', label: 'B' }
	const c = { id: 'c', label: 'C' }
	const d = { id: 'd', label: 'D' }

	renderItems([b, c])
	const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	if (!root) throw new Error('VirtualList root did not render')
	Object.defineProperties(root, {
		clientHeight: { configurable: true, value: 100 },
		offsetHeight: { configurable: true, value: 100 },
		offsetWidth: { configurable: true, value: 320 },
		scrollHeight: { configurable: true, value: 100 },
	})
	await settle()

	renderItems([b, c, d])
	await settle()
	expect(labels()).toEqual(['B', 'C', 'D'])
	renderItems([a, b, c, d])
	await settle()
	expect(labels()).toEqual(['A', 'B', 'C', 'D'])
	renderItems([a, b, d])
	await settle()
	expect(labels()).toEqual(['A', 'B', 'D'])
	const bRow = Array.from(root.querySelectorAll<HTMLElement>('[data-slot="virtual-list-item"]'))
		.find(row => row.textContent === 'B')
	renderItems([a, { ...b, label: 'B updated' }, d])
	await settle()
	expect(labels()).toEqual(['A', 'B updated', 'D'])
	expect(Array.from(root.querySelectorAll<HTMLElement>('[data-slot="virtual-list-item"]'))
		.find(row => row.textContent === 'B updated')).toBe(bRow)
})

test('the mounted controller scrolls to a current key and rejects missing targets', async () => {
	const items = Array.from({ length: 100 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }))
	let api: VirtualListApi<string> | undefined
	let receivers = 0
	const receive = (next: VirtualListApi<string>) => {
		api = next
		receivers += 1
	}
	render(jsx(VirtualList, {
		estimateSize: 20,
		getItemKey: (item: Item) => item.id,
		items,
		overscan: 1,
		prerender: 4,
		renderItem: (item: Item) => item.label,
		setApi: receive,
	}), document.body)

	const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	if (!root) throw new Error('VirtualList root did not render')
	const scrolls: ScrollToOptions[] = []
	Object.defineProperties(root, {
		clientHeight: { configurable: true, value: 100 },
		offsetHeight: { configurable: true, value: 100 },
		offsetWidth: { configurable: true, value: 320 },
		scrollHeight: { configurable: true, value: 2000 },
		scrollTo: {
			configurable: true,
			value: (options: ScrollToOptions) => {
				scrolls.push(options)
				root.scrollTop = options.top ?? root.scrollTop
			},
		},
	})

	expect(api).toBeUndefined()
	await settle()
	expect(Object.keys(api!)).toEqual(['scrollTo'])
	expect(receivers).toBe(1)
	scrolls.length = 0
	expect(api!.scrollTo({ key: 'missing' })).toBe(false)
	expect(scrolls).toHaveLength(0)
	expect(() => api!.scrollTo({} as never)).toThrowError(
		new TypeError('VirtualList target needs key or index'),
	)
	expect(api!.scrollTo({ key: 'item-50' }, { align: 'center' })).toBe(true)
	expect(scrolls).toContainEqual({ behavior: 'auto', top: 960 })
	scrolls.length = 0
	expect(api!.scrollTo({ index: 10 }, { align: 'start' })).toBe(true)
	expect(scrolls).toContainEqual({ behavior: 'auto', top: 200 })
	scrolls.length = 0
	expect(api!.scrollTo({ index: 10 }, { align: 'end' })).toBe(true)
	expect(scrolls).toContainEqual({ behavior: 'auto', top: 120 })
	scrolls.length = 0
	expect(api!.scrollTo({ index: 20 }, { align: 'nearest' })).toBe(true)
	expect(scrolls).toContainEqual({ behavior: 'auto', top: 320 })
	expect(api!.scrollTo({ index: 100 })).toBe(false)

	render(jsx(VirtualList, {
		estimateSize: 20,
		getItemKey: (item: Item) => item.id,
		items,
		renderItem: (item: Item) => item.label,
		setApi: receive,
	}), document.body)
	await settle()
	expect(receivers).toBe(1)
})

test('a focused row stays mounted when scrolling moves the viewport range', async () => {
	const items = Array.from({ length: 100 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }))
	render(jsx(VirtualList, {
		estimateSize: 20,
		getItemKey: (item: Item) => item.id,
		items,
		overscan: 1,
		prerender: 4,
		renderItem: (item: Item) => jsx('button', { children: item.label, type: 'button' }),
	}), document.body)

	const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	if (!root) throw new Error('VirtualList root did not render')
	Object.defineProperties(root, {
		clientHeight: { configurable: true, value: 100 },
		offsetHeight: { configurable: true, value: 100 },
		offsetWidth: { configurable: true, value: 320 },
		scrollHeight: { configurable: true, value: 2000 },
		scrollTo: {
			configurable: true,
			value: ({ top = 0 }: ScrollToOptions) => root.scrollTop = top,
		},
	})
	await settle()

	const focused = Array.from(root.querySelectorAll('button')).find(button => button.textContent === 'Item 0')
	if (!focused) throw new Error('First row did not render')
	focused.focus()
	expect(document.activeElement).toBe(focused)

	root.scrollTop = 1000
	root.dispatchEvent(new Event('scroll'))
	await settle()

	expect(focused.isConnected).toBe(true)
	expect(Array.from(root.querySelectorAll('button'), button => button.textContent)).toContain('Item 50')

	render(jsx(VirtualList, {
		estimateSize: 20,
		getItemKey: (item: Item) => item.id,
		items: items.slice(1),
		overscan: 1,
		prerender: 4,
		renderItem: (item: Item) => jsx('button', { children: item.label, type: 'button' }),
	}), document.body)
	await settle()
	expect(document.activeElement).toBe(root)
	expect(focused.isConnected).toBe(false)
})

test('focus acquired before the first post-commit stays pinned when the live range starts elsewhere', async () => {
	const items = Array.from({ length: 100 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }))
	render(jsx(VirtualList, {
		estimateSize: 20,
		getItemKey: (item: Item) => item.id,
		items,
		overscan: 1,
		prerender: 4,
		renderItem: (item: Item) => jsx('button', { children: item.label, type: 'button' }),
	}), document.body)

	const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	const focused = root?.querySelector<HTMLButtonElement>('button')
	if (!root || !focused) throw new Error('Prerendered focus target did not render')
	Object.defineProperties(root, {
		clientHeight: { configurable: true, value: 100 },
		offsetHeight: { configurable: true, value: 100 },
		offsetWidth: { configurable: true, value: 320 },
		scrollHeight: { configurable: true, value: 2000 },
		scrollTop: { configurable: true, writable: true, value: 1000 },
	})
	focused.focus()
	expect(document.activeElement).toBe(focused)

	await settle()
	expect(focused.isConnected).toBe(true)
	expect(document.activeElement).toBe(focused)
	root.scrollTop = 1000
	root.dispatchEvent(new Event('scroll'))
	await settle()
	expect(Array.from(root.querySelectorAll('button'), button => button.textContent)).toContain('Item 50')
	expect(focused.isConnected).toBe(true)
	expect(document.activeElement).toBe(focused)
})

test('unmount disconnects observers once and makes the retained controller inert', async () => {
	const observer = installResizeObserver()
	try {
		let api: VirtualListApi<string> | undefined
		render(jsx(VirtualList, {
			estimateSize: 20,
			getItemKey: (item: Item) => item.id,
			items: [{ id: 'item-0', label: 'Item 0' }],
			renderItem: (item: Item) => item.label,
			setApi: (next: VirtualListApi<string>) => api = next,
		}), document.body)

		const root = document.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
		if (!root) throw new Error('VirtualList root did not render')
		Object.defineProperties(root, {
			clientHeight: { configurable: true, value: 100 },
			offsetHeight: { configurable: true, value: 100 },
			offsetWidth: { configurable: true, value: 320 },
			scrollHeight: { configurable: true, value: 100 },
		})
		await settle()
		expect(api).toBeDefined()

		render(null, document.body)
		const disconnects = observer.instances.reduce((count, instance) => count + instance.disconnect.mock.calls.length, 0)
		const unobserves = observer.instances.reduce((count, instance) => count + instance.unobserve.mock.calls.length, 0)
		expect(disconnects).toBeGreaterThan(0)
		expect(unobserves).toBeGreaterThan(0)
		expect(api!.scrollTo({ index: 0 })).toBe(false)

		render(null, document.body)
		expect(observer.instances.reduce((count, instance) => count + instance.disconnect.mock.calls.length, 0)).toBe(disconnects)
		expect(observer.instances.reduce((count, instance) => count + instance.unobserve.mock.calls.length, 0)).toBe(unobserves)
	} finally {
		render(null, document.body)
		observer.restore()
	}
})
