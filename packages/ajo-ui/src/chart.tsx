import type { Children, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { context } from 'ajo/context'
import { callRef, clamp, dom, frame, id as uniqueId, resize } from 'ajo-cloves'
import { rootAttrs, text } from './shared'
import type { FixedArgs, OmitArg } from './utils'

type ChartTheme = 'dark' | 'light'

/**
 * Labels, icons, and colors configured for each chart data key.
 * ChartContainer defines each color as a scoped `--color-<key>`, with a `.dark` variant;
 * keys outside `[A-Za-z0-9_-]` use the palette, and colors containing `;{}<>\` are dropped.
 */
export type ChartConfig = Record<
	string,
	{
		/** Human label used by tooltip and legend. */
		label?: Children
		/** Icon rendered by tooltip and legend in place of the color indicator. */
		icon?: Children
		/** CSS color for this data key. */
		color?: string
		/** Theme-specific colors for this data key. */
		theme?: Partial<Record<ChartTheme, string>>
	}
>

/** Native SVG visualization supported by ChartContainer. */
export type ChartType =
	| 'area'
	| 'bar'
	| 'line'
	| 'pie'

/** One keyed data row consumed by the native chart primitives. */
export type ChartDatum = Record<string, unknown>

/** Plot-area inset in SVG user units. */
export type ChartMargin = {
	bottom: number
	left: number
	right: number
	top: number
}

/** Resolved series value supplied to tooltip and legend formatters. */
export type ChartPayload = {
	color: string
	formattedValue: string
	index: number
	key: string
	label: Children
	row: ChartDatum
	value: number
}

/** Active chart coordinate and payload exposed through chart context. */
export type ChartActive = {
	index: number
	items: ChartPayload[]
	label: Children
	x: number
	y: number
}

/** Arguments for the accessible Chart data and context root. */
export type ChartContainerArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'children'> & {
	/** Labels, icons, and colors keyed by data key. */
	config: ChartConfig
	/** Rows to render when using the native SVG chart primitives. */
	data?: ChartDatum[]
	/** Key used for x-axis/category labels. */
	xKey?: string
	/** Selects pie or series legend entries. */
	type?: ChartType
	/** Data keys to plot, in order. Defaults to the config keys. */
	series?: string[]
	/** Accessible label for the chart image. */
	label?: string
	/** Accessible long description for the chart image. */
	description?: string
	/** SVG coordinate width used by native chart primitives. */
	width?: number
	/** SVG coordinate height used by native chart primitives. */
	height?: number
	/** SVG plot margins. */
	margin?: Partial<ChartMargin>
	/** Format category labels. */
	formatLabel?: (value: unknown, row: ChartDatum, index: number) => Children
	/** Format axis, accessible mark, and tooltip values. Defaults to the host locale. */
	formatValue?: (value: number, key: string, row: ChartDatum, index: number) => string
	/** Color palette used when a series has no configured color. */
	palette: string[]
}>

/** Arguments for native cartesian bar, line, and area plots. */
export type ChartPlotArgs = OmitArg<IntrinsicElements['svg'], 'children'> & {
	/** Show horizontal grid lines. */
	grid?: boolean
	/** Show axis lines and labels. */
	axis?: boolean
} & FixedArgs<'children'>

/** Arguments for a native pie or donut plot. */
export type ChartPieArgs = ChartPlotArgs & {
	/** Inner radius for donut charts, in SVG user units. */
	innerRadius?: number
}

/** Arguments for the active-value tooltip; children replace the default content. */
export type ChartTooltipArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'children'>>

/** Arguments for the default tooltip payload renderer. */
export type ChartTooltipContentArgs = OmitArg<IntrinsicElements['div'], 'children'> & {
	/** Indicator shape shown beside each row. */
	indicator?: 'dashed' | 'dot' | 'line'
	/** Hide the category label. */
	hideLabel?: boolean
	/** Hide the color indicator. */
	hideIndicator?: boolean
	/** Format the active label. */
	labelFormatter?: (label: Children, payload: ChartPayload[]) => Children
	/** Format each value row. */
	formatter?: (value: number, key: string, item: ChartPayload, index: number) => Children
} & FixedArgs<'children'>

/** Arguments for the chart legend; children replace the default entries. */
export type ChartLegendArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'children'> & {
	/** Hide configured icons and show color swatches instead. */
	hideIcon?: boolean
}>

type Point = { x: number; y: number }

type Series = { color: string; key: string; label: Children }

type ChartState = {
	active: ChartActive | null
	clearActive: () => void
	config: ChartConfig
	data: ChartDatum[]
	description?: string
	formatLabel: (value: unknown, row: ChartDatum, index: number) => Children
	formatValue: (value: number, key: string, row: ChartDatum, index: number) => string
	height: number
	id: string
	label?: string
	margin: ChartMargin
	palette: string[]
	/** The SVG whose mark is active. */
	plot: SVGSVGElement | null
	/** Clears the tooltip when the active plot left the document. */
	release: () => void
	root: Element | null
	series: Series[]
	setActive: (active: ChartActive, plot: SVGSVGElement) => void
	type: ChartType
	width: number
	xKey?: string
}

const ChartContext = context<ChartState | null>(null)

/** Read the stable identity resolved by the nearest ChartContainer. */
export const ChartIdContext = context<string | null>(null)

const DEFAULT_MARGIN: ChartMargin = { bottom: 32, left: 40, right: 16, top: 16 }
const DEFAULT_WIDTH = 640
const DEFAULT_HEIGHT = 240
const TOOLTIP_GAP = 12

const safeKey = /^[\w-]+$/
const unsafeColor = /[;{}<>\\]/

const number = (value: unknown) => {
	const next = Number(value)
	return Number.isFinite(next) ? next : undefined
}

const colorFor = (key: string, index: number, config: ChartConfig, palette: string[]) =>
	safeKey.test(key) && (config[key]?.color || config[key]?.theme) ? `var(--color-${key})` : palette[index % palette.length]

/** Scoped `--color-<key>` definitions for configured colors, light first and then `.dark`. */
const colorStyle = (id: string, config: ChartConfig) => {
	const scope = `[data-chart-scope=${id.replace(/%/g, '\\%')}] ~ *`
	return (['light', 'dark'] as const).map(theme => {
		const vars = Object.entries(config)
			.map(([key, item]) => [key, item.theme?.[theme] ?? item.color] as const)
			.filter(([key, color]) => safeKey.test(key) && color && !unsafeColor.test(color))
			.map(([key, color]) => `--color-${key}:${color};`)
			.join('')
		return vars ? `${theme === 'dark' ? '.dark ' : ''}${scope}{${vars}}` : ''
	}).join('')
}

const seriesEntries = (
	config: ChartConfig,
	series: string[] | undefined,
	data: ChartDatum[],
	xKey: string | undefined,
	palette: string[],
) => {
	const keys = series?.length
		? series
		: Object.keys(config).length
			? Object.keys(config)
			: Object.keys(data[0] ?? {}).filter(key => key !== xKey && number(data[0]?.[key]) != null)

	return keys.map((key, index): Series => ({
		color: colorFor(key, index, config, palette),
		key,
		label: config[key]?.label ?? key,
	}))
}

const defaultFormatLabel = (value: unknown, _row: ChartDatum, index: number) =>
	value == null ? `Item ${index + 1}` : String(value)

let numberFormatter: Intl.NumberFormat | undefined

/** Locale number format, or a plain rounded number where `Intl.NumberFormat` is absent (Ajo Engine SSR). */
const defaultFormatValue = (value: number) => typeof Intl.NumberFormat === 'function'
	? (numberFormatter ??= new Intl.NumberFormat()).format(value)
	: String(Math.round(value * 1e3) / 1e3)

const labelFor = (chart: ChartState, row: ChartDatum, index: number) =>
	chart.formatLabel(chart.xKey ? row[chart.xKey] : undefined, row, index)

const payloadFor = (chart: ChartState, index: number) => {
	const row = chart.data[index] ?? {}
	return chart.series
		.map(entry => {
			const value = number(row[entry.key])
			if (value == null) return undefined
			return {
				color: entry.color,
				formattedValue: chart.formatValue(value, entry.key, row, index),
				index,
				key: entry.key,
				label: entry.label,
				row,
				value,
			} satisfies ChartPayload
		})
		.filter(Boolean) as ChartPayload[]
}

/** True when the chart already shows this index of this plot for these keys. */
const showing = (chart: ChartState, index: number, plot: SVGSVGElement, keys: string[]) =>
	chart.active?.index === index
	&& chart.plot === plot
	&& chart.active.items.every(item => keys.includes(item.key))

/**
 * The value axis from zero through the data, on the smallest round step (1, 2
 * or 5 times a power of ten) that spans it in at most five intervals; the scale
 * ends on the outer ticks.
 */
const axis = (chart: ChartState) => {
	const values = chart.data.flatMap(row => chart.series.map(entry => number(row[entry.key])).filter(value => value != null))
	let min = Math.min(0, ...values)
	let max = Math.max(0, ...values)
	if (min === max) {
		min -= 1
		max += 1
	}
	const power = 10 ** Math.floor(Math.log10((max - min) / 5))
	// A step of twenty times the power always fits: it spans the range in under three intervals.
	const step = [1, 2, 5, 10, 20].map(factor => factor * power).find(step => Math.ceil(max / step) - Math.floor(min / step) <= 5)!
	const first = Math.floor(min / step)
	const ticks = Array.from({ length: Math.ceil(max / step) - first + 1 }, (_, index) => Number(((first + index) * step).toPrecision(12)))
	return { max: ticks[ticks.length - 1]!, min: ticks[0]!, ticks }
}

const scaled = (value: number, min: number, max: number, top: number, bottom: number) =>
	bottom - ((value - min) / (max - min)) * (bottom - top)

const plotBox = (chart: ChartState) => ({
	bottom: chart.height - chart.margin.bottom,
	left: chart.margin.left,
	right: chart.width - chart.margin.right,
	top: chart.margin.top,
})

const clientPoint = (svg: SVGSVGElement, x: number, y: number) => {
	if (!svg.isConnected) return null
	const matrix = svg.getScreenCTM()
	if (!matrix) return null
	const point = {
		x: matrix.a * x + matrix.c * y + matrix.e,
		y: matrix.b * x + matrix.d * y + matrix.f,
	}
	return Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null
}

const svgPoint = (svg: SVGSVGElement, clientX: number, clientY: number) => {
	const matrix = svg.getScreenCTM()
	if (!matrix) return null
	const determinant = matrix.a * matrix.d - matrix.b * matrix.c
	if (!Number.isFinite(determinant) || determinant === 0) return null
	const x = clientX - matrix.e
	const y = clientY - matrix.f
	return {
		x: (matrix.d * x - matrix.c * y) / determinant,
		y: (-matrix.b * x + matrix.a * y) / determinant,
	}
}

/** Index and plot of a focused mark. SVG has no `onfocusin` property, so marks share one focus handler. */
const focused = (event: FocusEvent) => {
	const mark = event.currentTarget as SVGElement
	return [Number(mark.getAttribute('data-chart-index')), mark.ownerSVGElement!] as const
}

/**
 * Clears the active mark once focus has left the chart's marks, so the tooltip
 * closes with focus. It checks after the focus change settles: focus may move
 * to a mark in another plot, and a mark can lose focus while a render removes it.
 */
const blurred = (chart: ChartState) => () => queueMicrotask(() => {
	const next = chart.root?.ownerDocument.activeElement
	if (!(next?.hasAttribute('data-chart-index') && chart.root!.contains(next))) chart.clearActive()
})

const plotRef = (chart: ChartState, ref: unknown) => (element: SVGSVGElement | null) => {
	if (!element) chart.release()
	callRef(ref, element)
}

/** Shared SVG root attributes for every native plot: a named group of focusable, named marks. */
const plotAttrs = (chart: ChartState, slot: string, ref: unknown) => ({
	'aria-describedby': chart.description ? `${chart.id}-description` : undefined,
	'aria-label': chart.label,
	'data-slot': slot,
	height: chart.height,
	ref: plotRef(chart, ref),
	role: 'group',
	width: '100%',
	xmlns: 'http://www.w3.org/2000/svg',
	'set:onpointerleave': chart.clearActive,
})

const plotTitle = (chart: ChartState) => <>
	{chart.label ? <title>{chart.label}</title> : null}
	{chart.description ? <desc id={`${chart.id}-description`}>{chart.description}</desc> : null}
</>

const linePath = (points: Point[]) =>
	points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')

const areaPath = (points: Point[], baseline: number) =>
	points.length ? `${linePath(points)} L ${points[points.length - 1]!.x} ${baseline} L ${points[0]!.x} ${baseline} Z` : ''

const anglePoint = (center: number, radius: number, angle: number) => ({
	x: center + radius * Math.cos(angle),
	y: center + radius * Math.sin(angle),
})

const slicePath = (center: number, radius: number, innerRadius: number, start: number, end: number) => {
	const outerStart = anglePoint(center, radius, start)
	const outerEnd = anglePoint(center, radius, end)
	const large = end - start > Math.PI ? 1 : 0

	if (innerRadius > 0) {
		const innerStart = anglePoint(center, innerRadius, start)
		const innerEnd = anglePoint(center, innerRadius, end)
		return [
			`M ${outerStart.x} ${outerStart.y}`,
			`A ${radius} ${radius} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
			`L ${innerEnd.x} ${innerEnd.y}`,
			`A ${innerRadius} ${innerRadius} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
			'Z',
		].join(' ')
	}

	return [
		`M ${center} ${center}`,
		`L ${outerStart.x} ${outerStart.y}`,
		`A ${radius} ${radius} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
		'Z',
	].join(' ')
}

const ChartContainerRoot: Stateful<ChartContainerArgs> = function* () {
	const fallbackId = uniqueId('chart')
	const root = dom(this) ? this : null
	let active: ChartActive | null = null
	let plot: SVGSVGElement | null = null

	const setActive = (next: ChartActive, svg: SVGSVGElement) => this.next(() => {
		active = next
		plot = svg
	})
	const clearActive = () => {
		if (active) this.next(() => active = plot = null)
	}
	// Checked once the render that removed a plot settles.
	const release = () => queueMicrotask(() => {
		if (plot && !plot.isConnected) clearActive()
	})

	for (const args of this) {
		// Percent-encoded down to [\w%-], so the id is a CSS identifier once `%` is escaped.
		const chartId = args.id
			? `chart-${encodeURIComponent(String(args.id)).replace(/[^\w%-]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`
			: fallbackId
		const css = colorStyle(chartId, args.config)
		const data = args.data ?? []
		const chart: ChartState = {
			active,
			clearActive,
			config: args.config,
			data,
			description: args.description,
			formatLabel: args.formatLabel ?? defaultFormatLabel,
			formatValue: args.formatValue ?? defaultFormatValue,
			height: args.height ?? DEFAULT_HEIGHT,
			id: chartId,
			label: args.label,
			margin: { ...DEFAULT_MARGIN, ...args.margin },
			palette: args.palette,
			plot,
			release,
			root,
			series: seriesEntries(args.config, args.series, data, args.xKey, args.palette),
			setActive,
			type: args.type ?? 'bar',
			width: args.width ?? DEFAULT_WIDTH,
			xKey: args.xKey,
		}

		ChartContext(chart)
		ChartIdContext(chart.id)

		yield <>
			{css && <style data-chart-scope={chartId}>{css}</style>}
			{args.children}
		</>
	}
}

/** Unstyled chart root provider for config, data, tooltip, and legend state. */
const ChartContainer: Stateless<ChartContainerArgs> = args => (
	<ChartContainerRoot
		{...rootAttrs(args, ['config', 'data', 'description', 'formatLabel', 'formatValue', 'height', 'id', 'label', 'margin', 'palette', 'series', 'type', 'width', 'xKey'])}
		attr:data-slot="chart"
		attr:id={args.id}
	/>
)

const ChartPlot: Stateless<ChartPlotArgs & { type: Exclude<ChartType, 'pie'> }> = ({
	axis: showAxis = true,
	grid: showGrid = true,
	ref,
	type,
	...attrs
}) => {
	const chart = ChartContext()
	if (!chart || !chart.data.length || !chart.series.length) return null

	const box = plotBox(chart)
	const { max, min, ticks: yTicks } = axis(chart)
	const groupWidth = (box.right - box.left) / chart.data.length
	const xStep = chart.data.length > 1 ? (box.right - box.left) / (chart.data.length - 1) : 0
	const baseline = scaled(0, min, max, box.top, box.bottom)
	const y = (value: number) => scaled(value, min, max, box.top, box.bottom)
	const rowCenter = (index: number) => type === 'bar'
		? box.left + groupWidth * index + groupWidth / 2
		: chart.data.length > 1 ? box.left + xStep * index : (box.left + box.right) / 2
	const seriesKeys = chart.series.map(entry => entry.key)
	const lines = type === 'bar' ? [] : chart.series.map(entry => ({
		entry,
		points: chart.data.map((row, index) => ({ x: rowCenter(index), y: y(number(row[entry.key]) ?? 0) })),
	}))
	const area = (points: { y: number }[]) => points.reduce((sum, point) => sum + Math.abs(point.y - baseline), 0)
	const mark = (row: ChartDatum, index: number, entry: Series, value: number) => ({
		'aria-label': `${text(labelFor(chart, row, index))} ${text(entry.label)} ${chart.formatValue(value, entry.key, row, index)}`,
		'data-active': chart.active?.index === index ? 'true' : undefined,
		'data-chart-index': index,
		focusable: 'true',
		role: 'img',
		style: `--chart-index:${index}`,
		tabindex: '0',
		'set:onblur': blurred(chart),
		'set:onfocus': focus,
	})

	const activate = (index: number, svg: SVGSVGElement) => {
		if (showing(chart, index, svg, seriesKeys)) return

		const items = payloadFor(chart, index)
		if (!items.length) return chart.clearActive()

		chart.setActive({
			index,
			items,
			label: labelFor(chart, chart.data[index]!, index),
			x: rowCenter(index),
			y: Math.min(...chart.series.map(entry => y(number(chart.data[index]?.[entry.key]) ?? 0))),
		}, svg)
	}

	const pointerMove = (event: PointerEvent) => {
		const svg = event.currentTarget as SVGSVGElement
		const cursor = svgPoint(svg, event.clientX, event.clientY)
		if (!cursor) return chart.clearActive()
		const index = type === 'bar'
			? clamp(Math.floor((cursor.x - box.left) / groupWidth), 0, chart.data.length - 1)
			: xStep === 0 ? 0 : clamp(Math.round((cursor.x - box.left) / xStep), 0, chart.data.length - 1)
		activate(index, svg)
	}

	const focus = (event: FocusEvent) => activate(...focused(event))

	return (
		<svg
			{...attrs}
			{...plotAttrs(chart, `chart-${type}`, ref)}
			viewBox={`0 0 ${chart.width} ${chart.height}`}
			set:onpointermove={pointerMove}
		>
			{plotTitle(chart)}
			{showGrid ? (
				<g data-slot="chart-grid">
					{yTicks.map(tick => <line key={tick} x1={box.left} x2={box.right} y1={y(tick)} y2={y(tick)} />)}
				</g>
			) : null}
			{showAxis ? (
				<g data-slot="chart-axis">
					<line x1={box.left} x2={box.right} y1={box.bottom} y2={box.bottom} />
					<line x1={box.left} x2={box.left} y1={box.top} y2={box.bottom} />
					{yTicks.map(tick => (
						<text key={tick} x={box.left - 8} y={y(tick) + 3} fill="currentColor" style="text-anchor:end">
							{chart.formatValue(tick, '', {}, 0)}
						</text>
					))}
					{chart.data.map((row, index) => (
						<text key={`x-${index}`} x={rowCenter(index)} y={chart.height - 8} fill="currentColor" style="text-anchor:middle">
							{text(labelFor(chart, row, index)).slice(0, 12)}
						</text>
					))}
				</g>
			) : null}
			{type === 'bar' ? chart.data.map((row, index) => {
				const barWidth = clamp(groupWidth * 0.68 / chart.series.length, 6, 42)
				const groupStart = box.left + groupWidth * index + (groupWidth - barWidth * chart.series.length) / 2

				return chart.series.map((entry, seriesIndex) => {
					const value = number(row[entry.key]) ?? 0
					const top = y(Math.max(0, value))
					const zero = y(Math.min(0, value))

					return (
						<rect
							key={`${entry.key}-${index}`}
							{...mark(row, index, entry, value)}
							data-chart-sign={value === 0 ? 'zero' : value < 0 ? 'negative' : 'positive'}
							data-chart-series={entry.key}
							fill={entry.color}
							height={Math.max(1, Math.abs(zero - top))}
							width={Math.max(2, barWidth - 2)}
							x={groupStart + seriesIndex * barWidth}
							y={Math.min(top, zero)}
						/>
					)
				})
			}) : <>
				{type === 'area' ? (
					// Opaque fills under one translucent layer, so every fill is its series
					// colour, never a blend. The largest area is painted first: a series that
					// sits below another keeps its own band instead of being covered.
					<g data-slot="chart-fill" opacity="0.18">
						{[...lines].sort((a, b) => area(b.points) - area(a.points)).map(({ entry, points }) => (
							<path key={entry.key} d={areaPath(points, baseline)} data-chart-series={entry.key} fill={entry.color} />
						))}
					</g>
				) : null}
				{lines.map(({ entry, points }) => (
					<g key={entry.key} data-chart-series={entry.key}>
						<path d={linePath(points)} fill="none" pathLength={1} stroke={entry.color} stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
						{points.map((point, index) => (
							<circle
								key={`${entry.key}-${index}`}
								{...mark(chart.data[index]!, index, entry, number(chart.data[index]![entry.key]) ?? 0)}
								cx={point.x}
								cy={point.y}
								r="4"
								stroke={entry.color}
								stroke-width="2"
							/>
						))}
					</g>
				))}
			</>}
		</svg>
	)
}

/** Unstyled SVG bar chart primitive for use inside ChartContainer. */
const ChartBar: Stateless<ChartPlotArgs> = attrs => <ChartPlot {...attrs} type="bar" />

/** Unstyled SVG line chart primitive for use inside ChartContainer. */
const ChartLine: Stateless<ChartPlotArgs> = attrs => <ChartPlot {...attrs} type="line" />

/** Unstyled SVG area chart primitive for use inside ChartContainer. */
const ChartArea: Stateless<ChartPlotArgs> = attrs => <ChartPlot {...attrs} type="area" />

/** Unstyled SVG pie/donut chart primitive for use inside ChartContainer. */
const ChartPie: Stateless<ChartPieArgs> = ({
	innerRadius = 0,
	ref,
	...attrs
}) => {
	const chart = ChartContext()
	if (!chart || !chart.data.length || !chart.series.length) return null

	const entry = chart.series[0]!
	const values = chart.data.map(row => Math.max(0, number(row[entry.key]) ?? 0))
	const total = values.reduce((sum, value) => sum + value, 0) || 1
	const size = Math.min(chart.width, chart.height)
	const center = size / 2
	const radius = center - 12
	let start = -Math.PI / 2
	const slices = values.map((value, index) => {
		const end = start + (value / total) * Math.PI * 2
		const slice = { color: chart.palette[index % chart.palette.length]!, end, middle: (start + end) / 2, start, value }
		start = end
		return slice
	})

	const activate = (index: number, svg: SVGSVGElement) => {
		if (showing(chart, index, svg, [entry.key])) return

		const { color, middle, value } = slices[index]!
		const row = chart.data[index]!
		const label = labelFor(chart, row, index)
		chart.setActive({
			index,
			items: [{ color, formattedValue: chart.formatValue(value, entry.key, row, index), index, key: entry.key, label, row, value }],
			label,
			...anglePoint(center, radius * 0.78, middle),
		}, svg)
	}

	const focus = (event: FocusEvent) => activate(...focused(event))

	const pointerMove = (event: PointerEvent) => {
		const svg = event.currentTarget as SVGSVGElement
		const cursor = svgPoint(svg, event.clientX, event.clientY)
		const distance = cursor ? Math.hypot(cursor.x - center, cursor.y - center) : Infinity
		if (!cursor || distance > radius || distance < innerRadius) return chart.clearActive()

		let angle = Math.atan2(cursor.y - center, cursor.x - center)
		if (angle < -Math.PI / 2) angle += Math.PI * 2
		const index = slices.findIndex(slice => angle <= slice.end)
		activate(index < 0 ? slices.length - 1 : index, svg)
	}

	return (
		<svg
			{...attrs}
			{...plotAttrs(chart, 'chart-pie', ref)}
			viewBox={`0 0 ${size} ${size}`}
			set:onpointermove={pointerMove}
		>
			{plotTitle(chart)}
			{slices.map((slice, index) => (
				<path
					key={index}
					aria-label={`${text(labelFor(chart, chart.data[index]!, index))} ${chart.formatValue(slice.value, entry.key, chart.data[index]!, index)}`}
					d={slicePath(center, radius, innerRadius, slice.start, slice.end)}
					data-active={chart.active?.index === index ? 'true' : undefined}
					data-chart-index={index}
					fill={slice.color}
					focusable="true"
					role="img"
					style={`--chart-index:${index}`}
					stroke-width="2"
					tabindex="0"
					set:onblur={blurred(chart)}
					set:onfocus={focus}
				/>
			))}
			{innerRadius > 0 ? (
				<text data-slot="chart-pie-total" x={center} y={center} style="text-anchor:middle;dominant-baseline:middle">
					{chart.formatValue(total, entry.key, {}, 0)}
				</text>
			) : null}
		</svg>
	)
}

const ChartTooltipRoot: Stateful<WithChildren<{ chart: ChartState }>> = function* ({ chart }) {
	// Right of the active point with a gap, flipped left when it would overflow the
	// root, clamped into the root, and translated from the containing block origin.
	const measure = () => {
		const { active, plot, root } = chart
		const point = this.isConnected && active && plot && root ? clientPoint(plot, active.x, active.y) : null
		if (!point || !root) return

		const bounds = root.getBoundingClientRect()
		const parent = this.offsetParent ?? root
		const origin = parent.getBoundingClientRect()
		const ratio = devicePixelRatio || 1
		const round = (value: number) => Math.round(value * ratio) / ratio
		const width = this.offsetWidth
		const height = this.offsetHeight
		const right = point.x + TOOLTIP_GAP
		const x = clamp(right + width > bounds.right ? point.x - TOOLTIP_GAP - width : right, bounds.left, bounds.right - width)
		const y = clamp(point.y - height / 2, bounds.top, bounds.bottom - height)

		this.style.transform = `translate(${round(x - origin.left - parent.clientLeft)}px, ${round(y - origin.top - parent.clientTop)}px)`
		if (this.dataset.positioned) return
		// Commit the first position before the stamp lets a theme animate later moves.
		this.getBoundingClientRect()
		this.dataset.positioned = 'true'
	}
	const place = frame(measure)
	const size = resize(this, { target: () => chart.root, onResize: measure })

	this.signal.addEventListener('abort', place.cancel, { once: true })

	for (const args of this) {
		chart = args.chart
		size.sync()
		place()
		yield <>{args.children}</>
	}
}

/** Unstyled absolute tooltip that follows the active chart point. */
const ChartTooltip: Stateless<ChartTooltipArgs> = ({ children, ...attrs }) => {
	const chart = ChartContext()
	if (!chart?.active?.items.length) return null

	return (
		<ChartTooltipRoot
			key="chart-tooltip"
			{...rootAttrs(attrs)}
			chart={chart}
			attr:data-slot="chart-tooltip"
			attr:style="position:absolute;left:0;top:0"
		>
			{children ?? <ChartTooltipContent />}
		</ChartTooltipRoot>
	)
}

/** Unstyled tooltip body for native chart payloads. */
const ChartTooltipContent: Stateless<ChartTooltipContentArgs> = ({
	formatter,
	hideIndicator,
	hideLabel,
	indicator = 'dot',
	labelFormatter,
	...attrs
}) => {
	const chart = ChartContext()
	const active = chart?.active
	if (!chart || !active?.items.length) return null

	const nested = active.items.length === 1 && indicator !== 'dot'
	const label = hideLabel ? null : (
		<div data-slot="chart-tooltip-label">
			{labelFormatter ? labelFormatter(active.label, active.items) : active.label}
		</div>
	)

	return (
		<div {...attrs} data-slot="chart-tooltip-content">
			{nested ? null : label}
			<div data-slot="chart-tooltip-items">
				{active.items.map((item, index) => {
					const icon = chart.config[item.key]?.icon

					return (
						<div
							key={`${item.key}-${index}`}
							data-indicator={indicator}
							data-nested={nested ? 'true' : undefined}
							data-slot="chart-tooltip-item"
						>
							{formatter ? formatter(item.value, item.key, item, index) : (
								<>
									{hideIndicator ? null : icon ? (
										<span aria-hidden="true" data-slot="chart-tooltip-icon">{icon}</span>
									) : (
										<span aria-hidden="true" data-slot="chart-tooltip-indicator" style={`--chart-indicator:${item.color}`} />
									)}
									<div data-slot="chart-tooltip-row">
										<div data-slot="chart-tooltip-names">
											{nested ? label : null}
											<span data-slot="chart-tooltip-name">{item.label}</span>
										</div>
										<span data-slot="chart-tooltip-value">{item.formattedValue}</span>
									</div>
								</>
							)}
						</div>
					)
				})}
			</div>
		</div>
	)
}

/** Unstyled legend: one entry per series, or per slice for pie charts, unless children replace them. */
const ChartLegend: Stateless<ChartLegendArgs> = ({
	children,
	hideIcon,
	...attrs
}) => {
	const chart = ChartContext()
	const entries = !chart ? [] : chart.type === 'pie'
		? chart.data.map((row, index) => ({
			color: chart.palette[index % chart.palette.length],
			icon: undefined,
			key: String(index),
			label: labelFor(chart, row, index),
		}))
		: chart.series.map(entry => ({ ...entry, icon: chart.config[entry.key]?.icon }))

	return (
		<div key="chart-legend" {...attrs} data-slot="chart-legend">
			{children ?? entries.map(entry => (
				<div key={entry.key} data-slot="chart-legend-item">
					{entry.icon && !hideIcon ? (
						<span aria-hidden="true" data-slot="chart-legend-icon">{entry.icon}</span>
					) : (
						<span aria-hidden="true" data-slot="chart-legend-swatch" style={`background:${entry.color}`} />
					)}
					<span>{entry.label}</span>
				</div>
			))}
		</div>
	)
}

export {
	ChartArea,
	ChartBar,
	ChartContainer,
	ChartLegend,
	ChartLine,
	ChartPie,
	ChartTooltip,
	ChartTooltipContent,
}
