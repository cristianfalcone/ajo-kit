// @vitest-environment happy-dom
import type { Stateless } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import { ChartContainer, ChartIdContext } from '../src/chart'

const config = {
	desktop: {
		label: 'Desktop',
		theme: {
			dark: '#6cc3d5',
			light: '#234c6a',
		},
	},
}

const IdentityProbe: Stateless = () => {
	const id = ChartIdContext()
	return id ? jsx('output', { 'data-chart-context': id }) : null
}

afterEach(() => render(null, document.body))

test('ChartContainer preserves and updates an explicit resolved chartId override', () => {
	const chart = (chartId: string) => jsx(ChartContainer, {
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
