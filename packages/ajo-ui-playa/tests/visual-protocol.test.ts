import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createGenerator, escapeSelector } from 'unocss'
import { expect, test } from 'vitest'
import { playa } from 'ajo-ui-playa'

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))
const tokenPattern = /\b(?:playa|i-lucide)-[a-z0-9]+(?:-[a-z0-9]+)*\b/g
const unusedSentinel = 'playa-visual-protocol-unused-sentinel'

const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true })
	.flatMap(entry => {
		if (entry.isDirectory()) {
			return /^(?:__tests__|tests)$/.test(entry.name)
				? []
				: sourceFiles(join(directory, entry.name))
		}
		return entry.isFile() && /\.tsx?$/.test(entry.name)
			? [join(directory, entry.name)]
			: []
	})

const extractTokens = (source: string) => source.match(tokenPattern) ?? []
const hasSelector = (css: string, token: string) => new RegExp(`\\.${token}(?![a-z0-9-])`).test(css)

test('every static Playa recipe and icon in runtime TSX participates in the public preset', async () => {
	const sources = sourceFiles(sourceRoot).map(path => ({
		path: path.replaceAll('\\', '/'),
		source: readFileSync(path, 'utf8'),
	}))
	const runtimeSources = sources.filter(({ path }) => path.endsWith('.tsx'))
	const internalTokenSources = runtimeSources.filter(({ path, source }) =>
		path.includes('/internal/') && extractTokens(source).length > 0)
	const unscannableInternalSources = sources.filter(({ path, source }) =>
		path.includes('/internal/') && !path.endsWith('.tsx') && extractTokens(source).length > 0)
	const tokens = [...new Set(runtimeSources.flatMap(({ source }) => extractTokens(source)))].sort()

	// This is the direct-extraction seam: shared recipes must remain in a TSX
	// runtime module so the same source Vite scans is what this contract reads.
	expect(internalTokenSources.length).toBeGreaterThan(0)
	expect(unscannableInternalSources.map(({ path }) => path)).toEqual([])
	expect(tokens.length).toBeGreaterThan(0)
	expect(tokens).not.toContain(unusedSentinel)

	const uno = await createGenerator({ presets: [playa()] })
	const { css, matched } = await uno.generate([...tokens, unusedSentinel].join(' '))

	expect(tokens.filter(token => !matched.has(token))).toEqual([])
	expect(tokens.filter(token => !hasSelector(css, token))).toEqual([])
	expect(matched.has(unusedSentinel)).toBe(false)
	expect(hasSelector(css, unusedSentinel)).toBe(false)
})

test('every UnoCSS token recognized in the runtime source emits a selector', async () => {
	const source = sourceFiles(sourceRoot)
		.filter(path => path.endsWith('.tsx'))
		.map(path => readFileSync(path, 'utf8'))
		.join('\n')
	const uno = await createGenerator({ presets: [playa()] })
	const { css, matched } = await uno.generate(source)
	const missing = [...matched]
		.filter(token => !css.includes(`.${escapeSelector(token)}`))
		.sort()

	expect(matched.size).toBeGreaterThan(1_000)
	expect(missing).toEqual([])
})
