import { performance } from 'node:perf_hooks'
import { arch, cpus, platform } from 'node:os'
import {
	constructTable,
	tableFeatures,
	type ColumnDef,
	type RowSelectionState,
} from '@tanstack/table-core'
import type { Host } from 'ajo-cloves'
import type { DataTableArgs, DataTableColumn } from '../src/data-table-contract'
import {
	createDataTableModel,
	dataTableReactivity,
	dataTableStrategy,
} from '../src/data-table-model'

type Row = {
	active: boolean
	amount: number
	email: string
	group: string
	id: number
	name: string
	score: number
	status: string
}

type Metrics = Record<'cold' | 'page' | 'repeat' | 'search' | 'selectPage' | 'sort', number>

const columns: readonly DataTableColumn<Row>[] = [
	{ label: 'ID', search: false, value: 'id' },
	{ label: 'Name', value: 'name' },
	{ label: 'Email', search: false, value: 'email' },
	{ label: 'Status', search: false, value: 'status' },
	{ label: 'Score', search: false, sort: (left, right) => left.score - right.score, value: 'score' },
	{ label: 'Amount', search: false, value: 'amount' },
	{ label: 'Active', search: false, value: 'active' },
	{ label: 'Group', search: false, value: 'group' },
]

const rows = (count: number) => Array.from({ length: count }, (_, id): Row => ({
	active: id % 2 === 0,
	amount: id * 3,
	email: `person-${id}@example.com`,
	group: `group-${id % 20}`,
	id,
	name: `Person ${id}`,
	score: count - id,
	status: id % 3 ? 'active' : 'paused',
}))

const lifecycle = () => {
	const controller = new AbortController()
	return {
		controller,
		host: {
			next: () => {},
			signal: controller.signal,
			throw: (error: unknown) => { throw error },
		} as unknown as Host,
	}
}

const timed = <T>(run: () => T) => {
	const start = performance.now()
	const value = run()
	return { duration: performance.now() - start, value }
}

const median = (values: readonly number[]) => {
	const sorted = [...values].sort((left, right) => left - right)
	return sorted[Math.floor(sorted.length / 2)]!
}

const ajo = (data: readonly Row[], query: string) => {
	const { controller, host } = lifecycle()
	const args: DataTableArgs<Row, number> = {
		columns,
		getRowKey: row => row.id,
		label: 'Performance fixture',
		pagination: { defaultSize: 25, sizes: [25] },
		rows: data,
		search: {},
		selection: { getRowLabel: row => row.name },
	}
	const created = timed(() => createDataTableModel(host, args))
	const cold = timed(() => created.value.sync(args))
	const repeat = timed(() => created.value.sync(args))
	const search = timed(() => {
		created.value.setQuery(query)
		return created.value.sync(args)
	})
	created.value.reset()
	created.value.sync(args)
	const sort = timed(() => {
		created.value.sort('score')
		return created.value.sync(args)
	})
	const selectPage = timed(() => {
		created.value.togglePage(true)
		return created.value.sync(args)
	})
	const page = timed(() => {
		created.value.nextPage()
		return created.value.sync(args)
	})
	controller.abort()
	return {
		metrics: {
			cold: created.duration + cold.duration,
			page: page.duration,
			repeat: repeat.duration,
			search: search.duration,
			selectPage: selectPage.duration,
			sort: sort.duration,
		},
		searchCount: search.value.filteredCount,
		sortFirst: sort.value.rows[0]?.original.id,
	}
}

const vanilla = (data: readonly Row[], query: string) => {
	const { controller, host } = lifecycle()
	const reactive = dataTableReactivity(host)
	const features = tableFeatures({ ...dataTableStrategy, coreReactivityFeature: reactive.bindings })
	let searchValue = ''
	const definitions: ReadonlyArray<ColumnDef<typeof features, Row, unknown>> = columns.map(column => {
		const id = typeof column.value === 'string' ? column.value : column.id!
		return {
			accessorFn: (row: Row) => row[id as keyof Row],
			enableGlobalFilter: column.search !== false,
			enableSorting: id === 'score',
			header: column.label,
			id,
			sortFn: id === 'score' ? (left, right) => left.original.score - right.original.score : undefined,
			sortUndefined: false,
		}
	})
	const created = timed(() => constructTable<typeof features, Row>({
		autoResetPageIndex: false,
		columns: definitions,
		data,
		enableMultiSort: false,
		enableRowRangeSelection: false,
		enableRowSelection: true,
		features,
		getColumnCanGlobalFilter: column => (column.columnDef as { enableGlobalFilter?: boolean }).enableGlobalFilter === true,
		getRowId: row => `n:${row.id}`,
		globalFilterFn: (row, columnId) => String(row.getValue(columnId)).toLowerCase().includes(searchValue),
		initialState: {
			columnFilters: [],
			columnVisibility: Object.fromEntries(columns.map(column => [typeof column.value === 'string' ? column.value : column.id!, true])),
			globalFilter: '',
			pagination: { pageIndex: 0, pageSize: 25 },
			rowSelection: {},
			sorting: [],
		},
	}))
	const project = () => {
		created.value.getPageCount()
		for (const definition of definitions) {
			const column = created.value.getColumn(definition.id!)!
			column.getFilterValue()
			column.getIsSorted()
			column.getIsVisible()
		}
		const pageRows = created.value.getRowModel().rows
		for (const row of pageRows) {
			row.getIsSelected()
			for (const cell of row.getVisibleCells()) cell.getValue()
		}
		const selected = Object.values(created.value.atoms.rowSelection.get()).filter(Boolean).length
		return {
			filteredCount: created.value.getFilteredRowModel().rows.length,
			first: pageRows[0]?.original.id,
			selected,
		}
	}
	const cold = timed(project)
	const repeat = timed(project)
	const search = timed(() => {
		searchValue = query.toLowerCase()
		created.value.setGlobalFilter(query)
		created.value.firstPage()
		return project()
	})
	searchValue = ''
	created.value.setGlobalFilter('')
	project()
	const sort = timed(() => {
		created.value.setSorting([{ desc: false, id: 'score' }])
		created.value.firstPage()
		return project()
	})
	const selectPage = timed(() => {
		const selected: RowSelectionState = Object.fromEntries(created.value.getRowModel().rows.map(row => [row.id, true]))
		created.value.setRowSelection(selected)
		return project()
	})
	const page = timed(() => {
		created.value.nextPage()
		return project()
	})
	controller.abort()
	return {
		metrics: {
			cold: created.duration + cold.duration,
			page: page.duration,
			repeat: repeat.duration,
			search: search.duration,
			selectPage: selectPage.duration,
			sort: sort.duration,
		},
		searchCount: search.value.filteredCount,
		sortFirst: sort.value.first,
	}
}

