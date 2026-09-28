// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ChartArea, ChartBar, ChartContainer, ChartLegend, ChartPie, ChartTooltip, ChartTooltipContent } from '../src/chart'

let resized: (() => void) | undefined

beforeEach(() => {
	document.body.replaceChildren()
	resized = undefined
	vi.stubGlobal('ResizeObserver', class {
		constructor(notify: ResizeObserverCallback) {
			resized = () => notify([{ target: document.querySelector('[data-slot="chart"]')! } as ResizeObserverEntry], this as unknown as ResizeObserver)
		}
		observe() { }
		unobserve() { }
		disconnect() { }
	})
})

afterEach(() => {
	render(null, document.body)
	vi.unstubAllGlobals()
})

const box = (element: Element, rect: DOMRect) =>
	Object.defineProperty(element, 'getBoundingClientRect', { configurable: true, value: () => rect })

/** Renders a one-bar chart whose SVG maps user units to client pixels offset by (10, 20). */
const bars = (children: unknown[]) => {
	render(jsx(ChartContainer, {
		children,
		config: { sales: { label: 'Sales' } },
		data: [{ month: 'Jan', sales: 10 }],
		palette: ['blue'],
		series: ['sales'],
		xKey: 'month',
	}), document.body)

	const svg = document.querySelector('svg')
	if (svg) Object.defineProperty(svg, 'getScreenCTM', {
		configurable: true,
		value: () => ({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 }),
	})
	return {
		mark: svg?.querySelector<SVGElement>('[data-chart-index="0"]'),
		root: document.querySelector<HTMLElement>('[data-slot="chart"]')!,
	}
}

/** Gives the mounted tooltip a layout: an 80 by 40 box inside the chart root. */
const layout = (root: HTMLElement) => {
	const tooltip = document.querySelector<HTMLElement>('[data-slot="chart-tooltip"]')!
	Object.defineProperties(tooltip, {
		offsetHeight: { configurable: true, value: 40 },
		offsetParent: { configurable: true, value: root },
		offsetWidth: { configurable: true, value: 80 },
	})
	return tooltip
}

test('ChartTooltip sits beside the active point, flips at the root edge, clamps into it and follows root resizes', async () => {
	const { mark, root } = bars([jsx(ChartBar, {}), jsx(ChartTooltip, {})])
	box(root, new DOMRect(10, 20, 700, 300))

	// The bar's top center is SVG (332, 16), client (342, 36).
	mark!.dispatchEvent(new FocusEvent('focus'))
	const tooltip = layout(root)

	expect(tooltip.style.position).toBe('absolute')
	expect(tooltip.dataset.positioned).toBeUndefined()
	// 12px right of the point; centered on it, then clamped to the root top.
	await vi.waitFor(() => expect(tooltip.style.transform).toBe('translate(344px, 0px)'))
	expect(tooltip.dataset.positioned).toBe('true')

	// A narrower root leaves no room on the right, so the box flips to the left of the point.
	box(root, new DOMRect(10, 20, 400, 300))
	resized!()
	await vi.waitFor(() => expect(tooltip.style.transform).toBe('translate(240px, 0px)'))
	expect(document.querySelector('[data-slot="chart-tooltip"]')).toBe(tooltip)
})

test('ChartTooltip closes when focus leaves the marks, and stays while it moves between them', async () => {
	render(jsx(ChartContainer, {
		children: [jsx(ChartBar, {}), jsx(ChartTooltip, {})],
		config: { sales: { label: 'Sales' } },
		data: [{ month: 'Jan', sales: 12 }, { month: 'Feb', sales: 8 }],
		palette: ['blue'],
		xKey: 'month',
	}), document.body)
	const [jan, feb] = document.querySelectorAll<SVGElement>('[data-chart-index]')
	const tooltip = () => document.querySelector('[data-slot="chart-tooltip"]')

	jan!.focus()
	feb!.focus()
	await Promise.resolve()
	expect(tooltip()?.textContent).toContain('Feb')

	feb!.blur()
	await vi.waitFor(() => expect(tooltip()).toBeNull())
})

