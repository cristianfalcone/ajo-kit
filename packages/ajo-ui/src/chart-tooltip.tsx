import type { Children, Stateful, Stateless } from 'ajo'
import { dom, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import {
	ChartContext,
	type ChartTooltipPosition,
} from './chart-context'
import type {
	ChartConfig,
	ChartTooltipArgs,
	ChartTooltipContentArgs,
} from './chart'
import { pointReference, position, type PositionReference } from './position'

type ClassResolver<State> = string | ((state: State) => string | undefined)

type TooltipContentState = {
	indicator: 'dashed' | 'dot' | 'line'
	nestLabel: boolean
}

type ChartTooltipRootArgs = {
	children?: Children
	position: ChartTooltipPosition
}

const resolve = <State,>(value: ClassResolver<State> | undefined, state: State) =>
	typeof value === 'function' ? value(state) : value

const renderIcon = (
	icon: ChartConfig[string]['icon'],
	classes: string | undefined,
) => typeof icon === 'function' ? icon({ class: classes }) : icon

const ChartTooltipRoot: Stateful<ChartTooltipRootArgs> = function* () {
	let anchor: ChartTooltipPosition | null = null
	let reference: PositionReference | null = null
	const geometry = position(this, {
		profile: 'chart',
		boundary: () => anchor?.boundary() ?? null,
		elements: () => ({
			arrow: null,
			floating: dom(this) ? this : null,
			reference,
		}),
	})
	let geometryScheduled = false
	let geometryRestart = false

	const report = (error: unknown) => {
		if (this.signal.aborted) return
		queueMicrotask(() => {
			if (!this.signal.aborted) this.throw(error)
		})
	}
	const schedule = (restart = false) => {
		geometryRestart ||= restart
		if (geometryScheduled || this.signal.aborted) return
		geometryScheduled = true
		queueMicrotask(() => {
			geometryScheduled = false
			const shouldRestart = geometryRestart
			geometryRestart = false
			if (!anchor || !reference || this.signal.aborted) return
			const task = shouldRestart ? geometry.start() : geometry.update()
			void task.catch(report)
		})
	}
	const controller = { schedule, stop: geometry.stop }
	const register = (next: ChartTooltipPosition) => {
		if (next === anchor) return
		anchor?.unregister(controller)
		geometry.stop()
		anchor = next
		const initialReference = next.reference()
		reference = initialReference
			? pointReference(() => next.reference() ?? initialReference, next.point)
			: null
		next.register(controller)
	}

	this.signal.addEventListener('abort', () => {
		anchor?.unregister(controller)
		geometry.stop()
	}, { once: true })

	for (const args of this) {
		register(args.position)
		yield <>{args.children}</>
	}
}

/** Unstyled absolute tooltip layer for native chart primitives. */
const ChartTooltip: Stateless<ChartTooltipArgs> = ({
	children,
	class: classes,
	content,
	...attrs
}) => {
	const chart = ChartContext()
	if (!chart?.active?.items.length) return null

	return (
		<ChartTooltipRoot
			key="chart-tooltip"
			{...rootAttrs(attrs)}
			position={chart.tooltipPosition}
			attr:class={classes}
			attr:data-slot="chart-tooltip"
			attr:style="left:0;top:0"
		>
			{content ?? children ?? <ChartTooltipContent />}
		</ChartTooltipRoot>
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
	const state: TooltipContentState = { indicator, nestLabel }

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

export { ChartTooltip, ChartTooltipContent }
