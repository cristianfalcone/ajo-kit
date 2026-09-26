import { createRequire } from 'node:module'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { resolve } from 'node:path'
import { build, type Plugin } from 'vite'

type Result = {
	brotli: number
	bytes: number
	code: string
	gzip: number
	modules: readonly string[]
	name: string
}

type BuildResult = {
	output: Array<{
		code: string
		modules: Record<string, { renderedLength: number }>
		type: 'chunk'
	} | { type: 'asset' }>
}

const entry = 'virtual:ajo-ui-bundle-entry'
const dataTableModelEntry = 'virtual:ajo-data-table-model'
const uiRequire = createRequire(resolve('packages/ajo-ui/package.json'))

const tanstackEntry = (id: string) => {
	if (id === '@tanstack/virtual-core') {
		return resolve('packages/ajo-ui/node_modules/@tanstack/virtual-core/dist/esm/index.js')
	}
	return null
}

const uiEntry = (id: string) => id.startsWith('ajo-ui/')
	? uiRequire.resolve(id)
	: null

const bundle = async (name: string, source: string): Promise<Result> => {
	const virtualEntry: Plugin = {
		name: 'ajo-ui-bundle-entry',
		load: id => id === `\0${entry}` ? source : null,
		resolveId: id => id === entry
			? `\0${entry}`
			: id === dataTableModelEntry
				? resolve('packages/ajo-ui/src/data-table-model.ts')
			: uiEntry(id) ?? tanstackEntry(id),
	}
	const result = await build({
		build: {
			minify: 'esbuild',
			rollupOptions: {
				external: id => id === 'ajo' || id.startsWith('ajo/') || id === 'ajo-cloves',
				input: entry,
			},
			target: 'es2022',
			write: false,
		},
		configFile: false,
		logLevel: 'silent',
		plugins: [virtualEntry],
	})
	const outputs = (Array.isArray(result) ? result : [result]) as unknown as BuildResult[]
	const chunks = outputs.flatMap(build => build.output)
		.flatMap(output => output.type === 'chunk' ? [output] : [])
	const code = chunks.map(output => output.code)
		.join('\n')
	const modules = [...new Set(chunks.flatMap(chunk => Object.keys(chunk.modules))
		.filter(id => id !== `\0${entry}`)
		.map(id => id.replaceAll('\\', '/')))].sort()
	return {
		brotli: brotliCompressSync(code).byteLength,
		bytes: Buffer.byteLength(code),
		code,
		gzip: gzipSync(code).byteLength,
		modules,
		name,
	}
}

const direct = await bundle('other-subpath', `
	import { Accordion } from 'ajo-ui/accordion'
	globalThis.__ajoFixture = Accordion
`)
const framework = await bundle('framework-shell', `
	import { Fragment, jsx, jsxs } from 'ajo/jsx-runtime'
	import { dom, frame, statefulRootAttrs } from 'ajo-cloves'
	globalThis.__ajoFixture = [Fragment, jsx, jsxs, dom, frame, statefulRootAttrs]
`)
const dialogDirect = await bundle('dialog-subpath', `
	import { Dialog } from 'ajo-ui/dialog'
	globalThis.__ajoFixture = Dialog
`)
const toastDirect = await bundle('toast-subpath', `
	import { Toast } from 'ajo-ui/toast'
	globalThis.__ajoFixture = Toast
`)
const popoverDirect = await bundle('popover-subpath', `
	import { Popover } from 'ajo-ui/popover'
	globalThis.__ajoFixture = Popover
`)
const tooltipDirect = await bundle('tooltip-subpath', `
	import { Tooltip } from 'ajo-ui/tooltip'
	globalThis.__ajoFixture = Tooltip
`)
const menuDirect = await bundle('menu-subpath', `
	import { Menu } from 'ajo-ui/menu'
	globalThis.__ajoFixture = Menu
`)
const contextMenuDirect = await bundle('context-menu-subpath', `
	import { ContextMenu } from 'ajo-ui/context-menu'
	globalThis.__ajoFixture = ContextMenu
`)
const menubarDirect = await bundle('menubar-subpath', `
	import { Menubar, MenubarMenu } from 'ajo-ui/menubar'
	globalThis.__ajoFixture = [Menubar, MenubarMenu]
`)
const selectDirect = await bundle('select-subpath', `
	import { Select } from 'ajo-ui/select'
	globalThis.__ajoFixture = Select
`)
const inputDateDirect = await bundle('input-date-subpath', `
	import { InputDate } from 'ajo-ui/input-date'
	globalThis.__ajoFixture = InputDate
`)
const inputTimeDirect = await bundle('input-time-subpath', `
	import { InputTime } from 'ajo-ui/input-date'
	globalThis.__ajoFixture = InputTime
`)
const inputDateTimeDirect = await bundle('input-datetime-subpath', `
	import { InputDateTime } from 'ajo-ui/input-date'
	globalThis.__ajoFixture = InputDateTime
`)
const navigationMenuDirect = await bundle('navigation-menu-subpath', `
	import { NavigationMenu } from 'ajo-ui/navigation-menu'
	globalThis.__ajoFixture = NavigationMenu
`)
const chartDirect = await bundle('chart-subpath', `
	import * as chart from 'ajo-ui/chart'
	globalThis.__ajoFixture = chart
`)
const core = await bundle('virtual-core', `
	import { Virtualizer, defaultRangeExtractor, elementScroll, measureElement, observeElementOffset, observeElementRect } from '@tanstack/virtual-core'
	globalThis.__ajoFixture = [Virtualizer, defaultRangeExtractor, elementScroll, measureElement, observeElementOffset, observeElementRect]
`)
const virtualList = await bundle('virtual-list', `
	import { VirtualList } from 'ajo-ui/virtual-list'
	globalThis.__ajoFixture = VirtualList
`)
const dataTable = await bundle('data-table', `
	import { DataTable } from 'ajo-ui/data-table'
	globalThis.__ajoFixture = DataTable
`)
const dataTableModel = await bundle('data-table-model', `
	import { createDataTableModel } from '${dataTableModelEntry}'
	globalThis.__ajoFixture = createDataTableModel
`)

