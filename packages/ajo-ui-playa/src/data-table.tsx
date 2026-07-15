import {
	DataTable as BaseDataTable,
	type DataTableArgs as BaseDataTableArgs,
	type DataTableColumn as BaseDataTableColumn,
} from 'ajo-ui/data-table'
import clsx from 'clsx'

type DataTableData = any[] | Record<string, any>
type DataTableKey = number | string

/** Column schema accepted by the Playa-styled DataTable. */
export type DataTableColumn<T extends DataTableData> = BaseDataTableColumn<T>
/** Arguments accepted by the Playa-styled DataTable. */
export type DataTableArgs<
	T extends DataTableData = Record<string, unknown>,
	Key extends DataTableKey = DataTableKey,
> = BaseDataTableArgs<T, Key>

/**
 * Playa-styled DataTable; state, semantics, and structure remain base-owned.
 * `playa-table` is the same slot recipe the manual Table wrapper carries, so
 * both surfaces share one source for table geometry, typography, and states.
 */
const DataTable = <T extends DataTableData, Key extends DataTableKey = DataTableKey>({
	class: classes,
	...attrs
}: DataTableArgs<T, Key>) => (
	<BaseDataTable<T, Key>
		{...attrs}
		class={clsx('playa-data-table playa-table', classes)}
	/>
)

export { DataTable }
export default DataTable
