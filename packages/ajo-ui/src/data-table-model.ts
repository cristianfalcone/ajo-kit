import type { Host } from 'ajo'
import type {
	DataTableArgs,
	DataTableColumn,
	DataTableData,
	DataTableKey,
} from './data-table'

const DEFAULT_SIZES = [10, 25, 50] as const
const UNDEFINED_VALUE = Symbol('DataTable undefined value')

type ColumnModel<T extends DataTableData> = {
	column: DataTableColumn<T>
	id: string
	read?: (row: T, sourceIndex: number) => unknown
	values?: unknown[]
}

type ColumnRef<T extends DataTableData> = Pick<ColumnModel<T>, 'column' | 'id'>

export type DataTableColumnView<T extends DataTableData> = ColumnRef<T> & {
	active: readonly string[]
	sorted: false | 'asc' | 'desc'
	visible: boolean
}

export type DataTableCellView<T extends DataTableData> = {
	column: ColumnRef<T>
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
	firstPage(): void
	lastPage(): void
	nextPage(): void
	previousPage(): void
	reset(): void
	selected(rowId: string): boolean
	selection(): { all: boolean; some: boolean }
	setFacet(columnId: string, value: string, checked: boolean): void
	setPageSize(size: number): void
	setQuery(query: string): void
	sort(columnId: string): void
	sync(args: DataTableArgs<T, Key>): DataTableView<T, Key>
	toggleColumn(columnId: string, visible: boolean): void
	togglePage(checked: boolean, event?: Event): void
	toggleRow(rowId: string, checked: boolean, event?: Event): void
}

const encodeKey = (key: DataTableKey) => typeof key === 'string' ? `s:${key}` : `n:${Object.is(key, -0) ? 0 : key}`

const scalarText = (value: unknown) => value == null ? '' : String(value)

const paginationConfig = (pagination: DataTableArgs['pagination']) => {
	const { defaultSize, sizes = DEFAULT_SIZES } = pagination || {}
	return { enabled: pagination !== false, size: defaultSize ?? sizes[0]!, sizes }
}

let collator: Intl.Collator | undefined

// Missing values sort last and mixed types group by type name. The natural
// collator is built on the first string comparison: the engine's Intl has no
// Collator, and sorting only runs on the client.
const compareValues = (left: unknown, right: unknown) => {
	if (left == null || right == null) return (left == null) === (right == null) ? 0 : left == null ? 1 : -1
	if (typeof left !== typeof right) return typeof left < typeof right ? -1 : 1
	if (typeof left === 'string') {
		return (collator ??= new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })).compare(left, right as string)
	}
	return left === right ? 0 : (left as number) < (right as number) ? -1 : 1
}