console.log(JSON.stringify([
	framework,
	direct,
	dialogDirect,
	toastDirect,
	popoverDirect,
	tooltipDirect,
	menuDirect,
	contextMenuDirect,
	menubarDirect,
	selectDirect,
	inputDateDirect,
	inputTimeDirect,
	inputDateTimeDirect,
	navigationMenuDirect,
	chartDirect,
	core,
	virtualList,
	dataTableModel,
	dataTable,
].map(({ brotli, bytes, gzip, name }) => ({ brotli, bytes, gzip, name })), null, 2))

const virtualMarker = 'data-ajo-virtual-index'
const floatingMarker = '@floating-ui'
const hasModule = (result: Result, marker: string) => result.modules.some(id => id.includes(marker))
const assertNoFloating = (result: Result) => {
	if (hasModule(result, floatingMarker)) throw new Error(`${result.name} retained Floating UI`)
}
const assertFloating = (result: Result) => {
	if (!hasModule(result, floatingMarker)) throw new Error(`${result.name} omitted Floating UI`)
}

for (const result of [direct, dialogDirect, toastDirect]) assertNoFloating(result)
assertFloating(popoverDirect)
const popoverIncrementalGzip = popoverDirect.gzip - framework.gzip
const popoverIncrementalBrotli = popoverDirect.brotli - framework.brotli
if (popoverIncrementalGzip > 14 * 1024 || popoverIncrementalBrotli > 13 * 1024) {
	throw new Error(`Popover exceeded its 14/13 KiB incremental gzip/Brotli budgets: ${popoverIncrementalGzip}/${popoverIncrementalBrotli} bytes`)
}
assertFloating(tooltipDirect)
const tooltipIncrementalGzip = tooltipDirect.gzip - framework.gzip
const tooltipIncrementalBrotli = tooltipDirect.brotli - framework.brotli
if (tooltipIncrementalGzip > 14 * 1024 || tooltipIncrementalBrotli > 13 * 1024) {
	throw new Error(`Tooltip exceeded its 14/13 KiB incremental gzip/Brotli budgets: ${tooltipIncrementalGzip}/${tooltipIncrementalBrotli} bytes`)
}
for (const result of [menuDirect, contextMenuDirect, menubarDirect, selectDirect, inputDateDirect, inputDateTimeDirect, navigationMenuDirect]) {
	assertFloating(result)
}
assertNoFloating(inputTimeDirect)
for (const marker of ['/calendar.tsx', '/popup.ts', '/position.ts']) {
	if (hasModule(inputTimeDirect, marker)) throw new Error(`${inputTimeDirect.name} retained ${marker}`)
}
const inputTimeIncrementalGzip = inputTimeDirect.gzip - framework.gzip
const inputTimeIncrementalBrotli = inputTimeDirect.brotli - framework.brotli
if (inputTimeIncrementalGzip > 12 * 1024 || inputTimeIncrementalBrotli > 11 * 1024) {
	throw new Error(`InputTime exceeded its 12/11 KiB incremental gzip/Brotli budgets: ${inputTimeIncrementalGzip}/${inputTimeIncrementalBrotli} bytes`)
}
for (const result of [inputDateDirect, inputDateTimeDirect]) {
	for (const marker of ['/calendar.tsx', '/popup.ts', '/position.ts']) {
		if (!hasModule(result, marker)) throw new Error(`${result.name} omitted ${marker}`)
	}
}
assertNoFloating(chartDirect)
const positionedFamilyBudgets = [
	['Menu', menuDirect, 16 * 1024, 15 * 1024],
	['ContextMenu', contextMenuDirect, 19 * 1024, 17 * 1024],
	['Menubar', menubarDirect, 19 * 1024, 17 * 1024],
	['Select', selectDirect, 19 * 1024, 18 * 1024],
	['InputDate', inputDateDirect, 32 * 1024, 29 * 1024],
	['InputDateTime', inputDateTimeDirect, 32 * 1024, 29 * 1024],
	['NavigationMenu', navigationMenuDirect, 17 * 1024, 16 * 1024],
	['Chart', chartDirect, 6 * 1024, 5 * 1024],
] as const
for (const [family, result, gzipBudget, brotliBudget] of positionedFamilyBudgets) {
	const gzip = result.gzip - framework.gzip
	const brotli = result.brotli - framework.brotli
	if (gzip > gzipBudget || brotli > brotliBudget) {
		throw new Error(`${family} exceeded its incremental gzip/Brotli budgets: ${gzip}/${brotli} bytes`)
	}
}

