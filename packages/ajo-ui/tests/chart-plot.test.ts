import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { ChartArea, ChartBar, ChartContainer, ChartPie } from '../src/chart'

const plot = (args: Record<string, unknown>) => ssr(jsx(ChartContainer, {
	children: jsx(ChartBar, args),
	config: { sales: { label: 'Sales' } },
	data: [{ month: 'Jan', sales: 3 }, { month: 'Feb', sales: 6 }],
	formatValue: (value: number) => `v${value}`,
	palette: ['blue'],
	xKey: 'month',
}))

const group = (html: string, slot: string) => html.match(new RegExp(`<g data-slot="${slot}">(.*?)</g>`))?.[1]

test('Chart axis and grid render independently', () => {
	const both = plot({})
	expect(group(both, 'chart-grid')?.match(/<line/g)).toHaveLength(4)
	expect(group(both, 'chart-axis')).toContain('>v6<')

	const gridOnly = plot({ axis: false })
	expect(group(gridOnly, 'chart-axis')).toBeUndefined()
	expect(group(gridOnly, 'chart-grid')?.match(/<line/g)).toHaveLength(4)
	expect(gridOnly).not.toContain('>Jan<')

	const axisOnly = plot({ grid: false })
	expect(group(axisOnly, 'chart-grid')).toBeUndefined()
	const axis = group(axisOnly, 'chart-axis')!
	expect(axis.match(/<line/g)).toHaveLength(2)
	expect(axis.match(/>v[\d.]+</g)).toEqual(['>v0<', '>v2<', '>v4<', '>v6<'])
	expect(axis).toContain('>Jan<')
})

test('Chart value axis steps on round numbers from zero through the data', () => {
	const axis = (data: Record<string, unknown>[]) => group(ssr(jsx(ChartContainer, {
		children: jsx(ChartBar, { grid: false }),
		config: { sales: { label: 'Sales' } },
		data,
		formatValue: (value: number) => `v${value}`,
		palette: ['blue'],
		xKey: 'month',
	})), 'chart-axis')?.match(/>v-?[\d.]+</g)

	expect(axis([{ month: 'Jan', sales: 820 }, { month: 'Feb', sales: 2410 }])).toEqual(['>v0<', '>v500<', '>v1000<', '>v1500<', '>v2000<', '>v2500<'])
	expect(axis([{ month: 'Jan', sales: -3 }, { month: 'Feb', sales: 6 }])).toEqual(['>v-4<', '>v-2<', '>v0<', '>v2<', '>v4<', '>v6<'])
	expect(axis([{ month: 'Jan', sales: 0.3 }])).toEqual(['>v0<', '>v0.1<', '>v0.2<', '>v0.3<'])
	expect(axis([{ month: 'Jan', sales: 0 }])).toEqual(['>v-1<', '>v-0.5<', '>v0<', '>v0.5<', '>v1<'])
})

test('Chart areas are opaque series fills in one translucent layer beneath every line', () => {
	const html = ssr(jsx(ChartContainer, {
		children: jsx(ChartArea, {}),
		config: { api: { label: 'API' }, web: { label: 'Web' } },
		data: [{ hour: '03:00', api: 8, web: 6 }, { hour: '04:00', api: 7, web: 5 }],
		palette: ['navy', 'bronze'],
		xKey: 'hour',
	}))
	const fills = html.match(/<g data-slot="chart-fill" opacity="0\.18">(.*?)<\/g>/)?.[1]

	expect(fills?.match(/fill="[^"]+"/g)).toEqual(['fill="navy"', 'fill="bronze"'])
	expect(html).not.toContain('fill-opacity')
	expect(html.indexOf('data-slot="chart-fill"')).toBeLessThan(html.indexOf('fill="none"'))
})

test('Chart paints the largest area first, so a series below another keeps its own fill', () => {
	const fills = (data: Record<string, unknown>[]) => ssr(jsx(ChartContainer, {
		children: jsx(ChartArea, {}),
		config: { errors: { label: 'Errors' }, total: { label: 'Total' } },
		data,
		palette: ['navy', 'bronze'],
		xKey: 'hour',
	})).match(/<g data-slot="chart-fill" opacity="0\.18">(.*?)<\/g>/)?.[1]?.match(/data-chart-series="\w+"/g)

	expect(fills([{ hour: '03:00', errors: 2, total: 8 }, { hour: '04:00', errors: 3, total: 9 }]))
		.toEqual(['data-chart-series="total"', 'data-chart-series="errors"'])
	expect(fills([{ hour: '03:00', errors: 8, total: 2 }, { hour: '04:00', errors: 9, total: 3 }]))
		.toEqual(['data-chart-series="errors"', 'data-chart-series="total"'])
})

test('Chart x axis keeps the last label and thins the ones before it to fit at one even step', () => {
	const labels = (width: number) => group(ssr(jsx(ChartContainer, {
		children: jsx(ChartArea, { grid: false }),
		config: { api: { label: 'API' } },
		data: Array.from({ length: 12 }, (_, index) => ({ api: index, hour: `${String(index + 3).padStart(2, '0')}:00` })),
		palette: ['navy'],
		width,
		xKey: 'hour',
	})), 'chart-axis')?.match(/>\d\d:00</g)

	// 12 labels of 5 characters need 43 units each; the plot is 584 units wide at 640, 302 at
	// 358 (every second label) and 184 at 240 (every third). The step counts back from the newest.
	expect(labels(640)).toHaveLength(12)
	expect(labels(358)).toEqual(['>04:00<', '>06:00<', '>08:00<', '>10:00<', '>12:00<', '>14:00<'])
	expect(labels(240)).toEqual(['>05:00<', '>08:00<', '>11:00<', '>14:00<'])
})

test('ChartPie keeps a ring on a plot too small for its inner radius', () => {
	const arcs = (size: number) => ssr(jsx(ChartContainer, {
		children: jsx(ChartPie, { innerRadius: 58 }),
		config: { visitors: { label: 'Visitors' } },
		data: [{ browser: 'Chrome', visitors: 1 }, { browser: 'Safari', visitors: 1 }],
		height: size,
		palette: ['blue', 'green'],
		type: 'pie',
		width: size,
		xKey: 'browser',
	})).match(/A ([\d.]+) \1/g)

	// The radius is half the plot less 12: 108 at 240, which fits the 58 hole; 43 at 110, where
	// the hole takes 60% of it.
	expect(arcs(240)).toEqual(['A 108 108', 'A 58 58', 'A 108 108', 'A 58 58'])
	expect(arcs(110)).toEqual(['A 43 43', 'A 25.8 25.8', 'A 43 43', 'A 25.8 25.8'])
})
