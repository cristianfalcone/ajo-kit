// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const floating = vi.hoisted(() => ({
	autoUpdate: vi.fn(),
	computePosition: vi.fn(),
}))

vi.mock('@floating-ui/dom', async importActual => ({
	...await importActual<typeof import('@floating-ui/dom')>(),
	autoUpdate: floating.autoUpdate,
	computePosition: floating.computePosition,
}))

import { ChartBar, ChartContainer, ChartTooltip } from '../src/chart'

beforeEach(() => {
	document.body.replaceChildren()
	floating.autoUpdate.mockReset().mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	floating.computePosition.mockReset().mockResolvedValue({
		middlewareData: {},
		placement: 'bottom-start',
		strategy: 'fixed',
		x: 12,
		y: 24,
	})
})

afterEach(() => render(null, document.body))

test('ChartTooltip mounts and positions against the active SVG point', async () => {
	render(jsx(ChartContainer, {
		children: [jsx(ChartBar, {}), jsx(ChartTooltip, {})],
		config: { sales: { label: 'Sales' } },
		data: [{ month: 'Jan', sales: 12 }],
		palette: ['blue'],
		series: ['sales'],
		xKey: 'month',
	}), document.body)

	const svg = document.querySelector('svg')!
	Object.defineProperty(svg, 'getScreenCTM', {
		configurable: true,
		value: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
	})
	document.querySelector<SVGElement>('[data-chart-index]')!
		.dispatchEvent(new FocusEvent('focus'))

	await vi.waitFor(() => {
		expect(document.querySelector('[data-slot="chart-tooltip"]')).not.toBeNull()
		expect(floating.autoUpdate).toHaveBeenCalledOnce()
		expect(floating.computePosition).toHaveBeenCalled()
	})
})