if (!virtualList.code.includes(virtualMarker)) {
	throw new Error('The VirtualList fixture did not retain its private engine')
}
const incrementalGzip = virtualList.gzip - framework.gzip
if (incrementalGzip > 9 * 1024) {
	throw new Error(`VirtualList exceeded the 9 KiB incremental gzip budget: ${incrementalGzip} bytes`)
}
console.log(`VirtualList incremental gzip: ${incrementalGzip} bytes`)
console.log(`VirtualList incremental Brotli: ${virtualList.brotli - framework.brotli} bytes`)

if (dataTableModel.code.includes(virtualMarker)) {
	throw new Error('The DataTable model fixture retained the VirtualList engine')
}
if (dataTableModel.gzip > 5 * 1024 || dataTableModel.brotli > 5 * 1024) {
	throw new Error(`DataTable model exceeded the 5/5 KiB gzip/Brotli budgets: ${dataTableModel.gzip}/${dataTableModel.brotli} bytes`)
}
console.log(`DataTable model gzip: ${dataTableModel.gzip} bytes`)
console.log(`DataTable model Brotli: ${dataTableModel.brotli} bytes`)
if (dataTable.code.includes(virtualMarker)) {
	throw new Error('The DataTable fixture retained the VirtualList engine')
}
const dataTableIncrementalGzip = dataTable.gzip - framework.gzip
const dataTableIncrementalBrotli = dataTable.brotli - framework.brotli
// DataTable composes Menu, so isolate its table-specific payload from the
// already-budgeted shared popup graph while retaining an overall ceiling.
const dataTableOwnGzip = dataTable.gzip - menuDirect.gzip
const dataTableOwnBrotli = dataTable.brotli - menuDirect.brotli
if (dataTableOwnGzip > 14 * 1024 || dataTableOwnBrotli > 12 * 1024) {
	throw new Error(`DataTable exceeded its own 14/12 KiB gzip/Brotli budgets beyond Menu: ${dataTableOwnGzip}/${dataTableOwnBrotli} bytes`)
}
if (dataTableIncrementalGzip > 30 * 1024 || dataTableIncrementalBrotli > 27 * 1024) {
	throw new Error(`DataTable exceeded its combined 30/27 KiB gzip/Brotli budgets: ${dataTableIncrementalGzip}/${dataTableIncrementalBrotli} bytes`)
}
console.log(`DataTable incremental gzip: ${dataTableIncrementalGzip} bytes`)
console.log(`DataTable incremental Brotli: ${dataTableIncrementalBrotli} bytes`)
console.log(`DataTable own gzip/Brotli beyond Menu: ${dataTableOwnGzip}/${dataTableOwnBrotli} bytes`)
console.log(`Popover incremental gzip/Brotli: ${popoverIncrementalGzip}/${popoverIncrementalBrotli} bytes`)
console.log(`Tooltip incremental gzip/Brotli: ${tooltipIncrementalGzip}/${tooltipIncrementalBrotli} bytes`)
console.log(`InputTime incremental gzip/Brotli: ${inputTimeIncrementalGzip}/${inputTimeIncrementalBrotli} bytes`)
for (const result of [menuDirect, contextMenuDirect, menubarDirect, selectDirect, inputDateDirect, inputDateTimeDirect, navigationMenuDirect, chartDirect]) {
	console.log(`${result.name} incremental gzip/Brotli: ${result.gzip - framework.gzip}/${result.brotli - framework.brotli} bytes`)
}
