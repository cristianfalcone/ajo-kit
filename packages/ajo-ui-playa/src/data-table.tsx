import {
	DataTable as BaseDataTable,
	type DataTableArgs as BaseDataTableArgs,
	type DataTableColumn as BaseDataTableColumn,
} from 'ajo-ui/data-table'
import clsx from 'clsx'
import {
	checkboxBox,
	checkboxIndicator,
	checkboxState,
	choiceInput,
	menuCheckIndicator,
	menuChoiceRow,
	menuContent,
	menuLabel,
	menuSeparator,
} from './internal/recipes'

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
 * Its menus, checkboxes and page-size select take the standalone recipes.
 */
const DataTable = <T extends DataTableData, Key extends DataTableKey = DataTableKey>({
	class: classes,
	classNames,
	...attrs
}: DataTableArgs<T, Key>) => (
	<BaseDataTable<T, Key>
		{...attrs}
		class={clsx('playa-data-table playa-table', classes)}
		classNames={{
			checkbox: clsx(checkboxBox, checkboxState, classNames?.checkbox),
			checkbox_indicator: clsx(checkboxIndicator, classNames?.checkbox_indicator),
			checkbox_input: clsx(choiceInput, classNames?.checkbox_input),
			menu: clsx('playa-menu-root', classNames?.menu),
			menu_content: clsx(menuContent(), classNames?.menu_content),
			menu_item: clsx(menuChoiceRow, menuCheckIndicator, classNames?.menu_item),
			menu_label: clsx(menuLabel, classNames?.menu_label),
			menu_separator: clsx(menuSeparator, classNames?.menu_separator),
			page_size: clsx('playa-select-trigger h-8 [&>option]:bg-popover [&>option]:text-popover-foreground', classNames?.page_size),
		}}
	/>
)

export { DataTable }
export default DataTable
