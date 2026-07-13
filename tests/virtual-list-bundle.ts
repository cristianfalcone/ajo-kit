import { realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { gzipSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { build, type Plugin } from 'vite'

type Result = {
	bytes: number
	code: string
	gzip: number
	sha256: string
	modules: string
	name: string
}

type BuildResult = {
	output: Array<{
		code: string
		modules: Record<string, { renderedLength: number }>
		type: 'chunk'
	} | { type: 'asset' }>
}

const entry = 'virtual:ajo-vlist-bundle-entry'
const dataTableModelEntry = 'virtual:ajo-data-table-model'
const tableCorePackage = realpathSync(resolve('packages/ajo-ui/node_modules/@tanstack/table-core/package.json'))
const tableCoreRoot = dirname(tableCorePackage)
const tableRequire = createRequire(tableCorePackage)
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

const bundle = async (name: string, source: string): Promise<Result> => {
	const virtualEntry: Plugin = {
		name: 'ajo-vlist-bundle-entry',
		load: id => id === `\0${entry}` ? source : null,
		resolveId: id => id === entry
			? `\0${entry}`
			: id === dataTableModelEntry
				? resolve('packages/ajo-ui/src/data-table-model.ts')
			: tanstackEntry(id),
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
	const modules = JSON.stringify(chunks.flatMap(chunk => Object.entries(chunk.modules))
		.filter(([id]) => id !== `\0${entry}`)
		.map(([id, metadata]) => [id, metadata.renderedLength] as const)
		.sort(([left], [right]) => left.localeCompare(right)))
	return {
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

console.log(JSON.stringify([framework, direct, root, core, virtualList, dataTableModel, dataTable, dataTableRoot].map(({ bytes, gzip, name, sha256 }) => ({ bytes, gzip, name, sha256 })), null, 2))

const virtualMarker = 'data-ajo-virtual-index'
const tableCoreMarker = '@tanstack+table-core'
const tableStoreMarker = '@tanstack+store'

if (root.code.includes(virtualMarker)) {
	throw new Error('The ajo-ui root retained VirtualList when another family was selected')
}
if (root.modules.includes(tableCoreMarker) || root.modules.includes(tableStoreMarker)) {
	throw new Error('The ajo-ui root retained TanStack Table when another family was selected')
}
if (root.bytes !== direct.bytes || root.gzip !== direct.gzip) {
	throw new Error(`Root tree-shaking changed the selected-family bundle: direct=${direct.bytes}/${direct.gzip}, root=${root.bytes}/${root.gzip}`)
}
if (!virtualList.code.includes(virtualMarker)) {
	throw new Error('The VirtualList fixture did not retain its private engine')
}
if (virtualList.modules.includes(tableCoreMarker) || virtualList.modules.includes(tableStoreMarker)) {
	throw new Error('The VirtualList fixture retained TanStack Table')
}
const incrementalGzip = virtualList.gzip - framework.gzip
if (incrementalGzip > 9 * 1024) {
	throw new Error(`VirtualList exceeded the 9 KiB incremental gzip budget: ${incrementalGzip} bytes`)
}
console.log(`VirtualList incremental gzip: ${incrementalGzip} bytes`)

if (!dataTable.modules.includes(tableCoreMarker) || !dataTable.modules.includes(tableStoreMarker)) {
	throw new Error('The DataTable fixture did not retain TanStack Table and Store')
}
if (!dataTableModel.modules.includes(tableCoreMarker) || !dataTableModel.modules.includes(tableStoreMarker)) {
	throw new Error('The DataTable model fixture did not retain TanStack Table and Store')
}
if (dataTableModel.code.includes(virtualMarker)) {
	throw new Error('The DataTable model fixture retained the VirtualList engine')
}
if (dataTableModel.gzip > 15 * 1024) {
	throw new Error(`DataTable model exceeded the 15 KiB gzip budget: ${dataTableModel.gzip} bytes`)
}
console.log(`DataTable model gzip: ${dataTableModel.gzip} bytes`)
if (dataTable.code.includes(virtualMarker)) {
	throw new Error('The DataTable fixture retained the VirtualList engine')
}
if (dataTableRoot.bytes !== dataTable.bytes || dataTableRoot.modules !== dataTable.modules) {
	throw new Error(`DataTable root tree-shaking changed its bundle: direct=${dataTable.bytes}/${dataTable.gzip}, root=${dataTableRoot.bytes}/${dataTableRoot.gzip}`)
}
const dataTableIncrementalGzip = dataTable.gzip - framework.gzip
if (dataTableIncrementalGzip > 30 * 1024) {
	throw new Error(`DataTable exceeded the 30 KiB incremental gzip budget: ${dataTableIncrementalGzip} bytes`)
}
console.log(`DataTable incremental gzip: ${dataTableIncrementalGzip} bytes`)
