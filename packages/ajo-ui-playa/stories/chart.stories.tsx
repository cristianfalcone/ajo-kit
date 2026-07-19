/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import Button from 'ajo-ui-playa/button'
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
} from 'ajo-ui-playa/chart'

const data = [
	{ month: 'January', desktop: 186, mobile: 80, tablet: 42 },
	{ month: 'February', desktop: 305, mobile: 200, tablet: 68 },
	{ month: 'March', desktop: 237, mobile: 120, tablet: 52 },
	{ month: 'April', desktop: 73, mobile: 190, tablet: 80 },
	{ month: 'May', desktop: 209, mobile: 130, tablet: 74 },
	{ month: 'June', desktop: 214, mobile: 140, tablet: 88 },
]

const geometryData = [
	{ month: 'Top left', desktop: 100 },
	{ month: 'Bottom', desktop: 0 },
	{ month: 'Middle', desktop: 52 },
	{ month: 'Right edge', desktop: 84 },
]

const signedData = [
	{ month: 'Positive', desktop: 200 },
	{ month: 'Negative', desktop: -100 },
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
	const matrix = svg.getScreenCTM()
	if (!matrix) throw new Error('SVG did not expose a screen transform')
	const point = svg.createSVGPoint()
	point.x = x
	point.y = y
	const client = point.matrixTransform(matrix)
	return { x: client.x, y: client.y }
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

const expectRectStable = (before: DOMRect, after: DOMRect, label: string) => {
	const moved = Math.max(
		Math.abs(before.left - after.left),
		Math.abs(before.top - after.top),
		Math.abs(before.width - after.width),
		Math.abs(before.height - after.height),
	)
	if (moved > 1) throw new Error(`${label} moved by ${moved.toFixed(1)}px`)
}

const rectDistance = (left: DOMRect, right: DOMRect) => Math.hypot(
	left.left - right.left,
	left.top - right.top,
)

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

const expectBarCorners = (
	svg: SVGSVGElement,
	bar: SVGGeometryElement,
	direction: 'negative' | 'positive',
) => {
	const box = bar.getBBox()
	const inset = Math.min(1, box.width / 4, box.height / 4)
	const painted = (x: number, y: number) => {
		const matrix = bar.getScreenCTM()
		if (!matrix) throw new Error('Bar did not expose a screen transform')
		const point = svg.createSVGPoint()
		point.x = x
		point.y = y
		const client = point.matrixTransform(matrix)
		return bar.ownerDocument.elementsFromPoint(client.x, client.y).includes(bar)
	}
	const top = [
		painted(box.x + inset, box.y + inset),
		painted(box.x + box.width - inset, box.y + inset),
	]
	const bottom = [
		painted(box.x + inset, box.y + box.height - inset),
		painted(box.x + box.width - inset, box.y + box.height - inset),
	]
	const base = direction === 'positive' ? bottom : top
	const free = direction === 'positive' ? top : bottom
	if (!base.every(Boolean)) throw new Error(`${direction} bar rounded a corner where it meets the axis`)
	if (!free.every(value => !value)) throw new Error(`${direction} bar lost a rounded free corner`)
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

const RetargetingChart: Stateful = function* () {
	let showBar = true
	const removeBar = () => this.next(() => showBar = false)

	while (true) {
		yield (
			<div class="grid w-[560px] gap-3" data-story-field="chart-retarget">
				<Button type="button" variant="outline" size="sm" data-chart-remove="bar" set:onclick={removeBar}>
					Remove active plot
				</Button>
				<ChartContainer
					config={config}
					data={geometryData}
					xKey="month"
					series={['desktop']}
					label="Floating tooltip retarget contract"
					class="rounded-lg glass edge p-4 shadow-xs"
				>
					{showBar ? <ChartBar key="bar" class="absolute inset-0" data-retarget-plot="bar" /> : null}
					<ChartLine key="line" class="pointer-events-none absolute inset-0" data-retarget-plot="line" />
					<ChartTooltip />
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
		const firstRects = firstBars.map(bar => ({
			bottom: Number(bar.getAttribute('y')) + Number(bar.getAttribute('height')),
			left: Number(bar.getAttribute('x')),
			right: Number(bar.getAttribute('x')) + Number(bar.getAttribute('width')),
			top: Number(bar.getAttribute('y')),
		}))
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
		if (Math.abs(labelX - firstGroupCenter.x) > 8) {
			throw new Error('First x-axis label was not centered under the first bar group')
		}

		const firstClient = svgClientPoint(svg, firstGroupCenter.x, firstGroupCenter.y)
		await movePointer(svg, firstClient.x, firstClient.y)
		expectTooltip(canvas, 'January')
		expectTooltip(canvas, 'Desktop')
		expectTooltipInside(canvas)

		const active = canvas.querySelector<SVGRectElement>('[data-slot="chart-bar"] rect[data-chart-index="0"][data-active="true"]')
		const inactive = canvas.querySelector<SVGRectElement>('[data-slot="chart-bar"] rect[data-chart-index="1"]')
		if (!active || !inactive) throw new Error('Bar chart did not mark active and inactive bars')
		await expectBarHighlight(active, inactive)

		const rect = svg.getBoundingClientRect()
		await movePointer(svg, rect.right - 1, rect.top + rect.height / 2)
		expectTooltipInside(canvas)
	},
}

export const BarCorners: Story = {
	parameters: {
		docs: { description: 'Bars keep the axis end square and round only the free end for positive and negative values.' },
	},
	render: () => (
		<ChartContainer
			config={config}
			data={signedData}
			xKey="month"
			series={['desktop']}
			label="Signed bar corner contract"
			class="max-w-3xl rounded-lg glass edge p-4 shadow-xs"
		>
			<ChartBar />
		</ChartContainer>
	),
	play: async ({ canvas }) => {
		const svg = canvas.querySelector<SVGSVGElement>('[data-slot="chart-bar"]')
		const positive = svg?.querySelector<SVGGeometryElement>('[data-chart-series="desktop"][data-chart-index="0"]')
		const negative = svg?.querySelector<SVGGeometryElement>('[data-chart-series="desktop"][data-chart-index="1"]')
		if (!svg || !positive || !negative) throw new Error('Signed bar corner fixture was not rendered')

		positive.style.animation = 'none'
		negative.style.animation = 'none'
		await waitFrames(1)
		const positiveBox = positive.getBBox()
		const negativeBox = negative.getBBox()
		if (Math.abs(positiveBox.y + positiveBox.height - negativeBox.y) > 0.5) {
			throw new Error('Signed bars did not share their zero baseline')
		}
		expectBarCorners(svg, positive, 'positive')
		expectBarCorners(svg, negative, 'negative')
	},
}

export const FloatingGeometry: Story = {
	parameters: {
		docs: { description: 'Bounded virtual-point tooltip: coalesced endpoints, themed retarget motion, edge flip/shift, SVG resize tracking, keyboard activation, and synchronous cleanup.' },
	},
	render: () => (
		<div data-story-field="chart-geometry" style="width:560px">
			<ChartContainer
				config={config}
				data={geometryData}
				xKey="month"
				series={['desktop']}
				label="Floating tooltip geometry contract"
				class="rounded-lg glass edge p-4 shadow-xs"
			>
				<ChartBar />
				<ChartTooltip />
			</ChartContainer>
		</div>
	),
	play: async ({ canvas }) => {
		const wrapper = canvas.querySelector<HTMLElement>('[data-story-field="chart-geometry"]')
		const root = wrapper?.querySelector<HTMLElement>('[data-slot="chart"]')
		const svg = root?.querySelector<SVGSVGElement>('[data-slot="chart-bar"]')
		if (!wrapper || !root || !svg) throw new Error('Chart geometry fixture was not rendered')
		const viewport = svg.getBoundingClientRect()
		const viewBox = svg.viewBox.baseVal
		if (Math.abs(viewport.width / viewport.height - viewBox.width / viewBox.height) < 0.25) {
			throw new Error('Chart geometry fixture must exercise SVG preserveAspectRatio letterboxing')
		}
		svg.style.transformOrigin = 'center'
		svg.style.transform = 'translate(7px, 3px) rotate(1deg)'
		await waitFrames(1)
		const transformed = svg.getScreenCTM()
		if (!transformed || Math.abs(transformed.b) < 0.001 || Math.abs(transformed.c) < 0.001) {
			throw new Error('Chart geometry fixture must exercise a non-axis-aligned SVG transform')
		}

		const bar = (index: number) => {
			const found = svg.querySelector<SVGRectElement>(`rect[data-chart-index="${index}"][data-chart-series="desktop"]`)
			if (!found) throw new Error(`Missing geometry bar ${index}`)
			return found
		}
		const datumPoint = (index: number) => {
			const mark = bar(index)
			return svgClientPoint(
				svg,
				Number(mark.getAttribute('x')) + Number(mark.getAttribute('width')) / 2,
				Number(mark.getAttribute('y')),
			)
		}
		const dispatch = (index: number) => {
			const point = datumPoint(index)
			svg.dispatchEvent(new PointerEvent('pointermove', {
				bubbles: true,
				clientX: point.x,
				clientY: point.y,
			}))
		}
		const datumGap = (tooltip: HTMLElement, index: number) => {
			const tip = tooltip.getBoundingClientRect()
			const { x, y } = datumPoint(index)
			return tooltip.dataset.side === 'left' ? x - tip.right
				: tooltip.dataset.side === 'right' ? tip.left - x
					: tooltip.dataset.side === 'top' ? y - tip.bottom
						: tooltip.dataset.side === 'bottom' ? tip.top - y
							: Number.POSITIVE_INFINITY
		}
		const expectAttached = async (index: number, label: string) => {
			let tooltip: HTMLElement | null = null
			let gap = Number.POSITIVE_INFINITY
			for (let attempt = 0; attempt < 24; attempt++) {
				tooltip = root.querySelector<HTMLElement>('[data-slot="chart-tooltip"]')
				if (tooltip) {
					gap = datumGap(tooltip, index)
					if (Math.abs(gap - 12) < 2) break
				}
				await waitFrames(1)
			}
			if (!tooltip) throw new Error(`${label} did not render a tooltip`)
			if (Math.abs(gap - 12) >= 2) {
				const point = datumPoint(index)
				const tip = tooltip.getBoundingClientRect()
				throw new Error(`${label} resolved a ${gap.toFixed(1)}px main-axis gap; placement=${tooltip.dataset.placement}; transform=${tooltip.style.transform}; reference=${point.x.toFixed(1)},${point.y.toFixed(1)}; tooltip=${tip.left.toFixed(1)},${tip.top.toFixed(1)}..${tip.right.toFixed(1)},${tip.bottom.toFixed(1)}; text=${tooltip.textContent?.trim()}`)
			}
			expectTooltipInside(canvas)
			return tooltip
		}

		dispatch(0)
		let tooltip = await expectAttached(0, 'Top-left datum')
		if (tooltip.dataset.side !== 'right') throw new Error(`Top-left datum expected right placement, got ${tooltip.dataset.placement}`)
		if (!tooltip.style.transform.startsWith('translate(') || !tooltip.style.transform.includes(', ')) {
			throw new Error(`Chart must use one DPR-rounded 2D transform, got ${tooltip.style.transform}`)
		}
		if (tooltip.style.willChange !== 'transform') throw new Error('Active Chart tooltip did not mark its transform writer')

		dispatch(1)
		await expectAttached(1, 'Bottom datum')

		// Several pointer updates before the Adapter settles must collapse onto
		// the latest endpoint; CSS may interpolate it without stale geometry.
		for (const index of [2, 0, 1, 2, 3]) dispatch(index)
		tooltip = await expectAttached(3, 'Rapid final datum')
		if (!tooltip.textContent?.includes('Right edge')) throw new Error('Rapid movement did not settle on the final datum')
		if (tooltip.dataset.side !== 'left') throw new Error(`Right edge did not flip left, got ${tooltip.dataset.placement}`)

		const beforeResize = svg.getBoundingClientRect().width
		wrapper.style.width = '360px'
		for (let attempt = 0; attempt < 24 && Math.abs(svg.getBoundingClientRect().width - beforeResize) < 1; attempt++) {
			await waitFrames(1)
		}
		if (Math.abs(svg.getBoundingClientRect().width - beforeResize) < 1) {
			throw new Error('Chart fixture did not resize its SVG viewport')
		}
		tooltip = await expectAttached(3, 'Resized right datum')

		bar(0).focus()
		tooltip = await expectAttached(0, 'Keyboard datum')
		if (!tooltip.textContent?.includes('Top left')) throw new Error('Keyboard focus did not activate the focused datum')

		const detached = tooltip
		svg.dispatchEvent(new PointerEvent('pointerleave'))
		await waitFrames(2)
		if (root.querySelector('[data-slot="chart-tooltip"]')) throw new Error('Pointer leave did not remove the Chart tooltip')
		if (detached.style.transform || detached.style.willChange) throw new Error('Inactive Chart tooltip retained Adapter transform state')

		for (let cycle = 0; cycle < 12; cycle++) {
			dispatch(cycle % geometryData.length)
			const current = await expectAttached(cycle % geometryData.length, 'Chart lifecycle cycle')
			svg.dispatchEvent(new PointerEvent('pointerleave'))
			await waitFrames(1)
			if (root.querySelector('[data-slot=chart-tooltip]')) throw new Error('A Chart lifecycle cycle retained its tooltip')
			if (current.style.transform || current.style.willChange) throw new Error('A Chart lifecycle cycle retained Adapter output')
		}

		// Leave one bounded edge state visible for light/dark visual baselines.
		svg.style.transform = ''
		svg.style.transformOrigin = ''
		dispatch(3)
		await expectAttached(3, 'Final visual datum')
	},
}

export const FloatingRetarget: Story = {
	parameters: {
		docs: { description: 'One tooltip retargets between SVG plots, releases an unmounted active plot, and observes only the current SVG.' },
	},
	render: () => <RetargetingChart />,
	play: async ({ canvas }) => {
		const wrapper = canvas.querySelector<HTMLElement>('[data-story-field="chart-retarget"]')
		const root = wrapper?.querySelector<HTMLElement>('[data-slot="chart"]')
		const barSvg = root?.querySelector<SVGSVGElement>('[data-retarget-plot="bar"]')
		const lineSvg = root?.querySelector<SVGSVGElement>('[data-retarget-plot="line"]')
		const remove = wrapper?.querySelector<HTMLButtonElement>('[data-chart-remove="bar"]')
		if (!wrapper || !root || !barSvg || !lineSvg || !remove) throw new Error('Chart retarget fixture was not rendered')

		const datum = (svg: SVGSVGElement, kind: 'bar' | 'line') => {
			if (kind === 'line') {
				const mark = svg.querySelector<SVGCircleElement>('circle[data-chart-index="0"]')
				if (!mark) throw new Error('Missing line retarget datum')
				return {
					mark,
					point: svgClientPoint(svg, Number(mark.getAttribute('cx')), Number(mark.getAttribute('cy'))),
				}
			}
			const mark = svg.querySelector<SVGRectElement>('rect[data-chart-index="0"]')
			const label = Array.from(svg.querySelectorAll<SVGTextElement>('text')).find(item => item.textContent?.trim() === 'Top left')
			if (!mark || !label) throw new Error('Missing bar retarget datum')
			return {
				mark,
				point: svgClientPoint(svg, Number(label.getAttribute('x')), Number(mark.getAttribute('y'))),
			}
		}
		const expectAttached = async (svg: SVGSVGElement, kind: 'bar' | 'line', label: string) => {
			let gap = Number.POSITIVE_INFINITY
			for (let attempt = 0; attempt < 24; attempt++) {
				const tooltip = root.querySelector<HTMLElement>('[data-slot="chart-tooltip"]')
				if (tooltip) {
					const point = datum(svg, kind).point
					const tip = tooltip.getBoundingClientRect()
					gap = tooltip.dataset.side === 'left' ? point.x - tip.right
						: tooltip.dataset.side === 'right' ? tip.left - point.x
							: tooltip.dataset.side === 'top' ? point.y - tip.bottom
								: tooltip.dataset.side === 'bottom' ? tip.top - point.y
									: Number.POSITIVE_INFINITY
					if (Math.abs(gap - 12) < 2) return
				}
				await waitFrames(1)
			}
			throw new Error(`${label} did not attach to its current SVG datum; gap=${gap.toFixed(1)}`)
		}

		const bar = datum(barSvg, 'bar')
		bar.mark.focus()
		await expectAttached(barSvg, 'bar', 'Initial bar')

		const line = datum(lineSvg, 'line')
		line.mark.focus()
		await expectAttached(lineSvg, 'line', 'Retargeted line')

		bar.mark.focus()
		await expectAttached(barSvg, 'bar', 'Retargeted bar')
		remove.click()
		await waitFrames(2)
		if (root.querySelector('[data-retarget-plot="bar"]')) throw new Error('Active bar plot was not removed')
		if (root.querySelector('[data-slot="chart-tooltip"]')) throw new Error('Unmounting the active SVG retained its tooltip')

		const currentLine = root.querySelector<SVGSVGElement>('[data-retarget-plot="line"]')
		if (!currentLine) throw new Error('Line plot did not survive bar removal')
		const current = datum(currentLine, 'line')
		current.mark.focus()
		await expectAttached(currentLine, 'line', 'Line after release')

		const beforeResize = currentLine.getBoundingClientRect().width
		wrapper.style.width = '360px'
		for (let attempt = 0; attempt < 24 && Math.abs(currentLine.getBoundingClientRect().width - beforeResize) < 1; attempt++) {
			await waitFrames(1)
		}
		if (Math.abs(currentLine.getBoundingClientRect().width - beforeResize) < 1) throw new Error('Retarget fixture did not resize')
		await expectAttached(currentLine, 'line', 'Observed current line')
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

		const svg = canvas.querySelector<SVGSVGElement>('[data-slot="chart-area"]')
		const source = svg?.querySelector<SVGCircleElement>('[data-chart-series="desktop"] circle[data-chart-index="1"]')
		const target = svg?.querySelector<SVGCircleElement>('[data-chart-series="desktop"] circle[data-chart-index="4"]')
		if (!svg || !source || !target) throw new Error('Area chart did not render the tooltip motion fixture')
		const center = (point: SVGCircleElement) => svgClientPoint(
			svg,
			Number(point.getAttribute('cx')),
			Number(point.getAttribute('cy')),
		)

		const from = center(source)
		svg.dispatchEvent(new PointerEvent('pointermove', {
			bubbles: true,
			clientX: from.x,
			clientY: from.y,
		}))
		await waitFrames(1)
		const tooltip = canvas.querySelector<HTMLElement>('[data-slot="chart-tooltip"]')
		if (!tooltip) throw new Error('Area tooltip did not render after its first active frame')
		const first = tooltip.getBoundingClientRect()
		await waitFrames(16)
		const start = tooltip.getBoundingClientRect()
		if (rectDistance(first, start) > 2) throw new Error('Area tooltip animated from an unpositioned first frame')
		expectTooltip(canvas, 'February')

		const to = center(target)
		svg.dispatchEvent(new PointerEvent('pointermove', {
			bubbles: true,
			clientX: to.x,
			clientY: to.y,
		}))
		const samples: DOMRect[] = []
		for (let frame = 0; frame < 8; frame++) {
			await waitFrames(1)
			const current = canvas.querySelector<HTMLElement>('[data-slot="chart-tooltip"]')
			if (current !== tooltip) throw new Error('Area tooltip was replaced while retargeting')
			const style = getComputedStyle(current)
			if (style.visibility === 'hidden' || Number(style.opacity) < 0.99) {
				throw new Error('Area tooltip became hidden while retargeting')
			}
			samples.push(current.getBoundingClientRect())
		}
		await waitFrames(16)
		const end = tooltip.getBoundingClientRect()
		if (rectDistance(start, end) < 100) throw new Error('Area tooltip did not retarget to a distant datum')
		expectTooltip(canvas, 'May')
		if (!reducedMotion() && !samples.some(sample => rectDistance(start, sample) > 2 && rectDistance(end, sample) > 2)) {
			throw new Error('Area tooltip jumped directly to the next datum; no intermediate position was painted')
		}
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
