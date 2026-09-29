import { readdir, readFile } from 'node:fs/promises'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { createGenerator } from 'unocss'
import { expect, test } from 'vitest'
import { playa } from 'ajo-ui-playa'

type Size = { raw: number, gzip: number, brotli: number }

// Ceilings are the measurement rounded up to the next 100 B, so a few bytes of
// compression noise is not growth. A slice that wins bytes lowers them; raising one is a decision whose
// reason goes in the commit.
const budgets: Record<string, Size> = {
	'preflight only': { raw: 9_800, gzip: 3_400, brotli: 3_000 },
	'input.tsx': { raw: 24_700, gzip: 6_200, brotli: 5_400 },
	'select.tsx': { raw: 44_000, gzip: 8_400, brotli: 7_400 },
	'all families': { raw: 187_800, gzip: 28_300, brotli: 23_300 },
}

const src = new URL('../src/', import.meta.url)
// Runtime imports only: a bundle erases `import type` and `export type`.
const relative = /^(?:import|export) (?!type )[^'"]*?\bfrom '(\.\.?\/[^']+)'/gm

const read = async (specifier: string, parent: URL) => {
	for (const extension of ['.tsx', '.ts']) {
		const url = new URL(specifier + extension, parent)
		try {
			return { url: url.href, source: await readFile(url, 'utf8') }
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
		}
	}
	throw new Error(`cannot resolve ${specifier} from ${parent.href}`)
}

// A consumer's UnoCSS extracts every Playa module its imports reach, so an
// entry costs its own classes plus those of the local modules it imports.
const graph = async (entries: string[]) => {
	const sources = new Map<string, string>()
	const visit = async (specifier: string, parent: URL): Promise<void> => {
		const { url, source } = await read(specifier, parent)
		if (sources.has(url)) return
		sources.set(url, source)
		for (const [, target] of source.matchAll(relative)) await visit(target, new URL(url))
	}
	for (const entry of entries) await visit(`./${entry}`, src)
	return [...sources.values()].join('\n')
}

const measure = (css: string): Size => {
	const bytes = Buffer.from(css)
	return { raw: bytes.length, gzip: gzipSync(bytes).length, brotli: brotliCompressSync(bytes).length }
}

test('Playa CSS stays within its measured budget', async () => {
	const families = (await readdir(src)).filter(file => file.endsWith('.tsx')).map(file => file.slice(0, -4))
	const entries: Record<string, string> = {
		'preflight only': '',
		'input.tsx': await graph(['input']),
		'select.tsx': await graph(['select']),
		'all families': await graph(families),
	}

	// One generator per entry: a generator remembers the theme variables of
	// earlier calls, so a shared one would charge an entry for its neighbours.
	const sizes: Record<string, Size> = {}
	for (const [name, source] of Object.entries(entries)) {
		const uno = await createGenerator({ presets: [playa()] })
		sizes[name] = measure((await uno.generate(source)).css)
	}

	const over = Object.entries(sizes).flatMap(([name, size]) => (['raw', 'gzip', 'brotli'] as const)
		.filter(format => size[format] > budgets[name][format])
		.map(format => `${name} ${format} ${size[format]} B > ${budgets[name][format]} B`))
	expect(over, JSON.stringify(sizes)).toEqual([])
})