const sample = (count: number, runs = 5) => {
	const data = rows(count)
	const query = `Person ${count - 1}`
	ajo(data, query)
	vanilla(data, query)
	const ajoRuns: Metrics[] = []
	const vanillaRuns: Metrics[] = []
	for (let index = 0; index < runs; index++) {
		let a: ReturnType<typeof ajo>
		let v: ReturnType<typeof vanilla>
		if (index % 2 === 0) {
			a = ajo(data, query)
			v = vanilla(data, query)
		} else {
			v = vanilla(data, query)
			a = ajo(data, query)
		}
		if (a.searchCount !== v.searchCount || a.sortFirst !== v.sortFirst) {
			throw new Error(`DataTable parity failed at ${count} rows`)
		}
		ajoRuns.push(a.metrics)
		vanillaRuns.push(v.metrics)
	}
	const summarize = (samples: readonly Metrics[]) => Object.fromEntries(
		(Object.keys(samples[0]!) as Array<keyof Metrics>).map(name => [name, median(samples.map(run => run[name]))]),
	) as Metrics
	const overhead = Object.fromEntries(
		(Object.keys(ajoRuns[0]!) as Array<keyof Metrics>).map(name => [
			name,
			median(ajoRuns.map((run, index) => run[name] - vanillaRuns[index]![name])),
		]),
	) as Metrics
	return { ajo: summarize(ajoRuns), overhead, rows: count, vanilla: summarize(vanillaRuns) }
}

const collectability = async () => {
	const gc = (globalThis as { gc?: () => void }).gc
	if (!gc) throw new Error('DataTable collectability requires --expose-gc')
	const data = rows(100)
	const args: DataTableArgs<Row, number> = {
		columns,
		getRowKey: row => row.id,
		label: 'Collectability fixture',
		rows: data,
	}
	const refs: Array<WeakRef<object>> = []
	for (let index = 0; index < 50; index++) {
		const { controller, host } = lifecycle()
		let model: ReturnType<typeof createDataTableModel<Row, number>> | undefined = createDataTableModel(host, args)
		model.sync(args)
		refs.push(new WeakRef(model))
		controller.abort()
		model = undefined
	}
	await Promise.resolve()
	for (let index = 0; index < 5; index++) {
		gc()
		await new Promise<void>(resolve => setImmediate(resolve))
	}
	const retained = refs.filter(ref => ref.deref()).length
	if (retained > 1) throw new Error(`DataTable retained ${retained} of 50 aborted models`)
	return { cycles: refs.length, retained }
}

const results = [sample(10_000), sample(100_000)]
const memory = await collectability()
console.log(JSON.stringify({
	arch: arch(),
	cpu: cpus()[0]?.model ?? 'unknown',
	node: process.version,
	platform: platform(),
	memory,
	results,
	runs: 5,
	warmups: 1,
}, null, 2))
const parity = results[0]!
for (const operation of ['search', 'sort'] as const) {
	// Projection includes Ajo policy beyond the TanStack row model. Keep the
	// 20% relative guard once work dominates, with 8 ms for fixed adapter cost
	// and scheduler jitter. Paired-run deltas avoid comparing unrelated medians.
	const budget = Math.max(parity.vanilla[operation] * 0.2, 8)
	if (parity.overhead[operation] > budget) {
		throw new Error(`DataTable ${operation} overhead is ${parity.overhead[operation].toFixed(3)}ms; budget is ${budget.toFixed(3)}ms`)
	}
}
for (const operation of ['page', 'selectPage', 'sort'] as const) {
	if (parity.ajo[operation] > 1000 / 60) {
		throw new Error(`DataTable ${operation} exceeded one frame: ${parity.ajo[operation].toFixed(3)}ms`)
	}
}
if (parity.ajo.search > 50) throw new Error(`DataTable search produced a long task: ${parity.ajo.search.toFixed(3)}ms`)