export const createDataTableModel = <T extends DataTableData, Key extends DataTableKey>(
	host: Host,
): DataTableModel<T, Key> => {
	let args!: DataTableArgs<T, Key>
	let stateVersion = 0
	let renderedVersion = 0
	let queued = false

	let rowsRef: readonly T[] | undefined
	let keyGetter: DataTableArgs<T, Key>['getRowKey'] | undefined
	let rowIds: string[] = []
	let rowKeys: Key[] = []
	let rowById = new Map<string, number>()
	let sourceIndexes: number[] = []

	let columnsRef: readonly DataTableColumn<T>[] | undefined
	let models: ColumnModel<T>[] = []
	let modelById = new Map<string, ColumnModel<T>>()
	let visibility = new Map<string, boolean>()

	// Features start disabled; the first sync() enables them through the same transitions later args use.
	let searchEnabled = false
	let query = ''
	let searchValue = ''
	let facets = new Map<string, string[]>()
	let sorting: { desc: boolean; id: string } | undefined
	let filteredIndexes: number[] = []
	let sortedIndexes: number[] = []
	let filterDirty = true
	let sortDirty = true

	let pageConfig = paginationConfig(false)
	let pageIndex = 0
	let pageSize = 0

	let selectionEnabled = false
	let selectionControlled = false
	let uncontrolledSelection = new Set<string>()
	let effectiveSelection = new Set<string>()

	const invalidate = () => {
		stateVersion++
		if (queued || host.signal.aborted) return
		queued = true
		queueMicrotask(() => {
			queued = false
			if (host.signal.aborted || renderedVersion >= stateVersion) return
			try { host.next() } catch (error) { if (!host.signal.aborted) host.throw(error) }
		})
	}

	const markFilterDirty = () => {
		filterDirty = true
		sortDirty = true
	}

	const snapshotRows = (current: DataTableArgs<T, Key>) => {
		if (current.rows === rowsRef && current.getRowKey === keyGetter) return false
		rowsRef = current.rows
		keyGetter = current.getRowKey
		rowIds = []
		rowKeys = []
		rowById = new Map()
		sourceIndexes = Array.from({ length: current.rows.length }, (_, index) => index)
		current.rows.forEach((row, index) => {
			const key = current.getRowKey(row, index)
			const id = encodeKey(key)
			const previous = rowById.get(id)
			if (previous !== undefined) throw new TypeError(`DataTable duplicate row key ${JSON.stringify(key)} ${previous}/${index}`)
			rowById.set(id, index)
			rowIds.push(id)
			rowKeys.push(key)
		})
		for (const model of models) model.values = undefined
		markFilterDirty()
		return true
	}

	const snapshotColumns = (current: DataTableArgs<T, Key>) => {
		if (current.columns === columnsRef) return false
		columnsRef = current.columns
		models = []
		modelById = new Map()
		for (const column of current.columns) {
			// Ids key the header and cell vnodes, so they must stay unique.
			const id = column.id ?? column.value as string
			if (modelById.has(id)) throw new TypeError(`DataTable duplicate column ${JSON.stringify(id)}`)
			const read = column.value === undefined
				? undefined
				: typeof column.value === 'function'
					? column.value
					: (row: T) => row[column.value as keyof T]
			const model = { column, id, read }
			models.push(model)
			modelById.set(id, model)
		}
		markFilterDirty()
		return true
	}

	const selectionState = (keys: readonly Key[] | undefined) => {
		const state = new Set<string>()
		for (const key of keys ?? []) {
			const id = encodeKey(key)
			if (rowById.has(id)) state.add(id)
		}
		return state
	}

	const selectionInput = (selection: DataTableArgs<T, Key>['selection']) =>
		selectionState(selection?.value ?? selection?.defaultValue)

	const readValue = (model: ColumnModel<T>, index: number) => {
		if (!model.read) return undefined
		const values = model.values ??= []
		const cached = values[index]
		if (cached !== undefined) return cached === UNDEFINED_VALUE ? undefined : cached
		const value = model.read(args.rows[index]!, index)
		values[index] = value === undefined ? UNDEFINED_VALUE : value
		return value
	}

	const facetValues = (model: ColumnModel<T>, index: number) => {
		const raw = model.column.facet?.values?.(args.rows[index]!, index)
		if (raw !== undefined) return typeof raw === 'string' ? [raw] : raw
		return [scalarText(readValue(model, index))]
	}

	const filtered = () => {
		if (!filterDirty) return filteredIndexes
		const activeFacets = [...facets].flatMap(([id, active]) => {
			const model = modelById.get(id)
			return model?.column.facet && active.length ? [{ active, model }] : []
		})
		const searchable = searchEnabled && searchValue
			? models.filter(model => model.read && model.column.search !== false)
			: []
		if (!activeFacets.length && !searchable.length) {
			filteredIndexes = sourceIndexes
			filterDirty = false
			return filteredIndexes
		}
		filteredIndexes = sourceIndexes.filter(index => {
			if (searchable.length) {
				let matches = false
				for (const model of searchable) {
					const raw = typeof model.column.search === 'function'
						? model.column.search(args.rows[index]!, index)
						: readValue(model, index)
					if (scalarText(raw).toLowerCase().includes(searchValue)) {
						matches = true
						break
					}
				}
				if (!matches) return false
			}
			for (const { active, model } of activeFacets) {
				if (!facetValues(model, index).some(value => active.includes(value))) return false
			}
			return true
		})
		filterDirty = false
		return filteredIndexes
	}

	const sorted = () => {
		if (!sortDirty) return sortedIndexes
		const indexes = filtered()
		if (!sorting) sortedIndexes = indexes
		else {
			const model = modelById.get(sorting.id)
			if (!model?.read || model.column.sort === false) sortedIndexes = indexes
			else sortedIndexes = [...indexes].sort((left, right) => {
				const result = typeof model.column.sort === 'function'
					? model.column.sort(args.rows[left]!, args.rows[right]!)
					: compareValues(readValue(model, left), readValue(model, right))
				return result ? (sorting!.desc ? -result : result) : left - right
			})
		}
		sortDirty = false
		return sortedIndexes
	}

	const pageCount = () => pageConfig.enabled ? Math.max(1, Math.ceil(sorted().length / pageSize)) : 1

	const visibleIndexes = () => {
		const indexes = sorted()
		if (!pageConfig.enabled) return indexes
		const count = pageCount()
		if (pageIndex >= count) pageIndex = count - 1
		return indexes.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
	}

	const pageSelection = (indexes = visibleIndexes()) => {
		let selected = 0
		for (const index of indexes) if (effectiveSelection.has(rowIds[index]!)) selected++
		const all = indexes.length > 0 && selected === indexes.length
		return { all, some: selected > 0 && !all }
	}

	const selectedKeys = (selection: ReadonlySet<string>) => {
		const keys: Key[] = []
		for (let index = 0; index < rowIds.length; index++) {
			if (selection.has(rowIds[index]!)) keys.push(rowKeys[index]!)
		}
		return keys
	}

	const proposeSelection = (next: Set<string>, event?: Event) => {
		const selection = args.selection
		if (!selection) return
		if (selection.value !== undefined) {
			selection.onValueChange(selectedKeys(next), event)
			return
		}
		uncontrolledSelection = next
		effectiveSelection = uncontrolledSelection
		invalidate()
		selection.onValueChange?.(selectedKeys(next), event)
	}

	const reconcileColumns = () => {
		const nextVisibility = new Map<string, boolean>()
		for (const model of models) {
			const previous = visibility.has(model.id)
			nextVisibility.set(model.id, model.column.hideable === false
				? true
				: previous ? visibility.get(model.id) !== false : !model.column.defaultHidden)
		}
		if (![...nextVisibility.values()].some(Boolean)) {
			if (models.every(model => model.column.defaultHidden)) {
				throw new TypeError('DataTable needs a visible column')
			}
			nextVisibility.set(models[0]!.id, true)
		}
		visibility = nextVisibility

		let resetPage = false
		if (sorting) {
			const model = modelById.get(sorting.id)
			if (!model?.read || model.column.sort === false) {
				sorting = undefined
				sortDirty = true
				resetPage = true
			}
		}

		const nextFacets = new Map<string, string[]>()
		for (const [id, active] of facets) {
			const facet = modelById.get(id)?.column.facet
			if (!facet) {
				resetPage = true
				continue
			}
			const allowed = new Set(facet.options.map(option => option.value))
			const values = active.filter(value => allowed.has(value))
			if (values.length) nextFacets.set(id, values)
			if (values.length !== active.length) resetPage = true
		}
		facets = nextFacets
		if (resetPage) pageIndex = 0
	}

	const sync = (nextArgs: DataTableArgs<T, Key>): DataTableView<T, Key> => {
		args = nextArgs
		const rowsChanged = snapshotRows(args)
		const columnsChanged = snapshotColumns(args)
		const nextPage = paginationConfig(args.pagination)
		const nextSelectionEnabled = Boolean(args.selection)
		const nextSelectionControlled = args.selection?.value !== undefined
		const nextSelectionState = selectionInput(args.selection)
		const nextSearchEnabled = Boolean(args.search)

		if (searchEnabled !== nextSearchEnabled) {
			searchEnabled = nextSearchEnabled
			query = ''
			searchValue = ''
			pageIndex = 0
			markFilterDirty()
		}

		if (pageConfig.enabled !== nextPage.enabled || !nextPage.sizes.includes(pageSize)) {
			pageIndex = 0
			pageSize = nextPage.size
		}
		pageConfig = nextPage

		if (selectionEnabled !== nextSelectionEnabled) {
			selectionEnabled = nextSelectionEnabled
			uncontrolledSelection = nextSelectionEnabled ? nextSelectionState : new Set()
		} else if (selectionControlled && !nextSelectionControlled) {
			uncontrolledSelection = nextSelectionState
		}
		selectionControlled = nextSelectionControlled
		if (rowsChanged && !selectionControlled) {
			uncontrolledSelection = new Set([...uncontrolledSelection].filter(id => rowById.has(id)))
		}
		effectiveSelection = selectionControlled ? nextSelectionState : uncontrolledSelection

		if (columnsChanged) reconcileColumns()

		const indexes = visibleIndexes()
		const visibleColumns = models.filter(model => visibility.get(model.id) !== false)
		const columnViews = models.map(model => ({
			active: facets.get(model.id) ?? [],
			column: model.column,
			id: model.id,
			sorted: sorting?.id === model.id ? sorting.desc ? 'desc' as const : 'asc' as const : false as const,
			visible: visibility.get(model.id) !== false,
		}))
		const rowViews = indexes.map(index => ({
			cells: visibleColumns.map(column => ({ column, value: readValue(column, index) })),
			id: rowIds[index]!,
			key: rowKeys[index]!,
			original: args.rows[index]!,
			selected: effectiveSelection.has(rowIds[index]!),
			sourceIndex: index,
		}))
		const selected = pageSelection(indexes)
		renderedVersion = stateVersion
		return {
			columns: columnViews,
			filteredCount: filtered().length,
			hasFilters: Boolean(query || facets.size),
			page: {
				count: pageCount(),
				enabled: pageConfig.enabled,
				index: pageConfig.enabled ? pageIndex : 0,
				size: pageSize,
				sizes: pageConfig.sizes,
			},
			query: searchEnabled ? query : '',
			rows: rowViews,
			selectedCount: effectiveSelection.size,
			selection: { enabled: selectionEnabled, ...selected },
			sourceCount: args.rows.length,
			visibility: models.length > 1 && models.some(model => model.column.hideable !== false),
		}
	}

	const setPage = (next: number) => {
		if (host.signal.aborted || !pageConfig.enabled) return
		const clamped = Math.max(0, Math.min(next, pageCount() - 1))
		if (clamped === pageIndex) return
		pageIndex = clamped
		invalidate()
	}

	return {
		firstPage: () => setPage(0),
		lastPage: () => setPage(pageCount() - 1),
		nextPage: () => setPage(pageIndex + 1),
		previousPage: () => setPage(pageIndex - 1),
		reset() {
			if (host.signal.aborted) return
			const filtersChanged = Boolean(query || facets.size)
			const pageChanged = pageIndex !== 0
			query = ''
			searchValue = ''
			facets = new Map()
			pageIndex = 0
			if (filtersChanged) markFilterDirty()
			if (filtersChanged || pageChanged) invalidate()
		},
		selected: id => effectiveSelection.has(id),
		selection: pageSelection,
		setFacet(id, value, checked) {
			if (host.signal.aborted) return
			const facet = modelById.get(id)?.column.facet
			if (!facet?.options.some(option => option.value === value)) return
			const current = facets.get(id) ?? []
			if (current.includes(value) === checked) return
			const next = checked ? [...current, value] : current.filter(option => option !== value)
			facets = new Map(facets)
			if (next.length) facets.set(id, next)
			else facets.delete(id)
			pageIndex = 0
			markFilterDirty()
			invalidate()
		},
		setPageSize(size) {
			if (host.signal.aborted || !pageConfig.enabled || !pageConfig.sizes.includes(size)) return
			if (pageSize === size && pageIndex === 0) return
			pageSize = size
			pageIndex = 0
			invalidate()
		},
		setQuery(value) {
			if (host.signal.aborted || !searchEnabled) return
			const next = value.trim()
			if (query === next) return
			query = next
			searchValue = next.toLowerCase()
			pageIndex = 0
			markFilterDirty()
			invalidate()
		},
		sort(id) {
			if (host.signal.aborted) return
			const model = modelById.get(id)
			if (!model?.read || model.column.sort === false) return
			sorting = sorting?.id !== id
				? { desc: false, id }
				: !sorting.desc ? { desc: true, id } : undefined
			pageIndex = 0
			sortDirty = true
			invalidate()
		},
		sync,
		toggleColumn(id, visible) {
			if (host.signal.aborted) return
			const model = modelById.get(id)
			if (!model || model.column.hideable === false || visibility.get(id) === visible) return
			if (!visible && [...visibility.values()].filter(Boolean).length <= 1) return
			visibility = new Map(visibility).set(id, visible)
			invalidate()
		},
		togglePage(checked, event) {
			if (host.signal.aborted || !selectionEnabled) return
			const next = new Set(effectiveSelection)
			for (const index of visibleIndexes()) {
				if (checked) next.add(rowIds[index]!)
				else next.delete(rowIds[index]!)
			}
			proposeSelection(next, event)
		},
		toggleRow(id, checked, event) {
			if (host.signal.aborted || !selectionEnabled || !rowById.has(id) || effectiveSelection.has(id) === checked) return
			const next = new Set(effectiveSelection)
			if (checked) next.add(id)
			else next.delete(id)
			proposeSelection(next, event)
		},
	}
}
