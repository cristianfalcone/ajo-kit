import { describe, expect, test } from 'vitest'
import { descriptor, engine } from '../src/build'
import { kit } from '../src/vite'

describe('ajo-kit vite plugin', () => {
	test('native addons are not rewritten to build-machine paths', () => {
		const plugins = kit()

		expect(plugins.some(plugin => plugin.name === 'ajo-native-external')).toBe(false)
	})

	test('modules resolve by package name; only /src/client is aliased', () => {
		const plugin = kit().find(plugin => plugin.name === 'ajo-kit')!
		const config = (plugin.config as () => { resolve: { alias: unknown } })()

		expect(config.resolve.alias).toEqual([{ find: '/src/client', replacement: 'ajo-kit/client' }])
	})

	test('the client entry stays out of dependency pre-bundling; its route modules are scanned', () => {
		const plugin = kit().find(plugin => plugin.name === 'ajo-kit')!
		const config = (plugin.config as () => { optimizeDeps: unknown })()

		expect(config.optimizeDeps).toEqual({
			exclude: ['ajo-kit/client'],
			entries: ['index.html', 'src/**/{layout,page}.{js,jsx,ts,tsx}'],
		})
	})

	test('css entries load before the kit client entry only, from the workspace or npm', () => {
		const plugin = kit({ css: ['virtual:uno.css'] }).find(plugin => plugin.name === 'ajo-kit')!
		const transform = plugin.transform as (code: string, id: string) => string | undefined

		for (const id of ['/app/node_modules/ajo-kit/dist/client.js?v=1a2b', '/repo/packages/ajo-kit/src/client.tsx']) {
			expect(transform('boot()', id)).toBe("import 'virtual:uno.css'\nboot()")
		}
		for (const id of ['/app/node_modules/ajo-kit/dist/platform.client.js?v=1a2b', '/app/node_modules/ajo-kit-auth/dist/ability.client.js']) {
			expect(transform('boot()', id)).toBeUndefined()
		}
	})

	test('custom guard patterns are added to defaults', async () => {
		const plugin = kit({ guard: [/\/src\/data\//] }).find(plugin => plugin.name === 'ajo-server-only')!
		const hook = plugin.resolveId as { handler: (source: string, importer?: string) => Promise<void> }
		const context = {
			environment: { name: 'client' },
			resolve: async (source: string) => ({ id: source }),
		}

		await expect(hook.handler.call(context, '/project/src/data/store.ts', '/project/src/page.tsx')).rejects.toThrow('Server-only module')
		await expect(hook.handler.call(context, '/project/src/dashboard/handler.ts', '/project/src/page.tsx')).rejects.toThrow('Server-only module')
	})

	test('client-marked modules bypass server-only patterns', async () => {
		const plugin = kit({ guard: [/\/src\/data\//, /ajo-kit-auth\//] }).find(plugin => plugin.name === 'ajo-server-only')!
		const hook = plugin.resolveId as { handler: (source: string, importer?: string) => Promise<void> }
		const context = {
			environment: { name: 'client' },
			resolve: async (source: string) => ({ id: source }),
		}

		await expect(hook.handler.call(context, '/project/node_modules/ajo-kit-auth/src/token.ts', '/project/src/page.tsx')).rejects.toThrow('Server-only module')
		await expect(hook.handler.call(context, '/project/node_modules/ajo-kit-auth/src/ability.client.ts', '/project/src/page.tsx')).resolves.toBeUndefined()
		await expect(hook.handler.call(context, '/project/src/data/dates.client.ts', '/project/src/page.tsx')).resolves.toBeUndefined()
	})

	test('the engine entry passes the file reader only when the App declares host origins', () => {
		const options = { template: '', migrations: [], database: false }
		for (const code of [engine(options).code, engine({ ...options, origins: false }).code]) {
			expect(code).not.toContain('runtime:fs')
			expect(code).not.toContain('origins:')
		}
		const code = engine({ ...options, origins: true }).code
		expect(code).toContain("import { readText } from 'runtime:fs'")
		expect(code).toContain('origins: readText })')
	})

	test('a root bootstrap export declares engine database use', () => {
		const target = engine({ template: '', migrations: [], database: false })
		const transform = target.plugin.transform as (code: string, id: string) => void

		transform('export async function bootstrap() {}', '/project/src/wares.ts')

		expect(target.result.database).toBe(true)
	})

	test('only a static or dynamic importer of the database face besides the engine entry declares database use', () => {
		const run = (importers: string[], dynamicImporters: string[] = []) => {
			const target = engine({ template: '', migrations: [], database: false })
			const chunk = { type: 'chunk', fileName: 'entry.js', moduleIds: [], code: target.code.split('\n').find(line => line.includes('JSON.parse'))! }
			const context = {
				getModuleIds: () => ['/app/node_modules/ajo-kit/dist/database.ajo.js'].values(),
				getModuleInfo: () => ({ importers, dynamicImporters }),
			}
			;(target.plugin.generateBundle as (...args: unknown[]) => void).call(context, {}, { 'entry.js': chunk })
			return { database: target.result.database, code: chunk.code }
		}

		expect(run(['/app/node_modules/ajo-kit/dist/engine.js'])).toEqual({
			database: false,
			code: `const options = JSON.parse('{"database":false}')`,
		})
		expect(run(['/app/node_modules/ajo-kit/dist/engine.js', '/app/src/notes/handler.ts']).database).toBe(true)
		expect(run(['/app/node_modules/ajo-kit/dist/engine.js'], ['/app/src/notes/handler.ts']).database).toBe(true)
		expect(run([], ['/app/node_modules/ajo-kit/dist/engine.js']).database).toBe(false)
	})

	test('app authority follows the descriptor ordering contract', () => {
		const value = descriptor({
			modules: ['server/entry.js'],
			data: false,
			net: false,
			env: {
				required: ['Z_REQUIRED', 'A_REQUIRED'],
				optional: ['Z_OPTIONAL', 'A_OPTIONAL'],
			},
			fs: { roots: ['/proc', '/', '/ajo/data'] },
			ipc: { pipes: ['/ajo/ops/z', '/ajo/ops/a'] },
		})

		expect({ env: value.env, fs: value.fs, ipc: value.ipc }).toEqual({
			env: { required: ['NODE_ENV', 'APP_URL', 'A_REQUIRED', 'Z_REQUIRED'] },
			fs: { roots: ['/', '/ajo/data', '/proc'] },
			ipc: { pipes: ['/ajo/ops/a', '/ajo/ops/z'] },
		})
	})
})
