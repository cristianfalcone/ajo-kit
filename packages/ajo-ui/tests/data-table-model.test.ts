import type { Host } from 'ajo-cloves'
import { expect, test, vi } from 'vitest'
import type { DataTableArgs, DataTableColumn } from '../src/data-table-contract'
import { createDataTableModel } from '../src/data-table-model'

type Row = {
	id: string
	name: string
	status: 'active' | 'paused'
}

const rows: readonly Row[] = [
	{ id: 'c', name: 'Cora', status: 'active' },
	{ id: 'a', name: 'Ada', status: 'paused' },
	{ id: 'b', name: 'Bea', status: 'active' },
]

const columns: readonly DataTableColumn<Row>[] = [
	{
		label: 'Name',
		value: 'name',
	},
	{
		facet: {
			label: 'Status',
			options: [
				{ label: 'Active', value: 'active' },
				{ label: 'Paused', value: 'paused' },
			],
		},
		label: 'Status',
		value: 'status',
	},
]

const host = () => {
	const controller = new AbortController()
	const next = vi.fn()
	const fail = vi.fn((error: unknown) => { throw error })
	return {
		controller,
		host: {
			next,
			signal: controller.signal,
			throw: fail,
		} as unknown as Host,
		next,
	}
}

const args = (overrides: Partial<DataTableArgs<Row, string>> = {}): DataTableArgs<Row, string> => ({
	columns,
	getRowKey: row => row.id,
	label: 'People',
	pagination: { defaultSize: 2, sizes: [2, 3] },
	rows,
	...overrides,
})

test('one pipeline owns search, facets, sorting, and pagination', () => {
	const fixture = host()
	const initial = args({ search: {} })
	const model = createDataTableModel(fixture.host, initial)

	let view = model.sync(initial)
	expect(view.rows.map(row => row.original.name)).toEqual(['Cora', 'Ada'])
	expect(view.page).toMatchObject({ count: 2, enabled: true, index: 0, size: 2 })

	model.sort('name')
	view = model.sync(initial)
	expect(view.rows.map(row => row.original.name)).toEqual(['Ada', 'Bea'])
	expect(view.columns[0]?.sorted).toBe('asc')

	model.setFacet('status', 'active', true)
	view = model.sync(initial)
	expect(view.rows.map(row => row.original.name)).toEqual(['Bea', 'Cora'])
	expect(view.filteredCount).toBe(2)
	expect(view.page.index).toBe(0)

	model.setFacet('status', 'active', false)
	view = model.sync(initial)
	expect(view.filteredCount).toBe(3)
	expect(view.hasFilters).toBe(false)
	model.setFacet('status', 'active', true)

	model.setQuery('cor')
	view = model.sync(initial)
	expect(view.rows.map(row => row.original.name)).toEqual(['Cora'])
	expect(view.filteredCount).toBe(1)

	model.reset()
	view = model.sync(initial)
	expect(view.filteredCount).toBe(3)
	expect(view.query).toBe('')

	fixture.controller.abort()
})

test('sorts numeric string chunks beyond safe integer precision', () => {
	type NaturalRow = { id: string; name: string }
	const fixture = host()
	const naturalRows: readonly NaturalRow[] = [
		{ id: 'high', name: 'item9007199254740993' },
		{ id: 'low', name: 'item9007199254740992' },
	]
	const initial: DataTableArgs<NaturalRow, string> = {
		columns: [{ label: 'Name', value: 'name' }],
		getRowKey: row => row.id,
		label: 'Natural order',
		pagination: false,
		rows: naturalRows,
	}
	const model = createDataTableModel(fixture.host, initial)

	model.sort('name')
	expect(model.sync(initial).rows.map(row => row.key)).toEqual(['low', 'high'])
	fixture.controller.abort()
})

test('reset returns to the first page without active filters', () => {
	const fixture = host()
	const initial = args()
	const model = createDataTableModel(fixture.host, initial)
	model.sync(initial)
	model.nextPage()
	expect(model.sync(initial).page.index).toBe(1)
	model.reset()
	expect(model.sync(initial).page.index).toBe(0)
	fixture.controller.abort()
})

