// @vitest-environment happy-dom
import type { Stateful, Stateless } from 'ajo'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import {
	ChartContainer as BaseChartContainer,
	useChartId,
} from '../../packages/ajo-ui/src/chart'
import { ChartBar, ChartContainer } from '../../src/ui/chart'

const config = {
	desktop: {
		label: 'Desktop',
		theme: {
			dark: '#6cc3d5',
			light: '#234c6a',
		},
	},
}

const IdentityProbe: Stateless = () => jsx('output', {
	'data-chart-context': useChartId(),
})

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
			jsx(ChartContainer, {
				config,
				'data-chart-revision': revision,
			}),
			revision > 1 ? jsx(ChartContainer, {
				config,
				'data-second-chart': 'true',
			}) : null,
		],
	})
}

afterEach(() => render(null, document.body))

test('themed ChartContainer keeps one generated identity across parent rerenders', () => {
	render(jsx(RerenderingChart, {}), document.body)

	const before = document.querySelector<HTMLElement>('[data-slot="chart"]')
	const button = document.querySelector<HTMLButtonElement>('[data-chart-rerender]')
	const style = before?.querySelector<HTMLStyleElement>('style[data-chart-style]')
	const identity = style?.dataset.chartStyle

	expect(before).not.toBeNull()
	expect(button).not.toBeNull()
	expect(identity).toMatch(/^chart-\d+$/)
	expect(before?.dataset.chart).toBeUndefined()
	expect(style?.textContent).toContain(`[data-slot="chart"]:has(>style[data-chart-style="${identity}"])`)

	button!.click()

	const after = document.querySelector<HTMLElement>('[data-slot="chart"]')
	const afterStyle = after?.querySelector<HTMLStyleElement>('style[data-chart-style]')
	expect(after).toBe(before)
	expect(afterStyle?.dataset.chartStyle).toBe(identity)
	expect(afterStyle?.textContent).toContain(`[data-slot="chart"]:has(>style[data-chart-style="${identity}"])`)

	button!.click()

	const identities = Array.from(document.querySelectorAll<HTMLStyleElement>('style[data-chart-style]'))
		.map(style => style.dataset.chartStyle)
	expect(identities).toHaveLength(2)
	expect(identities[0]).toBe(identity)
	expect(Number(identities[1]?.slice('chart-'.length))).toBe(Number(identity?.slice('chart-'.length)) + 1)
})

test('themed ChartContainer preserves distinct explicit DOM ids in style identities', () => {
	render(jsx('div', {
		children: [
			jsx(ChartContainer, { config, id: 'C++' }),
			jsx(ChartContainer, { config, id: 'C##' }),
		],
	}), document.body)

	const charts = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="chart"]'))
	const identities = charts.map(chart =>
		chart.querySelector<HTMLStyleElement>('style[data-chart-style]')?.dataset.chartStyle)

	expect(charts.map(chart => chart.id)).toEqual(['C++', 'C##'])
	expect(identities).toEqual(['chart-C%2B%2B', 'chart-C%23%23'])
	expect(new Set(identities).size).toBe(2)
})

test('themed ChartContainer shares one encoded identity across SSR style and aria consumers', () => {
	const html = ssr(jsx(ChartContainer, {
		children: [
			jsx(IdentityProbe, {}),
			jsx(ChartBar, {}),
		],
		config,
		data: [{ desktop: 42 }],
		description: 'Quarterly revenue',
		id: 'SSR C++',
	}))

	expect(html).toContain('data-chart-style="chart-SSR%20C%2B%2B"')
	expect(html).toContain('data-chart-context="chart-SSR%20C%2B%2B"')
	expect(html).toContain('aria-describedby="chart-SSR%20C%2B%2B-description"')
	expect(html).toContain('id="chart-SSR%20C%2B%2B-description"')
})

test('base ChartContainer preserves and updates an explicit resolved chartId override', () => {
	const chart = (chartId: string) => jsx(BaseChartContainer, {
		chartId,
		children: jsx(IdentityProbe, {}),
		config,
		palette: ['blue'],
	})

	render(chart('Revenue/Q1'), document.body)
	expect(document.querySelector('output')?.dataset.chartContext).toBe('Revenue/Q1')

	render(chart('Profit Q2'), document.body)
	expect(document.querySelector('output')?.dataset.chartContext).toBe('Profit Q2')
})