test('ChartTooltip clears when its active plot is removed', async () => {
	const { mark } = bars([jsx(ChartBar, { key: 'bar' }), jsx(ChartTooltip, {})])
	mark!.dispatchEvent(new FocusEvent('focus'))
	expect(document.querySelector('[data-slot="chart-tooltip"]')).not.toBeNull()

	bars([jsx(ChartTooltip, {})])
	await vi.waitFor(() => expect(document.querySelector('[data-slot="chart-tooltip"]')).toBeNull())
})

test('ChartTooltipContent stamps its indicator and nesting as attributes on each item', () => {
	const { mark } = bars([
		jsx(ChartBar, {}),
		jsx(ChartTooltip, { children: jsx(ChartTooltipContent, { indicator: 'dashed' }) }),
	])
	mark!.dispatchEvent(new FocusEvent('focus'))

	const content = document.querySelector('[data-slot="chart-tooltip-content"]')!
	const item = content.querySelector<HTMLElement>('[data-slot="chart-tooltip-items"] > [data-slot="chart-tooltip-item"]')!
	expect(item.dataset.indicator).toBe('dashed')
	expect(item.dataset.nested).toBe('true')
	// A single dashed row nests the label beside its value instead of above the rows.
	expect(content.querySelector(':scope > [data-slot="chart-tooltip-label"]')).toBeNull()
	expect(item.querySelector('[data-slot="chart-tooltip-names"] > [data-slot="chart-tooltip-label"]')?.textContent).toBe('Jan')
	expect(item.querySelector('[data-slot="chart-tooltip-name"]')?.textContent).toBe('Sales')
	expect(item.querySelector('[data-slot="chart-tooltip-value"]')?.textContent).toBe('10')
	expect(item.querySelector('[data-slot="chart-tooltip-indicator"]')?.getAttribute('style')).toBe('--chart-indicator:blue')
})

test('ChartLegend renders its entries unless children replace them', () => {
	const legend = (args: Record<string, unknown>) => {
		render(jsx(ChartContainer, {
			children: jsx(ChartLegend, args),
			config: { a: { icon: jsx('svg', { 'data-icon': 'a' }), label: 'A' }, b: { color: 'red', label: 'B' } },
			palette: ['blue', 'green'],
		}), document.body)
		return document.querySelector('[data-slot="chart-legend"]')!
	}

	const entries = legend({})
	expect(Array.from(entries.children, item => item.getAttribute('data-slot'))).toEqual(['chart-legend-item', 'chart-legend-item'])
	expect(entries.querySelector('[data-slot="chart-legend-icon"] > [data-icon="a"]')).not.toBeNull()
	expect(entries.querySelector('[data-slot="chart-legend-swatch"]')?.getAttribute('style')).toBe('background:var(--color-b)')
	expect(legend({ hideIcon: true }).querySelectorAll('[data-slot="chart-legend-swatch"]')).toHaveLength(2)
	expect(legend({ children: 'Custom' }).textContent).toBe('Custom')
})

test('ChartPie activates slices from its SVG by focus and pointer position', () => {
	render(jsx(ChartContainer, {
		children: [jsx(ChartPie, {}), jsx(ChartTooltip, {})],
		config: { visitors: { label: 'Visitors' } },
		data: [{ browser: 'Chrome', visitors: 1 }, { browser: 'Safari', visitors: 1 }, { browser: 'Edge', visitors: 2 }],
		palette: ['blue', 'green', 'red'],
		type: 'pie',
		xKey: 'browser',
	}), document.body)
	const svg = document.querySelector('svg')!
	Object.defineProperty(svg, 'getScreenCTM', {
		configurable: true,
		value: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
	})
	const tooltip = () => document.querySelector('[data-slot="chart-tooltip"]')
	const indicator = () => tooltip()?.querySelector('[data-slot="chart-tooltip-indicator"]')?.getAttribute('style')

	svg.querySelector('[data-chart-index="1"]')!.dispatchEvent(new FocusEvent('focus'))
	expect(tooltip()?.textContent).toContain('Safari')
	expect(indicator()).toBe('--chart-indicator:green')

	// The 240 by 240 pie is centered at (120, 120); Edge fills its left half.
	svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 40, clientY: 120 }))
	expect(tooltip()?.textContent).toContain('Edge')
	expect(indicator()).toBe('--chart-indicator:red')

	// Outside the radius clears the active slice.
	svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 239, clientY: 1 }))
	expect(tooltip()).toBeNull()
})

