// @vitest-environment happy-dom
import type { Stateful, Stateless } from 'ajo'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import { ChartBar, ChartContainer, ChartIdContext, type ChartConfig } from '../src/chart'

const config: ChartConfig = {
	desktop: {
		label: 'Desktop',
		theme: {
			dark: '#6cc3d5',
			light: '#234c6a',
		},
	},
}

const chart = (args: Record<string, unknown>) => jsx(ChartContainer, { config, palette: ['blue'], ...args })

const IdentityProbe: Stateless = () => {
	const id = ChartIdContext()
	return id ? jsx('output', { 'data-chart-context': id }) : null
}

const RerenderingChart: Stateful = function* () {
	let revision = 0
	const rerender = () => this.next(() => revision++)

	while (true) yield jsx('div', {
		children: [
			jsx('button', {
				'data-chart-rerender': revision,
				'set:onclick': rerender,
				type: 'button',
			}),
			chart({ 'data-chart-revision': revision }),
			revision > 1 ? chart({ 'data-second-chart': 'true' }) : null,
		],
	})
}

/** Parses SSR markup the way a browser does and returns its bars. */
const bars = (html: string) => {
	document.body.innerHTML = html
	return Array.from(document.querySelectorAll<SVGRectElement>('[data-slot="chart-bar"] rect[data-chart-series]'))
}

/** Reads a variable on the plot, the root child the scoped rule targets (happy-dom does not inherit custom properties). */
const color = (rect: Element, key: string) => getComputedStyle(rect.closest('svg')!).getPropertyValue(`--color-${key}`).trim()

afterEach(() => {
	render(null, document.body)
	document.documentElement.className = ''
})

test('ChartContainer keeps one generated identity across parent rerenders', () => {
	render(jsx(RerenderingChart, {}), document.body)

	const before = document.querySelector<HTMLElement>('[data-slot="chart"]')
	const button = document.querySelector<HTMLButtonElement>('[data-chart-rerender]')
	const identity = before?.querySelector<HTMLStyleElement>('style[data-chart-scope]')?.dataset.chartScope

	expect(identity).toMatch(/^chart-\d+$/)

	button!.click()

	const after = document.querySelector<HTMLElement>('[data-slot="chart"]')
	expect(after).toBe(before)
	expect(after?.querySelector<HTMLStyleElement>('style[data-chart-scope]')?.dataset.chartScope).toBe(identity)

	button!.click()

	const identities = Array.from(document.querySelectorAll<HTMLStyleElement>('style[data-chart-scope]'))
		.map(style => style.dataset.chartScope)
	expect(identities).toHaveLength(2)
	expect(identities[0]).toBe(identity)
	expect(Number(identities[1]?.slice('chart-'.length))).toBe(Number(identity?.slice('chart-'.length)) + 1)
})

test('ChartContainer encodes distinct explicit DOM ids into its identity', () => {
	render(jsx('div', {
		children: [
			chart({ children: jsx(IdentityProbe, {}), id: 'C++' }),
			chart({ children: jsx(IdentityProbe, {}), id: 'C##' }),
		],
	}), document.body)

	const charts = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="chart"]'))
	expect(charts.map(chart => chart.id)).toEqual(['C++', 'C##'])
	expect(charts.map(chart => chart.querySelector('style')?.dataset.chartScope)).toEqual(['chart-C%2B%2B', 'chart-C%23%23'])
	expect(charts.map(chart => chart.querySelector('output')?.dataset.chartContext)).toEqual(['chart-C%2B%2B', 'chart-C%23%23'])

	render(chart({ children: jsx(IdentityProbe, {}), id: 'Profit Q2' }), document.body)
	expect(document.querySelector('output')?.dataset.chartContext).toBe('chart-Profit%20Q2')
})

test('ChartContainer shares one encoded identity across SSR style and aria consumers', () => {
	const html = ssr(chart({
		children: [jsx(IdentityProbe, {}), jsx(ChartBar, {})],
		data: [{ desktop: 42 }],
		description: 'Quarterly revenue',
		id: 'SSR C++',
	}))

	expect(html).toContain('data-chart-scope="chart-SSR%20C%2B%2B"')
	expect(html).toContain('data-chart-context="chart-SSR%20C%2B%2B"')
	expect(html).toContain('aria-describedby="chart-SSR%20C%2B%2B-description"')
	expect(html).toContain('id="chart-SSR%20C%2B%2B-description"')
})

test('SSR of an unstyled ChartContainer applies its configured color through parseable scoped CSS', () => {
	for (const id of [undefined, "Sales Q1/Total (it's)"]) {
		const [rect] = bars(ssr(chart({
			children: jsx(ChartBar, {}),
			config: { v: { color: 'red' } },
			data: [{ v: 1 }],
			id,
		})))
		const rules = document.querySelector('style')!.sheet!.cssRules

		expect(rect!.getAttribute('fill')).toBe('var(--color-v)')
		expect(Array.from(rules, rule => (rule as CSSStyleRule).selectorText)).toEqual([
			expect.stringMatching(/^\[data-chart-scope=[^"'>]+\] ~ \*$/),
			expect.stringMatching(/^\.dark \[data-chart-scope=[^"'>]+\] ~ \*$/),
		])
		expect(color(rect!, 'v')).toBe('red')
	}
})

test('ChartContainer themes colors under .dark and keeps nested scopes apart', () => {
	const html = ssr(chart({
		children: [
			jsx(ChartBar, {}),
			chart({
				children: jsx(ChartBar, {}),
				config: { desktop: { color: '#abcdef' } },
				data: [{ desktop: 24 }],
				id: 'C##',
			}),
		],
		data: [{ desktop: 42 }],
		id: 'C++',
	}))
	const colors = () => bars(html).map(rect => color(rect, 'desktop'))

	expect(colors()).toEqual(['#234c6a', '#abcdef'])

	// happy-dom caches computed styles, so the markup is parsed again under the dark class.
	document.documentElement.className = 'dark'
	expect(colors()).toEqual(['#6cc3d5', '#abcdef'])
})

test('SSR drops hostile config keys and colors while a valid key keeps its scoped color', () => {
	const html = ssr(chart({
		children: jsx(ChartBar, {}),
		config: {
			'a;}x{': { color: 'blue' },
			v: { color: 'green' },
			w: { color: 'red;}body{display:none' },
		},
		data: [{ 'a;}x{': 1, v: 2, w: 3 }],
		id: 'hostile',
	}))

	expect(html.match(/<style[^>]*>(.*?)<\/style>/)?.[1]).toBe('[data-chart-scope=chart-hostile] ~ *{--color-v:green;}.dark [data-chart-scope=chart-hostile] ~ *{--color-v:green;}')

	const rects = bars(html)
	expect(document.querySelector('style')!.sheet!.cssRules).toHaveLength(2)
	expect(rects.map(rect => rect.getAttribute('fill'))).toEqual(['blue', 'var(--color-v)', 'var(--color-w)'])
	expect(color(rects[1]!, 'v')).toBe('green')
	expect(getComputedStyle(document.body).display).not.toBe('none')
})
