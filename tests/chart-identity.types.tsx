/** @jsxImportSource ajo */
import { ChartContainer, ChartIdContext } from 'ajo-ui/chart'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

export const chartIdentityIsNullableString: Equal<ReturnType<typeof ChartIdContext>, string | null> = true

export const chartWithoutCallerIdentity = (
	<ChartContainer
		config={{ desktop: { color: 'blue' } }}
		palette={['blue']}
	/>
)
