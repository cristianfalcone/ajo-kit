import type { Children } from 'ajo'
import { context } from 'ajo/context'
import type {
	ChartActive,
	ChartConfig,
	ChartDatum,
	ChartMargin,
	ChartSeries,
	ChartType,
} from './chart'

export type ChartPoint = {
	x: number
	y: number
}

export type ChartReferencePoint = ChartPoint & {
	svg: SVGSVGElement
}

export type ChartSeriesEntry = ChartSeries & {
	color: string
	label: Children
}

export type ChartTooltipPositionController = {
	schedule: (restart?: boolean) => void
	stop: () => void
}

export type ChartTooltipPosition = {
	boundary: () => Element | null
	point: () => ChartPoint
	reference: () => Element | null
	register: (controller: ChartTooltipPositionController) => void
	unregister: (controller: ChartTooltipPositionController) => void
}

export type ChartContextValue = {
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
	series: ChartSeriesEntry[]
	setActive: (active: ChartActive | null, at?: ChartReferencePoint) => void
	tooltipPosition: ChartTooltipPosition
	type: ChartType
	width: number
	xKey?: string
}

export const ChartContext = context<ChartContextValue | null>(null)
export const ChartIdContext = context<string | null>(null)
