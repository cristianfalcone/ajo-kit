import { realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { build, type Plugin } from 'vite'

type Result = {
	brotli: number
	bytes: number
	code: string
	gzip: number
	sha256: string
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
const tableCorePackage = realpathSync(resolve('packages/ajo-ui/node_modules/@tanstack/table-core/package.json'))
const tableCoreRoot = dirname(tableCorePackage)
const tableRequire = createRequire(tableCorePackage)
const uiRequire = createRequire(resolve('packages/ajo-ui/package.json'))
const tableStoreRoot = dirname(tableRequire.resolve('@tanstack/store/package.json'))

const tanstackEntry = (id: string) => {
	if (id === '@tanstack/virtual-core') {
		return resolve('packages/ajo-ui/node_modules/@tanstack/virtual-core/dist/esm/index.js')
	}
	if (id === '@tanstack/store') return resolve(tableStoreRoot, 'dist/index.js')
	if (id === '@tanstack/table-core') return resolve(tableCoreRoot, 'dist/index.js')
	if (id.startsWith('@tanstack/table-core/')) {
		return resolve(tableCoreRoot, 'dist', `${id.slice('@tanstack/table-core/'.length)}.js`)
	}
	return null
}

const uiEntry = (id: string) => id === 'ajo-ui' || id.startsWith('ajo-ui/')
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
		sha256: createHash('sha256').update(code).digest('hex'),
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
const root = await bundle('root-without-virtual-list', `
	import { Accordion } from 'ajo-ui'
	globalThis.__ajoFixture = Accordion
`)
const dialogDirect = await bundle('dialog-subpath', `
	import { Dialog } from 'ajo-ui/dialog'
	globalThis.__ajoFixture = Dialog
`)
const dialogRoot = await bundle('root-with-dialog', `
	import { Dialog } from 'ajo-ui'
	globalThis.__ajoFixture = Dialog
`)
const toastDirect = await bundle('toast-subpath', `
	import { Toast } from 'ajo-ui/toast'
	globalThis.__ajoFixture = Toast
`)
const toastRoot = await bundle('root-with-toast', `
	import { Toast } from 'ajo-ui'
	globalThis.__ajoFixture = Toast
`)
const popoverDirect = await bundle('popover-subpath', `
	import { Popover } from 'ajo-ui/popover'
	globalThis.__ajoFixture = Popover
`)
const popoverRoot = await bundle('root-with-popover', `
	import { Popover } from 'ajo-ui'
	globalThis.__ajoFixture = Popover
`)
const tooltipDirect = await bundle('tooltip-subpath', `
	import { Tooltip } from 'ajo-ui/tooltip'
	globalThis.__ajoFixture = Tooltip
`)
const tooltipRoot = await bundle('root-with-tooltip', `
	import { Tooltip } from 'ajo-ui'
	globalThis.__ajoFixture = Tooltip
`)
const menuDirect = await bundle('menu-subpath', `
	import { Menu } from 'ajo-ui/menu'
	globalThis.__ajoFixture = Menu
`)
const menuRoot = await bundle('root-with-menu', `
	import { Menu } from 'ajo-ui'
	globalThis.__ajoFixture = Menu
`)
const contextMenuDirect = await bundle('context-menu-subpath', `
	import { ContextMenu } from 'ajo-ui/context-menu'
	globalThis.__ajoFixture = ContextMenu
`)
const contextMenuRoot = await bundle('root-with-context-menu', `
	import { ContextMenu } from 'ajo-ui'
	globalThis.__ajoFixture = ContextMenu
`)
const menubarDirect = await bundle('menubar-subpath', `
	import { Menubar } from 'ajo-ui/menubar'
	globalThis.__ajoFixture = Menubar
`)
const menubarRoot = await bundle('root-with-menubar', `
	import { Menubar } from 'ajo-ui'
	globalThis.__ajoFixture = Menubar
`)
const selectDirect = await bundle('select-subpath', `
	import { Select } from 'ajo-ui/select'
	globalThis.__ajoFixture = Select
`)
const selectRoot = await bundle('root-with-select', `
	import { Select } from 'ajo-ui'
	globalThis.__ajoFixture = Select
`)
const inputDateDirect = await bundle('input-date-subpath', `
	import { InputDate } from 'ajo-ui/input-date'
	globalThis.__ajoFixture = InputDate
`)
const inputDateRoot = await bundle('root-with-input-date', `
	import { InputDate } from 'ajo-ui'
	globalThis.__ajoFixture = InputDate
`)
const navigationMenuDirect = await bundle('navigation-menu-subpath', `
	import { NavigationMenu } from 'ajo-ui/navigation-menu'
	globalThis.__ajoFixture = NavigationMenu
`)
const navigationMenuRoot = await bundle('root-with-navigation-menu', `
	import { NavigationMenu } from 'ajo-ui'
	globalThis.__ajoFixture = NavigationMenu
`)
const chartDirect = await bundle('chart-subpath', `
	import { ChartContainer } from 'ajo-ui/chart'
	globalThis.__ajoFixture = ChartContainer
`)
const chartRoot = await bundle('root-with-chart', `
	import { ChartContainer } from 'ajo-ui'
	globalThis.__ajoFixture = ChartContainer
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
	import { constructTable } from '@tanstack/table-core'
	import { dataTableReactivity, dataTableStrategy } from '${dataTableModelEntry}'
	globalThis.__ajoFixture = [constructTable, dataTableReactivity, dataTableStrategy]
`)
const dataTableRoot = await bundle('root-with-data-table', `
	import { DataTable } from 'ajo-ui'
	globalThis.__ajoFixture = DataTable
`)

console.log(JSON.stringify([
	framework,
	direct,
	root,
	dialogDirect,
	dialogRoot,
	toastDirect,
	toastRoot,
	popoverDirect,
	popoverRoot,
	tooltipDirect,
	tooltipRoot,
	menuDirect,
	menuRoot,
	contextMenuDirect,
	contextMenuRoot,
	menubarDirect,
	menubarRoot,
	selectDirect,
	selectRoot,
	inputDateDirect,
	inputDateRoot,
	navigationMenuDirect,
	navigationMenuRoot,
	chartDirect,
	chartRoot,
	core,
	virtualList,
	dataTableModel,
	dataTable,
	dataTableRoot,
].map(({ brotli, bytes, gzip, name, sha256 }) => ({ brotli, bytes, gzip, name, sha256 })), null, 2))

const virtualMarker = 'data-ajo-virtual-index'
const tableCoreMarker = '@tanstack+table-core'
const tableStoreMarker = '@tanstack+store'
const floatingMarker = '@floating-ui'
const hasModule = (result: Result, marker: string) => result.modules.some(id => id.includes(marker))
const sameModules = (left: Result, right: Result) =>
	left.modules.length === right.modules.length && left.modules.every((id, index) => id === right.modules[index])
const assertNoFloating = (result: Result) => {
	if (hasModule(result, floatingMarker)) throw new Error(`${result.name} retained Floating UI`)
}
const assertFloating = (result: Result) => {
	if (!hasModule(result, floatingMarker)) throw new Error(`${result.name} omitted Floating UI`)
}
const assertEquivalent = (family: string, direct: Result, root: Result) => {
	if (direct.bytes !== root.bytes || !sameModules(direct, root)) {
		throw new Error(`${family} root tree-shaking changed its bundle: direct=${direct.bytes}/${direct.gzip}/${direct.brotli}, root=${root.bytes}/${root.gzip}/${root.brotli}`)
	}
}

for (const result of [direct, root, dialogDirect, dialogRoot, toastDirect, toastRoot]) assertNoFloating(result)
assertEquivalent('Accordion', direct, root)
assertEquivalent('Dialog', dialogDirect, dialogRoot)
assertEquivalent('Toast', toastDirect, toastRoot)
assertFloating(popoverDirect)
assertFloating(popoverRoot)
assertEquivalent('Popover', popoverDirect, popoverRoot)
const popoverIncrementalGzip = popoverDirect.gzip - framework.gzip
const popoverIncrementalBrotli = popoverDirect.brotli - framework.brotli
if (popoverIncrementalGzip > 14 * 1024 || popoverIncrementalBrotli > 13 * 1024) {
	throw new Error(`Popover exceeded its 14/13 KiB incremental gzip/Brotli budgets: ${popoverIncrementalGzip}/${popoverIncrementalBrotli} bytes`)
}
assertFloating(tooltipDirect)
assertFloating(tooltipRoot)
assertEquivalent('Tooltip', tooltipDirect, tooltipRoot)
const tooltipIncrementalGzip = tooltipDirect.gzip - framework.gzip
const tooltipIncrementalBrotli = tooltipDirect.brotli - framework.brotli
if (tooltipIncrementalGzip > 14 * 1024 || tooltipIncrementalBrotli > 13 * 1024) {
	throw new Error(`Tooltip exceeded its 14/13 KiB incremental gzip/Brotli budgets: ${tooltipIncrementalGzip}/${tooltipIncrementalBrotli} bytes`)
}
for (const [family, directBundle, rootBundle] of [
	['Menu', menuDirect, menuRoot],
	['ContextMenu', contextMenuDirect, contextMenuRoot],
	['Menubar', menubarDirect, menubarRoot],
	['Select', selectDirect, selectRoot],
	['InputDate', inputDateDirect, inputDateRoot],
	['NavigationMenu', navigationMenuDirect, navigationMenuRoot],
	['Chart', chartDirect, chartRoot],
] as const) {
	assertFloating(directBundle)
	assertFloating(rootBundle)
	assertEquivalent(family, directBundle, rootBundle)
}
const positionedFamilyBudgets = [
	['Menu', menuDirect, 16 * 1024, 15 * 1024],
	['ContextMenu', contextMenuDirect, 19 * 1024, 17 * 1024],
	['Menubar', menubarDirect, 19 * 1024, 17 * 1024],
	['Select', selectDirect, 19 * 1024, 18 * 1024],
	['InputDate', inputDateDirect, 35 * 1024, 32 * 1024],
	['NavigationMenu', navigationMenuDirect, 17 * 1024, 16 * 1024],
	['Chart', chartDirect, 14 * 1024, 13 * 1024],
] as const
for (const [family, result, gzipBudget, brotliBudget] of positionedFamilyBudgets) {
	const gzip = result.gzip - framework.gzip
	const brotli = result.brotli - framework.brotli
	if (gzip > gzipBudget || brotli > brotliBudget) {
		throw new Error(`${family} exceeded its incremental gzip/Brotli budgets: ${gzip}/${brotli} bytes`)
	}
}

if (root.code.includes(virtualMarker)) {
	throw new Error('The ajo-ui root retained VirtualList when another family was selected')
}
if (hasModule(root, tableCoreMarker) || hasModule(root, tableStoreMarker)) {
	throw new Error('The ajo-ui root retained TanStack Table when another family was selected')
}
if (!virtualList.code.includes(virtualMarker)) {
	throw new Error('The VirtualList fixture did not retain its private engine')
}
if (hasModule(virtualList, tableCoreMarker) || hasModule(virtualList, tableStoreMarker)) {
	throw new Error('The VirtualList fixture retained TanStack Table')
}
const incrementalGzip = virtualList.gzip - framework.gzip
if (incrementalGzip > 9 * 1024) {
	throw new Error(`VirtualList exceeded the 9 KiB incremental gzip budget: ${incrementalGzip} bytes`)
}
console.log(`VirtualList incremental gzip: ${incrementalGzip} bytes`)
console.log(`VirtualList incremental Brotli: ${virtualList.brotli - framework.brotli} bytes`)

if (!hasModule(dataTable, tableCoreMarker) || !hasModule(dataTable, tableStoreMarker)) {
	throw new Error('The DataTable fixture did not retain TanStack Table and Store')
}
if (!hasModule(dataTableModel, tableCoreMarker) || !hasModule(dataTableModel, tableStoreMarker)) {
	throw new Error('The DataTable model fixture did not retain TanStack Table and Store')
}
if (dataTableModel.code.includes(virtualMarker)) {
	throw new Error('The DataTable model fixture retained the VirtualList engine')
}
if (dataTableModel.gzip > 15 * 1024) {
	throw new Error(`DataTable model exceeded the 15 KiB gzip budget: ${dataTableModel.gzip} bytes`)
}
console.log(`DataTable model gzip: ${dataTableModel.gzip} bytes`)
console.log(`DataTable model Brotli: ${dataTableModel.brotli} bytes`)
if (dataTable.code.includes(virtualMarker)) {
	throw new Error('The DataTable fixture retained the VirtualList engine')
}
assertEquivalent('DataTable', dataTable, dataTableRoot)
const dataTableIncrementalGzip = dataTable.gzip - framework.gzip
const dataTableIncrementalBrotli = dataTable.brotli - framework.brotli
// DataTable composes Menu, so isolate its table-specific payload from the
// already-budgeted shared popup graph while retaining an overall ceiling.
const dataTableOwnGzip = dataTable.gzip - menuDirect.gzip
const dataTableOwnBrotli = dataTable.brotli - menuDirect.brotli
if (dataTableOwnGzip > 30 * 1024 || dataTableOwnBrotli > 27 * 1024) {
	throw new Error(`DataTable exceeded its own 30/27 KiB gzip/Brotli budgets beyond Menu: ${dataTableOwnGzip}/${dataTableOwnBrotli} bytes`)
}
if (dataTableIncrementalGzip > 46 * 1024 || dataTableIncrementalBrotli > 42 * 1024) {
	throw new Error(`DataTable exceeded its combined 46/42 KiB gzip/Brotli budgets: ${dataTableIncrementalGzip}/${dataTableIncrementalBrotli} bytes`)
}
console.log(`DataTable incremental gzip: ${dataTableIncrementalGzip} bytes`)
console.log(`DataTable incremental Brotli: ${dataTableIncrementalBrotli} bytes`)
console.log(`DataTable own gzip/Brotli beyond Menu: ${dataTableOwnGzip}/${dataTableOwnBrotli} bytes`)
console.log(`Popover incremental gzip/Brotli: ${popoverIncrementalGzip}/${popoverIncrementalBrotli} bytes`)
console.log(`Tooltip incremental gzip/Brotli: ${tooltipIncrementalGzip}/${tooltipIncrementalBrotli} bytes`)
for (const result of [menuDirect, contextMenuDirect, menubarDirect, selectDirect, inputDateDirect, navigationMenuDirect, chartDirect]) {
	console.log(`${result.name} incremental gzip/Brotli: ${result.gzip - framework.gzip}/${result.brotli - framework.brotli} bytes`)
}
