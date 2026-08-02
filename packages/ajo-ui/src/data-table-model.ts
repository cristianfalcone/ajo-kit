import type { Host } from 'ajo-cloves'
import type {
	DataTableArgs,
	DataTableColumn,
	DataTableData,
	DataTableKey,
	DataTablePagination,
} from './data-table-contract'

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

const isDigit = (code: number) => code >= 48 && code <= 57

const chunkEnd = (value: string, start: number, numeric: boolean) => {
	let end = start + 1
	while (end < value.length && isDigit(value.charCodeAt(end)) === numeric) end++
	return end
}

const compareTextChunk = (
	left: string,
	leftStart: number,
	leftEnd: number,
	right: string,
	rightStart: number,
	rightEnd: number,
) => {
	const length = Math.min(leftEnd - leftStart, rightEnd - rightStart)
	for (let index = 0; index < length; index++) {
		const leftCode = left.charCodeAt(leftStart + index)
		const rightCode = right.charCodeAt(rightStart + index)
		if (leftCode !== rightCode) return leftCode < rightCode ? -1 : 1
	}
	return leftEnd - leftStart - (rightEnd - rightStart)
}

const significantStart = (value: string, start: number, end: number) => {
	while (start < end && value.charCodeAt(start) === 48) start++
	return start
}

const parseDigits = (value: string, start: number, end: number) => {
	let result = 0
	for (let index = start; index < end; index++) result = result * 10 + value.charCodeAt(index) - 48
	return result
}

const compareNumberChunk = (
	left: string,
	leftStart: number,
	leftEnd: number,
	right: string,
	rightStart: number,
	rightEnd: number,
) => {
	const leftSignificant = significantStart(left, leftStart, leftEnd)
	const rightSignificant = significantStart(right, rightStart, rightEnd)
	const leftLength = leftEnd - leftSignificant
	const rightLength = rightEnd - rightSignificant
	if (leftLength !== rightLength) return leftLength < rightLength ? -1 : 1
	if (!leftLength && !rightLength) return 0
	if (leftLength <= 15 && rightLength <= 15) {
		const leftNumber = parseDigits(left, leftSignificant, leftEnd)
		const rightNumber = parseDigits(right, rightSignificant, rightEnd)
		return leftNumber === rightNumber ? 0 : leftNumber < rightNumber ? -1 : 1
	}
	return compareTextChunk(left, leftSignificant, leftEnd, right, rightSignificant, rightEnd)
}

const remainingChunks = (value: string, start: number) => {
	let count = 0
	while (start < value.length) {
		count++
		start = chunkEnd(value, start, isDigit(value.charCodeAt(start)))
	}
	return count
}

const compareAlphanumeric = (leftValue: string, rightValue: string) => {
	const left = leftValue.toLowerCase()
	const right = rightValue.toLowerCase()
	let leftIndex = 0
	let rightIndex = 0
	while (leftIndex < left.length && rightIndex < right.length) {
		const leftNumeric = isDigit(left.charCodeAt(leftIndex))
		const rightNumeric = isDigit(right.charCodeAt(rightIndex))
		const leftEnd = chunkEnd(left, leftIndex, leftNumeric)
		const rightEnd = chunkEnd(right, rightIndex, rightNumeric)
		if (leftNumeric !== rightNumeric) return leftNumeric ? 1 : -1
		const result = leftNumeric
			? compareNumberChunk(left, leftIndex, leftEnd, right, rightIndex, rightEnd)
			: compareTextChunk(left, leftIndex, leftEnd, right, rightIndex, rightEnd)
		if (result) return result
		leftIndex = leftEnd
		rightIndex = rightEnd
	}
	return remainingChunks(left, leftIndex) - remainingChunks(right, rightIndex)
}

