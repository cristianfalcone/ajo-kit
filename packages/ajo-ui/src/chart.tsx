import type { Children, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callRef, clamp, dom, id as uniqueId, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { pointReference, position, type ReservedPositionArg } from './position'
import type { FixedArgs, OmitArg } from './utils'
import { text } from './utils'

type ChartTheme = 'dark' | 'light'

/** Labels, icons, and colors configured for each chart data key. */
export type ChartConfig = Record<
	string,
	{
		/** Human label used by tooltip and legend. */
		label?: Children
		/** Optional icon rendered by tooltip and legend. */
		icon?: Children | ((attrs: { class?: string }) => Children)
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

/** Data-key descriptor for one rendered chart series. */
export type ChartSeries = {
	/** Object key used for numeric values. */
	key: string
	/** Human label. Defaults to config label or key. */
	label?: Children
	/** CSS color. Defaults to config color or a chart token. */
	color?: string
}

/** Series shorthand accepted by ChartContainer. */
export type ChartSeriesInput = ChartSeries | string

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
export type ChartContainerArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'children' | 'gap' | 'placement' | ReservedPositionArg> & {
	/** Optional resolved chart identity override; otherwise derived from the DOM id or generated. */
	chartId?: string
	/** Chart series styling keyed by data key. */
	config: ChartConfig
	/** Rows to render when using the native SVG chart primitives. */
	data?: ChartDatum[]
	/** Key used for x-axis/category labels. */
	xKey?: string
	/** Native chart type rendered when no children are provided. */
	type?: ChartType
	/** Series keys or detailed series entries. Defaults to the config keys. */
	series?: ChartSeriesInput[]
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
	/** Classes supplied by the styled wrapper. */
	class?: string
}> & FixedArgs<'gap' | 'placement' | ReservedPositionArg>

/** Arguments for native cartesian bar, line, and area plots. */
export type ChartPlotArgs = OmitArg<IntrinsicElements['svg'], 'children'> & {
	/** Show grid lines. */
	grid?: boolean
	/** Show axes and labels. */
	axis?: boolean
	/** Classes supplied by the styled wrapper. */
	class?: string
	axisStroke?: string
	axisStrokeOpacity?: string
	barClass?: string
	gridStroke?: string
	pointClass?: string
	pointFill?: string
} & FixedArgs<'children'>

/** Arguments for a native pie or donut plot. */
export type ChartPieArgs = ChartPlotArgs & {
	/** Inner radius for donut charts, in SVG user units. */
	innerRadius?: number
	centerLabelClass?: string
	centerLabelFill?: string
	sliceStroke?: string
}

/** Arguments for the floating active-value tooltip. */
export type ChartTooltipArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'children' | 'gap' | 'placement' | ReservedPositionArg> & {
	/** Custom tooltip content, commonly a tooltip-content component. */
	content?: Children
	/** Classes supplied by the styled wrapper. */
	class?: string
}> & FixedArgs<'defaultIndex' | 'gap' | 'placement' | ReservedPositionArg>

type ClassResolver<State> = string | ((state: State) => string | undefined)

type TooltipContentState = {
	indicator: 'dashed' | 'dot' | 'line'
	nestLabel: boolean
}

/** Arguments for the default tooltip payload renderer. */
export type ChartTooltipContentArgs = OmitArg<IntrinsicElements['div'], 'children'> & {
	/** Indicator shape shown beside each row. */
	indicator?: 'dashed' | 'dot' | 'line'
	/** Hide the category label. */
	hideLabel?: boolean
	/** Hide the color indicator. */
	hideIndicator?: boolean
	/** Additional class for the label row. */
	labelClass?: string
	/** Format the active label. */
	labelFormatter?: (label: Children, payload: ChartPayload[]) => Children
	/** Format each value row. */
	formatter?: (value: number, key: string, item: ChartPayload, index: number) => Children
	/** Classes supplied by the styled wrapper. */
	class?: string
	formattedValueClass?: string
	iconClass?: string
	iconWrapperClass?: string
	indicatorClass?: ClassResolver<TooltipContentState>
	itemClass?: ClassResolver<TooltipContentState>
	itemLabelClass?: string
	itemsClass?: string
	nestedLabelClass?: string
	valueLabelGroupClass?: string
	valueRowClass?: ClassResolver<{ nestLabel: boolean }>
} & FixedArgs<'children'>

/** Arguments for the chart legend surface. */
export type ChartLegendArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'children'> & {
	/** Custom legend content, commonly a legend-content component. */
	content?: Children
	/** Classes supplied by the styled wrapper. */
	class?: string
}>

/** Arguments for the default series legend renderer. */
export type ChartLegendContentArgs = OmitArg<IntrinsicElements['div'], 'children'> & {
	/** Hide configured icons and show color swatches instead. */
	hideIcon?: boolean
	/** Classes supplied by the styled wrapper. */
	class?: string
	iconClass?: string
	iconWrapperClass?: string
	itemClass?: string
	swatchClass?: string
} & FixedArgs<'children'>

type SeriesEntry = ChartSeries & {
	color: string
	label: Children
}

type Point = {
	x: number
	y: number
}

type ChartReferencePoint = Point & {
	svg: SVGSVGElement
}

type ChartContextValue = {
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
	releasePlot: (plot: SVGSVGElement) => void
	series: SeriesEntry[]
	setActive: (active: ChartActive | null, at?: ChartReferencePoint) => void
	setTooltip: (element: HTMLElement | null) => void
	type: ChartType
	width: number
	xKey?: string
}

const ChartContext = context<ChartContextValue | null>(null)
/** Read the stable identity resolved by the nearest ChartContainer. */
export const ChartIdContext = context<string | null>(null)

const DEFAULT_MARGIN: ChartMargin = { bottom: 32, left: 40, right: 16, top: 16 }
const DEFAULT_WIDTH = 640
const DEFAULT_HEIGHT = 240

const resolveRootChartId = (value: unknown, fallback: string) =>
	value ? `chart-${encodeURIComponent(String(value))}` : fallback

const resolve = <State,>(value: ClassResolver<State> | undefined, state: State) =>
	typeof value === 'function' ? value(state) : value

const number = (value: unknown) => {
	const next = Number(value)
	return Number.isFinite(next) ? next : undefined
}

const colorFor = (
	key: string,
	index: number,
	config: ChartConfig,
	palette: string[],
	override?: string,
) =>
	override ?? (config[key]?.color || config[key]?.theme ? `var(--color-${key})` : palette[index % palette.length])

const seriesEntries = (
	config: ChartConfig,
	series: ChartSeriesInput[] | undefined,
	data: ChartDatum[] | undefined,
	xKey: string | undefined,
	palette: string[],
) => {
	const raw = series?.length
		? series
		: Object.keys(config).length
			? Object.keys(config)
			: Object.keys(data?.[0] ?? {}).filter(key => key !== xKey && number(data?.[0]?.[key]) != null)

	return raw.map((item, index): SeriesEntry => {
		const entry = typeof item === 'string' ? { key: item } : item
		return {
			...entry,
			color: colorFor(entry.key, index, config, palette, entry.color),
			label: entry.label ?? config[entry.key]?.label ?? entry.key,
		}
	})
}

const defaultFormatLabel = (value: unknown, _row: ChartDatum, index: number) =>
	value == null ? `Item ${index + 1}` : String(value)

let numberFormatter: Intl.NumberFormat | undefined

const defaultFormatValue = (value: number) =>
	(numberFormatter ??= new Intl.NumberFormat()).format(value)

const labelFor = (chart: ChartContextValue, row: ChartDatum, index: number) =>
	chart.formatLabel(chart.xKey ? row[chart.xKey] : undefined, row, index)

const payloadFor = (
	chart: ChartContextValue,
	index: number,
	series = chart.series,
	colors?: string[],
) => {
	const row = chart.data[index] ?? {}
	return series
		.map((entry, entryIndex) => {
			const value = number(row[entry.key])
			if (value == null) return undefined
			const color = colors?.[entryIndex] ?? entry.color
			return {
				color,
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

const sameActiveKeys = (current: ChartActive | null, index: number, keys: string[]) =>
	current?.index === index
	&& current.items.length === keys.length
	&& current.items.every((item, itemIndex) => item.key === keys[itemIndex])

const sameActiveTarget = (current: ChartActive | null, index: number, keys: string[]) =>
	current?.index === index
	&& current.items.every(item => keys.includes(item.key))

const sameActiveValue = (current: ChartActive | null, next: ChartActive | null) => {
	if (!current || !next) return current === next

	return sameActiveKeys(current, next.index, next.items.map(item => item.key))
}

const extent = (chart: ChartContextValue) => {
	const values = chart.data.flatMap(row => chart.series.map(entry => number(row[entry.key])).filter(value => value != null))
	const min = Math.min(0, ...values)
	const max = Math.max(0, ...values)
	return min === max ? { max: max + 1, min: min - 1 } : { max, min }
}

const scaled = (value: number, min: number, max: number, top: number, bottom: number) =>
	bottom - ((value - min) / (max - min)) * (bottom - top)

const plotBox = (chart: ChartContextValue) => ({
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

const referencePoint = (svg: SVGSVGElement, point: Point): ChartReferencePoint => ({
	svg,
	x: point.x,
	y: point.y,
})

const plotRef = (chart: ChartContextValue, ref: unknown) => {
	let current: SVGSVGElement | null = null
	return (element: SVGSVGElement | null) => {
		if (current && current !== element) chart.releasePlot(current)
		current = element
		callRef(ref, element)
	}
}

const svgFromEvent = (event: Event) => {
	const current = event.currentTarget as SVGElement | null
	if (current instanceof SVGSVGElement) return current
	if (current?.ownerSVGElement) return current.ownerSVGElement

	const target = event.target as SVGElement | null
	if (target instanceof SVGSVGElement) return target
	return target?.ownerSVGElement ?? null
}

const renderIcon = (icon: ChartConfig[string]['icon'], classes: string | undefined) =>
	typeof icon === 'function' ? icon({ class: classes }) : icon

const axis = (
	chart: ChartContextValue,
	type: Exclude<ChartType, 'pie'>,
	yTicks: number[],
	min: number,
	max: number,
	axisStroke?: string,
	axisStrokeOpacity?: string,
	gridStroke?: string,
) => {
	const box = plotBox(chart)
	const groupWidth = (box.right - box.left) / chart.data.length
	const xStep = chart.data.length > 1 ? (box.right - box.left) / (chart.data.length - 1) : 0
	const rowCenter = (index: number) => type === 'bar'
		? box.left + groupWidth * index + groupWidth / 2
		: chart.data.length > 1 ? box.left + xStep * index : (box.left + box.right) / 2

	return (
		<g data-slot="chart-axis">
			<line x1={box.left} x2={box.right} y1={box.bottom} y2={box.bottom} stroke={axisStroke} stroke-opacity={axisStrokeOpacity} />
			<line x1={box.left} x2={box.left} y1={box.top} y2={box.bottom} stroke={axisStroke} stroke-opacity={axisStrokeOpacity} />
			{yTicks.map(tick => {
				const y = scaled(tick, min, max, box.top, box.bottom)
				return (
					<g key={tick}>
						<line x1={box.left} x2={box.right} y1={y} y2={y} stroke={gridStroke} />
						<text x={box.left - 8} y={y + 3} fill="currentColor" style="text-anchor:end">
							{chart.formatValue(tick, '', {}, 0)}
						</text>
					</g>
				)
			})}
			{chart.data.map((row, index) => {
				return (
					<text key={index} x={rowCenter(index)} y={chart.height - 8} fill="currentColor" style="text-anchor:middle">
						{text(labelFor(chart, row, index)).slice(0, 12)}
					</text>
				)
			})}
		</g>
	)
}

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

type ChartContainerRootArgs = ChartContainerArgs & {
	rootId?: unknown
}

const ChartContainerRoot: Stateful<ChartContainerRootArgs> = function* () {
	let active: ChartActive | null = null
	const fallbackId = uniqueId('chart')
	let tooltip: HTMLElement | null = null
	const root = dom(this) ? this : null
	let activePoint: ChartReferencePoint | null = null
	let lastClientPoint: Point | null = null
	const reference = root ? pointReference(() => activePoint?.svg ?? root, () => {
		const next = activePoint ? clientPoint(activePoint.svg, activePoint.x, activePoint.y) : null
		if (next) lastClientPoint = next
		if (lastClientPoint) return lastClientPoint
		const rect = root.getBoundingClientRect()
		return { x: rect.left, y: rect.top }
	}) : null
	const geometry = position(this, {
		profile: 'chart',
		boundary: () => root,
		elements: () => ({ reference, floating: tooltip, arrow: null }),
	})
	let geometryScheduled = false
	let geometryRestart = false

	const report = (error: unknown) => {
		if (this.signal.aborted) return
		queueMicrotask(() => {
			if (!this.signal.aborted) this.throw(error)
		})
	}
	const scheduleGeometry = (restart = false) => {
		geometryRestart ||= restart
		if (geometryScheduled || this.signal.aborted) return
		geometryScheduled = true
		queueMicrotask(() => {
			geometryScheduled = false
			const shouldRestart = geometryRestart
			geometryRestart = false
			if (!active || !activePoint || !tooltip || this.signal.aborted) return
			const task = shouldRestart ? geometry.start() : geometry.update()
			void task.catch(report)
		})
	}
	const setTooltip = (element: HTMLElement | null) => {
		if (element === tooltip) return
		geometry.stop()
		tooltip = element
		if (active && activePoint && element) scheduleGeometry(true)
	}
	const movePoint = (next: ChartReferencePoint | undefined) => {
		if (!next) return 0
		if (
			activePoint?.svg === next.svg &&
			activePoint.x === next.x &&
			activePoint.y === next.y
		) return 0
		const retargeted = activePoint != null && activePoint.svg !== next.svg
		activePoint = next
		return retargeted ? 2 : 1
	}
	const setActive = (next: ChartActive | null, at?: ChartReferencePoint) => {
		const movement = next ? movePoint(at) : 0
		const retargeted = movement === 2
		if (retargeted) geometry.stop()
		if (!next) {
			activePoint = null
			lastClientPoint = null
			geometry.stop()
		}
		if (sameActiveValue(active, next)) {
			if (next && movement) scheduleGeometry(movement === 2)
			return
		}

		const first = active == null && next != null

		this.next(() => active = next)

		// The tooltip ref/content updates during the render above. Mount/retarget
		// and point changes collapse into one current Adapter request.
		if (next && at) scheduleGeometry(first || retargeted)
	}
	const clearActive = () => setActive(null)
	const releasePlot = (plot: SVGSVGElement) => {
		if (this.signal.aborted || activePoint?.svg !== plot) return
		const releasedPoint = activePoint
		geometry.stop()
		activePoint = null
		lastClientPoint = null
		queueMicrotask(() => {
			if (this.signal.aborted || activePoint) return
			if (plot.isConnected) {
				activePoint = releasedPoint
				if (active && tooltip) scheduleGeometry(true)
				return
			}
			if (active) clearActive()
		})
	}

	for (const args of this) {
		const chartId = args.chartId ?? resolveRootChartId(args.rootId, fallbackId)
		const data = args.data ?? []
		const width = args.width ?? DEFAULT_WIDTH
		const height = args.height ?? DEFAULT_HEIGHT
		const margin = { ...DEFAULT_MARGIN, ...(args.margin ?? {}) }
		const type = args.type ?? 'bar'
		const chart: ChartContextValue = {
			active,
			clearActive,
			config: args.config,
			data,
			description: args.description,
			formatLabel: args.formatLabel ?? defaultFormatLabel,
			formatValue: args.formatValue ?? defaultFormatValue,
			height,
			id: chartId,
			label: args.label,
			margin,
			palette: args.palette,
			releasePlot,
			series: seriesEntries(args.config, args.series, data, args.xKey, args.palette),
			setActive,
			setTooltip,
			type,
			width,
			xKey: args.xKey,
		}

		ChartContext(chart)
		ChartIdContext(chart.id)

		yield <>{args.children}</>
	}
}


/** Unstyled chart root provider for config, data, tooltip, and legend state. */
const ChartContainer: Stateless<ChartContainerArgs> = ({
	chartId,
	children,
	class: classes,
	config,
	data,
	description,
	formatLabel,
	formatValue,
	height,
	id,
	label,
	margin,
	palette,
	series,
	type,
	width,
	xKey,
	...attrs
}) => {
	return <ChartContainerRoot
		{...rootAttrs(attrs)}
		chartId={chartId}
		config={config}
		data={data}
		description={description}
		formatLabel={formatLabel}
		formatValue={formatValue}
		height={height}
		margin={margin}
		palette={palette}
		rootId={id}
		series={series}
		type={type}
		width={width}
		xKey={xKey}
		attr:class={classes}
		attr:data-slot="chart"
		attr:id={id}
		label={label}
	>
		{children}
	</ChartContainerRoot>
}

const ChartPlot: Stateless<ChartPlotArgs & { type: Exclude<ChartType, 'pie'> }> = ({
	axis: showAxis = true,
	axisStroke,
	axisStrokeOpacity,
	barClass,
	class: classes,
	grid: showGrid = true,
	gridStroke,
	pointClass,
	pointFill,
	ref,
	type,
	...attrs
}) => {
	const chart = ChartContext()
	if (!chart || !chart.data.length || !chart.series.length) return null

	const box = plotBox(chart)
	const { max, min } = extent(chart)
	const yTicks = Array.from({ length: 4 }, (_, index) => min + ((max - min) / 3) * index)
	const groupWidth = (box.right - box.left) / chart.data.length
	const xStep = chart.data.length > 1 ? (box.right - box.left) / (chart.data.length - 1) : 0
	const baseline = scaled(0, min, max, box.top, box.bottom)
	const rowCenter = (index: number) => type === 'bar'
		? box.left + groupWidth * index + groupWidth / 2
		: chart.data.length > 1 ? box.left + xStep * index : (box.left + box.right) / 2
	const seriesKeys = chart.series.map(entry => entry.key)
	const rowY = (index: number) => Math.min(...chart.series.map(entry =>
		scaled(number(chart.data[index]?.[entry.key]) ?? 0, min, max, box.top, box.bottom)))
	const rowPoint = (index: number) => ({
		x: rowCenter(index),
		y: rowY(index),
	})
	const points = (entry: SeriesEntry) => chart.data.map((row, index) => ({
		x: rowCenter(index),
		y: scaled(number(row[entry.key]) ?? 0, min, max, box.top, box.bottom),
	}))

	const activate = (index: number, at?: ChartReferencePoint) => {
		if (sameActiveTarget(chart.active, index, seriesKeys)) {
			chart.setActive(chart.active, at)
			return
		}

		const items = payloadFor(chart, index)
		if (!items.length) {
			chart.clearActive()
			return
		}

		const point = rowPoint(index)
		chart.setActive({
			index,
			items,
			label: labelFor(chart, chart.data[index]!, index),
			x: point.x,
			y: point.y,
		}, at)
	}

	const pointerMove = (event: PointerEvent) => {
		const svg = event.currentTarget as SVGSVGElement
		const cursor = svgPoint(svg, event.clientX, event.clientY)
		if (!cursor) {
			chart.clearActive()
			return
		}
		const sx = cursor.x
		const index = type === 'bar'
			? clamp(Math.floor((sx - box.left) / groupWidth), 0, chart.data.length - 1)
			: xStep === 0 ? 0 : clamp(Math.round((sx - box.left) / xStep), 0, chart.data.length - 1)
		const point = rowPoint(index)
		activate(index, referencePoint(svg, point))
	}

	const focusIn = (event: FocusEvent) => {
		const target = event.target as SVGElement | null
		const index = Number(target?.getAttribute('data-chart-index'))
		const svg = svgFromEvent(event)
		if (!svg || !Number.isInteger(index)) return
		const point = rowPoint(index)
		activate(index, referencePoint(svg, point))
	}

	return (
		<svg
			{...attrs}
			aria-describedby={chart.description ? `${chart.id}-description` : undefined}
			aria-label={chart.label}
			class={classes}
			data-slot={`chart-${type}`}
			height={chart.height}
			role="img"
			ref={plotRef(chart, ref)}
			viewBox={`0 0 ${chart.width} ${chart.height}`}
			width="100%"
			xmlns="http://www.w3.org/2000/svg"
			set:onfocusin={focusIn}
			set:onpointerleave={chart.clearActive}
			set:onpointermove={pointerMove}
		>
			{chart.label ? <title>{chart.label}</title> : null}
			{chart.description ? <desc id={`${chart.id}-description`}>{chart.description}</desc> : null}
			{showGrid ? axis(chart, type, yTicks, min, max, axisStroke, axisStrokeOpacity, gridStroke) : showAxis ? axis(chart, type, [], min, max, axisStroke, axisStrokeOpacity, gridStroke) : null}
			{type === 'bar' ? chart.data.map((row, index) => {
				const barWidth = clamp(groupWidth * 0.68 / chart.series.length, 6, 42)
				const groupStart = box.left + groupWidth * index + (groupWidth - barWidth * chart.series.length) / 2

				return chart.series.map((entry, seriesIndex) => {
					const value = number(row[entry.key]) ?? 0
					const sign = value === 0 ? 'zero' : value < 0 ? 'negative' : 'positive'
					const y = scaled(Math.max(0, value), min, max, box.top, box.bottom)
					const yZero = scaled(Math.min(0, value), min, max, box.top, box.bottom)
					const height = Math.max(1, Math.abs(yZero - y))
					const x = groupStart + seriesIndex * barWidth

					return (
						<rect
							key={`${entry.key}-${index}`}
							aria-label={`${text(labelFor(chart, row, index))} ${text(entry.label)} ${chart.formatValue(value, entry.key, row, index)}`}
							class={barClass}
							data-active={chart.active?.index === index ? 'true' : undefined}
							data-chart-index={index}
							data-chart-sign={sign}
							data-chart-series={entry.key}
							fill={entry.color}
							focusable="true"
							height={height}
							style={`--chart-index:${index}`}
							tabindex="0"
							width={Math.max(2, barWidth - 2)}
							x={x}
							y={Math.min(y, yZero)}
							set:onfocus={(event: FocusEvent) => {
								const svg = svgFromEvent(event)
								const point = rowPoint(index)
								if (svg) activate(index, referencePoint(svg, point))
							}}
							set:onpointerenter={(event: PointerEvent) => {
								const svg = svgFromEvent(event)
								const point = rowPoint(index)
								if (svg) activate(index, referencePoint(svg, point))
							}}
						/>
					)
				})
			}) : chart.series.map(entry => {
				const entryPoints = points(entry)
				return (
					<g key={entry.key} data-chart-series={entry.key}>
						{type === 'area' ? (
							<path d={areaPath(entryPoints, baseline)} fill={entry.color} fill-opacity="0.18" />
						) : null}
						<path d={linePath(entryPoints)} fill="none" pathLength={1} stroke={entry.color} stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
						{entryPoints.map((point, index) => {
							const row = chart.data[index]!
							const value = number(row[entry.key]) ?? 0
							return (
								<circle
									key={`${entry.key}-${index}`}
									aria-label={`${text(labelFor(chart, row, index))} ${text(entry.label)} ${chart.formatValue(value, entry.key, row, index)}`}
									class={pointClass}
									cx={point.x}
									cy={point.y}
									data-active={chart.active?.index === index ? 'true' : undefined}
									data-chart-index={index}
									fill={pointFill}
									focusable="true"
									r="4"
									style={`--chart-index:${index}`}
									stroke={entry.color}
									stroke-width="2"
									tabindex="0"
									set:onfocus={(event: FocusEvent) => {
										const svg = svgFromEvent(event)
										const activePoint = rowPoint(index)
										if (svg) activate(index, referencePoint(svg, activePoint))
									}}
									set:onpointerenter={(event: PointerEvent) => {
										const svg = svgFromEvent(event)
										const activePoint = rowPoint(index)
										if (svg) activate(index, referencePoint(svg, activePoint))
									}}
								/>
							)
						})}
					</g>
				)
			})}
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
	centerLabelClass,
	centerLabelFill,
	class: classes,
	innerRadius = 0,
	ref,
	sliceStroke,
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

	const activate = (index: number, angle: number, color: string, at?: ChartReferencePoint) => {
		if (sameActiveTarget(chart.active, index, [entry.key])) {
			chart.setActive(chart.active, at)
			return
		}

		const point = anglePoint(center, radius * 0.78, angle)
		const row = chart.data[index]!
		const value = values[index] ?? 0
		chart.setActive({
			index,
			items: [{
				color,
				formattedValue: chart.formatValue(value, entry.key, row, index),
				index,
				key: entry.key,
				label: labelFor(chart, row, index),
				row,
				value,
			}],
			label: labelFor(chart, row, index),
			x: point.x,
			y: point.y,
		}, at)
	}

	const focusIn = (event: FocusEvent) => {
		const target = event.target as SVGElement | null
		const index = Number(target?.getAttribute('data-chart-index'))
		if (!Number.isInteger(index)) return
		const svg = svgFromEvent(event)
		if (!svg) return
		const totalBefore = values.slice(0, index).reduce((sum, value) => sum + value, 0)
		const value = values[index] ?? 0
		const start = -Math.PI / 2 + (totalBefore / total) * Math.PI * 2
		const middle = start + ((value / total) * Math.PI * 2) / 2
		const point = anglePoint(center, radius * 0.78, middle)
		activate(index, middle, chart.palette[index % chart.palette.length], referencePoint(svg, point))
	}

	const pointerMove = (event: PointerEvent) => {
		const svg = event.currentTarget as SVGSVGElement
		const cursorPoint = svgPoint(svg, event.clientX, event.clientY)
		if (!cursorPoint) {
			chart.clearActive()
			return
		}
		const { x, y } = cursorPoint
		const distance = Math.hypot(x - center, y - center)
		if (distance > radius || distance < innerRadius) {
			chart.clearActive()
			return
		}

		let angle = Math.atan2(y - center, x - center) + Math.PI / 2
		if (angle < 0) angle += Math.PI * 2

		let cursor = 0
		for (let index = 0; index < values.length; index++) {
			const span = ((values[index] ?? 0) / total) * Math.PI * 2
			if (angle <= cursor + span || index === values.length - 1) {
				const middle = -Math.PI / 2 + cursor + span / 2
				const point = anglePoint(center, radius * 0.78, middle)
				activate(index, middle, chart.palette[index % chart.palette.length], referencePoint(svg, point))
				return
			}
			cursor += span
		}
	}

	return (
		<svg
			{...attrs}
			aria-describedby={chart.description ? `${chart.id}-description` : undefined}
			aria-label={chart.label}
			class={classes}
			data-slot="chart-pie"
			height={chart.height}
			role="img"
			ref={plotRef(chart, ref)}
			viewBox={`0 0 ${size} ${size}`}
			width="100%"
			xmlns="http://www.w3.org/2000/svg"
			set:onfocusin={focusIn}
			set:onpointerleave={chart.clearActive}
			set:onpointermove={pointerMove}
		>
			{chart.label ? <title>{chart.label}</title> : null}
			{chart.description ? <desc id={`${chart.id}-description`}>{chart.description}</desc> : null}
			{values.map((value, index) => {
				const angle = (value / total) * Math.PI * 2
				const end = start + angle
				const middle = start + angle / 2
				const color = chart.palette[index % chart.palette.length]
				const path = slicePath(center, radius, innerRadius, start, end)
				const row = chart.data[index]!
				start = end

				return (
					<path
						key={index}
						aria-label={`${text(labelFor(chart, row, index))} ${chart.formatValue(value, entry.key, row, index)}`}
						d={path}
						data-active={chart.active?.index === index ? 'true' : undefined}
						data-chart-index={index}
						fill={color}
						focusable="true"
						style={`--chart-index:${index}`}
						stroke={sliceStroke}
						stroke-width="2"
						tabindex="0"
						set:onfocus={(event: FocusEvent) => {
							const svg = svgFromEvent(event)
							const point = anglePoint(center, radius * 0.78, middle)
							if (svg) activate(index, middle, color, referencePoint(svg, point))
						}}
						set:onpointerenter={(event: PointerEvent) => {
							const svg = svgFromEvent(event)
							const point = anglePoint(center, radius * 0.78, middle)
							if (svg) activate(index, middle, color, referencePoint(svg, point))
						}}
					/>
				)
			})}
			{innerRadius > 0 ? (
				<text x={center} y={center} fill={centerLabelFill} class={centerLabelClass} style="text-anchor:middle;dominant-baseline:middle">
					{chart.formatValue(total, entry.key, {}, 0)}
				</text>
			) : null}
		</svg>
	)
}

/** Unstyled absolute tooltip layer for native chart primitives. */
const ChartTooltip: Stateless<ChartTooltipArgs> = ({
	children,
	class: classes,
	content,
	...attrs
}) => {
	const chart = ChartContext()
	if (!chart) return null

	if (!chart.active?.items.length) return null

	return (
		<div
			key="chart-tooltip"
			{...attrs}
			class={classes}
			data-slot="chart-tooltip"
			ref={chart.setTooltip}
			style="left:0;top:0"
		>
			{content ?? children ?? <ChartTooltipContent />}
		</div>
	)
}

/** Unstyled tooltip body for native chart payloads. */
const ChartTooltipContent: Stateless<ChartTooltipContentArgs> = ({
	class: classes,
	formattedValueClass,
	formatter,
	hideIndicator,
	hideLabel,
	iconClass,
	iconWrapperClass,
	indicator = 'dot',
	indicatorClass,
	itemClass,
	itemLabelClass,
	itemsClass,
	labelClass,
	labelFormatter,
	nestedLabelClass,
	valueLabelGroupClass,
	valueRowClass,
	...attrs
}) => {
	const chart = ChartContext()
	const active = chart?.active
	if (!chart || !active?.items.length) return null

	const nestLabel = active.items.length === 1 && indicator !== 'dot'
	const state = { indicator, nestLabel }

	return (
		<div {...attrs} class={classes} data-slot="chart-tooltip-content">
			{!hideLabel && !nestLabel ? (
				<div class={labelClass} data-slot="chart-tooltip-label">
					{labelFormatter ? labelFormatter(active.label, active.items) : active.label}
				</div>
			) : null}
			<div class={itemsClass}>
				{active.items.map((item, index) => {
					const config = chart.config[item.key]
					const icon = config?.icon

					return (
						<div key={`${item.key}-${index}`} class={resolve(itemClass, state)} data-slot="chart-tooltip-item">
							{formatter ? formatter(item.value, item.key, item, index) : (
								<>
									{icon && !hideIndicator ? (
										<span aria-hidden="true" class={iconWrapperClass}>{renderIcon(icon, iconClass)}</span>
									) : !hideIndicator ? (
										<span
											aria-hidden="true"
											class={resolve(indicatorClass, state)}
											style={`--chart-indicator:${item.color}`}
										/>
									) : null}
									<div class={resolve(valueRowClass, { nestLabel })}>
										<div class={valueLabelGroupClass}>
											{!hideLabel && nestLabel ? (
												<div class={nestedLabelClass}>
													{labelFormatter ? labelFormatter(active.label, active.items) : active.label}
												</div>
											) : null}
											<span class={itemLabelClass}>{item.label}</span>
										</div>
										<span class={formattedValueClass}>{item.formattedValue}</span>
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

/** Unstyled legend layer for native chart primitives. */
const ChartLegend: Stateless<ChartLegendArgs> = ({
	children,
	class: classes,
	content,
	...attrs
}) => (
	<div key="chart-legend" {...attrs} class={classes} data-slot="chart-legend">
		{content ?? children ?? <ChartLegendContent />}
	</div>
)

/** Unstyled legend content for native chart payloads. */
const ChartLegendContent: Stateless<ChartLegendContentArgs> = ({
	class: classes,
	hideIcon,
	iconClass,
	iconWrapperClass,
	itemClass,
	swatchClass,
	...attrs
}) => {
	const chart = ChartContext()
	if (!chart) return null

	const entries = chart.type === 'pie'
		? chart.data.map((row, index) => ({
			color: chart.palette[index % chart.palette.length],
			icon: undefined,
			key: String(index),
			label: labelFor(chart, row, index),
		}))
		: chart.series.map(entry => ({
			color: entry.color,
			icon: chart.config[entry.key]?.icon,
			key: entry.key,
			label: entry.label,
		}))

	return (
		<div
			{...attrs}
			class={classes}
			data-slot="chart-legend-content"
		>
			{entries.map(entry => (
				<div key={entry.key} class={itemClass} data-slot="chart-legend-item">
					{entry.icon && !hideIcon ? (
						<span aria-hidden="true" class={iconWrapperClass}>{renderIcon(entry.icon, iconClass)}</span>
					) : (
						<span aria-hidden="true" class={swatchClass} style={`background:${entry.color}`} />
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
	ChartLegendContent,
	ChartLine,
	ChartPie,
	ChartTooltip,
	ChartTooltipContent,
}