test('normalizes blank search before evaluating searchable values', () => {
	type Complex = { id: string; metadata: { owner: string } }
	const fixture = host()
	const complexRows: readonly Complex[] = [{ id: 'one', metadata: { owner: 'Ada' } }]
	const complexColumns: readonly DataTableColumn<Complex>[] = [{ label: 'Metadata', value: 'metadata' }]
	const initial: DataTableArgs<Complex, string> = {
		columns: complexColumns,
		getRowKey: row => row.id,
		label: 'Complex',
		pagination: false,
		rows: complexRows,
		search: {},
	}
	const model = createDataTableModel(fixture.host, initial)

	model.setQuery('   ')
	const view = model.sync(initial)
	expect(view.query).toBe('')
	expect(view.hasFilters).toBe(false)
	expect(view.filteredCount).toBe(1)

	fixture.controller.abort()
})

test('non-hideable columns remain visible from the initial schema', () => {
	const fixture = host()
	const initial = args({
		columns: [
			columns[0]!,
			{ ...columns[1]!, defaultHidden: true, hideable: false },
		],
	})
	const model = createDataTableModel(fixture.host, initial)
	const view = model.sync(initial)
	expect(view.columns.map(column => [column.id, column.visible])).toEqual([
		['name', true],
		['status', true],
	])

	fixture.controller.abort()
})

test('selection is key-first, survives row reorder, and prunes deleted rows', () => {
	const fixture = host()
	const changes: string[][] = []
	const initial = args({
		selection: {
			getRowLabel: row => row.name,
			onValueChange: keys => changes.push([...keys]),
		},
	})
	const model = createDataTableModel(fixture.host, initial)
	let view = model.sync(initial)

	model.toggleRow(view.rows[1]!.id, true)
	view = model.sync(initial)
	expect(changes).toEqual([['a']])
	expect(view.selectedCount).toBe(1)

	const reordered = [rows[1]!, rows[2]!, rows[0]!]
	view = model.sync({ ...initial, rows: reordered })
	expect(view.rows.find(row => row.key === 'a')?.selected).toBe(true)

	view = model.sync({ ...initial, rows: reordered.slice(1) })
	expect(view.selectedCount).toBe(0)

	fixture.controller.abort()
})

test('rebuilds core rows when key or accessor semantics change in place', () => {
	const fixture = host()
	const changes: string[][] = []
	const initial = args({
		pagination: false,
		selection: {
			getRowLabel: row => row.name,
			onValueChange: keys => changes.push([...keys]),
		},
	})
	const model = createDataTableModel(fixture.host, initial)

	let view = model.sync(initial)
	expect(view.rows[0]).toMatchObject({ id: 's:c', key: 'c' })
	expect(view.rows[0]!.cells[0]!.value).toBe('Cora')

	const rekeyed = { ...initial, getRowKey: (row: Row) => row.name }
	view = model.sync(rekeyed)
	expect(view.rows[0]).toMatchObject({ id: 's:Cora', key: 'Cora' })
	model.toggleRow(view.rows[0]!.id, true)
	expect(changes).toEqual([['Cora']])

	const schema: readonly DataTableColumn<Row>[] = [
		{ id: 'name', label: 'Status as name', value: row => row.status },
	]
	view = model.sync({ ...rekeyed, columns: schema })
	expect(view.rows[0]!.cells[0]!.value).toBe('active')
	model.sort('name')
	view = model.sync({ ...rekeyed, columns: schema })
	expect(view.columns[0]!.sorted).toBe('asc')

	const display: readonly DataTableColumn<Row>[] = [
		{ id: 'name', label: 'Display', cell: row => row.name },
	]
	view = model.sync({ ...rekeyed, columns: display })
	expect(view.columns[0]!.sorted).toBe(false)

	fixture.controller.abort()
})

