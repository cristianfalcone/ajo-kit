import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { ChartBar, ChartContainer } from '../src/chart'

// Runs first: a cached formatter from another test would hide the missing constructor.
test('Chart formats values without Intl.NumberFormat, as in Ajo Engine SSR', () => {
	const NumberFormat = Intl.NumberFormat
	Object.defineProperty(Intl, 'NumberFormat', { configurable: true, value: undefined, writable: true })
	try {
		const html = ssr(jsx(ChartContainer, {
			children: jsx(ChartBar, {}),
			config: { revenue: { label: 'Revenue' } },
			data: [{ month: 'Jan', revenue: 1234.5678 }],
			palette: ['blue'],
			xKey: 'month',
		}))

		expect(html).toContain('aria-label="Jan Revenue 1234.568"')
	} finally {
		Object.defineProperty(Intl, 'NumberFormat', { configurable: true, value: NumberFormat, writable: true })
	}
})

test('Chart reuses its default number formatter across labels', () => {
	const NumberFormat = Intl.NumberFormat
	const formats = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function NumberFormatMock(locale, options) {
		return new NumberFormat(locale, options)
	})
	const chart = {
		id: 'revenue',
		children: jsx(ChartBar, {}),
		config: { revenue: { label: 'Revenue' } },
		data: [
			{ month: 'Jan', revenue: 1_000 },
			{ month: 'Feb', revenue: 2_000 },
			{ month: 'Mar', revenue: 3_000 },
		],
		palette: ['blue'],
		xKey: 'month',
	}

	const custom = ssr(jsx(ChartContainer, {
		...chart,
		formatValue: (value: number) => `USD ${value}`,
	}))
	expect(custom).toContain('USD 1000')
	expect(formats).not.toHaveBeenCalled()

	const html = ssr(jsx(ChartContainer, {
		...chart,
	}))

	expect(html).toContain('data-slot="chart-bar"')
	expect(formats).toHaveBeenCalledTimes(1)
	ssr(jsx(ChartContainer, { ...chart }))
	expect(formats).toHaveBeenCalledTimes(1)
})