const compareValues = (left: unknown, right: unknown, column: string, leftIndex: number, rightIndex: number) => {
	const leftMissing = left == null
	const rightMissing = right == null
	if (leftMissing || rightMissing) return leftMissing === rightMissing ? 0 : leftMissing ? 1 : -1
	if (typeof left !== typeof right) throw new TypeError(`DataTable mixed sort values ${column}`)
	if (typeof left === 'string' && typeof right === 'string') return compareAlphanumeric(left, right)
	if (typeof left === 'number' && typeof right === 'number') {
		if (!Number.isFinite(left) || !Number.isFinite(right)) {
			throw new TypeError(`DataTable invalid sort value ${column} at ${!Number.isFinite(left) ? leftIndex : rightIndex}`)
		}
		return left === right ? 0 : left < right ? -1 : 1
	}
	if (typeof left === 'boolean' && typeof right === 'boolean') return left === right ? 0 : left ? 1 : -1
	throw new TypeError(`DataTable invalid sort value ${column}`)
}

export const createDataTableModel = <T extends DataTableData, Key extends DataTableKey>(
	host: Host,
	initialArgs: DataTableArgs<T, Key>,
): DataTableModel<T, Key> => {
	let args = initialArgs
	let disposed = false
	let stateVersion = 0
	let renderedVersion = 0
	let requestedVersion = 0
	let queued = false

	let rowsRef: readonly T[] | undefined
	let rowsLength = 0
	let keyGetter: DataTableArgs<T, Key>['getRowKey'] | undefined
	let rowIds: string[] = []
	let rowKeys: Key[] = []
	let rowById = new Map<string, number>()
	let sourceIndexes: number[] = []

	let columnsRef: readonly DataTableColumn<T>[] | undefined
	let columnsLength = 0
	let models: ColumnModel<T>[] = []
	let modelById = new Map<string, ColumnModel<T>>()
	let visibility = new Map<string, boolean>()

	let searchEnabled = Boolean(initialArgs.search)
	let query = ''
	let searchValue = ''
	let facets = new Map<string, string[]>()
	let sorting: { desc: boolean; id: string } | undefined
	let filteredIndexes: number[] = []
	let sortedIndexes: number[] = []
	let filterDirty = true
	let sortDirty = true

	let pageConfig = paginationConfig(initialArgs.pagination)
	let pageIndex = 0
	let pageSize = pageConfig.size

	let selectionEnabled = Boolean(initialArgs.selection)
	let selectionControlled = initialArgs.selection?.value !== undefined
	let uncontrolledSelection = new Set<string>()
	let effectiveSelection = new Set<string>()

	const invalidate = () => {
		const version = ++stateVersion
		requestedVersion = Math.max(requestedVersion, version)
		if (queued || disposed || host.signal.aborted) return
		queued = true
		queueMicrotask(() => {
			queued = false
			if (disposed || host.signal.aborted || renderedVersion >= requestedVersion) return
			try { host.next() } catch (error) { if (!host.signal.aborted) host.throw(error) }
		})
	}

	const clearValues = () => {
		for (const model of models) model.values = undefined
	}

	const markFilterDirty = () => {
		filterDirty = true
		sortDirty = true
	}

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
		rowsRef = current.rows
		rowsLength = current.rows.length
		keyGetter = current.getRowKey
		rowIds = []
		rowKeys = []
		rowById = new Map()
		sourceIndexes = Array.from({ length: rowsLength }, (_, index) => index)
		current.rows.forEach((row, index) => {
			const key = current.getRowKey(row, index)
			const id = encodeKey(key, index)
			const previous = rowById.get(id)
			if (previous !== undefined) throw new TypeError(`DataTable duplicate row key ${JSON.stringify(key)} ${previous}/${index}`)
			rowById.set(id, index)
			rowIds.push(id)
			rowKeys.push(key)
		})
		clearValues()
		markFilterDirty()
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
					if (typeof option.value !== 'string') {
						throw new TypeError(`DataTable invalid facet option value ${id}`)
					}
					if (options.has(option.value)) throw new TypeError(`DataTable duplicate facet option ${id}/${option.value}`)
					options.add(option.value)
				}
			}
			const model = { column, id, read }
			models.push(model)
			modelById.set(id, model)
		}
		markFilterDirty()
		return true
	}

	const selectionState = (keys: readonly Key[] | undefined) => {
		const state = new Set<string>()
		const seen = new Set<string>()
		for (const key of keys ?? []) {
			const id = encodeKey(key)
			if (seen.has(id)) throw new TypeError(`DataTable duplicate selection key ${JSON.stringify(key)}`)
			seen.add(id)
			if (rowById.has(id)) state.add(id)
		}
		return state
	}

	const selectionInput = (selection: DataTableArgs<T, Key>['selection']) => {
		const fallback = selectionState(selection?.defaultValue)
		return selection?.value === undefined ? fallback : selectionState(selection.value)
	}

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
		const facet = model.column.facet
		const raw = facet?.values?.(args.rows[index]!, index)
		if (raw !== undefined) {
			return (Array.isArray(raw) ? raw : [raw]).map(value => assertText(value, `facet value ${model.id}`))
		}
		return [scalarText(readValue(model, index), model.id, index)]
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
					if (scalarText(raw, model.id, index).toLowerCase().includes(searchValue)) {
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
					: compareValues(readValue(model, left), readValue(model, right), model.id, left, right)
				if (!Number.isFinite(result)) throw new TypeError(`DataTable invalid comparator ${model.id}`)
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

	const reconcileColumns = (changed: boolean) => {
		if (!changed) return
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

	snapshotRows(initialArgs)
	snapshotColumns(initialArgs)
	assertText(initialArgs.label, 'label')
	visibility = new Map(models.map(model => [
		model.id,
		model.column.hideable === false || !model.column.defaultHidden,
	]))
	if (![...visibility.values()].some(Boolean)) throw new TypeError('DataTable needs a visible column')
	uncontrolledSelection = selectionInput(initialArgs.selection)
	effectiveSelection = uncontrolledSelection
	host.signal.addEventListener('abort', () => { disposed = true }, { once: true })

	const sync = (nextArgs: DataTableArgs<T, Key>): DataTableView<T, Key> => {
		args = nextArgs
		assertText(args.label, 'label')
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

		if (pageConfig.enabled !== nextPage.enabled) {
			pageIndex = 0
			pageSize = nextPage.size
		} else if (!nextPage.sizes.includes(pageSize)) {
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

		reconcileColumns(columnsChanged)
		if (rowsChanged || columnsChanged) markFilterDirty()

		const indexes = visibleIndexes()
		const count = pageCount()
		if (pageConfig.enabled && pageIndex >= count) pageIndex = count - 1
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
				count,
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
		if (disposed || !pageConfig.enabled) return
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
			if (disposed) return
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
			if (disposed) return
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
			if (disposed || !pageConfig.enabled || !pageConfig.sizes.includes(size)) return
			if (pageSize === size && pageIndex === 0) return
			pageSize = size
			pageIndex = 0
			invalidate()
		},
		setQuery(value) {
			if (disposed || !searchEnabled) return
			const next = value.trim()
			if (query === next) return
			query = next
			searchValue = next.toLowerCase()
			pageIndex = 0
			markFilterDirty()
			invalidate()
		},
		sort(id) {
			if (disposed) return
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
			if (disposed) return
			const model = modelById.get(id)
			if (!model || model.column.hideable === false || visibility.get(id) === visible) return
			if (!visible && [...visibility.values()].filter(Boolean).length <= 1) return
			visibility = new Map(visibility).set(id, visible)
			invalidate()
		},
		togglePage(checked, event) {
			if (disposed || !selectionEnabled) return
			const next = new Set(effectiveSelection)
			for (const index of visibleIndexes()) {
				if (checked) next.add(rowIds[index]!)
				else next.delete(rowIds[index]!)
			}
			proposeSelection(next, event)
		},
		toggleRow(id, checked, event) {
			if (disposed || !selectionEnabled || !rowById.has(id) || effectiveSelection.has(id) === checked) return
			const next = new Set(effectiveSelection)
			if (checked) next.add(id)
			else next.delete(id)
			proposeSelection(next, event)
		},
	}
}
