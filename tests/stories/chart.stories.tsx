/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import Button from '/src/ui/button'
import {
	ChartArea,
	ChartBar,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartLine,
	ChartPie,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '/src/ui/chart'

const data = [
	{ month: 'January', desktop: 186, mobile: 80, tablet: 42 },
	{ month: 'February', desktop: 305, mobile: 200, tablet: 68 },
	{ month: 'March', desktop: 237, mobile: 120, tablet: 52 },
	{ month: 'April', desktop: 73, mobile: 190, tablet: 80 },
	{ month: 'May', desktop: 209, mobile: 130, tablet: 74 },
	{ month: 'June', desktop: 214, mobile: 140, tablet: 88 },
]

const pieData = [
	{ browser: 'Chrome', visitors: 275 },
	{ browser: 'Safari', visitors: 200 },
	{ browser: 'Firefox', visitors: 187 },
	{ browser: 'Edge', visitors: 173 },
	{ browser: 'Other', visitors: 90 },
]

const updateData = [
	{ month: 'January', desktop: 120, mobile: 92 },
	{ month: 'February', desktop: 180, mobile: 140 },
	{ month: 'March', desktop: 150, mobile: 110 },
	{ month: 'April', desktop: 210, mobile: 160 },
]

const nextData = [
	{ month: 'January', desktop: 240, mobile: 132 },
	{ month: 'February', desktop: 130, mobile: 190 },
	{ month: 'March', desktop: 260, mobile: 150 },
	{ month: 'April', desktop: 170, mobile: 220 },
]

const config = {
	desktop: {
		label: 'Desktop',
		color: 'var(--chart-1)',
	},
	mobile: {
		label: 'Mobile',
		color: 'var(--chart-2)',
	},
	tablet: {
		label: 'Tablet',
		color: 'var(--chart-3)',
	},
	visitors: {
		label: 'Visitors',
		color: 'var(--chart-1)',
	},
} satisfies ChartConfig

const themed = {
	desktop: {
		label: 'Desktop',
		theme: {
			dark: '#6cc3d5',
			light: '#234c6a',
		},
	},
	mobile: {
		label: 'Mobile',
		theme: {
			dark: '#d2c1b6',
			light: '#3596ac',
		},
	},
} satisfies ChartConfig

const outerScope = {
	desktop: {
		label: 'Outer',
		color: '#123456',
	},
} satisfies ChartConfig

const innerScope = {
	desktop: {
		label: 'Inner',
		color: '#abcdef',
	},
} satisfies ChartConfig

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const waitFrames = async (count: number) => {
	for (let index = 0; index < count; index++) await nextFrame()
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

const expectAnimation = (element: Element, name: string) => {
	if (reducedMotion()) return
	const names = getComputedStyle(element).animationName.split(',').map(item => item.trim())
	if (!names.includes(name)) throw new Error(`Expected ${name} animation, got ${names.join(', ')}`)
}

const expectTransitionProperties = (element: Element, props: string[]) => {
	if (reducedMotion()) return
	const properties = getComputedStyle(element).transitionProperty.split(',').map(item => item.trim())
	for (const prop of props) {
		if (!properties.includes(prop)) throw new Error(`Expected transition-property to include ${prop}; got ${properties.join(', ')}`)
	}
}

const movePointer = async (svg: SVGSVGElement, clientX: number, clientY: number) => {
	svg.dispatchEvent(new PointerEvent('pointermove', {
		bubbles: true,
		clientX,
		clientY,
	}))
	await waitFrames(2)
	return { x: clientX, y: clientY }
}

const svgClientPoint = (svg: SVGSVGElement, x: number, y: number) => {
	const rect = svg.getBoundingClientRect()
	const view = svg.viewBox.baseVal
	return {
		x: rect.left + ((x - view.x) / view.width) * rect.width,
		y: rect.top + ((y - view.y) / view.height) * rect.height,
	}
}

const boxCenter = (box: DOMRect) => ({
	x: box.left + box.width / 2,
	y: box.top + box.height / 2,
})

const distanceFromBox = (point: { x: number; y: number }, box: DOMRect) => {
	const dx = point.x < box.left ? box.left - point.x : point.x > box.right ? point.x - box.right : 0
	const dy = point.y < box.top ? box.top - point.y : point.y > box.bottom ? point.y - box.bottom : 0
	return Math.hypot(dx, dy)
}

const activateFirst = async (canvas: HTMLElement, selector: string) => {
	const target = canvas.querySelector<SVGElement>(selector)
	if (!target) throw new Error(`Missing chart target ${selector}`)
	const svg = target instanceof SVGSVGElement ? target : target.ownerSVGElement
	if (!svg) throw new Error(`Missing owner SVG for ${selector}`)
	const box = target.getBoundingClientRect()
	return movePointer(svg, box.left + box.width / 2, box.top + box.height / 2)
}

const expectTooltip = (canvas: HTMLElement, text: string) => {
	const tooltip = canvas.querySelector('[data-slot="chart-tooltip"]')
	if (!tooltip) throw new Error('Chart tooltip was not rendered')
	if (!tooltip.textContent?.includes(text)) throw new Error(`Chart tooltip did not include ${text}`)
	return tooltip as HTMLElement
}

const expectTooltipInside = (canvas: HTMLElement) => {
	const chart = canvas.querySelector<HTMLElement>('[data-slot="chart"]')
	if (!chart) throw new Error('Chart root was not rendered')
	const tooltip = canvas.querySelector<HTMLElement>('[data-slot="chart-tooltip"]')
	if (!tooltip) throw new Error('Chart tooltip was not rendered')

	const root = chart.getBoundingClientRect()
	const tip = tooltip.getBoundingClientRect()
	const slack = 1
	if (tip.left < root.left - slack || tip.right > root.right + slack || tip.top < root.top - slack || tip.bottom > root.bottom + slack) {
		throw new Error('Chart tooltip escaped the chart root bounds')
	}

	return tooltip
}

const expectTooltipNear = async (canvas: HTMLElement, target: Element, maxDistance = 120) => {
	let distance = Number.POSITIVE_INFINITY

	for (let attempt = 0; attempt < 24; attempt++) {
		const tooltip = expectTooltipInside(canvas)
		distance = distanceFromBox(boxCenter(target.getBoundingClientRect()), tooltip.getBoundingClientRect())
		if (distance <= maxDistance) return
		await waitFrames(1)
	}

	throw new Error(`Chart tooltip was ${distance.toFixed(1)}px from the active datum`)
}

const expectRectStable = (before: DOMRect, after: DOMRect, label: string) => {
	const moved = Math.max(
		Math.abs(before.left - after.left),
		Math.abs(before.top - after.top),
		Math.abs(before.width - after.width),
		Math.abs(before.height - after.height),
	)
	if (moved > 1) throw new Error(`${label} moved by ${moved.toFixed(1)}px`)
}

const expectBarHighlight = async (active: Element, inactive: Element) => {
	let activeOpacity = 1
	let inactiveOpacity = 1

	for (let attempt = 0; attempt < 12; attempt++) {
		activeOpacity = Number(getComputedStyle(active).opacity)
		inactiveOpacity = Number(getComputedStyle(inactive).opacity)
		if (activeOpacity === 1 && inactiveOpacity < 1) return
		await waitFrames(1)
	}

	if (activeOpacity !== 1) throw new Error(`Active bar opacity was ${activeOpacity}`)
	throw new Error(`Inactive bar opacity was ${inactiveOpacity}`)
}

const UpdatingBars: Stateful = function* () {
	let alternate = false
	const swap = () => this.next(() => alternate = !alternate)

	while (true) {
		const current = alternate ? nextData : updateData

		yield (
			<div class="grid max-w-3xl gap-3">
				<Button type="button" variant="outline" size="sm" data-chart-update="true" set:onclick={swap}>
					Swap data
				</Button>
				<ChartContainer
					config={config}
					data={current}
					xKey="month"
					series={['desktop', 'mobile']}
					label="Animated data update contract"
					class="rounded-lg glass edge p-4 shadow-xs"
				>
					<ChartBar />
				</ChartContainer>
			</div>
		)
	}
}

export default {
	title: 'UI/Chart',
	parameters: {
		docs: { description: 'Dependency-free Ajo SVG charts with Ajo Kit config, tooltip, and legend slots.' },
		layout: 'padded',
	},
} satisfies Meta

export const Bar: Story = {
	render: () => (
		<ChartContainer
			config={config}
			data={data}
			xKey="month"
			series={['desktop', 'mobile']}
			label="Monthly traffic by device"
			description="Grouped bars showing desktop and mobile traffic for six months."
			class="max-w-3xl rounded-lg glass edge p-4 shadow-xs"
		>
			<ChartBar />
			<ChartTooltip content={<ChartTooltipContent />} />
			<ChartLegend content={<ChartLegendContent />} />
		</ChartContainer>
	),
	play: async ({ canvas }) => {
		const bars = canvas.querySelectorAll<SVGRectElement>('[data-slot="chart-bar"] rect[data-chart-series]')
		if (bars.length !== data.length * 2) throw new Error('Bar chart did not render the expected bar count')

		const svg = canvas.querySelector<SVGSVGElement>('[data-slot="chart-bar"]')
		if (!svg) throw new Error('Bar chart SVG was not rendered')

		const firstBars = Array.from(bars).filter(bar => bar.getAttribute('data-chart-index') === '0')
		if (firstBars.length !== 2) throw new Error('Bar chart did not render the first grouped bars')
		const firstRects = firstBars.map(bar => bar.getBoundingClientRect())
		const firstGroup = {
			left: Math.min(...firstRects.map(rect => rect.left)),
			right: Math.max(...firstRects.map(rect => rect.right)),
			top: Math.min(...firstRects.map(rect => rect.top)),
			bottom: Math.max(...firstRects.map(rect => rect.bottom)),
		}
		const firstGroupCenter = {
			x: (firstGroup.left + firstGroup.right) / 2,
			y: (firstGroup.top + firstGroup.bottom) / 2,
		}

		const firstLabel = Array.from(svg.querySelectorAll<SVGTextElement>('text'))
			.find(label => label.textContent?.trim() === 'January')
		if (!firstLabel) throw new Error('Bar chart did not render the first x-axis label')
		const labelX = Number(firstLabel.getAttribute('x'))
		const labelClientX = svgClientPoint(svg, labelX, 0).x
		if (Math.abs(labelClientX - firstGroupCenter.x) > 8) {
			throw new Error('First x-axis label was not centered under the first bar group')
		}

		await movePointer(svg, firstGroupCenter.x, firstGroupCenter.y)
		expectTooltip(canvas, 'January')
		expectTooltip(canvas, 'Desktop')
		await expectTooltipNear(canvas, firstBars[0]!)

		const active = canvas.querySelector<SVGRectElement>('[data-slot="chart-bar"] rect[data-chart-index="0"][data-active="true"]')
		const inactive = canvas.querySelector<SVGRectElement>('[data-slot="chart-bar"] rect[data-chart-index="1"]')
		if (!active || !inactive) throw new Error('Bar chart did not mark active and inactive bars')
		await expectBarHighlight(active, inactive)

		const rect = svg.getBoundingClientRect()
		await movePointer(svg, rect.right - 1, rect.top + rect.height / 2)
		expectTooltipInside(canvas)
	},
}

export const Line: Story = {
	render: () => (
		<ChartContainer
			config={config}
			data={data}
			xKey="month"
			series={['desktop', 'mobile', 'tablet']}
			type="line"
			label="Monthly traffic trend"
			class="max-w-3xl rounded-lg glass edge p-4 shadow-xs"
		>
			<ChartLine />
			<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
			<ChartLegend />
		</ChartContainer>
	),
	play: async ({ canvas }) => {
		const circles = canvas.querySelectorAll('[data-slot="chart-line"] circle[data-chart-series], [data-slot="chart-line"] circle[data-chart-index]')
		if (circles.length < data.length) throw new Error('Line chart did not render focusable points')

		await activateFirst(canvas, '[data-slot="chart-line"] circle[data-chart-index="1"]')
		expectTooltip(canvas, 'Desktop')
	},
}

export const Area: Story = {
	render: () => (
		<ChartContainer
			config={config}
			data={data}
			xKey="month"
			series={['desktop', 'mobile']}
			type="area"
			label="Monthly traffic area chart"
			class="max-w-3xl rounded-lg glass edge p-4 shadow-xs"
		>
			<ChartArea />
			<ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
			<ChartLegend />
		</ChartContainer>
	),
	play: async ({ canvas }) => {
		const areas = canvas.querySelectorAll('[data-slot="chart-area"] path[fill-opacity]')
		if (areas.length !== 2) throw new Error('Area chart did not render area fills')
	},
}

export const Pie: Story = {
	render: () => (
		<ChartContainer
			config={config}
			data={pieData}
			xKey="browser"
			series={['visitors']}
			type="pie"
			label="Browser share"
			class="max-w-xl rounded-lg glass edge p-4 shadow-xs"
		>
			<ChartPie innerRadius={58} />
			<ChartTooltip content={<ChartTooltipContent hideIndicator />} />
			<ChartLegend />
		</ChartContainer>
	),
	play: async ({ canvas }) => {
		const slices = canvas.querySelectorAll('[data-slot="chart-pie"] path[data-chart-index]')
		if (slices.length !== pieData.length) throw new Error('Pie chart did not render all slices')

		const svg = canvas.querySelector<SVGSVGElement>('[data-slot="chart-pie"]')
		const legend = canvas.querySelector<HTMLElement>('[data-slot="chart-legend"]')
		if (!svg || !legend) throw new Error('Pie story did not render the SVG and legend')
		const before = legend.getBoundingClientRect()
		const size = svg.viewBox.baseVal.width
		const center = size / 2
		const radius = center - 12
		const total = pieData.reduce((sum, row) => sum + row.visitors, 0)
		const middle = -Math.PI / 2 + ((pieData[0]!.visitors / total) * Math.PI * 2) / 2
		const slice = svgClientPoint(
			svg,
			center + radius * 0.78 * Math.cos(middle),
			center + radius * 0.78 * Math.sin(middle),
		)
		await movePointer(svg, slice.x, slice.y)
		expectTooltip(canvas, 'Chrome')

		const hole = svgClientPoint(svg, center, center)
		await movePointer(svg, hole.x, hole.y)
		await waitFrames(2)
		const after = canvas.querySelector<HTMLElement>('[data-slot="chart-legend"]')
		if (!after) throw new Error('Pie legend was not rendered after clearing hover')
		expectRectStable(before, after.getBoundingClientRect(), 'Pie legend')
	},
}

export const EntryAnimations: Story = {
	render: () => (
		<div class="grid max-w-3xl gap-6">
			<ChartContainer
				id="entry-bars"
				config={config}
				data={data.slice(0, 3)}
				xKey="month"
				series={['desktop']}
				label="Chart bar entry animation contract"
				class="rounded-lg glass edge p-4 shadow-xs"
			>
				<ChartBar />
			</ChartContainer>
			<ChartContainer
				id="entry-line"
				config={config}
				data={data.slice(0, 3)}
				xKey="month"
				series={['desktop']}
				type="line"
				label="Chart line entry animation contract"
				class="rounded-lg glass edge p-4 shadow-xs"
			>
				<ChartLine />
			</ChartContainer>
		</div>
	),
	play: async ({ canvas }) => {
		const bar = canvas.querySelector('[data-slot="chart-bar"] rect[data-chart-series="desktop"]')
		const line = canvas.querySelector('[data-slot="chart-line"] path[fill="none"]')
		if (!bar) throw new Error('Entry animation story did not render a bar rect')
		if (!line) throw new Error('Entry animation story did not render a line path')
		if (line.getAttribute('pathLength') !== '1') throw new Error('Line path did not include pathLength=1')

		expectAnimation(bar, 'chart-grow')
		expectAnimation(line, 'chart-draw')
	},
}

export const DataUpdateTransitions: Story = {
	render: () => <UpdatingBars />,
	play: async ({ canvas }) => {
		const selector = '[data-slot="chart-bar"] rect[data-chart-series="desktop"][data-chart-index="0"]'
		const rect = canvas.querySelector<SVGRectElement>(selector)
		const button = canvas.querySelector<HTMLButtonElement>('button[data-chart-update="true"]')
		const chart = canvas.querySelector<HTMLElement>('[data-slot="chart"]')
		const style = chart?.querySelector<HTMLStyleElement>('style[data-chart-style]')
		const identity = style?.dataset.chartStyle
		if (!rect) throw new Error('Data update story did not render the first desktop bar')
		if (!button) throw new Error('Data update story did not render the swap button')
		if (!identity) throw new Error('ChartContainer did not expose its generated style identity')
		if (chart?.hasAttribute('data-chart')) throw new Error('Chart root retained legacy style identity ownership')
		if (!style.textContent?.includes(`[data-slot="chart"]:has(>style[data-chart-style="${identity}"])`)) {
			throw new Error('ChartStyle selector did not use its generated identity')
		}

		expectTransitionProperties(rect, ['x', 'y', 'width', 'height'])
		const before = {
			height: rect.getAttribute('height'),
			y: rect.getAttribute('y'),
		}

		button.click()
		await waitFrames(2)

		const updated = canvas.querySelector<SVGRectElement>(selector)
		const updatedStyle = canvas.querySelector<HTMLStyleElement>('[data-slot="chart"] > style[data-chart-style]')
		if (!updated) throw new Error('Data update story lost the first desktop bar after swap')
		if (updatedStyle?.dataset.chartStyle !== identity) throw new Error('Chart identity changed across a parent rerender')
		if (!updatedStyle.textContent?.includes(`[data-slot="chart"]:has(>style[data-chart-style="${identity}"])`)) {
			throw new Error('ChartStyle selector drifted from the stable identity')
		}
		const after = {
			height: updated.getAttribute('height'),
			y: updated.getAttribute('y'),
		}
		if (before.height === after.height && before.y === after.y) {
			throw new Error('Data update did not change bar geometry attributes')
		}
	},
}

export const ThemedColors: Story = {
	render: () => (
		<ChartContainer
			id="Sales Q1/Total"
			config={themed}
			data={data}
			xKey="month"
			series={['desktop', 'mobile']}
			label="Theme aware chart colors"
			class="max-w-3xl rounded-lg glass edge p-4 shadow-xs"
		>
			<ChartBar />
			<ChartLegend />
		</ChartContainer>
	),
	play: async ({ canvas }) => {
		const chart = canvas.querySelector<HTMLElement>('[data-slot="chart"]')
		const style = chart?.querySelector<HTMLStyleElement>('style[data-chart-style]')
		if (chart?.id !== 'Sales Q1/Total') throw new Error('ChartContainer changed the explicit DOM id')
		if (style?.dataset.chartStyle !== 'chart-Sales%20Q1%2FTotal') {
			throw new Error('ChartStyle did not encode the explicit DOM id without collisions')
		}
		if (!style?.textContent?.includes('--color-desktop')) {
			throw new Error('ChartStyle did not emit theme-aware CSS variables')
		}
		if (!style.textContent.includes('[data-slot="chart"]:has(>style[data-chart-style="chart-Sales%20Q1%2FTotal"])')) {
			throw new Error('ChartStyle selector did not match its explicit identity marker')
		}
		if (!getComputedStyle(chart).getPropertyValue('--color-desktop').trim()) {
			throw new Error('ChartStyle scoped variables did not apply to the chart root')
		}
	},
}

export const NestedScopes: Story = {
	render: () => (
		<ChartContainer
			id="C++"
			config={outerScope}
			data={[{ desktop: 42 }]}
			class="max-w-3xl rounded-lg glass edge p-4 shadow-xs"
		>
			<ChartBar />
			<ChartContainer
				id="C##"
				config={innerScope}
				data={[{ desktop: 24 }]}
				class="mt-4 rounded-md border p-3"
			>
				<ChartBar />
			</ChartContainer>
		</ChartContainer>
	),
	play: async ({ canvas }) => {
		const charts = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="chart"]'))
		if (charts.length !== 2) throw new Error(`Expected two nested chart roots, got ${charts.length}`)

		const outerColor = getComputedStyle(charts[0]!).getPropertyValue('--color-desktop').trim()
		const innerColor = getComputedStyle(charts[1]!).getPropertyValue('--color-desktop').trim()
		if (outerColor !== '#123456') throw new Error(`Inner ChartStyle escaped into outer scope: ${outerColor}`)
		if (innerColor !== '#abcdef') throw new Error(`Inner ChartStyle did not own its scope: ${innerColor}`)
	},
}
