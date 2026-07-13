import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'
import { build, type Plugin } from 'vite'

type Result = {
	bytes: number
	code: string
	gzip: number
	name: string
}

type BuildResult = {
	output: Array<{ code: string; type: 'chunk' } | { type: 'asset' }>
}

const entry = 'virtual:ajo-vlist-bundle-entry'

const bundle = async (name: string, source: string): Promise<Result> => {
	const virtualEntry: Plugin = {
		name: 'ajo-vlist-bundle-entry',
		load: id => id === `\0${entry}` ? source : null,
		resolveId: id => id === entry
			? `\0${entry}`
			: id === '@tanstack/virtual-core'
				? resolve('packages/ajo-ui/node_modules/@tanstack/virtual-core/dist/esm/index.js')
				: null,
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
	const code = outputs.flatMap(build => build.output)
		.flatMap(output => output.type === 'chunk' ? [output.code] : [])
		.join('\n')
	return { bytes: Buffer.byteLength(code), code, gzip: gzipSync(code).byteLength, name }
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

console.log(JSON.stringify([framework, direct, root, core, virtualList].map(({ bytes, gzip, name }) => ({ bytes, gzip, name })), null, 2))

if (root.code.includes('data-ajo-virtual-index')) {
	throw new Error('The ajo-ui root retained VirtualList when another family was selected')
}
if (root.bytes !== direct.bytes || root.gzip !== direct.gzip) {
	throw new Error(`Root tree-shaking changed the selected-family bundle: direct=${direct.bytes}/${direct.gzip}, root=${root.bytes}/${root.gzip}`)
}
if (!virtualList.code.includes('data-ajo-virtual-index')) {
	throw new Error('The VirtualList fixture did not retain its private engine')
}
const incrementalGzip = virtualList.gzip - framework.gzip
if (incrementalGzip > 9 * 1024) {
	throw new Error(`VirtualList exceeded the 9 KiB incremental gzip budget: ${incrementalGzip} bytes`)
}
console.log(`VirtualList incremental gzip: ${incrementalGzip} bytes`)
