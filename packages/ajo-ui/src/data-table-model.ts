import {
	columnFilteringFeature,
	columnVisibilityFeature,
	constructTable,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	tableFeatures,
	type ColumnDef,
	type RowSelectionState,
	type SortingState,
} from '@tanstack/table-core'
import type { TableReactivityBindings } from '@tanstack/table-core/reactivity'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import type { Children } from 'ajo'
import type { Host } from 'ajo-cloves'
import type {
	DataTableArgs,
	DataTableColumn,
	DataTableData,
	DataTableKey,
	DataTableLabels,
	DataTablePagination,
} from './data-table-contract'

export const dataTableStrategy = tableFeatures({
	columnFilteringFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

const DEFAULT_SIZES = [10, 25, 50] as const

export const dataTableDefaultLabels: DataTableLabels = {
	columns: 'Columns',
	deselectPage: 'Deselect page',
	deselectResults: 'Deselect filtered results',
	deselectRow: row => `Deselect ${row}`,
	firstPage: 'First page',
	lastPage: 'Last page',
	nextPage: 'Next page',
	page: (page, pages) => `Page ${page} of ${pages}`,
	pagination: table => `${table} pagination`,
	previousPage: 'Previous page',
	reset: 'Reset',
	results: count => `${count} result${count === 1 ? '' : 's'}`,
	rowsPerPage: 'Rows per page',
	search: 'Search',
	selectPage: 'Select page',
	selectResults: 'Select filtered results',
	selectRow: row => `Select ${row}`,
	selected: (selected, total) => `${selected} of ${total} ${total === 1 ? 'row' : 'rows'} selected.`,
	sort: (column, next) => `Sort ${column} ${next}`,
	toolbar: table => `${table} controls`,
}

type Subscription = { unsubscribe(): void }

type ColumnModel<T extends DataTableData> = {
	column: DataTableColumn<T>
	id: string
	read?: (row: T, sourceIndex: number) => unknown
}

export type DataTableColumnView<T extends DataTableData> = ColumnModel<T> & {
	active: readonly string[]
	sorted: false | 'asc' | 'desc'
	visible: boolean
}

export type DataTableCellView<T extends DataTableData> = {
	column: ColumnModel<T>
	value: unknown
}

export type DataTableRowView<T extends DataTableData, Key extends DataTableKey> = {
	cells: readonly DataTableCellView<T>[]
	id: string
	key: Key
	original: T
	selected: boolean
	sourceIndex: number
}

export type DataTableView<T extends DataTableData, Key extends DataTableKey> = {
	columns: readonly DataTableColumnView<T>[]
	filteredCount: number
	hasFilters: boolean
	page: {
		count: number
		enabled: boolean
		index: number
		size: number
		sizes: readonly number[]
	}
	query: string
	rows: readonly DataTableRowView<T, Key>[]
	selectedCount: number
	selection: {
		enabled: boolean
		all: boolean
		some: boolean
	}
	sourceCount: number
	visibility: boolean
}

export type DataTableModel<T extends DataTableData, Key extends DataTableKey> = {
	cell(cell: DataTableCellView<T>, row: DataTableRowView<T, Key>): Children
	firstPage(): void
	lastPage(): void
	nextPage(): void
	previousPage(): void
	reset(event?: Event): void
	selected(rowId: string): boolean
	selection(): { all: boolean; some: boolean }
	setFacet(columnId: string, value: string, checked: boolean, event?: Event): void
	setPageSize(size: number): void
	setQuery(query: string, event?: Event): void
	sort(columnId: string, event?: Event): void
	sync(args: DataTableArgs<T, Key>): DataTableView<T, Key>
	toggleColumn(columnId: string, visible: boolean): void
	togglePage(checked: boolean, event?: Event): void
	toggleRow(rowId: string, checked: boolean, event?: Event): void
}

const assertText = (value: unknown, name: string) => {
	if (typeof value !== 'string' || !value.trim()) throw new TypeError(`DataTable invalid ${name}`)
	return value
}

const encodeKey = (key: DataTableKey, index?: number) => {
	if (typeof key === 'string') {
		if (!key) throw new TypeError(`DataTable invalid row key${index === undefined ? '' : ` at ${index}`}`)
		return `s:${key}`
	}
	if (!Number.isFinite(key)) throw new TypeError(`DataTable invalid row key${index === undefined ? '' : ` at ${index}`}`)
	return `n:${Object.is(key, -0) ? 0 : key}`
}

const columnId = <T extends DataTableData,>(column: DataTableColumn<T>) => {
	const id = column.id ?? (typeof column.value === 'string' ? column.value : undefined)
	return assertText(id, 'column id')
}

const scalarText = (value: unknown, column: string, index: number) => {
	if (value == null) return ''
	if (typeof value === 'string' || typeof value === 'boolean') return String(value)
	if (typeof value === 'number' && Number.isFinite(value)) return String(value)
	throw new TypeError(`DataTable invalid searchable value ${column} at ${index}`)
}

const facetValues = <T extends DataTableData,>(model: ColumnModel<T>, row: T, index: number) => {
	const facet = model.column.facet
	const raw = facet?.values?.(row, index)
	if (raw !== undefined) return (Array.isArray(raw) ? raw : [raw]).map(value => assertText(value, `facet value ${model.id}`))
	return [scalarText(model.read?.(row, index), model.id, index)]
}

const compareValues = (
	left: unknown,
	right: unknown,
	leftRow: { index: number },
	rightRow: { index: number },
	columnId: string,
	alphanumeric: () => number,
) => {
	const leftMissing = left == null
	const rightMissing = right == null
	if (leftMissing || rightMissing) return leftMissing === rightMissing ? 0 : leftMissing ? 1 : -1
	if (typeof left !== typeof right) throw new TypeError(`DataTable mixed sort values ${columnId}`)
	if (typeof left === 'string') return alphanumeric()
	if (typeof left === 'number' && typeof right === 'number') {
		if (!Number.isFinite(left) || !Number.isFinite(right)) {
			throw new TypeError(`DataTable invalid sort value ${columnId} at ${!Number.isFinite(left) ? leftRow.index : rightRow.index}`)
		}
		return left === right ? 0 : left < right ? -1 : 1
	}
	if (typeof left === 'boolean' && typeof right === 'boolean') return left === right ? 0 : left ? 1 : -1
	throw new TypeError(`DataTable invalid sort value ${columnId}`)
}

const paginationConfig = (pagination: false | DataTablePagination | undefined) => {
	const sizes = pagination === false ? DEFAULT_SIZES : pagination?.sizes ?? DEFAULT_SIZES
	if (!sizes.length) throw new RangeError('DataTable empty page sizes')
	const seen = new Set<number>()
	for (const size of sizes) {
		if (!Number.isInteger(size) || size <= 0 || seen.has(size)) throw new RangeError('DataTable invalid page sizes')
		seen.add(size)
	}
	const size = pagination === false ? sizes[0]! : pagination?.defaultSize ?? sizes[0]!
	if (!seen.has(size)) throw new RangeError('DataTable default page size is unavailable')
	return { enabled: pagination !== false, size, sizes }
}

export const dataTableReactivity = (host: Host) => {
	const subscriptions = new Set<Subscription>()
	let disposed = false
	const dispose = () => {
		if (disposed) return
		disposed = true
		for (const subscription of subscriptions) subscription.unsubscribe()
		subscriptions.clear()
	}
	const add = (subscription: Subscription) => {
		if (disposed) subscription.unsubscribe()
		else subscriptions.add(subscription)
		return subscription
	}
	const bindings: TableReactivityBindings = {
		...storeReactivityBindings(),
		addSubscription: subscription => { add(subscription) },
		createOptionsStore: false,
		schedule: fn => queueMicrotask(() => {
			if (disposed || host.signal.aborted) return
			try { fn() } catch (error) { host.throw(error) }
		}),
		unmount: dispose,
		wrapExternalAtoms: false,
	}
	host.signal.addEventListener('abort', dispose, { once: true })
	return { add, bindings }
}

export const createDataTableModel = <T extends DataTableData, Key extends DataTableKey>(
	host: Host,
	initialArgs: DataTableArgs<T, Key>,
): DataTableModel<T, Key> => {
	const reactive = dataTableReactivity(host)
	const features = tableFeatures({ ...dataTableStrategy, coreReactivityFeature: reactive.bindings })
	let args = initialArgs
	let actionEvent: Event | undefined
	let syncing = false
	let stateVersion = 0
	let renderedVersion = 0
	let requestedVersion = 0
	let queued = false
	let optionsInitialized = false

	let rowsRef: readonly T[] | undefined
	let rowsLength = 0
	let keyGetter: DataTableArgs<T, Key>['getRowKey'] | undefined
	let tableData: readonly T[] = initialArgs.rows
	let rowIds: string[] = []
	let rowKeys: Key[] = []
	let rowById = new Map<string, number>()

	let columnsRef: readonly DataTableColumn<T>[] | undefined
	let columnsLength = 0
	let models: ColumnModel<T>[] = []
	let modelById = new Map<string, ColumnModel<T>>()
	let definitions: ReadonlyArray<ColumnDef<typeof features, T, unknown>> = []
	let knownColumns = new Map<string, ColumnModel<T>>()

	let selectionEnabled = Boolean(initialArgs.selection)
	let selectionControlled = initialArgs.selection?.value !== undefined
	let searchEnabled = Boolean(initialArgs.search)
	let searchValue = ''
	let pageConfig = paginationConfig(initialArgs.pagination)

	const snapshotRows = (current: DataTableArgs<T, Key>) => {
		if (current.rows === rowsRef && current.getRowKey === keyGetter) {
			if (current.rows.length !== rowsLength) throw new TypeError('DataTable mutated rows')
			if (rowsLength) {
				const last = rowsLength - 1
				if (
					encodeKey(current.getRowKey(current.rows[0]!, 0)) !== rowIds[0]
					|| encodeKey(current.getRowKey(current.rows[last]!, last)) !== rowIds[last]
				) throw new TypeError('DataTable mutated rows')
			}
			return false
		}
		const replaced = current.rows !== rowsRef
		rowsRef = current.rows
		rowsLength = current.rows.length
		keyGetter = current.getRowKey
		// TanStack memoizes core rows by data identity. A new key function needs a
		// fresh identity even when the logical collection itself is unchanged.
		tableData = replaced ? current.rows : [...current.rows]
		rowIds = []
		rowKeys = []
		rowById = new Map()
		current.rows.forEach((row, index) => {
			const key = current.getRowKey(row, index)
			const id = encodeKey(key, index)
			const previous = rowById.get(id)
			if (previous !== undefined) throw new TypeError(`DataTable duplicate row key ${JSON.stringify(key)} ${previous}/${index}`)
			rowById.set(id, index)
			rowIds.push(id)
			rowKeys.push(key)
		})
		return true
	}

	const snapshotColumns = (current: DataTableArgs<T, Key>) => {
		if (current.columns === columnsRef) {
			if (current.columns.length !== columnsLength) throw new TypeError('DataTable mutated columns')
			return false
		}
		if (!current.columns.length) throw new TypeError('DataTable needs columns')
		columnsRef = current.columns
		columnsLength = current.columns.length
		models = []
		modelById = new Map()
		for (const column of current.columns) {
			assertText(column.label, 'column label')
			const id = columnId(column)
			if (modelById.has(id)) throw new TypeError(`DataTable duplicate column ${JSON.stringify(id)}`)
			const read = column.value === undefined
				? undefined
				: typeof column.value === 'function'
					? column.value
					: (row: T) => row[column.value as keyof T]
			if (!read && !column.cell) throw new TypeError(`DataTable display column ${JSON.stringify(id)} needs a cell`)
			if (!read && column.facet) throw new TypeError(`DataTable display column ${JSON.stringify(id)} cannot define a facet`)
			if (column.facet) {
				assertText(column.facet.label, `facet label ${id}`)
				const options = new Set<string>()
				for (const option of column.facet.options) {
					assertText(option.label, `facet option label ${id}`)
					assertText(option.value, `facet option value ${id}`)
					if (options.has(option.value)) throw new TypeError(`DataTable duplicate facet option ${id}/${option.value}`)
					options.add(option.value)
				}
			}
			const model = { column, id, read }
			models.push(model)
			modelById.set(id, model)
		}
		if (models.every(({ column }) => column.defaultHidden)) throw new TypeError('DataTable needs a visible column')

		definitions = models.map(model => {
			const { column, id, read } = model
			const definition = {
				enableGlobalFilter: Boolean(read && column.search !== false),
				enableHiding: column.hideable !== false,
				enableSorting: Boolean(read && column.sort !== false),
				filterFn: (row, _columnId, active) => {
					const selected = active as readonly string[]
					return !selected.length || facetValues(model, row.original, row.index).some(value => selected.includes(value))
				},
				header: column.label,
				id,
				sortFn: (left, right, columnId) => {
					if (typeof column.sort === 'function') {
						const result = column.sort(left.original, right.original)
						if (!Number.isFinite(result)) throw new TypeError(`DataTable invalid comparator ${columnId}`)
						return result
					}
					return compareValues(
						left.getValue(columnId),
						right.getValue(columnId),
						left,
						right,
						columnId,
						() => sortFn_alphanumeric(left, right, columnId),
					)
				},
				sortUndefined: false,
			} satisfies ColumnDef<typeof features, T, unknown>
			return read
				? { ...definition, accessorFn: read } satisfies ColumnDef<typeof features, T, unknown>
				: definition
		})
		return true
	}

	const selectionState = (keys: readonly Key[] | undefined) => {
		const state: RowSelectionState = Object.create(null)
		const seen = new Set<string>()
		for (const key of keys ?? []) {
			const id = encodeKey(key)
			if (seen.has(id)) throw new TypeError(`DataTable duplicate selection key ${JSON.stringify(key)}`)
			seen.add(id)
			if (rowById.has(id)) state[id] = true
		}
		return state
	}
	const selectionInput = (selection: DataTableArgs<T, Key>['selection']) => {
		const fallback = selectionState(selection?.defaultValue)
		return selection?.value === undefined ? fallback : selectionState(selection.value)
	}
	const sameSelection = (left: RowSelectionState, right: RowSelectionState) => {
		for (const id of Object.keys(left)) if (Boolean(left[id]) !== Boolean(right[id])) return false
		for (const id of Object.keys(right)) if (Boolean(left[id]) !== Boolean(right[id])) return false
		return true
	}

	snapshotRows(initialArgs)
	snapshotColumns(initialArgs)
	knownColumns = new Map(modelById)
	assertText(initialArgs.label, 'label')

	const initialSelection = selectionInput(initialArgs.selection)
	const initialVisibility = Object.fromEntries(models.map(({ column, id }) => [
		id,
		column.hideable === false || !column.defaultHidden,
	]))

	const table = constructTable<typeof features, T>({
		autoResetPageIndex: false,
		columns: definitions,
		data: tableData,
		enableMultiSort: false,
		enableRowRangeSelection: false,
		enableRowSelection: selectionEnabled,
		features,
		getColumnCanGlobalFilter: column => (column.columnDef as { enableGlobalFilter?: boolean }).enableGlobalFilter === true,
		getRowId: (_row, index) => rowIds[index]!,
		globalFilterFn: (row, columnId) => {
			const model = modelById.get(columnId)
			if (!model?.read || model.column.search === false) return false
			const raw = typeof model.column.search === 'function'
				? model.column.search(row.original, row.index)
				: row.getValue(columnId)
			return scalarText(raw, columnId, row.index).toLowerCase().includes(searchValue)
		},
		initialState: {
			columnFilters: [],
			columnVisibility: initialVisibility,
			globalFilter: '',
			pagination: { pageIndex: 0, pageSize: pageConfig.size },
			rowSelection: initialSelection,
			sorting: [],
		},
	})

	const defaultSelectionUpdater = table.options.onRowSelectionChange!

	const selectedKeys = (state = table.atoms.rowSelection.get()) => {
		const indexes: number[] = []
		for (const id of Object.keys(state)) {
			const index = rowById.get(id)
			if (state[id] && index !== undefined) indexes.push(index)
		}
		indexes.sort((left, right) => left - right)
		return indexes.map(index => rowKeys[index]!)
	}

	const countSelected = (state = table.atoms.rowSelection.get()) => {
		let count = 0
		for (const id of Object.keys(state)) if (state[id] && rowById.has(id)) count++
		return count
	}
	const pageSelection = () => {
		const rows = pageConfig.enabled ? table.getRowModel().rows : table.getPrePaginatedRowModel().rows
		let selected = 0
		for (const row of rows) if (row.getIsSelected()) selected++
		const all = rows.length > 0 && selected === rows.length
		return { all, some: selected > 0 && !all }
	}

	const invalidate = (version: number) => {
		requestedVersion = Math.max(requestedVersion, version)
		if (queued || host.signal.aborted) return
		queued = true
		queueMicrotask(() => {
			queued = false
			if (host.signal.aborted || renderedVersion >= requestedVersion) return
			try { host.next() } catch (error) { if (!host.signal.aborted) host.throw(error) }
		})
	}

	const selectionUpdater = (updater: RowSelectionState | ((state: RowSelectionState) => RowSelectionState)) => {
		const selection = args.selection
		if (!selection) return
		if (selection.value !== undefined) {
			const current = selectionState(selection.value)
			const next = typeof updater === 'function' ? updater(current) : updater
			selection.onValueChange(selectedKeys(next), actionEvent)
			return
		}
		defaultSelectionUpdater(updater)
		selection.onValueChange?.(selectedKeys(), actionEvent)
	}

	reactive.add(table.store.subscribe(() => {
		const version = ++stateVersion
		if (!syncing) invalidate(version)
	}))

	const withAction = (event: Event | undefined, action: () => void) => {
		if (host.signal.aborted) return
		const previous = actionEvent
		actionEvent = event
		try { action() } finally { actionEvent = previous }
	}

	const firstPage = () => { if (!host.signal.aborted && pageConfig.enabled) table.firstPage() }
	const resetPage = () => { if (pageConfig.enabled) table.setPageIndex(0) }

	const reconcileColumns = (changed: boolean) => {
		if (!changed) return
		const visibility = table.atoms.columnVisibility.get()
		const nextVisibility: Record<string, boolean> = {}
		for (const model of models) {
			const previous = knownColumns.get(model.id)
			nextVisibility[model.id] = model.column.hideable === false
				? true
				: previous ? visibility[model.id] !== false : !model.column.defaultHidden
		}
		if (!Object.values(nextVisibility).some(Boolean)) nextVisibility[models[0]!.id] = true
		table.baseAtoms.columnVisibility.set(nextVisibility)

		let reset = false
		const sorting = table.atoms.sorting.get()
		if (sorting.some(sort => {
			const model = modelById.get(sort.id)
			return !model?.read || model.column.sort === false
		})) {
			table.baseAtoms.sorting.set([])
			reset = true
		}
		const currentFilters = table.atoms.columnFilters.get()
		const filters = currentFilters.flatMap(filter => {
			const facet = modelById.get(filter.id)?.column.facet
			if (!facet) return []
			const allowed = new Set(facet.options.map(option => option.value))
			const values = (filter.value as readonly string[]).filter(value => allowed.has(value))
			return values.length ? [{ id: filter.id, value: values }] : []
		})
		const filtersChanged = filters.length !== currentFilters.length || filters.some((filter, index) => {
			const current = currentFilters[index]
			const values = filter.value as readonly string[]
			const currentValues = current?.value as readonly string[] | undefined
			return !current || current.id !== filter.id || values.length !== currentValues?.length
				|| values.some((value, valueIndex) => value !== currentValues[valueIndex])
		})
		if (filtersChanged) {
			table.baseAtoms.columnFilters.set(filters)
			reset = true
		}
		knownColumns = new Map(modelById)
		if (reset) resetPage()
	}

	const sync = (nextArgs: DataTableArgs<T, Key>): DataTableView<T, Key> => {
		args = nextArgs
		assertText(args.label, 'label')
		const rowsChanged = snapshotRows(args)
		const columnsChanged = snapshotColumns(args)
		// Rows cache accessor results by column ID. Rebuild them when a schema is
		// replaced over the same collection; stable renders keep the same data ref.
		if (columnsChanged && !rowsChanged) tableData = [...args.rows]
		const nextPage = paginationConfig(args.pagination)
		const nextSelection = Boolean(args.selection)
		const nextSelectionState = selectionInput(args.selection)
		const nextSelectionControlled = args.selection?.value !== undefined
		const nextSearch = Boolean(args.search)
		const optionsChanged = !optionsInitialized
			|| rowsChanged
			|| columnsChanged
			|| selectionEnabled !== nextSelection
			|| searchEnabled !== nextSearch
			|| selectionControlled !== nextSelectionControlled
			|| (nextSelectionControlled && !sameSelection(table.atoms.rowSelection.get(), nextSelectionState))

		syncing = true
		try {
			if (selectionEnabled !== nextSelection) {
				table.baseAtoms.rowSelection.set(nextSelection
					? nextSelectionState
					: {})
			}
			if (searchEnabled !== nextSearch) {
				searchValue = ''
				table.baseAtoms.globalFilter.set('')
			}
			if (pageConfig.enabled !== nextPage.enabled) {
				table.baseAtoms.pagination.set({ pageIndex: 0, pageSize: nextPage.size })
			} else if (!nextPage.sizes.includes(table.atoms.pagination.get().pageSize)) {
				table.baseAtoms.pagination.set({ pageIndex: 0, pageSize: nextPage.size })
			}

			selectionEnabled = nextSelection
			selectionControlled = nextSelectionControlled
			searchEnabled = nextSearch
			pageConfig = nextPage

			if (optionsChanged) {
				table.setOptions(previous => ({
					...previous,
					columns: definitions,
					data: tableData,
					enableGlobalFilter: searchEnabled,
					enableRowSelection: selectionEnabled,
					onRowSelectionChange: selectionUpdater,
					state: selectionControlled ? { rowSelection: nextSelectionState } : undefined,
				}))
				optionsInitialized = true
			}

			reconcileColumns(columnsChanged)
			if (rowsChanged && args.selection?.value === undefined) {
				const current = table.atoms.rowSelection.get()
				const pruned: RowSelectionState = Object.create(null)
				for (const id of Object.keys(current)) if (rowById.has(id)) pruned[id] = true
				if (Object.keys(pruned).length !== Object.keys(current).length) table.baseAtoms.rowSelection.set(pruned)
			}

			if (pageConfig.enabled) {
				const pageCount = Math.max(1, table.getPageCount())
				const current = table.atoms.pagination.get()
				if (current.pageIndex >= pageCount) table.baseAtoms.pagination.set({ ...current, pageIndex: pageCount - 1 })
			}
		} finally {
			syncing = false
		}

		const pagination = table.atoms.pagination.get()
		const pageCount = pageConfig.enabled ? Math.max(1, table.getPageCount()) : 1
		const sourceRows = pageConfig.enabled ? table.getRowModel().rows : table.getPrePaginatedRowModel().rows
		const allColumns = models.map(model => ({
			...model,
			active: (table.getColumn(model.id)!.getFilterValue() as readonly string[] | undefined) ?? [],
			sorted: table.getColumn(model.id)!.getIsSorted(),
			visible: table.getColumn(model.id)!.getIsVisible(),
		}))
		const visibleRows = sourceRows.map(row => ({
			cells: row.getVisibleCells().map(cell => ({ column: modelById.get(cell.column.id)!, value: cell.getValue() })),
			id: row.id,
			key: rowKeys[row.index]!,
			original: row.original,
			selected: row.getIsSelected(),
			sourceIndex: row.index,
		}))
		const selected = countSelected()
		const pageSelected = pageSelection()
		const filters = table.atoms.columnFilters.get()
		const query = searchEnabled ? String(table.atoms.globalFilter.get() ?? '') : ''

		renderedVersion = stateVersion
		return {
			columns: allColumns,
			filteredCount: table.getFilteredRowModel().rows.length,
			hasFilters: Boolean(query || filters.length),
			page: {
				count: pageCount,
				enabled: pageConfig.enabled,
				index: pageConfig.enabled ? pagination.pageIndex : 0,
				size: pagination.pageSize,
				sizes: pageConfig.sizes,
			},
			query,
			rows: visibleRows,
			selectedCount: selected,
			selection: {
				enabled: selectionEnabled,
				...pageSelected,
			},
			sourceCount: args.rows.length,
			visibility: models.length > 1 && models.some(model => model.column.hideable !== false),
		}
	}

	return {
		cell(cell, row) {
			if (cell.column.column.cell) return cell.column.column.cell(row.original, {
				columnId: cell.column.id,
				sourceIndex: row.sourceIndex,
				value: cell.value,
			})
			if (cell.value == null) return ''
			if (['bigint', 'boolean', 'number', 'string'].includes(typeof cell.value)) return String(cell.value)
			throw new TypeError(`DataTable cannot render ${cell.column.id} at ${row.sourceIndex}`)
		},
		firstPage,
		lastPage: () => { if (!host.signal.aborted && pageConfig.enabled) table.lastPage() },
		nextPage: () => { if (!host.signal.aborted && pageConfig.enabled) table.nextPage() },
		previousPage: () => { if (!host.signal.aborted && pageConfig.enabled) table.previousPage() },
		reset(event) {
			withAction(event, () => {
				searchValue = ''
				table.setGlobalFilter('')
				table.setColumnFilters([])
				resetPage()
			})
		},
		selected: id => table.atoms.rowSelection.get()[id] === true,
		selection: pageSelection,
		setFacet(id, value, checked, event) {
			const facet = modelById.get(id)?.column.facet
			if (!facet?.options.some(option => option.value === value)) return
			withAction(event, () => {
				const column = table.getColumn(id)
				const active = new Set(column?.getFilterValue() as readonly string[] | undefined)
				if (active.has(value) === checked) return
				if (checked) active.add(value)
				else active.delete(value)
				column?.setFilterValue(active.size ? [...active] : undefined)
				resetPage()
			})
		},
		setPageSize(size) {
			if (host.signal.aborted || !pageConfig.enabled || !pageConfig.sizes.includes(size)) return
			table.setPagination({ pageIndex: 0, pageSize: size })
		},
		setQuery(query, event) {
			if (!searchEnabled) return
			withAction(event, () => {
				const value = query.trim()
				searchValue = value.toLowerCase()
				table.setGlobalFilter(value)
				resetPage()
			})
		},
		sort(id, event) {
			const model = modelById.get(id)
			if (!model?.read || model.column.sort === false) return
			withAction(event, () => {
				const current = table.atoms.sorting.get()[0]
				const next: SortingState = current?.id !== id
					? [{ id, desc: false }]
					: !current.desc ? [{ id, desc: true }] : []
				table.setSorting(next)
				resetPage()
			})
		},
		sync,
		toggleColumn(id, visible) {
			if (host.signal.aborted) return
			const column = table.getColumn(id)
			if (!column?.getCanHide()) return
			if (!visible && table.getVisibleLeafColumns().length <= 1) return
			column.toggleVisibility(visible)
		},
		togglePage(checked, event) {
			if (!selectionEnabled) return
			withAction(event, () => {
				const state = { ...table.atoms.rowSelection.get() }
				const rows = pageConfig.enabled ? table.getRowModel().rows : table.getPrePaginatedRowModel().rows
				for (const row of rows) {
					if (checked) state[row.id] = true
					else delete state[row.id]
				}
				table.setRowSelection(state)
			})
		},
		toggleRow(id, checked, event) {
			if (!selectionEnabled || !rowById.has(id)) return
			withAction(event, () => {
				const state = { ...table.atoms.rowSelection.get() }
				if (checked) state[id] = true
				else delete state[id]
				table.setRowSelection(state)
			})
		},
	}
}
