/** @jsxImportSource ajo */
import { ChartContainer, useChartId } from 'ajo-ui/chart'

export type ChartIdentityIsString = ReturnType<typeof useChartId> extends string ? true : never

export const chartWithoutCallerIdentity = (
	<ChartContainer
		config={{ desktop: { color: 'blue' } }}
		palette={['blue']}
	/>
)
