import type { Children, IntrinsicElements, Stateful } from 'ajo'
import type { OmitArg } from './utils'
import { announce, selection, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { Checkbox } from './checkbox'
import { Toolbar } from './toolbar'
import { clx, defaultResultsLabel } from './utils'

export type DataTableSortDirection = 'asc' | 'desc'

export type DataTableRow<T> = {
	/** Original row object. */
	original: T
	/** Stable row id. */
	id: string
	/** Original index in the input data array. */
	index: number
}

export type DataTableCellContext<T> = DataTableRow<T> & {
	/** Current column. */
	column: DataTableColumn<T>
}

export type DataTableColumn<T> = {
	/** Stable column id. Defaults to accessorKey when present. */
	id?: string
	/** Object key used for default cell text, sorting, and filtering. */
	accessorKey?: keyof T & string
	/** Custom value used for default cell text, sorting, and filtering. */
	accessor?: (row: T, index: number) => unknown
	/** Header content. */
	header: Children
	/** Custom cell renderer. */
	cell?: (row: T, context: DataTableCellContext<T>) => Children
	/** Custom text/value used by global search. */
	searchValue?: (row: T, index: number) => unknown
	/** Custom sort comparator. */
	sort?: false | ((a: T, b: T, direction: DataTableSortDirection) => number)
	/** Disable global search for this column. */
	searchable?: boolean
	/** Allow the column to be hidden from the view options menu. */
	hideable?: boolean
	/** Hide this column initially. */
	hidden?: boolean
	/** Additional classes for the header cell. */
	headerClass?: string
	/** Additional classes for each body cell. */
	cellClass?: string | ((row: T, index: number) => string | undefined)
	/** Optional horizontal alignment shortcut. */
	align?: 'center' | 'left' | 'right'
}

export type DataTableFacetOption = {
	label: string
	value: string
	icon?: string
}

export type DataTableFacet<T> = {
	/** Stable filter id. */
	id: string
	/** Button label. */
	title: string
	/** Available facet values. */
	options: DataTableFacetOption[]
	/** Column id/accessorKey used to read facet values. */
	column?: string
	/** Custom row value getter. Values may be scalar or arrays. */
	getValue?: (row: T, index: number) => unknown
}

export type DataTableSearch<T> = {
	/** Search input placeholder. */
	placeholder?: string
	/** Restrict global search to one column id/accessorKey. */
	column?: string
	/** Custom row text getter for search. */
	getValue?: (row: T, index: number) => unknown
}

export type DataTableLabels = {
	/** Column-visibility trigger text. */
	columns: string
	/** First-page button label. */
	firstPage: string
	/** Last-page button label. */
	lastPage: string
	/** Next-page button label. */
	nextPage: string
	/** Page indicator text. */
	page: (page: number, pages: number) => string
	/** Previous-page button label. */
	previousPage: string
	/** Reset-filters button text. */
	reset: string
	/** Screen-reader message for filter result counts. */
	results: (count: number) => string
	/** Rows-per-page label. */
	rowsPerPage: string
	/** Search input label and placeholder fallback. */
	search: string
	/** Select-all checkbox label. */
	selectAll: string
	/** Select-row checkbox label. */
	selectRow: string
	/** Selection summary. */
	selected: (selected: number, total: number) => string
	/** Accessible name for the filter/view-options toolbar. */
	toolbar: string
}

type DataTableOptions<T = any> = {
	/** Rows to render. */
	data: T[]
	/** Column definitions. */
	columns: DataTableColumn<T>[]
	/** Stable row id getter. Defaults to `row.id`, then original index. */
	getRowId?: (row: T, index: number) => string | number
	/** Enable row-selection checkboxes. */
	selectable?: boolean
	/** Global search configuration. Pass `false` to hide the search input. */
	search?: false | DataTableSearch<T>
	/** Optional facet filters shown in the toolbar. */
	facets?: DataTableFacet<T>[]
	/** Show the column visibility menu. */
	columnVisibility?: boolean
	/** Initial page size. */
	pageSize?: number
	/** Page-size options shown in the footer. */
	pageSizeOptions?: number[]
	/** Empty-state content. */
	empty?: Children
	/** Overrides for user-visible and assistive text. */
	labels?: Partial<DataTableLabels>
	/** Called whenever selected rows change. */
	onRowSelectionChange?: (rows: T[], ids: string[], event?: Event) => void
}

type RowModel<T> = {
	id: string
	index: number
	original: T
}

type SortState = {
	id: string
	direction: DataTableSortDirection
} | null

type ColumnModel<T> = {
	column: DataTableColumn<T>
	id: string
}

type Align = NonNullable<DataTableColumn<unknown>['align']>

export type DataTableClasses<T = any> = {
	align?: Partial<Record<Align, string>>
	columnItem?: string
	columnsIcon?: string
	columnsTrigger?: string
	emptyCell?: string
	facetCount?: string
	facetIcon?: string
	facetOptionIcon?: string
	facetTrigger?: string
	firstPageButton?: string
	firstPageIcon?: string
	lastPageButton?: string
	lastPageIcon?: string
	nextPageButton?: string
	nextPageIcon?: string
	pageButtons?: string
	pageLabel?: string
	pageSizeGroup?: string
	pageSizeLabel?: string
	pageSizeTrigger?: string
	pagination?: string
	paginationControls?: string
	previousPageButton?: string
	previousPageIcon?: string
	resetIcon?: string
	rowSelectCell?: string
	searchInput?: string
	selectHead?: string
	selection?: string
	sortButton?: (column: DataTableColumn<T>) => string | undefined
	sortIcon?: (direction: DataTableSortDirection | undefined) => string | undefined
	tableContainer?: string
	toolbar?: string
	toolbarControls?: string
}

export type DataTableSearchRenderArgs = {
	ariaLabel: string
	class?: string
	placeholder: string
	query: string
	setQuery: (query: string) => void
}

export type DataTableFacetRenderArgs<T> = {
	active: Set<string>
	countClass?: string
	facet: DataTableFacet<T>
	iconClass?: string
	optionIconClass?: string
	setFacet: (facetId: string, option: string, checked: boolean) => void
	triggerClass?: string
}

export type DataTableColumnVisibilityRenderArgs<T> = {
	columns: ColumnModel<T>[]
	hidden: Set<string>
	iconClass?: string
	itemClass?: string
	label: string
	setHidden: (columnId: string, visible: boolean) => void
	triggerClass?: string
}

export type DataTableCheckboxRenderArgs = {
	ariaLabel: string
	checked: boolean
	indeterminate?: boolean
	onChange: (checked: boolean, event: Event) => void
}

export type DataTableSortRenderArgs = {
	children: Children
	class?: string
	iconClass?: string
	onClick: () => void
}

export type DataTablePageSizeRenderArgs = {
	onChange: (size: number) => void
	options: number[]
	triggerClass?: string
	value: string
}

export type DataTablePageButtonRenderArgs = {
	ariaLabel: string
	class?: string
	disabled: boolean
	iconClass?: string
	onClick: () => void
}

type ChildrenArgs = {
	children?: Children
	class?: string
	key?: string
}

type HeadArgs = ChildrenArgs & {
	'aria-sort'?: 'ascending' | 'descending'
}

type RowArgs = ChildrenArgs & {
	'data-state'?: string
}

type CellArgs = ChildrenArgs & {
	colspan?: number
}

export type DataTableRenderers<T = any> = {
	body: (args: ChildrenArgs) => Children
	cell: (args: CellArgs) => Children
	checkbox: (args: DataTableCheckboxRenderArgs) => Children
	columnVisibility: (args: DataTableColumnVisibilityRenderArgs<T>) => Children
	facet: (args: DataTableFacetRenderArgs<T>) => Children
	head: (args: HeadArgs) => Children
	header: (args: ChildrenArgs) => Children
	pageButton: (args: DataTablePageButtonRenderArgs) => Children
	pageSize: (args: DataTablePageSizeRenderArgs) => Children
	reset: (args: { iconClass?: string; label: string; onReset: () => void }) => Children
	row: (args: RowArgs) => Children
	search: (args: DataTableSearchRenderArgs) => Children
	sort: (args: DataTableSortRenderArgs) => Children
	table: (args: ChildrenArgs) => Children
}

export type DataTableArgs<T = any> = OmitArg<IntrinsicElements['div'], 'children' | 'class'> & DataTableOptions<T> & {
	/** Additional classes for the root. */
	class?: string
	classes?: DataTableClasses<T>
	children?: never
	renderers?: Partial<DataTableRenderers<T>>
}

type DataTableRootArgs<T = any> = DataTableOptions<T> & {
	classes?: DataTableClasses<T>
	renderers?: Partial<DataTableRenderers<T>>
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const asText = (value: unknown): string => {
	if (value == null || value === false) return ''
	if (value instanceof Date) return value.toISOString()
	if (Array.isArray(value)) return value.map(asText).join(' ')
	if (typeof value === 'object') return JSON.stringify(value)
	return String(value)
}

const data = (row: unknown, key: string) =>
	row && typeof row === 'object'
		? (row as Record<string, unknown>)[key]
		: undefined

const id = <T,>(column: DataTableColumn<T>, index: number) =>
	column.id ?? column.accessorKey ?? `column-${index}`

const value = <T,>(column: DataTableColumn<T>, row: T, index: number) => {
	if (column.accessor) return column.accessor(row, index)
	if (column.accessorKey) return data(row, column.accessorKey)
	return undefined
}

const values = (raw: unknown): string[] =>
	Array.isArray(raw) ? raw.flatMap(values) : [asText(raw)]

const cellClass = <T,>(column: DataTableColumn<T>, row: T, index: number) =>
	typeof column.cellClass === 'function'
		? column.cellClass(row, index)
		: column.cellClass

const compare = <T,>(
	column: DataTableColumn<T>,
	direction: DataTableSortDirection,
	a: RowModel<T>,
	b: RowModel<T>,
) => {
	if (typeof column.sort === 'function') return column.sort(a.original, b.original, direction)

	const av = value(column, a.original, a.index)
	const bv = value(column, b.original, b.index)
	const numeric = typeof av === 'number' && typeof bv === 'number'
	const result = numeric
		? av - bv
		: collator.compare(asText(av), asText(bv))

	return direction === 'asc' ? result : -result
}

const defaultLabels: DataTableLabels = {
	columns: 'Columns',
	firstPage: 'Go to first page',
	lastPage: 'Go to last page',
	nextPage: 'Go to next page',
	page: (page, pages) => `Page ${page} of ${pages}`,
	previousPage: 'Go to previous page',
	reset: 'Reset',
	results: defaultResultsLabel,
	rowsPerPage: 'Rows per page',
	search: 'Filter rows...',
	selectAll: 'Select all rows on this page',
	selectRow: 'Select row',
	selected: (selected, total) => `${selected} of ${total} row(s) selected.`,
	toolbar: 'Table controls',
}

const defaultRenderers: DataTableRenderers<any> = {
	body: ({ children, class: classes, key }) => <tbody key={key} class={classes}>{children}</tbody>,
	cell: ({ children, class: classes, colspan, key }) => <td key={key} class={classes} colspan={colspan}>{children}</td>,
	checkbox: ({ ariaLabel, checked, indeterminate, onChange }) => (
		<Checkbox
			aria-label={ariaLabel}
			onCheckedChange={onChange}
			set:checked={checked}
			set:indeterminate={indeterminate}
		/>
	),
	columnVisibility: ({ columns, hidden, label, setHidden }) => (
		<details>
			<summary>{label}</summary>
			{columns.filter(({ column }) => column.hideable !== false).map(({ column, id }) => (
				<label key={id}>
					<Checkbox
						set:checked={!hidden.has(id)}
						onCheckedChange={checked => setHidden(id, checked)}
					/>
					{column.header}
				</label>
			))}
		</details>
	),
	facet: ({ active, facet, setFacet }) => (
		<details key={facet.id}>
			<summary>{facet.title}{active.size ? ` (${active.size})` : ''}</summary>
			{facet.options.map(option => (
				<label key={option.value}>
					<Checkbox
						set:checked={active.has(option.value)}
						onCheckedChange={checked => setFacet(facet.id, option.value, checked)}
					/>
					{option.label}
				</label>
			))}
		</details>
	),
	head: ({ 'aria-sort': ariaSort, children, class: classes, key }) => <th key={key} aria-sort={ariaSort} class={classes}>{children}</th>,
	header: ({ children, class: classes, key }) => <thead key={key} class={classes}>{children}</thead>,
	pageButton: ({ ariaLabel, class: classes, disabled, iconClass, onClick }) => (
		<button aria-label={ariaLabel} class={classes} disabled={disabled} type="button" set:onclick={onClick}>
			{iconClass ? <span aria-hidden="true" class={iconClass} /> : ariaLabel}
		</button>
	),
	pageSize: ({ onChange, options, triggerClass, value }) => (
		<select class={triggerClass} set:value={value} set:onchange={(event: Event) => onChange(Number((event.target as HTMLSelectElement).value))}>
			{options.map(option => <option key={option} value={String(option)}>{option}</option>)}
		</select>
	),
	reset: ({ iconClass, label, onReset }) => (
		<button type="button" set:onclick={onReset}>
			{label}
			{iconClass ? <span aria-hidden="true" class={iconClass} /> : null}
		</button>
	),
	row: ({ 'data-state': state, children, class: classes, key }) => <tr key={key} class={classes} data-state={state}>{children}</tr>,
	search: ({ ariaLabel, class: classes, placeholder, query, setQuery }) => (
		<input
			aria-label={ariaLabel}
			class={classes}
			placeholder={placeholder}
			set:oninput={(event: Event) => setQuery((event.target as HTMLInputElement).value)}
			set:value={query}
			type="search"
		/>
	),
	sort: ({ children, class: classes, iconClass, onClick }) => (
		<button class={classes} type="button" set:onclick={onClick}>
			<span>{children}</span>
			{iconClass ? <span aria-hidden="true" class={iconClass} /> : null}
		</button>
	),
	table: ({ children, class: classes, key }) => <table key={key} class={classes}>{children}</table>,
}

/** Unstyled sortable, filterable, paginated data-table state and structure. */
const DataTableRoot: Stateful<DataTableRootArgs<any>> = function* ({
	columnVisibility = true,
	pageSize = 10,
	pageSizeOptions = [10, 20, 25, 30, 40, 50],
}) {
	let query = ''
	let sort: SortState = null
	let hidden = new Set<string>()
	let initializedHidden = new Set<string>()
	let facets = new Map<string, Set<string>>()
	let pageIndex = 0
	let size = pageSize
	let activeRows: RowModel<unknown>[] = []
	let announceResults = false
	let currentData: unknown[] = []
	let currentGetRowId: DataTableOptions['getRowId'] | undefined
	let onRowSelectionChange: DataTableOptions['onRowSelectionChange'] | undefined

	const rowId = (row: unknown, index: number) => String(currentGetRowId?.(row, index) ?? data(row, 'id') ?? index)
	const selectedRows = (ids: Set<string>) => currentData
		.map((row, index) => ({ id: rowId(row, index), row }))
		.filter(row => ids.has(row.id))
		.map(row => row.row)

	const live = announce(this)
	const picks = selection(this, {
		multiple: () => true,
		onChange: (values, event) => onRowSelectionChange?.(selectedRows(new Set(values)), values, event),
	})

	const toggleRow = (id: string, checked: boolean, event?: Event) => {
		const next = new Set(picks.values)
		if (checked) next.add(id)
		else next.delete(id)
		picks.set([...next], event)
	}

	const togglePage = (checked: boolean, event?: Event) => {
		const next = new Set(picks.values)
		for (const row of activeRows) {
			if (checked) next.add(row.id)
			else next.delete(row.id)
		}
		picks.set([...next], event)
	}

	const setSort = (columnId: string) => this.next(() => {
		if (!sort || sort.id !== columnId) {
			sort = { id: columnId, direction: 'asc' }
		} else if (sort.direction === 'asc') {
			sort = { id: columnId, direction: 'desc' }
		} else {
			sort = null
		}
		pageIndex = 0
	})

	const setHidden = (columnId: string, visible: boolean) => this.next(() => {
		const next = new Set(hidden)
		if (visible) next.delete(columnId)
		else next.add(columnId)
		hidden = next
	})

	const setFacet = (facetId: string, option: string, checked: boolean) => this.next(() => {
		const next = new Map(facets)
		const values = new Set(next.get(facetId) ?? [])
		if (checked) values.add(option)
		else values.delete(option)
		if (values.size) next.set(facetId, values)
		else next.delete(facetId)
		facets = next
		pageIndex = 0
		announceResults = true
	})

	const resetFilters = () => this.next(() => {
		query = ''
		facets = new Map()
		pageIndex = 0
		announceResults = true
	})

	const setQuery = (next: string) => this.next(() => {
		query = next
		pageIndex = 0
		announceResults = true
	})

	const setSize = (next: number) => this.next(() => {
		size = next
		pageIndex = 0
	})

	for (const args of this) {
		const columns = args.columns.map((column, index) => ({ column, id: id(column, index) }))
		const search = args.search ?? { placeholder: 'Filter rows...' }
		const searchable = search === false
			? []
			: columns.filter(({ column, id }) =>
				column.searchable !== false && (!search.column || search.column === id || search.column === column.accessorKey)
			)
		const renderers = { ...defaultRenderers, ...(args.renderers ?? {}) } as DataTableRenderers<unknown>
		const labels = { ...defaultLabels, ...(args.labels ?? {}) }
		const classes = args.classes ?? {}
		const align = classes.align ?? {}

		currentData = args.data
		currentGetRowId = args.getRowId
		onRowSelectionChange = args.onRowSelectionChange
		columnVisibility = args.columnVisibility ?? columnVisibility
		pageSizeOptions = args.pageSizeOptions ?? pageSizeOptions

		for (const { column, id } of columns) {
			if (!initializedHidden.has(id)) {
				initializedHidden.add(id)
				if (column.hidden) hidden.add(id)
			}
		}

		const rows = args.data.map((row, index) => ({ id: rowId(row, index), index, original: row }))
		const normalized = query.trim().toLowerCase()
		const filtered = rows
			.filter(row => {
				if (!normalized || search === false) return true
				const haystack = search.getValue
					? asText(search.getValue(row.original, row.index))
					: searchable
						.map(({ column }) => asText(column.searchValue?.(row.original, row.index) ?? value(column, row.original, row.index)))
						.join(' ')

				return haystack.toLowerCase().includes(normalized)
			})
			.filter(row => (args.facets ?? []).every(facet => {
				const active = facets.get(facet.id)
				if (!active?.size) return true

				const raw = facet.getValue
					? facet.getValue(row.original, row.index)
					: facet.column
						? data(row.original, facet.column)
						: undefined

				return values(raw).some(value => active.has(value))
			}))

		const activeSort = sort as SortState
		const sortColumn = activeSort ? columns.find(column => column.id === activeSort.id)?.column : undefined
		const sorted = activeSort && sortColumn
			? [...filtered].sort((a, b) => compare(sortColumn, activeSort.direction, a, b))
			: filtered
		const pageCount = Math.max(1, Math.ceil(sorted.length / size))
		if (pageIndex > pageCount - 1) pageIndex = pageCount - 1
		const start = pageIndex * size
		const page = sorted.slice(start, start + size)
		const visible = columns.filter(({ column, id }) => column.hideable === false || !hidden.has(id))
		const selectable = Boolean(args.selectable)
		const colSpan = visible.length + (selectable ? 1 : 0)
		const selectedIds = new Set(picks.values)
		const selectedFiltered = sorted.filter(row => selectedIds.has(row.id)).length
		const selectedPage = page.filter(row => selectedIds.has(row.id)).length
		const allPageSelected = page.length > 0 && selectedPage === page.length
		const somePageSelected = selectedPage > 0 && !allPageSelected
		const hasFilters = Boolean(query || facets.size)

		if (announceResults) {
			announceResults = false
			live.polite(labels.results(sorted.length))
		}

		activeRows = page

		yield (
			<>
				{search !== false || (args.facets?.length ?? 0) > 0 || columnVisibility ? (
					<Toolbar aria-label={labels.toolbar} class={classes.toolbar} data-slot="data-table-toolbar">
						<div class={classes.toolbarControls}>
							{search !== false ? renderers.search({
								ariaLabel: search.placeholder ?? labels.search,
								class: classes.searchInput,
								placeholder: search.placeholder ?? labels.search,
								query,
								setQuery,
							}) : null}
							{(args.facets ?? []).map(facet => renderers.facet({
								active: facets.get(facet.id) ?? new Set<string>(),
								countClass: classes.facetCount,
								facet,
								iconClass: classes.facetIcon,
								optionIconClass: classes.facetOptionIcon,
								setFacet,
								triggerClass: classes.facetTrigger,
							}))}
							{hasFilters ? renderers.reset({
									iconClass: classes.resetIcon,
									label: labels.reset,
								onReset: resetFilters,
							}) : null}
						</div>
						{columnVisibility ? renderers.columnVisibility({
							columns,
							hidden,
							iconClass: classes.columnsIcon,
							itemClass: classes.columnItem,
							label: labels.columns,
							setHidden,
							triggerClass: classes.columnsTrigger,
						}) : null}
					</Toolbar>
				) : null}

				<div class={classes.tableContainer} data-slot="data-table-container">
					{renderers.table({
						children: (
							<>
								{renderers.header({
									children: renderers.row({
										children: (
											<>
												{selectable ? renderers.head({
													class: classes.selectHead,
													children: renderers.checkbox({
														ariaLabel: labels.selectAll,
														checked: allPageSelected,
														indeterminate: somePageSelected,
														onChange: (checked, event) => togglePage(checked, event),
													}),
												}) : null}
												{visible.map(({ column, id }) => {
													const sorted = sort?.id === id ? sort.direction : undefined
													const sortable = column.sort !== false

													return renderers.head({
														key: id,
														'aria-sort': sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined,
														class: clx(column.headerClass, column.align && align[column.align]),
														children: sortable ? renderers.sort({
															children: column.header,
															class: classes.sortButton?.(column),
															iconClass: classes.sortIcon?.(sorted),
															onClick: () => setSort(id),
														}) : column.header,
													} as HeadArgs & { key: string })
												})}
											</>
										),
									}),
								})}
								{renderers.body({
									children: page.length ? page.map(row => renderers.row({
										key: row.id,
										'data-state': selectedIds.has(row.id) ? 'selected' : undefined,
										children: (
											<>
												{selectable ? renderers.cell({
													class: classes.rowSelectCell,
													children: renderers.checkbox({
														ariaLabel: labels.selectRow,
														checked: selectedIds.has(row.id),
														onChange: (checked, event) => toggleRow(row.id, checked, event),
													}),
												}) : null}
												{visible.map(({ column, id }) => renderers.cell({
													key: id,
													class: clx(column.align && align[column.align], cellClass(column, row.original, row.index)),
													children: column.cell
														? column.cell(row.original, { column, id: row.id, index: row.index, original: row.original })
														: asText(value(column, row.original, row.index)),
												} as CellArgs & { key: string }))}
											</>
										),
									} as RowArgs & { key: string })) : renderers.row({
										children: renderers.cell({
											class: classes.emptyCell,
											colspan: colSpan,
											children: args.empty ?? 'No results.',
										}),
									}),
								})}
							</>
						),
					})}
				</div>

				<div class={classes.pagination} data-slot="data-table-pagination">
					<div class={classes.selection} data-slot="data-table-selection">
						{labels.selected(selectedFiltered, sorted.length)}
					</div>
					<div class={classes.paginationControls}>
						<div class={classes.pageSizeGroup}>
							<span class={classes.pageSizeLabel}>{labels.rowsPerPage}</span>
							{renderers.pageSize({
								onChange: setSize,
								options: pageSizeOptions,
								triggerClass: classes.pageSizeTrigger,
								value: String(size),
							})}
						</div>
						<div class={classes.pageLabel}>
							{labels.page(pageIndex + 1, pageCount)}
						</div>
						<div class={classes.pageButtons}>
							{renderers.pageButton({
								ariaLabel: labels.firstPage,
								class: classes.firstPageButton,
								disabled: pageIndex === 0,
								iconClass: classes.firstPageIcon,
								onClick: () => this.next(() => pageIndex = 0),
							})}
							{renderers.pageButton({
								ariaLabel: labels.previousPage,
								class: classes.previousPageButton,
								disabled: pageIndex === 0,
								iconClass: classes.previousPageIcon,
								onClick: () => this.next(() => pageIndex = Math.max(0, pageIndex - 1)),
							})}
							{renderers.pageButton({
								ariaLabel: labels.nextPage,
								class: classes.nextPageButton,
								disabled: pageIndex >= pageCount - 1,
								iconClass: classes.nextPageIcon,
								onClick: () => this.next(() => pageIndex = Math.min(pageCount - 1, pageIndex + 1)),
							})}
							{renderers.pageButton({
								ariaLabel: labels.lastPage,
								class: classes.lastPageButton,
								disabled: pageIndex >= pageCount - 1,
								iconClass: classes.lastPageIcon,
								onClick: () => this.next(() => pageIndex = pageCount - 1),
							})}
						</div>
					</div>
				</div>
			</>
		)
	}
}

/** Unstyled sortable, filterable, paginated data table. */
const DataTable = <T = any,>({
	children: _children,
	class: rootClass,
	classes,
	columnVisibility,
	columns,
	data,
	empty,
	facets,
	getRowId,
	labels,
	onRowSelectionChange,
	pageSize,
	pageSizeOptions,
	renderers,
	search,
	selectable,
	...attrs
}: DataTableArgs<T>) => (
	<DataTableRoot
		{...rootAttrs(attrs)}
		classes={classes}
		columnVisibility={columnVisibility}
		columns={columns}
		data={data}
		empty={empty}
		facets={facets}
		getRowId={getRowId}
		labels={labels}
		onRowSelectionChange={onRowSelectionChange}
		pageSize={pageSize}
		pageSizeOptions={pageSizeOptions}
		renderers={renderers}
		search={search}
		selectable={selectable}
		attr:class={rootClass}
		attr:data-slot="data-table"
	/>
)

export { DataTable }
