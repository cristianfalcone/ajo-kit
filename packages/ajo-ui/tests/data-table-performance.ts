import { performance } from 'node:perf_hooks'
import { arch, cpus, platform } from 'node:os'
import type { Host } from 'ajo-cloves'
import type { DataTableArgs, DataTableColumn } from '../src/data-table-contract'
import { createDataTableModel } from '../src/data-table-model'

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

const measure = (data: readonly Row[], query: string) => {
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

const sample = (count: number, runs = 5) => {
	const data = rows(count)
	const query = `Person ${count - 1}`
	measure(data, query)
	const samples: Metrics[] = []
	for (let index = 0; index < runs; index++) {
		const result = measure(data, query)
		if (result.searchCount !== 1 || result.sortFirst !== count - 1) {
			throw new Error(`DataTable parity failed at ${count} rows`)
		}
		samples.push(result.metrics)
	}
	const metrics = Object.fromEntries(
		(Object.keys(samples[0]!) as Array<keyof Metrics>).map(name => [name, median(samples.map(run => run[name]))]),
	) as Metrics
	return { metrics, rows: count }
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

const parity = results[0]!.metrics
for (const operation of ['page', 'selectPage', 'sort'] as const) {
	if (parity[operation] > 1000 / 60) {
		throw new Error(`DataTable ${operation} exceeded one frame: ${parity[operation].toFixed(3)}ms`)
	}
}
if (parity.search > 50) throw new Error(`DataTable search produced a long task: ${parity.search.toFixed(3)}ms`)

const scale = results[1]!.metrics
if (scale.cold > 250) throw new Error(`DataTable 100k cold sync regressed: ${scale.cold.toFixed(3)}ms`)
if (scale.search > 100) throw new Error(`DataTable 100k search regressed: ${scale.search.toFixed(3)}ms`)
