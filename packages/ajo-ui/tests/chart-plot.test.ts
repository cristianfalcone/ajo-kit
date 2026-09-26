import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { ChartBar, ChartContainer } from '../src/chart'

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