test('controlled selection proposes changes without mutating optimistically', () => {
	const fixture = host()
	const onValueChange = vi.fn()
	const controlled = args({
		selection: {
			getRowLabel: row => row.name,
			onValueChange,
			value: ['c'],
		},
	})
	const model = createDataTableModel(fixture.host, controlled)
	let view = model.sync(controlled)
	expect(view.selectedCount).toBe(1)
	model.sort('name')
	view = model.sync(controlled)
	expect(view.columns[0]!.sorted).toBe('asc')
	expect(view.selectedCount).toBe(1)

	const rejected = view.rows.find(row => row.key === 'a')!.id
	model.toggleRow(rejected, true)
	expect(model.selected(rejected)).toBe(false)
	view = model.sync(controlled)
	expect(onValueChange).toHaveBeenCalledWith(['c', 'a'], undefined)
	expect(view.selectedCount).toBe(1)

	view = model.sync({
		...controlled,
		selection: {
			getRowLabel: row => row.name,
			onValueChange,
			value: ['c', 'a'],
		},
	})
	expect(view.selectedCount).toBe(2)

	fixture.controller.abort()
})

test('accepts a synchronous controlled echo with the originating event', () => {
	const fixture = host()
	const event = new Event('change')
	let seen: Event | undefined
	let current!: DataTableArgs<Row, string>
	let model!: ReturnType<typeof createDataTableModel<Row, string>>
	const onValueChange = (value: readonly string[], source?: Event) => {
		seen = source
		current = {
			...current,
			selection: {
				getRowLabel: row => row.name,
				onValueChange,
				value,
			},
		}
		model.sync(current)
	}
	current = args({
		selection: {
			getRowLabel: row => row.name,
			onValueChange,
			value: [],
		},
	})
	model = createDataTableModel(fixture.host, current)
	const row = model.sync(current).rows[0]!
	model.toggleRow(row.id, true, event)
	expect(model.selected(row.id)).toBe(true)
	const view = model.sync(current)
	expect(seen).toBe(event)
	expect(view.selectedCount).toBe(1)
	expect(view.rows[0]!.selected).toBe(true)
	fixture.controller.abort()
})

test('coalesces host invalidation and cancels pending work on abort', async () => {
	const fixture = host()
	const initial = args({ search: {} })
	const model = createDataTableModel(fixture.host, initial)
	model.sync(initial)

	model.setQuery('a')
	model.sort('name')
	await Promise.resolve()
	expect(fixture.next).toHaveBeenCalledTimes(1)

	model.sync(initial)
	model.setQuery('b')
	fixture.controller.abort()
	await Promise.resolve()
	expect(fixture.next).toHaveBeenCalledTimes(1)

	model.setQuery('c')
	await Promise.resolve()
	expect(fixture.next).toHaveBeenCalledTimes(1)
})

test('propagates controlled callback errors without corrupting model state', () => {
	const fixture = host()
	const error = new Error('selection failure')
	const initial = args({
		selection: {
			getRowLabel: row => row.name,
			onValueChange: () => { throw error },
			value: [],
		},
	})
	const model = createDataTableModel(fixture.host, initial)
	const row = model.sync(initial).rows[0]!
	expect(() => model.toggleRow(row.id, true)).toThrow(error)
	let view = model.sync(initial)
	expect(view.selectedCount).toBe(0)
	model.sort('name')
	view = model.sync(initial)
	expect(view.columns[0]!.sorted).toBe('asc')
	fixture.controller.abort()
})

test('invalid identity and schema fail before rows render', () => {
	const duplicate = args({ rows: [rows[0]!, { ...rows[1]!, id: rows[0]!.id }] })
	expect(() => createDataTableModel(host().host, duplicate)).toThrowError(
		'DataTable duplicate row key "c" 0/1',
	)

	const hidden = args({ columns: columns.map(column => ({ ...column, defaultHidden: true })) })
	expect(() => createDataTableModel(host().host, hidden)).toThrowError(
		'DataTable needs a visible column',
	)

	const displayFacet = {
		cell: (row: Row) => row.name,
		facet: { label: 'Invalid', options: [{ label: 'Ada', value: 'ada' }] },
		id: 'display',
		label: 'Display',
	} as unknown as DataTableColumn<Row>
	expect(() => createDataTableModel(host().host, args({ columns: [displayFacet] }))).toThrowError(
		'DataTable display column "display" cannot define a facet',
	)

	const duplicateMissing = args({
		selection: {
			defaultValue: ['missing', 'missing'],
			getRowLabel: row => row.name,
		},
	})
	expect(() => createDataTableModel(host().host, duplicateMissing)).toThrowError(/DataTable duplicate selection key/)

	const duplicateDefault = args({
		selection: {
			defaultValue: ['a', 'a'],
			getRowLabel: row => row.name,
			onValueChange: () => {},
			value: ['c'],
		},
	})
	expect(() => createDataTableModel(host().host, duplicateDefault)).toThrowError(
		'DataTable duplicate selection key "a"',
	)
})

