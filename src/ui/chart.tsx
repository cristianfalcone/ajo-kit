import type { Stateless } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import {
	ChartArea as BaseChartArea,
	ChartBar as BaseChartBar,
	ChartContainer as BaseChartContainer,
	ChartIdContext,
	ChartLegend as BaseChartLegend,
	ChartLegendContent as BaseChartLegendContent,
	ChartLine as BaseChartLine,
	ChartPie as BaseChartPie,
	ChartTooltip as BaseChartTooltip,
	ChartTooltipContent as BaseChartTooltipContent,
	type ChartConfig,
	type ChartContainerArgs as BaseChartContainerArgs,
	type ChartLegendArgs as BaseChartLegendArgs,
	type ChartLegendContentArgs as BaseChartLegendContentArgs,
	type ChartPieArgs as BaseChartPieArgs,
	type ChartPlotArgs as BaseChartPlotArgs,
	type ChartTooltipArgs as BaseChartTooltipArgs,
	type ChartTooltipContentArgs as BaseChartTooltipContentArgs,
} from 'ajo-ui/chart'
export type { ChartActive, ChartConfig, ChartDatum, ChartMargin, ChartPayload, ChartSeries, ChartSeriesInput, ChartType } from 'ajo-ui/chart'

type Theme = 'dark' | 'light'
type ChartPlotFixedArgs =
	| 'axisStroke'
	| 'axisStrokeOpacity'
	| 'barClass'
	| 'gridStroke'
	| 'pointClass'
	| 'pointFill'
type ChartPieFixedArgs = ChartPlotFixedArgs | 'centerLabelClass' | 'centerLabelFill' | 'sliceStroke'
type ChartTooltipFixedArgs =
	| 'formattedValueClass'
	| 'iconClass'
	| 'iconWrapperClass'
	| 'indicatorClass'
	| 'itemClass'
	| 'itemLabelClass'
	| 'itemsClass'
	| 'nestedLabelClass'
	| 'valueLabelGroupClass'
	| 'valueRowClass'
type ChartLegendFixedArgs = 'iconClass' | 'iconWrapperClass' | 'itemClass' | 'swatchClass'

export type ChartContainerArgs = OmitArg<
	BaseChartContainerArgs,
	'chartId' | 'palette'
> & FixedArgs<'chartId' | 'palette'>

export type ChartPlotArgs = OmitArg<
	BaseChartPlotArgs,
	ChartPlotFixedArgs
> & FixedArgs<ChartPlotFixedArgs>

export type ChartPieArgs = OmitArg<
	BaseChartPieArgs,
	ChartPieFixedArgs
> & FixedArgs<ChartPieFixedArgs>

export type ChartTooltipArgs = BaseChartTooltipArgs

export type ChartTooltipContentArgs = OmitArg<
	BaseChartTooltipContentArgs,
	ChartTooltipFixedArgs
> & FixedArgs<ChartTooltipFixedArgs>

export type ChartLegendArgs = BaseChartLegendArgs

export type ChartLegendContentArgs = OmitArg<
	BaseChartLegendContentArgs,
	ChartLegendFixedArgs
> & FixedArgs<ChartLegendFixedArgs> & {
	/** Alignment hint for legend layout. */
	verticalAlign?: 'bottom' | 'top'
}

const THEMES: Record<Theme, string> = { dark: '.dark', light: '' }
const palette = [
	'var(--chart-1)',
	'var(--chart-2)',
	'var(--chart-3)',
	'var(--chart-4)',
	'var(--chart-5)',
]

const rootBase = 'relative flex aspect-video min-h-[200px] w-full flex-col justify-center text-xs text-muted-foreground'
const svgBase = 'h-full min-h-[180px] w-full overflow-visible'
const tooltipBase = 'pointer-events-none absolute z-20 min-w-[8rem] rounded-lg glass-overlay edge px-2.5 py-1.5 text-xs shadow-lg'
const legendBase = 'flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground'

const plotAttrs = (classes?: string) => ({
	axisStroke: 'var(--muted-foreground)',
	axisStrokeOpacity: '0.5',
	barClass: 'outline-none transition-opacity focus-visible:opacity-80',
	class: clsx(svgBase, classes),
	gridStroke: 'var(--border)',
	pointClass: 'outline-none',
	pointFill: 'var(--background)',
})

/** Root provider for chart config, data, tooltip, and legend state. */
const ChartContainer: Stateless<ChartContainerArgs> = ({
	children,
	class: classes,
	config,
	id,
	type = 'bar',
	...attrs
}) => {
	return (
		<BaseChartContainer
			{...attrs}
			class={clsx(rootBase, classes)}
			config={config}
			id={id}
			palette={palette}
			type={type}
		>
			<ChartStyle config={config} />
			{children ?? (
				<>
					{type === 'pie' ? <ChartPie /> : type === 'line' ? <ChartLine /> : type === 'area' ? <ChartArea /> : <ChartBar />}
					<ChartTooltip />
					<ChartLegend />
				</>
			)}
		</BaseChartContainer>
	)
}

