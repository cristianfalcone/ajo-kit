import type { Stateless } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import {
	ChartArea as BaseChartArea,
	ChartBar as BaseChartBar,
	ChartContainer as BaseChartContainer,
	ChartLegend as BaseChartLegend,
	ChartLine as BaseChartLine,
	ChartPie as BaseChartPie,
	ChartTooltip as BaseChartTooltip,
	ChartTooltipContent as BaseChartTooltipContent,
	type ChartContainerArgs as BaseChartContainerArgs,
	type ChartLegendArgs as BaseChartLegendArgs,
	type ChartPieArgs as BaseChartPieArgs,
	type ChartPlotArgs as BaseChartPlotArgs,
	type ChartTooltipArgs as BaseChartTooltipArgs,
	type ChartTooltipContentArgs as BaseChartTooltipContentArgs,
} from 'ajo-ui/chart'
export type { ChartActive, ChartConfig, ChartDatum, ChartMargin, ChartPayload, ChartType } from 'ajo-ui/chart'

export type ChartContainerArgs = OmitArg<BaseChartContainerArgs, 'palette'> & FixedArgs<'palette'> & { class?: string }
export type ChartPlotArgs = BaseChartPlotArgs & { class?: string }
export type ChartPieArgs = BaseChartPieArgs & { class?: string }
export type ChartTooltipArgs = BaseChartTooltipArgs & { class?: string }
export type ChartTooltipContentArgs = BaseChartTooltipContentArgs & { class?: string }
export type ChartLegendArgs = BaseChartLegendArgs & {
	class?: string
	/** Alignment hint for legend layout. */
	verticalAlign?: 'bottom' | 'top'
}

const palette = [
	'var(--chart-1)',
	'var(--chart-2)',
	'var(--chart-3)',
	'var(--chart-4)',
	'var(--chart-5)',
]

// The plot fills what the legend leaves of the container's height.
const svgBase = 'min-h-0 w-full flex-1 overflow-visible'
// The tooltip is dense data, so it sits on the navy carpet; the legend starts where the plot does.
const tooltipBase = 'pointer-events-none absolute z-20 min-w-32 rounded-lg navy px-3 py-2 text-xs shadow-lg'
const legendBase = 'flex flex-wrap items-center gap-4 text-xs text-muted-foreground'

/** Root provider for chart config, data, tooltip, and legend state; without children it renders the `type` plot, tooltip, and legend. */
const ChartContainer: Stateless<ChartContainerArgs> = ({
	children,
	class: classes,
	type = 'bar',
	...attrs
}) => (
	<BaseChartContainer
		{...attrs}
		class={clx('playa-chart', classes)}
		palette={palette}
		type={type}
	>
		{children ?? (
			<>
				{type === 'pie' ? <ChartPie /> : type === 'line' ? <ChartLine /> : type === 'area' ? <ChartArea /> : <ChartBar />}
				<ChartTooltip />
				<ChartLegend />
			</>
		)}
	</BaseChartContainer>
)

/** Native SVG bar chart primitive for use inside ChartContainer. */
const ChartBar: Stateless<ChartPlotArgs> = ({ class: classes, ...attrs }) =>
	<BaseChartBar {...attrs} class={clx(svgBase, classes)} />

/** Native SVG line chart primitive for use inside ChartContainer. */
const ChartLine: Stateless<ChartPlotArgs> = ({ class: classes, ...attrs }) =>
	<BaseChartLine {...attrs} class={clx(svgBase, classes)} />

/** Native SVG area chart primitive for use inside ChartContainer. */
const ChartArea: Stateless<ChartPlotArgs> = ({ class: classes, ...attrs }) =>
	<BaseChartArea {...attrs} class={clx(svgBase, classes)} />

/** Native SVG pie/donut chart primitive for use inside ChartContainer. */
const ChartPie: Stateless<ChartPieArgs> = ({ class: classes, ...attrs }) =>
	<BaseChartPie {...attrs} class={clx(svgBase, 'mx-auto max-w-[320px]', classes)} />

/** Absolute tooltip layer for native chart primitives. */
const ChartTooltip: Stateless<ChartTooltipArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseChartTooltip {...attrs} class={clx(tooltipBase, classes)}>
		{children ?? <ChartTooltipContent />}
	</BaseChartTooltip>
)

/** Tooltip body for native chart payloads. */
const ChartTooltipContent: Stateless<ChartTooltipContentArgs> = ({ class: classes, ...attrs }) =>
	<BaseChartTooltipContent {...attrs} class={clx('grid gap-2', classes)} />

/** Legend for native chart primitives. */
const ChartLegend: Stateless<ChartLegendArgs> = ({
	class: classes,
	verticalAlign = 'bottom',
	...attrs
}) => <BaseChartLegend {...attrs} class={clx(legendBase, verticalAlign === 'top' ? 'pb-3' : 'pt-3', classes)} />

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