test('a non-hideable column overrides its default-hidden hint', () => {
	const fixture = host()
	const initial = args({
		columns: [{ defaultHidden: true, hideable: false, label: 'Name', value: 'name' }],
	})
	const model = createDataTableModel(fixture.host, initial)

	expect(model.sync(initial).columns[0]).toMatchObject({ visible: true })
	fixture.controller.abort()
})

test('string and numeric keys remain distinct', () => {
	type Mixed = { id: number | string; name: string }
	const mixedRows: readonly Mixed[] = [{ id: 1, name: 'Number' }, { id: '1', name: 'String' }]
	const mixed: DataTableArgs<Mixed> = {
		columns: [{ label: 'Name', value: 'name' }],
		getRowKey: row => row.id,
		label: 'Mixed keys',
		rows: mixedRows,
	}
	const fixture = host()
	const model = createDataTableModel(fixture.host, mixed)
	expect(model.sync(mixed).rows.map(row => row.key)).toEqual([1, '1'])
	fixture.controller.abort()
})

test('keeps page projection and selection bounded with 10k rows', () => {
	type LargeRow = {
		active: boolean
		amount: number
		email: string
		group: string
		id: number
		name: string
		score: number
		status: string
	}
	const largeRows = Array.from({ length: 10_000 }, (_, id): LargeRow => ({
		active: id % 2 === 0,
		amount: id * 3,
		email: `person-${id}@example.com`,
		group: `group-${id % 20}`,
		id,
		name: `Person ${id}`,
		score: 10_000 - id,
		status: id % 3 ? 'active' : 'paused',
	}))
	const score = vi.fn((row: LargeRow) => row.score)
	const largeColumns: readonly DataTableColumn<LargeRow>[] = [
		{ label: 'ID', value: 'id' },
		{ label: 'Name', value: 'name' },
		{ label: 'Email', value: 'email' },
		{ label: 'Status', value: 'status' },
		{ id: 'score', label: 'Score', value: score },
		{ label: 'Amount', value: 'amount' },
		{ label: 'Active', value: 'active' },
		{ label: 'Group', value: 'group' },
	]
	const fixture = host()
	const large: DataTableArgs<LargeRow, number> = {
		columns: largeColumns,
		getRowKey: row => row.id,
		label: 'Large data',
		pagination: { defaultSize: 25, sizes: [25, 50] },
		rows: largeRows,
		selection: { getRowLabel: row => row.name },
	}
	const model = createDataTableModel(fixture.host, large)

	let view = model.sync(large)
	expect(view.rows).toHaveLength(25)
	expect(score).toHaveBeenCalledTimes(25)
	model.sync(large)
	expect(score).toHaveBeenCalledTimes(25)

	model.nextPage()
	view = model.sync(large)
	expect(view.page.index).toBe(1)
	expect(score).toHaveBeenCalledTimes(50)
	model.togglePage(true)
	view = model.sync(large)
	expect(view.selectedCount).toBe(25)
	expect(score).toHaveBeenCalledTimes(50)

	model.sort('score')
	view = model.sync(large)
	expect(view.rows[0]!.original.score).toBe(1)
	expect(score).toHaveBeenCalledTimes(10_000)
	model.sync(large)
	expect(score).toHaveBeenCalledTimes(10_000)

	fixture.controller.abort()
})
