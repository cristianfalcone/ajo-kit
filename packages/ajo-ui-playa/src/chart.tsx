import type { Stateless } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
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

const svgBase = 'h-full min-h-[180px] w-full overflow-visible'
const tooltipBase = 'pointer-events-none absolute z-20 min-w-[8rem] rounded-lg glass-overlay edge px-2.5 py-1.5 text-xs shadow-lg'
const legendBase = 'flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground'

/** Root provider for chart config, data, tooltip, and legend state; without children it renders the `type` plot, tooltip, and legend. */
const ChartContainer: Stateless<ChartContainerArgs> = ({
	children,
	class: classes,
	type = 'bar',
	...attrs
}) => (
	<BaseChartContainer
		{...attrs}
		class={clsx('playa-chart', classes)}
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
	<BaseChartBar {...attrs} class={clsx(svgBase, classes)} />

/** Native SVG line chart primitive for use inside ChartContainer. */
const ChartLine: Stateless<ChartPlotArgs> = ({ class: classes, ...attrs }) =>
	<BaseChartLine {...attrs} class={clsx(svgBase, classes)} />

/** Native SVG area chart primitive for use inside ChartContainer. */
const ChartArea: Stateless<ChartPlotArgs> = ({ class: classes, ...attrs }) =>
	<BaseChartArea {...attrs} class={clsx(svgBase, classes)} />

/** Native SVG pie/donut chart primitive for use inside ChartContainer. */
const ChartPie: Stateless<ChartPieArgs> = ({ class: classes, ...attrs }) =>
	<BaseChartPie {...attrs} class={clsx(svgBase, 'mx-auto max-w-[320px]', classes)} />

/** Absolute tooltip layer for native chart primitives. */
const ChartTooltip: Stateless<ChartTooltipArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseChartTooltip {...attrs} class={clsx(tooltipBase, classes)}>
		{children ?? <ChartTooltipContent />}
	</BaseChartTooltip>
)

/** Tooltip body for native chart payloads. */
const ChartTooltipContent: Stateless<ChartTooltipContentArgs> = ({ class: classes, ...attrs }) =>
	<BaseChartTooltipContent {...attrs} class={clsx('grid gap-1.5', classes)} />

/** Legend for native chart primitives. */
const ChartLegend: Stateless<ChartLegendArgs> = ({
	class: classes,
	verticalAlign = 'bottom',
	...attrs
}) => <BaseChartLegend {...attrs} class={clsx(legendBase, verticalAlign === 'top' ? 'pb-3' : 'pt-3', classes)} />

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