test('Chart marks share one Tab stop that arrow keys move along a series, across series and to the ends', async () => {
	render(jsx(ChartContainer, {
		children: jsx(ChartArea, {}),
		config: { api: { label: 'API' }, web: { label: 'Web' } },
		data: [{ hour: '03:00', api: 8, web: 6 }, { hour: '04:00', api: 7, web: 5 }, { hour: '05:00', api: 9, web: 4 }],
		palette: ['navy', 'bronze'],
		xKey: 'hour',
	}), document.body)
	const mark = (series: number, row: number) => document.querySelector<SVGElement>(`[data-chart-mark="${series}:${row}"]`)!
	const stops = () => [...document.querySelectorAll('[data-chart-index][tabindex="0"]')].map(item => item.getAttribute('data-chart-mark'))
	const press = async (key: string) => {
		const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
		document.activeElement!.dispatchEvent(event)
		expect(event.defaultPrevented).toBe(true)
		await Promise.resolve()
	}

	expect(document.querySelectorAll('[data-chart-index]')).toHaveLength(6)
	expect(stops()).toEqual(['0:0'])
	mark(0, 0).focus()
	await press('ArrowRight')
	expect(document.activeElement).toBe(mark(0, 1))
	await press('ArrowDown')
	expect(document.activeElement).toBe(mark(1, 1))
	await press('End')
	expect(document.activeElement).toBe(mark(1, 2))
	await press('ArrowRight')
	expect(document.activeElement).toBe(mark(1, 2))
	await press('Home')
	await press('ArrowUp')
	expect(document.activeElement).toBe(mark(0, 0))
	await press('ArrowDown')
	await vi.waitFor(() => expect(stops()).toEqual(['1:0']))
})

test('ChartPie walks its slices with every arrow key', async () => {
	render(jsx(ChartContainer, {
		children: jsx(ChartPie, {}),
		config: { visitors: { label: 'Visitors' } },
		data: [{ browser: 'Chrome', visitors: 1 }, { browser: 'Safari', visitors: 1 }, { browser: 'Edge', visitors: 2 }],
		palette: ['blue', 'green', 'red'],
		type: 'pie',
		xKey: 'browser',
	}), document.body)
	const slice = (index: number) => document.querySelector<SVGElement>(`[data-chart-index="${index}"]`)!

	slice(0).focus()
	slice(0).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))
	expect(document.activeElement).toBe(slice(1))
	slice(1).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
	expect(document.activeElement).toBe(slice(2))
	slice(2).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }))
	expect(document.activeElement).toBe(slice(1))
})

test('Chart without a size draws at its plot\'s laid-out size, redrawing only once no tooltip is open', async () => {
	const { mark, root } = bars([jsx(ChartBar, {}), jsx(ChartTooltip, {})])
	const view = () => document.querySelector('svg')!.getAttribute('viewBox')
	const size = (width: number, height: number) => {
		Object.defineProperties(document.querySelector('svg')!, {
			clientHeight: { configurable: true, value: height },
			clientWidth: { configurable: true, value: width },
		})
		resized!()
	}
	expect(view()).toBe('0 0 640 240')
	expect(root.hasAttribute('data-measured')).toBe(false)

	size(358, 150)
	await vi.waitFor(() => expect(view()).toBe('0 0 358 150'))
	expect(root.hasAttribute('data-measured')).toBe(true)

	mark!.focus()
	expect(document.querySelector('[data-slot="chart-tooltip"]')).not.toBeNull()
	size(300, 180)
	await new Promise(resolve => setTimeout(resolve, 50))
	expect(view()).toBe('0 0 358 150')

	mark!.blur()
	await vi.waitFor(() => expect(view()).toBe('0 0 300 180'))
})

test('Chart keeps a given width or height and measures only the other', async () => {
	render(jsx(ChartContainer, {
		children: jsx(ChartBar, {}),
		config: { sales: { label: 'Sales' } },
		data: [{ month: 'Jan', sales: 10 }],
		height: 200,
		palette: ['blue'],
		xKey: 'month',
	}), document.body)
	Object.defineProperties(document.querySelector('svg')!, {
		clientHeight: { configurable: true, value: 150 },
		clientWidth: { configurable: true, value: 358 },
	})
	resized!()
	await vi.waitFor(() => expect(document.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 358 200'))
})