/** CSS variable injector matching chart config color behavior. */
const ChartStyle: Stateless<{ config: ChartConfig }> = ({ config }) => {
	const id = ChartIdContext()
	if (!id) return null
	const entries = Object.entries(config).filter(([, item]) => item.color || item.theme)
	if (!entries.length) return null
	const scope = `[data-slot="chart"]:has(>style[data-chart-style="${id}"])`

	const css = Object.entries(THEMES)
		.map(([theme, selector]) => {
			const vars = entries
				.map(([key, item]) => {
					const color = item.theme?.[theme as Theme] ?? item.color
					return color ? `  --color-${key}: ${color};` : ''
				})
				.filter(Boolean)
				.join('\n')
			return `${selector ? `${selector} ` : ''}${scope} {\n${vars}\n}`
		})
		.join('\n')

	return <style data-chart-style={id}>{css}</style>
}

/** Native SVG bar chart primitive for use inside ChartContainer. */
const ChartBar: Stateless<ChartPlotArgs> = ({
	class: classes,
	...attrs
}) => <BaseChartBar {...attrs} {...plotAttrs(classes)} />

/** Native SVG line chart primitive for use inside ChartContainer. */
const ChartLine: Stateless<ChartPlotArgs> = ({
	class: classes,
	...attrs
}) => <BaseChartLine {...attrs} {...plotAttrs(classes)} />

/** Native SVG area chart primitive for use inside ChartContainer. */
const ChartArea: Stateless<ChartPlotArgs> = ({
	class: classes,
	...attrs
}) => <BaseChartArea {...attrs} {...plotAttrs(classes)} />

/** Native SVG pie/donut chart primitive for use inside ChartContainer. */
const ChartPie: Stateless<ChartPieArgs> = ({
	class: classes,
	...attrs
}) => (
	<BaseChartPie
		{...attrs}
		{...plotAttrs(clsx('mx-auto max-w-[320px]', classes))}
		centerLabelClass="text-sm font-medium text-foreground"
		centerLabelFill="currentColor"
		sliceStroke="var(--background)"
	/>
)

/** Absolute tooltip layer for native chart primitives. */
const ChartTooltip: Stateless<ChartTooltipArgs> = ({
	children,
	class: classes,
	content,
	...attrs
}) => (
	<BaseChartTooltip
		{...attrs}
		class={clsx(tooltipBase, classes)}
		content={content ?? children ?? <ChartTooltipContent />}
	/>
)

/** Tooltip body matching tooltip-content behavior for native chart payloads. */
const ChartTooltipContent: Stateless<ChartTooltipContentArgs> = ({
	class: classes,
	labelClass,
	...attrs
}) => (
	<BaseChartTooltipContent
		{...attrs}
		class={clsx('grid gap-1.5', classes)}
		formattedValueClass="font-mono font-medium text-foreground tabular-nums"
		iconClass="size-3 text-muted-foreground"
		iconWrapperClass="[&>svg]:size-3"
		indicatorClass={({ indicator, nestLabel }) => clsx(
			'shrink-0 rounded-[2px] border-[--chart-indicator] bg-[--chart-indicator]',
			indicator === 'dot' && 'size-2.5',
			indicator === 'line' && 'w-1',
			indicator === 'dashed' && 'w-0 border-[1.5px] border-dashed bg-transparent',
			nestLabel && indicator === 'dashed' && 'my-0.5',
		)}
		itemClass={({ indicator }) => clsx('flex w-full items-stretch gap-2', indicator === 'dot' && 'items-center')}
		itemLabelClass="text-muted-foreground"
		itemsClass="grid gap-1.5"
		labelClass={clsx('font-medium', labelClass)}
		nestedLabelClass={clsx('font-medium text-foreground', labelClass)}
		valueLabelGroupClass="grid gap-1.5"
		valueRowClass={({ nestLabel }) => clsx('flex flex-1 justify-between gap-4 leading-none', nestLabel ? 'items-end' : 'items-center')}
	/>
)

/** Legend layer for native chart primitives. */
const ChartLegend: Stateless<ChartLegendArgs> = ({
	children,
	class: classes,
	content,
	...attrs
}) => (
	<BaseChartLegend {...attrs} class={classes} content={content ?? children ?? <ChartLegendContent />} />
)

/** Legend content matching legend-content behavior. */
const ChartLegendContent: Stateless<ChartLegendContentArgs> = ({
	class: classes,
	verticalAlign = 'bottom',
	...attrs
}) => (
	<BaseChartLegendContent
		{...attrs}
		class={clsx(legendBase, verticalAlign === 'top' ? 'pb-3' : 'pt-3', classes)}
		iconClass="size-3 text-muted-foreground"
		iconWrapperClass="[&>svg]:size-3"
		itemClass="flex items-center gap-1.5"
		swatchClass="size-2 shrink-0 rounded-[2px]"
	/>
)

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
