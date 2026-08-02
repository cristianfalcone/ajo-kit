import type { Children, IntrinsicElements } from 'ajo'
import type { FixedArgs, OmitArg } from './utils'

export type DataTableKey = number | string
export type DataTableData = any[] | Record<string, any>

export type DataTableScalar = boolean | number | string | null | undefined

export type DataTableCellContext = {
	readonly columnId: string
	readonly sourceIndex: number
	readonly value: unknown
}

export type DataTableFacet<T extends DataTableData> = {
	readonly label: string
	readonly options: readonly {
		readonly icon?: Children
		readonly label: string
		readonly value: string
	}[]
	readonly values?: (row: T, sourceIndex: number) => string | readonly string[]
}

type DataTableColumnBase = {
	/** Plain accessible name used by menus, sorting, and announcements. */
	readonly label: string
	/** Visual header content. Defaults to `label`. */
	readonly header?: Children
	readonly align?: 'center' | 'left' | 'right'
	readonly defaultHidden?: boolean
	readonly hideable?: boolean
}

type DataTableValue<T extends DataTableData> =
	| { readonly id?: string; readonly value: keyof T & string }
	| { readonly id: string; readonly value: (row: T, sourceIndex: number) => unknown }

type DataTableValueColumn<T extends DataTableData> = DataTableColumnBase & DataTableValue<T> & {
	readonly cell?: (row: T, context: DataTableCellContext) => Children
	readonly sort?: false | ((left: T, right: T) => number)
	readonly search?: false | ((row: T, sourceIndex: number) => DataTableScalar)
	readonly facet?: DataTableFacet<T>
}

type DataTableDisplayColumn<T extends DataTableData> = DataTableColumnBase & {
	readonly id: string
	readonly value?: never
	readonly cell: (row: T, context: DataTableCellContext) => Children
	readonly sort?: false
	readonly search?: false
	readonly facet?: never
}

/** A stable Ajo column schema; engine implementation details stay private. */
export type DataTableColumn<T extends DataTableData> = DataTableDisplayColumn<T> | DataTableValueColumn<T>

type DataTableSelectionChange<Key extends DataTableKey> = (
	keys: readonly Key[],
	event?: Event,
) => void

export type DataTableSelection<T extends DataTableData, Key extends DataTableKey = DataTableKey> = {
	getRowLabel: (row: T, sourceIndex: number) => string
} & (
	| {
		value: readonly Key[]
		defaultValue?: readonly Key[]
		onValueChange: DataTableSelectionChange<Key>
	}
	| {
		value?: undefined
		defaultValue?: readonly Key[]
		onValueChange?: DataTableSelectionChange<Key>
	}
)

export type DataTablePagination = {
	defaultSize?: number
	sizes?: readonly number[]
}

export type DataTableSortName = 'ascending' | 'descending' | 'none'

export type DataTableLabels = {
	columns: string
	deselectPage: string
	deselectResults: string
	deselectRow: (rowLabel: string) => string
	firstPage: string
	lastPage: string
	nextPage: string
	page: (page: number, pages: number) => string
	pagination: (tableLabel: string) => string
	previousPage: string
	reset: string
	results: (count: number) => string
	rowsPerPage: string
	search: string
	selectPage: string
	selectResults: string
	selectRow: (rowLabel: string) => string
	selected: (selected: number, sourceTotal: number) => string
	sort: (columnLabel: string, next: DataTableSortName) => string
	toolbar: (tableLabel: string) => string
}

/** Arguments for the client-side, paginated DataTable strategy. */
export type DataTableArgs<
	T extends DataTableData = Record<string, unknown>,
	Key extends DataTableKey = DataTableKey,
> = OmitArg<
	IntrinsicElements['div'],
	'aria-label' | 'aria-labelledby' | 'children' | 'data-slot'
> & FixedArgs<
	'aria-label'
	| 'aria-labelledby'
	| 'attr:aria-label'
	| 'attr:aria-labelledby'
	| 'attr:data-slot'
	| 'children'
	| 'data-slot'
	| 'set:ariaLabel'
	| 'set:ariaLabelledByElements'
> & {
	/** Plain accessible name applied to the native table element. */
	label: string
	/** Immutable ordered logical collection. */
	rows: readonly T[]
	/** Stable unique identity across filter, sort, page, and refresh. */
	getRowKey: (row: T, sourceIndex: number) => Key
	/** Immutable column schema with stable IDs. */
	columns: readonly DataTableColumn<T>[]
	/** Opt-in global search. */
	search?: { placeholder?: string }
	/** Presence enables key-first row selection. */
	selection?: DataTableSelection<T, Key>
	/** Pagination is enabled by default; false renders every filtered row. */
	pagination?: false | DataTablePagination
	empty?: Children
	labels?: Partial<DataTableLabels>
	children?: never
}
