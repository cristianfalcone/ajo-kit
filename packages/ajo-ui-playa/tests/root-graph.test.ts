import { expect, test } from 'vitest'
import { build, type Plugin } from 'vite'

const entry = 'virtual:ajo-ui-playa-root'
const resolvedEntry = `\0${entry}`
type BuildOutput = { output: Array<{ modules?: Record<string, unknown>, type: string }> }
const modulesOf = (result: unknown) => ((Array.isArray(result) ? result : [result]) as BuildOutput[])
	.flatMap(output => output.output)
	.flatMap(output => output.type === 'chunk' ? Object.keys(output.modules ?? {}) : [])
	.map(id => id.replaceAll('\\', '/'))

test('the root preset graph excludes every runtime component family', async () => {
	const virtualEntry: Plugin = {
		name: 'ajo-ui-playa-root-contract',
		resolveId: id => id === entry ? resolvedEntry : null,
		load: id => id === resolvedEntry
			? `import { playa } from 'ajo-ui-playa'; globalThis.__ajoPlayaFixture = playa`
			: null,
	}
	const result = await build({
		build: {
			minify: false,
			rollupOptions: {
				external: id => id === 'unocss'
					|| id.startsWith('unocss/')
					|| id === '@iconify-json/lucide',
				input: entry,
			},
			write: false,
		},
		configFile: false,
		logLevel: 'silent',
		plugins: [virtualEntry],
	})
	const modules = modulesOf(result)

	expect(modules.filter(id => id.includes('/packages/ajo-ui-playa/src/'))).toEqual([
		expect.stringContaining('/packages/ajo-ui-playa/src/styles.ts'),
	])
	expect(modules.filter(id => id.endsWith('.tsx'))).toEqual([])
	expect(modules.filter(id => id.includes('/packages/ajo-ui/src/'))).toEqual([])
	expect(modules.filter(id => id.includes('/packages/ajo-cloves/src/'))).toEqual([])
})

test('a component family graph includes its base without pulling the preset toolchain', async () => {
	const familyEntry = 'virtual:ajo-ui-playa-checkbox'
	const resolvedFamilyEntry = `\0${familyEntry}`
	const virtualEntry: Plugin = {
		name: 'ajo-ui-playa-family-contract',
		resolveId: id => id === familyEntry ? resolvedFamilyEntry : null,
		load: id => id === resolvedFamilyEntry
			? `import { Checkbox } from 'ajo-ui-playa/checkbox'; globalThis.__ajoPlayaFixture = Checkbox`
			: null,
	}
	const result = await build({
		build: {
			minify: false,
			rollupOptions: { input: familyEntry },
			write: false,
		},
		configFile: false,
		logLevel: 'silent',
		plugins: [virtualEntry],
	})
	const modules = modulesOf(result)

	expect(modules).toEqual(expect.arrayContaining([
		expect.stringContaining('/packages/ajo-ui-playa/src/checkbox.tsx'),
		expect.stringContaining('/packages/ajo-ui/src/checkbox.tsx'),
	]))
	const playaModules = modules.filter(id => id.includes('/packages/ajo-ui-playa/src/'))
	expect(playaModules).toHaveLength(2)
	expect(playaModules).toEqual(expect.arrayContaining([
		expect.stringContaining('/packages/ajo-ui-playa/src/checkbox.tsx'),
		expect.stringContaining('/packages/ajo-ui-playa/src/internal/recipes.tsx'),
	]))
	expect(modules.filter(id =>
		id.includes('/packages/ajo-ui-playa/src/styles.ts')
		|| id.includes('unocss')
		|| id.includes('@iconify-json/lucide')
		|| id.includes('@iconify-json+lucide'),
	)).toEqual([])
})
