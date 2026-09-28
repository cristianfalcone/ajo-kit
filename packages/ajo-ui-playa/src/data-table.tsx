import {
	DataTable as BaseDataTable,
	type DataTableArgs,
	type DataTableData,
	type DataTableKey,
} from 'ajo-ui/data-table'
import { clx } from 'ajo-ui/utils'
import { checkboxIndicator, checkboxState, choiceInput } from './internal/choice'
import { menuCheckIndicator, menuContent } from './internal/menu'
export type { DataTableArgs, DataTableColumn } from 'ajo-ui/data-table'

// Rows per page stays a native select, so DataTable never loads the Select
// family; it wears Select's trigger at the bar's size, and the chevron is the
// page-size wrapper's.
const pageSize = 'h-control-sm cursor-pointer appearance-none playa-field ps-3 pe-8 text-base text-foreground sm:text-sm tabular-nums [&>option]:bg-popover [&>option]:text-popover-foreground'

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
		class={clx('playa-data-table playa-table', classes)}
		classNames={{
			checkbox: clx('playa-checkbox-box', checkboxState, classNames?.checkbox),
			checkbox_indicator: clx(checkboxIndicator, classNames?.checkbox_indicator),
			checkbox_input: clx(choiceInput, classNames?.checkbox_input),
			menu: clx('playa-menu-root', classNames?.menu),
			menu_content: clx(menuContent, classNames?.menu_content),
			menu_item: clx('playa-menu-choice-row', menuCheckIndicator, classNames?.menu_item),
			menu_label: clx('playa-menu-label', classNames?.menu_label),
			menu_separator: clx('playa-menu-separator', classNames?.menu_separator),
			page_size: clx(pageSize, classNames?.page_size),
		}}
	/>
)

export { DataTable }
